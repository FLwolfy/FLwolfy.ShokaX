import anime from 'theme-shokax-anime'
import { siteNavHeight } from '../globals/globalVars'
import type { AnimeOptions } from 'theme-shokax-anime/dist/types'
import {getTop, setDisplay} from './proto'

/**
 * 参数  动画效果
 * 0  元素逐渐消失
 * 1  元素逐渐出现
 * bounceUpIn  元素从下方弹跳出现
 * shrinkIn  元素从放大到正常大小出现
 * slideRightIn  元素从右侧滑入
 * slideRightOut  元素向右侧滑出
 * TODO 函数功能过于复杂，需要拆分
 */
export const transition = (target: HTMLElement, type: number|string|Function, complete?: Function, begin?: Function): void => {
  let animation:Partial<AnimeOptions>
  let display = 'none'
  switch (type) {
    case 0:
      animation = { opacity: [1, 0] }
      break
    case 1:
      animation = { opacity: [0, 1] }
      display = 'block'
      break
    case 'bounceUpIn':
      animation = {
        begin (anim) {
          setDisplay(target, 'block')
        },
        translateY: [
          { value: -60, duration: 200 },
          { value: 10, duration: 200 },
          { value: -5, duration: 200 },
          { value: 0, duration: 200 }
        ],
        opacity: [0, 1]
      }
      display = 'block'
      break
    case 'shrinkIn':
      animation = {
        begin (anim) {
          setDisplay(target, 'block')
        },
        scale: [
          { value: 1.1, duration: 300 },
          { value: 1, duration: 200 }
        ],
        opacity: 1
      }
      display = 'block'
      break
    case 'slideRightIn':
      animation = {
        begin (anim) {
          setDisplay(target, 'block')
        },
        translateX: ['100%', '0%'],
        opacity: [0, 1]
      }
      display = 'block'
      break
    case 'slideRightOut':
      animation = {
        translateX: ['0%', '100%'],
        opacity: [1, 0]
      }
      break
    default:
      // @ts-ignore
      animation = type
      // @ts-ignore
      display = type.display
      break
  }
  anime(Object.assign({
    targets: target,
    duration: 200,
    easing: 'linear',
    begin () {
      begin && begin()
    },
    complete () {
      setDisplay(target, display)
      complete && complete()
    }
  }, animation)).play()
}

interface ScrollAnimation {
  frameId: number
  cancel: () => void
}

const scrollAnimations = new WeakMap<HTMLElement, ScrollAnimation>()
const scrollKeys = new Set([
  'ArrowDown',
  'ArrowUp',
  'End',
  'Home',
  'PageDown',
  'PageUp',
  ' '
])

export const pageScroll = (target: HTMLElement | number, offset?: number, complete?: Function) => {
  // 确定滚动容器
  const scrollContainer = (typeof offset === 'number' && typeof target !== 'number')
    ? target.parentNode as HTMLElement
    : (document.scrollingElement || document.documentElement) as HTMLElement;

  // 计算目标滚动位置
  let scrollTop: number;
  if (typeof offset !== 'undefined') {
    scrollTop = offset;
  } else if (typeof target === 'number') {
    scrollTop = target;
  } else if (target) {
    const rect = target.getBoundingClientRect();
    scrollTop = rect.top + window.scrollY - siteNavHeight;
  } else {
    scrollTop = 0;
  }

  const maxScroll = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight)
  const destination = Math.min(Math.max(scrollTop, 0), maxScroll)
  const start = scrollContainer.scrollTop
  const distance = destination - start
  const previousAnimation = scrollAnimations.get(scrollContainer)

  if (previousAnimation) {
    previousAnimation.cancel()
  }

  if (Math.abs(distance) < 1) {
    scrollContainer.scrollTop = destination
    complete && complete()
    return
  }

  // Keep every programmed jump visibly slower than the page's loading transition.
  const duration = Math.min(1800, 900 + Math.abs(distance) * .18)
  const startTime = performance.now()
  const easeInOutQuad = (progress: number) => progress < .5
    ? 2 * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 2) / 2

  const animation: ScrollAnimation = {
    frameId: 0,
    cancel: () => {}
  }
  const cancel = () => {
    cancelAnimationFrame(animation.frameId)
    window.removeEventListener('wheel', cancel, true)
    window.removeEventListener('touchstart', cancel, true)
    window.removeEventListener('pointerdown', cancelOnMiddleClick, true)
    document.removeEventListener('keydown', cancelOnScrollKey, true)
    if (scrollAnimations.get(scrollContainer) === animation) {
      scrollAnimations.delete(scrollContainer)
    }
  }
  const cancelOnScrollKey = (event: KeyboardEvent) => {
    if (scrollKeys.has(event.key)) cancel()
  }
  const cancelOnMiddleClick = (event: PointerEvent) => {
    if (event.button === 1) cancel()
  }
  animation.cancel = cancel

  window.addEventListener('wheel', cancel, { capture: true, passive: true })
  window.addEventListener('touchstart', cancel, { capture: true, passive: true })
  window.addEventListener('pointerdown', cancelOnMiddleClick, true)
  document.addEventListener('keydown', cancelOnScrollKey, true)

  const animateScroll = (now: number) => {
    const progress = Math.min((now - startTime) / duration, 1)
    scrollContainer.scrollTop = start + distance * easeInOutQuad(progress)

    if (progress < 1) {
      animation.frameId = requestAnimationFrame(animateScroll)
      return
    }

    cancel()
    scrollContainer.scrollTop = destination
    complete && complete()
  }

  scrollAnimations.set(scrollContainer, animation)
  animation.frameId = requestAnimationFrame(animateScroll)
};
