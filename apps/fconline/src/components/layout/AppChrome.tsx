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
            className="px-5 pb-0.5 -mt-2 text-left text-[11px] leading-[1.4]"
            style={{
              backgroundColor: 'var(--app-page-bg)',
              color: 'var(--app-footer-text)',
              transition: 'background-color 180ms ease, color 180ms ease',
            }}
          >
            {'FconlineGround는 비공식 애플리케이션입니다. 본 애플리케이션은 EA Sports 및 NEXON의 공식 승인을 받지 않았으며, 공식 의견이나 관리와는 무관합니다. 애플리케이션 내에 포함된 FC 온라인 관련 이미지는 EA Sports 및 NEXON의 고유 재산이자 등록 상표입니다. 본 애플리케이션은 어떠한 저작권 침해 의도도 없음을 밝힙니다.'}
          </div>
          <footer
            className="px-5 pt-2 pb-4 text-left text-xs font-medium tracking-[0.02em]"
            style={{
              paddingBottom: mypageFooterPaddingBottom,
              backgroundColor: 'var(--app-page-bg)',
              color: 'var(--app-footer-text)',
              transition: 'background-color 180ms ease, color 180ms ease',
            }}
          >
            {'Data provided by NEXON Open API'}
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
