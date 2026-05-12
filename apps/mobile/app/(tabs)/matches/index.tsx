import { useEffect, useRef, useState } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import { useTheme } from '@/hooks/useTheme'
import { API_BASE } from '@/constants/api'
import { Text, TextInput } from '@/components/Themed'

type SearchMode = 'official1on1' | 'voltaLive' | 'manager'

type MatchCandidate = {
  nickname: string
  ouid: string | null
  level: number | null
  rank: number | null
  winRate: number | null
  wins: number | null
  draws: number | null
  losses: number | null
  rankIconUrl: string | null
  formation: string | null
  representativeTeamEmblemUrl: string | null
}

type MatchPlayerInfo = {
  ouid: string
  matchDetail: {
    matchResult: string
    matchEndType: number
  }
  shoot: {
    goalTotal: number
    goalTotalDisplay?: number
  }
}

type MatchData = {
  matchId: string
  matchDate: string
  matchType: number
  matchInfo: MatchPlayerInfo[]
}

const SEARCH_MODES: { value: SearchMode; label: string }[] = [
  { value: 'official1on1', label: '1:1 공식경기' },
  { value: 'voltaLive', label: '볼타 라이브' },
  { value: 'manager', label: '감독모드' },
]

function getMatchType(mode: SearchMode) {
  return mode === 'official1on1' ? 50 : mode === 'manager' ? 52 : 214
}

function getDisplayScore(player: MatchPlayerInfo | undefined) {
  return player?.shoot.goalTotalDisplay ?? player?.shoot.goalTotal ?? 0
}

