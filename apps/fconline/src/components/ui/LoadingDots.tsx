'use client'

import { motion } from 'framer-motion'

interface Props {
  className?: string
  label?: string
  showLabel?: boolean
  size?: 'md' | 'sm'
}

const DURATION = 1.32
const PHASE = DURATION / 3
const OFFSETS = [0, -PHASE, -PHASE * 2]
const SIZE_CONFIG = {
  md: {
    dotSize: 10,
    gap: 3,
    rootClassName: 'flex flex-col items-center justify-center gap-3 py-8',
    labelClassName: 'text-sm',
  },
  sm: {
    dotSize: 6,
    gap: 2,
    rootClassName: 'flex items-center justify-center',
    labelClassName: 'text-[11px]',
  },
} as const

export default function LoadingDots({
  className = '',
  label = '로딩 중',
  showLabel = true,
  size = 'md',
}: Props) {
  const config = SIZE_CONFIG[size]
  const step = config.dotSize + config.gap

  return (
    <div
      className={`${config.rootClassName} ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div
        className="relative"
        style={{
          width: config.dotSize * 3 + config.gap * 2,
          height: config.dotSize,
          overflow: 'visible',
        }}
      >
        {OFFSETS.map((delay, index) => (
          <motion.span
            key={index}
            className="absolute top-0 rounded-full bg-[#256ef4]"
            style={{
              width: config.dotSize,
              height: config.dotSize,
              left: 0,
              transformOrigin: 'center center',
            }}
            animate={{
              x: [-step, 0, step, step * 2, step * 3],
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
      {showLabel ? <span className={`${config.labelClassName} text-[#8a949e]`}>{label}</span> : null}
    </div>
  )
}
