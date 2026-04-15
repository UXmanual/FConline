'use client'

import { useEffect } from 'react'

export default function PwaBootstrap() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      return
    }

    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
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
