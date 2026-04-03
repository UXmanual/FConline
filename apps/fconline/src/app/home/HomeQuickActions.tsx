'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { AnalysisIcon, PlayerIcon } from '@/components/icons/NavIcons'

const quickActions = [
  {
    href: '/players',
    title: '선수 이름으로',
    subtitle: '정보 검색',
    Icon: PlayerActionIcon,
  },
  {
    href: '/matches',
    title: '내 플레이',
    subtitle: '경기분석',
    Icon: AnalysisActionIcon,
  },
] as const

export default function HomeQuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {quickActions.map(({ href, title, subtitle, Icon }) => (
        <motion.div key={href} whileTap={{ scale: 0.985 }} transition={{ duration: 0.14 }}>
          <Link
            href={href}
            className="flex min-h-[88px] items-center justify-between gap-3 rounded-lg bg-white px-4 py-5 text-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C93FF] focus-visible:ring-offset-2"
          >
            <div className="flex min-w-0 flex-1 flex-col items-start text-left">
              <span className="text-[15px] font-semibold leading-[1.2] tracking-[-0.02em]">
                {title}
              </span>
              <span className="mt-1 text-[15px] font-semibold leading-[1.2] tracking-[-0.02em]">
                {subtitle}
              </span>
            </div>

            <Icon />
          </Link>
        </motion.div>
      ))}
    </div>
  )
}

