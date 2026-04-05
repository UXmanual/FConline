'use client'

import { useEffect, useSyncExternalStore } from 'react'

const DARK_MODE_KEY = 'app-dark-mode'
const DARK_MODE_EVENT = 'app-dark-mode-change'
const DARK_MODE_CLASS = 'app-dark-mode'

function applyDarkModeClass(enabled: boolean) {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.classList.toggle(DARK_MODE_CLASS, enabled)
}

function getSnapshot() {
  if (typeof window === 'undefined') {
    return false
  }

  return window.localStorage.getItem(DARK_MODE_KEY) === 'true'
}

function getServerSnapshot() {
  return false
}

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handleChange = () => callback()

  window.addEventListener(DARK_MODE_EVENT, handleChange)
  window.addEventListener('storage', handleChange)

  return () => {
    window.removeEventListener(DARK_MODE_EVENT, handleChange)
    window.removeEventListener('storage', handleChange)
  }
}

export function setDarkModeEnabled(nextValue: boolean) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(DARK_MODE_KEY, String(nextValue))
  applyDarkModeClass(nextValue)
  window.dispatchEvent(new Event(DARK_MODE_EVENT))
}

export function useDarkModeEnabled() {
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  useEffect(() => {
    applyDarkModeClass(value)
  }, [value])

  return value
}
