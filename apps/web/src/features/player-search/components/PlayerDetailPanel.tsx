'use client'

import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'
import { formatPriceWithKoreanUnits, getStrongPoint } from '../player-detail'
import { AbilityStat, PlayerDetail } from '../types'

const ABILITY_TIER_COLOR: Record<AbilityStat['tier'], string> = {
  over120: '#d946ef',
  over110: '#a855f7',
  over100: '#3b82f6',
  over90:  '#e2e8f0',
  over60:  '#e2e8f0',
  over20:  '#64748b',
  over10:  '#64748b',
  base:    '#64748b',
}

// 능력치 그룹 순서 (이미지 기준 2열 배치)
const ABILITY_GROUPS = [
  ['속력', '밸런스'],
  ['가속력', '반응 속도'],
  ['골 결정력', '대인 수비'],
  ['슛 파워', '태클'],
  ['중거리 슛', '가로채기'],
  ['위치 선정', '헤더'],
  ['발리슛', '슬라이딩 태클'],
  ['페널티 킥', '몸싸움'],
  ['짧은 패스', '스태미너'],
  ['시야', '적극성'],
  ['크로스', '점프'],
  ['긴 패스', '침착성'],
  ['프리킥', 'GK 다이빙'],
  ['커브', 'GK 핸들링'],
  ['드리블', 'GK 킥'],
  ['볼 컨트롤', 'GK 반응속도'],
  ['민첩성', 'GK 위치 선정'],
]

interface Props {
  detail: PlayerDetail
  seasonName?: string | null
  initialStrongLevel?: number
}

const STRONG_LEVELS = Array.from({ length: 13 }, (_, index) => index + 1)
const DRAG_THRESHOLD = 8

