import Image from 'next/image'
import CardListSkeleton from '@/components/ui/CardListSkeleton'
import { OfficialTeamColorMetaItem } from '@/features/match-analysis/types'

type Props = {
  items: OfficialTeamColorMetaItem[]
  sampleSize: number
  isLoading?: boolean
}

function formatUsageRate(value: number) {
  return `${value.toFixed(1)}%`
}

function getFallbackInitial(teamColor: string) {
  const trimmed = teamColor.trim()
  return trimmed.slice(0, 1).toUpperCase()
}

export default function OfficialTeamColorMetaCard({
  items,
  sampleSize,
  isLoading = false,
}: Props) {
  return (
    <section className="app-theme-card rounded-lg border px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="app-theme-title text-sm font-semibold">
            <span style={{ color: 'var(--app-accent-blue)' }}>{'\uD300\uCEEC\uB7EC'}</span>
            <span>{' \uC0C1\uC704\uAD8C \uBA54\uD0C0'}</span>
          </h2>
        </div>
        <span
          className="inline-flex h-7 items-center justify-center rounded-[8px] px-3 text-[12px] font-semibold leading-none"
          style={{
            backgroundColor: 'rgba(37, 110, 244, 0.1)',
            color: 'var(--app-accent-blue)',
          }}
        >
          TEAM COLOR
        </span>
      </div>

      {isLoading ? (
        <CardListSkeleton className="mt-3" rows={10} iconSizeClassName="h-11 w-11" />
      ) : (
        <div className="mt-3">
          {items.map((item, index) => (
            <div
              key={`${item.rank}-${item.teamColor}`}
              className={`flex items-center justify-between gap-3 py-3 ${index === items.length - 1 ? 'pb-0' : 'app-theme-divider border-b'}`}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div
                  className="app-theme-soft flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg"
                  title={item.teamColor}
                >
                  {item.emblemUrl ? (
                    <Image
                      src={item.emblemUrl}
                      alt={item.teamColor}
                      width={32}
                      height={32}
                      className="h-8 w-8 object-contain"
                      unoptimized
                      draggable={false}
                    />
                  ) : (
                    <span className="text-[14px] font-bold" style={{ color: 'var(--app-accent-blue)' }}>
                      {getFallbackInitial(item.teamColor)}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="app-theme-title truncate text-sm font-semibold">
                    {`${item.rank}\uC704 \u00B7 ${item.teamColor}`}
                  </p>
                  <p className="app-theme-muted mt-0.5 text-[12px] leading-4">
                    {`${item.usageCount}\uBA85 \uC0AC\uC6A9`}
                  </p>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-[13px] font-semibold" style={{ color: 'var(--app-accent-blue)' }}>
                  {formatUsageRate(item.usageRate)}
                </div>
              </div>
            </div>
          ))}

          <p className="app-theme-muted pt-3 text-[11px] leading-4">
            {`\uC0C1\uC704 ${sampleSize}\uBA85 \uAE30\uC900 \uD300\uCEEC\uB7EC \uC774\uC6A9\uB960`}
          </p>
        </div>
      )}
    </section>
  )
}
