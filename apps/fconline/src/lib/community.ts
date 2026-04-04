import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

export const COMMUNITY_CATEGORIES = ['자유', '모집', '분석', '선수', '팁'] as const

export type CommunityCategory = (typeof COMMUNITY_CATEGORIES)[number]

export type CommunityPostSummary = {
  id: string
  category: CommunityCategory
  nickname: string
  title: string
  content: string
  createdAt: string
  createdAtLabel: string
  commentCount: number
}

export type CommunityCommentItem = {
  id: string
  postId: string
  nickname: string
  content: string
  createdAt: string
  createdAtLabel: string
}

export function isCommunityCategory(value: string): value is CommunityCategory {
  return COMMUNITY_CATEGORIES.includes(value as CommunityCategory)
}

const KOREA_TIME_ZONE = 'Asia/Seoul'

function toKoreaTime(value: string | Date) {
  const target = value instanceof Date ? value : new Date(value)

  return new Date(
    target.toLocaleString('en-US', {
      timeZone: KOREA_TIME_ZONE,
    }),
  )
}

export function getKoreaTimestampString(date = new Date()) {
  const koreaDate = toKoreaTime(date)
  const year = koreaDate.getFullYear()
  const month = String(koreaDate.getMonth() + 1).padStart(2, '0')
  const day = String(koreaDate.getDate()).padStart(2, '0')
  const hours = String(koreaDate.getHours()).padStart(2, '0')
  const minutes = String(koreaDate.getMinutes()).padStart(2, '0')
  const seconds = String(koreaDate.getSeconds()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+09:00`
}

export function formatRelativeTime(value: string | Date, now = new Date()) {
  const target = toKoreaTime(value)
  const current = toKoreaTime(now)
  const diffMs = Math.max(0, current.getTime() - target.getTime())
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffMinutes < 1) return '방금 전'
  if (diffMinutes < 60) return `${diffMinutes}분 전`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}시간 전`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}일 전`
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const hashed = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hashed}`
}

export function verifyPassword(password: string, hashedPassword: string) {
  const [salt, storedHash] = hashedPassword.split(':')

  if (!salt || !storedHash) {
    return false
  }

  const inputHash = scryptSync(password, salt, 64)
  const storedBuffer = Buffer.from(storedHash, 'hex')

  if (inputHash.length !== storedBuffer.length) {
    return false
  }

  return timingSafeEqual(inputHash, storedBuffer)
}
