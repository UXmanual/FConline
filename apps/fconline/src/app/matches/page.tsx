import MatchesPageClient from './MatchesPageClient'

interface Props {
  searchParams: Promise<{ nickname?: string; matchId?: string }>
}

export default async function MatchesPage({ searchParams }: Props) {
  const { nickname, matchId } = await searchParams

  return <MatchesPageClient initialNickname={nickname?.trim() ?? ''} initialMatchId={matchId?.trim() ?? ''} />
}
