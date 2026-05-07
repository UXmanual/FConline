import https from 'node:https'
import { NextRequest } from 'next/server'
import { getNexonHeaders, getSpidMetaItem, getSeasonMetaItem } from '@/lib/nexon'
import { getPlayerDetail } from '@/features/player-search/player-detail'

const FETCH_TIMEOUT_MS = 6000
const BROWSER_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
}

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
  const nexonSn = req.nextUrl.searchParams.get('nexonSn')
  const nickname = req.nextUrl.searchParams.get('nickname')
  const mode = req.nextUrl.searchParams.get('mode') ?? 'official1on1'
  const matchType = mode === 'manager' ? 52 : 50
  if (!ouid) return Response.json({ error: 'ouid required' }, { status: 400 })

  try {
    // 1. 최근 경기 matchId 조회
    const matchIds: string[] = JSON.parse(
      await fetchRaw(
        `https://open.api.nexon.com/fconline/v1/user/match?ouid=${ouid}&matchtype=${matchType}&offset=0&limit=3`
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

    // spPosition이 유효한 선수만 추출 (spId null이어도 포함)
    const squad = userTeam.player.filter(
      (p): p is RawPlayer & { spPosition: number } =>
        typeof p.spPosition === 'number' && p.spPosition >= 0 && p.spPosition <= 27,
    )

    // 3. 선수별 메타 + OVR 병렬 조회
    const players = await Promise.all(
      squad.map(async (p) => {
        const spId = typeof p.spId === 'number' && p.spId > 0 ? p.spId : null
        const spPosition = p.spPosition
        const enhancement = typeof p.spGrade === 'number' ? p.spGrade : 0

        if (!spId) {
          return {
            spId: null,
            spPosition,
            positionLabel: FC_POSITION_LABELS[spPosition] ?? '?',
            enhancement,
            pay: null,
            price: null,
            playerName: null,
            seasonImg: null,
            overallBase: null,
            enhancementChemBoost: 0,
          }
        }

        const seasonId = Math.floor(spId / 1000000)

        const [spidMeta, seasonMeta, detail] = await Promise.allSettled([
          getSpidMetaItem(spId),
          getSeasonMetaItem(seasonId),
          getPlayerDetail(String(spId)),
        ])

        const detailValue = detail.status === 'fulfilled' ? detail.value : null
        const pay = detailValue?.pay ?? null
        const priceLevel = enhancement > 0 ? enhancement : 1
        const price = detailValue?.prices?.[priceLevel] ?? null

        return {
          spId,
          spPosition,
          positionLabel: FC_POSITION_LABELS[spPosition] ?? '?',
          enhancement,
          pay,
          price,
          playerName:
            spidMeta.status === 'fulfilled' ? (spidMeta.value?.name ?? null) : null,
          seasonImg:
            seasonMeta.status === 'fulfilled' ? (seasonMeta.value?.seasonImg ?? null) : null,
          overallBase: detailValue?.overall ?? null,
          enhancementChemBoost: 0,
        }
      }),
    )

    // 4. 강화 팀컬러 케미 OVR 보너스 적용
    const tierCounts: Record<string, number> = { bronze: 0, silver: 0, gold: 0, platinum: 0 }
    for (const p of players) {
      const tier = getEnhancementTier(p.enhancement)
      if (tier) tierCounts[tier]++
    }
    const playersWithChem = players.map((p) => {
      const tier = getEnhancementTier(p.enhancement)
      if (!tier) return p
      const bonus = getEnhancementChemBonus(tier, tierCounts[tier])
      return { ...p, enhancementChemBoost: bonus }
    })

    const resolvedNexonSn = await resolveFormationOwnerProfileId(nexonSn, nickname)
    const squadBoostData = resolvedNexonSn ? await fetchSquadBoostData(resolvedNexonSn) : null
    const playersWithAutoBoosts =
      squadBoostData == null
        ? playersWithChem.map((player) => ({
            ...player,
            teamColorBoost: 0,
          }))
        : playersWithChem.map((player) => {
            if (player.spId == null) {
              return {
                ...player,
                teamColorBoost: 0,
              }
            }

            const squadPlayer = squadBoostData.playerMap.get(player.spId)
            return {
              ...player,
              teamColorBoost: squadPlayer?.teamColorBoost ?? 0,
            }
          })

    // 5. 포메이션 스트링 구성 (DEF/DM/CM/AM/FW 5줄 기준)
    const formationStr = deriveFormation(players.map((p) => p.spPosition))

    return Response.json({
      formation: formationStr,
      matchDate: match.matchDate ?? '',
      adaptationBoost: squadBoostData?.adaptationBoost ?? 0,
      teamColorNames: squadBoostData?.teamColorNames ?? [],
      appliedBoostLabels: squadBoostData?.appliedBoostLabels ?? [],
      isAutoApplied: squadBoostData != null,
      players: playersWithAutoBoosts,
    })
  } catch (err) {
    console.error('[formation]', err)
    return Response.json({ error: 'internal error' }, { status: 500 })
  }
}

async function resolveFormationOwnerProfileId(nexonSn: string | null, nickname: string | null) {
  if (nexonSn && /^\d+$/u.test(nexonSn)) {
    return nexonSn
  }

  if (!nickname) {
    return null
  }

  return resolveOwnerProfileIdByNickname(nickname)
}

async function fetchPageText(url: string, headers: Record<string, string>) {
  const response = await fetch(url, {
    headers,
    cache: 'no-store',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return response.text()
}

async function resolveOwnerProfileIdByNickname(nickname: string) {
  const encodedNickname = encodeURIComponent(nickname)
  const voltaHtml = await fetchPageText(
    `https://fconline.nexon.com/datacenter/rank_volta?rtype=all&strCharacterName=${encodedNickname}`,
    BROWSER_HEADERS,
  ).catch(() => null)

  const ownerProfileIdFromVolta = voltaHtml ? extractOwnerProfileIdFromRows(voltaHtml, nickname) : null
  if (ownerProfileIdFromVolta) {
    return ownerProfileIdFromVolta
  }

  for (const mode of ['1vs1', 'manager', '2vs2'] as const) {
    const html = await fetchPageText(
      `https://fconline.nexon.com/datacenter/rank_inner?rt=${mode}&strCharacterName=${encodedNickname}&n4seasonno=0&n4pageno=1`,
      BROWSER_HEADERS,
    ).catch(() => null)

    if (!html) {
      continue
    }

    const rows = [...html.matchAll(/<div class="tr">([\s\S]*?)<\/div>\s*<\/div>/g)]
    for (const row of rows) {
      const rowHtml = row[0]
      const rowNickname = stripTags(
        rowHtml.match(/<span class="name profile_pointer"[^>]*>[\s\S]*?<\/span>/)?.[0] ?? '',
      )

      if (normalizeNickname(rowNickname) !== normalizeNickname(nickname)) {
        continue
      }

      const ownerProfileId = rowHtml.match(/data-sn="(\d+)"/)?.[1] ?? null
      if (ownerProfileId) {
        return ownerProfileId
      }
    }
  }

  return null
}

function extractOwnerProfileIdFromRows(html: string, nickname: string) {
  const normalizedTarget = normalizeNickname(nickname)
  const rows = [...html.matchAll(/<div class="tr">([\s\S]*?)<\/div>\s*<\/div>/g)]

  for (const row of rows) {
    const rowHtml = row[0]
    const rowNickname = stripTags(
      rowHtml.match(/<span class="name profile_pointer"[^>]*>[\s\S]*?<\/span>/)?.[0] ?? '',
    )

    if (normalizeNickname(rowNickname) !== normalizedTarget) {
      continue
    }

    const ownerProfileId = rowHtml.match(/data-sn="(\d+)"/)?.[1] ?? null
    if (ownerProfileId) {
      return ownerProfileId
    }
  }

  return null
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function stripTags(value: string) {
  return decodeHtml(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function normalizeNickname(value: string) {
  return value.trim().toLowerCase()
}

type SquadBoostData = {
  adaptationBoost: number
  playerMap: Map<number, { teamColorBoost: number }>
  teamColorNames: string[]
  appliedBoostLabels: string[]
}

async function fetchSquadBoostData(nexonSn: string): Promise<SquadBoostData | null> {
  try {
    const popupUrl = `https://fconline.nexon.com/profile/squad/popup/${encodeURIComponent(nexonSn)}`
    const popupHtml = await fetchPageText(popupUrl, BROWSER_HEADERS)
    const squadContext = parseSquadContext(popupHtml, nexonSn)

    if (!squadContext) {
      return null
    }

    const squadUrl =
      `https://fconline.nexon.com/datacenter/SquadGetUserInfo` +
      `?strTeamType=${encodeURIComponent(squadContext.squadType)}` +
      `&n1Type=${encodeURIComponent(squadContext.squadSlot)}` +
      `&n8NexonSN=${encodeURIComponent(nexonSn)}` +
      `&strCharacterID=${encodeURIComponent(squadContext.characterId)}`
    const squadText = await fetchPageText(squadUrl, {
      ...BROWSER_HEADERS,
      referer: popupUrl,
      'X-Requested-With': 'XMLHttpRequest',
      accept: 'application/json, text/javascript, */*; q=0.01',
    })
    const squadData = JSON.parse(squadText) as SquadUserInfoResponse

    const playerMap = new Map<number, { teamColorBoost: number }>()
    const teamColorNames = new Set<string>()
    const appliedBoostLabels: string[] = []
    const appliedBoostLabelSet = new Set<string>()
    let enhancementTeamColorBoost = 0

    for (const player of squadData.players ?? []) {
      if (typeof player.spid !== 'number' || player.spid <= 0) {
        continue
      }

      const teamColorBoost = sumOverallBoost(player.teamColor, false)
      const enhancementBoost = sumOverallBoost(player.teamColor, true)
      enhancementTeamColorBoost = Math.max(enhancementTeamColorBoost, enhancementBoost)
      if (player.teamColor) {
        for (const key of ['teamColor1', 'teamColor2', 'teamColor3'] as const) {
          const item = player.teamColor[key]
          const name = item?.name?.trim() ?? ''
          if (!name) {
            continue
          }

          if (!isEnhancementWave(name)) {
            teamColorNames.add(name)
          }

          const overallBoost = parseOverallBoost(item?.skill ?? '')
          if (overallBoost > 0 && !isEnhancementWave(name)) {
            const label = `${name} +${overallBoost}`
            if (!appliedBoostLabelSet.has(label)) {
              appliedBoostLabelSet.add(label)
              appliedBoostLabels.push(label)
            }
          }
        }
      }

      playerMap.set(player.spid, {
        teamColorBoost,
      })
    }

    if (enhancementTeamColorBoost > 0) {
      appliedBoostLabels.push(`강화 팀컬러 +${enhancementTeamColorBoost}`)
    }

    if (squadContext.adaptationValue > 1) {
      appliedBoostLabels.push(`적응도 +${Math.max(0, squadContext.adaptationValue - 1)}`)
    }

    return {
      adaptationBoost: Math.max(0, squadContext.adaptationValue - 1),
      playerMap,
      teamColorNames: [...teamColorNames],
      appliedBoostLabels,
    }
  } catch (error) {
    console.warn('[formation] failed to fetch squad boost data', error)
    return null
  }
}

function parseSquadContext(html: string, nexonSn: string) {
  const contextMatch = html.match(
    new RegExp(
      `SquadProfile\\.SetSquadInfo\\("([^"]+)",\\s*"([^"]+)",\\s*"${escapeRegExp(nexonSn)}",\\s*"([^"]+)"\\)`,
    ),
  )
  const adaptationValue = Number(html.match(/adaptability-selector__current-value" data-value="(\d+)"/)?.[1] ?? '0')

  if (!contextMatch) {
    return null
  }

  return {
    squadType: contextMatch[1],
    squadSlot: contextMatch[2],
    characterId: contextMatch[3],
    adaptationValue,
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

type SquadTeamColorItem = {
  name?: string
  skill?: string
}

type SquadPlayerInfo = {
  spid?: number
  ovr?: number
  teamColor?: {
    teamColor1?: SquadTeamColorItem
    teamColor2?: SquadTeamColorItem
    teamColor3?: SquadTeamColorItem
  }
}

type SquadUserInfoResponse = {
  players?: SquadPlayerInfo[]
}

function sumOverallBoost(teamColor: SquadPlayerInfo['teamColor'], enhancementOnly: boolean) {
  if (!teamColor) {
    return 0
  }

  let total = 0

  for (const key of ['teamColor1', 'teamColor2', 'teamColor3'] as const) {
    const item = teamColor[key]
    const name = item?.name?.trim() ?? ''
    const skill = item?.skill ?? ''

    if (!skill) {
      continue
    }

    const isWave = isEnhancementWave(name)
    if (enhancementOnly !== isWave) {
      continue
    }

    total += parseOverallBoost(skill)
  }

  return total
}

function parseOverallBoost(skill: string) {
  const match = skill.match(/전체 능력치\s*\+(\d+)/)
  return match ? Number(match[1]) : 0
}

function isEnhancementWave(name: string) {
  return /물결/u.test(name)
}

function getEnhancementTier(enhancement: number): string | null {
  if (enhancement >= 11) return 'platinum' // 백금빛물결
  if (enhancement >= 8)  return 'gold'     // 금빛물결
  if (enhancement >= 5)  return 'silver'   // 은빛물결
  if (enhancement >= 2)  return 'bronze'   // 동빛물결
  return null
}

function getEnhancementChemBonus(tier: string, count: number): number {
  switch (tier) {
    case 'bronze':   return count >= 5 ? 1 : 0
    case 'silver':   return count >= 8 ? 3 : count >= 5 ? 1 : 0
    case 'gold':     return count >= 8 ? 4 : count >= 5 ? 3 : 0
    case 'platinum': return count >= 8 ? 5 : count >= 5 ? 4 : 0
    default: return 0
  }
}

function deriveFormation(positions: number[]): string {
  // FC Online 5-line grouping: DEF / DM / CM / AM / FW
  const defPos = new Set([1, 2, 3, 4, 5, 6, 7, 8])    // SW WB RB CB LB
  const dmPos  = new Set([9, 10, 11])                   // RDM CDM LDM
  const cmPos  = new Set([12, 13, 14, 15, 16])          // RM RCM CM LCM LM
  const amPos  = new Set([17, 18, 19])                  // RAM CAM LAM
  const fwPos  = new Set([20, 21, 22, 23, 24, 25, 26, 27]) // RF CF LF RW RS ST LS LW

  const def = positions.filter((p) => defPos.has(p)).length
  const dm  = positions.filter((p) => dmPos.has(p)).length
  const cm  = positions.filter((p) => cmPos.has(p)).length
  const am  = positions.filter((p) => amPos.has(p)).length
  const fw  = positions.filter((p) => fwPos.has(p)).length

  const parts = [def, dm, cm, am, fw].filter((n) => n > 0)
  return parts.join('-')
}
