import CardListSkeleton from '@/components/ui/CardListSkeleton'

type TopPlayerItem = {
  rank: number
  name: string
  summary: string
  metric: string
  imageUrl?: string
  seasonBadgeUrl?: string
}

type Props = {
  title: string
  badge: string
  items: TopPlayerItem[]
  isLoading?: boolean
  onSelectPlayer?: (name: string) => void
}

const POSITION_BADGE_STYLES: Record<string, string> = {
  FW: 'bg-[#fdecec] text-[#d14343]',
  MF: 'bg-[#eaf6ee] text-[#2f8f57]',
  DF: 'bg-[#e8f1ff] text-[#457ae5]',
}
const POSITION_METRIC_STYLES: Record<string, string> = {
  FW: 'text-[#d14343]',
  MF: 'text-[#2f8f57]',
  DF: 'text-[#457ae5]',
}

export default function PositionTopPlayersCard({
  title,
  badge,
  items,
  isLoading = false,
  onSelectPlayer,
}: Props) {
  const badgeClassName = POSITION_BADGE_STYLES[badge] ?? 'bg-[#eef2f6] text-[#58616a]'
  const metricClassName = POSITION_METRIC_STYLES[badge] ?? 'text-[#58616a]'
  const titleColorClassName = POSITION_METRIC_STYLES[badge] ?? 'text-[#111827]'
  const titleSuffix = title.startsWith(`${badge} `) ? title.slice(badge.length + 1) : title

  return (
    <section className="rounded-lg bg-white px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[#111827]">
            {title.startsWith(`${badge} `) ? (
              <>
                <span className={titleColorClassName}>{badge}</span>
                <span>{` ${titleSuffix}`}</span>
              </>
            ) : (
              title
            )}
          </h2>
        </div>
        <span
          className={`inline-flex h-7 items-center justify-center rounded-[8px] px-3 text-[12px] font-semibold leading-none ${badgeClassName}`}
        >
          {badge}
        </span>
      </div>

      {isLoading ? (
        <CardListSkeleton className="mt-3" />
      ) : (
        <div className="mt-3">
          {items.map((item, index) => (
            <button
              key={`${title}-${item.rank}-${item.name}`}
              type="button"
              onClick={() => onSelectPlayer?.(item.name)}
              className={`flex w-full items-center justify-between gap-3 py-3 text-left ${index === items.length - 1 ? 'pb-0' : 'border-b border-[#e6e8ea]'}`}
            >
              <div className="flex min-w-0 items-center gap-3">
                {item.imageUrl ? (
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#f4f7fb]">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-contain"
                      draggable={false}
                    />
                  </div>
                ) : (
                  <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f4f7fb] text-[13px] font-bold text-[#457ae5]">
                    {item.rank}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#111827]">{item.name}</p>
                  <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12px] leading-4 text-[#8a949e]">
                    {item.seasonBadgeUrl ? (
                      <img
                        src={item.seasonBadgeUrl}
                        alt=""
                        aria-hidden="true"
                        className="h-4 w-auto shrink-0 object-contain"
                        draggable={false}
                      />
                    ) : null}
                    <p className="truncate">{item.summary}</p>
                  </div>
                </div>
              </div>

              <span className={`shrink-0 text-right text-[13px] font-semibold ${metricClassName}`}>
                {item.metric}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
