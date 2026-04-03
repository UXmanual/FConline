import { getLatestNotices } from './home-feed'
import HomeDateCard from './HomeDateCard'
import HomeQuickActions from './HomeQuickActions'

const NOTICE_FALLBACK = '\uACF5\uC9C0 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.'
const RECURRING_SEASON_DAYS = 70

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
    seasonLabel: `시즌${currentSeason.seasonNumber} 진행 중`,
    seasonPeriod: `${formatSeasonDate(currentSeason.start)} - ${formatSeasonDate(currentSeason.end)}`,
  }
}

export default async function HomeStatusPanel() {
  const notices = await getLatestNotices()
  const { seasonLabel, seasonPeriod } = getSeasonCardContent(getKstToday())

  return (
    <section className="space-y-3">
      <div className="space-y-3">
        <HomeDateCard seasonLabel={seasonLabel} seasonPeriod={seasonPeriod} />

        <HomeQuickActions />
      </div>

      <div className="rounded-lg bg-white px-5 py-4">
        {notices.length > 0 ? (
          <div>
            {notices.map((notice) => (
              <a
                key={notice.href}
                href={notice.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <p className="flex min-w-0 flex-1 items-center gap-1.5 text-sm font-medium leading-6 text-[#111827]">
                  <span className="shrink-0 text-[0.9em] leading-none text-[#6b7280]">
                    ↗
                  </span>
                  <span className="min-w-0">{notice.title}</span>
                </p>
                <span className="shrink-0 text-xs text-[#6b7280]">{notice.date}</span>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#6b7280]">{NOTICE_FALLBACK}</p>
        )}
      </div>
    </section>
  )
}
