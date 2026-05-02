hexo.extend.helper.register('waline_path', function(rawPath, langOrOptions) {
  const options = typeof langOrOptions === 'string'
    ? { postLang: langOrOptions }
    : (langOrOptions || {})

  const mergeByRoot = options.mergeByRoot !== false
  const root = String(options.root || '/').trim()
  const postLang = String(options.postLang || '').trim().toLowerCase()

  let p = String(rawPath || '/').trim()
  if (!p.startsWith('/')) p = `/${p}`
  p = p.replace(/index\.html$/i, '')
  if (!p) p = '/'

  if (mergeByRoot) {
    const normalizedRoot = root.startsWith('/') ? root : `/${root}`
    const rootNoTrailing = normalizedRoot.replace(/\/+$/, '')
    if (rootNoTrailing && rootNoTrailing !== '/') {
      if (p === rootNoTrailing) p = '/'
      else if (p.startsWith(`${rootNoTrailing}/`)) p = p.slice(rootNoTrailing.length)
    }

    if (postLang) {
      const langPrefix = `/${postLang}`
      const lowerPath = p.toLowerCase()
      if (lowerPath === langPrefix) p = '/'
      else if (lowerPath.startsWith(`${langPrefix}/`)) p = p.slice(langPrefix.length)
    } else {
      const lowerPath = p.toLowerCase()
      const langPrefixes = ['/zh-cn', '/zh-tw', '/zh-hk', '/en', '/ja']
      const matched = langPrefixes.find((prefix) => lowerPath === prefix || lowerPath.startsWith(`${prefix}/`))
      if (matched) p = p.slice(matched.length) || '/'
    }
  }

  if (!p.endsWith('/')) p += '/'
  return p
})