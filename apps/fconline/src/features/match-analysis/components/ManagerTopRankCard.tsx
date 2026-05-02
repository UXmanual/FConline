import Image from 'next/image'
import CardListSkeleton from '@/components/ui/CardListSkeleton'
import { ManagerTopRankItem } from '@/features/match-analysis/types'

const MANAGER_ACCENT = '#10b981'
const MANAGER_ACCENT_BG = 'rgba(16, 185, 129, 0.1)'

type Props = {
  items: ManagerTopRankItem[]
  isLoading?: boolean
  onSelectItem?: (item: ManagerTopRankItem) => void
}

function formatRankPoint(value: number | null) {
  if (value === null) return '-'
  return `${value.toLocaleString('ko-KR')}P`
}

function formatWinRate(value: number | null) {
  if (value === null) return '-'
  return `${value}%`
}

function formatRecord(item: ManagerTopRankItem) {
  const wins = item.wins ?? '-'
  const draws = item.draws ?? '-'
  const losses = item.losses ?? '-'
  return `${wins}승 ${draws}무 ${losses}패`
}

export default function ManagerTopRankCard({ items, isLoading = false, onSelectItem }: Props) {
  return (
    <section className="app-theme-card rounded-lg border px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="app-theme-title text-sm font-semibold">
            <span style={{ color: MANAGER_ACCENT }}>감독모드</span>
            <span> 랭킹 TOP 5</span>
          </h2>
        </div>
        <span
          className="inline-flex h-7 items-center justify-center rounded-[8px] px-3 text-[12px] font-semibold leading-none"
          style={{ backgroundColor: MANAGER_ACCENT_BG, color: MANAGER_ACCENT }}
        >
          감독모드
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
                    <span className="text-[14px] font-bold" style={{ color: MANAGER_ACCENT }}>
                      {item.rank}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1">
                    <p className="app-theme-title min-w-0 truncate text-sm font-semibold">
                      {item.nickname}
                    </p>
                    <span className="app-theme-muted shrink-0 text-[11px] leading-none">·</span>
                    <span className="app-theme-muted shrink-0 text-[11px] leading-none">
                      {item.formation ?? '-'}
                    </span>
                  </div>
                  <p className="app-theme-muted mt-0.5 truncate whitespace-nowrap text-[12px] leading-4">
                    승률 {formatWinRate(item.winRate)} · {formatRecord(item)}
                  </p>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-[13px] font-semibold" style={{ color: MANAGER_ACCENT }}>
                  {item.rank}위
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
