export const LOGIN_REWARD_XP = 5
export const COMMUNITY_POST_XP = 12
export const PLAYER_REVIEW_POST_XP = 10
export const COMMUNITY_COMMENT_XP = 4
export const PLAYER_REVIEW_COMMENT_XP = 4
export const FIRST_POST_BONUS_XP = 5
export const FIRST_COMMENT_BONUS_XP = 3
export const DAILY_COMMENT_XP_LIMIT = 5
export const MIN_COMMENT_XP_LENGTH = 5
export const MAX_LEVEL = 99

type LevelRangeConfig = {
  minLevel: number
  maxLevel: number
  baseXpGain: number
  stepXpGain: number
  color: string
}

// Edit these decade configs to rebalance the full 1~99 level curve.
const LEVEL_RANGE_CONFIGS: LevelRangeConfig[] = [
  { minLevel: 1, maxLevel: 10, baseXpGain: 20, stepXpGain: 5, color: 'var(--app-muted-text)' },
  { minLevel: 11, maxLevel: 20, baseXpGain: 70, stepXpGain: 10, color: '#457ae5' },
  { minLevel: 21, maxLevel: 30, baseXpGain: 175, stepXpGain: 15, color: '#0f9f8c' },
  { minLevel: 31, maxLevel: 40, baseXpGain: 330, stepXpGain: 20, color: '#18a957' },
  { minLevel: 41, maxLevel: 50, baseXpGain: 535, stepXpGain: 25, color: '#65b32e' },
  { minLevel: 51, maxLevel: 60, baseXpGain: 790, stepXpGain: 30, color: '#d4a017' },
  { minLevel: 61, maxLevel: 70, baseXpGain: 1095, stepXpGain: 35, color: '#d97904' },
  { minLevel: 71, maxLevel: 80, baseXpGain: 1450, stepXpGain: 40, color: '#d94f3d' },
  { minLevel: 81, maxLevel: 90, baseXpGain: 1855, stepXpGain: 45, color: '#c43d6b' },
  { minLevel: 91, maxLevel: 99, baseXpGain: 2310, stepXpGain: 50, color: '#8b5cf6' },
]

export type UserLevelSnapshot = {
  level: number
  xpTotal: number
  currentLevelXp: number
  nextLevel: number | null
  nextLevelXp: number | null
  remainingXp: number
  progressPercent: number
}

function getLevelRangeConfig(level: number) {
  const safeLevel = Math.min(MAX_LEVEL, Math.max(1, Math.floor(level)))
  return (
    LEVEL_RANGE_CONFIGS.find((config) => safeLevel >= config.minLevel && safeLevel <= config.maxLevel) ??
    LEVEL_RANGE_CONFIGS[0]
  )
}

function getXpGainForLevel(level: number) {
  const safeLevel = Math.min(MAX_LEVEL, Math.max(2, Math.floor(level)))
  const config = getLevelRangeConfig(safeLevel)
  const offset = safeLevel - Math.max(2, config.minLevel)
  return config.baseXpGain + offset * config.stepXpGain
}

export function getLevelXpRequirement(level: number) {
  if (!Number.isFinite(level) || level <= 1) {
    return 0
  }

  const safeLevel = Math.min(MAX_LEVEL, Math.max(1, Math.floor(level)))
  let xpRequired = 0

  for (let currentLevel = 2; currentLevel <= safeLevel; currentLevel += 1) {
    xpRequired += getXpGainForLevel(currentLevel)
  }

  return xpRequired
}

export function getLevelFromXp(xpTotal: number) {
  const safeXpTotal = Math.max(0, Math.floor(xpTotal))
  let level = 1

  while (level < MAX_LEVEL && getLevelXpRequirement(level + 1) <= safeXpTotal) {
    level += 1
  }

  return level
}

export function buildUserLevelSnapshot(xpTotal: number): UserLevelSnapshot {
  const safeXpTotal = Math.max(0, Math.floor(xpTotal))
  const level = getLevelFromXp(safeXpTotal)
  const currentLevelXp = getLevelXpRequirement(level)
  const nextLevel = level >= MAX_LEVEL ? null : level + 1
  const nextLevelXp = nextLevel ? getLevelXpRequirement(nextLevel) : null
  const remainingXp = nextLevelXp ? Math.max(0, nextLevelXp - safeXpTotal) : 0
  const levelSpan = nextLevelXp ? Math.max(1, nextLevelXp - currentLevelXp) : 1
  const progressPercent = nextLevelXp
    ? Math.min(100, Math.max(0, Math.round(((safeXpTotal - currentLevelXp) / levelSpan) * 100)))
    : 100

  return {
    level,
    xpTotal: safeXpTotal,
    currentLevelXp,
    nextLevel,
    nextLevelXp,
    remainingXp,
    progressPercent,
  }
}

export function formatLevelLabel(level?: number | null) {
  const safeLevel = Number.isFinite(level) ? Math.min(MAX_LEVEL, Math.max(1, Math.floor(level as number))) : 1
  return `Lv.${safeLevel}`
}

export function getLevelTextColor(level?: number | null) {
  if (!Number.isFinite(level)) {
    return 'var(--app-muted-text)'
  }

  return getLevelRangeConfig(level as number).color
}

export function getLevelRangeGuide() {
  return LEVEL_RANGE_CONFIGS.map((config) => ({
    minLevel: config.minLevel,
    maxLevel: config.maxLevel,
    color: config.color,
  }))
}
