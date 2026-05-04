import https from 'node:https'
import { NextRequest } from 'next/server'
import { getNexonHeaders, getSpidMetaItem, getSeasonMetaItem } from '@/lib/nexon'
import { getPlayerDetail, getStrongPoint } from '@/features/player-search/player-detail'

const FETCH_TIMEOUT_MS = 6000

const FC_POSITION_LABELS: Record<number, string> = {
  0: 'GK', 1: 'SW', 2: 'RWB', 3: 'RB', 4: 'RCB', 5: 'CB', 6: 'LCB', 7: 'LB', 8: 'LWB',
  9: 'RDM', 10: 'CDM', 11: 'LDM', 12: 'RM', 13: 'RCM', 14: 'CM', 15: 'LCM', 16: 'LM',
  17: 'RAM', 18: 'CAM', 19: 'LAM', 20: 'RF', 21: 'CF', 22: 'LF',
  23: 'RW', 24: 'RS', 25: 'ST', 26: 'LS', 27: 'LW',
}

function fetchRaw(url: string): Promise<string> {
  const headers = getNexonHeaders()
  return new Promise((resolve, reject) => {
    const req = https.request(url, { headers: headers as Record<string, string> }, (res) => {
      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
        res.resume()
        reject(new Error(`HTTP ${res.statusCode ?? 0}`))
        return
      }
      let raw = ''
      res.setEncoding('utf8')
      res.on('data', (c) => { raw += c })
      res.on('end', () => resolve(raw))
    })
    req.setTimeout(FETCH_TIMEOUT_MS, () => req.destroy(new Error('timeout')))
    req.on('error', reject)
    req.end()
  })
}

export async function GET(req: NextRequest) {
  const ouid = req.nextUrl.searchParams.get('ouid')
  if (!ouid) return Response.json({ error: 'ouid required' }, { status: 400 })

  try {
    // 1. 최근 공식경기 matchId 조회
    const matchIds: string[] = JSON.parse(
      await fetchRaw(
        `https://open.api.nexon.com/fconline/v1/user/match?ouid=${ouid}&matchtype=50&offset=0&limit=3`
      )
    )
    if (!matchIds.length) return Response.json({ error: 'no matches' }, { status: 404 })

    // 2. 가장 최근 경기 상세
    type RawPlayer = { spId?: number | null; spPosition?: number | null; spGrade?: number | null }
    type RawMatchInfo = { ouid?: string; player?: RawPlayer[] }
    type RawMatch = { matchId: string; matchDate: string; matchInfo: RawMatchInfo[] }

    const match: RawMatch = JSON.parse(
      await fetchRaw(`https://open.api.nexon.com/fconline/v1/match-detail?matchid=${matchIds[0]}`)
    )

    const userTeam = match.matchInfo?.find((info) => info.ouid === ouid)
    if (!userTeam?.player?.length) return Response.json({ error: 'no squad' }, { status: 404 })

    const squad = userTeam.player.filter(
      (p): p is RawPlayer & { spId: number; spPosition: number } =>
        typeof p.spId === 'number' && typeof p.spPosition === 'number',
    )

    // 3. 선수별 메타 + OVR 병렬 조회
    const players = await Promise.all(
      squad.map(async (p) => {
        const spId = p.spId
        const spPosition = p.spPosition
        const enhancement = typeof p.spGrade === 'number' ? p.spGrade : 0
        const seasonId = Math.floor(spId / 1000000)

        const [spidMeta, seasonMeta, detail] = await Promise.allSettled([
          getSpidMetaItem(spId),
          getSeasonMetaItem(seasonId),
          getPlayerDetail(String(spId)),
        ])

        const baseOvr =
          detail.status === 'fulfilled' && detail.value?.overall != null
            ? detail.value.overall
            : null
        const ovr = baseOvr !== null ? baseOvr + getStrongPoint(enhancement) : null

        return {
          spId,
          spPosition,
          positionLabel: FC_POSITION_LABELS[spPosition] ?? '?',
          enhancement,
          playerName:
            spidMeta.status === 'fulfilled' ? (spidMeta.value?.name ?? '?') : '?',
          seasonImg:
            seasonMeta.status === 'fulfilled' ? (seasonMeta.value?.seasonImg ?? null) : null,
          ovr,
        }
      }),
    )

    // 4. 포메이션 스트링 구성 (수비-미드-공격 줄 수 계산)
    const formationStr = deriveFormation(players.map((p) => p.spPosition))

    return Response.json({
      formation: formationStr,
      matchDate: match.matchDate ?? '',
      players,
    })
  } catch (err) {
    console.error('[formation]', err)
    return Response.json({ error: 'internal error' }, { status: 500 })
  }
}

function deriveFormation(positions: number[]): string {
  // position 0 = GK, 1-8 = DEF, 9-19 = MID, 20-27 = FWD (rough grouping)
  const defPositions = new Set([1, 2, 3, 4, 5, 6, 7, 8])
  const midPositions = new Set([9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19])
  const fwdPositions = new Set([20, 21, 22, 23, 24, 25, 26, 27])

  const def = positions.filter((p) => defPositions.has(p)).length
  const mid = positions.filter((p) => midPositions.has(p)).length
  const fwd = positions.filter((p) => fwdPositions.has(p)).length

  if (def === 0 && mid === 0 && fwd === 0) return ''
  const parts = [def, mid, fwd].filter((n) => n > 0)
  return parts.join('-')
}
