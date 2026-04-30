'use client'
import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'
import PlayerReviewSection from './PlayerReviewSection'
import { calculateSkillMoveStars, formatPriceWithKoreanUnits, getStrongPoint } from '../player-detail'
import { getPlayerImageCandidates } from '../player-image'
import { AbilityStat, PlayerDetail, Trait } from '../types'
import FilledFavoriteIcon from '@/components/icons/star.svg'
import EmptyFavoriteIcon from '@/components/icons/star_border.svg'

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
const FORWARD_POSITIONS = new Set(['ST', 'CF', 'LF', 'RF', 'LW', 'RW'])
const MIDFIELDER_POSITIONS = new Set(['CAM', 'CM', 'CDM', 'LAM', 'RAM', 'LM', 'RM'])
const DEFENDER_POSITIONS = new Set(['CB', 'LB', 'RB', 'LWB', 'RWB', 'SW'])


interface Props {
  playerName: string
  spid: number | string
  detail: PlayerDetail
  seasonName?: string | null
  seasonImageUrl?: string | null
  initialStrongLevel?: number
  initialTab?: 'detail' | 'review'
  initialHighlightedPostId?: string | null
}

export default function PlayerDetailPanel({
  playerName,
  spid,
  detail,
  seasonName,
  seasonImageUrl,
  initialStrongLevel = 1,
  initialTab = 'detail',
  initialHighlightedPostId = null,
}: Props) {
  const [strongLevel, setStrongLevel] = useState(initialStrongLevel)
  const [isChemistryApplied, setIsChemistryApplied] = useState(false)
  const [teamColorBoost, setTeamColorBoost] = useState(0)
  const [activeTab, setActiveTab] = useState<'detail' | 'review'>(initialTab)
  const [reviewCount, setReviewCount] = useState(0)
  const [favorited, setFavorited] = useState(false)
  const [isLoginRequiredOpen, setIsLoginRequiredOpen] = useState(false)
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

  const abilityBoost = useMemo(
    () => getStrongPoint(strongLevel) - getStrongPoint(1),
    [strongLevel],
  )
  const chemistryBoost = isChemistryApplied ? 4 : 0
  const totalStatBoost = abilityBoost + chemistryBoost + teamColorBoost

  const currentOverall = useMemo(() => {
    if (detail.overall == null) {
      return null
    }

    const baseOverall = detail.overall - getStrongPoint(1)
    return baseOverall + getStrongPoint(strongLevel) + chemistryBoost + teamColorBoost
  }, [chemistryBoost, detail.overall, strongLevel, teamColorBoost])

  const currentPrice = formatPriceWithKoreanUnits(detail.prices[strongLevel])

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

  const aiReviewSummariesByLevel = useMemo(
    () =>
      Object.fromEntries(
        STRONG_LEVELS.map((level) => {
          const levelAbilityBoost = getStrongPoint(level) - getStrongPoint(1)
          const levelTotalStatBoost = levelAbilityBoost + chemistryBoost + teamColorBoost
          const levelAbilities = detail.abilities.map((ability) => ({
            ...ability,
            value: ability.value + levelTotalStatBoost,
          }))
          const levelOverall =
            detail.overall == null
              ? null
              : detail.overall - getStrongPoint(1) + getStrongPoint(level) + chemistryBoost

          return [
            level,
            buildAiReviewSummary({
              playerName,
              abilities: levelAbilities,
              traits: detail.traits,
              position: detail.position,
              overall: levelOverall,
              strongLevel: level,
            }),
          ]
        }),
      ),
    [chemistryBoost, detail.abilities, detail.overall, detail.position, detail.traits, playerName, teamColorBoost],
  )

  const imageCandidates = useMemo(() => getPlayerImageCandidates(spid), [spid])

  useEffect(() => {
    setStrongLevel(initialStrongLevel)
  }, [initialStrongLevel])

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab, spid])

  useEffect(() => {
    let isCancelled = false

    async function fetchReviewCount() {
      try {
        const response = await fetch(
          `/api/player-reviews/posts?page=1&pageSize=1&playerId=${encodeURIComponent(String(spid))}`,
          { cache: 'no-store' },
        )
        const result = await response.json()

        if (!response.ok || isCancelled) {
          return
        }

        setReviewCount(result.totalCount ?? 0)
      } catch {
        if (!isCancelled) {
          setReviewCount(0)
        }
      }
    }

    void fetchReviewCount()

    return () => {
      isCancelled = true
    }
  }, [spid])

  useEffect(() => {
    let isMounted = true

    const syncFavorite = async () => {
      try {
        const response = await fetch('/api/mypage/favorite-players', { cache: 'no-store' })
        const result = await response.json().catch(() => null)

        if (!isMounted || !response.ok) {
          return
        }

        const items = (Array.isArray(result?.items) ? result.items : []) as Array<{ player_id: number }>
        setFavorited(items.some((item) => Number(item.player_id) === Number(spid)))
      } catch {
        if (isMounted) {
          setFavorited(false)
        }
      }
    }

    void syncFavorite()

    return () => {
      isMounted = false
    }
  }, [spid])

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

  const handleFavorite = () => {
    void (async () => {
      const response = await fetch('/api/mypage/favorite-players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: Number(spid),
          playerName,
          seasonName,
          position: detail.position ?? null,
          level: strongLevel,
        }),
      })

      if (response.status === 401) {
        setIsLoginRequiredOpen(true)
        return
      }

      if (!response.ok) {
        const result = await response.json().catch(() => null)
        window.alert(result?.message ?? '선수 즐겨찾기를 처리하지 못했습니다.')
        return
      }

      const result = await response.json().catch(() => null)
      setFavorited(Boolean(result?.favorited))
    })()
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
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
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
              <button
                type="button"
                onPointerDown={(event) => {
                  event.stopPropagation()
                }}
                onClick={handleFavorite}
                className="shrink-0 rounded-full p-2 -m-2 touch-manipulation"
                aria-label="선수 즐겨찾기"
              >
                <Image
                  src={favorited ? FilledFavoriteIcon : EmptyFavoriteIcon}
                  alt=""
                  width={20}
                  height={20}
                  className="shrink-0"
                />
              </button>
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
          <FootInfoCard leftFoot={detail.leftFoot} rightFoot={detail.rightFoot} />
          {detail.nationName ? (
            <div className="rounded-lg px-4 py-3" style={{ backgroundColor: 'var(--app-player-soft-bg)' }}>
              <p className="app-player-muted text-xs font-medium">국적</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="app-player-title truncate text-sm font-semibold">{detail.nationName}</p>
                {detail.nationLogo && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={detail.nationLogo} alt={detail.nationName} className="h-4 w-auto shrink-0 rounded-[3px] object-contain" />
                )}
              </div>
            </div>
          ) : (
            <InfoCard label="국적" value="-" />
          )}
          <InfoCard label="키" value={detail.height ? `${detail.height}cm` : '-'} />
          <InfoCard label="몸무게" value={detail.weight ? `${detail.weight}kg` : '-'} />
          <InfoCard label="체형" value={detail.bodyType} />
          <InfoCard label="급여" value={detail.pay?.toString() ?? '-'} />
        </div>

        {detail.traits.length > 0 && (
          <div className="mt-4 rounded-lg px-4 py-3" style={{ backgroundColor: 'var(--app-player-soft-bg)' }}>
            <p className="app-player-muted text-xs font-medium">특성</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {detail.traits
                .filter((trait) => trait.iconSrc)
                .map((trait, index) => (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    key={`${trait.name}-${index}`}
                    src={trait.iconSrc ?? ''}
                    alt={trait.name}
                    title={trait.name}
                    className="h-12 w-12 shrink-0 object-contain"
                  />
                ))}
            </div>
            <div className="app-player-body mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium leading-[1.5]">
              {detail.traits.map((trait, index) => (
                <span key={`${trait.name}-label-${index}`} className="inline-flex items-center gap-2">
                  {index > 0 && (
                    <span
                      aria-hidden="true"
                      className="font-medium"
                      style={{ color: 'color-mix(in srgb, var(--app-player-muted) 34%, transparent)' }}
                    >
                      |
                    </span>
                  )}
                  <span>{trait.name}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="py-1" aria-label="선수 상세 탭">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('detail')}
            className="flex h-12 items-center justify-center rounded-xl text-[15px] font-semibold tracking-[-0.02em] transition"
            style={
              activeTab === 'detail'
                ? {
                    backgroundColor: '#457ae5',
                    color: '#ffffff',
                    border: '1px solid #457ae5',
                  }
                : {
                    backgroundColor: 'var(--app-player-soft-bg)',
                    color: 'var(--app-muted-text)',
                    border: '1px solid var(--app-card-border)',
                  }
            }
          >
            <span>선수 상세</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('review')}
            className="flex h-12 items-center justify-center gap-1.5 rounded-xl text-[15px] font-semibold tracking-[-0.02em] transition"
            style={
              activeTab === 'review'
                ? {
                    backgroundColor: '#457ae5',
                    color: '#ffffff',
                    border: '1px solid #457ae5',
                  }
                : {
                    backgroundColor: 'var(--app-player-soft-bg)',
                    color: 'var(--app-muted-text)',
                    border: '1px solid var(--app-card-border)',
                  }
            }
          >
            <span>선수 평가</span>
            <span style={{ color: activeTab === 'review' ? '#ffffff' : '#457ae5' }}>
              {reviewCount.toLocaleString()}
            </span>
          </button>
        </div>
      </section>

      {activeTab === 'detail' ? (
        <>
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
            <div
              className="pointer-events-none absolute bottom-1 left-0 top-0 z-10 w-10"
              style={{
                background:
                  'linear-gradient(to right, var(--app-player-card-bg) 0%, var(--app-player-overlay-grad) 38%, color-mix(in srgb, var(--app-player-card-bg) 0%, transparent) 100%)',
              }}
            />
          )}

          {showRightFade && (
            <div
              className="pointer-events-none absolute bottom-1 right-0 top-0 z-10 w-10"
              style={{
                background:
                  'linear-gradient(to left, var(--app-player-card-bg) 0%, var(--app-player-overlay-grad) 38%, color-mix(in srgb, var(--app-player-card-bg) 0%, transparent) 100%)',
              }}
            />
          )}

          <div
            ref={scrollRef}
            className="overflow-x-auto select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onMouseDown={handleMouseDown}
            onWheel={handleWheel}
            style={{ cursor: 'grab', touchAction: 'pan-x pan-y' }}
          >
            <div className="flex min-w-max gap-2 whitespace-nowrap px-1 pb-1">
              {STRONG_LEVELS.map((level) => (
                <button
                  key={level}
                  data-strong-level={level}
                  type="button"
                  onClick={() => handleLevelClick(level)}
                  className={`shrink-0 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
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
          className="mt-4 flex min-h-12 items-center justify-between gap-4 rounded-lg px-4 py-2.5"
          style={{ backgroundColor: 'var(--app-player-soft-bg)' }}
        >
          <div className="flex items-center gap-1">
            <p className="app-player-title text-sm font-semibold">적응도</p>
            <p
              className="text-sm font-semibold transition-colors"
              style={{
                color: isChemistryApplied
                  ? 'var(--app-player-toggle-on)'
                  : 'var(--app-player-muted)',
              }}
            >
              {isChemistryApplied ? '적용중' : '미적용'}
            </p>
          </div>

          <button
            type="button"
            aria-label="적응도 토글"
            aria-pressed={isChemistryApplied}
            onClick={() => setIsChemistryApplied((current) => !current)}
            className="relative inline-flex h-7 w-[64px] shrink-0 items-center rounded-full p-[3px] transition-colors duration-200"
            style={{
              backgroundColor: isChemistryApplied
                ? 'var(--app-player-toggle-on)'
                : 'var(--app-player-toggle-off)',
            }}
          >
            <span
              className="block h-[22px] w-[34px] rounded-full bg-white shadow-[0_2px_8px_rgba(15,23,42,0.18)] transition-transform duration-200"
              style={{ transform: `translateX(${isChemistryApplied ? '24px' : '0px'})` }}
              aria-hidden="true"
            />
          </button>
        </div>

        <div className="mt-4 flex min-h-12 items-center justify-between rounded-lg px-4 py-2.5" style={{ backgroundColor: 'var(--app-player-soft-bg)' }}>
          <div className="flex items-center gap-1">
            <p className="app-player-title text-sm font-semibold">팀컬러</p>
            <p className="text-sm font-semibold transition-colors" style={{ color: teamColorBoost > 0 ? 'var(--app-player-toggle-on)' : 'var(--app-player-muted)' }}>
              {teamColorBoost > 0 ? '적용중' : '미적용'}
            </p>
          </div>
          <div className="relative -ml-8 -mr-4 flex self-stretch items-center justify-end gap-1 pl-8 pr-4">
            <span className="pointer-events-none text-sm font-semibold leading-none" style={{ color: teamColorBoost > 0 ? '#457ae5' : 'var(--app-player-muted)' }}>
              {teamColorBoost > 0 ? `+${teamColorBoost}` : '0'}
            </span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="pointer-events-none" style={{ color: teamColorBoost > 0 ? '#457ae5' : 'var(--app-player-muted)', flexShrink: 0 }}>
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <select
              value={teamColorBoost}
              onChange={(event) => setTeamColorBoost(Number(event.target.value))}
              className="absolute inset-0 cursor-pointer opacity-0"
            >
              <option value={0}>0</option>
              {Array.from({ length: 9 }, (_, index) => (
                <option key={index + 1} value={index + 1}>+{index + 1}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex min-h-12 items-center justify-between rounded-lg px-4 py-2.5" style={{ backgroundColor: 'var(--app-player-soft-bg)' }}>
          <p className="app-player-muted text-sm font-medium">현재 금액</p>
          <p className="app-player-title text-sm font-semibold">{currentPrice}</p>
        </div>

        {detail.skillMove != null && (
          <div className="mt-4 flex min-h-12 items-center justify-between rounded-lg px-4 py-2.5" style={{ backgroundColor: 'var(--app-player-soft-bg)' }}>
            <p className="app-player-muted text-sm font-medium">개인기</p>
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
              teamColorBoost={teamColorBoost}
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
        </>
      ) : (
        <PlayerReviewSection
          playerId={String(spid)}
          playerName={playerName}
          defaultCardLevel={strongLevel}
          aiReviewSummariesByLevel={aiReviewSummariesByLevel}
          onTotalCountChange={setReviewCount}
          initialHighlightedPostId={initialHighlightedPostId}
        />
      )}

      {isLoginRequiredOpen ? (
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            aria-label="닫기"
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.58)' }}
            onClick={() => setIsLoginRequiredOpen(false)}
          />
          <div
            className="absolute left-1/2 z-10 w-[calc(100%-2rem)] max-w-[440px] -translate-x-1/2"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
          >
            <section
              className="rounded-[28px] px-5 pb-6 pt-6 shadow-[0_20px_48px_rgba(15,23,42,0.22)]"
              style={{ backgroundColor: 'var(--app-modal-bg, #ffffff)' }}
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full" style={{ backgroundColor: 'rgba(133, 148, 170, 0.32)' }} />
              <div className="space-y-2">
                <p className="text-[18px] font-semibold tracking-[-0.02em]" style={{ color: 'var(--app-title)' }}>
                  로그인이 필요해요
                </p>
                <p className="text-sm leading-[1.55]" style={{ color: 'var(--app-body-text)' }}>
                  선수 즐겨찾기는 Google 로그인 후 이용할 수 있어요
                </p>
              </div>
              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsLoginRequiredOpen(false)
                    window.location.assign('/mypage')
                  }}
                  className="flex h-12 w-full items-center justify-center rounded-2xl px-4 text-sm font-semibold text-white"
                  style={{ backgroundColor: '#457ae5' }}
                >
                  로그인하러 가기
                </button>
                <button
                  type="button"
                  onClick={() => setIsLoginRequiredOpen(false)}
                  className="block w-full text-center text-sm font-medium"
                  style={{ color: 'var(--app-muted-text)' }}
                >
                  취소
                </button>
              </div>
            </section>
          </div>
        </div>
      ) : null}
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

function buildAiReviewSummary({
  playerName,
  abilities,
  traits,
  position,
  overall,
  strongLevel,
}: {
  playerName: string
  abilities: AbilityStat[]
  traits: Trait[]
  position: string | null
  overall: number | null
  strongLevel: number
}) {
  if (abilities.length === 0) {
    return `${strongLevel}카 기준 현재 시즌 카드 수치를 종합하면 직접 체감과 활용 포지션을 비교해볼 만한 카드예요.`
  }

  const topAbilities = abilities
    .slice()
    .sort((left, right) => right.value - left.value)
    .slice(0, 3)
  const topAbilitySummary = formatAbilitySummary(topAbilities)

  const positionGroup = getPositionGroupLabel(position)
  const playStyle = getPlayStyleLabel(position)
  const traitContext = getTraitContextSummary(traits, position)
  const gradeTone =
    overall == null
      ? '완성도가 괜찮은'
      : overall >= 130
        ? '최상위권으로 볼 수 있는'
        : overall >= 120
          ? '상위권으로 볼 수 있는'
          : overall >= 110
            ? '준수한'
            : '무난한'
  const levelTone =
    strongLevel >= 10
      ? '확실히 체감이 살아나는'
      : strongLevel >= 7
        ? '실사용 메리트가 분명한'
      : strongLevel >= 5
        ? '밸런스가 더 안정되는'
        : '기본 장점이 드러나는'
  const seed = `${playerName}|${position ?? 'NA'}|${strongLevel}|${overall ?? 'NA'}|${topAbilitySummary}`
  const templateIndex = hashReviewSeed(seed) % AI_REVIEW_TEMPLATES.length

  return AI_REVIEW_TEMPLATES[templateIndex]({
    strongLevel,
    positionGroup,
    topAbilitySummary,
    playStyle,
    traitContext,
    levelTone,
    gradeTone,
  })
}

const AI_REVIEW_TEMPLATES = [
  ({
    strongLevel,
    positionGroup,
    topAbilitySummary,
    playStyle,
    traitContext,
    levelTone,
    gradeTone,
  }: AiReviewTemplateArgs) =>
    `${strongLevel}카 기준 ${positionGroup} ${topAbilitySummary} 수치가 두드러져 ${playStyle}에서 ${levelTone} ${gradeTone} 카드예요.${traitContext}`,
  ({
    strongLevel,
    positionGroup,
    topAbilitySummary,
    playStyle,
    traitContext,
    levelTone,
    gradeTone,
  }: AiReviewTemplateArgs) =>
    `${strongLevel}카로 보면 ${positionGroup} ${topAbilitySummary} 쪽이 확실히 살아 있어 ${playStyle}에서 ${levelTone} ${gradeTone} 카드에 가깝습니다.${traitContext}`,
  ({
    strongLevel,
    positionGroup,
    topAbilitySummary,
    playStyle,
    traitContext,
    levelTone,
    gradeTone,
  }: AiReviewTemplateArgs) =>
    `${strongLevel}카 시점에서는 ${positionGroup} ${topAbilitySummary} 조합이 좋아서 ${playStyle}을 노릴 때 ${levelTone} ${gradeTone} 카드로 읽혀요.${traitContext}`,
  ({
    strongLevel,
    positionGroup,
    topAbilitySummary,
    playStyle,
    traitContext,
    levelTone,
    gradeTone,
  }: AiReviewTemplateArgs) =>
    `${strongLevel}카 기준 한줄로 정리하면, ${positionGroup} ${topAbilitySummary}가 강점이라 ${playStyle}에서 ${levelTone} ${gradeTone} 카드입니다.${traitContext}`,
  ({
    strongLevel,
    positionGroup,
    topAbilitySummary,
    playStyle,
    traitContext,
    levelTone,
    gradeTone,
  }: AiReviewTemplateArgs) =>
    `${strongLevel}카에서는 ${positionGroup} ${topAbilitySummary} 수치가 먼저 눈에 들어오고, 실제로도 ${playStyle} 구간에서 ${levelTone} ${gradeTone} 카드예요.${traitContext}`,
  ({
    strongLevel,
    positionGroup,
    topAbilitySummary,
    playStyle,
    traitContext,
    levelTone,
    gradeTone,
  }: AiReviewTemplateArgs) =>
    `${strongLevel}카만 놓고 보면 ${positionGroup} ${topAbilitySummary}가 좋아 ${playStyle}에 강점이 몰린 ${levelTone} ${gradeTone} 카드라고 볼 수 있어요.${traitContext}`,
  ({
    strongLevel,
    positionGroup,
    topAbilitySummary,
    playStyle,
    traitContext,
    levelTone,
    gradeTone,
  }: AiReviewTemplateArgs) =>
    `${strongLevel}카 평가로는 ${positionGroup} ${topAbilitySummary} 쪽 완성도가 괜찮아서 ${playStyle}에서 ${levelTone} ${gradeTone} 카드로 보입니다.${traitContext}`,
  ({
    strongLevel,
    positionGroup,
    topAbilitySummary,
    playStyle,
    traitContext,
    levelTone,
    gradeTone,
  }: AiReviewTemplateArgs) =>
    `${strongLevel}카 단계에선 ${positionGroup} ${topAbilitySummary} 수치가 받쳐줘서 ${playStyle} 체감 쪽으로 ${levelTone} ${gradeTone} 카드예요.${traitContext}`,
  ({
    strongLevel,
    positionGroup,
    topAbilitySummary,
    playStyle,
    traitContext,
    levelTone,
    gradeTone,
  }: AiReviewTemplateArgs) =>
    `${strongLevel}카 기준으로 해석하면 ${positionGroup} ${topAbilitySummary}가 핵심이고, 그래서 ${playStyle}에서 ${levelTone} ${gradeTone} 카드라는 인상이 강합니다.${traitContext}`,
  ({
    strongLevel,
    positionGroup,
    topAbilitySummary,
    playStyle,
    traitContext,
    levelTone,
    gradeTone,
  }: AiReviewTemplateArgs) =>
    `${strongLevel}카 기준 현재 수치만 봐도 ${positionGroup} ${topAbilitySummary}가 좋아 ${playStyle} 활용도 면에서 ${levelTone} ${gradeTone} 카드로 정리됩니다.${traitContext}`,
] as const

type AiReviewTemplateArgs = {
  strongLevel: number
  positionGroup: string
  topAbilitySummary: string
  playStyle: string
  traitContext: string
  levelTone: string
  gradeTone: string
}

function hashReviewSeed(value: string) {
  let hash = 0

  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }

  return hash
}

function formatAbilitySummary(labels: AbilityStat[]) {
  if (labels.length === 0) {
    return '핵심 능력치'
  }

  if (labels.length === 1) {
    return `${labels[0].name} ${labels[0].value}`
  }

  if (labels.length === 2) {
    return `${labels[0].name} ${labels[0].value}, ${labels[1].name} ${labels[1].value}`
  }

  return `${labels[0].name} ${labels[0].value}, ${labels[1].name} ${labels[1].value}, ${labels[2].name} ${labels[2].value}`
}

const POSITIVE_TRAIT_HINTS = [
  { keyword: '예리한 감아차기', text: ' 특성상 감아차기 각이 열릴 때 마무리 기대치도 높은 편입니다.' },
  { keyword: '스피드 드리블러', text: ' 특성 덕분에 치고 나가는 드리블 체감도 함께 기대해볼 만합니다.' },
  { keyword: '파워 헤더', text: ' 특성상 크로스 상황이나 세트피스에서 존재감이 살아날 수 있어요.' },
  { keyword: '플레어', text: ' 플레어 성향이 있어 좁은 구간에서 예측 못한 터치가 장점으로 이어질 수 있습니다.' },
  { keyword: '롱 패서', text: ' 롱 패서 특성까지 있어 전개 길게 찔러주는 장면도 잘 어울립니다.' },
  { keyword: '얼리 크로스', text: ' 얼리 크로스 성향까지 겹치면 빠른 타이밍의 측면 전개도 잘 받습니다.' },
  { keyword: '긴 패스 선호', text: ' 긴 패스 선호 특성 덕분에 시원하게 방향 전환하는 장면도 기대해볼 만해요.' },
  { keyword: '테크니컬 드리블러', text: ' 테크니컬 드리블러 특성 덕분에 볼 간수와 탈압박 체감도 보완됩니다.' },
  { keyword: '중거리 슛 선호', text: ' 중거리 슛 성향이 있어 박스 앞 선택지까지 넓게 가져갈 수 있습니다.' },
  { keyword: '세트피스 스페셜리스트', text: ' 세트피스 상황에서 한 방 옵션이 있다는 점도 분명한 장점이에요.' },
]

const CAUTION_TRAIT_HINTS = [
  { keyword: '얼리 크로스', positions: ['ST', 'CF'], text: ' 다만 중앙 침투 위주로만 쓰면 얼리 크로스 성향은 덜 체감될 수 있어요.' },
  { keyword: '롱 스로어', positions: ['ST', 'CF', 'CAM', 'CM'], text: ' 다만 롱 스로어 특성은 주 포지션 활용에선 체감 포인트가 제한적일 수 있습니다.' },
  { keyword: 'GK 멀리 던지기', positions: ['ST', 'CF', 'CAM', 'CM', 'CB'], text: ' 다만 이 특성은 현재 포지션 활용과 직접 연결되진 않아 체감 차이는 작을 수 있어요.' },
]

function getTraitContextSummary(traits: Trait[], position: string | null) {
  if (traits.length === 0) {
    return ''
  }

  const traitNames = traits.map((trait) => trait.name)
  const upperPosition = position?.toUpperCase() ?? null
  const positiveHint = POSITIVE_TRAIT_HINTS.find((hint) =>
    traitNames.some((traitName) => traitName.includes(hint.keyword)),
  )
  const cautionHint = CAUTION_TRAIT_HINTS.find(
    (hint) =>
      traitNames.some((traitName) => traitName.includes(hint.keyword)) &&
      (!!upperPosition && hint.positions.includes(upperPosition)),
  )

  if (positiveHint && cautionHint) {
    return `${positiveHint.text}${cautionHint.text}`
  }

  if (positiveHint) {
    return positiveHint.text
  }

  if (cautionHint) {
    return cautionHint.text
  }

  const highlightedTraits = traitNames.slice(0, 2).join(', ')
  return ` ${highlightedTraits} 특성도 함께 달려 있어 실제 체감 방향을 잡을 때 참고할 만합니다.`
}

function getPositionGroupLabel(position: string | null) {
  const upper = position?.toUpperCase()

  if (upper && FORWARD_POSITIONS.has(upper)) {
    return '공격수 자원으로 보면'
  }

  if (upper && MIDFIELDER_POSITIONS.has(upper)) {
    return '미드필더 자원으로 보면'
  }

  if (upper === 'GK') {
    return '골키퍼 자원으로 보면'
  }

  if (upper && DEFENDER_POSITIONS.has(upper)) {
    return '수비수 자원으로 보면'
  }

  return '포지션 수치만 놓고 보면'
}

function getPlayStyleLabel(position: string | null) {
  const upper = position?.toUpperCase()

  if (upper && FORWARD_POSITIONS.has(upper)) {
    return '침투와 마무리'
  }

  if (upper && MIDFIELDER_POSITIONS.has(upper)) {
    return '연계와 전진 전개'
  }

  if (upper === 'GK') {
    return '선방과 안정감'
  }

  if (upper && DEFENDER_POSITIONS.has(upper)) {
    return '대인 수비와 커버'
  }

  return '실전 활용'
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
  teamColorBoost,
}: {
  stat: AbilityStat
  abilityBoost: number
  chemistryBoost: number
  teamColorBoost: number
}) {
  const color = getAbilityValueColor(stat.value)
  const showAbilityBoost = abilityBoost > 0
  const showChemistryBoost = chemistryBoost > 0
  const showTeamColorBoost = teamColorBoost > 0

  return (
    <div className="rounded-lg px-4 py-3" style={{ backgroundColor: 'var(--app-player-soft-bg)' }}>
      <p className="app-player-muted text-xs font-medium">{stat.name}</p>
      <div className="mt-1 flex items-end gap-1.5">
        <span className="block text-[18px] font-bold leading-none tracking-[-0.02em]" style={{ color }}>
          {stat.value}
        </span>
        {(showAbilityBoost || showChemistryBoost || showTeamColorBoost) && (
          <span className="flex items-end gap-1 pb-0.5 text-[12px] leading-none tracking-[-0.01em]">
            {showAbilityBoost && (
              <span className="font-semibold" style={{ color: 'var(--app-player-boost)' }}>
                +{abilityBoost}
              </span>
            )}
            {showAbilityBoost && showChemistryBoost && (
              <span aria-hidden="true" className="font-medium" style={{ color: 'color-mix(in srgb, var(--app-player-muted) 34%, transparent)' }}>|</span>
            )}
            {showChemistryBoost && (
              <span className="font-semibold" style={{ color: 'var(--app-player-boost)' }}>
                +{chemistryBoost}
              </span>
            )}
            {(showAbilityBoost || showChemistryBoost) && showTeamColorBoost && (
              <span aria-hidden="true" className="font-medium" style={{ color: 'color-mix(in srgb, var(--app-player-muted) 34%, transparent)' }}>|</span>
            )}
            {showTeamColorBoost && (
              <span className="font-semibold" style={{ color: 'var(--app-player-boost)' }}>
                +{teamColorBoost}
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
