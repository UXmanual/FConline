'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import BottomNav from '@/components/layout/BottomNav'
import { STANDALONE_BOTTOM_COMPENSATION_PX } from '@/components/layout/bottomInset'

export default function AppChrome() {
  const pathname = usePathname()
  const showFooter = pathname === '/mypage'
  const [isStandaloneDisplayMode, setIsStandaloneDisplayMode] = useState(false)
  const mypageFooterPaddingBottom =
    showFooter && isStandaloneDisplayMode
      ? `calc(env(safe-area-inset-bottom) + ${STANDALONE_BOTTOM_COMPENSATION_PX}px)`
      : undefined
  const sharedStandaloneSpacerHeight =
    !showFooter && isStandaloneDisplayMode ? STANDALONE_BOTTOM_COMPENSATION_PX : 0

  useEffect(() => {
    if (!('scrollRestoration' in window.history)) return

    const previousScrollRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'

    return () => {
      window.history.scrollRestoration = previousScrollRestoration
    }
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(display-mode: standalone)')

    const updateDisplayMode = () => {
      const isStandalone =
        mediaQuery.matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        (typeof navigator !== 'undefined' &&
          'standalone' in navigator &&
          Boolean((navigator as Navigator & { standalone?: boolean }).standalone))

      setIsStandaloneDisplayMode(isStandalone)
    }

    updateDisplayMode()
    mediaQuery.addEventListener?.('change', updateDisplayMode)

    return () => {
      mediaQuery.removeEventListener?.('change', updateDisplayMode)
    }
  }, [])

  useLayoutEffect(() => {
    const currentSearchParams = new URLSearchParams(window.location.search)
    const hasMatchDeepLink = pathname.startsWith('/matches') && currentSearchParams.get('matchId')
    if (hasMatchDeepLink) {
      return
    }

    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      document.scrollingElement?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }

    scrollToTop()

    const firstFrameId = window.requestAnimationFrame(scrollToTop)
    const secondFrameId = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(scrollToTop)
    })
    const timeoutId = window.setTimeout(scrollToTop, 120)

    return () => {
      window.cancelAnimationFrame(firstFrameId)
      window.cancelAnimationFrame(secondFrameId)
      window.clearTimeout(timeoutId)
    }
  }, [pathname])

  return (
    <>
      {showFooter ? (
        <>
          <div
            className="px-5 pb-0.5 text-left text-[11px] leading-5"
            style={{
              backgroundColor: 'var(--app-page-bg)',
              color: 'var(--app-footer-text)',
              transition: 'background-color 180ms ease, color 180ms ease',
            }}
          >
            {'API 선수 정보 및 관련 이미지 저작권은 NEXON Korea Corporation에 있습니다.'}
          </div>
          <footer
            className="px-5 pb-4 text-left text-xs font-medium tracking-[0.02em]"
            style={{
              paddingBottom: mypageFooterPaddingBottom,
              backgroundColor: 'var(--app-page-bg)',
              color: 'var(--app-footer-text)',
              transition: 'background-color 180ms ease, color 180ms ease',
            }}
          >
            {'\u00A9uxdmanual'}
          </footer>
        </>
      ) : null}
      <div
        aria-hidden="true"
        style={{
          height: `${sharedStandaloneSpacerHeight}px`,
          backgroundColor: 'var(--app-page-bg)',
          transition: 'background-color 180ms ease',
        }}
      />
      <BottomNav isStandaloneDisplayMode={isStandaloneDisplayMode} />
    </>
  )
}
