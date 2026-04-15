const STATIC_CACHE_NAME = 'fco-ground-static-v1'
const PAGE_CACHE_NAME = 'fco-ground-pages-v1'
const ASSET_CACHE_NAME = 'fco-ground-assets-v1'

const APP_SHELL_ROUTES = [
  '/',
  '/home',
  '/matches',
  '/players',
  '/community',
  '/mypage',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/icons/favicon-16x16.png',
  '/icons/favicon-32x32.png',
  '/icons/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL_ROUTES))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                ![STATIC_CACHE_NAME, PAGE_CACHE_NAME, ASSET_CACHE_NAME].includes(cacheName),
            )
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') {
    return
  }

  const url = new URL(request.url)

  if (url.origin !== self.location.origin) {
    return
  }

  if (url.pathname.startsWith('/api/')) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone()
            void caches.open(PAGE_CACHE_NAME).then((cache) => cache.put(request, responseClone))
          }

          return response
        })
        .catch(async () => {
          const cachedPage = await caches.match(request)
          if (cachedPage) {
            return cachedPage
          }

          return (
            (await caches.match('/home')) ||
            new Response('Offline', {
              status: 503,
              statusText: 'Offline',
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
          )
        }),
    )
    return
  }

  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    /\.(?:css|js|ico|png|jpg|jpeg|svg|webp|woff2?)$/i.test(url.pathname)

  if (!isStaticAsset) {
    return
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone()
            void caches.open(ASSET_CACHE_NAME).then((cache) => cache.put(request, responseClone))
          }

          return response
        })
        .catch(() => cachedResponse)

      return cachedResponse || networkFetch
    }),
  )
})
