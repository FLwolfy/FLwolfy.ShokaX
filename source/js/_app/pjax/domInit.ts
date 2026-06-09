import { backToTopHandle, goToBottomHandle, goToCommentHandle, sidebarMenuInit, sideBarToggleHandle } from '../components/sidebar'
import {
  backToTop,
  goToComment,
  loadCat,
  menuToggle,
  quickBtn, setBackToTop, setGoToComment, setShowContents, setToolBtn,
  showContents,
  siteHeader,
  siteNav,
  toolBtn
} from '../globals/globalVars'
import { Loader } from '../globals/thirdparty'
import { createChild } from '../library/proto'
import { initAudioPlayer } from '../player'

export default async function domInit () {
  document.querySelectorAll('.overview .menu > .item').forEach((el) => {
    siteNav.querySelector('.menu').appendChild(el.cloneNode(true))
  })
  sidebarMenuInit()

  loadCat.addEventListener('click', Loader.vanish)
  menuToggle.addEventListener('click', sideBarToggleHandle)
  document.querySelector('.dimmer').addEventListener('click', sideBarToggleHandle)

  quickBtn.querySelector('.down').addEventListener('click', goToBottomHandle)
  quickBtn.querySelector('.up').addEventListener('click', backToTopHandle)

  // ==============================
  // 背景图视差滚动
  // ==============================

  const indexImgs = document.getElementById('imgs');
  const scrollSpeed = 0.3;
  let latestScrollY = 0;
  let ticking = false;
  if (indexImgs) {
    window.addEventListener('scroll', () => {
      latestScrollY = window.scrollY;
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const yOffset = latestScrollY * scrollSpeed;
          document.documentElement.style.setProperty("--parallax-offset", `-${yOffset}px`);
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  // ==============================
  // 侧边栏阴影控制
  // ==============================

  const inner = document.querySelector<HTMLElement>('#sidebar .panels > .inner');
  if (inner) {
    let hideOverscrollTimer = 0
    let lastTouchY = 0

    const isScrollable = () => inner.scrollHeight > inner.clientHeight + 1
    const updateEdgeShadows = () => {
      const maxScroll = Math.max(0, inner.scrollHeight - inner.clientHeight)
      const scrollable = isScrollable()

      inner.classList.toggle('scroll-top', scrollable && inner.scrollTop > 1)
      inner.classList.toggle('scroll-bottom', scrollable && inner.scrollTop < maxScroll - 1)
    }
    const hideOverscroll = () => {
      window.clearTimeout(hideOverscrollTimer)
      inner.classList.remove('is-native-overscrolling')
      updateEdgeShadows()
    }
    const showOverscroll = () => {
      if (!isScrollable()) {
        hideOverscroll()
        return
      }
      inner.classList.add('is-native-overscrolling')
      window.clearTimeout(hideOverscrollTimer)
      hideOverscrollTimer = window.setTimeout(hideOverscroll, 180)
    }
    const observeScroll = () => {
      const maxScroll = Math.max(0, inner.scrollHeight - inner.clientHeight)
      if (isScrollable() && (inner.scrollTop < 0 || inner.scrollTop > maxScroll)) {
        showOverscroll()
      } else if (inner.scrollTop > 0 && inner.scrollTop < maxScroll) {
        hideOverscroll()
      } else {
        updateEdgeShadows()
      }
    }
    const observeWheel = (event: WheelEvent) => {
      const maxScroll = Math.max(0, inner.scrollHeight - inner.clientHeight)
      const atTop = inner.scrollTop <= 0
      const atBottom = inner.scrollTop >= maxScroll

      if (isScrollable() && ((atTop && event.deltaY < 0) || (atBottom && event.deltaY > 0))) {
        showOverscroll()
      } else {
        hideOverscroll()
      }
    }
    const rememberTouch = (event: TouchEvent) => {
      lastTouchY = event.touches[0]?.clientY || 0
    }
    const observeTouch = (event: TouchEvent) => {
      const currentTouchY = event.touches[0]?.clientY || lastTouchY
      const movement = currentTouchY - lastTouchY
      const maxScroll = Math.max(0, inner.scrollHeight - inner.clientHeight)
      const atTop = inner.scrollTop <= 0
      const atBottom = inner.scrollTop >= maxScroll

      lastTouchY = currentTouchY
      if (isScrollable() && ((atTop && movement > 0) || (atBottom && movement < 0))) {
        showOverscroll()
      } else {
        hideOverscroll()
      }
    }

    inner.addEventListener('scroll', observeScroll, { passive: true })
    inner.addEventListener('wheel', observeWheel, { passive: true })
    inner.addEventListener('touchstart', rememberTouch, { passive: true })
    inner.addEventListener('touchmove', observeTouch, { passive: true })
    inner.addEventListener('touchend', () => {
      window.clearTimeout(hideOverscrollTimer)
      hideOverscrollTimer = window.setTimeout(hideOverscroll, 350)
    }, { passive: true })
    const resizeObserver = new ResizeObserver(updateEdgeShadows)
    inner.querySelectorAll('.panel').forEach((panel) => resizeObserver.observe(panel))
    resizeObserver.observe(inner)
    window.addEventListener('resize', updateEdgeShadows)
    updateEdgeShadows()
  }

  // ==============================
  // 站点工具栏
  // ==============================

  if (!toolBtn) {
    setToolBtn(createChild(siteHeader, 'div', {
      id: 'tool',
      innerHTML: `<div class="item player">
                    ${__shokax_player__ ? '<div class="play-pause btn" id="playBtn"></div><div class="music btn btn" id="showBtn"></div>' : ''}
                  </div>
                  <div class="item contents">
                    <i class="ic i-list-ol"></i>
                  </div>
                  <div class="item chat">
                    <i class="ic i-comments"></i>
                  </div>
                  <div class="item back-to-top">
                    <i class="ic i-arrow-up"></i>
                    <span>0%</span>
                  </div>`
    }))
  }

  // ==============================
  // 评论区按钮隐藏
  // 若页面无评论区则隐藏评论按钮
  // ==============================

  const commentsEl = document.getElementById('comments')
  const chatEl = toolBtn.querySelector<HTMLElement>('.chat')
  if (!commentsEl && chatEl) {
    chatEl.style.display = 'none'
  }

  setBackToTop(toolBtn.querySelector('.back-to-top'))
  setGoToComment(toolBtn.querySelector('.chat'))
  setShowContents(toolBtn.querySelector('.contents'))

  backToTop.addEventListener('click', backToTopHandle)
  goToComment.addEventListener('click', goToCommentHandle)
  showContents.addEventListener('click', sideBarToggleHandle)

  if (__shokax_player__) {
    await initAudioPlayer()
  }
  
  // ==============================
  // 视口观察器
  // ==============================

  const createIntersectionObserver = () => {
    // waves在视口外时停止动画
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        document.querySelectorAll('.parallax>use').forEach(i => {
          i.classList.remove('stop-animation')
        })
        document.querySelectorAll('#imgs .item').forEach(i => {
          i.classList.remove('stop-animation')
        })
      } else {
        document.querySelectorAll('.parallax>use').forEach(i => {
          i.classList.add('stop-animation')
        })
        // waves不可见时imgs也应该不可见了
        document.querySelectorAll('#imgs .item').forEach(i => {
          i.classList.add('stop-animation')
        })
      }
    }, {
      root: null,
      threshold: 0.2
    }).observe(document.getElementById('waves'))

    // sakura在视口外时停止动画
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        document.querySelectorAll('.with-love>i').forEach(i => {
          i.classList.remove('stop-animation')
        })
      } else {
        document.querySelectorAll('.with-love>i').forEach(i => {
          i.classList.add('stop-animation')
        })
      }
    }, {
      root: null,
      threshold: 0.2
    }).observe(document.querySelector('.with-love'))
  }
  createIntersectionObserver()
}
