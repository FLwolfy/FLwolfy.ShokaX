export const waline_path = function (
  rawPath: string,
  options: { mergeByRoot?: boolean; root?: string; postLang?: string } = {}
) {
  const mergeByRoot = options.mergeByRoot !== false
  const root = (options.root || '/').trim()
  const postLang = String(options.postLang || '').trim().toLowerCase()

  let p = (rawPath || '/').toString().trim()
  if (!p.startsWith('/')) p = '/' + p
  p = p.replace(/index\.html$/i, '')
  if (!p) p = '/'

  if (mergeByRoot) {
    const normalizedRoot = root.startsWith('/') ? root : `/${root}`
    const rootNoTrailing = normalizedRoot.replace(/\/+$/, '')
    if (rootNoTrailing && rootNoTrailing !== '/') {
      if (p === rootNoTrailing) p = '/'
      else if (p.startsWith(rootNoTrailing + '/')) p = p.slice(rootNoTrailing.length)
    }

    if (postLang) {
      const langPrefix = `/${postLang}`
      const lowerPath = p.toLowerCase()
      if (lowerPath === langPrefix) p = '/'
      else if (lowerPath.startsWith(langPrefix + '/')) p = p.slice(langPrefix.length)
    } else {
      const lowerPath = p.toLowerCase()
      const langPrefixes = ['/zh-cn', '/zh-tw', '/zh-hk', '/en', '/ja']
      const matched = langPrefixes.find((prefix) => lowerPath === prefix || lowerPath.startsWith(prefix + '/'))
      if (matched) p = p.slice(matched.length) || '/'
    }
  }

  if (!p.endsWith('/')) p += '/'
  return p
}
