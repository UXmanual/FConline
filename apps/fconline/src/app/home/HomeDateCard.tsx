'use client'

import { useEffect, useRef, useState } from 'react'

type HomeDateCardProps = {
  seasonLabel: string
  seasonPeriod: string
  seasonCountdown: string
  seasonCountdownDays: number
}

export default function HomeDateCard({
  seasonLabel,
  seasonPeriod,
  seasonCountdown,
  seasonCountdownDays,
}: HomeDateCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const hasAnimatedRef = useRef(false)
  const [animatedCountdownDays, setAnimatedCountdownDays] = useState(0)
  const countdownClassName = seasonCountdownDays <= 10 ? 'text-[#d14343]' : 'text-[#9aa3af]'

  useEffect(() => {
    const target = cardRef.current

    if (!target || hasAnimatedRef.current) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || hasAnimatedRef.current) {
          return
        }

        hasAnimatedRef.current = true
        const startAt = performance.now()
        const duration = 1400

        const tick = (now: number) => {
          const progress = Math.min((now - startAt) / duration, 1)
          const easedProgress = 1 - (1 - progress) * (1 - progress)
          setAnimatedCountdownDays(Math.round(seasonCountdownDays * easedProgress))

          if (progress < 1) {
            animationFrameRef.current = window.requestAnimationFrame(tick)
          }
        }

        animationFrameRef.current = window.requestAnimationFrame(tick)
        observer.disconnect()
      },
      { threshold: 0.35 },
    )

    observer.observe(target)

    return () => {
      observer.disconnect()
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [seasonCountdownDays])

  return (
    <div ref={cardRef} className="rounded-lg bg-white px-5 py-4">
      <div className="flex items-center justify-between gap-4 text-lg font-bold tracking-[-0.02em] text-[#111827]">
        <span className="text-[#457ae5]">{seasonLabel}</span>
        <div className="flex items-center gap-2 text-right">
          <span>{seasonPeriod}</span>
          <span aria-hidden="true" className="text-sm font-medium text-[#c7cfd8]">
            |
          </span>
          <span className={`text-base font-semibold ${countdownClassName}`}>
            {seasonCountdownDays > 0 ? `D-${animatedCountdownDays}` : seasonCountdown}
          </span>
        </div>
      </div>
    </div>
  )
}
