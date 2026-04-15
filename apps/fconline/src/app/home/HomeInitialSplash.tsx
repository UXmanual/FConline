'use client'

import { useEffect, useState } from 'react'
import HomeSplashScreen from './HomeSplashScreen'

const SPLASH_VISIBLE_MS = 520
const SPLASH_FADE_MS = 420
const HOME_SPLASH_SESSION_KEY = 'fc_home_splash_seen'
type SplashPhase = 'checking' | 'visible' | 'fading' | 'hidden'

export default function HomeInitialSplash() {
  const [phase, setPhase] = useState<SplashPhase>('checking')

  useEffect(() => {
    const hasSeenSplash = window.sessionStorage.getItem(HOME_SPLASH_SESSION_KEY) === '1'

    if (hasSeenSplash) {
      return
    }

    window.sessionStorage.setItem(HOME_SPLASH_SESSION_KEY, '1')
    const showFrame = window.requestAnimationFrame(() => {
      setPhase('visible')
    })

    const fadeTimer = window.setTimeout(() => {
      setPhase('fading')
    }, SPLASH_VISIBLE_MS)

    const hideTimer = window.setTimeout(() => {
      setPhase('hidden')
    }, SPLASH_VISIBLE_MS + SPLASH_FADE_MS)

    return () => {
      window.cancelAnimationFrame(showFrame)
      window.clearTimeout(fadeTimer)
      window.clearTimeout(hideTimer)
    }
  }, [])

  if (phase === 'checking' || phase === 'hidden') {
    return null
  }

  return (
    <HomeSplashScreen
      className={`pointer-events-none transition-opacity duration-[420ms] ease-out ${
        phase === 'fading' ? 'opacity-0' : 'opacity-100'
      }`}
      logoClassName={`transition-transform duration-[420ms] ease-out ${
        phase === 'fading' ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
      }`}
    />
  )
}
