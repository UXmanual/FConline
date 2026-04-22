'use client'

import { useEffect } from 'react'

export default function PwaBootstrap() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    if (process.env.NODE_ENV !== 'production') {
      let isCancelled = false

      const cleanupDevServiceWorkers = async () => {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations()
          await Promise.all(registrations.map((registration) => registration.unregister()))
        } catch (error) {
          if (!isCancelled) {
            console.error('[PWA] Failed to unregister service workers in development.', error)
          }
        }

        try {
          const cacheNames = await caches.keys()
          await Promise.all(
            cacheNames
              .filter((cacheName) => cacheName.startsWith('fco-ground-'))
              .map((cacheName) => caches.delete(cacheName)),
          )
        } catch (error) {
          if (!isCancelled) {
            console.error('[PWA] Failed to clear caches in development.', error)
          }
        }
      }

      void cleanupDevServiceWorkers()

      return () => {
        isCancelled = true
      }
    }

    if (!('serviceWorker' in navigator)) {
      return
    }

    let isCancelled = false

    const registerServiceWorker = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        })
      } catch (error) {
        if (!isCancelled) {
          console.error('[PWA] Failed to register service worker.', error)
        }
      }
    }

    if (document.readyState === 'complete') {
      void registerServiceWorker()
    } else {
      window.addEventListener('load', registerServiceWorker, { once: true })
    }

    return () => {
      isCancelled = true
      window.removeEventListener('load', registerServiceWorker)
    }
  }, [])

  return null
}
