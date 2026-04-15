import Link from 'next/link'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { formatRelativeTime } from '@/lib/community'
import PlayerImage from '@/features/player-search/components/PlayerImage'
import HomeDateCard from './HomeDateCard'
import HomeQuickActions from './HomeQuickActions'

const RECURRING_SEASON_DAYS = 70
const LATEST_REVIEW_LIMIT = 3

type LatestPlayerReviewRow = {
  id: string
  player_id: string
  player_name: string
  nickname: string
  title: string
  created_at: string
}

function parseCardLevel(title: string) {
  const match = title.match(/^\[(\d+)카\]/)
  return match ? match[1] : null
}

function trimPlayerReviewTitle(title: string) {
  return title.replace(/^\[\d+카\]\s*/, '').trim() || title
}

function getCardLevelLabel(title: string) {
  const level = parseCardLevel(title)
  return level ? `${level}카` : null
}

function getPlayerReviewHref(post: LatestPlayerReviewRow) {
  const params = new URLSearchParams({
    tab: 'review',
    postId: post.id,
  })
  const level = parseCardLevel(post.title)

  if (level) {
    params.set('level', level)
  }

  return `/players/${post.player_id}?${params.toString()}`
}

async function getLatestPlayerReviews() {
  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from('player_review_posts')
      .select('id, player_id, player_name, nickname, title, created_at')
      .order('created_at', { ascending: false })
      .limit(LATEST_REVIEW_LIMIT)

    if (error) {
      return [] as LatestPlayerReviewRow[]
    }

    return (data ?? []) as LatestPlayerReviewRow[]
  } catch {
    return [] as LatestPlayerReviewRow[]
  }
}

function getKstToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const year = Number(parts.find((part) => part.type === 'year')?.value ?? '0')
  const month = Number(parts.find((part) => part.type === 'month')?.value ?? '1')
  const day = Number(parts.find((part) => part.type === 'day')?.value ?? '1')

  return new Date(year, month - 1, day)
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

function formatSeasonDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}.${day}`
}

function getSeasonCountdown(end: Date, today: Date) {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.max(0, Math.ceil((end.getTime() - today.getTime()) / msPerDay))
}

function formatSeasonCountdown(daysRemaining: number) {
  return `D-${daysRemaining}`
}

type SeasonRange = {
  seasonNumber: number
  start: Date
  end: Date
}

function getRecurringSeasonStarts(year: number) {
  const starts: Date[] = []
  const nextYearStart = new Date(year + 1, 0, 1)
  let currentStart = new Date(year, 4, 28)

  while (currentStart.getTime() < nextYearStart.getTime()) {
    starts.push(currentStart)
    currentStart = addDays(currentStart, RECURRING_SEASON_DAYS)
  }

  return starts
}

function buildSeasonRanges(year: number) {
  const seasonRanges: SeasonRange[] = []
  const season2Start = new Date(year, 2, 19)
  const season3Start = new Date(year, 4, 28)
  const previousYearRecurringStarts = getRecurringSeasonStarts(year - 1)
  const previousYearLastRecurringStart =
    previousYearRecurringStarts[previousYearRecurringStarts.length - 1] ?? null
  const season1Start = previousYearLastRecurringStart
    ? addDays(previousYearLastRecurringStart, RECURRING_SEASON_DAYS)
    : new Date(year, 0, 1)

  if (season1Start.getTime() < season2Start.getTime()) {
    seasonRanges.push({
      seasonNumber: 1,
      start: season1Start,
      end: addDays(season2Start, -1),
    })
  }

  seasonRanges.push({
    seasonNumber: 2,
    start: season2Start,
    end: addDays(season3Start, -1),
  })

  const recurringStarts = getRecurringSeasonStarts(year)

  recurringStarts.forEach((start, index) => {
    const nextStart = recurringStarts[index + 1]

    seasonRanges.push({
      seasonNumber: index + 3,
      start,
      end: nextStart ? addDays(nextStart, -1) : addDays(start, RECURRING_SEASON_DAYS - 1),
    })
  })

  return seasonRanges
}

function getSeasonCardContent(today: Date) {
  const year = today.getFullYear()
  const seasonRanges = [
    ...buildSeasonRanges(year - 1),
    ...buildSeasonRanges(year),
    ...buildSeasonRanges(year + 1),
  ]
  const currentSeason =
    seasonRanges.find(
      (seasonRange) =>
        seasonRange.start.getTime() <= today.getTime() &&
        today.getTime() <= seasonRange.end.getTime(),
    ) ?? buildSeasonRanges(year)[0]

  return {
    seasonLabel: `\uC2DC\uC98C${currentSeason.seasonNumber} \uC9C4\uD589 \uC911`,
    seasonPeriod: `${formatSeasonDate(currentSeason.start)} - ${formatSeasonDate(currentSeason.end)}`,
    seasonCountdownDays: getSeasonCountdown(currentSeason.end, today),
  }
}

export default async function HomeStatusPanel() {
  const latestReviews = await getLatestPlayerReviews()
  const { seasonLabel, seasonPeriod, seasonCountdownDays } = getSeasonCardContent(getKstToday())
  const cardStyle = {
    backgroundColor: 'var(--app-card-bg)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--app-card-border)',
    transition: 'background-color 180ms ease, border-color 180ms ease, color 180ms ease',
  }
  const titleStyle = { color: 'var(--app-title)' }
  const bodyStyle = { color: 'var(--app-body-text)' }
  const mutedStyle = { color: 'var(--app-muted-text)' }

  return (
    <section className="space-y-3">
      <div className="space-y-3">
        <HomeDateCard
          seasonLabel={seasonLabel}
          seasonPeriod={seasonPeriod}
          seasonCountdown={formatSeasonCountdown(seasonCountdownDays)}
          seasonCountdownDays={seasonCountdownDays}
        />

        <HomeQuickActions />
      </div>

      <div className="rounded-lg px-5 py-4" style={cardStyle}>
        {latestReviews.length > 0 ? (
          <div>
            {latestReviews.map((review) => (
              <Link
                key={review.id}
                href={getPlayerReviewHref(review)}
                className="block border-b py-3 first:pt-0 last:border-b-0 last:pb-0"
                style={{ borderColor: 'color-mix(in srgb, var(--app-card-border) 80%, transparent)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg"
                    style={{ backgroundColor: 'var(--app-player-soft-strong)' }}
                  >
                    <PlayerImage
                      spid={review.player_id}
                      alt={review.player_name}
                      className="object-contain"
                      sizes="48px"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
                      <span className="truncate" style={{ color: '#457ae5' }}>
                        {review.player_name}
                      </span>
                      {getCardLevelLabel(review.title) ? (
                        <span className="shrink-0" style={mutedStyle}>
                          ·
                        </span>
                      ) : null}
                      {getCardLevelLabel(review.title) ? (
                        <span className="shrink-0" style={titleStyle}>
                          {getCardLevelLabel(review.title)}
                        </span>
                      ) : null}
                      <span className="shrink-0" style={mutedStyle}>
                        ·
                      </span>
                      <span className="truncate font-medium" style={mutedStyle}>
                        {review.nickname}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-1 pr-2 text-[13px] font-semibold leading-5" style={titleStyle}>
                      {trimPlayerReviewTitle(review.title)}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5 self-start pt-0.5">
                    <span className="text-[11px] font-medium" style={mutedStyle}>
                      {formatRelativeTime(review.created_at)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="pt-2 text-sm" style={bodyStyle}>아직 등록된 선수 평가가 없어요.</p>
        )}
      </div>
    </section>
  )
}
