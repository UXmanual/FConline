export interface Player {
  id: number
  name: string
  detail?: PlayerDetail | null
}

export interface Season {
  seasonId: number
  className: string
  seasonImg: string
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
  position: string | null
  overall: number | null
  pay: number | null
  height: number | null
  weight: number | null
  bodyType: string | null
  leftFoot: number | null
  rightFoot: number | null
  skillMove: number | null
  prices: Record<number, string>
}
