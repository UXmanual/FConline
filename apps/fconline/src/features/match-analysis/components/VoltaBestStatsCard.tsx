import Image from 'next/image'
import CardListSkeleton from '@/components/ui/CardListSkeleton'
import { VoltaBestStatItem } from '@/features/match-analysis/types'

type Props = {
  items: VoltaBestStatItem[]
  isLoading?: boolean
}

export default function VoltaBestStatsCard({ items, isLoading = false }: Props) {
  return (
    <section className="app-theme-card rounded-lg border px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="app-theme-title text-sm font-semibold">
            <span>볼타 매치 </span>
            <span style={{ color: 'var(--app-volta-accent-fg)' }}>BEST</span>
          </h2>
        </div>
        <span
          className="inline-flex h-7 items-center justify-center rounded-[8px] px-3 text-[12px] font-semibold leading-none"
          style={{
            backgroundColor: 'var(--app-volta-accent-bg)',
            color: 'var(--app-volta-accent-fg)',
          }}
        >
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
              className={`flex items-center justify-between gap-3 py-3 ${index === items.length - 1 ? 'pb-0' : 'app-theme-divider border-b'}`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="app-theme-soft flex h-11 w-11 shrink-0 items-center justify-center rounded-lg">
                  {item.iconUrl ? (
                    <Image
                      src={item.iconUrl}
                      alt=""
                      aria-hidden="true"
                      width={32}
                      height={32}
                      className="h-8 w-8 object-contain"
                      unoptimized
                      draggable={false}
                    />
                  ) : (
                    <span className="text-[14px] font-bold" style={{ color: 'var(--app-volta-accent-fg)' }}>
                      B
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="app-theme-title text-sm font-semibold">{item.label}</p>
                  <p className="app-theme-muted mt-0.5 truncate text-[12px] leading-4">{item.nickname}</p>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-[13px] font-semibold" style={{ color: 'var(--app-volta-accent-fg)' }}>
                  {item.count}
                </div>
                <div className="app-theme-muted mt-0.5 text-[11px]">공식 기록</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
