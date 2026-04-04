import CardListSkeleton from '@/components/ui/CardListSkeleton'
import { VoltaTopRankItem } from '@/features/match-analysis/types'

type Props = {
  items: VoltaTopRankItem[]
  isLoading?: boolean
}

const POSITION_BADGE_STYLES: Record<string, string> = {
  FW: 'bg-[#fdecec] text-[#d14343]',
  MF: 'bg-[#eaf6ee] text-[#2f8f57]',
  DF: 'bg-[#e8f1ff] text-[#457ae5]',
}

function formatRankPoint(value: number | null) {
  if (value === null) return '-'
  return value.toLocaleString('ko-KR')
}

function formatAverageRating(value: number | null) {
  if (value === null) return '-'
  return Number.isInteger(value) ? `${value}` : value.toFixed(2)
}

export default function VoltaTopRankCard({ items, isLoading = false }: Props) {
  return (
    <section className="rounded-lg bg-white px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[#111827]">
            <span className="text-[#7a4ce3]">볼타</span>
            <span>{' 랭킹 TOP 5'}</span>
          </h2>
        </div>
        <span className="inline-flex h-7 items-center justify-center rounded-[8px] bg-[#f0eaff] px-3 text-[12px] font-semibold leading-none text-[#7a4ce3]">
          VOLTA
        </span>
      </div>

      {isLoading ? (
        <CardListSkeleton className="mt-3" rows={5} iconSizeClassName="h-11 w-11" />
      ) : (
        <div className="mt-3">
          {items.map((item, index) => {
            const badgeClassName =
              POSITION_BADGE_STYLES[item.mainPosition ?? ''] ?? 'bg-[#f2f4f7] text-[#58616a]'

            return (
              <div
                key={`${item.rank}-${item.nickname}`}
                className={`flex items-center justify-between gap-3 py-3 ${index === items.length - 1 ? 'pb-0' : 'border-b border-[#e6e8ea]'}`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#f4f7fb]">
                    {item.rankIconUrl ? (
                      <img
                        src={item.rankIconUrl}
                        alt=""
                        aria-hidden="true"
                        className="h-8 w-8 object-contain"
                        draggable={false}
                      />
                    ) : (
                      <span className="text-[14px] font-bold text-[#7a4ce3]">{item.rank}</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#111827]">{item.nickname}</p>
                    <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12px] leading-4 text-[#8a949e]">
                      {item.mainPosition ? (
                        <span
                          className={`inline-flex h-5 shrink-0 items-center justify-center rounded-[6px] px-1.5 text-[11px] font-semibold leading-none ${badgeClassName}`}
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
                  <div className="text-[13px] font-semibold text-[#7a4ce3]">
                    {formatRankPoint(item.rankPoint)}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#8a949e]">랭킹 포인트</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
