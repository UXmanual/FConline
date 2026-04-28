'use client'

import { Button } from '@/components/ui/button'
import { OFFICIAL_APP_HOST } from '@/lib/appUrl'

const PLAY_STORE_APP_URL = 'market://details?id=com.fcoground.app'
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.fcoground.app'

function openPlayStore() {
  if (typeof window === 'undefined') {
    return
  }

  const fallbackTimer = window.setTimeout(() => {
    window.location.href = PLAY_STORE_URL
  }, 900)

  const clearFallback = () => {
    window.clearTimeout(fallbackTimer)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('pagehide', clearFallback)
    window.removeEventListener('blur', clearFallback)
  }

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      clearFallback()
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('pagehide', clearFallback, { once: true })
  window.addEventListener('blur', clearFallback, { once: true })
  window.location.href = PLAY_STORE_APP_URL
}

export default function LegacyDomainNotice() {
  const isVisible = (() => {
    if (typeof window === 'undefined') {
      return false
    }

    const currentHost = window.location.hostname.toLowerCase()
    const isOfficialHost = currentHost === OFFICIAL_APP_HOST
    const isLegacyVercelHost = currentHost.endsWith('.vercel.app')
    const isAndroid = /android/i.test(window.navigator.userAgent)

    return isAndroid && !isOfficialHost && isLegacyVercelHost
  })()

  if (!isVisible) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-[rgba(10,14,20,0.58)] px-5 py-6">
      <section
        className="w-full max-w-[420px] rounded-[28px] border px-5 pb-5 pt-5 shadow-[0_24px_64px_rgba(15,23,42,0.28)]"
        style={{
          backgroundColor: 'var(--app-modal-bg, #ffffff)',
          borderColor: 'rgba(148,163,184,0.18)',
        }}
      >
        <div className="space-y-4">
          <h2
            className="text-[20px] font-bold leading-7"
            style={{ color: 'var(--app-title)' }}
          >
            앱 업데이트를 해주세요
          </h2>
          <div className="pt-1">
            <Button
              type="button"
              className="h-11 w-full rounded-[16px] border-0 text-sm font-semibold"
              style={{
                backgroundColor: 'var(--app-accent-blue)',
                color: '#ffffff',
              }}
              onClick={() => {
                openPlayStore()
              }}
            >
              Play 스토어에서 업데이트
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
