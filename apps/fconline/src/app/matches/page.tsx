import MatchesPageClient from './MatchesPageClient'

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
