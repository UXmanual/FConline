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
    let hasReloadedForControllerChange = false

    const activateUpdatedServiceWorker = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      }
    }

    const handleControllerChange = () => {
      if (hasReloadedForControllerChange) {
        return
      }

      hasReloadedForControllerChange = true
      window.location.reload()
    }

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        })

        await registration.update()
        activateUpdatedServiceWorker(registration)

        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing

          if (!installingWorker) {
            return
          }

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              activateUpdatedServiceWorker(registration)
            }
          })
        })
      } catch (error) {
        if (!isCancelled) {
          console.error('[PWA] Failed to register service worker.', error)
        }
      }
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    if (document.readyState === 'complete') {
      void registerServiceWorker()
    } else {
      window.addEventListener('load', registerServiceWorker, { once: true })
    }

    return () => {
      isCancelled = true
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
      window.removeEventListener('load', registerServiceWorker)
    }
  }, [])

  return null
}
