'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft } from '@phosphor-icons/react'
import LoadingDots from '@/components/ui/LoadingDots'
import FormationPitch, { type FormationPlayer } from './FormationPitch'

type FormationResponse = {
  formation: string
  matchDate: string
  players: FormationPlayer[]
}

export default function FormationPage() {
  const { ouid } = useParams<{ ouid: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const formation = searchParams.get('formation') ?? ''

  const [data, setData] = useState<FormationResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!ouid) return
    setLoading(true)
    setError(false)

    fetch(`/api/nexon/matches/formation?ouid=${ouid}`)
      .then((r) => {
        if (!r.ok) throw new Error('fetch failed')
        return r.json() as Promise<FormationResponse>
      })
      .then((json) => setData(json))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [ouid])

  return (
    <div className="min-h-dvh pt-5 pb-8">
      {/* 헤더 */}
      <div className="mb-4 flex h-6 items-center">
        <button
          type="button"
          onClick={() => router.back()}
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
          <p className="app-theme-muted mt-1 text-xs">최근 1:1 공식경기 기록이 없거나 오류가 발생했습니다.</p>
        </div>
      )}

      {!loading && data && (
        <FormationPitch formation={data.formation || formation} players={data.players} />
      )}
    </div>
  )
}
