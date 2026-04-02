'use client'

import { motion } from 'framer-motion'

type HomeDateCardProps = {
  todayLabel: string
  todayValue: string
  seasonLabel: string
  seasonPeriod: string
}

export default function HomeDateCard({
  todayLabel,
  todayValue,
  seasonLabel,
  seasonPeriod,
}: HomeDateCardProps) {
  return (
    <div className="relative overflow-hidden rounded-[6px] px-5 py-4">
      <motion.div
        className="absolute inset-0"
        animate={{
          backgroundColor: ['#F0F5FA', '#FAF0F0', '#F3F1FA', '#F0F5FA'],
        }}
        transition={{ duration: 8.6, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      />

      <motion.div
        className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.42)_32%,rgba(255,255,255,0.12)_58%,rgba(255,255,255,0.22)_100%)]"
        animate={{
          opacity: [0.2, 0.34, 0.18, 0.2],
        }}
        transition={{ duration: 8.6, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      />

      <motion.div
        className="absolute inset-y-0 left-[-18%] w-[58%] bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.46)_0%,rgba(255,255,255,0.14)_38%,rgba(255,255,255,0)_72%)] blur-[10px]"
        animate={{
          x: ['-4%', '12%', '4%', '-4%'],
          opacity: [0.18, 0.34, 0.14, 0.18],
        }}
        transition={{ duration: 8.6, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-[0.02em] text-[#58616a]">{todayLabel}</p>
          <p className="mt-2 text-lg font-bold tracking-[-0.02em] text-[#111827]">{todayValue}</p>
        </div>

        <div className="shrink-0 px-1 py-1 text-right">
          <p className="text-xs font-semibold tracking-[0.02em] text-[#58616a]">{seasonLabel}</p>
          <p className="mt-2 text-lg font-bold tracking-[-0.02em] text-[#111827]">{seasonPeriod}</p>
        </div>
      </div>
    </div>
  )
}