export default function PlayerDetailPanel({
  detail,
  seasonName,
  initialStrongLevel = 1,
}: Props) {
  const [strongLevel, setStrongLevel] = useState(initialStrongLevel)
  const [showLeftFade, setShowLeftFade] = useState(false)
  const [showRightFade, setShowRightFade] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const momentumRef = useRef<number | null>(null)
  const suppressClickRef = useRef(false)
  const dragStateRef = useRef({
    isDragging: false,
    startX: 0,
    startScrollLeft: 0,
    lastX: 0,
    lastTime: 0,
    velocity: 0,
  })

  const currentOverall = useMemo(() => {
    if (detail.overall == null) {
      return null
    }

    const baseOverall = detail.overall - getStrongPoint(1)
    return baseOverall + getStrongPoint(strongLevel)
  }, [detail.overall, strongLevel])

  const currentPrice = formatPriceWithKoreanUnits(detail.prices[strongLevel])

  const adjustedAbilities = useMemo(() => {
    if (detail.abilities.length === 0) return []

    const boost = getStrongPoint(strongLevel) - getStrongPoint(1)
    return detail.abilities.map((ability) => ({
      ...ability,
      value: ability.value + boost,
    }))
  }, [detail.abilities, strongLevel])

  const adjustedTotalAbility = useMemo(() => {
    if (detail.totalAbility == null) return null
    const boost = getStrongPoint(strongLevel) - getStrongPoint(1)
    return detail.totalAbility + boost * detail.abilities.length
  }, [detail.totalAbility, detail.abilities.length, strongLevel])

  useEffect(() => {
    setStrongLevel(initialStrongLevel)
  }, [initialStrongLevel])

  useEffect(() => {
    const element = scrollRef.current

    if (!element) {
      return
    }

    const updateFade = () => {
      const maxScrollLeft = Math.max(0, element.scrollWidth - element.clientWidth)
      setShowLeftFade(element.scrollLeft > 4)
      setShowRightFade(maxScrollLeft - element.scrollLeft > 4)
    }

    updateFade()
    element.addEventListener('scroll', updateFade, { passive: true })
    window.addEventListener('resize', updateFade)

    return () => {
      element.removeEventListener('scroll', updateFade)
      window.removeEventListener('resize', updateFade)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (momentumRef.current != null) {
        cancelAnimationFrame(momentumRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const element = scrollRef.current
    const activeButton = element?.querySelector<HTMLButtonElement>(`[data-strong-level="${strongLevel}"]`)

    if (!element || !activeButton) {
      return
    }

    const targetLeft =
      activeButton.offsetLeft - (element.clientWidth - activeButton.clientWidth) / 2
    const maxScrollLeft = Math.max(0, element.scrollWidth - element.clientWidth)

    element.scrollTo({
      left: Math.min(Math.max(0, targetLeft), maxScrollLeft),
      behavior: 'smooth',
    })
  }, [strongLevel])

  const stopMomentum = () => {
    if (momentumRef.current != null) {
      cancelAnimationFrame(momentumRef.current)
      momentumRef.current = null
    }
  }

  const runMomentum = () => {
    const element = scrollRef.current

    if (!element) {
      return
    }

    stopMomentum()

    const step = () => {
      const dragState = dragStateRef.current

      if (Math.abs(dragState.velocity) < 0.1) {
        momentumRef.current = null
        return
      }

      element.scrollLeft -= dragState.velocity * 18
      dragState.velocity *= 0.92
      momentumRef.current = requestAnimationFrame(step)
    }

    momentumRef.current = requestAnimationFrame(step)
  }

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return
    }

    const element = scrollRef.current

    if (!element) {
      return
    }

    stopMomentum()
    suppressClickRef.current = false
    dragStateRef.current = {
      isDragging: false,
      startX: event.clientX,
      startScrollLeft: element.scrollLeft,
      lastX: event.clientX,
      lastTime: performance.now(),
      velocity: 0,
    }

    element.style.cursor = 'grabbing'

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const state = dragStateRef.current
      const deltaX = moveEvent.clientX - state.startX
      const now = performance.now()

      if (!state.isDragging && Math.abs(deltaX) > DRAG_THRESHOLD) {
        state.isDragging = true
        suppressClickRef.current = true
      }

      if (!state.isDragging) {
        return
      }

      moveEvent.preventDefault()
      element.scrollLeft = state.startScrollLeft - deltaX

      const distance = moveEvent.clientX - state.lastX
      const elapsed = Math.max(1, now - state.lastTime)
      state.velocity = distance / elapsed
      state.lastX = moveEvent.clientX
      state.lastTime = now
    }

    const handleMouseUp = () => {
      const state = dragStateRef.current

      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      element.style.cursor = 'grab'

      if (state.isDragging) {
        runMomentum()
        window.setTimeout(() => {
          suppressClickRef.current = false
        }, 80)
      } else {
        suppressClickRef.current = false
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const element = scrollRef.current

    if (!element || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
      return
    }

    event.preventDefault()
    element.scrollLeft += event.deltaY
  }

  const handleLevelClick = (level: number) => {
    if (suppressClickRef.current) {
      return
    }

    setStrongLevel(level)
  }

  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-2xl border border-[#e6e8ea] bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-[#1e2124]">상세 정보</h2>
          <div className="rounded-full bg-[#f4f5f6] px-3 py-1 text-xs font-semibold text-[#464c53]">
            {strongLevel}카
          </div>
        </div>

        <div className="relative mt-4">
          {showLeftFade && (
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-white via-white/92 to-transparent" />
          )}

          {showRightFade && (
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white via-white/92 to-transparent" />
          )}

          <div
            ref={scrollRef}
            className="overflow-x-auto select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onMouseDown={handleMouseDown}
            onWheel={handleWheel}
            style={{ cursor: 'grab', touchAction: 'pan-x pan-y' }}
          >
            <div className="flex min-w-max gap-2 whitespace-nowrap pb-1">
              {STRONG_LEVELS.map((level) => (
                <button
                  key={level}
                  data-strong-level={level}
                  type="button"
                  onClick={() => handleLevelClick(level)}
                  className={`shrink-0 rounded-full border px-3 py-2 text-sm font-semibold transition ${
                    strongLevel === level
                      ? 'border-[#256ef4] bg-[#256ef4] text-white'
                      : 'border-[#e6e8ea] bg-white text-[#58616a]'
                  }`}
                >
                  {level}카
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <InfoCard label="포지션" value={detail.position} />
          <InfoCard label="오버롤" value={currentOverall?.toString() ?? '-'} />
          <InfoCard label="급여" value={detail.pay?.toString() ?? '-'} />
          <InfoCard label="현재 금액" value={currentPrice} />
          <InfoCard label="키" value={detail.height ? `${detail.height}cm` : '-'} />
          <InfoCard label="몸무게" value={detail.weight ? `${detail.weight}kg` : '-'} />
          <InfoCard label="체형" value={detail.bodyType} />
          <InfoCard
            label="왼발 오른발"
            value={
              detail.leftFoot != null && detail.rightFoot != null
                ? `왼발 ${detail.leftFoot} 오른발 ${detail.rightFoot}`
                : '-'
            }
          />
        </div>

        {detail.skillMove != null && (
          <div className="mt-4 flex items-center justify-between rounded-xl bg-[#f4f5f6] px-4 py-3">
            <p className="text-xs font-medium text-[#8a949e]">개인기</p>
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }, (_, i) => (
                <svg
                  key={i}
                  width="16"
                  height="16"
                  viewBox="0 0 19 18"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4.19227 17.44L6.27227 11.08L0.832266 7.16H7.51227L9.59227 0.799999L11.6723 7.16H18.3923L12.9523 11.08L15.0323 17.44L9.59227 13.52L4.19227 17.44Z"
                    fill={i < (detail.skillMove ?? 0) ? '#F1C018' : '#d1d5db'}
                  />
                </svg>
              ))}
            </div>
          </div>
        )}
      </section>

      {adjustedAbilities.length > 0 && (
        <section className="rounded-2xl border border-[#e6e8ea] bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#1e2124]">능력치</h2>
            {adjustedTotalAbility != null && (
              <span className="text-sm font-bold text-[#1e2124]">
                총 능력치 <span style={{ color: ABILITY_TIER_COLOR.over120 }}>{adjustedTotalAbility.toLocaleString()}</span>
              </span>
            )}
          </div>

          <div className="mt-4 space-y-2">
            {ABILITY_GROUPS.map(([leftName, rightName]) => {
              const left = adjustedAbilities.find((a) => a.name === leftName)
              const right = adjustedAbilities.find((a) => a.name === rightName)
              if (!left && !right) return null

              return (
                <div key={leftName} className="grid grid-cols-2 gap-4">
                  <AbilityRow stat={left} name={leftName} align="left" />
                  <AbilityRow stat={right} name={rightName} align="left" />
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-[#e6e8ea] bg-white p-4">
        <h2 className="text-base font-semibold text-[#1e2124]">소속 정보</h2>
        <div className="mt-4 flex items-center gap-3">
          <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-[#e6e8ea] bg-[#f4f5f6]">
            {detail.teamLogo ? (
              <Image
                src={detail.teamLogo}
                alt={detail.teamName ?? '팀 로고'}
                fill
                className="object-contain p-2"
                unoptimized
              />
            ) : (
              <span className="text-xs text-[#8a949e]">로고 없음</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#8a949e]">실제 현 소속팀</p>
            <p className="truncate text-base font-semibold text-[#1e2124]">{detail.teamName ?? '-'}</p>
            <p className="mt-1 text-sm text-[#58616a]">{seasonName ?? '시즌 정보 없음'}</p>
          </div>
        </div>

        {detail.clubHistory.length > 0 && (
          <div className="mt-5 border-t border-[#e6e8ea] pt-4">
            <p className="text-xs font-medium text-[#8a949e]">이전 소속팀</p>
            <div className="mt-3 space-y-2">
              {detail.clubHistory.map((club, index) => (
                <div
                  key={`${club.year}-${club.club}-${index}`}
                  className="flex items-start justify-between gap-3 rounded-xl bg-[#f4f5f6] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1e2124]">{club.club}</p>
                    <p className="mt-1 text-xs text-[#8a949e]">{club.year}</p>
                  </div>
                  {club.rent && (
                    <span className="shrink-0 text-xs font-medium text-[#58616a]">{club.rent}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-xl bg-[#f4f5f6] px-4 py-3">
      <p className="text-xs font-medium text-[#8a949e]">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[#1e2124]">{value ?? '-'}</p>
    </div>
  )
}

function AbilityRow({
  stat,
  name,
  align,
}: {
  stat: AbilityStat | undefined
  name: string
  align: 'left' | 'right'
}) {
  if (!stat) {
    return (
      <div className={`flex items-center justify-between gap-2 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        <span className="text-xs text-[#58616a]">{name}</span>
        <span className="text-xs text-[#464c53]">-</span>
      </div>
    )
  }

  const color = ABILITY_TIER_COLOR[stat.tier]

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-[#8a949e]">{stat.name}</span>
      <span className="text-sm font-bold" style={{ color }}>
        {stat.value}
      </span>
    </div>
  )
}
