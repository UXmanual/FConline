'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'

const OFFICIAL_HOST = 'fconlineground.com'
const DISMISS_KEY = 'fc_legacy_domain_notice_dismissed'
const PLAY_STORE_APP_URL = 'market://details?id=com.fcoground.app'
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.fcoground.app'
const PLAY_STORE_TESTING_URL = 'https://play.google.com/apps/testing/com.fcoground.app'

function buildOfficialUrl() {
  if (typeof window === 'undefined') {
    return `https://${OFFICIAL_HOST}/home`
  }

  const url = new URL(window.location.href)
  url.protocol = 'https:'
  url.host = OFFICIAL_HOST
  return url.toString()
}

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
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    const currentHost = window.location.hostname.toLowerCase()
    const isOfficialHost = currentHost === OFFICIAL_HOST
    const isLegacyVercelHost = currentHost.endsWith('.vercel.app')
    const wasDismissed = window.sessionStorage.getItem(DISMISS_KEY) === '1'

    return !isOfficialHost && isLegacyVercelHost && !wasDismissed
  })

  const officialUrl = useMemo(() => buildOfficialUrl(), [])

  if (!isVisible) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[160] flex items-end justify-center bg-[rgba(10,14,20,0.58)] px-5 pb-[calc(env(safe-area-inset-bottom)+92px)] pt-6 sm:items-center sm:pb-6">
      <section
        className="w-full max-w-[420px] rounded-[28px] border px-5 pb-5 pt-5 shadow-[0_24px_64px_rgba(15,23,42,0.28)]"
        style={{
          backgroundColor: 'var(--app-modal-bg, #ffffff)',
          borderColor: 'rgba(148,163,184,0.18)',
        }}
      >
        <div className="space-y-3">
          <span
            className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em]"
            style={{
              backgroundColor: 'rgba(37,99,235,0.12)',
              color: '#2563eb',
            }}
          >
            DOMAIN UPDATE
          </span>
          <div className="space-y-2">
            <h2
              className="text-[20px] font-bold leading-7"
              style={{ color: 'var(--app-body-text)' }}
            >
              앱을 먼저 업데이트해 주세요
            </h2>
            <p className="text-[14px] leading-6" style={{ color: 'var(--app-muted-text)' }}>
              현재 예전 Vercel 주소로 접속 중입니다. 베타 테스터는 Play 스토어에서 최신 앱으로
              업데이트한 뒤 다시 열어 주세요.
            </p>
          </div>
          <div
            className="rounded-[20px] px-4 py-3 text-[13px] leading-5"
            style={{
              backgroundColor: 'var(--app-page-bg)',
              color: 'var(--app-muted-text)',
            }}
          >
            업데이트 후에는 앱이 새 공식 도메인 `fconlineground.com` 기준으로 열리고, 로그인과
            앱 링크도 최신 설정으로 동작합니다.
          </div>
          <div className="flex flex-col gap-2 pt-1">
            <Button
              type="button"
              className="h-11 w-full rounded-[16px] text-sm font-semibold"
              onClick={() => {
                openPlayStore()
              }}
            >
              Play 스토어에서 업데이트
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-[16px] text-sm font-semibold"
              onClick={() => {
                window.location.href = PLAY_STORE_TESTING_URL
              }}
            >
              베타 테스트 페이지 열기
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-[16px] text-sm font-semibold"
              onClick={() => {
                window.location.href = officialUrl
              }}
            >
              웹에서 계속 보기
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-10 w-full rounded-[16px] text-sm font-semibold"
              onClick={() => {
                window.sessionStorage.setItem(DISMISS_KEY, '1')
                setIsVisible(false)
              }}
            >
              나중에
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
