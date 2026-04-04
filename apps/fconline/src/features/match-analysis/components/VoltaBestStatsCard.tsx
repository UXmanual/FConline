import CardListSkeleton from '@/components/ui/CardListSkeleton'
import { VoltaBestStatItem } from '@/features/match-analysis/types'

type Props = {
  items: VoltaBestStatItem[]
  isLoading?: boolean
}

export default function VoltaBestStatsCard({ items, isLoading = false }: Props) {
  return (
    <section className="rounded-lg bg-white px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[#111827]">
            <span>볼타 매치 </span>
            <span className="text-[#7a4ce3]">BEST</span>
          </h2>
        </div>
        <span className="inline-flex h-7 items-center justify-center rounded-[8px] bg-[#f0eaff] px-3 text-[12px] font-semibold leading-none text-[#7a4ce3]">
          BEST
        </span>
      </div>

      {isLoading ? (
        <CardListSkeleton className="mt-3" rows={7} iconSizeClassName="h-11 w-11" />
      ) : (
        <div className="mt-3">
          {items.map((item, index) => (
            <div
              key={`${item.label}-${item.nickname}`}
              className={`flex items-center justify-between gap-3 py-3 ${index === items.length - 1 ? 'pb-0' : 'border-b border-[#e6e8ea]'}`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#f4f7fb]">
                  {item.iconUrl ? (
                    <img
                      src={item.iconUrl}
                      alt=""
                      aria-hidden="true"
                      className="h-8 w-8 object-contain"
                      draggable={false}
                    />
                  ) : (
                    <span className="text-[14px] font-bold text-[#7a4ce3]">B</span>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#111827]">{item.label}</p>
                  <p className="mt-0.5 truncate text-[12px] leading-4 text-[#8a949e]">{item.nickname}</p>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-[13px] font-semibold text-[#7a4ce3]">{item.count}</div>
                <div className="mt-0.5 text-[11px] text-[#8a949e]">공식 기록</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
