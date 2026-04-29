import type { Metadata } from 'next'
import OfflinePageClient from './OfflinePageClient'

export const metadata: Metadata = {
  title: '오프라인 안내 | FConline Ground',
}

export default function OfflinePage() {
  return <OfflinePageClient />
}
