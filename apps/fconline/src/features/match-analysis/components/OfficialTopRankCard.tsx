import Image from 'next/image'
import CardListSkeleton from '@/components/ui/CardListSkeleton'
import { OfficialTopRankItem } from '@/features/match-analysis/types'

type Props = {
  items: OfficialTopRankItem[]
  isLoading?: boolean
  onSelectItem?: (item: OfficialTopRankItem) => void
}

function formatRankPoint(value: number | null) {
  if (value === null) return '-'
  return `${value.toLocaleString('ko-KR')}P`
}

function formatWinRate(value: number | null) {
  if (value === null) return '-'
  return `${value}%`
}

function formatRecord(item: OfficialTopRankItem) {
  const wins = item.wins ?? '-'
  const draws = item.draws ?? '-'
  const losses = item.losses ?? '-'
  return `${wins}\uC2B9 ${draws}\uBB34 ${losses}\uD328`
}

export default function OfficialTopRankCard({ items, isLoading = false, onSelectItem }: Props) {
  return (
    <section className="app-theme-card rounded-lg border px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="app-theme-title text-sm font-semibold">
            <span style={{ color: 'var(--app-accent-blue)' }}>{'1:1 \uACF5\uC2DD\uACBD\uAE30'}</span>
            <span>{' \uB7AD\uD0B9 TOP 5'}</span>
          </h2>
        </div>
        <span
          className="inline-flex h-7 items-center justify-center rounded-[8px] px-3 text-[12px] font-semibold leading-none"
          style={{
            backgroundColor: 'rgba(37, 110, 244, 0.1)',
            color: 'var(--app-accent-blue)',
          }}
        >
          {'\uACF5\uC2DD\uACBD\uAE30'}
        </span>
      </div>

      {isLoading ? (
        <CardListSkeleton className="mt-3" rows={5} iconSizeClassName="h-11 w-11" />
      ) : (
        <div className="mt-3">
          {items.map((item, index) => (
            <button
              key={`${item.rank}-${item.nickname}`}
              type="button"
              onClick={() => onSelectItem?.(item)}
              className={`flex w-full items-center justify-between gap-3 py-3 text-left ${index === items.length - 1 ? 'pb-0' : 'app-theme-divider border-b'}`}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="app-theme-soft flex h-11 w-11 shrink-0 items-center justify-center rounded-lg">
                  {item.rankIconUrl ? (
                    <Image
                      src={item.rankIconUrl}
                      alt=""
                      aria-hidden="true"
                      width={32}
                      height={32}
                      className="h-8 w-8 object-contain"
                      unoptimized
                      draggable={false}
                    />
                  ) : (
                    <span className="text-[14px] font-bold" style={{ color: 'var(--app-accent-blue)' }}>
                      {item.rank}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1">
                    <p className="app-theme-title min-w-0 truncate text-sm font-semibold">
                      {item.nickname}
                    </p>
                    <span className="app-theme-muted shrink-0 text-[11px] leading-none">{'\u00B7'}</span>
                    <span className="app-theme-muted shrink-0 text-[11px] leading-none">
                      {item.formation ?? '-'}
                    </span>
                  </div>
                  <p className="app-theme-muted mt-0.5 truncate whitespace-nowrap text-[12px] leading-4">
                    {'\uC2B9\uB960'} {formatWinRate(item.winRate)} {'\u00B7'} {formatRecord(item)} {'\u00B7'}{' '}
                    {item.price ?? '-'}
                  </p>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-[13px] font-semibold" style={{ color: 'var(--app-accent-blue)' }}>
                  {item.rank}
                  {'\uC704'}
                </div>
                <div className="app-theme-muted mt-0.5 text-[11px]">{formatRankPoint(item.rankPoint)}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
