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

const shouldSkipLocalPageview = function () {
  const allowLocal = (CONFIG.waline as any)?.countLocalhost === true
  if (allowLocal) return false

  const host = (window.location.hostname || '').toLowerCase()
  return host === 'localhost' || host === '127.0.0.1' || host === '::1'
}

const withCurrentRoot = function (rawPath: string) {
  let p = (rawPath || '/').trim()
  if (!p.startsWith('/')) p = '/' + p

  const cfgRoot = (CONFIG.root || '/').trim()
  const normalizedRoot = cfgRoot.startsWith('/') ? cfgRoot : `/${cfgRoot}`
  const rootNoTrailing = normalizedRoot.replace(/\/+$/, '')

  if (!rootNoTrailing || rootNoTrailing === '/') return p
  if (p === rootNoTrailing || p.startsWith(rootNoTrailing + '/')) return p
  return `${rootNoTrailing}${p}`
}

const toPlainText = function (value: string) {
  const el = document.createElement('div')
  el.innerHTML = value
  el.querySelectorAll('img[alt]').forEach((img) => {
    img.replaceWith(document.createTextNode((img as HTMLImageElement).alt))
  })
  return (el.textContent || el.innerText || value).trim()
}

const normalizeRecentComments = function (payload: any) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.comments)) return payload.comments
  if (Array.isArray(payload?.comments?.data)) return payload.comments.data
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.data?.data)) return payload.data.data
  return []
}

const fetchRecentCommentsDirectly = async function (serverURL: string) {
  const url = `${serverURL.replace(/\/+$/, '')}/api/comment?type=recent&count=10&lang=${encodeURIComponent(CONFIG.waline.lang || navigator.language)}`
  const res = await fetch(url, {
    cache: 'no-store',
    credentials: 'omit'
  })
  if (!res.ok) throw new Error(`Waline recent comments failed: ${res.status}`)
  return res.json()
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
    // Keep pageview counting in walinePageview() so localhost skipping works.
    pageview: false,
    path: window.location.pathname,
    recaptchaV3Key: CONFIG.waline.recaptchaV3Key,
    turnstileKey: CONFIG.waline.turnstileKey,
    dark: 'html[data-theme="dark"]'
  })
}

export const walinePageview = function () {
  if (!CONFIG.waline.pageview) return

  const serverURL = normalizeServerURL(CONFIG.waline.serverURL)
  const localReadOnly = shouldSkipLocalPageview()
  pageviewCount({
    serverURL,
    path: window.location.pathname,
    // On localhost with countLocalhost=false, fetch count only without increment.
    update: !localReadOnly
  })
}

export const walineRecentComments = async function () {
  const serverURL = normalizeServerURL(CONFIG.waline.serverURL)
  const commentsContainer = document.getElementById('new-comment')
  if (!serverURL || !commentsContainer) return
  const root = shokax_siteURL.replace(/^(https?:\/\/)?[^/]*/, '')
  let items = []
  const recentComments = await RecentComments({
    serverURL,
    count: 10
  })

  let comments = normalizeRecentComments(recentComments)
  let directComments = null

  if (!comments.length) {
    directComments = await fetchRecentCommentsDirectly(serverURL).catch(() => null)
    comments = normalizeRecentComments(directComments)
  }

  comments.forEach(function (item: any) {
    const rawText = toPlainText(String(item.orig || item.comment || item.commentText || ''))
    let cText = (rawText.length > 50) ? rawText.substring(0, 50) + '...' : rawText
    const rawUrl = String(item.url || item.path || '/')
    const routedPath = withCurrentRoot(rawUrl)
    const siteLink = routedPath + (item.objectId ? '#' + item.objectId : '')

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
      nick: item.nick || item.nickName || '匿名',
      time: dateStr,
      text: cText
    })
  })
  const newComments = new DocumentFragment()
  commentsContainer.textContent = ''
  commentsContainer.dataset.loaded = String(items.length)
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
