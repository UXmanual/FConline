import { useEffect, useRef } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTheme } from '@/hooks/useTheme'
import { API_BASE } from '@/constants/api'
import { Text } from '@/components/Themed'

type SearchMode = 'official1on1' | 'voltaLive' | 'manager'

function normalizeCandidateDataByMode(
  raw: Record<string, unknown>,
  mode: string | undefined,
) {
  const normalized = { ...raw }
  const resolvedMode = (mode ?? 'official1on1') as SearchMode

  if (resolvedMode === 'official1on1') {
    normalized.officialRank ??= raw.rank ?? null
    normalized.officialRankPoint ??= raw.rankPoint ?? raw.elo ?? null
    normalized.officialWinRate ??= raw.winRate ?? null
    normalized.officialWins ??= raw.wins ?? null
    normalized.officialDraws ??= raw.draws ?? null
    normalized.officialLosses ??= raw.losses ?? null
    normalized.officialFormation ??= raw.formation ?? null
    normalized.officialRankIconUrl ??= raw.rankIconUrl ?? null
    normalized.officialTeamColors ??= raw.teamColors ?? []
  } else if (resolvedMode === 'manager') {
    normalized.managerRank ??= raw.rank ?? null
    normalized.managerRankPoint ??= raw.rankPoint ?? raw.elo ?? null
    normalized.managerWinRate ??= raw.winRate ?? null
    normalized.managerWins ??= raw.wins ?? null
    normalized.managerDraws ??= raw.draws ?? null
    normalized.managerLosses ??= raw.losses ?? null
    normalized.managerFormation ??= raw.formation ?? null
    normalized.managerRankIconUrl ??= raw.rankIconUrl ?? null
    normalized.managerTeamColors ??= raw.teamColors ?? []
  }

  return normalized
}

function mergeCandidateData(
  seed: Record<string, unknown>,
  exact: Record<string, unknown>,
) {
  const merged: Record<string, unknown> = { ...seed, ...exact }

  for (const [key, value] of Object.entries(seed)) {
    if (merged[key] == null && value != null) {
      merged[key] = value
    }
  }

  return merged
}

export default function LookupScreen() {
  const { nickname, mode, candidateData } = useLocalSearchParams<{
    nickname: string
    mode: string
    candidateData: string
  }>()
  const router = useRouter()
  const { colors } = useTheme()
  const didResolve = useRef(false)

  useEffect(() => {
    if (!nickname || didResolve.current) return
    didResolve.current = true

    const resolve = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/nexon/matches/search?nickname=${encodeURIComponent(nickname.trim())}`,
        )
        const data = await res.json().catch(() => null)
        let exact = data?.exactMatch ?? null

        if (exact && !exact.ouid) {
          const userRes = await fetch(
            `${API_BASE}/api/nexon/matches/user?nickname=${encodeURIComponent(nickname.trim())}`,
          )
          if (userRes.ok) {
            const userData = await userRes.json().catch(() => null)
            const resolvedOuid = userData?.ouid ?? null
            if (resolvedOuid) exact = { ...exact, ouid: resolvedOuid }
          }
        }

        if (exact?.ouid) {
          const parsedCandidateData = candidateData
            ? normalizeCandidateDataByMode(JSON.parse(candidateData), mode)
            : null
          const merged = JSON.stringify(
            parsedCandidateData
              ? mergeCandidateData(parsedCandidateData, exact)
              : exact,
          )
          router.replace({
            pathname: '/(tabs)/matches/[ouid]',
            params: { ouid: exact.ouid, mode: mode ?? 'official1on1', candidateData: merged },
          } as any)
        } else {
          router.back()
        }
      } catch {
        router.back()
      }
    }

    void resolve()
  }, [nickname])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.pageBg }} edges={['top']}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 12 }}>
        <View style={{ minHeight: 32, justifyContent: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.title, letterSpacing: -0.4 }}>
            어떤 경기 기록을 찾아볼까요?
          </Text>
        </View>
        <View style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          backgroundColor: colors.cardBg,
          paddingHorizontal: 20,
          paddingVertical: 12,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
            <ActivityIndicator size="small" color={colors.accentBlue} />
            <Text style={{ fontSize: 14, color: colors.bodyText }}>{nickname} 구단주를 찾는 중이에요</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}
