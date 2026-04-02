import { getLatestNotices } from './home-feed'

const TODAY_LABEL = '\uC624\uB298 \uB0A0\uC9DC'
const NOTICE_LABEL = '\uCD5C\uC2E0 \uACF5\uC9C0'
const NOTICE_FALLBACK = '\uACF5\uC9C0 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.'

function formatToday() {
  const now = new Date()
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(now)
}

export default async function HomeStatusPanel() {
  const notices = await getLatestNotices()

  return (
    <section className="space-y-8">
      <div className="rounded-[6px] bg-[#F0F5FA] px-5 py-4">
        <p className="text-xs font-semibold tracking-[0.02em] text-[#58616a]">{TODAY_LABEL}</p>
        <p className="mt-2 text-lg font-bold tracking-[-0.02em] text-[#111827]">{formatToday()}</p>
      </div>

      <div>
        <p className="text-xl font-extrabold tracking-[0.02em] text-[#111827]">{NOTICE_LABEL}</p>

        {notices.length > 0 ? (
          <div className="mt-4 divide-y divide-[#e5e5e5]">
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
          <p className="mt-4 text-sm text-[#6b7280]">{NOTICE_FALLBACK}</p>
        )}
      </div>
    </section>
  )
}
