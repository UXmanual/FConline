import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

export const COMMUNITY_CATEGORIES = ['자유', '모집', '분석', '선수', '팁'] as const

export type CommunityCategory = (typeof COMMUNITY_CATEGORIES)[number]

export type CommunityPostSummary = {
  id: string
  category: CommunityCategory
  nickname: string
  ipPrefix?: string | null
  title: string
  content: string
  createdAt: string
  createdAtLabel: string
  commentCount: number
  canDelete?: boolean
}

export type CommunityCommentItem = {
  id: string
  postId: string
  nickname: string
  ipPrefix?: string | null
  content: string
  createdAt: string
  createdAtLabel: string
  canDelete?: boolean
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

const COMMUNITY_NICKNAME_OWNER_EMAIL = 'uxdmanual@gmail.com'

export function isCommunityAdminEmail(email?: string | null) {
  return email?.trim().toLowerCase() === COMMUNITY_NICKNAME_OWNER_EMAIL
}

export function canDeleteCommunityPost(
  postLike: { author_user_id?: string | null; password_hash?: string | null },
  currentUserId?: string | null,
  currentUserEmail?: string | null,
) {
  if (!currentUserId) {
    return false
  }

  if (isCommunityAdminEmail(currentUserEmail)) {
    return true
  }

  if (postLike.author_user_id && postLike.author_user_id === currentUserId) {
    return true
  }

  if (postLike.password_hash) {
    return verifyPassword(currentUserId, postLike.password_hash)
  }

  return false
}

export function getIpPrefixFromHeader(rawValue: string | null) {
  const firstValue = rawValue?.split(',')[0]?.trim()

  if (!firstValue) {
    return null
  }

  const normalized = firstValue.replace(/^\[|\]$/g, '')

  if (normalized.includes('.')) {
    const ipv4Candidate = normalized.split(':')[0]
    const parts = ipv4Candidate.split('.').filter(Boolean)

    if (parts.length >= 2) {
      return `${parts[0]}.${parts[1]}`
    }
  }

  if (normalized.includes(':')) {
    const parts = normalized.split(':').filter(Boolean)

    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`
    }
  }

  return null
}

export function normalizeCommunityNickname(value: string) {
  return value.trim().slice(0, 10)
}

const RESERVED_COMMUNITY_NICKNAMES = ['운영자', '관리자']
const BLOCKED_COMMUNITY_NICKNAME_TERMS = [
  '시발',
  '씨발',
  '병신',
  '븅신',
  '좆',
  '존나',
  '개새끼',
  '지랄',
  '걸레',
  '보지',
  '자지',
  '섹스',
  'sex',
  'fuck',
  'pussy',
  'penis',
  'boji',
  'jaji',
]

function normalizeNicknameForModeration(value: string) {
  return normalizeCommunityNickname(value)
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[._-]/g, '')
}

export function canBypassCommunityNicknamePolicy(email?: string | null) {
  return isCommunityAdminEmail(email)
}

export function validateCommunityNickname(value: string, email?: string | null) {
  const normalized = normalizeCommunityNickname(value)

  if (!normalized) {
    return '닉네임을 입력해 주세요.'
  }

  if (canBypassCommunityNicknamePolicy(email)) {
    return null
  }

  const moderationTarget = normalizeNicknameForModeration(normalized)

  if (
    RESERVED_COMMUNITY_NICKNAMES.some(
      (nickname) => normalizeNicknameForModeration(nickname) === moderationTarget,
    )
  ) {
    return '사용할 수 없는 닉네임입니다.'
  }

  if (BLOCKED_COMMUNITY_NICKNAME_TERMS.some((term) => moderationTarget.includes(term))) {
    return '사용할 수 없는 닉네임입니다.'
  }

  return null
}

export function deriveCommunityNickname(userLike: {
  email?: string | null
  user_metadata?: { community_nickname?: unknown; full_name?: unknown; name?: unknown } | null
}) {
  const metadataNickname = userLike.user_metadata?.community_nickname
  if (typeof metadataNickname === 'string') {
    const normalized = normalizeCommunityNickname(metadataNickname)
    if (normalized) {
      return normalized
    }
  }

  const metadataFullName = userLike.user_metadata?.full_name
  if (typeof metadataFullName === 'string') {
    const normalized = normalizeCommunityNickname(metadataFullName)
    if (normalized) {
      return normalized
    }
  }

  const metadataName = userLike.user_metadata?.name
  if (typeof metadataName === 'string') {
    const normalized = normalizeCommunityNickname(metadataName)
    if (normalized) {
      return normalized
    }
  }

  const emailPrefix = userLike.email?.split('@')[0]
  if (emailPrefix) {
    const normalized = normalizeCommunityNickname(emailPrefix)
    if (normalized) {
      return normalized
    }
  }

  return 'Google 사용자'
}