function PlayerActionIcon() {
  return (
    <div className="relative flex h-[52px] w-[52px] shrink-0 items-center justify-center" style={{ perspective: 220 }}>
      <motion.span
        className="absolute bottom-[3px] left-1/2 h-3.5 w-9 -translate-x-1/2 rounded-full bg-[#f4c542]/24 blur-[6px]"
        animate={{
          opacity: [0.18, 0.32, 0.2, 0.28, 0.18],
          scaleX: [0.84, 1.06, 0.9, 1, 0.84],
          scaleY: [0.9, 1.04, 0.92, 1, 0.9],
          y: [0, 1, 0, 1, 0],
        }}
        transition={{ duration: 4.8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      />
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
        className="absolute left-0 top-1/2 h-10 w-3 -translate-y-1/2 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.95)_48%,rgba(255,255,255,0)_100%)] blur-[1px]"
        animate={{ x: [-8, 34, -8], opacity: [0, 0.95, 0] }}
        transition={{
          duration: 2.2,
          repeat: Number.POSITIVE_INFINITY,
          repeatDelay: 0.35,
          ease: 'easeInOut',
        }}
      />
      <motion.span
        className="absolute bottom-[7px] h-3 w-8 rounded-full bg-[#CE9C1A]/25 blur-[3px]"
        animate={{
          opacity: [0.14, 0.26, 0.12, 0.2, 0.14],
          scaleX: [0.78, 1.08, 0.72, 0.98, 0.78],
          x: [-1, 2, 0, -2, -1],
        }}
        transition={{ duration: 4.8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      />
      <motion.div
        className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[#fff9d9]"
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
        <PlayerIcon size={28} className="text-[#F3B400] drop-shadow-[0_0_8px_rgba(255,202,40,0.45)]" />
      </motion.div>
    </div>
  )
}

function AnalysisActionIcon() {
  const sharedTransition = {
    duration: 6.2,
    repeat: Number.POSITIVE_INFINITY,
    ease: 'easeInOut' as const,
  }

  const frames = [
    [
      [15, 6.4],
      [22.9, 11.5],
      [21.8, 23.1],
      [8.4, 22.7],
      [6.8, 11.1],
    ],
    [
      [16.1, 8.9],
      [21.6, 13.4],
      [17.9, 18.7],
      [12.5, 18.1],
      [9.8, 12.8],
    ],
    [
      [14.1, 5.8],
      [20.8, 9.4],
      [22.8, 23.5],
      [7.6, 23.2],
      [8.9, 10.5],
    ],
    [
      [15.9, 7.1],
      [23.6, 10.2],
      [20.1, 21.7],
      [10.2, 20.2],
      [6.5, 12.6],
    ],
    [
      [13.8, 9.6],
      [19.7, 13.7],
      [17.1, 17.8],
      [12.9, 19.8],
      [10.7, 13.8],
    ],
    [
      [15.5, 6.1],
      [22.1, 12.2],
      [20.9, 22.4],
      [9.4, 23.3],
      [7.4, 9.8],
    ],
    [
      [14.6, 8.4],
      [20.9, 11.6],
      [18.4, 20.5],
      [11.3, 18.8],
      [8.7, 13],
    ],
    [
      [15.7, 5.9],
      [23.3, 10.8],
      [22.2, 22.9],
      [7.9, 22.1],
      [6.9, 10.7],
    ],
    [
      [15, 6.4],
      [22.9, 11.5],
      [21.8, 23.1],
      [8.4, 22.7],
      [6.8, 11.1],
    ],
  ] as const

  const graphFrames = frames.map((frame) => frame.map(([x, y]) => `${x},${y}`).join(' '))
  const topX = frames.map((frame) => frame[0][0])
  const topY = frames.map((frame) => frame[0][1])
  const rightX = frames.map((frame) => frame[1][0])
  const rightY = frames.map((frame) => frame[1][1])
  const bottomRightX = frames.map((frame) => frame[2][0])
  const bottomRightY = frames.map((frame) => frame[2][1])
  const bottomLeftX = frames.map((frame) => frame[3][0])
  const bottomLeftY = frames.map((frame) => frame[3][1])
  const leftX = frames.map((frame) => frame[4][0])
  const leftY = frames.map((frame) => frame[4][1])

  return (
    <div className="relative flex h-[52px] w-[52px] shrink-0 items-center justify-center">
      <motion.span
        className="absolute bottom-[3px] left-1/2 h-3.5 w-9 -translate-x-1/2 rounded-full bg-[#49b36f]/22 blur-[6px]"
        animate={{
          opacity: [0.14, 0.26, 0.18, 0.24, 0.14],
          scaleX: [0.86, 1.03, 0.92, 1, 0.86],
          scaleY: [0.9, 1.03, 0.94, 1, 0.9],
          y: [0, 1, 0, 1, 0],
        }}
        transition={{ duration: 4.6, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      />
      <motion.span
        className="absolute inset-[4px] rounded-full bg-[#dffbe6]"
        animate={{
          opacity: [0.18, 0.3, 0.22, 0.28, 0.18],
          scale: [0.94, 1.05, 0.96, 1.02, 0.94],
        }}
        transition={{ duration: 3.8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      />
      <div className="absolute inset-0 rounded-full bg-[#D6FFDF]/34 blur-[10px]" />
      <div className="relative flex h-12 w-12 items-center justify-center">
        <AnalysisIcon size={40} className="text-[#3FA86A]" />
        <svg
          viewBox="0 0 30 30"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <polygon
            points="15,7.2 22.3,11.3 19.8,21.8 10.2,21.8 7.7,11.3"
            fill="none"
            stroke="rgba(255,255,255,0.34)"
            strokeWidth="0.7"
          />
          <motion.polygon
            points={graphFrames[0]}
            animate={{ points: graphFrames }}
            transition={sharedTransition}
            fill="rgba(255,255,255,0.18)"
            stroke="rgba(255,255,255,0.96)"
            strokeWidth="1.15"
          />
          <motion.circle
            cx={topX[0]}
            cy={topY[0]}
            r="1.05"
            fill="#F5FFF7"
            animate={{
              cx: topX,
              cy: topY,
              opacity: [0.78, 1, 0.72, 0.94, 0.7, 0.96, 0.82, 0.9, 0.78],
              scale: [0.92, 1.26, 0.88, 1.18, 0.84, 1.12, 0.96, 1.04, 0.92],
            }}
            transition={sharedTransition}
          />
          <motion.circle
            cx={rightX[0]}
            cy={rightY[0]}
            r="0.95"
            fill="#F5FFF7"
            animate={{
              cx: rightX,
              cy: rightY,
              opacity: [0.96, 0.76, 0.88, 0.98, 0.74, 0.92, 0.8, 1, 0.96],
              scale: [1.02, 0.9, 1.08, 1.2, 0.88, 1.04, 0.94, 1.16, 1.02],
            }}
            transition={sharedTransition}
          />
          <motion.circle
            cx={bottomRightX[0]}
            cy={bottomRightY[0]}
            r="0.9"
            fill="#F5FFF7"
            animate={{
              cx: bottomRightX,
              cy: bottomRightY,
              opacity: [0.8, 0.94, 0.68, 0.9, 0.74, 0.98, 0.72, 0.88, 0.8],
              scale: [0.94, 1.18, 0.86, 1.04, 0.92, 1.14, 0.88, 1.02, 0.94],
            }}
            transition={sharedTransition}
          />
          <motion.circle
            cx={bottomLeftX[0]}
            cy={bottomLeftY[0]}
            r="0.9"
            fill="#F5FFF7"
            animate={{
              cx: bottomLeftX,
              cy: bottomLeftY,
              opacity: [0.84, 0.72, 0.96, 0.7, 0.9, 0.76, 0.98, 0.8, 0.84],
              scale: [0.96, 1.08, 1.18, 0.88, 1.02, 0.94, 1.14, 0.9, 0.96],
            }}
            transition={sharedTransition}
          />
          <motion.circle
            cx={leftX[0]}
            cy={leftY[0]}
            r="0.9"
            fill="#F5FFF7"
            animate={{
              cx: leftX,
              cy: leftY,
              opacity: [0.88, 0.7, 0.94, 0.78, 0.98, 0.72, 0.9, 0.76, 0.88],
              scale: [0.98, 1.06, 0.9, 1.14, 0.92, 1.18, 0.94, 1.04, 0.98],
            }}
            transition={sharedTransition}
          />
        </svg>
      </div>
    </div>
  )
}
