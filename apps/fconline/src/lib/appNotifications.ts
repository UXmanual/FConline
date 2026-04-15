'use client'

import { useSyncExternalStore } from 'react'

const APP_NOTIFICATIONS_KEY = 'app-notifications-enabled'
const APP_NOTIFICATIONS_EVENT = 'app-notifications-change'

type NotificationPermissionRequestResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported' | 'denied' | 'dismissed' }

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

export async function requestAppNotificationsPermission(): Promise<NotificationPermissionRequestResult> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { ok: false, reason: 'unsupported' }
  }

  if (Notification.permission === 'granted') {
    setAppNotificationsEnabled(true)
    return { ok: true }
  }

  if (Notification.permission === 'denied') {
    setAppNotificationsEnabled(false)
    return { ok: false, reason: 'denied' }
  }

  const permission = await Notification.requestPermission()

  if (permission === 'granted') {
    setAppNotificationsEnabled(true)
    return { ok: true }
  }

  setAppNotificationsEnabled(false)
  return { ok: false, reason: permission === 'denied' ? 'denied' : 'dismissed' }
}

export function useAppNotificationsEnabled() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
