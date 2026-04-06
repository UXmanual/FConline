'use client'

import { useEffect, useLayoutEffect } from 'react'
import { usePathname } from 'next/navigation'
import BottomNav from '@/components/layout/BottomNav'

export default function AppChrome() {
  const pathname = usePathname()
  const hideFooter = pathname.startsWith('/community')

  useEffect(() => {
    if (!('scrollRestoration' in window.history)) return

    const previousScrollRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'

    return () => {
      window.history.scrollRestoration = previousScrollRestoration
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
      {!hideFooter ? (
        <>
          <div
            className="px-5 pb-0.5 text-left text-[11px] leading-5"
            style={{
              backgroundColor: 'var(--app-page-bg)',
              color: 'var(--app-footer-text)',
              transition: 'background-color 180ms ease, color 180ms ease',
            }}
          >
            게임 배너, 이미지, 선수 정보의 저작권은 NEXON Korea Corporation에 있습니다.
          </div>
          <footer
            className="px-5 pb-4 text-left text-xs font-medium tracking-[0.02em]"
            style={{
              backgroundColor: 'var(--app-page-bg)',
              color: 'var(--app-footer-text)',
              transition: 'background-color 180ms ease, color 180ms ease',
            }}
          >
            {'\u00A9uxdmanual'}
          </footer>
        </>
      ) : null}
      <BottomNav />
    </>
  )
}
