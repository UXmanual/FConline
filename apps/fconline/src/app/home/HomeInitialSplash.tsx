'use client'

import { useEffect, useState } from 'react'
import HomeSplashScreen from './HomeSplashScreen'

const SPLASH_VISIBLE_MS = 520
const SPLASH_FADE_MS = 420
const HOME_SPLASH_SESSION_KEY = 'fc_home_splash_seen'

export default function HomeInitialSplash() {
  const [isFadingOut, setIsFadingOut] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const hasSeenSplash = window.sessionStorage.getItem(HOME_SPLASH_SESSION_KEY) === '1'

    if (hasSeenSplash) {
      const hideFrame = window.requestAnimationFrame(() => {
        setIsVisible(false)
      })

      return () => {
        window.cancelAnimationFrame(hideFrame)
      }
    }

    window.sessionStorage.setItem(HOME_SPLASH_SESSION_KEY, '1')

    const fadeTimer = window.setTimeout(() => {
      setIsFadingOut(true)
    }, SPLASH_VISIBLE_MS)

    const hideTimer = window.setTimeout(() => {
      setIsVisible(false)
    }, SPLASH_VISIBLE_MS + SPLASH_FADE_MS)

    return () => {
      window.clearTimeout(fadeTimer)
      window.clearTimeout(hideTimer)
    }
  }, [])

  if (!isVisible) {
    return null
  }

  return (
    <HomeSplashScreen
      className={`pointer-events-none transition-opacity duration-[420ms] ease-out ${
        isFadingOut ? 'opacity-0' : 'opacity-100'
      }`}
      logoClassName={`transition-transform duration-[420ms] ease-out ${
        isFadingOut ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
      }`}
    />
  )
}
