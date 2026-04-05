'use client'

import Image from 'next/image'
import logo from '@/components/icons/logo.svg'
import darkLogo from '@/components/icons/logo-dark.svg'
import { useDarkModeEnabled } from '@/lib/darkMode'

export default function HomeLogo() {
  const isDarkModeEnabled = useDarkModeEnabled()

  return (
    <Image
      src={isDarkModeEnabled ? darkLogo : logo}
      alt="FCO manual"
      priority
      className="h-6 w-auto"
    />
  )
}
