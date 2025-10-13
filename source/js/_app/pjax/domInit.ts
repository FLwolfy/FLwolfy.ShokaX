import { backToTopHandle, goToBottomHandle, goToCommentHandle, sideBarToggleHandle } from '../components/sidebar'
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

  const inner = document.querySelector('#sidebar .panels > .inner');
  if (inner) {
    const updateShadows = () => {
      const scrollTop = inner.scrollTop;
      const maxScroll = inner.scrollHeight - inner.clientHeight;

      inner.classList.toggle('scroll-top', scrollTop > 0);
      inner.classList.toggle('scroll-bottom', scrollTop < maxScroll);
    };

    inner.addEventListener('scroll', updateShadows);
    window.addEventListener('resize', updateShadows);
    updateShadows();
  }

  // ==============================
  // osu-container 动画控制函数
  // ==============================

  function toggleOsuContainer() {
    const osuContainer = document.getElementById('osuContainer');
    if (!osuContainer) return;

    if (osuContainer.style.display === 'block') {
      hideOsuContainer();
    } else {
      osuContainer.style.display = 'block';
      void osuContainer.offsetWidth;
      osuContainer.style.opacity = '1';
      osuContainer.style.transform = 'translate(-50%, -55%)';
    }
  }

  function hideOsuContainer() {
    const osuContainer = document.getElementById('osuContainer');
    if (!osuContainer) return;

    osuContainer.style.opacity = '0';
    osuContainer.style.transform = 'translate(-50%, -80%)';
    osuContainer.addEventListener(
      'transitionend',
      () => {
        osuContainer.style.display = 'none';
      },
      { once: true }
    );
  }

  document.querySelector('li.item.wheel > i')?.addEventListener('click', toggleOsuContainer);
  document.getElementById('osu-close')?.addEventListener('click', hideOsuContainer);

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

  // 如果没有 #comments，则隐藏 chat
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
