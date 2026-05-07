'use client'

import { useEffect, useEffectEvent, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft } from '@phosphor-icons/react'
import LoadingDots from '@/components/ui/LoadingDots'
import { formatPriceWithKoreanUnits } from '@/features/player-search/player-detail'
import FormationPitch, { type FormationPlayer } from './FormationPitch'

function formatFormation(f: string) {
  return f.replace(/(\d)(?=\d)/g, '$1-')
}

function calcSquadStats(players: FormationPlayer[]) {
  const totalPay = players.reduce((sum, p) => sum + (p.pay ?? 0), 0)
  const totalPriceNum = players.reduce((sum, p) => {
    if (!p.price) return sum
    return sum + Number(p.price.replace(/[^\d]/g, ''))
  }, 0)
  return { totalPay, totalPriceNum }
}

type FormationResponse = {
  formation: string
  matchDate: string
  adaptationBoost: number
  teamColorNames: string[]
  appliedBoostLabels: string[]
  isAutoApplied: boolean
  players: FormationPlayer[]
}

export default function FormationPage() {
  const { ouid } = useParams<{ ouid: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const formation = searchParams.get('formation') ?? ''
  const nexonSn = searchParams.get('nexonSn') ?? ''
  const nickname = searchParams.get('nickname') ?? ''
  const mode = searchParams.get('mode') ?? 'official1on1'
  const teamColorLabels = (searchParams.get('teamColors') ?? '')
    .split('|')
    .map((value) => value.trim())
    .filter(Boolean)

  const [data, setData] = useState<FormationResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const resetRequestState = useEffectEvent(() => {
    setLoading(true)
    setError(false)
  })

  useEffect(() => {
    if (!ouid) return

    resetRequestState()

    const formationUrl =
      `/api/nexon/matches/formation?ouid=${encodeURIComponent(ouid)}` +
      (nexonSn ? `&nexonSn=${encodeURIComponent(nexonSn)}` : '') +
      (nickname ? `&nickname=${encodeURIComponent(nickname)}` : '') +
      `&mode=${encodeURIComponent(mode)}`

    fetch(formationUrl)
      .then((r) => {
        if (!r.ok) throw new Error('fetch failed')
        return r.json() as Promise<FormationResponse>
      })
      .then((json) => setData(json))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [nickname, nexonSn, ouid])

  return (
    <div className="min-h-dvh pt-5 pb-8">
      {/* 헤더 */}
      <div className="mb-4 flex h-6 items-center">
        <button
          type="button"
          onClick={() => {
            if (!nickname) {
              router.back()
              return
            }

            router.push(`/matches?nickname=${encodeURIComponent(nickname)}&mode=${encodeURIComponent(mode)}`)
          }}
          className="app-theme-title inline-flex items-center gap-1.5 text-[18px] font-bold tracking-[-0.02em]"
        >
          <ArrowLeft size={18} weight="bold" />
          <span>포메이션</span>
        </button>
      </div>

      {loading && (
        <div className="py-16">
          <LoadingDots label="포메이션을 불러오는 중이에요" />
        </div>
      )}

      {!loading && error && (
        <div className="py-16 text-center">
          <p className="app-theme-muted text-sm">경기 데이터를 불러올 수 없습니다.</p>
          <p className="app-theme-muted mt-1 text-xs">{mode === 'manager' ? '최근 감독모드 경기 기록이 없거나 오류가 발생했습니다.' : '최근 1:1 공식경기 기록이 없거나 오류가 발생했습니다.'}</p>
        </div>
      )}

      {!loading && data && (
        <>
          <section className="app-theme-card mb-4 rounded-lg border px-4 py-4">
            <div>
              <p className="app-theme-title text-sm font-semibold">오버롤 계산 기준</p>
              <p className="app-theme-muted mt-1 text-xs">
                기본 오버롤에 강화, 강화팀컬러, 팀컬러, 적응도를 합산해 표시합니다.
              </p>
            </div>

            <div className="mt-4">
              <div>
                <p className="app-theme-title text-sm font-semibold">적용 캐미</p>
                <p className="app-theme-muted mt-1 text-xs">
                  {data.appliedBoostLabels.length > 0
                    ? data.appliedBoostLabels.join(' · ')
                    : teamColorLabels.length > 0
                      ? teamColorLabels.join(' · ')
                      : '자동 적용된 캐미 정보가 없습니다.'}
                </p>
                {(data.teamColorNames.length > 0 || teamColorLabels.length > 0) && (
                  <p className="app-theme-muted mt-1 text-xs">
                    적용 중 팀컬러: {(data.teamColorNames.length > 0 ? data.teamColorNames : teamColorLabels).join(' · ')}
                  </p>
                )}
              </div>
            </div>

          </section>

          {(() => {
            const { totalPay, totalPriceNum } = calcSquadStats(data.players)
            const formationLabel = data.formation || formatFormation(formation)
            const totalPriceLabel = totalPriceNum > 0 ? `${formatPriceWithKoreanUnits(String(totalPriceNum))} BP` : '-'
            const divider = <span className="app-theme-muted mx-2 text-xs opacity-30">|</span>
            return (
              <section className="app-theme-card mb-4 rounded-lg border px-4 py-3">
                <div className="flex items-center text-xs">
                  <span className="app-theme-title font-medium">급여</span>
                  <span className="ml-1.5 font-semibold" style={{ color: 'var(--app-accent-blue)' }}>{totalPay}</span>
                  <span className="app-theme-title font-medium">/300</span>
                  {divider}
                  <span className="app-theme-title font-medium">포메이션</span>
                  <span className="ml-1.5 font-semibold" style={{ color: 'var(--app-accent-blue)' }}>{formationLabel}</span>
                  {divider}
                  <span className="app-theme-title font-medium">BP</span>
                  <span className="ml-1 font-semibold" style={{ color: 'var(--app-accent-blue)' }}>{totalPriceNum > 0 ? formatPriceWithKoreanUnits(String(totalPriceNum)) : '-'}</span>
                </div>
              </section>
            )
          })()}

          <FormationPitch
            formation={data.formation || formation}
            players={data.players}
            adaptationBoost={data.adaptationBoost}
          />
        </>
      )}
    </div>
  )
}
