'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { calculateSkillMoveStars, formatPriceWithKoreanUnits, getStrongPoint } from '../player-detail'
import { getPlayerImageCandidates } from '../player-image'
import { AbilityStat, PlayerDetail } from '../types'

const ABILITY_GROUPS = [
  ['속력', '반응 속도'],
  ['가속력', '밸런스'],
  ['골 결정력', '슛 파워'],
  ['중거리 슛', '위치 선정'],
  ['헤더', '짧은 패스'],
  ['긴 패스', '시야'],
  ['커브', '프리킥'],
  ['드리블', '볼 컨트롤'],
  ['민첩성', '침착성'],
  ['태클', '가로채기'],
  ['대인 수비', '슬라이딩 태클'],
  ['몸싸움', '스태미너'],
  ['점프', '키퍼 다이빙'],
  ['키퍼 핸들링', '키퍼 킥'],
  ['키퍼 반응속도', '키퍼 위치 선정'],
] as const

const STRONG_LEVELS = Array.from({ length: 13 }, (_, index) => index + 1)
const DRAG_THRESHOLD = 8
const PLAYER_THUMBNAIL_SIZE = 96

interface Props {
  playerName: string
  spid: number | string
  detail: PlayerDetail
  seasonName?: string | null
  seasonImageUrl?: string | null
  initialStrongLevel?: number
}

