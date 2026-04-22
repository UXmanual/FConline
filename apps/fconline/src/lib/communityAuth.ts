import 'server-only'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { isCommunityAdminEmail } from '@/lib/community'

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
