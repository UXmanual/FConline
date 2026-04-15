'use client'

import { useSyncExternalStore } from 'react'

const APP_NOTIFICATIONS_KEY = 'app-notifications-enabled'
const APP_NOTIFICATIONS_EVENT = 'app-notifications-change'
const APP_DEVICE_ID_KEY = 'app-device-id'

type NotificationPermissionRequestResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported' | 'denied' | 'dismissed' | 'subscription_failed' }

type SerializedPushSubscription = {
  endpoint: string
  keys?: {
    p256dh?: string
    auth?: string
  }
}

function getSnapshot() {
  if (typeof window === 'undefined') {
    return false
  }

  return window.localStorage.getItem(APP_NOTIFICATIONS_KEY) === 'true'
}

function getServerSnapshot() {
  return false
}

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handleChange = () => callback()

  window.addEventListener(APP_NOTIFICATIONS_EVENT, handleChange)
  window.addEventListener('storage', handleChange)

  return () => {
    window.removeEventListener(APP_NOTIFICATIONS_EVENT, handleChange)
    window.removeEventListener('storage', handleChange)
  }
}

export function setAppNotificationsEnabled(nextValue: boolean) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(APP_NOTIFICATIONS_KEY, String(nextValue))
  window.dispatchEvent(new Event(APP_NOTIFICATIONS_EVENT))
}

export function getOrCreateAppDeviceId() {
  if (typeof window === 'undefined') {
    return ''
  }

  const stored = window.localStorage.getItem(APP_DEVICE_ID_KEY)
  if (stored) {
    return stored
  }

  const nextValue =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `device-${Date.now()}-${Math.random().toString(16).slice(2)}`

  window.localStorage.setItem(APP_DEVICE_ID_KEY, nextValue)
  return nextValue
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const normalizedBase64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(normalizedBase64)

  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

async function subscribeToPushNotifications() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()
  if (!publicKey) {
    return false
  }

  const registration = await navigator.serviceWorker.ready
  const existingSubscription = await registration.pushManager.getSubscription()
  const subscription =
    existingSubscription ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }))

  const serializedSubscription = subscription.toJSON() as SerializedPushSubscription

  if (!serializedSubscription.endpoint || !serializedSubscription.keys?.p256dh || !serializedSubscription.keys?.auth) {
    return false
  }

  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceId: getOrCreateAppDeviceId(),
      endpoint: serializedSubscription.endpoint,
      p256dh: serializedSubscription.keys.p256dh,
      auth: serializedSubscription.keys.auth,
      platform:
        /android/i.test(window.navigator.userAgent)
          ? 'android'
          : /iphone|ipad|ipod/i.test(window.navigator.userAgent)
            ? 'ios'
            : 'web',
      userAgent: window.navigator.userAgent,
    }),
  })

  return response.ok
}

export async function unsubscribeFromPushNotifications() {
  if (typeof window === 'undefined') {
    return false
  }

  let endpoint = ''

  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      endpoint = subscription.endpoint
      await subscription.unsubscribe().catch(() => {})
    }
  }

  const response = await fetch('/api/push/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceId: getOrCreateAppDeviceId(),
      endpoint,
    }),
  })

  if (response.ok) {
    setAppNotificationsEnabled(false)
  }

  return response.ok
}

export async function sendPushTestNotification() {
  const response = await fetch('/api/push/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceId: getOrCreateAppDeviceId(),
    }),
  })

  return response
}

export async function requestAppNotificationsPermission(): Promise<NotificationPermissionRequestResult> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { ok: false, reason: 'unsupported' }
  }

  if (Notification.permission === 'granted') {
    const subscribed = await subscribeToPushNotifications()
    setAppNotificationsEnabled(subscribed)
    return subscribed ? { ok: true } : { ok: false, reason: 'subscription_failed' }
  }

  if (Notification.permission === 'denied') {
    setAppNotificationsEnabled(false)
    return { ok: false, reason: 'denied' }
  }

  const permission = await Notification.requestPermission()

  if (permission === 'granted') {
    const subscribed = await subscribeToPushNotifications()
    setAppNotificationsEnabled(subscribed)
    return subscribed ? { ok: true } : { ok: false, reason: 'subscription_failed' }
  }

  setAppNotificationsEnabled(false)
  return { ok: false, reason: permission === 'denied' ? 'denied' : 'dismissed' }
}

export function useAppNotificationsEnabled() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
