'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const VISITOR_ID_KEY = 'fc_visitor_id'

function generateId() {
  try {
    return crypto.randomUUID()
  } catch {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
    })
  }
}

function getOrCreateVisitorId() {
  try {
    const existing = localStorage.getItem(VISITOR_ID_KEY)
    if (existing) return existing
    const id = generateId()
    localStorage.setItem(VISITOR_ID_KEY, id)
    return id
  } catch {
    return generateId()
  }
}

export default function PageViewTracker() {
  const pathname = usePathname()

  useEffect(() => {
    const visitorId = getOrCreateVisitorId()
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname, visitorId }),
    }).catch(() => {})
  }, [pathname])

  return null
}
