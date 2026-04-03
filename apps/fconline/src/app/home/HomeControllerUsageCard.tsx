import type { HomeControllerUsage } from './home-feed'

type Props = {
  usage: HomeControllerUsage
}

export default function HomeControllerUsageCard({ usage }: Props) {
  const percentages = usage.items.map((item) => Number(item.percentage.replace('%', '').trim()))
  const maxPercentage = Math.max(...percentages)

  return (
    <section className="rounded-lg bg-white px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-[#111827]">
          <span>컨트롤러 이용 비중</span>
          <span aria-hidden="true">🎮</span>
        </div>
        <a
          href={usage.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-medium leading-none text-[#86919e]"
        >
          <span className="shrink-0 text-[0.9em] leading-none text-[#6b7280]">↗</span>
          <span>데이터센터</span>
        </a>
      </div>

      <p className="mt-1 text-[12px] leading-5 text-[#86919e]">{usage.basisLabel}</p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {usage.items.map((item) => {
          const numericPercentage = Number(item.percentage.replace('%', '').trim())
          const isPrimary = numericPercentage === maxPercentage

          return (
            <article key={item.label} className="rounded-lg bg-[#f7f9fb] px-4 py-4">
              <p className="text-[13px] font-semibold text-[#58616a]">{item.label}</p>
              <p
                className="mt-1 text-[22px] font-extrabold tracking-[-0.03em]"
                style={{ color: isPrimary ? '#457ae5' : '#111827' }}
              >
                {item.percentage}
              </p>
              <p className="mt-1 text-[12px] leading-5 text-[#86919e]">{item.record}</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}
