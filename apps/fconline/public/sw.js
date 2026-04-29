const STATIC_CACHE_NAME = 'fco-ground-static-v2'
const PAGE_CACHE_NAME = 'fco-ground-pages-v2'
const ASSET_CACHE_NAME = 'fco-ground-assets-v2'
const NOTIFICATION_FEED_CACHE_NAME = 'fco-ground-notification-feed-v1'
const NOTIFICATION_FEED_CACHE_URL = '/__notifications_feed__'
const MAX_STORED_NOTIFICATIONS = 30

const APP_SHELL_ROUTES = [
  '/',
  '/home',
  '/offline',
  '/matches',
  '/players',
  '/community',
  '/mypage',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/favicon.png',
  '/icons/favicon-16x16.png',
  '/icons/favicon-32x32.png',
  '/icons/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

const DEFAULT_NOTIFICATION_TITLE = 'FConline Ground'
const DEFAULT_NOTIFICATION_OPTIONS = {
  body: '새로운 알림이 도착했습니다.',
  icon: '/icons/notification-icon-512.png',
  badge: '/icons/notification-badge.png',
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

async function readStoredNotifications() {
  const cache = await caches.open(NOTIFICATION_FEED_CACHE_NAME)
  const response = await cache.match(NOTIFICATION_FEED_CACHE_URL)

  if (!response) {
    return []
  }

  try {
    const parsed = await response.json()
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeStoredNotifications(items) {
  const cache = await caches.open(NOTIFICATION_FEED_CACHE_NAME)
  await cache.put(
    NOTIFICATION_FEED_CACHE_URL,
    new Response(JSON.stringify(items), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    }),
  )
}

function normalizeStoredNotification(payload) {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const rawData = payload.data && typeof payload.data === 'object' ? payload.data : {}
  const title =
    typeof payload.title === 'string' && payload.title.trim()
      ? payload.title.trim()
      : DEFAULT_NOTIFICATION_TITLE
  const body =
    typeof payload.body === 'string' && payload.body.trim()
      ? payload.body.trim()
      : DEFAULT_NOTIFICATION_OPTIONS.body
  const createdAt =
    typeof payload.createdAt === 'string' && payload.createdAt.trim()
      ? payload.createdAt.trim()
      : new Date().toISOString()
  const metaKind =
    typeof rawData.kind === 'string' && rawData.kind.trim()
      ? rawData.kind.trim()
      : null

  return {
    id:
      typeof rawData.notificationId === 'string' && rawData.notificationId.trim()
        ? rawData.notificationId.trim()
        : `push-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind: 'push',
    title,
    body,
    createdAt,
    url:
      typeof rawData.url === 'string' && rawData.url.trim()
        ? normalizeNotificationUrl(rawData.url.trim())
        : normalizeNotificationUrl('/home'),
    metaKind,
  }
}

async function persistNotification(payload) {
  const normalized = normalizeStoredNotification(payload)

  if (!normalized || normalized.metaKind === 'app_update') {
    return null
  }

  const existing = await readStoredNotifications()
  const deduped = existing.filter((item) => item && item.id !== normalized.id)
  const nextItems = [normalized, ...deduped].slice(0, MAX_STORED_NOTIFICATIONS)
  await writeStoredNotifications(nextItems)

  return normalized
}

async function notifyClientsOfNotification(item) {
  if (!item) {
    return
  }

  const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  await Promise.all(
    clientList.map((client) =>
      client.postMessage({
        type: 'fco-push-notification-received',
        notification: item,
      }),
    ),
  )
}

function buildNotificationPayload(event) {
  if (!event.data) {
    return {
      title: DEFAULT_NOTIFICATION_TITLE,
      options: DEFAULT_NOTIFICATION_OPTIONS,
      payload: null,
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

    return { title, options, payload }
  } catch {
    const text = event.data.text()

    return {
      title: DEFAULT_NOTIFICATION_TITLE,
      options: {
        ...DEFAULT_NOTIFICATION_OPTIONS,
        body: text || DEFAULT_NOTIFICATION_OPTIONS.body,
      },
      payload: {
        title: DEFAULT_NOTIFICATION_TITLE,
        body: text || DEFAULT_NOTIFICATION_OPTIONS.body,
        data: {
          url: '/home',
        },
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
  const { title, options, payload } = buildNotificationPayload(event)

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      persistNotification(payload).then((item) => notifyClientsOfNotification(item)),
    ]),
  )
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
            (await caches.match('/offline')) ||
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
