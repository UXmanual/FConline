import type { Metadata } from 'next'
import MatchesPageClient from './MatchesPageClient'

export const metadata: Metadata = {
  description: 'FC온라인 구단주명으로 1:1 공식경기·감독모드·볼타 전적과 경기 분석을 확인하세요. 팀컬러, 포메이션, 랭킹 정보를 한눈에 볼 수 있습니다.',
  keywords: ['FC온라인 경기분석', '피파 경기분석', '구단주 검색', 'FC온라인 전적', '피파 전적', '감독모드 분석', '볼타 분석', '공식경기 분석', '피파 랭킹', 'FC온라인 랭킹', '팀컬러 메타', '포메이션 메타'],
}

interface Props {
  searchParams: Promise<{ nickname?: string; matchId?: string; mode?: string }>
}

export default async function MatchesPage({ searchParams }: Props) {
  const { nickname, matchId, mode } = await searchParams

  return (
    <MatchesPageClient
      initialNickname={nickname?.trim() ?? ''}
      initialMatchId={matchId?.trim() ?? ''}
      initialSearchMode={mode?.trim() ?? ''}
    />
  )
}
