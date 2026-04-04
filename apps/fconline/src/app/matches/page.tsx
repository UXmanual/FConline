import MatchesPageClient from './MatchesPageClient'

interface Props {
  searchParams: Promise<{ nickname?: string }>
}

export default async function MatchesPage({ searchParams }: Props) {
  const { nickname } = await searchParams

  return <MatchesPageClient initialNickname={nickname?.trim() ?? ''} />
}
