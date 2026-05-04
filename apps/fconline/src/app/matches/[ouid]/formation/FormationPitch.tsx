'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import { getPlayerImageCandidates } from '@/features/player-search/player-image'

export type FormationPlayer = {
  spId: number
  spPosition: number
  positionLabel: string
  enhancement: number
  playerName: string
  seasonImg: string | null
  ovr: number | null
}

// [x%, y%] — x=0 left, y=0 top. GK near bottom, ST near top.
const POSITION_COORDS: Record<number, [number, number]> = {
  0:  [50, 87], // GK
  1:  [50, 77], // SW
  2:  [84, 68], // RWB
  3:  [79, 75], // RB
  4:  [63, 75], // RCB
  5:  [50, 75], // CB
  6:  [37, 75], // LCB
  7:  [21, 75], // LB
  8:  [16, 68], // LWB
  9:  [67, 61], // RDM
  10: [50, 61], // CDM
  11: [33, 61], // LDM
  12: [84, 48], // RM
  13: [65, 48], // RCM
  14: [50, 48], // CM
  15: [35, 48], // LCM
  16: [16, 48], // LM
  17: [70, 36], // RAM
  18: [50, 36], // CAM
  19: [30, 36], // LAM
  20: [73, 26], // RF
  21: [50, 26], // CF
  22: [27, 26], // LF
  23: [87, 25], // RW
  24: [64, 16], // RS
  25: [50, 16], // ST
  26: [36, 16], // LS
  27: [13, 25], // LW
}

function PlayerCard({ player }: { player: FormationPlayer }) {
  const [x, y] = POSITION_COORDS[player.spPosition] ?? [50, 50]
  const candidates = useMemo(() => getPlayerImageCandidates(player.spId), [player.spId])
  const [srcIdx, setSrcIdx] = useState(0)

  return (
    <div
      className="absolute flex flex-col items-center"
      style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
    >
      <div className="flex items-center">
        {/* OVR + 포지션 (왼쪽) */}
        <div className="mr-[3px] flex flex-col items-end">
          {player.ovr !== null && (
            <span
              className="text-[9px] font-extrabold leading-none text-white"
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
            >
              {player.ovr}
            </span>
          )}
          <span
            className="text-[8px] font-semibold leading-none text-white/90"
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
          >
            {player.positionLabel}
          </span>
        </div>

        {/* 선수 이미지 */}
        <div className="relative h-10 w-10 overflow-hidden rounded-full border border-white/30 bg-black/20">
          <Image
            src={candidates[srcIdx] ?? '/player-fallback.svg'}
            alt={player.playerName}
            fill
            className="object-cover object-top"
            unoptimized
            onError={() => setSrcIdx((i) => Math.min(i + 1, candidates.length - 1))}
          />
        </div>

        {/* 강화단계 (오른쪽) */}
        {player.enhancement > 0 && (
          <span
            className="ml-[3px] text-[9px] font-extrabold leading-none text-yellow-300"
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
          >
            +{player.enhancement}
          </span>
        )}
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
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
        >
          {player.playerName}
        </span>
      </div>
    </div>
  )
}

export default function FormationPitch({
  players,
}: {
  formation: string
  players: FormationPlayer[]
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
        <PlayerCard key={`${player.spId}-${player.spPosition}`} player={player} />
      ))}
    </div>
  )
}
