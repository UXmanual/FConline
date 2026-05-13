import { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useScrollToTop, useFocusEffect } from '@react-navigation/native'
import Feather from '@expo/vector-icons/Feather'
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing } from 'react-native-reanimated'
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

type TopRankItem = {
  rank: number
  nickname: string
  ouid?: string | null
  rankPoint: number | null
  winRate: number | null
  wins: number | null
  draws: number | null
  losses: number | null
  formation: string | null
  price: string | null
  rankIconUrl: string | null
}

type TeamColorMetaItem = {
  rank: number
  teamColor: string
  usageCount: number
  usageRate: number
  emblemUrl: string | null
}

type FormationMetaItem = {
  rank: number
  formation: string
  usageCount: number
  usageRate: number
  averageWinRate: number | null
  bestRank: number | null
}

type VoltaTopRankItem = {
  rank: number
  nickname: string
  ouid?: string | null
  rankPoint: number | null
  winRate: number | null
  averageRating: number | null
  mainPosition: string | null
  rankIconUrl: string | null
}

const VOLTA_COACHES = [
  { id: '64', name: '타이탄', imageSrc: 'https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/traits/trait_icon_64.png', summary: '공중볼 경합 체감이 좋아 볼타에서 선호됩니다.' },
  { id: '62', name: '블로커', imageSrc: 'https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/traits/trait_icon_62.png', summary: '슈팅 차단 체감 때문에 수비 코치로 많이 씁니다.' },
  { id: '55', name: '2개의 심장', imageSrc: 'https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/traits/trait_icon_55.png', summary: '활동량이 많은 볼타에서 스태미너 유지에 좋습니다.' },
  { id: '56', name: '파이터', imageSrc: 'https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/traits/trait_icon_56.png', summary: '몸싸움과 압박 체감 때문에 자주 추천됩니다.' },
  { id: '54', name: '체이서', imageSrc: 'https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/traits/trait_icon_54.png', summary: '역습 추격 체감이 좋아 수비 코치로 거론됩니다.' },
] as const

const VOLTA_ACCENT = '#5f36d9'
const MANAGER_ACCENT = '#10b981'

const POSITION_COLORS: Record<string, { bg: string; fg: string }> = {
  FW: { bg: 'rgba(239,68,68,0.12)', fg: '#ef4444' },
  MF: { bg: 'rgba(34,197,94,0.12)', fg: '#16a34a' },
  DF: { bg: 'rgba(59,130,246,0.12)', fg: '#2563eb' },
}

const SEARCH_MODES: { value: SearchMode; label: string }[] = [
  { value: 'official1on1', label: '1:1 공식경기' },
  { value: 'voltaLive', label: '볼타 라이브' },
  { value: 'manager', label: '감독모드' },
]

