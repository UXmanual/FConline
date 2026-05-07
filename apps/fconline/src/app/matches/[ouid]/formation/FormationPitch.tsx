'use client'

import Image from 'next/image'
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { getStrongPoint, formatPriceWithKoreanUnits } from '@/features/player-search/player-detail'
import { getPlayerImageCandidates } from '@/features/player-search/player-image'

export type FormationPlayer = {
  spId: number | null
  spPosition: number
  positionLabel: string
  enhancement: number
  pay: number | null
  price: string | null
  playerName: string | null
  seasonImg: string | null
  overallBase: number | null
  enhancementChemBoost: number
  teamColorBoost: number
}

// [x%, y%] — x=0 left, y=0 top. GK near bottom, ST near top.
const POSITION_COORDS: Record<number, [number, number]> = {
  0:  [50, 89], // GK
  1:  [50, 80], // SW
  2:  [91, 71], // RWB
  3:  [87, 78], // RB
  4:  [66, 78], // RCB
  5:  [50, 78], // CB
  6:  [34, 78], // LCB
  7:  [13, 78], // LB
  8:  [9,  71], // LWB
  9:  [73, 64], // RDM
  10: [50, 64], // CDM
  11: [27, 64], // LDM
  12: [93, 50], // RM
  13: [65, 50], // RCM
  14: [50, 50], // CM
  15: [35, 50], // LCM
  16: [7,  50], // LM
  17: [79, 37], // RAM
  18: [50, 37], // CAM
  19: [21, 37], // LAM
  20: [76, 26], // RF
  21: [50, 26], // CF
  22: [24, 26], // LF
  23: [91, 23], // RW
  24: [67, 14], // RS
  25: [50, 14], // ST
  26: [33, 14], // LS
  27: [9,  23], // LW
}

function getPositionColor(spPosition: number): string {
  if (spPosition === 0) return '#f5c842'          // GK — 노랑
  if (spPosition <= 8) return '#4fa3f7'           // 수비 — 파랑
  if (spPosition <= 19) return '#4fc87a'          // 미드필더 (DM/CM/AM 포함) — 초록
  return '#f76464'                                 // 공격 — 빨강
}

function PayHexBadge({ value }: { value: number }) {
  return (
    <svg width="18" height="20" viewBox="0 0 18 20" fill="none">
      <polygon
        points="9,1 17,5.5 17,14.5 9,19 1,14.5 1,5.5"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="1.2"
        fill="none"
      />
      <text
        x="9"
        y="10"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="8"
        fontWeight="600"
        fill="rgba(255,255,255,0.85)"
      >
        {value.toLocaleString()}
      </text>
    </svg>
  )
}

function getEnhancementStyle(level: number): React.CSSProperties {
  const base: React.CSSProperties = {
    border: '1px solid',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '2px',
    minWidth: '16px',
    height: '14px',
    fontSize: '9px',
    fontWeight: 800,
    lineHeight: '14px',
    padding: '0 3px',
    boxSizing: 'border-box',
  }
  if (level <= 1) {
    return { ...base, color: '#c5c8c9', background: 'linear-gradient(140deg, #51545a 0%, #42464d 100%)', borderColor: '#393a3c', borderTopColor: '#62676d', borderLeftColor: '#62676d', borderRightColor: '#393a3c' }
  }
  if (level <= 4) {
    return { ...base, color: '#7e3f27', background: 'linear-gradient(140deg, #de946b 0%, #ad5f42 100%)', borderColor: '#864229', borderTopColor: '#e4b7a2', borderLeftColor: '#e4b7a2', borderRightColor: '#864229' }
  }
  if (level <= 7) {
    return { ...base, color: '#4e545e', background: 'linear-gradient(140deg, rgb(216,217,220) 0%, rgb(184,189,202) 100%)', borderColor: '#a5a8ae', borderTopColor: '#d8dadc', borderLeftColor: '#d8dadc', borderRightColor: '#a9aaae' }
  }
  if (level <= 10) {
    return { ...base, color: '#695100', background: 'linear-gradient(140deg, #f9dd62 0%, #dca908 100%)', borderColor: '#cda000', borderTopColor: '#e9d36c', borderLeftColor: '#e9d36c', borderRightColor: '#cda000' }
  }
  // 11-13: 플래티넘 (배경 이미지)
  return { ...base, color: '#2d2b43', backgroundImage: 'url(https://ssl.nexon.com/s2/game/fc/online/obt/datacenter/bg_plt.png)', backgroundRepeat: 'no-repeat', backgroundPosition: '0 0', backgroundSize: '100% 100%', borderColor: '#5274c0', borderTopColor: '#bdc5e5', borderLeftColor: '#607dc4', borderRightColor: '#5274c0' }
}

