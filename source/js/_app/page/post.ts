import { postImageViewer } from './imageviewer'
import { clipBoard, showtip } from '../globals/tools'
import { CONFIG, BODY } from '../globals/globalVars'
import { pageScroll, transition } from '../library/anime'
import { getDisplay, setDisplay, wrapObject } from '../library/proto'
import { initializeCodeBlock } from 'shokax-uikit/components/codeblock/init'

const SHIKI_FOLD_MAX_HEIGHT = 360
const SHIKI_FOLD_LINE_THRESHOLD = 15

function getShikiLineCount(block: HTMLElement) {
  const root = block.shadowRoot
  const lines = root?.querySelectorAll('.line').length || 0
  if (lines > 0) return lines

  const content = block.getAttribute('content') || ''
  const contentLines = content.match(/class=(["'])[^"']*\bline\b[^"']*\1/g)?.length || 0
  if (contentLines > 0) return contentLines

  const text = root?.textContent || block.textContent || ''
  return text ? text.split('\n').length : 0
}

function getShikiContentHeight(block: HTMLElement) {
  const root = block.shadowRoot
  const code = root?.querySelector<HTMLElement>('.codeblock')
  return Math.max(block.scrollHeight, code?.scrollHeight || 0)
}

function initShikiCodeFold(retry = 0) {
  const blocks = document.querySelectorAll<HTMLElement>('code-block')
  let hasPendingBlock = false

  blocks.forEach((block) => {
    if (block.dataset.foldBound === '1' || block.closest('.shiki-fold')) return

    const lineCount = getShikiLineCount(block)
    const fullHeight = getShikiContentHeight(block)
    const shouldFoldByLines = lineCount > SHIKI_FOLD_LINE_THRESHOLD
    const shouldFoldByHeight = fullHeight > SHIKI_FOLD_MAX_HEIGHT

    if (!fullHeight && !shouldFoldByLines) {
      hasPendingBlock = true
      return
    }

    if (!shouldFoldByLines && !shouldFoldByHeight) return

    const wrapper = document.createElement('div')
    wrapper.className = 'shiki-fold'
    if (!block.parentNode) return
    block.parentNode.insertBefore(wrapper, block)
    wrapper.appendChild(block)

    block.dataset.foldBound = '1'
    block.classList.add('shiki-fold-target')
    block.style.maxHeight = `${SHIKI_FOLD_MAX_HEIGHT}px`

    const toggle = document.createElement('button')
    toggle.className = 'shiki-fold-toggle'
    toggle.type = 'button'
    toggle.setAttribute('aria-label', 'Expand code block')
    toggle.innerHTML = '<i class="ic i-angle-down"></i>'
    wrapper.appendChild(toggle)

    toggle.addEventListener('click', () => {
      const isOpen = wrapper.classList.contains('open')

      if (isOpen) {
        block.style.maxHeight = `${getShikiContentHeight(block) || block.scrollHeight}px`
        requestAnimationFrame(() => {
          wrapper.classList.remove('open')
          toggle.setAttribute('aria-label', 'Expand code block')
          block.style.maxHeight = `${SHIKI_FOLD_MAX_HEIGHT}px`
        })
        pageScroll(wrapper)
        return
      }

      wrapper.classList.add('open')
      toggle.setAttribute('aria-label', 'Collapse code block')
      block.style.maxHeight = `${getShikiContentHeight(block) || block.scrollHeight}px`
      window.setTimeout(() => {
        if (wrapper.classList.contains('open')) {
          block.style.maxHeight = ''
        }
      }, 260)
    })
  })

  if (hasPendingBlock && retry < 10) {
    window.setTimeout(() => initShikiCodeFold(retry + 1), 100)
  }
}

export const postBeauty = async () => {
  if (!document.querySelector('.md')) { return }

  postImageViewer('.post.block');

  (document.querySelector('.post.block') as HTMLTextAreaElement).oncopy = (event) => {
    showtip(LOCAL.copyright)

    if (LOCAL.nocopy) {
      event.preventDefault()
      return
    }

    const copyright = document.getElementById('copyright')
    if (window.getSelection().toString().length > CONFIG.experiments.copyrightLength && copyright) {
      event.preventDefault()
      const author = '# ' + (copyright.querySelector('.author') as HTMLElement).innerText
      const link = '# ' + (copyright.querySelector('.link') as HTMLElement).innerText
      const license = '# ' + (copyright.querySelector('.license') as HTMLElement).innerText
      const htmlData = author + '<br>' + link + '<br>' + license + '<br><br>' + window.getSelection().toString().replace(/\r\n/g, '<br>')

      const textData = author + '\n' + link + '\n' + license + '\n\n' + window.getSelection().toString().replace(/\r\n/g, '\n')
      if (event.clipboardData) {
        event.clipboardData.setData('text/html', htmlData)
        event.clipboardData.setData('text/plain', textData)
      } else {
        throw new Error('Clipboard API not supported')
      }
    }
  }

  document.querySelectorAll('li ruby').forEach((element) => {
    let parent = element.parentNode as HTMLElement
    // @ts-ignore
    if (element.parentNode.tagName !== 'LI') {
      parent = element.parentNode.parentNode as HTMLElement
    }
    parent.classList.add('ruby')
  })

  document.querySelectorAll('ol[start]').forEach((element) => {
    // @ts-ignore
    element.style.counterReset = 'counter ' + parseInt(element.getAttribute('start') - 1)
  })

  document.querySelectorAll<HTMLElement>('.md table').forEach((element) => {
    wrapObject(element, {
      className: 'table-container'
    })
  })

  document.querySelectorAll('.highlight > .table-container').forEach((element) => {
    element.className = 'code-container'
  })

  document.querySelectorAll<HTMLElement>('figure.highlight').forEach((element) => {
    const code_container = element.querySelector('.code-container') as HTMLElement
    const caption = element.querySelector('figcaption')

    element.insertAdjacentHTML('beforeend', '<div class="operation"><span class="breakline-btn"><i class="ic i-align-left"></i></span><span class="copy-btn"><i class="ic i-clipboard"></i></span><span class="fullscreen-btn"><i class="ic i-expand"></i></span></div>')

    const copyBtn = element.querySelector('.copy-btn')
    if (LOCAL.nocopy) {
      copyBtn.remove()
    } else {
      copyBtn.addEventListener('click', (event) => {
        const target = <HTMLElement>event.currentTarget
        let comma = ''; let code = ''
        code_container.querySelectorAll('pre').forEach((line) => {
          code += comma + line.innerText
          comma = '\n'
        })

        clipBoard(code, (result) => {
          target.querySelector('.ic').className = result ? 'ic i-check' : 'ic i-times'
          target.blur()
          showtip(LOCAL.copyright)
        })
      }, { passive: true })
      copyBtn.addEventListener('mouseleave', (event) => {
        setTimeout(() => {
          (event.target as HTMLElement).querySelector('.ic').className = 'ic i-clipboard'
        }, 1000)
      })
    }

    const breakBtn = element.querySelector('.breakline-btn')
    breakBtn.addEventListener('click', (event) => {
      const target = event.currentTarget as HTMLElement
      if (element.classList.contains('breakline')) {
        element.classList.remove('breakline')
        target.querySelector('.ic').className = 'ic i-align-left'
      } else {
        element.classList.add('breakline')
        target.querySelector('.ic').className = 'ic i-align-justify'
      }
    })

    const fullscreenBtn = element.querySelector('.fullscreen-btn')
    const removeFullscreen = () => {
      element.classList.remove('fullscreen')
      element.scrollTop = 0
      BODY.classList.remove('fullscreen')
      fullscreenBtn.querySelector('.ic').className = 'ic i-expand'
    }
    const fullscreenHandle = () => {
      if (element.classList.contains('fullscreen')) {
        removeFullscreen()
        if (code_container && code_container.querySelectorAll('tr').length > 15) {
          const showBtn = code_container.querySelector('.show-btn')
          code_container.style.maxHeight = '300px'
          showBtn.classList.remove('open')
        }
        pageScroll(element)
      } else {
        element.classList.add('fullscreen')
        BODY.classList.add('fullscreen')
        fullscreenBtn.querySelector('.ic').className = 'ic i-compress'
        if (code_container && code_container.querySelectorAll('tr').length > 15) {
          const showBtn = code_container.querySelector('.show-btn')
          code_container.style.maxHeight = ''
          showBtn.classList.add('open')
        }
      }
    }
    fullscreenBtn.addEventListener('click', fullscreenHandle)
    caption && caption.addEventListener('click', fullscreenHandle)

    if (code_container && code_container.querySelectorAll('tr').length > 15) {
      code_container.style.maxHeight = '300px'
      code_container.insertAdjacentHTML('beforeend', '<div class="show-btn"><i class="ic i-angle-down"></i></div>')
      const showBtn = code_container.querySelector('.show-btn')

      const hideCode = () => {
        code_container.style.maxHeight = '300px'
        showBtn.classList.remove('open')
      }
      const showCode = () => {
        code_container.style.maxHeight = ''
        showBtn.classList.add('open')
      }

      showBtn.addEventListener('click', () => {
        if (showBtn.classList.contains('open')) {
          removeFullscreen()
          hideCode()
          pageScroll(code_container)
        } else {
          showCode()
        }
      })
    }
  })

  document.querySelectorAll('pre.mermaid > svg').forEach((element) => {
    const temp = <SVGAElement><unknown>element
    temp.style.maxWidth = ''
  })

  document.querySelectorAll('.reward button').forEach((element) => {
    element.addEventListener('click', (event) => {
      event.preventDefault()
      const qr = document.getElementById('qr')
      if (getDisplay(qr) === 'inline-flex') {
        transition(qr, 0)
      } else {
        transition(qr, 1, () => {
          setDisplay(qr, 'inline-flex')
        }) // slideUpBigIn
      }
    })
  })

  // quiz
  if (__shokax_quiz__) {
    document.querySelectorAll('.quiz > ul.options li').forEach((element) => {
      element.addEventListener('click', () => {
        if (element.classList.contains('correct')) {
          element.classList.toggle('right');
          (element.parentNode.parentNode as HTMLElement).classList.add('show')
        } else {
          element.classList.toggle('wrong')
        }
      })
    })

    document.querySelectorAll('.quiz > p').forEach((element) => {
      element.addEventListener('click', () => {
        (element.parentNode as HTMLElement).classList.toggle('show')
      })
    })

    document.querySelectorAll('.quiz > p:first-child').forEach((element) => {
      const quiz = element.parentNode as HTMLElement
      let type = 'choice'
      if (quiz.classList.contains('true') || quiz.classList.contains('false')) {
        type = 'true_false'
      }
      if (quiz.classList.contains('multi')) {
        type = 'multiple'
      }
      if (quiz.classList.contains('fill')) {
        type = 'gap_fill'
      }
      if (quiz.classList.contains('essay')) {
        type = 'essay'
      }
      element.setAttribute('data-type', LOCAL.quiz[type])
    })

    document.querySelectorAll('.quiz .mistake').forEach((element) => {
      element.setAttribute('data-type', LOCAL.quiz.mistake)
    })
  }

  document.querySelectorAll('div.tags a').forEach((element) => {
    element.className = ['primary', 'success', 'info', 'warning', 'danger'][Math.floor(Math.random() * 5)]
  })

  const angleDown = document.querySelectorAll('.show-btn .i-angle-down')
  if (angleDown.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          angleDown.forEach(i => {
            i.classList.remove('stop-animation')
          })
        } else {
          angleDown.forEach(i => {
            i.classList.add('stop-animation')
          })
        }
      })
    }, {
      root: null,
      threshold: 0.5
    })
    angleDown.forEach(i => {
      io.observe(i)
    })
  }

  initializeCodeBlock('.shiki')
  requestAnimationFrame(() => initShikiCodeFold())
  customElements.whenDefined('code-block')
    .then(() => window.setTimeout(() => initShikiCodeFold(), 0))
}
