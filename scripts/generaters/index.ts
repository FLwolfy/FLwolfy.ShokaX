// @ts-nocheck
/* global hexo */
'use strict'

import { readFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import pagination from 'hexo-pagination'

function getFileExtension(path) {
  const filename = path.split(/[\\/]/).pop() || ''; // 处理路径分隔符并获取文件名
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex > 0 ? filename.slice(lastDotIndex + 1) : '';
}

function isRemoteUrl(value: string) {
  return /^https?:\/\//i.test(value) || /^\/\//.test(value)
}

function loadCategorySlugMapFromTree() {
  const map = {}
  try {
    const treePath = join(process.cwd(), 'category-tree.json')
    if (!existsSync(treePath)) return map
    const raw = readFileSync(treePath, 'utf8')
    const json = JSON.parse(raw)
    const categories = Array.isArray(json?.categories) ? json.categories : []

    for (const c1 of categories) {
      if (c1 && c1.name && c1.slug) map[String(c1.name)] = String(c1.slug)
      const children = Array.isArray(c1?.children) ? c1.children : []
      for (const c2 of children) {
        if (c2 && c2.name && c2.slug) map[String(c2.name)] = String(c2.slug)
      }
    }
  } catch (_) {}
  return map
}

hexo.config.index_generator = Object.assign({
  per_page: typeof hexo.config.per_page === 'undefined' ? 10 : hexo.config.per_page,
  order_by: '-date'
}, hexo.config.index_generator)

hexo.extend.helper.register('getCoverExt', function (path:string) {
  const theme = hexo.theme.config
  if (theme.homeConfig.cateCards.length > 0) {
    const cardMap = new Map<string, string>()
    theme.homeConfig.cateCards.forEach((card) => {
      cardMap.set(card.slug, card.cover)
    })

    if (cardMap.has(path)) {
      const cover = cardMap.get(path)
      return getFileExtension(cover)
    }
  }
})


hexo.extend.generator.register('index',async function (locals) {
  const covers = []
  const catlist = []
  let pages
  const config = hexo.config
  const sticky = locals.posts.find({ sticky: true }).sort(config.index_generator.order_by)
  const posts = locals.posts.find({ sticky: {$in: [false, undefined]} }).sort(config.index_generator.order_by)
  const paginationDir = config.pagination_dir || 'page'
  const path = config.index_generator.path || ''
  const categories = locals.categories
  const theme = hexo.theme.config
  const themeCards = Array.isArray(theme?.homeConfig?.cateCards) ? theme.homeConfig.cateCards : []
  const cardMap = new Map<string, string>()
  themeCards.forEach((card) => {
    if (!card || !card.slug || !card.cover) return
    cardMap.set(String(card.slug).toLowerCase(), String(card.cover))
  })
  const configCategoryMap = config?.category_map || {}
  const treeCategoryMap = loadCategorySlugMapFromTree()
  const resolveCategorySlug = function (cat) {
    return String(configCategoryMap?.[cat.name] || treeCategoryMap?.[cat.name] || cat.slug || '')
  }

  const getTopcat = function (cat) {
    if (cat.parent) {
      const pCat = categories.findOne({ _id: cat.parent })
      return getTopcat(pCat)
    } else {
      return cat
    }
  }

  if (categories && categories.length) {
    await Promise.all(
      categories.map(async (cat) => {
        if (cardMap.size > 0) {
          const cardSlug = resolveCategorySlug(cat)
          const cover = cardMap.get(String(cardSlug).toLowerCase())
          if (cover) {
            if (isRemoteUrl(cover)) {
              cat.cardCover = cover
            } else {
              const coverData = await readFile(`source/_posts/${cover}`)
              const ext = getFileExtension(cover)
              const cardCoverPath = `${cardSlug}/cover.${ext}`
              covers.push({
                path: cardCoverPath,
                data: coverData
              })
              cat.cardCover = `/${cardCoverPath}`
            }

            const topcat = getTopcat(cat)

            if (topcat._id !== cat._id) {
              cat.top = topcat
            }

            const child = categories.find({ parent: cat._id })
            let pl = 6

            if (child.length !== 0) {
              cat.child = child.length
              cat.subs = child.sort({ name: 1 }).limit(6).toArray()
              pl = Math.max(0, pl - child.length)
              if (pl > 0) {
                cat.subs.push(...cat.posts.sort({ title: 1 })
                  .filter(function (item, i) { return item.categories.last()._id === cat._id })
                  .limit(pl).toArray())
              }
            } else {
              cat.subs = cat.posts.sort({ title: 1 }).limit(6).toArray()
            }

            catlist.push(cat)
          }
        }
      })
    )
  }

  if (posts.length > 0) {
    pages = pagination(path, posts, {
      perPage: config.index_generator.per_page,
      layout: ['index', 'archive'],
      format: paginationDir + '/%d/',
      data: {
        __index: true,
        catlist,
        sticky
      }
    })
  } else {
    pages = [{
      path,
      layout: ['index', 'archive'],
      data: {
        __index: true,
        catlist,
        sticky,
        current: 1,
      }
    }]
  }

  return [...covers, ...pages]
})