function getDisplayedOverall(
  player: FormationPlayer,
  adaptationBoost: number,
) {
  if (player.overallBase == null) {
    return null
  }

  const enhancementLevel = player.enhancement > 0 ? player.enhancement : 1
  const cardOverall =
    player.overallBase - getStrongPoint(1) + getStrongPoint(enhancementLevel)

  return cardOverall + player.enhancementChemBoost + adaptationBoost + player.teamColorBoost
}

function PlayerCard({
  player,
  adaptationBoost,
  cardRef,
  extraDy,
}: {
  player: FormationPlayer
  adaptationBoost: number
  cardRef?: (el: HTMLDivElement | null) => void
  extraDy: number
}) {
  const [x, y] = POSITION_COORDS[player.spPosition] ?? [50, 50]
  const candidates = useMemo(
    () => (player.spId != null ? getPlayerImageCandidates(player.spId) : []),
    [player.spId],
  )
  const [srcIdx, setSrcIdx] = useState(0)
  const displayedOverall = getDisplayedOverall(player, adaptationBoost)
  const horizontalClass =
    x <= 12 ? 'items-start' : x >= 88 ? 'items-end' : 'items-center'
  const xOff = x <= 12 ? '0%' : x >= 88 ? '-100%' : '-50%'
  const yOff = y <= 18 ? '0%' : y >= 82 ? '-100%' : '-50%'

  return (
    <div
      ref={cardRef}
      className={`absolute flex flex-col ${horizontalClass}`}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(${xOff}, calc(${yOff} + ${extraDy}px))`,
      }}
    >
      <div className="flex items-center">
        {/* OVR + 포지션 (왼쪽) */}
        <div className="mr-[3px] flex flex-col items-center gap-[5px]">
          {displayedOverall !== null && (
            <span
              className="text-[12px] font-extrabold leading-none text-white"
              style={{ textShadow: '0 0 6px rgba(0,0,0,0.6), 0 0 12px rgba(0,0,0,0.4)' }}
            >
              {displayedOverall}
            </span>
          )}
          <span
            className="text-[9px] font-semibold leading-none"
            style={{
              color: getPositionColor(player.spPosition),
              textShadow: '0 0 6px rgba(0,0,0,0.6), 0 0 12px rgba(0,0,0,0.4)',
            }}
          >
            {player.positionLabel}
          </span>
        </div>

        {/* 선수 이미지 */}
        <div className="relative h-10 w-10 overflow-hidden">
          <Image
            src={candidates[srcIdx] ?? '/player-fallback.svg'}
            alt={player.playerName ?? ''}
            fill
            className="object-contain"
            unoptimized
            onError={() => setSrcIdx((i) => Math.min(i + 1, candidates.length - 1))}
          />
        </div>

        {/* 급여 + 강화단계 (오른쪽) */}
        <div className="ml-[3px] flex flex-col items-center gap-[3px]">
          {player.pay != null && <PayHexBadge value={player.pay} />}
          {player.enhancement > 0 && (
            <span style={getEnhancementStyle(player.enhancement)}>
              {player.enhancement}
            </span>
          )}
        </div>
      </div>

      {/* 시즌엠블럼 + 선수명 + 시세 */}
      <div className="mt-[5px] flex flex-col items-center gap-[4px]">
        <div className="flex items-center gap-[3px]">
          {player.seasonImg && (
            <Image
              src={player.seasonImg}
              alt=""
              width={14}
              height={14}
              className="h-[14px] w-[14px] shrink-0 object-contain"
              unoptimized
            />
          )}
          <span
            className="whitespace-nowrap text-[12px] font-semibold leading-[14px] text-white"
            style={{ textShadow: '0 0 6px rgba(0,0,0,0.6), 0 0 12px rgba(0,0,0,0.4)' }}
          >
            {player.playerName}
          </span>
        </div>
        {player.price && (
          <span
            className="whitespace-nowrap text-[9px] font-medium leading-none text-white/70"
            style={{ textShadow: '0 0 6px rgba(0,0,0,0.6), 0 0 12px rgba(0,0,0,0.4)' }}
          >
            {formatPriceWithKoreanUnits(player.price)} BP
          </span>
        )}
      </div>
    </div>
  )
}

export default function FormationPitch({
  players,
  adaptationBoost,
}: {
  formation: string
  players: FormationPlayer[]
  adaptationBoost: number
}) {
  const cardEls = useRef<Map<number, HTMLDivElement>>(new Map())
  const [extraDys, setExtraDys] = useState<Map<number, number>>(new Map())

  useLayoutEffect(() => {
    // POSITION_COORDS의 y값이 같은 포지션끼리 같은 row로 묶어 대칭 유지
    const posRects = new Map<number, DOMRect>()
    for (const player of players) {
      const el = cardEls.current.get(player.spPosition)
      if (el) posRects.set(player.spPosition, el.getBoundingClientRect())
    }
    if (posRects.size === 0) return

    // rowId: POSITION_COORDS의 y값 (같은 y = 같은 라인)
    const rowId = (pos: number) => POSITION_COORDS[pos]?.[1] ?? 50

    // row별로 포지션 묶기
    const rowMap = new Map<number, number[]>()
    for (const pos of posRects.keys()) {
      const id = rowId(pos)
      if (!rowMap.has(id)) rowMap.set(id, [])
      rowMap.get(id)!.push(pos)
    }

    // row별 bounding box (세로만 사용 — 좌우 대칭이므로 수직 이동만)
    type RowBox = { id: number; top: number; bottom: number }
    const rows: RowBox[] = []
    for (const [id, positions] of rowMap) {
      let top = Infinity, bottom = -Infinity
      for (const pos of positions) {
        const r = posRects.get(pos)!
        if (r.top < top) top = r.top
        if (r.bottom > bottom) bottom = r.bottom
      }
      rows.push({ id, top, bottom })
    }
    rows.sort((a, b) => a.top - b.top) // 위→아래 정렬

    // row 단위 수직 겹침 해소 (같은 라인은 동일 offset 적용)
    const rowDy = new Map<number, number>(rows.map((r) => [r.id, 0]))
    const GAP = 3

    for (let pass = 0; pass < 5; pass++) {
      for (let i = 0; i < rows.length; i++) {
        for (let j = i + 1; j < rows.length; j++) {
          const a = rows[i], b = rows[j]
          const aOff = rowDy.get(a.id)!
          const bOff = rowDy.get(b.id)!
          const aT = a.top + aOff, aB = a.bottom + aOff
          const bT = b.top + bOff, bB = b.bottom + bOff

          if (aT < bB && aB > bT) {
            const overlap = Math.min(aB, bB) - Math.max(aT, bT) + GAP
            const shift = overlap / 2
            if (aT <= bT) {
              rowDy.set(a.id, aOff - shift)
              rowDy.set(b.id, bOff + shift)
            } else {
              rowDy.set(a.id, aOff + shift)
              rowDy.set(b.id, bOff - shift)
            }
          }
        }
      }
    }

    // row offset을 각 포지션에 그대로 적용
    const newDys = new Map<number, number>()
    for (const [id, positions] of rowMap) {
      const dy = rowDy.get(id) ?? 0
      for (const pos of positions) newDys.set(pos, dy)
    }

    const hasChange = [...newDys.values()].some((v) => Math.abs(v) > 0.5)
    if (hasChange) setExtraDys(newDys)
  }, [players])

  return (
    <div className="relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: '10/16' }}>
      <Image
        src="/images/ground.png"
        alt="경기장"
        fill
        className="object-cover"
        priority
        unoptimized
      />
      {players.map((player) => (
        <PlayerCard
          key={`${player.spId}-${player.spPosition}`}
          player={player}
          adaptationBoost={adaptationBoost}
          cardRef={(el) => {
            if (el) cardEls.current.set(player.spPosition, el)
            else cardEls.current.delete(player.spPosition)
          }}
          extraDy={extraDys.get(player.spPosition) ?? 0}
        />
      ))}
    </div>
  )
}
