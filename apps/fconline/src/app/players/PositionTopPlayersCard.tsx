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

export default function PositionTopPlayersCard({
  title,
  badge,
  items,
  isLoading = false,
  onSelectPlayer,
}: Props) {
  const badgeStyle =
    badge === 'FW'
      ? { backgroundColor: 'var(--app-player-pos-fw-bg)', color: 'var(--app-player-pos-fw-fg)' }
      : badge === 'MF'
        ? { backgroundColor: 'var(--app-player-pos-mf-bg)', color: 'var(--app-player-pos-mf-fg)' }
        : badge === 'DF'
          ? { backgroundColor: 'var(--app-player-pos-df-bg)', color: 'var(--app-player-pos-df-fg)' }
          : { backgroundColor: 'var(--app-badge-bg)', color: 'var(--app-badge-fg)' }
  const metricStyle =
    badge === 'FW'
      ? { color: 'var(--app-player-pos-fw-fg)' }
      : badge === 'MF'
        ? { color: 'var(--app-player-pos-mf-fg)' }
        : badge === 'DF'
          ? { color: 'var(--app-player-pos-df-fg)' }
          : { color: 'var(--app-body-text)' }
  const titleSuffix = title.startsWith(`${badge} `) ? title.slice(badge.length + 1) : title

  return (
    <section className="app-player-card rounded-lg px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="app-player-title text-sm font-semibold">
            {title.startsWith(`${badge} `) ? (
              <>
                <span style={metricStyle}>{badge}</span>
                <span>{` ${titleSuffix}`}</span>
              </>
            ) : (
              title
            )}
          </h2>
        </div>
        <span className="inline-flex h-7 items-center justify-center rounded-[8px] px-3 text-[12px] font-semibold leading-none" style={badgeStyle}>
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
              className={`flex w-full items-center justify-between gap-3 py-3 text-left ${index === items.length - 1 ? 'pb-0' : 'border-b'}`}
              style={{ borderColor: index === items.length - 1 ? undefined : 'var(--app-player-divider)' }}
            >
              <div className="flex min-w-0 items-center gap-3">
                {item.imageUrl ? (
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg" style={{ backgroundColor: 'var(--app-player-soft-bg)' }}>
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-contain"
                      draggable={false}
                    />
                  </div>
                ) : (
                  <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold" style={{ backgroundColor: 'var(--app-player-soft-bg)', color: 'var(--app-player-pos-df-fg)' }}>
                    {item.rank}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="app-player-title truncate text-sm font-semibold">{item.name}</p>
                  <div className="app-player-body mt-0.5 flex min-w-0 items-center gap-1.5 text-[12px] leading-4">
                    {item.seasonBadgeUrl ? (
                      <img
                        src={item.seasonBadgeUrl}
                        alt=""
                        aria-hidden="true"
                        className="h-4 w-auto shrink-0 object-contain"
                        draggable={false}
                      />
                    ) : null}
                    <p className="truncate font-medium">{item.summary}</p>
                  </div>
                </div>
              </div>

              <span className="shrink-0 text-right text-[13px] font-semibold" style={metricStyle}>
                {item.metric}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
