export const MATCH_TYPE_NAMES: Record<number, string> = {
  30: '리그 친선',
  40: '클래식 1on1',
  50: '공식경기',
  52: '감독모드',
  60: '공식 친선',
  204: '볼타 친선',
  214: '볼타 공식',
  224: '볼타 AI 대전',
  234: '볼타 커스텀',
}

export const VOLTA_MATCH_TYPES = [
  { type: 214, label: '볼타 공식' },
  { type: 204, label: '볼타 친선' },
  { type: 224, label: 'AI 대전' },
  { type: 234, label: '커스텀' },
]

export interface MatchUser {
  ouid: string
  nickname: string
}

export interface MatchSearchCandidate {
  nickname: string
  nexonSn: string
  ouid?: string | null
  level: number | null
  rank: number | null
  elo: number | null
  rankLabel?: string | null
  rankIconUrl?: string | null
  winRate: number | null
  wins: number | null
  draws: number | null
  losses: number | null
  teamColors: string[]
  formation: string | null
  price: string | null
  modes: string[]
  source: 'exact' | 'rank'
  voltaRank: number | null
  voltaRankPoint: number | null
  voltaRankIconUrl: string | null
  voltaWinRate: number | null
  voltaWins: number | null
  voltaDraws: number | null
  voltaLosses: number | null
  voltaAverageRating: number | null
  voltaMomCount: number | null
  voltaGoals: number | null
  voltaAssists: number | null
  voltaTackleRate: string | null
  voltaBlockRate: string | null
  voltaEffectiveShots: string | null
  voltaPassRate: string | null
  voltaDribbleRate: string | null
  voltaMainPosition: string | null
}

export interface MatchPlayerInfo {
  ouid: string
  nickname: string
  matchDetail: {
    seasonId: number
    matchResult: string
    matchEndType: number
    foul: number
    injury: number
    redCards: number
    yellowCards: number
    dribble: number
    cornerKick: number
    possession: number
    offsideCount: number
    averageRating: number
    controller: string
  }
  shoot: {
    shootTotal: number
    effectiveShootTotal: number
    goalTotal: number
    goalTotalDisplay: number
    ownGoal: number
    shootHeading: number
    goalHeading: number
    shootFreekick: number
    goalFreekick: number
    shootInPenalty: number
    goalInPenalty: number
    shootOutPenalty: number
    goalOutPenalty: number
    shootPenaltyKick: number
    goalPenaltyKick: number
  }
  pass: {
    shortPassTry: number
    shortPassSuccess: number
    longPassTry: number
    longPassSuccess: number
    bouncingLobPassTry: number
    bouncingLobPassSuccess: number
    drivenGroundPassTry: number
    drivenGroundPassSuccess: number
    throughPassTry: number
    throughPassSuccess: number
    lobbedThroughPassTry: number
    lobbedThroughPassSuccess: number
  }
  defence: {
    blockTry: number
    blockSuccess: number
    tackleTry: number
    tackleSuccess: number
  }
}

export interface MatchData {
  matchId: string
  matchDate: string
  matchType: number
  matchInfo: MatchPlayerInfo[]
}

export interface VoltaTopRankItem {
  rank: number
  nickname: string
  rankPoint: number | null
  winRate: number | null
  averageRating: number | null
  mainPosition: string | null
  mainPositionDetail: string | null
  price: string | null
  rankIconUrl: string | null
}

export interface VoltaBestStatItem {
  label: string
  nickname: string
  count: string
  iconUrl?: string | null
}

export function calcPassTotal(pass: MatchPlayerInfo['pass']) {
  const try_ =
    (pass.shortPassTry ?? 0) +
    (pass.longPassTry ?? 0) +
    (pass.bouncingLobPassTry ?? 0) +
    (pass.drivenGroundPassTry ?? 0) +
    (pass.throughPassTry ?? 0) +
    (pass.lobbedThroughPassTry ?? 0)
  const success =
    (pass.shortPassSuccess ?? 0) +
    (pass.longPassSuccess ?? 0) +
    (pass.bouncingLobPassSuccess ?? 0) +
    (pass.drivenGroundPassSuccess ?? 0) +
    (pass.throughPassSuccess ?? 0) +
    (pass.lobbedThroughPassSuccess ?? 0)

  return { try: try_, success, rate: try_ > 0 ? Math.round((success / try_) * 100) : 0 }
}
