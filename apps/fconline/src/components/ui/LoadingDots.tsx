'use client'

import { motion } from 'framer-motion'

interface Props {
  className?: string
  label?: string
}

const DOT_SIZE = 10
const GAP = 3
const STEP = DOT_SIZE + GAP
const DURATION = 1.32
const PHASE = DURATION / 3
const OFFSETS = [0, -PHASE, -PHASE * 2]

export default function LoadingDots({
  className = '',
  label = '로딩 중',
}: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-8 ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div
        className="relative"
        style={{
          width: DOT_SIZE * 3 + GAP * 2,
          height: DOT_SIZE,
          overflow: 'visible',
        }}
      >
        {OFFSETS.map((delay, index) => (
          <motion.span
            key={index}
            className="absolute top-0 rounded-full bg-[#256ef4]"
            style={{
              width: DOT_SIZE,
              height: DOT_SIZE,
              left: 0,
              transformOrigin: 'center center',
            }}
            animate={{
              x: [-STEP, 0, STEP, STEP * 2, STEP * 3],
              scaleX: [0, 1, 1, 1, 0],
              scaleY: [0, 1, 1, 1, 0],
            }}
            transition={{
              duration: DURATION,
              ease: 'linear',
              repeat: Number.POSITIVE_INFINITY,
              delay,
              times: [0, 0.25, 0.5, 0.75, 1],
            }}
          />
        ))}
      </div>
      <span className="text-sm text-[#8a949e]">{label}</span>
    </div>
  )
}
