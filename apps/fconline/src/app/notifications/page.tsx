'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr'
import { formatRelativeTime } from '@/lib/community'
import {
  buildNotificationFeed,
  markNotificationsSeen,
  NOTIFICATION_FEED_UPDATED_EVENT,
  type NotificationFeedItem,
  readStoredPushNotifications,
} from '@/lib/notifications'
import { getSupabaseBrowserClient, getSupabaseUserSafely } from '@/lib/supabase/browser'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationFeedItem[]>([])
  const [expandedIds, setExpandedIds] = useState<string[]>([])
  const titleStyle = { color: 'var(--app-title)' }
  const bodyStyle = { color: 'var(--app-body-text)' }
  const mutedStyle = { color: 'var(--app-muted-text)' }
  const dividerStyle = { borderColor: 'var(--app-divider)' }

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    let isMounted = true

    const syncNotifications = async () => {
      const { user } = await getSupabaseUserSafely(supabase)
      const storedPushNotifications = await readStoredPushNotifications()

      if (!isMounted) {
        return
      }

      const nextNotifications = buildNotificationFeed(storedPushNotifications)
      setNotifications(nextNotifications)

      if (user?.id) {
        markNotificationsSeen(user.id, nextNotifications)
      }
    }

    void syncNotifications()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void syncNotifications()
    })

    const handleRefresh = () => {
      void syncNotifications()
    }

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'fco-push-notification-received') {
        void syncNotifications()
      }
    }

    window.addEventListener(NOTIFICATION_FEED_UPDATED_EVENT, handleRefresh)
    window.addEventListener('focus', handleRefresh)
    navigator.serviceWorker?.addEventListener?.('message', handleServiceWorkerMessage)

    return () => {
      isMounted = false
      subscription.unsubscribe()
      window.removeEventListener(NOTIFICATION_FEED_UPDATED_EVENT, handleRefresh)
      window.removeEventListener('focus', handleRefresh)
      navigator.serviceWorker?.removeEventListener?.('message', handleServiceWorkerMessage)
    }
  }, [])

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) =>
      current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id],
    )
  }

  return (
    <div className="pt-5">
      <div className="flex h-6 items-center">
        <Link
          href="/home"
          aria-label="뒤로가기"
          className="app-player-title inline-flex items-center gap-1.5 text-[18px] font-bold tracking-[-0.02em]"
        >
          <ArrowLeft size={18} weight="bold" />
          <span>홈</span>
        </Link>
      </div>

      <section className="mt-6 rounded-lg px-5 py-1 app-theme-card">
        <ul>
          {notifications.map((item, index) => (
            <li
              key={item.id}
              className={`py-4 ${index === notifications.length - 1 ? '' : 'border-b'}`}
              style={index === notifications.length - 1 ? undefined : dividerStyle}
            >
              <button
                type="button"
                onClick={() => toggleExpanded(item.id)}
                aria-expanded={expandedIds.includes(item.id)}
                className="block w-full text-left"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold leading-[1.4]" style={titleStyle}>
                      {item.title}
                    </p>
                    <p
                      className={`mt-1.5 break-words text-sm leading-[1.55] ${
                        expandedIds.includes(item.id) ? 'whitespace-pre-wrap' : 'line-clamp-2'
                      }`}
                      style={bodyStyle}
                    >
                      {item.body}
                    </p>
                  </div>
                  <span className="shrink-0 pt-0.5 text-[12px] font-medium leading-none" style={mutedStyle}>
                    {formatRelativeTime(item.createdAt)}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-4 px-5 text-center text-[12px] font-medium" style={{ color: 'color-mix(in srgb, var(--app-muted-text) 78%, transparent)' }}>
        7일 전 알림까지 확인할 수 있어요
      </p>
    </div>
  )
}
