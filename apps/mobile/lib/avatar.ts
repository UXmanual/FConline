const DEFAULT_AVATARS = [
  '😀','😄','😎','🤓','🥳','😇','🤩','😏','🥸','🤗',
  '😈','👻','😂','🤣','😊','😍','🤔','😴','🤑','😤',
  '😡','😱','🤯','🤠','👽','🤡','😆','😅','🙃','🧐',
  '🐶','🐱','🦊','🐼','🦁','🐯','🐸','🦄','🐙','🦋',
  '🐧','🦉','🐺','🐻','🐨','🐹','🦝','🐲','🐮','🐷',
  '🐔','🦆','🦅','🐝','🦀','🦑','🐬','🐳','🦈','🦜',
  '🐴','🦓','🐘','🦒','🐑','🐕','🐈',
  '🎮','🚀','💎','🔥','⭐','🎯','🏆','👑','💀','🤖',
  '👾','🎸','🍕','🎂','🌈','🍀',
]

export function pickDefaultAvatar(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return DEFAULT_AVATARS[hash % DEFAULT_AVATARS.length] ?? '😀'
}

export function randomDefaultAvatar(): string {
  return DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)] ?? '😀'
}
