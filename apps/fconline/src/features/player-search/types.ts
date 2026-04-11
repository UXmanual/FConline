export interface Player {
  id: number
  name: string
  detail?: PlayerDetail | null
  reviewCount?: number
}

export interface Season {
  seasonId: number
  className: string
  seasonImg: string
}

export interface AbilityStat {
  name: string
  value: number
  tier: 'over120' | 'over110' | 'over100' | 'over90' | 'over60' | 'over20' | 'over10' | 'base'
}

export interface Trait {
  name: string
  iconSrc?: string | null
}

export interface PlayerDetail {
  name: string
  seasonImg: string | null
  seasonName: string | null
  teamName: string | null
  teamLogo: string | null
  clubHistory: Array<{
    year: string
    club: string
    rent: string | null
  }>
  nationName: string | null
  nationLogo: string | null
  leagueName: string | null
  leagueLogo: string | null
  birthDate: string | null
  position: string | null
  overall: number | null
  pay: number | null
  height: number | null
  weight: number | null
  bodyType: string | null
  leftFoot: number | null
  rightFoot: number | null
  skillMove: number | null
  abilities: AbilityStat[]
  totalAbility: number | null
  traits: Trait[]
  prices: Record<number, string>
}
