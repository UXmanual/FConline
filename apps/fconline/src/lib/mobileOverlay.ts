import { useEffect, useState } from 'react'

export function useLockedBodyScroll(isLocked: boolean) {
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

    return () => {
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
  }, [isLocked])
}

export function useVisualViewportHeight(isEnabled: boolean) {
  const [viewportHeight, setViewportHeight] = useState<number | null>(() =>
    typeof window === 'undefined' ? null : Math.round(window.visualViewport?.height ?? window.innerHeight),
  )

  useEffect(() => {
    if (!isEnabled || typeof window === 'undefined') {
      return
    }

    const updateViewportHeight = () => {
      const nextHeight = window.visualViewport?.height ?? window.innerHeight
      setViewportHeight(Math.round(nextHeight))
    }

    updateViewportHeight()

    const visualViewport = window.visualViewport
    visualViewport?.addEventListener('resize', updateViewportHeight)
    visualViewport?.addEventListener('scroll', updateViewportHeight)
    window.addEventListener('resize', updateViewportHeight)

    return () => {
      visualViewport?.removeEventListener('resize', updateViewportHeight)
      visualViewport?.removeEventListener('scroll', updateViewportHeight)
      window.removeEventListener('resize', updateViewportHeight)
    }
  }, [isEnabled])

  return isEnabled ? viewportHeight : null
}
