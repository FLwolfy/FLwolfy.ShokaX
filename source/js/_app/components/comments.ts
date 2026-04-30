import { CONFIG } from '../globals/globalVars'
import { init, RecentComments } from '@waline/client'
import { pageviewCount } from '@waline/client/pageview'
// @ts-ignore
await import('@waline/client/style')

const normalizeServerURL = function (url: string) {
  const trimmed = (url || '').trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export const walineComment = function () {
  const serverURL = normalizeServerURL(CONFIG.waline.serverURL)
  init({
    el: '#comments',
    serverURL,
    lang: CONFIG.waline.lang,
    locale: CONFIG.waline.locale,
    emoji: CONFIG.waline.emoji,
    meta: CONFIG.waline.meta,
    requiredMeta: CONFIG.waline.requiredMeta,
    wordLimit: CONFIG.waline.wordLimit,
    pageSize: CONFIG.waline.pageSize,
    pageview: CONFIG.waline.pageview,
    path: window.location.pathname,
    recaptchaV3Key: CONFIG.waline.recaptchaV3Key,
    turnstileKey: CONFIG.waline.turnstileKey,
    dark: 'html[data-theme="dark"]'
  })
}

export const walinePageview = function () {
  const serverURL = normalizeServerURL(CONFIG.waline.serverURL)
  pageviewCount({
    serverURL,
    path: window.location.pathname
  })
}

export const walineRecentComments = async function () {
  const serverURL = normalizeServerURL(CONFIG.waline.serverURL)
  const commentsContainer = document.getElementById('new-comment')
  if (!serverURL || !commentsContainer) return
  const root = shokax_siteURL.replace(/^(https?:\/\/)?[^/]*/, '')
  let items = []
  const { comments } = await RecentComments({
    serverURL,
    count: 10
  })
  // @ts-ignore
  comments.data.forEach(function (item) {
    let cText = (item.orig.length > 50) ? item.orig.substring(0, 50) + '...' : item.orig
    item.url = item.url.startsWith('/') ? item.url : '/' + item.url
    const siteLink = item.url + '#' + item.objectId

    const time = new Date(item.time)
    const now = new Date()
    const diff = now.valueOf() - time.valueOf()
    let dateStr:string
    if (diff < 3600000) {
      dateStr = `${Math.floor(diff / 60000)} 分钟前`
    } else if (diff < 86400000) {
      dateStr = `${Math.floor(diff / 3600000)} 小时前`
    } else if (diff < 2592000000) {
      dateStr = `${Math.floor(diff / 86400000)} 天前`
    } else {
      dateStr = `${time.getFullYear()}-${time.getMonth() + 1}-${time.getDate()}`
    }

    items.push({
      href: siteLink,
      nick: item.nick,
      time: dateStr,
      text: cText
    })
  })
  const newComments = new DocumentFragment()
  items.forEach(function (item) {
    const commentEl = document.createElement('li')
    const commentLink = document.createElement('a')
    const commentTime = document.createElement('span')
    const commentText = document.createElement('span')

    commentText.innerText = item.text
    commentTime.className = 'breadcrumb'
    commentTime.innerText = `${item.nick} @ ${item.time}`
    commentLink.href = root + item.href
    commentEl.className = 'item'

    commentText.appendChild(document.createElement('br'))
    commentLink.appendChild(commentTime)
    commentLink.appendChild(commentText)
    commentEl.appendChild(commentLink)
    newComments.appendChild(commentEl)
  })

  commentsContainer.appendChild(newComments)
}
