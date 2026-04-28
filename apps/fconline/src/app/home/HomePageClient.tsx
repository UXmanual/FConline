'use client'

import type { ReactNode } from 'react'
import LegacyDomainNotice from './LegacyDomainNotice'

export default function HomePageClient({ children }: { children: ReactNode }) {
  return (
    <>
      <LegacyDomainNotice />
      {children}
    </>
  )
}
