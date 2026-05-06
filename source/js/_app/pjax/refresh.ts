import { cardActive } from '../page/common'
import { resizeHandle } from '../globals/handles'
import {
  CONFIG,
  setLocalHash, setLocalUrl, setOriginTitle,
} from '../globals/globalVars'
import { positionInit } from '../globals/tools'
import { menuActive, sideBarTab, sidebarTOC } from '../components/sidebar'
import { Loader, isOutime } from '../globals/thirdparty'
import { tabFormat } from '../page/tab'
import { pageScroll } from '../library/anime'

const hasCommentTarget = function () {
  const commentId = new URLSearchParams(window.location.search).get('comment')
  return !!commentId || /^#[0-9a-f]{16,32}$/i.test(window.location.hash)
}

const getCommentTargetId = function () {
  return new URLSearchParams(window.location.search).get('comment') || decodeURIComponent(window.location.hash.slice(1))
}

const waitForCommentTarget = function (targetId: string, timeout = 6000) {
  return new Promise<HTMLElement | null>((resolve) => {
    if (!targetId) {
      resolve(null)
      return
    }

    const current = document.getElementById(targetId)
    if (current) {
      resolve(current)
      return
    }

    const commentsEl = document.getElementById('comments')
    if (!commentsEl) {
      resolve(null)
      return
    }

    let done = false
    let pollTimer:number
    const finish = (target: HTMLElement | null) => {
      if (done) return
      done = true
      observer?.disconnect()
      window.clearTimeout(timer)
      window.clearInterval(pollTimer)
      resolve(target)
    }
    const check = () => {
      const target = document.getElementById(targetId)
      if (target) finish(target)
    }
    const observer = window.MutationObserver ? new MutationObserver(check) : null
    const timer = window.setTimeout(() => finish(document.getElementById(targetId)), timeout)
    pollTimer = window.setInterval(check, 100)

    observer?.observe(commentsEl, {
      childList: true,
      subtree: true
    })
  })
}

const clearCommentUrlTarget = function () {
  if (!window.history?.replaceState) return

  const url = new URL(window.location.href)
  url.searchParams.delete('comment')
  url.hash = ''
  window.history.replaceState(null, '', `${url.pathname}${url.search}`)
}

const scrollToCommentTarget = async function () {
  const target = await waitForCommentTarget(getCommentTargetId())
  if (target) pageScroll(target, undefined, clearCommentUrlTarget)
}

export const siteRefresh = async (reload) => {
  if (__shokax_antiFakeWebsite__) {
    if (window.location.origin !== CONFIG.hostname && window.location.origin !== "http://localhost:4000") {
      window.location.href = CONFIG.hostname
      /*! 我知道你正在试图去除这段代码，虽然我无法阻止你，但我劝你好自为之 */
      alert('检测到非法仿冒网站，已自动跳转回正确首页;\nWe have detected a fake website, and you have been redirected to the correct homepage.')
    }
  }

  setLocalHash(0)
  setLocalUrl(window.location.href)

  await import('katex/dist/contrib/copy-tex.mjs')

  // 懒加载背景图
  const lazyBg = new IntersectionObserver(function (entries, observer) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target as HTMLElement
        el.style.backgroundImage = `url("${el.getAttribute('data-background-image')}")`
        el.removeAttribute('data-background-image')
        observer.unobserve(el)
      }
    })
  }, {
    root: null,
    threshold: 0.2
  })
  document.querySelectorAll('[data-background-image]').forEach(el => {
    lazyBg.observe(el)
  })

  setOriginTitle(document.title)

  resizeHandle()

  menuActive()

  sideBarTab()
  sidebarTOC()

  const pagePost = await import('../page/post')
  await pagePost.postBeauty()

  const shouldLoadCommentsImmediately = __shokax_waline__ && !!document.getElementById('comments') && hasCommentTarget()

  if (__shokax_waline__ && (LOCAL.ispost || shouldLoadCommentsImmediately)) {
    const comments = await import('../components/comments')

    // Pageview should be available immediately after refresh/PJAX load.
    if (LOCAL.ispost && typeof comments.walinePageview === 'function') {
      comments.walinePageview()
    }

    if (shouldLoadCommentsImmediately) {
      if (typeof comments.walineComment === 'function') {
        comments.walineComment()
      }
      await scrollToCommentTarget()
    }
  }

  const cpel = document.getElementById('copyright')
  if (cpel) {
    const comment = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (__shokax_waline__) {
            import('../components/comments').then((comments) => {
              if (typeof comments.walineComment === 'function') comments.walineComment()
            })
          }
          if (__shokax_twikoo__) {
            import('../components/tcomments').then(({twikooComment}) => {
              twikooComment()
            })
          }
          comment.disconnect()
        }
      })
    }, {
      root: null,
      threshold: 0.2
    })

    comment.observe(cpel)
  }

  if (__shokax_waline__) {
    const loadRecentComments = () => {
      import('../components/comments').then(async (comments) => {
        if (typeof comments.walineRecentComments !== 'function') return
        await comments.walineRecentComments().catch(console.error)
      }).catch(console.error)
    }

    loadRecentComments()

    window.setTimeout(() => {
      const recentComments = document.getElementById('new-comment')
      if (recentComments && recentComments.childElementCount === 0) loadRecentComments()
    }, 500)

    const recentComments = document.getElementById('new-comment')
    if (recentComments && window.IntersectionObserver) {
      const recentObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          if (recentComments.childElementCount === 0) loadRecentComments()
          recentObserver.disconnect()
        })
      }, {
        root: null,
        threshold: 0.1
      })
      recentObserver.observe(recentComments)
    }
  }

  if (__shokax_twikoo__) {
    import('../components/tcomments').then(async ({twikooRecentComments}) => {
      await twikooRecentComments()
    })
  }

  if (__shokax_tabs__) {
    tabFormat()
  }

  if (sessionStorage.getItem('loaded') === 'true') {
    Loader.hide(30)
  } else {
    sessionStorage.setItem('loaded', 'true')
    Loader.hide(500)
  }

  setTimeout(() => {
    positionInit()
  }, 500)

  cardActive()

  if (__shokax_outime__ && LOCAL.ispost) {
    isOutime()
  }
}
