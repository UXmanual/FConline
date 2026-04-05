import CardListSkeleton from '@/components/ui/CardListSkeleton'
import { VoltaTopRankItem } from '@/features/match-analysis/types'

type Props = {
  items: VoltaTopRankItem[]
  isLoading?: boolean
}

function formatRankPoint(value: number | null) {
  if (value === null) return '-'
  return value.toLocaleString('ko-KR')
}

function formatAverageRating(value: number | null) {
  if (value === null) return '-'
  return Number.isInteger(value) ? `${value}` : value.toFixed(2)
}

function getPositionBadgeStyle(position: string | null | undefined) {
  if (position === 'FW') {
    return {
      backgroundColor: 'var(--app-position-fw-bg)',
      color: 'var(--app-position-fw-fg)',
    }
  }

  if (position === 'MF') {
    return {
      backgroundColor: 'var(--app-position-mf-bg)',
      color: 'var(--app-position-mf-fg)',
    }
  }

  if (position === 'DF') {
    return {
      backgroundColor: 'var(--app-position-df-bg)',
      color: 'var(--app-position-df-fg)',
    }
  }

  return {
    backgroundColor: 'var(--app-badge-bg)',
    color: 'var(--app-badge-fg)',
  }
}

export default function VoltaTopRankCard({ items, isLoading = false }: Props) {
  return (
    <section className="app-theme-card rounded-lg border px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="app-theme-title text-sm font-semibold">
            <span style={{ color: 'var(--app-volta-accent-fg)' }}>볼타</span>
            <span>{' 랭킹 TOP 5'}</span>
          </h2>
        </div>
        <span
          className="inline-flex h-7 items-center justify-center rounded-[8px] px-3 text-[12px] font-semibold leading-none"
          style={{
            backgroundColor: 'var(--app-volta-accent-bg)',
            color: 'var(--app-volta-accent-fg)',
          }}
        >
          VOLTA
        </span>
      </div>

      {isLoading ? (
        <CardListSkeleton className="mt-3" rows={5} iconSizeClassName="h-11 w-11" />
      ) : (
        <div className="mt-3">
          {items.map((item, index) => (
            <div
              key={`${item.rank}-${item.nickname}`}
              className={`flex items-center justify-between gap-3 py-3 ${index === items.length - 1 ? 'pb-0' : 'app-theme-divider border-b'}`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="app-theme-soft flex h-11 w-11 shrink-0 items-center justify-center rounded-lg">
                  {item.rankIconUrl ? (
                    <img
                      src={item.rankIconUrl}
                      alt=""
                      aria-hidden="true"
                      className="h-8 w-8 object-contain"
                      draggable={false}
                    />
                  ) : (
                    <span className="text-[14px] font-bold" style={{ color: 'var(--app-volta-accent-fg)' }}>
                      {item.rank}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="app-theme-title truncate text-sm font-semibold">{item.nickname}</p>
                  <div className="app-theme-muted mt-0.5 flex min-w-0 items-center gap-1.5 text-[12px] leading-4">
                    {item.mainPosition ? (
                      <span
                        className="inline-flex h-5 shrink-0 items-center justify-center rounded-[6px] px-1.5 text-[11px] font-semibold leading-none"
                        style={getPositionBadgeStyle(item.mainPosition)}
                      >
                        {item.mainPosition}
                      </span>
                    ) : null}
                    <span className="truncate">
                      평점 {formatAverageRating(item.averageRating)} · 승률{' '}
                      {item.winRate !== null ? `${item.winRate}%` : '-'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-[13px] font-semibold" style={{ color: 'var(--app-volta-accent-fg)' }}>
                  {formatRankPoint(item.rankPoint)}
                </div>
                <div className="app-theme-muted mt-0.5 text-[11px]">랭킹 포인트</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
