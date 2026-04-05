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
  const res = await fetch(`https://open.api.nexon.com/fconline/v1/match-detail?matchid=${matchid}`, {
    headers: NEXON_HEADERS,
    next: { revalidate: 300 },
  })

  if (!res.ok) {
    return null
  }

  return res.json()
}

function formatDate(dateStr: string) {
  const normalized = /Z$|[+-]\d{2}:\d{2}$/.test(dateStr) ? dateStr : `${dateStr}Z`
  const d = new Date(normalized)
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hour = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${year}.${month}.${day} ${hour}:${min}`
}

function valueOrDash(value: number | string | null | undefined) {
  return value ?? '-'
}

function formatRating(value: number | null | undefined) {
  return typeof value === 'number' ? value.toFixed(1) : '-'
}

function goalDisplay(player: MatchPlayerInfo) {
  return player.shoot.goalTotalDisplay ?? player.shoot.goalTotal ?? 0
}

function controllerLabel(value: string | null | undefined) {
  return value === 'gamepad' ? '패드' : '키보드'
}

function textOrDash(value: string | null | undefined) {
  return typeof value === 'string' && value.trim() ? value : '-'
}

function StatRow({ label, left, right }: { label: string; left: string | number; right: string | number }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-2">
      <span className="app-theme-title text-right text-sm font-semibold">{left}</span>
      <span className="app-theme-muted w-24 text-center text-xs">{label}</span>
      <span className="app-theme-title text-left text-sm font-semibold">{right}</span>
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
        <p className="app-theme-muted py-8 text-center text-sm">경기 정보를 불러올 수 없어요.</p>
      </div>
    )
  }

  const me = match.matchInfo.find((player) => player.ouid === ouid) ?? match.matchInfo[0]
  const opponent = match.matchInfo.find((player) => player.ouid !== ouid) ?? match.matchInfo[1]

  if (!me || !opponent) {
    return (
      <div className="pt-5">
        <p className="app-theme-muted py-8 text-center text-sm">경기 정보를 불러올 수 없어요.</p>
      </div>
    )
  }

  const mePass = calcPassTotal(me.pass)
  const opPass = calcPassTotal(opponent.pass)
  const meResult = textOrDash(me.matchDetail.matchResult)
  const opponentResult = textOrDash(opponent.matchDetail.matchResult)
  const meBadgeClass =
    meResult === '승' ? 'bg-[#256ef4]' : meResult === '패' ? 'bg-[#f64f5e]' : 'bg-[#8a949e]'
  const opponentBadgeClass =
    opponentResult === '승'
      ? 'bg-[#256ef4]'
      : opponentResult === '패'
        ? 'bg-[#f64f5e]'
        : 'bg-[#8a949e]'

  return (
    <div className="pt-5">
      <div className="flex items-center gap-2">
        <Link
          href={`/matches/${ouid}?nickname=${encodeURIComponent(nickname ?? '')}`}
          className="app-theme-title flex h-8 w-8 items-center justify-center rounded-full"
        >
          <CaretLeft size={20} weight="bold" />
        </Link>
        <div>
          <p className="app-theme-muted text-xs">{MATCH_TYPE_NAMES[match.matchType] ?? '경기'}</p>
          <p className="app-theme-muted text-xs">{formatDate(match.matchDate)}</p>
        </div>
      </div>

      <div className="app-theme-card mt-6 rounded-lg border p-5">
        <div className="grid grid-cols-3 items-center">
          <div className="flex flex-col items-center gap-1">
            <div className={`rounded-full px-3 py-1 text-xs font-bold text-white ${meBadgeClass}`}>{meResult}</div>
            <p className="app-theme-title max-w-[120px] truncate text-sm font-bold">{textOrDash(me.nickname)}</p>
            <p className="app-theme-title text-3xl font-bold">{String(goalDisplay(me))}</p>
            <p className="app-theme-muted text-xs">평점 {formatRating(me.matchDetail.averageRating)}</p>
          </div>
          <div className="app-theme-muted text-center text-lg font-bold">VS</div>
          <div className="flex flex-col items-center gap-1">
            <div className={`rounded-full px-3 py-1 text-xs font-bold text-white ${opponentBadgeClass}`}>{opponentResult}</div>
            <p className="app-theme-title max-w-[120px] truncate text-sm font-bold">{textOrDash(opponent.nickname)}</p>
            <p className="app-theme-title text-3xl font-bold">{String(goalDisplay(opponent))}</p>
            <p className="app-theme-muted text-xs">평점 {formatRating(opponent.matchDetail.averageRating)}</p>
          </div>
        </div>
      </div>

      <div className="app-theme-card mt-4 rounded-lg border p-4">
        <h2 className="app-theme-title text-sm font-semibold">경기 통계</h2>
        <div className="app-theme-divider mt-3 divide-y">
          <StatRow label="점유율(%)" left={valueOrDash(me.matchDetail.possession)} right={valueOrDash(opponent.matchDetail.possession)} />
          <StatRow label="슈팅" left={valueOrDash(me.shoot.shootTotal)} right={valueOrDash(opponent.shoot.shootTotal)} />
          <StatRow label="유효 슈팅" left={valueOrDash(me.shoot.effectiveShootTotal)} right={valueOrDash(opponent.shoot.effectiveShootTotal)} />
          <StatRow label="헤더 골" left={valueOrDash(me.shoot.goalHeading)} right={valueOrDash(opponent.shoot.goalHeading)} />
          <StatRow label="프리킥 골" left={valueOrDash(me.shoot.goalFreekick)} right={valueOrDash(opponent.shoot.goalFreekick)} />
          <StatRow label="패스 성공" left={`${mePass.success}/${mePass.try}`} right={`${opPass.success}/${opPass.try}`} />
          <StatRow label="스루패스" left={valueOrDash(me.pass.throughPassSuccess)} right={valueOrDash(opponent.pass.throughPassSuccess)} />
          <StatRow label="코너킥" left={valueOrDash(me.matchDetail.cornerKick)} right={valueOrDash(opponent.matchDetail.cornerKick)} />
          <StatRow label="태클 성공" left={valueOrDash(me.defence.tackleSuccess)} right={valueOrDash(opponent.defence.tackleSuccess)} />
          <StatRow label="파울" left={valueOrDash(me.matchDetail.foul)} right={valueOrDash(opponent.matchDetail.foul)} />
          <StatRow label="옐로카드" left={valueOrDash(me.matchDetail.yellowCards)} right={valueOrDash(opponent.matchDetail.yellowCards)} />
          <StatRow label="레드카드" left={valueOrDash(me.matchDetail.redCards)} right={valueOrDash(opponent.matchDetail.redCards)} />
          <StatRow label="드리블" left={valueOrDash(me.matchDetail.dribble)} right={valueOrDash(opponent.matchDetail.dribble)} />
          <StatRow label="컨트롤러" left={controllerLabel(me.matchDetail.controller)} right={controllerLabel(opponent.matchDetail.controller)} />
        </div>
      </div>
    </div>
  )
}