function formatMatchDate(dateStr: string) {
  const normalized = /Z$|[+-]\d{2}:\d{2}$/.test(dateStr) ? dateStr : `${dateStr}Z`
  const d = new Date(normalized)
  const m = d.getMonth() + 1
  const day = d.getDate()
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${m}.${day} ${h}:${min}`
}

function getMatchResult(match: MatchData, myOuid: string) {
  const me = match.matchInfo?.find((p) => p.ouid === myOuid)
  if (!me) return null
  return me.matchDetail.matchResult
}

function getMatchScore(match: MatchData, myOuid: string) {
  const players = match.matchInfo ?? []
  const me = players.find((p) => p.ouid === myOuid)
  if (!me) return null

  const myResult = me.matchDetail.matchResult
  if (myResult === '무') {
    const opp = players.find((p) => p.ouid !== myOuid)
    return { my: getDisplayScore(me), opp: getDisplayScore(opp) }
  }

  const opponents = players.filter((p) => p.matchDetail.matchResult !== myResult)
  return { my: getDisplayScore(me), opp: getDisplayScore(opponents[0]) }
}

export default function MatchesScreen() {
  const { colors, isDark } = useTheme()
  const tabBarHeight = useBottomTabBarHeight()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<SearchMode>('official1on1')
  const [searching, setSearching] = useState(false)
  const [matchLoading, setMatchLoading] = useState(false)
  const [candidate, setCandidate] = useState<MatchCandidate | null>(null)
  const [matches, setMatches] = useState<MatchData[]>([])
  const [error, setError] = useState('')
  const [activeQuery, setActiveQuery] = useState('')
  const requestIdRef = useRef(0)

  const s = styles(colors, isDark)

  const loadMatches = async (ouid: string, searchMode: SearchMode) => {
    setMatchLoading(true)
    setMatches([])
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/nexon/matches/list?ouid=${ouid}&matchtype=${getMatchType(searchMode)}&limit=10`)
      if (!res.ok) {
        setError('경기 기록을 불러오지 못했어요.')
        return
      }
      const data = await res.json().catch(() => [])
      setMatches(Array.isArray(data) ? data : [])
    } catch {
      setError('경기 기록을 불러오지 못했어요.')
    } finally {
      setMatchLoading(false)
    }
  }

  const handleSearch = async () => {
    const trimmed = query.trim()
    if (!trimmed || searching) return

    const reqId = ++requestIdRef.current
    setSearching(true)
    setActiveQuery(trimmed)
    setCandidate(null)
    setMatches([])
    setError('')

    try {
      const res = await fetch(`${API_BASE}/api/nexon/matches/search?nickname=${encodeURIComponent(trimmed)}`)
      const data = await res.json().catch(() => null)

      if (reqId !== requestIdRef.current) return

      const exact: MatchCandidate | null = data?.exactMatch ?? null
      setCandidate(exact)

      if (exact?.ouid) {
        void loadMatches(exact.ouid, mode)
      } else if (exact && !exact.ouid) {
        const userRes = await fetch(`${API_BASE}/api/nexon/matches/user?nickname=${encodeURIComponent(trimmed)}`)
        if (userRes.ok) {
          const userData = await userRes.json().catch(() => null)
          const resolvedOuid = userData?.ouid ?? null
          if (resolvedOuid) {
            const withOuid = { ...exact, ouid: resolvedOuid }
            setCandidate(withOuid)
            void loadMatches(resolvedOuid, mode)
          }
        }
      }

      if (!exact) {
        setError(`'${trimmed}' 구단주를 찾을 수 없어요.`)
      }
    } catch {
      if (reqId !== requestIdRef.current) return
      setError('검색에 실패했어요. 다시 시도해주세요.')
    } finally {
      if (reqId === requestIdRef.current) setSearching(false)
    }
  }

  const handleBack = () => {
    setQuery('')
    setActiveQuery('')
    setCandidate(null)
    setMatches([])
    setError('')
  }

  const handleModeChange = (newMode: SearchMode) => {
    setMode(newMode)
    if (candidate?.ouid && activeQuery) {
      void loadMatches(candidate.ouid, newMode)
    }
  }

  const hasResults = activeQuery.length > 0 || searching || candidate !== null

  const placeholder =
    mode === 'official1on1' ? '1:1 공식경기 구단주명 입력'
    : mode === 'manager' ? '감독모드 구단주명 입력'
    : '볼타 라이브 구단주명 입력'

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: tabBarHeight + 12 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 헤더 */}
        <View style={s.header}>
          {hasResults ? (
            <TouchableOpacity style={s.backBtn} onPress={handleBack}>
              <Feather name="arrow-left" size={18} color={colors.title} />
              <Text style={s.backText} numberOfLines={1}>{candidate?.nickname || activeQuery || '분석 홈'}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={s.title}>어떤 경기 기록을 찾아볼까요?</Text>
          )}
        </View>

        {/* 모드 탭 */}
        <View style={s.modeRow}>
          {SEARCH_MODES.map((m) => (
            <TouchableOpacity
              key={m.value}
              style={[s.modeTab, mode === m.value && s.modeTabActive]}
              onPress={() => handleModeChange(m.value)}
              activeOpacity={0.8}
            >
              <Text style={[s.modeTabText, mode === m.value && s.modeTabTextActive]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 검색바 */}
        <View style={s.searchRow}>
          <TextInput
            style={s.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={placeholder}
            placeholderTextColor={colors.inputPlaceholder}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={s.searchBtn} onPress={handleSearch} activeOpacity={0.8}>
            {searching ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="search" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        {/* 결과 영역 */}
        {hasResults && (
          <View style={{ gap: 12 }}>
            {/* 구단주 프로필 카드 */}
            {candidate && (
              <CandidateCard candidate={candidate} mode={mode} colors={colors} />
            )}

            {/* 에러 */}
            {error ? (
              <View style={s.card}>
                <Text style={[s.emptyText, { color: colors.bodyText }]}>{error}</Text>
              </View>
            ) : null}

            {/* 경기 목록 */}
            {(matchLoading || matches.length > 0) && candidate?.ouid && (
              <MatchList
                matches={matches}
                myOuid={candidate.ouid}
                loading={matchLoading}
                mode={mode}
                colors={colors}
                onPress={(matchId) => router.push(`/(tabs)/matches/${candidate.ouid}/${matchId}` as any)}
              />
            )}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

function CandidateCard({
  candidate, mode, colors,
}: {
  candidate: MatchCandidate
  mode: SearchMode
  colors: ReturnType<typeof useTheme>['colors']
}) {
  const winRate = candidate.winRate != null ? `${Math.round(candidate.winRate)}%` : null
  const record = [candidate.wins, candidate.draws, candidate.losses].every((v) => v != null)
    ? `${candidate.wins}승 ${candidate.draws}무 ${candidate.losses}패`
    : null
  const formation = candidate.formation ?? null
  const emblemUrl = candidate.rankIconUrl ?? candidate.representativeTeamEmblemUrl

  return (
    <View style={[profileStyle.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
      <View style={profileStyle.row}>
        {emblemUrl ? (
          <Image source={{ uri: emblemUrl }} style={profileStyle.emblem} resizeMode="contain" />
        ) : (
          <View style={[profileStyle.emblemPlaceholder, { backgroundColor: colors.surfaceStrong }]} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={[profileStyle.nickname, { color: colors.title }]}>{candidate.nickname}</Text>
          <View style={profileStyle.statsRow}>
            {winRate && (
              <Text style={[profileStyle.stat, { color: colors.bodyText }]}>
                승률 <Text style={{ color: '#457ae5', fontWeight: '600' }}>{winRate}</Text>
              </Text>
            )}
            {record && (
              <Text style={[profileStyle.stat, { color: colors.bodyText }]}>{record}</Text>
            )}
            {formation && (
              <Text style={[profileStyle.stat, { color: colors.bodyText }]}>
                포메이션 <Text style={{ color: colors.title, fontWeight: '600' }}>{formation}</Text>
              </Text>
            )}
          </View>
        </View>
      </View>
    </View>
  )
}

const profileStyle = StyleSheet.create({
  card: { borderRadius: 10, paddingHorizontal: 20, paddingVertical: 16, borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  emblem: { width: 48, height: 48, borderRadius: 8 },
  emblemPlaceholder: { width: 48, height: 48, borderRadius: 8 },
  nickname: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3, marginBottom: 6 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  stat: { fontSize: 12, fontWeight: '500' },
})

function MatchList({
  matches, myOuid, loading, mode, colors, onPress,
}: {
  matches: MatchData[]
  myOuid: string
  loading: boolean
  mode: SearchMode
  colors: ReturnType<typeof useTheme>['colors']
  onPress: (matchId: string) => void
}) {
  if (loading) {
    return (
      <View style={[matchListStyle.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
        <View style={matchListStyle.loadingRow}>
          <ActivityIndicator size="small" color={colors.accentBlue} />
          <Text style={[matchListStyle.loadingText, { color: colors.bodyText }]}>경기 기록 불러오는 중</Text>
        </View>
      </View>
    )
  }

  if (matches.length === 0) {
    const emptyText =
      mode === 'manager' ? '감독모드 경기 기록이 없어요.'
      : mode === 'voltaLive' ? '볼타 라이브 경기 기록이 없어요.'
      : '1:1 공식경기 기록이 없어요.'
    return (
      <View style={[matchListStyle.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
        <Text style={[matchListStyle.emptyText, { color: colors.bodyText }]}>{emptyText}</Text>
      </View>
    )
  }

  return (
    <View style={[matchListStyle.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
      {matches.map((match, i) => {
        const result = getMatchResult(match, myOuid)
        const score = getMatchScore(match, myOuid)
        const isLast = i === matches.length - 1

        const resultColor =
          result === '승' ? '#2f8f57'
          : result === '패' ? '#d14343'
          : colors.bodyText

        const resultBg =
          result === '승' ? colors.resultWinSoft
          : result === '패' ? colors.resultLossSoft
          : colors.resultDrawSoft

        return (
          <TouchableOpacity
            key={match.matchId}
            style={[
              matchListStyle.row,
              !isLast && { borderBottomWidth: 1, borderBottomColor: colors.divider },
            ]}
            onPress={() => onPress(match.matchId)}
            activeOpacity={0.7}
          >
            <View style={[matchListStyle.resultBadge, { backgroundColor: resultBg }]}>
              <Text style={[matchListStyle.resultText, { color: resultColor }]}>
                {result ?? '-'}
              </Text>
            </View>

            {score ? (
              <Text style={[matchListStyle.score, { color: colors.title }]}>
                {score.my} : {score.opp}
              </Text>
            ) : (
              <Text style={[matchListStyle.score, { color: colors.mutedText }]}>- : -</Text>
            )}

            <Text style={[matchListStyle.date, { color: colors.mutedText }]}>
              {formatMatchDate(match.matchDate)}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const matchListStyle = StyleSheet.create({
  card: { borderRadius: 10, paddingHorizontal: 20, paddingVertical: 4, borderWidth: 1 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 16 },
  loadingText: { fontSize: 14 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  resultBadge: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  resultText: { fontSize: 14, fontWeight: '700' },
  score: { fontSize: 16, fontWeight: '700', flex: 1, letterSpacing: -0.3 },
  date: { fontSize: 12, fontWeight: '500', flexShrink: 0 },
})

const styles = (c: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.pageBg },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 12, gap: 12 },
    header: { minHeight: 32, justifyContent: 'center' },
    title: { fontSize: 18, fontWeight: '800', color: c.title, letterSpacing: -0.4 },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '85%' },
    backText: { fontSize: 18, fontWeight: '700', color: c.title, letterSpacing: -0.4, flex: 1 },
    modeRow: { flexDirection: 'row', gap: 8 },
    modeTab: {
      flex: 1,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      backgroundColor: c.surfaceStrong,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    modeTabActive: {
      backgroundColor: c.cardBg,
      borderColor: c.cardBorder,
    },
    modeTabText: { fontSize: 13, fontWeight: '600', color: c.bodyText },
    modeTabTextActive: { color: c.title },
    searchRow: { flexDirection: 'row', gap: 8 },
    searchInput: {
      flex: 1,
      height: 44,
      backgroundColor: c.inputBg,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      fontSize: 15,
      color: c.title,
    },
    searchBtn: {
      width: 44,
      height: 44,
      backgroundColor: '#457ae5',
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    card: {
      backgroundColor: c.cardBg,
      borderRadius: 10,
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    emptyText: { fontSize: 14, textAlign: 'center' },
  })
