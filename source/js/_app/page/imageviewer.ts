type ViewerImage = {
  element: HTMLImageElement
  src: string
  alt: string
}

type Point = {
  x: number
  y: number
}

const MIN_SCALE = 0.1
const MAX_SCALE = 5
const DEFAULT_SCALE = 1
const CLICK_ZOOM_SCALE = 2
const SCALE_STEP = 0.1

let images: ViewerImage[] = []
let currentIndex = 0
let scale = DEFAULT_SCALE
let translateX = 0
let translateY = 0
let closeTimer = 0
let viewer: HTMLElement | null = null
let viewerImage: HTMLImageElement | null = null
let counter: HTMLElement | null = null
let caption: HTMLElement | null = null
let resetButton: HTMLButtonElement | null = null
let previousButton: HTMLButtonElement | null = null
let nextButton: HTMLButtonElement | null = null
let originalLink: HTMLAnchorElement | null = null
let closeButton: HTMLButtonElement | null = null
let dragging = false
let dragged = false
let suppressClick = false
let activeImageSrc = ''
let dragOrigin: Point = { x: 0, y: 0 }
let translateOrigin: Point = { x: 0, y: 0 }
let pinchDistance = 0
let pinchScale = MIN_SCALE
const pointers = new Map<number, Point>()

const isOpen = () => viewer?.classList.contains('is-open') === true

const applyTransform = () => {
  if (!viewerImage || !resetButton) return

  viewerImage.style.transform = `translate3d(calc(-50% + ${translateX}px), calc(-50% + ${translateY}px), 0) scale(${scale})`
  viewerImage.classList.toggle('is-shrunk', scale < DEFAULT_SCALE)
  viewerImage.classList.toggle('is-enlarged', scale > DEFAULT_SCALE)
  resetButton.textContent = `${Math.round(scale * 100)}%`
}

const resetTransform = () => {
  scale = DEFAULT_SCALE
  translateX = 0
  translateY = 0
  applyTransform()
}

const setScale = (nextScale: number, origin?: Point) => {
  const boundedScale = Math.round(
    Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale)) * 100
  ) / 100
  if (boundedScale === scale) return

  if (origin && viewer) {
    const rect = viewer.getBoundingClientRect()
    const offsetX = origin.x - (rect.left + rect.width / 2)
    const offsetY = origin.y - (rect.top + rect.height / 2)
    const ratio = boundedScale / scale
    translateX = offsetX - (offsetX - translateX) * ratio
    translateY = offsetY - (offsetY - translateY) * ratio
  }

  scale = boundedScale
  if (scale === DEFAULT_SCALE) {
    translateX = 0
    translateY = 0
  }
  applyTransform()
}

const showImage = (index: number) => {
  if (!viewerImage || images.length === 0 || index < 0 || index >= images.length) return

  currentIndex = index
  const image = images[currentIndex]
  resetTransform()
  activeImageSrc = image.src
  viewerImage.classList.add('is-loading')
  viewerImage.removeAttribute('src')
  viewerImage.src = image.src
  viewerImage.alt = image.alt

  if (counter) counter.textContent = `${currentIndex + 1} / ${images.length}`
  if (caption) {
    caption.textContent = image.alt
    caption.hidden = image.alt.length === 0
  }
  if (originalLink) originalLink.href = image.src

  if (previousButton) previousButton.hidden = currentIndex === 0
  if (nextButton) nextButton.hidden = currentIndex === images.length - 1
}

const closeViewer = () => {
  if (!viewer || !isOpen()) return

  viewer.classList.remove('is-open')
  viewer.setAttribute('aria-hidden', 'true')
  pointers.clear()
  dragging = false
  window.clearTimeout(closeTimer)
  closeTimer = window.setTimeout(() => {
    if (viewer && !isOpen()) viewer.hidden = true
  }, 220)
}

const openViewer = (index: number) => {
  if (!viewer) createViewer()
  if (!viewer) return

  window.clearTimeout(closeTimer)
  showImage(index)

  viewer.hidden = false
  viewer.setAttribute('aria-hidden', 'false')
  requestAnimationFrame(() => {
    viewer?.classList.add('is-open')
    closeButton?.focus({ preventScroll: true })
  })
}

const getPointerDistance = () => {
  const [first, second] = [...pointers.values()]
  if (!first || !second) return 0
  return Math.hypot(second.x - first.x, second.y - first.y)
}

const handlePointerDown = (event: PointerEvent) => {
  if (!viewerImage || event.button !== 0) return

  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  viewerImage.setPointerCapture(event.pointerId)

  if (pointers.size === 1) {
    dragging = scale > DEFAULT_SCALE
    dragged = false
    dragOrigin = { x: event.clientX, y: event.clientY }
    translateOrigin = { x: translateX, y: translateY }
    if (dragging) viewerImage.classList.add('is-dragging')
  } else if (pointers.size === 2) {
    dragging = false
    pinchDistance = getPointerDistance()
    pinchScale = scale
  }
}

const handlePointerMove = (event: PointerEvent) => {
  if (!pointers.has(event.pointerId)) return
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

  if (pointers.size === 2 && pinchDistance > 0) {
    setScale(pinchScale * (getPointerDistance() / pinchDistance))
    return
  }
  if (!dragging) return

  if (Math.hypot(event.clientX - dragOrigin.x, event.clientY - dragOrigin.y) > 3) {
    dragged = true
  }
  translateX = translateOrigin.x + event.clientX - dragOrigin.x
  translateY = translateOrigin.y + event.clientY - dragOrigin.y
  applyTransform()
}

