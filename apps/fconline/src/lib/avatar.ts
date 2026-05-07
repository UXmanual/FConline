export const DEFAULT_AVATARS = [
  // 표정/캐릭터
  '😀', '😄', '😎', '🤓', '🥳', '😇', '🤩', '😏', '🥸', '🤗',
  '😈', '👻', '😂', '🤣', '😊', '😍', '🤔', '😴', '🤑', '😤',
  '😡', '😱', '🤯', '🤠', '👽', '🤡', '😆', '😅', '🙃', '🧐',
  // 동물
  '🐶', '🐱', '🦊', '🐼', '🦁', '🐯', '🐸', '🦄', '🐙', '🦋',
  '🐧', '🦉', '🐺', '🐻', '🐨', '🐹', '🦝', '🐲', '🐮', '🐷',
  '🐔', '🦆', '🦅', '🐝', '🦀', '🦑', '🐬', '🐳', '🦈', '🦜',
  '🐴', '🦓', '🐘', '🦒', '🐑', '🐕', '🐈',
  // 오브젝트/기타
  '🎮', '🚀', '💎', '🔥', '⭐', '🎯', '🏆', '👑', '💀', '🤖',
  '👾', '🎸', '🍕', '🎂', '🌈', '🍀',
]

export function pickDefaultAvatar(userId: string) {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0
  }
  return DEFAULT_AVATARS[hash % DEFAULT_AVATARS.length]
}

export function appendAvatarVersion(
  avatarUrl: string | null | undefined,
  version: string | number | null | undefined,
) {
  if (typeof avatarUrl !== 'string') {
    return null
  }

  const trimmedAvatarUrl = avatarUrl.trim()
  if (!trimmedAvatarUrl) {
    return null
  }

  if (version === null || version === undefined) {
    return trimmedAvatarUrl
  }

  const trimmedVersion = String(version).trim()
  if (!trimmedVersion) {
    return trimmedAvatarUrl
  }

  try {
    const url = new URL(trimmedAvatarUrl)
    url.searchParams.set('v', trimmedVersion)
    return url.toString()
  } catch {
    const separator = trimmedAvatarUrl.includes('?') ? '&' : '?'
    return `${trimmedAvatarUrl}${separator}v=${encodeURIComponent(trimmedVersion)}`
  }
}
