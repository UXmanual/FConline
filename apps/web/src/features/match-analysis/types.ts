export const MATCH_TYPE_NAMES: Record<number, string> = {
  30: '리그 친선',
  40: '클래식 1on1',
  50: '공식경기',
  52: '감독모드',
  60: '공식 친선',
  204: '볼타 친선',
  214: '볼타 공식',
  224: '볼타 AI대전',
  234: '볼타 커스텀',
}

export const VOLTA_MATCH_TYPES = [
  { type: 214, label: '볼타 공식' },
  { type: 204, label: '볼타 친선' },
  { type: 224, label: 'AI대전' },
  { type: 234, label: '커스텀' },
]

export interface MatchUser {
  ouid: string
  nickname: string
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

export function calcPassTotal(pass: MatchPlayerInfo['pass']) {
  const try_ =
    pass.shortPassTry +
    pass.longPassTry +
    pass.bouncingLobPassTry +
    pass.drivenGroundPassTry +
    pass.throughPassTry +
    pass.lobbedThroughPassTry
  const success =
    pass.shortPassSuccess +
    pass.longPassSuccess +
    pass.bouncingLobPassSuccess +
    pass.drivenGroundPassSuccess +
    pass.throughPassSuccess +
    pass.lobbedThroughPassSuccess
  return { try: try_, success, rate: try_ > 0 ? Math.round((success / try_) * 100) : 0 }
}
