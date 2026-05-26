import * as SecureStore from 'expo-secure-store'

const RELEASES_API = 'https://fconlineground.com/api/notifications/releases'
const SEEN_KEY_PREFIX = 'fco-notifications-seen-ts'
const RECENT_WINDOW_MS = 1000 * 60 * 60 * 24 * 7

export type ReleaseItem = {
  id: string
  title: string
  body: string
  createdAt: string
}

export async function fetchReleaseFeed(): Promise<ReleaseItem[]> {
  const res = await fetch(RELEASES_API)
  const { publishedAt, notes } = await res.json() as {
    publishedAt: Record<string, string>
    notes: Record<string, string[]>
  }
  const now = Date.now()
  return Object.entries(publishedAt)
    .filter(([, at]) => now - new Date(at).getTime() < RECENT_WINDOW_MS)
    .sort((a, b) => new Date(b[1]).getTime() - new Date(a[1]).getTime())
    .map(([version, at]) => ({
      id: `release-${version}`,
      title: `버전 ${version} 업데이트`,
      body: (notes[version] ?? []).join(' ').trim() || '새 버전 업데이트가 적용되었습니다.',
      createdAt: at,
    }))
}

function seenKey(userId: string) {
  return `${SEEN_KEY_PREFIX}:${userId}`
}

export async function getSeenTimestamp(userId: string): Promise<number> {
  try {
    const val = await SecureStore.getItemAsync(seenKey(userId))
    return val ? Number(val) : 0
  } catch {
    return 0
  }
}

export async function markAllSeen(feed: ReleaseItem[], userId: string): Promise<void> {
  if (feed.length === 0 || !userId) return
  const latest = Math.max(...feed.map((item) => new Date(item.createdAt).getTime()))
  try {
    await SecureStore.setItemAsync(seenKey(userId), String(latest))
  } catch {}
}

export async function hasUnreadReleases(userId: string | null): Promise<boolean> {
  try {
    const feed = await fetchReleaseFeed()
    if (feed.length === 0) return false
    // 미로그인: 항상 레드닷
    if (!userId) return true
    const seenTs = await getSeenTimestamp(userId)
    const latest = Math.max(...feed.map((item) => new Date(item.createdAt).getTime()))
    return latest > seenTs
  } catch {
    return false
  }
}
