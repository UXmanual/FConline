import { motion } from 'framer-motion'
import CardListSkeleton from '@/components/ui/CardListSkeleton'
import { OfficialFormationMetaItem } from '@/features/match-analysis/types'

type Props = {
  items: OfficialFormationMetaItem[]
  sampleSize: number
  isLoading?: boolean
}

function formatUsageRate(value: number) {
  return `${value.toFixed(1)}%`
}

function formatAverageWinRate(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '-'
  return `${value.toFixed(1)}%`
}

function getRankBadgeStyle(rank: number) {
  if (rank === 1) {
    return {
      backgroundColor: '#fff4d6',
      color: '#b7791f',
    }
  }

  if (rank === 2) {
    return {
      backgroundColor: '#edf2f7',
      color: '#4a5568',
    }
  }

  if (rank === 3) {
    return {
      backgroundColor: '#f8e3d8',
      color: '#9c4221',
    }
  }

  return {
    backgroundColor: 'var(--app-analysis-soft-bg)',
    color: 'var(--app-muted-text)',
  }
}

function getRankDisplay(rank: number) {
  if (rank === 1) return '\uD83E\uDD47'
  if (rank === 2) return '\uD83E\uDD48'
  if (rank === 3) return '\uD83E\uDD49'
  return String(rank)
}

function isMedalRank(rank: number) {
  return rank >= 1 && rank <= 3
}

export default function OfficialFormationMetaCard({
  items,
  sampleSize,
  isLoading = false,
}: Props) {
  const maxUsageRate = Math.max(...items.map((item) => item.usageRate), 0)
  const otherUsageRate = Math.max(
    0,
    Number((100 - items.reduce((sum, item) => sum + item.usageRate, 0)).toFixed(1)),
  )

  return (
    <section className="app-theme-card rounded-lg border px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="app-theme-title text-sm font-semibold">
            <span style={{ color: 'var(--app-accent-blue)' }}>{'\uD3EC\uBA54\uC774\uC158 '}</span>
            <span>{'\uC0C1\uC704\uAD8C \uC0AC\uC6A9 \uBE44\uC728'}</span>
          </h2>
        </div>
        <span
          className="inline-flex h-7 items-center justify-center rounded-[8px] px-3 text-[12px] font-semibold leading-none"
          style={{
            backgroundColor: 'rgba(37, 110, 244, 0.1)',
            color: 'var(--app-accent-blue)',
          }}
        >
          FORMATION
        </span>
      </div>

      {isLoading ? (
        <CardListSkeleton className="mt-4" rows={5} />
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item, index) => {
            const normalizedWidth = maxUsageRate > 0 ? (item.usageRate / maxUsageRate) * 100 : 0

            return (
              <div key={`${item.rank}-${item.formation}`} className="space-y-1.5">
                <div className="flex items-center gap-3">
                  {isMedalRank(item.rank) ? (
                    <span className="inline-flex h-8 min-w-8 shrink-0 items-center justify-center text-[20px] leading-none">
                      {getRankDisplay(item.rank)}
                    </span>
                  ) : (
                    <span
                      className="inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full px-2 text-[11px] font-semibold leading-none"
                      style={getRankBadgeStyle(item.rank)}
                    >
                      {getRankDisplay(item.rank)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="app-theme-title truncate text-sm font-semibold">{item.formation}</span>
                      <span className="shrink-0 text-[12px] font-semibold" style={{ color: 'var(--app-accent-blue)' }}>
                        {formatUsageRate(item.usageRate)}
                      </span>
                    </div>
                    <div className="app-theme-muted mt-0.5 text-[11px] leading-4">
                      {`\uD3C9\uADE0 \uC2B9\uB960 ${formatAverageWinRate(item.averageWinRate)} \u00B7 \uCD5C\uACE0 ${item.bestRank ?? '-'}\uC704`}
                    </div>
                  </div>
                </div>

                <div
                  className="h-1.5 overflow-hidden rounded-full"
                  style={{ backgroundColor: 'var(--app-analysis-soft-bg)' }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: normalizedWidth / 100 }}
                    viewport={{ once: true, amount: 0.9, margin: '0px 0px -12% 0px' }}
                    transition={{
                      duration: 1.7,
                      delay: 0.14 * index,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    style={{
                      backgroundColor: 'rgba(190, 197, 208, 0.94)',
                      transformOrigin: 'left center',
                    }}
                  />
                </div>
              </div>
            )
          })}

          <p className="app-theme-muted pt-1 text-[11px] leading-4">
            {`\uC0C1\uC704 ${sampleSize}\uBA85 \uAE30\uC900 \uD3EC\uBA54\uC774\uC158 \uC774\uC6A9\uB960${
              otherUsageRate > 0 ? ` \u00B7 \uAE30\uD0C0 ${formatUsageRate(otherUsageRate)}` : ''
            }`}
          </p>
        </div>
      )}
    </section>
  )
}
