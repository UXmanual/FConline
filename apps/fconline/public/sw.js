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

const DEFAULT_NOTIFICATION_TITLE = 'FCO Ground'
const DEFAULT_NOTIFICATION_OPTIONS = {
  body: '새로운 알림이 도착했습니다.',
  icon: '/icons/icon-192.png',
  badge: '/icons/icon-192.png',
  data: {
    url: '/home',
  },
}

function normalizeNotificationUrl(url) {
  try {
    return new URL(url, self.location.origin).toString()
  } catch {
    return new URL('/home', self.location.origin).toString()
  }
}

function buildNotificationPayload(event) {
  if (!event.data) {
    return {
      title: DEFAULT_NOTIFICATION_TITLE,
      options: DEFAULT_NOTIFICATION_OPTIONS,
    }
  }

  try {
    const payload = event.data.json()
    const title =
      typeof payload?.title === 'string' && payload.title.trim()
        ? payload.title.trim()
        : DEFAULT_NOTIFICATION_TITLE

    const options = {
      ...DEFAULT_NOTIFICATION_OPTIONS,
      ...(payload?.options ?? {}),
      body:
        typeof payload?.body === 'string' && payload.body.trim()
          ? payload.body.trim()
          : payload?.options?.body ?? DEFAULT_NOTIFICATION_OPTIONS.body,
      data: {
        ...DEFAULT_NOTIFICATION_OPTIONS.data,
        ...(payload?.data ?? {}),
        ...(payload?.options?.data ?? {}),
      },
    }

    return { title, options }
  } catch {
    const text = event.data.text()

    return {
      title: DEFAULT_NOTIFICATION_TITLE,
      options: {
        ...DEFAULT_NOTIFICATION_OPTIONS,
        body: text || DEFAULT_NOTIFICATION_OPTIONS.body,
      },
    }
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL_ROUTES))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('push', (event) => {
  const { title, options } = buildNotificationPayload(event)

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const rawTargetUrl =
    typeof event.notification?.data?.url === 'string' && event.notification.data.url.trim()
      ? event.notification.data.url.trim()
      : '/home'
  const normalizedTargetUrl = normalizeNotificationUrl(rawTargetUrl)

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          const clientUrl = new URL(client.url)

          if (clientUrl.origin !== self.location.origin) {
            continue
          }

          if (client.url === normalizedTargetUrl) {
            return client.focus()
          }

          if ('navigate' in client) {
            await client.focus()
            return client.navigate(normalizedTargetUrl)
          }
        }
      }

      return self.clients.openWindow(normalizedTargetUrl)
    }),
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
