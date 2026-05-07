'use client'

import { RELEASE_NOTES_BY_VERSION, RELEASE_PUBLISHED_AT_BY_VERSION } from '@/lib/appVersion'

export const NOTIFICATION_FEED_CACHE_NAME = 'fco-ground-notification-feed-v1'
export const NOTIFICATION_FEED_CACHE_URL = '/__notifications_feed__'
export const NOTIFICATION_FEED_UPDATED_EVENT = 'fco-notification-feed-updated'
export const NOTIFICATION_RECENT_WINDOW_MS = 1000 * 60 * 60 * 24 * 7

const NOTIFICATION_SEEN_KEY_PREFIX = 'fco-notifications-seen'

export type PushNotificationFeedItem = {
  id: string
  kind: 'push'
  title: string
  body: string
  createdAt: string
  url?: string
  metaKind?: string | null
}

export type ReleaseNotificationFeedItem = {
  id: string
  kind: 'release'
  title: string
  body: string
  createdAt: string
  url: string
  version: string
}

export type NotificationFeedItem = PushNotificationFeedItem | ReleaseNotificationFeedItem

function dispatchNotificationFeedUpdated() {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new Event(NOTIFICATION_FEED_UPDATED_EVENT))
}

function getNotificationsSeenKey(userId: string) {
  return `${NOTIFICATION_SEEN_KEY_PREFIX}:${userId}`
}

function getReleasePublishedAt(version: string) {
  return RELEASE_PUBLISHED_AT_BY_VERSION[version] ?? '2026-01-01T00:00:00+09:00'
}

function isFiniteDate(value: string) {
  return Number.isFinite(new Date(value).getTime())
}

export function getReleaseNotifications(): ReleaseNotificationFeedItem[] {
  const all = Object.entries(RELEASE_NOTES_BY_VERSION)
    .map(([version, notes]) => ({
      id: `release-${version}`,
      kind: 'release' as const,
      title: `버전 ${version} 업데이트`,
      body: notes.join(' ').trim() || '새 버전 업데이트가 적용되었습니다.',
      createdAt: getReleasePublishedAt(version),
      url: '/notifications',
      version,
    }))
    .filter((item) => isRecentNotification(item.createdAt))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return all.slice(0, 1)
}

export function isRecentNotification(createdAt: string) {
  const createdAtTime = new Date(createdAt).getTime()

  if (!Number.isFinite(createdAtTime)) {
    return false
  }

  return Date.now() - createdAtTime <= NOTIFICATION_RECENT_WINDOW_MS
}

export function isUpdatePushNotification(item: PushNotificationFeedItem) {
  return item.metaKind === 'app_update'
}

export async function readStoredPushNotifications() {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return [] as PushNotificationFeedItem[]
  }

  try {
    const cache = await window.caches.open(NOTIFICATION_FEED_CACHE_NAME)
    const response = await cache.match(NOTIFICATION_FEED_CACHE_URL)

    if (!response) {
      return []
    }

    const parsed = (await response.json()) as PushNotificationFeedItem[]

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter((item) => {
      return (
        item &&
        item.kind === 'push' &&
        typeof item.id === 'string' &&
        typeof item.title === 'string' &&
        typeof item.body === 'string' &&
        typeof item.createdAt === 'string' &&
        isFiniteDate(item.createdAt)
      )
    })
  } catch {
    return []
  }
}

export function buildNotificationFeed(pushNotifications: PushNotificationFeedItem[]) {
  const releaseNotifications = getReleaseNotifications()
  const recentPushNotifications = pushNotifications.filter((item) => {
    return !isUpdatePushNotification(item) && isRecentNotification(item.createdAt)
  })

  return [...releaseNotifications, ...recentPushNotifications]
    .filter((item) => isRecentNotification(item.createdAt))
    .sort((left, right) => {
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    })
}

export function getLatestNotificationTimestamp(notifications: NotificationFeedItem[]) {
  return notifications.reduce((latest, item) => {
    const createdAtTime = new Date(item.createdAt).getTime()

    if (!Number.isFinite(createdAtTime)) {
      return latest
    }

    return Math.max(latest, createdAtTime)
  }, 0)
}

export function markNotificationsSeen(userId: string, notifications: NotificationFeedItem[]) {
  if (typeof window === 'undefined' || !userId) {
    return
  }

  const latestNotificationTimestamp = getLatestNotificationTimestamp(notifications)

  if (!latestNotificationTimestamp) {
    return
  }

  window.localStorage.setItem(getNotificationsSeenKey(userId), String(latestNotificationTimestamp))
  dispatchNotificationFeedUpdated()
}

export function hasUnreadNotifications(userId: string, notifications: NotificationFeedItem[]) {
  if (typeof window === 'undefined' || !userId) {
    return false
  }

  const latestNotificationTimestamp = getLatestNotificationTimestamp(notifications)

  if (!latestNotificationTimestamp) {
    return false
  }

  const seenValue = window.localStorage.getItem(getNotificationsSeenKey(userId))
  const seenTimestamp = seenValue ? Number(seenValue) : 0

  return !Number.isFinite(seenTimestamp) || latestNotificationTimestamp > seenTimestamp
}

export function notifyNotificationFeedUpdated() {
  dispatchNotificationFeedUpdated()
}
