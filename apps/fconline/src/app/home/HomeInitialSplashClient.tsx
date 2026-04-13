'use client'

import dynamic from 'next/dynamic'

const HomeInitialSplash = dynamic(() => import('./HomeInitialSplash'), {
  ssr: false,
})

export default function HomeInitialSplashClient() {
  return <HomeInitialSplash />
}
