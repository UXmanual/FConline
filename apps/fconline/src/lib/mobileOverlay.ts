import { useEffect, useState, type RefObject } from 'react'

type VisualViewportMetrics = {
  height: number | null
  bottomInset: number
}

export function useLockedBodyScroll(
  isLocked: boolean,
  scrollableRef?: RefObject<HTMLElement | null> | null,
) {
  useEffect(() => {
    if (!isLocked || typeof window === 'undefined') {
      return
    }

    const scrollY = window.scrollY
    const previousHtmlOverflow = document.documentElement.style.overflow
    const previousHtmlOverscrollBehavior = document.documentElement.style.overscrollBehavior
    const previousBodyOverflow = document.body.style.overflow
    const previousBodyOverscrollBehavior = document.body.style.overscrollBehavior
    const previousBodyPosition = document.body.style.position
    const previousBodyTop = document.body.style.top
    const previousBodyLeft = document.body.style.left
    const previousBodyRight = document.body.style.right
    const previousBodyWidth = document.body.style.width

    document.documentElement.style.overflow = 'hidden'
    document.documentElement.style.overscrollBehavior = 'none'
    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'none'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
    document.body.style.width = '100%'

    let touchStartY = 0

    const handleTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0]?.clientY ?? 0
    }

    const handleTouchMove = (event: TouchEvent) => {
      const scrollable = scrollableRef?.current ?? null
      const target = event.target as Node | null

      if (scrollable && target && scrollable.contains(target)) {
        const currentY = event.touches[0]?.clientY ?? touchStartY
        const deltaY = currentY - touchStartY
        const isScrollable = scrollable.scrollHeight > scrollable.clientHeight
        const isAtTop = scrollable.scrollTop <= 0
        const isAtBottom =
          scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 1

        if (!isScrollable || (isAtTop && deltaY > 0) || (isAtBottom && deltaY < 0)) {
          event.preventDefault()
        }

        return
      }

      event.preventDefault()
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: false })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.documentElement.style.overflow = previousHtmlOverflow
      document.documentElement.style.overscrollBehavior = previousHtmlOverscrollBehavior
      document.body.style.overflow = previousBodyOverflow
      document.body.style.overscrollBehavior = previousBodyOverscrollBehavior
      document.body.style.position = previousBodyPosition
      document.body.style.top = previousBodyTop
      document.body.style.left = previousBodyLeft
      document.body.style.right = previousBodyRight
      document.body.style.width = previousBodyWidth
      window.scrollTo({ top: scrollY, left: 0, behavior: 'auto' })
    }
  }, [isLocked, scrollableRef])
}

export function useVisualViewportMetrics(isEnabled: boolean) {
  const [metrics, setMetrics] = useState<VisualViewportMetrics>(() => {
    if (typeof window === 'undefined') {
      return { height: null, bottomInset: 0 }
    }

    const visualViewport = window.visualViewport
    const height = Math.round(visualViewport?.height ?? window.innerHeight)
    const layoutHeight = Math.max(window.innerHeight, document.documentElement.clientHeight)
    const bottomInset = Math.max(
      0,
      Math.round(layoutHeight - ((visualViewport?.height ?? window.innerHeight) + (visualViewport?.offsetTop ?? 0))),
    )

    return { height, bottomInset }
  })

  useEffect(() => {
    if (!isEnabled || typeof window === 'undefined') {
      return
    }

    const updateViewportMetrics = () => {
      const visualViewport = window.visualViewport
      const height = Math.round(visualViewport?.height ?? window.innerHeight)
      const layoutHeight = Math.max(window.innerHeight, document.documentElement.clientHeight)
      const bottomInset = Math.max(
        0,
        Math.round(layoutHeight - ((visualViewport?.height ?? window.innerHeight) + (visualViewport?.offsetTop ?? 0))),
      )

      setMetrics({ height, bottomInset })
    }

    updateViewportMetrics()

    const visualViewport = window.visualViewport
    visualViewport?.addEventListener('resize', updateViewportMetrics)
    visualViewport?.addEventListener('scroll', updateViewportMetrics)
    window.addEventListener('resize', updateViewportMetrics)

    return () => {
      visualViewport?.removeEventListener('resize', updateViewportMetrics)
      visualViewport?.removeEventListener('scroll', updateViewportMetrics)
      window.removeEventListener('resize', updateViewportMetrics)
    }
  }, [isEnabled])

  if (!isEnabled) {
    return { height: null, bottomInset: 0 }
  }

  return metrics
}
