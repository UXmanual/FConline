'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { HomeControllerUsage } from './home-feed'

type Props = {
  usage: HomeControllerUsage
}

function formatAnimatedPercentage(value: number, original: string) {
  const hasDecimal = original.includes('.')
  return `${hasDecimal ? value.toFixed(1) : Math.round(value)}%`
}


export default function HomeControllerUsageCard({ usage }: Props) {
  const cardRef = useRef<HTMLElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const hasAnimatedRef = useRef(false)
  const percentages = useMemo(
    () => usage.items.map((item) => Number(item.percentage.replace('%', '').trim())),
    [usage.items],
  )
  const maxPercentage = Math.max(...percentages)
  const [animatedPercentages, setAnimatedPercentages] = useState(() => usage.items.map(() => 0))

  const cardStyle = {
    backgroundColor: 'var(--app-card-bg)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--app-card-border)',
    transition: 'background-color 180ms ease, border-color 180ms ease, color 180ms ease',
  }
  const softStyle = {
    backgroundColor: 'var(--app-surface-soft)',
    transition: 'background-color 180ms ease, color 180ms ease, border-color 180ms ease',
  }
  const titleStyle = { color: 'var(--app-title)' }
  const bodyStyle = { color: 'var(--app-body-text)' }
  const mutedStyle = { color: 'var(--app-muted-text)' }

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
        const duration = 1500

        const tick = (now: number) => {
          const progress = Math.min((now - startAt) / duration, 1)
          const easedProgress = 1 - (1 - progress) * (1 - progress)

          setAnimatedPercentages(percentages.map((value) => value * easedProgress))

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
  }, [percentages])

  return (
    <section ref={cardRef} className="rounded-lg px-5 py-4" style={cardStyle}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-sm font-semibold" style={titleStyle}>
          <span>컨트롤러 이용 비중</span>
          <span aria-hidden="true">🎮</span>
        </div>
        <a
          href={usage.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-medium leading-none"
          style={mutedStyle}
        >
          <span className="shrink-0 text-[0.9em] leading-none" style={bodyStyle}>
            ↗
          </span>
          <span>데이터셋</span>
        </a>
      </div>

      <p className="mt-1 flex flex-wrap items-center gap-y-0.5 text-[12px] leading-5" style={mutedStyle}>
        {usage.basisLabel.split('|').map((part, i, arr) => (
          <span key={i} className="flex items-center">
            {part.trim()}
            {i < arr.length - 1 && (
              <span className="mx-2 h-2.5 w-[1px] bg-current opacity-20" aria-hidden="true" />
            )}
          </span>
        ))}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {usage.items.map((item, index) => {
          const numericPercentage = percentages[index] ?? 0
          const isPrimary = !usage.unavailable && numericPercentage === maxPercentage

          return (
            <article key={item.label} className="rounded-lg px-4 py-4" style={softStyle}>
              <p className="text-[13px] font-semibold" style={bodyStyle}>
                {item.label}
              </p>
              <p
                className="mt-1 text-[22px] font-extrabold tracking-[-0.03em]"
                style={{ color: isPrimary ? '#457ae5' : 'var(--app-title)' }}
              >
                {usage.unavailable ? '--%' : formatAnimatedPercentage(animatedPercentages[index] ?? 0, item.percentage)}
              </p>
              <p className="mt-1 text-[12px] leading-5" style={mutedStyle}>
                {item.record}
              </p>
            </article>
          )
        })}
      </div>
    </section>
  )
}
