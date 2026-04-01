import Link from 'next/link'
import { CaretLeft } from '@phosphor-icons/react/dist/ssr'
import { MatchData, MatchPlayerInfo, MATCH_TYPE_NAMES, calcPassTotal } from '@/features/match-analysis/types'

const NEXON_API_KEY = process.env.NEXON_API_KEY!
const NEXON_HEADERS = { 'x-nxopen-api-key': NEXON_API_KEY }

const RESULT_COLOR: Record<string, string> = {
  승: '#256ef4',
  패: '#f64f5e',
  무: '#8a949e',
}

interface Props {
  params: Promise<{ ouid: string; matchid: string }>
  searchParams: Promise<{ nickname?: string }>
}

async function getMatchDetail(matchid: string): Promise<MatchData | null> {
  const res = await fetch(
    `https://open.api.nexon.com/fconline/v1/match-detail?matchid=${matchid}`,
    { headers: NEXON_HEADERS, next: { revalidate: 300 } }
  )
  if (!res.ok) return null
  return res.json()
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hour = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${year}.${month}.${day} ${hour}:${min}`
}

function StatRow({ label, left, right }: { label: string; left: string | number; right: string | number }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-2">
      <span className="text-right text-sm font-semibold text-[#1e2124]">{left}</span>
      <span className="w-24 text-center text-xs text-[#8a949e]">{label}</span>
      <span className="text-left text-sm font-semibold text-[#1e2124]">{right}</span>
    </div>
  )
}

function PlayerColumn({ player }: { player: MatchPlayerInfo }) {
  const result = player.matchDetail.matchResult
  const color = RESULT_COLOR[result] ?? '#8a949e'
  const pass = calcPassTotal(player.pass)

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="rounded-full px-3 py-1 text-xs font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {result}
      </div>
      <p className="max-w-[120px] truncate text-sm font-bold text-[#1e2124]">{player.nickname}</p>
      <p className="text-3xl font-bold text-[#1e2124]">{player.shoot.goalTotal}</p>
      <p className="text-xs text-[#8a949e]">평점 {player.matchDetail.averageRating.toFixed(1)}</p>
    </div>
  )
}

export default async function MatchDetailPage({ params, searchParams }: Props) {
  const { ouid, matchid } = await params
  const { nickname } = await searchParams

  const match = await getMatchDetail(matchid)

  if (!match) {
    return (
      <div className="pt-5">
        <p className="py-8 text-center text-sm text-[#8a949e]">경기 정보를 불러올 수 없어요.</p>
      </div>
    )
  }

  const me = match.matchInfo.find((p) => p.ouid === ouid) ?? match.matchInfo[0]
  const opponent = match.matchInfo.find((p) => p.ouid !== ouid) ?? match.matchInfo[1]

  if (!me || !opponent) {
    return (
      <div className="pt-5">
        <p className="py-8 text-center text-sm text-[#8a949e]">경기 정보를 불러올 수 없어요.</p>
      </div>
    )
  }

  const mePass = calcPassTotal(me.pass)
  const opPass = calcPassTotal(opponent.pass)

  return (
    <div className="pt-5">
      <div className="flex items-center gap-2">
        <Link
          href={`/matches/${ouid}?nickname=${encodeURIComponent(nickname ?? '')}`}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#1e2124]"
        >
          <CaretLeft size={20} weight="bold" />
        </Link>
        <div>
          <p className="text-xs text-[#8a949e]">{MATCH_TYPE_NAMES[match.matchType] ?? '경기'}</p>
          <p className="text-xs text-[#8a949e]">{formatDate(match.matchDate)}</p>
        </div>
      </div>

      {/* 스코어 헤더 */}
      <div className="mt-6 rounded-2xl border border-[#e6e8ea] bg-white p-5">
        <div className="grid grid-cols-3 items-center">
          <PlayerColumn player={me} />
          <div className="text-center text-lg font-bold text-[#c1c7cd]">VS</div>
          <PlayerColumn player={opponent} />
        </div>
      </div>

      {/* 경기 상세 스탯 */}
      <div className="mt-4 rounded-2xl border border-[#e6e8ea] bg-white p-4">
        <h2 className="text-sm font-semibold text-[#1e2124]">경기 통계</h2>
        <div className="mt-3 divide-y divide-[#f4f5f6]">
          <StatRow label="점유율 (%)" left={me.matchDetail.possession} right={opponent.matchDetail.possession} />
          <StatRow label="슈팅" left={me.shoot.shootTotal} right={opponent.shoot.shootTotal} />
          <StatRow label="유효슈팅" left={me.shoot.effectiveShootTotal} right={opponent.shoot.effectiveShootTotal} />
          <StatRow label="헤딩골" left={me.shoot.goalHeading} right={opponent.shoot.goalHeading} />
          <StatRow label="프리킥골" left={me.shoot.goalFreekick} right={opponent.shoot.goalFreekick} />
          <StatRow label="패스 성공률 (%)" left={`${mePass.success}/${mePass.try}`} right={`${opPass.success}/${opPass.try}`} />
          <StatRow label="스루패스" left={me.pass.throughPassSuccess} right={opponent.pass.throughPassSuccess} />
          <StatRow label="코너킥" left={me.matchDetail.cornerKick} right={opponent.matchDetail.cornerKick} />
          <StatRow label="태클 성공" left={me.defence.tackleSuccess} right={opponent.defence.tackleSuccess} />
          <StatRow label="파울" left={me.matchDetail.foul} right={opponent.matchDetail.foul} />
          <StatRow label="옐로카드" left={me.matchDetail.yellowCards} right={opponent.matchDetail.yellowCards} />
          <StatRow label="레드카드" left={me.matchDetail.redCards} right={opponent.matchDetail.redCards} />
          <StatRow label="드리블 성공" left={me.matchDetail.dribble} right={opponent.matchDetail.dribble} />
          <StatRow
            label="컨트롤러"
            left={me.matchDetail.controller === 'gamepad' ? '패드' : '키보드'}
            right={opponent.matchDetail.controller === 'gamepad' ? '패드' : '키보드'}
          />
        </div>
      </div>
    </div>
  )
}