const handlePointerUp = (event: PointerEvent) => {
  pointers.delete(event.pointerId)
  viewerImage?.classList.remove('is-dragging')
  pinchDistance = 0

  const remainingPointer = [...pointers.values()][0]
  if (remainingPointer) {
    dragging = scale > DEFAULT_SCALE
    dragOrigin = remainingPointer
    translateOrigin = { x: translateX, y: translateY }
    if (dragging) viewerImage?.classList.add('is-dragging')
  } else {
    dragging = false
    if (dragged) {
      suppressClick = true
      window.setTimeout(() => {
        suppressClick = false
      }, 0)
    }
  }
}

const createViewer = () => {
  viewer = document.createElement('div')
  viewer.className = 'image-viewer'
  viewer.hidden = true
  viewer.setAttribute('aria-hidden', 'true')
  viewer.setAttribute('role', 'dialog')
  viewer.setAttribute('aria-modal', 'true')
  viewer.setAttribute('aria-label', 'Image viewer')
  viewer.innerHTML = `
    <div class="image-viewer__backdrop"></div>
    <div class="image-viewer__toolbar">
      <span class="image-viewer__counter" aria-live="polite"></span>
      <div class="image-viewer__actions">
        <button type="button" data-action="zoom-out" aria-label="Zoom out">−</button>
        <button type="button" class="image-viewer__reset" data-action="reset" aria-label="Reset zoom">100%</button>
        <button type="button" data-action="zoom-in" aria-label="Zoom in">+</button>
        <a data-action="original" target="_blank" rel="noopener" aria-label="Open original image">↗</a>
        <button type="button" data-action="close" aria-label="Close image viewer">×</button>
      </div>
    </div>
    <button type="button" class="image-viewer__nav image-viewer__nav--previous" data-action="previous" aria-label="Previous image">‹</button>
    <div class="image-viewer__stage">
      <img class="image-viewer__image" draggable="false">
    </div>
    <button type="button" class="image-viewer__nav image-viewer__nav--next" data-action="next" aria-label="Next image">›</button>
    <div class="image-viewer__caption"></div>
  `
  document.body.appendChild(viewer)

  viewerImage = viewer.querySelector('.image-viewer__image')
  counter = viewer.querySelector('.image-viewer__counter')
  caption = viewer.querySelector('.image-viewer__caption')
  resetButton = viewer.querySelector('.image-viewer__reset')
  previousButton = viewer.querySelector('[data-action="previous"]')
  nextButton = viewer.querySelector('[data-action="next"]')
  originalLink = viewer.querySelector('[data-action="original"]')
  closeButton = viewer.querySelector('[data-action="close"]')

  viewer.addEventListener('click', (event) => {
    const target = event.target as HTMLElement
    const action = target.closest<HTMLElement>('[data-action]')?.dataset.action

    if (action === 'close') closeViewer()
    if (action === 'previous' && currentIndex > 0) showImage(currentIndex - 1)
    if (action === 'next' && currentIndex < images.length - 1) showImage(currentIndex + 1)
    if (action === 'zoom-out') setScale(scale - SCALE_STEP)
    if (action === 'zoom-in') setScale(scale + SCALE_STEP)
    if (action === 'reset') resetTransform()
  })

  viewerImage?.addEventListener('load', (event) => {
    const image = event.currentTarget as HTMLImageElement
    if (image.currentSrc === activeImageSrc || image.src === activeImageSrc) {
      image.classList.remove('is-loading')
    }
  })
  viewerImage?.addEventListener('error', (event) => {
    const image = event.currentTarget as HTMLImageElement
    if (image.currentSrc === activeImageSrc || image.src === activeImageSrc) {
      image.classList.remove('is-loading')
    }
  })
  viewerImage?.addEventListener('click', (event) => {
    if (suppressClick || dragging || pointers.size > 0) return

    setScale(scale === DEFAULT_SCALE ? CLICK_ZOOM_SCALE : DEFAULT_SCALE, {
      x: event.clientX,
      y: event.clientY
    })
  })
  viewerImage?.addEventListener('wheel', (event) => {
    event.preventDefault()
    setScale(scale + (event.deltaY < 0 ? SCALE_STEP : -SCALE_STEP), {
      x: event.clientX,
      y: event.clientY
    })
  }, { passive: false })
  viewer.addEventListener('wheel', (event) => {
    event.preventDefault()
  }, { passive: false })
  viewerImage?.addEventListener('pointerdown', handlePointerDown)
  viewerImage?.addEventListener('pointermove', handlePointerMove)
  viewerImage?.addEventListener('pointerup', handlePointerUp)
  viewerImage?.addEventListener('pointercancel', handlePointerUp)

  document.addEventListener('keydown', (event) => {
    if (!isOpen()) return

    const handledKeys = ['Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', '+', '=', '-', '0']
    if (handledKeys.includes(event.key)) event.preventDefault()

    if (event.key === 'Escape') closeViewer()
    if (event.key === 'ArrowLeft' && currentIndex > 0) showImage(currentIndex - 1)
    if (event.key === 'ArrowRight' && currentIndex < images.length - 1) showImage(currentIndex + 1)
    if (event.key === '+' || event.key === '=') setScale(scale + SCALE_STEP)
    if (event.key === '-') setScale(scale - SCALE_STEP)
    if (event.key === '0') resetTransform()
  })
}

export const postImageViewer = (parentSelector: string) => {
  closeViewer()

  const elements = [...document.querySelectorAll<HTMLImageElement>(
    `${parentSelector} .md img:not(.emoji):not(.vemoji)`
  )]

  images = elements.map((element) => ({
    element,
    src: element.currentSrc || element.src,
    alt: element.alt || element.title || ''
  }))

  images.forEach((image, index) => {
    image.element.classList.add('image-viewer__trigger')
    image.element.onclick = (event) => {
      event.preventDefault()
      openViewer(index)
    }
  })
}