export default function PlayerDetailPanel({
  playerName,
  spid,
  detail,
  seasonName,
  seasonImageUrl,
  initialStrongLevel = 1,
}: Props) {
  const [strongLevel, setStrongLevel] = useState(initialStrongLevel)
  const [isChemistryApplied, setIsChemistryApplied] = useState(false)
  const [imageSrcIndex, setImageSrcIndex] = useState(0)
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

  const abilityBoost = useMemo(
    () => getStrongPoint(strongLevel) - getStrongPoint(1),
    [strongLevel],
  )
  const chemistryBoost = isChemistryApplied ? 4 : 0
  const totalStatBoost = abilityBoost + chemistryBoost

  const adjustedAbilities = useMemo(() => {
    if (detail.abilities.length === 0) {
      return []
    }

    return detail.abilities.map((ability) => ({
      ...ability,
      value: ability.value + totalStatBoost,
    }))
  }, [detail.abilities, totalStatBoost])

  const adjustedTotalAbility = useMemo(() => {
    if (detail.totalAbility == null) {
      return null
    }

    return detail.totalAbility + totalStatBoost * detail.abilities.length
  }, [detail.totalAbility, detail.abilities.length, totalStatBoost])

  const orderedAbilities = useMemo(() => {
    const abilityOrder = ABILITY_GROUPS.flat() as string[]

    return adjustedAbilities
      .slice()
      .sort((a, b) => {
        const leftIndex = abilityOrder.indexOf(a.name)
        const rightIndex = abilityOrder.indexOf(b.name)
        return (leftIndex === -1 ? 999 : leftIndex) - (rightIndex === -1 ? 999 : rightIndex)
      })
  }, [adjustedAbilities])

  const imageCandidates = useMemo(() => getPlayerImageCandidates(spid), [spid])

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
      const state = dragStateRef.current

      if (Math.abs(state.velocity) < 0.1) {
        momentumRef.current = null
        return
      }

      element.scrollLeft -= state.velocity * 18
      state.velocity *= 0.92
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
    <div className="space-y-4">
      <section className="app-player-card rounded-lg px-5 py-5">
        <div className="flex gap-4">
          <div
            className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg"
            style={{
              backgroundColor: 'var(--app-player-soft-bg)',
              width: PLAYER_THUMBNAIL_SIZE,
              height: PLAYER_THUMBNAIL_SIZE,
              minWidth: PLAYER_THUMBNAIL_SIZE,
              minHeight: PLAYER_THUMBNAIL_SIZE,
              flex: `0 0 ${PLAYER_THUMBNAIL_SIZE}px`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageCandidates[imageSrcIndex] ?? '/player-fallback.svg'}
              alt={playerName}
              width={PLAYER_THUMBNAIL_SIZE}
              height={PLAYER_THUMBNAIL_SIZE}
              className="block object-contain object-center"
              style={{
                width: PLAYER_THUMBNAIL_SIZE,
                height: PLAYER_THUMBNAIL_SIZE,
                maxWidth: '100%',
                maxHeight: '100%',
              }}
              onError={() => {
                setImageSrcIndex((current) => {
                  if (current >= imageCandidates.length) {
                    return current
                  }

                  return current + 1
                })
              }}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {seasonImageUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={seasonImageUrl}
                  alt={seasonName ?? '시즌'}
                  className="block h-5 w-auto shrink-0 object-contain object-left"
                />
              )}
              <h1 className="app-player-title truncate text-[22px] font-bold tracking-[-0.03em]">
                {playerName}
              </h1>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              {detail.position && <PositionBadge position={detail.position} />}
              <span className="app-player-title text-[18px] font-bold tracking-[-0.02em]">
                {currentOverall != null ? `${currentOverall}` : '-'}
              </span>
            </div>

            <p className="app-player-body mt-1 text-sm font-medium">
              {seasonName ?? '카드 타입 정보 없음'}
            </p>

            <p className="app-player-muted mt-1 text-sm">{detail.birthDate ?? '출생 정보 없음'}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <InfoCard label="현재 금액" value={currentPrice} />
          <FootInfoCard leftFoot={detail.leftFoot} rightFoot={detail.rightFoot} />
          <InfoCard label="키" value={detail.height ? `${detail.height}cm` : '-'} />
          <InfoCard label="몸무게" value={detail.weight ? `${detail.weight}kg` : '-'} />
          <InfoCard label="체형" value={detail.bodyType} />
          <InfoCard label="급여" value={detail.pay?.toString() ?? '-'} />
        </div>

        {detail.nationName && (
          <div className="mt-4 rounded-lg px-4 py-3" style={{ backgroundColor: 'var(--app-player-soft-bg)' }}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="app-player-muted text-xs font-medium">국적</p>
                <p className="app-player-title truncate text-sm font-semibold">{detail.nationName}</p>
              </div>
              {detail.nationLogo && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={detail.nationLogo}
                  alt={detail.nationName}
                  className="h-4 w-auto shrink-0 rounded-[3px] object-contain"
                />
              )}
            </div>
          </div>
        )}

        {detail.traits.length > 0 && (
          <div className="mt-4 rounded-lg px-4 py-3" style={{ backgroundColor: 'var(--app-player-soft-bg)' }}>
            <p className="app-player-muted text-xs font-medium">특성</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {detail.traits.map((trait, index) => (
                <span
                  key={`${trait.name}-${index}`}
                  className="app-player-body inline-flex rounded-full border px-3 py-1.5 text-xs font-medium"
                  style={{ backgroundColor: 'var(--app-player-chip-bg)', borderColor: 'var(--app-player-chip-border)' }}
                >
                  {trait.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="app-player-card rounded-lg px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="app-player-title text-base font-semibold">능력치</h2>
          {adjustedTotalAbility != null && (
            <span className="app-player-title text-sm font-bold">
              총 능력치{' '}
              <span
                style={{
                  color: getAbilityValueColor(
                    Math.round(adjustedTotalAbility / Math.max(1, adjustedAbilities.length)),
                  ),
                }}
              >
                {adjustedTotalAbility.toLocaleString()}
              </span>
            </span>
          )}
        </div>

        <div className="relative mt-4">
          {showLeftFade && (
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r to-transparent" style={{ ['--tw-gradient-from' as string]: 'var(--app-card-bg)', ['--tw-gradient-stops' as string]: 'var(--tw-gradient-from), var(--app-player-overlay-grad), transparent' }} />
          )}

          {showRightFade && (
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l to-transparent" style={{ ['--tw-gradient-from' as string]: 'var(--app-card-bg)', ['--tw-gradient-stops' as string]: 'var(--tw-gradient-from), var(--app-player-overlay-grad), transparent' }} />
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
                      : 'app-player-body'
                  }`}
                  style={
                    strongLevel === level
                      ? undefined
                      : { backgroundColor: 'var(--app-player-chip-bg)', borderColor: 'var(--app-player-chip-border)' }
                  }
                >
                  {level}카
                </button>
              ))}
            </div>
          </div>
        </div>

        <div
          className="mt-4 flex items-center justify-between gap-4 rounded-lg px-4 py-3"
          style={{ backgroundColor: 'var(--app-player-soft-bg)' }}
        >
          <div className="flex items-center gap-1">
            <p className="app-player-title text-sm font-semibold">적응도</p>
            <p
              className="text-sm font-semibold transition-colors"
              style={{ color: isChemistryApplied ? '#457ae5' : 'var(--app-player-muted)' }}
            >
              {isChemistryApplied ? '적용중' : '미적용'}
            </p>
          </div>

          <button
            type="button"
            aria-label="적응도 토글"
            aria-pressed={isChemistryApplied}
            onClick={() => setIsChemistryApplied((current) => !current)}
            className="relative inline-flex h-8 w-[52px] shrink-0 items-center rounded-full transition-colors"
            style={{ backgroundColor: isChemistryApplied ? '#457ae5' : '#d5dbe3' }}
          >
            <span
              className="absolute h-6 w-6 rounded-full bg-white shadow-[0_2px_8px_rgba(15,23,42,0.18)] transition-transform duration-200"
              style={{ transform: `translateX(${isChemistryApplied ? '24px' : '4px'})` }}
              aria-hidden="true"
            />
          </button>
        </div>

        {detail.skillMove != null && (
          <div className="mt-4 flex items-center justify-between rounded-lg px-4 py-3" style={{ backgroundColor: 'var(--app-player-soft-bg)' }}>
            <p className="app-player-muted text-xs font-medium">개인기</p>
            <div className="flex gap-0.5">
              {Array.from({ length: 6 }, (_, index) => (
                <svg
                  key={index}
                  width="16"
                  height="16"
                  viewBox="0 0 19 18"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4.19227 17.44L6.27227 11.08L0.832266 7.16H7.51227L9.59227 0.799999L11.6723 7.16H18.3923L12.9523 11.08L15.0323 17.44L9.59227 13.52L4.19227 17.44Z"
                    fill={
                      index < calculateSkillMoveStars(detail.skillMove, strongLevel)
                        ? '#F1C018'
                        : '#d1d5db'
                    }
                  />
                </svg>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          {orderedAbilities.map((ability) => (
            <AbilityCard
              key={ability.name}
              stat={ability}
              abilityBoost={abilityBoost}
              chemistryBoost={chemistryBoost}
            />
          ))}
        </div>
      </section>

      {detail.clubHistory.length > 0 && (
        <section className="app-player-card rounded-lg px-5 py-5">
          <h2 className="app-player-title text-base font-semibold">소속 정보</h2>
          <div className="mt-4">
            <p className="app-player-muted text-xs font-medium">이전 소속팀</p>
            <div className="mt-3 space-y-2">
              {detail.clubHistory.map((club, index) => (
                <div
                  key={`${club.year}-${club.club}-${index}`}
                  className="flex items-start justify-between gap-3 rounded-lg px-4 py-3"
                  style={{ backgroundColor: 'var(--app-player-soft-bg)' }}
                >
                  <div className="min-w-0">
                    <p className="app-player-title text-sm font-semibold">{club.club}</p>
                    <p className="app-player-muted mt-1 text-xs">{club.year}</p>
                  </div>
                  {club.rent && (
                    <span className="app-player-body shrink-0 text-xs font-medium">{club.rent}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function PositionBadge({ position }: { position: string }) {
  const upper = position.toUpperCase()
  const style =
    upper === 'ST' || upper === 'CF' || upper === 'LW' || upper === 'RW'
      ? ''
      : upper === 'CM' || upper === 'CAM' || upper === 'CDM' || upper === 'LM' || upper === 'RM'
        ? ''
        : ''

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}
      style={
        upper === 'ST' || upper === 'CF' || upper === 'LW' || upper === 'RW'
          ? { backgroundColor: 'var(--app-player-pos-fw-bg)', color: 'var(--app-player-pos-fw-fg)' }
          : upper === 'CM' || upper === 'CAM' || upper === 'CDM' || upper === 'LM' || upper === 'RM'
            ? { backgroundColor: 'var(--app-player-pos-mf-bg)', color: 'var(--app-player-pos-mf-fg)' }
            : { backgroundColor: 'var(--app-player-pos-df-bg)', color: 'var(--app-player-pos-df-fg)' }
      }
    >
      {position}
    </span>
  )
}

function InfoCard({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-lg px-4 py-3" style={{ backgroundColor: 'var(--app-player-soft-bg)' }}>
      <p className="app-player-muted text-xs font-medium">{label}</p>
      <p className="app-player-title mt-1 break-words text-sm font-semibold">{value ?? '-'}</p>
    </div>
  )
}

function FootInfoCard({
  leftFoot,
  rightFoot,
}: {
  leftFoot: number | null
  rightFoot: number | null
}) {
  return (
    <div className="rounded-lg px-4 py-3" style={{ backgroundColor: 'var(--app-player-soft-bg)' }}>
      <p className="app-player-muted text-xs font-medium">주발</p>
      <div className="app-player-title mt-1 flex flex-wrap items-center gap-3 text-sm font-semibold">
        <span>
          왼발{' '}
          <span>
            {leftFoot ?? '-'}
          </span>
        </span>
        <span>
          오른발{' '}
          <span>
            {rightFoot ?? '-'}
          </span>
        </span>
      </div>
    </div>
  )
}


function AbilityCard({
  stat,
  abilityBoost,
  chemistryBoost,
}: {
  stat: AbilityStat
  abilityBoost: number
  chemistryBoost: number
}) {
  const color = getAbilityValueColor(stat.value)
  const showAbilityBoost = abilityBoost > 0
  const showChemistryBoost = chemistryBoost > 0

  return (
    <div className="rounded-lg px-4 py-3" style={{ backgroundColor: 'var(--app-player-soft-bg)' }}>
      <p className="app-player-muted text-xs font-medium">{stat.name}</p>
      <div className="mt-1 flex items-end gap-1.5">
        <span className="block text-[18px] font-bold leading-none tracking-[-0.02em]" style={{ color }}>
          {stat.value}
        </span>
        {(showAbilityBoost || showChemistryBoost) && (
          <span className="flex items-end gap-1 pb-0.5 text-[12px] leading-none tracking-[-0.01em]">
            {showAbilityBoost && (
              <span className="font-semibold" style={{ color: 'var(--app-player-boost)' }}>
                +{abilityBoost}
              </span>
            )}
            {showAbilityBoost && showChemistryBoost && (
              <span
                aria-hidden="true"
                className="font-medium"
                style={{ color: 'color-mix(in srgb, var(--app-player-muted) 34%, transparent)' }}
              >
                |
              </span>
            )}
            {showChemistryBoost && (
              <span className="font-semibold" style={{ color: 'var(--app-player-boost)' }}>
                +{chemistryBoost}
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  )
}

function getAbilityValueColor(value: number) {
  if (value >= 160) return '#22c7a9'
  if (value >= 150) return '#28bdd6'
  if (value >= 140) return '#ff9f43'
  if (value >= 130) return '#ef4444'
  if (value >= 120) return '#a855f7'
  if (value >= 110) return '#457ae5'
  if (value >= 100) return '#2f8f57'
  if (value >= 90) return '#7f8a96'
  return '#58616a'
}
