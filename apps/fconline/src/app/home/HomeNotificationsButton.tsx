'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getSupabaseBrowserClient, getSupabaseUserSafely } from '@/lib/supabase/browser'
import {
  buildNotificationFeed,
  hasUnreadNotifications,
  NOTIFICATION_FEED_UPDATED_EVENT,
  readStoredPushNotifications,
} from '@/lib/notifications'

function HomeNotificationIcon() {
  return (
    <svg width="18" height="20" viewBox="0 0 18 20" fill="none" aria-hidden="true">
      <path d="M2 7C2 3.13401 5.13401 0 9 0C12.866 0 16 3.13401 16 7V14H2V7Z" fill="currentColor" />
      <path d="M6 17H12C12 18.6569 10.6569 20 9 20C7.34315 20 6 18.6569 6 17Z" fill="currentColor" />
      <path d="M0 13.5C0 12.1193 1.11929 11 2.5 11H15.5C16.8807 11 18 12.1193 18 13.5C18 14.8807 16.8807 16 15.5 16H2.5C1.11929 16 0 14.8807 0 13.5Z" fill="currentColor" />
    </svg>
  )
}

export default function HomeNotificationsButton() {
  const [showUnreadDot, setShowUnreadDot] = useState(false)
  const [isUnreadStateReady, setIsUnreadStateReady] = useState(false)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    let isMounted = true

    const syncUnreadState = async () => {
      const { user } = await getSupabaseUserSafely(supabase)

      if (!isMounted) {
        return
      }

      if (!user) {
        setShowUnreadDot(true)
        setIsUnreadStateReady(true)
        return
      }

      const storedPushNotifications = await readStoredPushNotifications()

      if (!isMounted) {
        return
      }

      const notifications = buildNotificationFeed(storedPushNotifications)
      setShowUnreadDot(hasUnreadNotifications(user.id, notifications))
      setIsUnreadStateReady(true)
    }

    void syncUnreadState()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void syncUnreadState()
    })

    const handleRefresh = () => {
      void syncUnreadState()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void syncUnreadState()
      }
    }

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'fco-push-notification-received') {
        void syncUnreadState()
      }
    }

    window.addEventListener(NOTIFICATION_FEED_UPDATED_EVENT, handleRefresh)
    window.addEventListener('storage', handleRefresh)
    window.addEventListener('focus', handleRefresh)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    navigator.serviceWorker?.addEventListener?.('message', handleServiceWorkerMessage)

    return () => {
      isMounted = false
      subscription.unsubscribe()
      window.removeEventListener(NOTIFICATION_FEED_UPDATED_EVENT, handleRefresh)
      window.removeEventListener('storage', handleRefresh)
      window.removeEventListener('focus', handleRefresh)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      navigator.serviceWorker?.removeEventListener?.('message', handleServiceWorkerMessage)
    }
  }, [])

  return (
    <Link
      href="/notifications"
      aria-label="알림"
      className="relative inline-flex h-8 w-8 items-center justify-center rounded-full transition-opacity hover:opacity-80"
      style={{ color: 'var(--app-nav-icon)' }}
    >
      <HomeNotificationIcon />
      {isUnreadStateReady && showUnreadDot ? (
        <span
          aria-hidden="true"
          className="absolute right-[2px] top-[2px] h-[6px] w-[6px] rounded-full"
          style={{ backgroundColor: '#ef4444' }}
        />
      ) : null}
    </Link>
  )
}