export default function MatchesScreen() {
  const { colors, isDark } = useTheme()
  const tabBarHeight = useBottomTabBarHeight()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<SearchMode>('official1on1')
  const [searching, setSearching] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchError, setSearchError] = useState('')
  const requestIdRef = useRef(0)

  const [topRanks, setTopRanks] = useState<TopRankItem[]>([])
  const [topRanksLoading, setTopRanksLoading] = useState(true)
  const [teamColorMeta, setTeamColorMeta] = useState<TeamColorMetaItem[]>([])
  const [teamColorLoading, setTeamColorLoading] = useState(true)
  const [formationMeta, setFormationMeta] = useState<FormationMetaItem[]>([])
  const [formationLoading, setFormationLoading] = useState(true)
  const [formationVisible, setFormationVisible] = useState(false)
  const formationRef = useRef<View>(null)
  const formationTriggered = useRef(false)

  const [voltaTopRanks, setVoltaTopRanks] = useState<VoltaTopRankItem[]>([])
  const [voltaTopLoading, setVoltaTopLoading] = useState(true)

  const [managerTopRanks, setManagerTopRanks] = useState<TopRankItem[]>([])
  const [managerTopLoading, setManagerTopLoading] = useState(true)
  const [managerFormationMeta, setManagerFormationMeta] = useState<FormationMetaItem[]>([])
  const [managerFormationLoading, setManagerFormationLoading] = useState(true)
  const [managerFormationVisible, setManagerFormationVisible] = useState(false)
  const managerFormationRef = useRef<View>(null)
  const managerFormationTriggered = useRef(false)
  const [managerTeamColorMeta, setManagerTeamColorMeta] = useState<TeamColorMetaItem[]>([])
  const [managerTeamColorLoading, setManagerTeamColorLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/api/nexon/matches/official-top`)
      .then((r) => r.json()).then((d) => setTopRanks(d?.items ?? [])).catch(() => {}).finally(() => setTopRanksLoading(false))
    fetch(`${API_BASE}/api/nexon/matches/official-team-color-meta`)
      .then((r) => r.json()).then((d) => setTeamColorMeta(d?.items ?? [])).catch(() => {}).finally(() => setTeamColorLoading(false))
    fetch(`${API_BASE}/api/nexon/matches/official-formation-meta`)
      .then((r) => r.json()).then((d) => setFormationMeta(d?.items ?? [])).catch(() => {}).finally(() => setFormationLoading(false))
    fetch(`${API_BASE}/api/nexon/matches/volta-top`)
      .then((r) => r.json()).then((d) => setVoltaTopRanks(d?.items ?? [])).catch(() => {}).finally(() => setVoltaTopLoading(false))
    fetch(`${API_BASE}/api/nexon/matches/manager-top`)
      .then((r) => r.json()).then((d) => setManagerTopRanks(d?.items ?? [])).catch(() => {}).finally(() => setManagerTopLoading(false))
    fetch(`${API_BASE}/api/nexon/matches/manager-formation-meta`)
      .then((r) => r.json()).then((d) => setManagerFormationMeta(d?.items ?? [])).catch(() => {}).finally(() => setManagerFormationLoading(false))
    fetch(`${API_BASE}/api/nexon/matches/manager-team-color-meta`)
      .then((r) => r.json()).then((d) => setManagerTeamColorMeta(d?.items ?? [])).catch(() => {}).finally(() => setManagerTeamColorLoading(false))
  }, [])

  const triggerFormationIfVisible = useCallback(() => {
    if (formationTriggered.current) return
    formationRef.current?.measureInWindow((_x, y) => {
      if (y < Dimensions.get('window').height) {
        formationTriggered.current = true
        setFormationVisible(true)
      }
    })
  }, [])

  useEffect(() => {
    if (!formationLoading && formationMeta.length > 0) {
      const t = setTimeout(triggerFormationIfVisible, 80)
      return () => clearTimeout(t)
    }
  }, [formationLoading, formationMeta.length, triggerFormationIfVisible])

  const triggerManagerFormationIfVisible = useCallback(() => {
    if (managerFormationTriggered.current) return
    managerFormationRef.current?.measureInWindow((_x, y) => {
      if (y < Dimensions.get('window').height) {
        managerFormationTriggered.current = true
        setManagerFormationVisible(true)
      }
    })
  }, [])

  useEffect(() => {
    if (!managerFormationLoading && managerFormationMeta.length > 0) {
      const t = setTimeout(triggerManagerFormationIfVisible, 80)
      return () => clearTimeout(t)
    }
  }, [managerFormationLoading, managerFormationMeta.length, triggerManagerFormationIfVisible])

  const s = styles(colors, isDark)
  const scrollRef = useRef<ScrollView>(null)
  useScrollToTop(scrollRef)
  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false })
      formationTriggered.current = false
      setFormationVisible(false)
      managerFormationTriggered.current = false
      setManagerFormationVisible(false)
    }, []),
  )

  const handleSearch = async () => {
    const trimmed = query.trim()
    if (!trimmed || searching) return

    const reqId = ++requestIdRef.current
    setSearching(true)
    setSearchError('')

    try {
      const res = await fetch(`${API_BASE}/api/nexon/matches/search?nickname=${encodeURIComponent(trimmed)}`)
      const data = await res.json().catch(() => null)

      if (reqId !== requestIdRef.current) return

      let exact: MatchCandidate | null = data?.exactMatch ?? null

      if (exact && !exact.ouid) {
        const userRes = await fetch(`${API_BASE}/api/nexon/matches/user?nickname=${encodeURIComponent(trimmed)}`)
        if (userRes.ok) {
          const userData = await userRes.json().catch(() => null)
          const resolvedOuid = userData?.ouid ?? null
          if (resolvedOuid) exact = { ...exact, ouid: resolvedOuid }
        }
      }

      if (reqId !== requestIdRef.current) return

      if (exact?.ouid) {
        router.push({
          pathname: '/(tabs)/matches/[ouid]',
          params: { ouid: exact.ouid, mode, candidateData: JSON.stringify(exact) },
        } as any)
      } else if (!exact) {
        setSearchError(`'${trimmed}' 구단주를 찾을 수 없어요.`)
      } else {
        setSearchError(`'${trimmed}' 구단주의 경기 기록을 찾지 못했어요.`)
      }
    } catch {
      if (reqId !== requestIdRef.current) return
      setSearchError('검색에 실패했어요. 다시 시도해주세요.')
    } finally {
      if (reqId === requestIdRef.current) setSearching(false)
    }
  }

  const placeholder =
    mode === 'official1on1' ? '1:1 공식경기 구단주명 입력'
    : mode === 'manager' ? '감독모드 구단주명 입력'
    : '볼타 라이브 구단주명 입력'

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: tabBarHeight + 12 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={() => { triggerFormationIfVisible(); triggerManagerFormationIfVisible() }}
        scrollEventThrottle={32}
      >
        {/* 헤더 */}
        <View style={s.header}>
          <Text style={s.title}>어떤 경기 기록을 찾아볼까요?</Text>
        </View>

        {/* 모드 탭 */}
        <View style={s.modeRow}>
          {SEARCH_MODES.map((m) => {
            const activeColor = m.value === 'official1on1' ? '#457ae5' : m.value === 'manager' ? '#10b981' : '#5f36d9'
            const isActive = mode === m.value
            return (
              <TouchableOpacity
                key={m.value}
                style={[s.modeTab, isActive && { backgroundColor: activeColor }]}
                onPress={() => setMode(m.value)}
                activeOpacity={0.8}
              >
                <Text style={[s.modeTabText, isActive && s.modeTabTextActive]}>{m.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* 검색바 */}
        <View style={[s.searchBar, searchFocused && s.searchBarFocused]}>
          <TextInput
            style={s.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={placeholder}
            placeholderTextColor={colors.inputPlaceholder}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          <TouchableOpacity style={s.searchIconBtn} onPress={handleSearch} activeOpacity={0.8}>
            {searching ? (
              <ActivityIndicator size="small" color={searchFocused ? '#457ae5' : colors.mutedText} />
            ) : (
              <Feather name="search" size={20} color={searchFocused ? '#457ae5' : colors.mutedText} />
            )}
          </TouchableOpacity>
        </View>

        {/* 검색 에러 */}
        {searchError ? (
          <View style={s.errorWrap}>
            <Text style={[s.errorText, { color: colors.mutedText }]}>{searchError}</Text>
          </View>
        ) : null}

        {/* 홈 블럭 */}
        {mode === 'official1on1' && (
          <View style={hb.gap}>
            {/* 랭킹 TOP 5 */}
            <HomeBlock titleAccent="1:1 공식경기" titleRest=" 랭킹 TOP 5" badge="공식경기" loading={topRanksLoading} colors={colors}>
              {topRanks.map((item, i) => (
                <View key={item.rank} style={[hb.row, i < topRanks.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
                  <View style={hb.iconBox}>
                    {item.rankIconUrl
                      ? <Image source={{ uri: item.rankIconUrl }} style={hb.iconImg} resizeMode="contain" />
                      : <Text style={hb.rankNumBlue}>{item.rank}</Text>
                    }
                  </View>
                  <View style={hb.flex1}>
                    <Text style={[hb.nickname, { color: colors.title }]} numberOfLines={1}>{item.nickname}</Text>
                    <Text style={[hb.sub, { color: colors.mutedText }]}>
                      {[item.formation, item.winRate != null ? `승률 ${Math.round(item.winRate)}%` : null, item.price ?? null].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <View style={hb.rightCol}>
                    <Text style={hb.accentSm}>{item.rank}위</Text>
                    {item.rankPoint != null && <Text style={[hb.sub, { color: colors.mutedText }]}>{item.rankPoint.toLocaleString()}pt</Text>}
                  </View>
                </View>
              ))}
            </HomeBlock>

            {/* 팀컬러 메타 */}
            <HomeBlock titleAccent="팀컬러" titleRest=" 상위권 메타" badge="TEAM COLOR" loading={teamColorLoading} colors={colors}>
              {teamColorMeta.slice(0, 10).map((item, i) => (
                <View key={item.rank} style={[hb.row, i < Math.min(teamColorMeta.length, 10) - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
                  <View style={hb.iconBox}>
                    {item.emblemUrl
                      ? <Image source={{ uri: item.emblemUrl }} style={hb.iconImg} resizeMode="contain" />
                      : <Text style={[hb.initials, { color: colors.mutedText }]}>{item.teamColor.slice(0, 2)}</Text>
                    }
                  </View>
                  <View style={hb.flex1}>
                    <Text style={[hb.nickname, { color: colors.title }]} numberOfLines={1}>
                      <Text style={hb.accentInline}>{item.rank}위</Text> · {item.teamColor}
                    </Text>
                    <Text style={[hb.sub, { color: colors.mutedText }]}>{item.usageCount.toLocaleString()}명 사용</Text>
                  </View>
                  <Text style={hb.accentSm}>{item.usageRate.toFixed(1)}%</Text>
                </View>
              ))}
            </HomeBlock>

            {/* 포메이션 메타 */}
            <View ref={formationRef}>
              <HomeBlock titleAccent="포메이션 " titleRest="상위권 사용 비율" badge="FORMATION" loading={formationLoading} colors={colors}>
                {formationMeta.slice(0, 7).map((item, i) => {
                  const maxRate = formationMeta[0]?.usageRate ?? 1
                  return (
                    <View key={item.rank} style={hb.formationRow}>
                      <View style={hb.formationInner}>
                        {i < 3 ? (
                          <Text style={hb.medal}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</Text>
                        ) : (
                          <View style={[hb.rankPill, { backgroundColor: colors.surfaceStrong }]}>
                            <Text style={[hb.rankPillText, { color: colors.mutedText }]}>{item.rank}</Text>
                          </View>
                        )}
                        <View style={hb.flex1}>
                          <View style={hb.rowBetween}>
                            <Text style={[hb.nickname, { color: colors.title }]}>{item.formation}</Text>
                            <Text style={hb.accentXs}>{item.usageRate.toFixed(1)}%</Text>
                          </View>
                          {(item.averageWinRate != null || item.bestRank != null) && (
                            <Text style={[hb.sub, { color: colors.mutedText }]}>
                              {[item.averageWinRate != null ? `평균 승률 ${item.averageWinRate.toFixed(1)}%` : null, item.bestRank != null ? `최고 순위 ${item.bestRank}위` : null].filter(Boolean).join(' · ')}
                            </Text>
                          )}
                          <View style={[hb.barBg, { backgroundColor: colors.surfaceStrong }]}>
                            <FormationBar targetPct={(item.usageRate / maxRate) * 100} index={i} visible={formationVisible} />
                          </View>
                        </View>
                      </View>
                    </View>
                  )
                })}
              </HomeBlock>
            </View>
          </View>
        )}

        {/* 볼타 홈 블럭 */}
        {mode === 'voltaLive' && (
          <View style={hb.gap}>
            {/* 볼타 랭킹 TOP 5 */}
            <HomeBlock titleAccent="볼타" titleRest=" 랭킹 TOP 5" badge="VOLTA" accentColor={VOLTA_ACCENT} loading={voltaTopLoading} colors={colors}>
              {voltaTopRanks.map((item, i) => (
                <View key={item.rank} style={[hb.row, i < voltaTopRanks.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
                  <View style={hb.iconBox}>
                    {item.rankIconUrl
                      ? <Image source={{ uri: item.rankIconUrl }} style={hb.iconImgSm} resizeMode="contain" />
                      : <Text style={[hb.rankNumBlue, { color: VOLTA_ACCENT }]}>{item.rank}</Text>
                    }
                  </View>
                  <View style={hb.flex1}>
                    <Text style={[hb.nickname, { color: colors.title }]} numberOfLines={1}>{item.nickname}</Text>
                    <View style={hb.subRow}>
                      {item.mainPosition ? (
                        <View style={[hb.posBadge, { backgroundColor: (POSITION_COLORS[item.mainPosition] ?? POSITION_COLORS.FW).bg }]}>
                          <Text style={[hb.posBadgeText, { color: (POSITION_COLORS[item.mainPosition] ?? POSITION_COLORS.FW).fg }]}>{item.mainPosition}</Text>
                        </View>
                      ) : null}
                      <Text style={[hb.sub, { color: colors.mutedText, marginTop: 0 }]}>
                        {['평점', item.averageRating != null ? (Number.isInteger(item.averageRating) ? `${item.averageRating}` : item.averageRating.toFixed(2)) : '-', '·', '승률', item.winRate != null ? `${item.winRate}%` : '-'].join(' ')}
                      </Text>
                    </View>
                  </View>
                  <View style={hb.rightCol}>
                    <Text style={[hb.accentSm, { color: VOLTA_ACCENT }]}>{item.rankPoint != null ? item.rankPoint.toLocaleString() : '-'}</Text>
                    <Text style={[hb.sub, { color: colors.mutedText }]}>랭킹 포인트</Text>
                  </View>
                </View>
              ))}
            </HomeBlock>

            {/* 볼타 추천 훈련코치 5종 */}
            <HomeBlock titleAccent="볼타" titleRest=" 추천 훈련코치 5종" badge="COACH" accentColor={VOLTA_ACCENT} loading={false} colors={colors}>
              {VOLTA_COACHES.map((item, i) => (
                <View key={item.id} style={[hb.row, i < VOLTA_COACHES.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
                  <Image source={{ uri: item.imageSrc }} style={hb.coachImg} resizeMode="cover" />
                  <View style={hb.flex1}>
                    <Text style={[hb.nickname, { color: colors.title }]}>{item.name}</Text>
                    <Text style={[hb.sub, { color: colors.mutedText }]}>{item.summary}</Text>
                  </View>
                </View>
              ))}
            </HomeBlock>
          </View>
        )}

        {/* 감독모드 홈 블럭 */}
        {mode === 'manager' && (
          <View style={hb.gap}>
            {/* 감독모드 랭킹 TOP 5 */}
            <HomeBlock titleAccent="감독모드" titleRest=" 랭킹 TOP 5" badge="감독모드" accentColor={MANAGER_ACCENT} loading={managerTopLoading} colors={colors}>
              {managerTopRanks.map((item, i) => (
                <View key={item.rank} style={[hb.row, i < managerTopRanks.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
                  <View style={hb.iconBox}>
                    {item.rankIconUrl
                      ? <Image source={{ uri: item.rankIconUrl }} style={hb.iconImg} resizeMode="contain" />
                      : <Text style={[hb.rankNumBlue, { color: MANAGER_ACCENT }]}>{item.rank}</Text>
                    }
                  </View>
                  <View style={hb.flex1}>
                    <Text style={[hb.nickname, { color: colors.title }]} numberOfLines={1}>{item.nickname}</Text>
                    <Text style={[hb.sub, { color: colors.mutedText }]}>
                      {[item.formation, item.winRate != null ? `승률 ${Math.round(item.winRate)}%` : null, item.price ?? null].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <View style={hb.rightCol}>
                    <Text style={[hb.accentSm, { color: MANAGER_ACCENT }]}>{item.rank}위</Text>
                    {item.rankPoint != null && <Text style={[hb.sub, { color: colors.mutedText }]}>{item.rankPoint.toLocaleString()}pt</Text>}
                  </View>
                </View>
              ))}
            </HomeBlock>

            {/* 포메이션 상위권 사용 비율 */}
            <View ref={managerFormationRef}>
              <HomeBlock titleAccent="포메이션 " titleRest="상위권 사용 비율" badge="FORMATION" accentColor={MANAGER_ACCENT} loading={managerFormationLoading} colors={colors}>
                {managerFormationMeta.slice(0, 7).map((item, i) => {
                  const maxRate = managerFormationMeta[0]?.usageRate ?? 1
                  return (
                    <View key={item.rank} style={hb.formationRow}>
                      <View style={hb.formationInner}>
                        {i < 3 ? (
                          <Text style={hb.medal}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</Text>
                        ) : (
                          <View style={[hb.rankPill, { backgroundColor: colors.surfaceStrong }]}>
                            <Text style={[hb.rankPillText, { color: colors.mutedText }]}>{item.rank}</Text>
                          </View>
                        )}
                        <View style={hb.flex1}>
                          <View style={hb.rowBetween}>
                            <Text style={[hb.nickname, { color: colors.title }]}>{item.formation}</Text>
                            <Text style={[hb.accentXs, { color: MANAGER_ACCENT }]}>{item.usageRate.toFixed(1)}%</Text>
                          </View>
                          {(item.averageWinRate != null || item.bestRank != null) && (
                            <Text style={[hb.sub, { color: colors.mutedText }]}>
                              {[item.averageWinRate != null ? `평균 승률 ${item.averageWinRate.toFixed(1)}%` : null, item.bestRank != null ? `최고 순위 ${item.bestRank}위` : null].filter(Boolean).join(' · ')}
                            </Text>
                          )}
                          <View style={[hb.barBg, { backgroundColor: colors.surfaceStrong }]}>
                            <FormationBar targetPct={(item.usageRate / maxRate) * 100} index={i} visible={managerFormationVisible} barColor={MANAGER_ACCENT} />
                          </View>
                        </View>
                      </View>
                    </View>
                  )
                })}
              </HomeBlock>
            </View>

            {/* 팀컬러 상위권 메타 */}
            <HomeBlock titleAccent="팀컬러" titleRest=" 상위권 메타" badge="TEAM COLOR" accentColor={MANAGER_ACCENT} loading={managerTeamColorLoading} colors={colors}>
              {managerTeamColorMeta.slice(0, 10).map((item, i) => (
                <View key={item.rank} style={[hb.row, i < Math.min(managerTeamColorMeta.length, 10) - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
                  <View style={hb.iconBox}>
                    {item.emblemUrl
                      ? <Image source={{ uri: item.emblemUrl }} style={hb.iconImg} resizeMode="contain" />
                      : <Text style={[hb.initials, { color: colors.mutedText }]}>{item.teamColor.slice(0, 2)}</Text>
                    }
                  </View>
                  <View style={hb.flex1}>
                    <Text style={[hb.nickname, { color: colors.title }]} numberOfLines={1}>
                      <Text style={[hb.accentInline, { color: MANAGER_ACCENT }]}>{item.rank}위</Text> · {item.teamColor}
                    </Text>
                    <Text style={[hb.sub, { color: colors.mutedText }]}>{item.usageCount.toLocaleString()}명 사용</Text>
                  </View>
                  <Text style={[hb.accentSm, { color: MANAGER_ACCENT }]}>{item.usageRate.toFixed(1)}%</Text>
                </View>
              ))}
            </HomeBlock>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

function FormationBar({ targetPct, index, visible, barColor = '#457ae5' }: { targetPct: number; index: number; visible: boolean; barColor?: string }) {
  const progress = useSharedValue(0)

  useEffect(() => {
    if (!visible) {
      progress.value = 0
      return
    }
    progress.value = withDelay(
      Math.round(140 * index),
      withTiming(targetPct, {
        duration: 1700,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      }),
    )
  }, [visible])

  const animStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }))

  return <Animated.View style={[hb.barFill, { backgroundColor: barColor }, animStyle]} />
}

function HomeBlock({
  titleAccent, titleRest, badge, loading, colors, children, accentColor = '#457ae5',
}: {
  titleAccent: string
  titleRest: string
  badge: string
  loading: boolean
  colors: ReturnType<typeof useTheme>['colors']
  children: React.ReactNode
  accentColor?: string
}) {
  return (
    <View style={[hb.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
      <View style={hb.cardHeader}>
        <Text style={hb.cardTitle}>
          <Text style={[hb.accentTitle, { color: accentColor }]}>{titleAccent}</Text>
          <Text style={[hb.titleRest, { color: colors.title }]}>{titleRest}</Text>
        </Text>
        <View style={[hb.badge, { backgroundColor: `${accentColor}1a` }]}>
          <Text style={[hb.badgeText, { color: accentColor }]}>{badge}</Text>
        </View>
      </View>
      {loading ? (
        <View style={hb.loadingWrap}>
          <ActivityIndicator size="small" color={accentColor} />
        </View>
      ) : children}
    </View>
  )
}

const hb = StyleSheet.create({
  gap: { gap: 12 },
  card: { borderRadius: 16, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  cardTitle: { fontSize: 14, fontWeight: '600', letterSpacing: -0.3 },
  badge: { borderRadius: 8, paddingHorizontal: 12, height: 28, justifyContent: 'center' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  accentTitle: { fontSize: 14, fontWeight: '600' },
  titleRest: { fontSize: 14, fontWeight: '600' },
  loadingWrap: { paddingVertical: 20, alignItems: 'center' as const },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  formationRow: { paddingVertical: 8 },
  formationInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconImg: { width: 44, height: 44 },
  iconImgSm: { width: 38, height: 38 },
  rankNumBlue: { fontSize: 13, fontWeight: '700', color: '#457ae5' },
  rankPill: { width: 32, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  rankPillText: { fontSize: 12, fontWeight: '600' },
  flex1: { flex: 1 },
  rightCol: { alignItems: 'flex-end', gap: 2 },
  nickname: { fontSize: 14, fontWeight: '600', letterSpacing: -0.2 },
  sub: { fontSize: 12, fontWeight: '400', marginTop: 2 },
  accentSm: { fontSize: 13, fontWeight: '700', color: '#457ae5' },
  accentXs: { fontSize: 12, fontWeight: '700', color: '#457ae5' },
  accentInline: { fontSize: 14, fontWeight: '700', color: '#457ae5' },
  initials: { fontSize: 12, fontWeight: '600' },
  medal: { fontSize: 20, width: 32, textAlign: 'center' as const },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  barBg: { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 6 },
  barFill: { height: 4, borderRadius: 2, backgroundColor: '#457ae5' },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' },
  posBadge: { height: 20, paddingHorizontal: 6, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  posBadgeText: { fontSize: 11, fontWeight: '600', lineHeight: 14 },
  coachImg: { width: 44, height: 44, borderRadius: 10, flexShrink: 0 },
})

const styles = (c: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.pageBg },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 12, gap: 12 },
    header: { minHeight: 32, justifyContent: 'center' },
    title: { fontSize: 18, fontWeight: '700', color: c.title, letterSpacing: -0.4 },
    modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    modeTab: {
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 999,
      paddingHorizontal: 12,
      backgroundColor: 'transparent',
    },
    modeTabText: { fontSize: 15, fontWeight: '600', color: c.bodyText, letterSpacing: -0.2 },
    modeTabTextActive: { color: '#ffffff' },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? c.inputBg : '#ffffff',
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 16,
      paddingLeft: 16,
      paddingRight: 6,
      height: 56,
    },
    searchBarFocused: {
      borderColor: '#457ae5',
      borderWidth: 1.5,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: c.title,
      height: '100%',
    },
    searchIconBtn: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorWrap: { paddingVertical: 4 },
    errorText: { fontSize: 13, textAlign: 'center' },
  })
