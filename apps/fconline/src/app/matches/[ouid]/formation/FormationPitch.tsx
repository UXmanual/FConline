'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import { getStrongPoint } from '@/features/player-search/player-detail'
import { getPlayerImageCandidates } from '@/features/player-search/player-image'

export type FormationPlayer = {
  spId: number | null
  spPosition: number
  positionLabel: string
  enhancement: number
  pay: number | null
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
  13: [71, 50], // RCM
  14: [50, 50], // CM
  15: [29, 50], // LCM
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
}: {
  player: FormationPlayer
  adaptationBoost: number
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
  const verticalTranslate =
    y <= 18 ? 'translateY(0)' : y >= 82 ? 'translateY(-100%)' : 'translateY(-50%)'
  const horizontalTranslate =
    x <= 12 ? 'translateX(0)' : x >= 88 ? 'translateX(-100%)' : 'translateX(-50%)'

  return (
    <div
      className={`absolute flex max-w-[72px] flex-col ${horizontalClass}`}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `${horizontalTranslate} ${verticalTranslate}`,
      }}
    >
      <div className="flex items-center">
        {/* OVR + 포지션 (왼쪽) */}
        <div className="mr-[3px] flex flex-col items-end">
          {displayedOverall !== null && (
            <span
              className="text-[9px] font-extrabold leading-none text-white"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.85), 0 0 8px rgba(0,0,0,0.5)' }}
            >
              {displayedOverall}
            </span>
          )}
          <span
            className="text-[8px] font-semibold leading-none text-white/90"
            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.85), 0 0 8px rgba(0,0,0,0.5)' }}
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
        <div className="ml-[3px] flex flex-col items-start gap-[2px]">
          {player.pay != null && (
            <span
              className="text-[8px] font-semibold leading-none text-white/80"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.85), 0 0 8px rgba(0,0,0,0.5)' }}
            >
              {player.pay.toLocaleString()}
            </span>
          )}
          {player.enhancement > 0 && (
            <span
              className="text-[9px] font-extrabold leading-none text-yellow-300"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.85), 0 0 8px rgba(0,0,0,0.5)' }}
            >
              +{player.enhancement}
            </span>
          )}
        </div>
      </div>

      {/* 시즌엠블럼 + 선수명 */}
      <div className="mt-[3px] flex max-w-[72px] items-center gap-[2px]">
        {player.seasonImg && (
          <Image
            src={player.seasonImg}
            alt=""
            width={11}
            height={11}
            className="h-[11px] w-[11px] shrink-0 object-contain"
            unoptimized
          />
        )}
        <span
          className="truncate text-[9px] font-semibold leading-none text-white"
          style={{ textShadow: '0 1px 4px rgba(0,0,0,0.85), 0 0 8px rgba(0,0,0,0.5)' }}
        >
          {player.playerName}
        </span>
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
        />
      ))}
    </div>
  )
}
