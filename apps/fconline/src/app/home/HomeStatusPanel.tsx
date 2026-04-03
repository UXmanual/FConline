import { getLatestNotices } from './home-feed'
import HomeDateCard from './HomeDateCard'
import HomeQuickActions from './HomeQuickActions'

const NOTICE_FALLBACK = '\uACF5\uC9C0 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.'
const SEASON_LABEL = '\uC2DC\uC98C2 \uC9C4\uD589 \uC911'
const SEASON_PERIOD = '03.19 - 05.28'

export default async function HomeStatusPanel() {
  const notices = await getLatestNotices()

  return (
    <section className="space-y-3">
      <div className="space-y-3">
        <HomeDateCard seasonLabel={SEASON_LABEL} seasonPeriod={SEASON_PERIOD} />

        <HomeQuickActions />
      </div>

      <div className="rounded-xl bg-white px-5 py-4">
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
