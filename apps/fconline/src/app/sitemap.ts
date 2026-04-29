import type { MetadataRoute } from 'next'

const SITE_URL = 'https://fconlineground.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return [
    '/',
    '/home',
    '/players',
    '/matches',
    '/community',
    '/notifications',
    '/mypage',
    '/privacy',
    '/data-deletion',
    '/offline',
  ].map((path) => ({
    url: `${SITE_URL}${path === '/' ? '' : path}`,
    lastModified,
    changeFrequency: path === '/' || path === '/home' ? 'daily' : 'weekly',
    priority: path === '/' || path === '/home' ? 1 : 0.7,
  }))
}
