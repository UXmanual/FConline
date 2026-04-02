'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { AnalysisIcon, PlayerIcon } from '@/components/icons/NavIcons'

const quickActions = [
  {
    href: '/players',
    label: '선수검색',
    bgClassName: 'bg-[#F7F1E4] text-[#4B3722]',
    accentClassName: 'from-[#FFF7B0] via-[#FFF1A3] to-[#FFE08A]',
    Background: PlayerActionBackground,
    Icon: PlayerActionIcon,
  },
  {
    href: '/matches',
    label: '경기분석',
    bgClassName: 'bg-[#ECF6EF] text-[#234336]',
    accentClassName: 'from-[#C9F1D4] via-[#8FDEAE] to-[#4DBF7D]',
    Background: AnalysisActionBackground,
    Icon: AnalysisActionIcon,
  },
] as const

export default function HomeQuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {quickActions.map(({ href, label, bgClassName, accentClassName, Background, Icon }) => (
        <motion.div key={href} whileTap={{ scale: 0.985 }} transition={{ duration: 0.14 }}>
          <Link
            href={href}
            className={`relative flex min-h-[88px] items-center justify-center overflow-hidden rounded-[6px] px-4 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C93FF] focus-visible:ring-offset-2 ${bgClassName}`}
          >
            <Background accentClassName={accentClassName} />
            <div className="relative flex items-center gap-3">
              <Icon />
              <span className="text-[15px] font-extrabold tracking-[-0.02em]">{label}</span>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  )
}

function PlayerActionBackground({ accentClassName }: { accentClassName: string }) {
  return (
    <>
      <motion.div
        className={`absolute inset-x-3 top-0 h-16 rounded-b-full bg-gradient-to-b blur-2xl ${accentClassName}`}
        animate={{
          opacity: [0.32, 0.58, 0.36, 0.32],
          scaleX: [0.92, 1.08, 0.95, 0.92],
          scaleY: [0.86, 1.14, 0.92, 0.86],
          y: [-2, 1, -1, -2],
        }}
        transition={{ duration: 3.8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute left-1/2 top-3 h-14 w-24 -translate-x-1/2 rounded-full bg-[#FFF0A6]/40 blur-2xl"
        animate={{
          opacity: [0.14, 0.34, 0.18, 0.14],
          scale: [0.8, 1.22, 0.88, 0.8],
        }}
        transition={{ duration: 3.2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      />
    </>
  )
}

function AnalysisActionBackground({ accentClassName }: { accentClassName: string }) {
  return (
    <>
      <motion.div
        className={`absolute inset-x-1 top-0 h-16 rounded-b-full bg-gradient-to-b blur-2xl ${accentClassName}`}
        animate={{
          opacity: [0.24, 0.36, 0.5, 0.32, 0.24],
          scaleX: [0.96, 1.01, 1.08, 1, 0.96],
          scaleY: [0.9, 0.98, 1.14, 0.96, 0.9],
          x: [-3, -1, 5, 1, -3],
        }}
        transition={{ duration: 6.8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute right-4 top-3 h-14 w-20 rounded-full bg-[#D8FFE4]/34 blur-[28px]"
        animate={{
          opacity: [0.12, 0.22, 0.34, 0.18, 0.12],
          scale: [0.82, 0.96, 1.12, 0.92, 0.82],
          x: [2, 0, -5, 3, 2],
          y: [0, 1, 3, -2, 0],
        }}
        transition={{ duration: 7.6, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute left-4 top-2 h-10 w-14 rounded-full bg-white/18 blur-[22px]"
        animate={{
          opacity: [0.04, 0.12, 0.08, 0.14, 0.04],
          x: [-1, 2, 0, -2, -1],
          scale: [0.9, 1.04, 0.96, 1.08, 0.9],
        }}
        transition={{ duration: 5.8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      />
    </>
  )
}

function PlayerActionIcon() {
  return (
    <div className="relative flex h-11 w-11 items-center justify-center" style={{ perspective: 220 }}>
      <motion.span
        className="absolute inset-1 rounded-full bg-[#FFE678]"
        animate={{
          opacity: [0.16, 0.32, 0.2, 0.16],
          scale: [0.92, 1.1, 0.98, 0.92],
          boxShadow: [
            '0 0 0 rgba(255, 224, 100, 0.00)',
            '0 0 24px rgba(255, 224, 100, 0.55)',
            '0 0 12px rgba(255, 224, 100, 0.25)',
            '0 0 0 rgba(255, 224, 100, 0.00)',
          ],
        }}
        transition={{ duration: 2.8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      />
      <motion.span
        className="absolute left-0 top-1/2 h-8 w-3 -translate-y-1/2 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.95)_48%,rgba(255,255,255,0)_100%)] blur-[1px]"
        animate={{ x: [-8, 26, -8], opacity: [0, 0.95, 0] }}
        transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY, repeatDelay: 0.35, ease: 'easeInOut' }}
      />
      <motion.span
        className="absolute bottom-[6px] h-2.5 w-6 rounded-full bg-[#CE9C1A]/25 blur-[3px]"
        animate={{
          opacity: [0.14, 0.26, 0.12, 0.2, 0.14],
          scaleX: [0.78, 1.08, 0.72, 0.98, 0.78],
          x: [-1, 2, 0, -2, -1],
        }}
        transition={{ duration: 4.8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      />
      <motion.div
        className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/55 backdrop-blur-[2px]"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{
          rotateY: [18, -34, -16, 26, 18],
          rotateX: [-10, 6, 12, -8, -10],
          x: [-1, 2, 0, -2, -1],
          y: [0, -2, 1, 2, 0],
          scale: [0.96, 1.06, 0.92, 1.02, 0.96],
        }}
        transition={{ duration: 4.8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      >
        <PlayerIcon size={24} className="text-[#F3B400] drop-shadow-[0_0_8px_rgba(255,202,40,0.45)]" />
      </motion.div>
    </div>
  )
}

function AnalysisActionIcon() {
  const graphFrames = [
    '15,8.8 20.4,12 18.8,20 11.7,19.4 9.8,12.4',
    '15,9.7 21.1,12.8 18.4,19.2 10.9,18.5 9.1,13.2',
    '15,8.2 19.2,11.3 19.9,20.4 12.6,20.8 10.8,13.8',
    '15,9.1 20.8,12.1 18.9,19.6 11.2,20.1 9.4,11.9',
    '15,8.8 20.4,12 18.8,20 11.7,19.4 9.8,12.4',
  ]

  const topX = [15, 15, 15, 15, 15]
  const topY = [8.8, 9.7, 8.2, 9.1, 8.8]
  const rightX = [20.4, 21.1, 19.2, 20.8, 20.4]
  const rightY = [12, 12.8, 11.3, 12.1, 12]
  const bottomX = [18.8, 18.4, 19.9, 18.9, 18.8]
  const bottomY = [20, 19.2, 20.4, 19.6, 20]

  return (
    <div className="relative flex h-11 w-11 items-center justify-center">
      <div className="absolute inset-0 rounded-full bg-[#D6FFDF]/34 blur-[10px]" />
      <div className="relative flex h-10 w-10 items-center justify-center">
        <AnalysisIcon size={30} className="text-[#3FA86A]" />
        <svg
          viewBox="0 0 30 30"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <polygon
            points="15,9 20,12.5 18,19.5 12,19.5 10,12.5"
            fill="none"
            stroke="rgba(255,255,255,0.42)"
            strokeWidth="0.8"
          />
          <motion.polygon
            points={graphFrames[0]}
            animate={{ points: graphFrames }}
            transition={{ duration: 4.6, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
            fill="rgba(255,255,255,0.44)"
            stroke="rgba(248,255,250,0.96)"
            strokeWidth="0.9"
          />
          <motion.circle
            cx={topX[0]}
            cy={topY[0]}
            r="1"
            fill="#F5FFF7"
            animate={{ cx: topX, cy: topY, opacity: [0.72, 1, 0.78, 0.92, 0.72] }}
            transition={{ duration: 4.6, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
          />
          <motion.circle
            cx={rightX[0]}
            cy={rightY[0]}
            r="0.9"
            fill="#F5FFF7"
            animate={{ cx: rightX, cy: rightY, opacity: [0.95, 0.72, 0.98, 0.8, 0.95] }}
            transition={{ duration: 4.6, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
          />
          <motion.circle
            cx={bottomX[0]}
            cy={bottomY[0]}
            r="0.85"
            fill="#F5FFF7"
            animate={{ cx: bottomX, cy: bottomY, opacity: [0.82, 0.66, 0.94, 0.76, 0.82] }}
            transition={{ duration: 4.6, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
          />
        </svg>
      </div>
    </div>
  )
}
