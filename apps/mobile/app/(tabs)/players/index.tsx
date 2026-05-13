import { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Modal,
  Keyboard,
  TextInput as RNTextInput,
} from 'react-native'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useScrollToTop, useFocusEffect } from '@react-navigation/native'
import Feather from '@expo/vector-icons/Feather'
import { useTheme } from '@/hooks/useTheme'
import { API_BASE } from '@/constants/api'
import { Text, TextInput } from '@/components/Themed'

type SortBy = 'latest' | 'price' | 'pay'

type Player = {
  id: number
  name: string
  reviewCount?: number
  detail?: {
    position: string | null
    overall: number | null
    pay: number | null
    height: number | null
    weight: number | null
    bodyType: string | null
    leftFoot: number | null
    rightFoot: number | null
    prices: Record<number, string>
  } | null
}

type Season = {
  seasonId: number
  className: string
  seasonImg: string
}

type PopularPlayerItem = {
  rank: number
  name: string
  summary: string
  metric: string
  imageUrl?: string
  seasonBadgeUrl?: string
}

function getSeasonId(spid: number) {
  return Math.floor(spid / 1000000)
}

/**
 * 원화 금액 문자열을 한국식 단위(경/조/억/만)로 축약합니다.
 * @example "20000000000000000" → "2경"
 * @example "2790000000000" → "2조 7900억"
 * @example "150000000000" → "1500억"
 */
function abbreviateKRW(priceStr: string): string {
  if (/[경조억만]/.test(priceStr)) return priceStr // 이미 축약된 값
  const num = parseInt(priceStr.replace(/,/g, ''), 10)
  if (isNaN(num) || num <= 0) return '-'
  const gyeong = Math.floor(num / 10_000_000_000_000_000)
  const jo = Math.floor((num % 10_000_000_000_000_000) / 1_000_000_000_000)
  const eok = Math.floor((num % 1_000_000_000_000) / 100_000_000)
  const man = Math.floor((num % 100_000_000) / 10_000)
  const parts: string[] = []
  if (gyeong > 0) parts.push(`${gyeong}경`)
  if (jo > 0) parts.push(`${jo}조`)
  if (eok > 0) parts.push(`${eok}억`)
  if (parts.length === 0 && man > 0) parts.push(`${man}만`)
  return parts.length > 0 ? parts.join(' ') : priceStr
}

/** 강화 레벨별 금액을 축약 단위로 반환합니다. */
function formatPrice(prices: Record<number, string>, level: number): string {
  const raw = prices[level]
  if (!raw || raw === '-') return '-'
  return abbreviateKRW(raw)
}


function getStrongPoint(level: number): number {
  const table = [0, 3, 4, 5, 7, 9, 11, 14, 18, 20, 22, 24, 27, 30]
  return table[level] ?? 0
}

function normalizeBodyType(v: string | null): string {
  if (!v) return '-'
  const cleaned = v.replace(/^\s*\(\d+\)\s*$/, '').trim()
  return cleaned || '-'
}

export default function PlayersScreen() {
  const { colors, isDark } = useTheme()
  const tabBarHeight = useBottomTabBarHeight()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('latest')
  const [strongLevel, setStrongLevel] = useState(1)
  const [players, setPlayers] = useState<Player[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(false)
  const [popularFw, setPopularFw] = useState<PopularPlayerItem[]>([])
  const [popularMf, setPopularMf] = useState<PopularPlayerItem[]>([])
  const [popularDf, setPopularDf] = useState<PopularPlayerItem[]>([])
  const [popularLoading, setPopularLoading] = useState(true)
  const [showSortPicker, setShowSortPicker] = useState(false)
  const [showLevelPicker, setShowLevelPicker] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)

  const s = styles(colors, isDark)
  const scrollRef = useRef<ScrollView>(null)
  const searchInputRef = useRef<RNTextInput>(null)
  useScrollToTop(scrollRef)

  const performSearch = useCallback((term: string) => {
    setSearchQuery(term)
    setLoading(true)
    fetch(`${API_BASE}/api/nexon/players?q=${encodeURIComponent(term)}`)
      .then((r) => r.json())
      .then((data) => {
        setPlayers(Array.isArray(data.players) ? data.players : [])
        setSeasons(Array.isArray(data.seasons) ? data.seasons : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false })
      searchInputRef.current?.blur()
      Keyboard.dismiss()
      setSearchFocused(false)
    }, []),
  )

  useEffect(() => {
    fetch(`${API_BASE}/api/nexon/popular-players`)
      .then((r) => r.json())
      .then((data) => {
        setPopularFw(Array.isArray(data.fw) ? data.fw : [])
        setPopularMf(Array.isArray(data.mf) ? data.mf : [])
        setPopularDf(Array.isArray(data.df) ? data.df : [])
      })
      .catch(() => {})
      .finally(() => setPopularLoading(false))
  }, [])

  const handleSearch = () => {
    const trimmed = query.trim()
    if (!trimmed) return
    searchInputRef.current?.blur()
    Keyboard.dismiss()
    setSearchFocused(false)
    performSearch(trimmed)
  }

  const handleBack = () => {
    searchInputRef.current?.blur()
    Keyboard.dismiss()
    setSearchFocused(false)
    setQuery('')
    setSearchQuery('')
    setPlayers([])
    setSeasons([])
  }

  const handlePopularSelect = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    searchInputRef.current?.blur()
    Keyboard.dismiss()
    setSearchFocused(false)
    setQuery(trimmed)
    performSearch(trimmed)
  }

  const handleOpenPlayerDetail = (playerId: number) => {
    searchInputRef.current?.blur()
    Keyboard.dismiss()
    setSearchFocused(false)
    router.push({
      pathname: '/(tabs)/players/[id]',
      params: { id: String(playerId), level: String(strongLevel) },
    } as any)
  }

  const getSortedPlayers = (): Player[] => {
    const sorted = [...players]
    if (sortBy === 'latest') {
      sorted.sort((a, b) => Math.floor(b.id / 1000000) - Math.floor(a.id / 1000000))
    } else if (sortBy === 'price') {
      sorted.sort((a, b) => {
        const pa = parseInt((a.detail?.prices[strongLevel] ?? '0').replace(/,/g, ''), 10)
        const pb = parseInt((b.detail?.prices[strongLevel] ?? '0').replace(/,/g, ''), 10)
        return pb - pa
      })
    } else if (sortBy === 'pay') {
      sorted.sort((a, b) => (b.detail?.pay ?? 0) - (a.detail?.pay ?? 0))
    }
    return sorted
  }

  const hasSearch = searchQuery.trim().length > 0
  const showResults = loading || hasSearch
  const showPopular = !loading && !hasSearch
  const sortedPlayers = getSortedPlayers()

  const SORT_OPTIONS: { value: SortBy; label: string }[] = [
    { value: 'latest', label: '최신순' },
    { value: 'price', label: '금액순' },
    { value: 'pay', label: '급여순' },
  ]

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: tabBarHeight + 12 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 헤더 */}
        <View style={s.header}>
          {showResults ? (
            <TouchableOpacity style={s.backBtn} onPress={handleBack}>
              <Feather name="arrow-left" size={18} color={colors.title} />
              <Text style={s.backText}>선수 홈</Text>
            </TouchableOpacity>
          ) : (
            <Text style={s.title}>선수를 찾아볼까요?</Text>
          )}
        </View>

        {/* 검색바 */}
        <View style={[s.searchBar, searchFocused && s.searchBarFocused]}>
          <TextInput
            ref={searchInputRef}
            style={s.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="선수 이름을 입력해주세요"
            placeholderTextColor={colors.inputPlaceholder}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          <TouchableOpacity style={s.searchIconBtn} onPress={handleSearch} activeOpacity={0.7} hitSlop={8}>
            <Feather name="search" size={20} color={searchFocused ? '#457ae5' : colors.mutedText} />
          </TouchableOpacity>
        </View>

        {/* 인기 선수 */}
        {showPopular && (
          <View style={{ gap: 12, marginTop: 4 }}>
            <Text style={s.guideText}>• 전일 업데이트 기준 공식 포지션 인기 카드</Text>
            {(['FW', 'MF', 'DF'] as const).map((pos) => (
              <PositionCard
                key={pos}
                title={`${pos} 인기 선수 TOP 5`}
                badge={pos}
                items={pos === 'FW' ? popularFw : pos === 'MF' ? popularMf : popularDf}
                isLoading={popularLoading}
                onSelect={handlePopularSelect}
                colors={colors}
              />
            ))}
          </View>
        )}

        {/* 검색 결과 */}
        {showResults && (
          <View style={s.card}>
            {loading && (
              <View style={s.loadingRow}>
                <ActivityIndicator size="small" color={colors.accentBlue} />
                <Text style={s.loadingText}>선수를 찾는 중이에요</Text>
              </View>
            )}

            {!loading && players.length === 0 && (
              <Text style={s.emptyText}>검색 결과가 없어요</Text>
            )}

            {!loading && players.length > 0 && (
              <>
                <View style={s.filterRow}>
                  <TouchableOpacity style={s.picker} onPress={() => setShowSortPicker(true)} activeOpacity={0.8}>
                    <Text style={s.pickerText}>{SORT_OPTIONS.find((o) => o.value === sortBy)?.label}</Text>
                    <Feather name="chevron-down" size={14} color={colors.bodyText} />
                  </TouchableOpacity>
                  <TouchableOpacity style={s.picker} onPress={() => setShowLevelPicker(true)} activeOpacity={0.8}>
                    <Text style={s.pickerText}>{strongLevel}강</Text>
                    <Feather name="chevron-down" size={14} color={colors.bodyText} />
                  </TouchableOpacity>
                </View>

                {sortedPlayers.map((player, i) => (
                  <PlayerRow
                    key={player.id}
                    player={player}
                    seasons={seasons}
                    strongLevel={strongLevel}
                    isLast={i === sortedPlayers.length - 1}
                    colors={colors}
                    onPress={() => handleOpenPlayerDetail(player.id)}
                  />
                ))}
              </>
            )}
          </View>
        )}

      </ScrollView>

      <PickerModal
        visible={showSortPicker}
        onClose={() => setShowSortPicker(false)}
        options={SORT_OPTIONS}
        selected={sortBy}
        onSelect={(v) => { setSortBy(v as SortBy); setShowSortPicker(false) }}
        colors={colors}
      />

      <PickerModal
        visible={showLevelPicker}
        onClose={() => setShowLevelPicker(false)}
        options={Array.from({ length: 13 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}강` }))}
        selected={String(strongLevel)}
        onSelect={(v) => { setStrongLevel(Number(v)); setShowLevelPicker(false) }}
        colors={colors}
      />
    </SafeAreaView>
  )
}

function PositionCard({
  title, badge, items, isLoading, onSelect, colors,
}: {
  title: string
  badge: 'FW' | 'MF' | 'DF'
  items: PopularPlayerItem[]
  isLoading: boolean
  onSelect: (name: string) => void
  colors: ReturnType<typeof useTheme>['colors']
}) {
  const badgeColors =
    badge === 'FW' ? { bg: colors.positionFwBg, fg: colors.positionFwFg }
    : badge === 'MF' ? { bg: colors.positionMfBg, fg: colors.positionMfFg }
    : { bg: colors.positionDfBg, fg: colors.positionDfFg }

  return (
    <View style={[cardStyle.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
      <View style={cardStyle.posHeader}>
        <Text style={cardStyle.posTitle}>
          <Text style={[cardStyle.posTitlePart, { color: badgeColors.fg }]}>{badge}</Text>
          <Text style={[cardStyle.posTitlePart, { color: colors.title }]}>{title.slice(badge.length)}</Text>
        </Text>
        <View style={[cardStyle.posBadge, { backgroundColor: badgeColors.bg }]}>
          <Text style={[cardStyle.posBadgeText, { color: badgeColors.fg }]}>{badge}</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={{ marginTop: 12, gap: 0 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[cardStyle.skeletonRow, { borderBottomColor: colors.divider }, i === 2 && { borderBottomWidth: 0 }]}>
              <View style={[cardStyle.skeletonCircle, { backgroundColor: colors.surfaceStrong }]} />
              <View style={{ flex: 1, gap: 6 }}>
                <View style={[cardStyle.skeletonLine, { width: '60%', backgroundColor: colors.surfaceStrong }]} />
                <View style={[cardStyle.skeletonLine, { width: '40%', backgroundColor: colors.surfaceStrong }]} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ marginTop: 12 }}>
          {items.map((item, i) => (
            <TouchableOpacity
              key={`${badge}-${item.rank}`}
              style={[
                cardStyle.popularRow,
                i < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider },
              ]}
              onPress={() => onSelect(item.name)}
              activeOpacity={0.7}
            >
              <View style={cardStyle.popularLeft}>
                {item.imageUrl ? (
                  <View style={[cardStyle.popularThumb, { backgroundColor: colors.surfaceSoft }]}>
                    <Image source={{ uri: item.imageUrl }} style={{ width: 48, height: 48 }} resizeMode="contain" />
                  </View>
                ) : (
                  <View style={[cardStyle.popularRankBadge, { backgroundColor: colors.surfaceSoft }]}>
                    <Text style={[cardStyle.popularRankText, { color: badgeColors.fg }]}>{item.rank}</Text>
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[cardStyle.popularName, { color: colors.title }]} numberOfLines={1}>{item.name}</Text>
                  <View style={cardStyle.popularSummaryRow}>
                    {item.seasonBadgeUrl ? (
                      <Image source={{ uri: item.seasonBadgeUrl }} style={cardStyle.popularSeasonBadge} resizeMode="contain" />
                    ) : null}
                    <Text style={[cardStyle.popularSummary, { color: colors.bodyText }]} numberOfLines={1}>{item.summary}</Text>
                  </View>
                </View>
              </View>
              <Text style={[cardStyle.popularMetric, { color: badgeColors.fg }]}>{item.metric}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  )
}

const cardStyle = StyleSheet.create({
  card: { borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16, borderWidth: 1 },
  posHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  posTitle: { fontSize: 14 },
  posTitlePart: { fontSize: 14, fontWeight: '600' },
  posBadge: { height: 28, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  posBadgeText: { fontSize: 12, fontWeight: '600' },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  skeletonCircle: { width: 48, height: 48, borderRadius: 8 },
  skeletonLine: { height: 10, borderRadius: 5 },
  popularRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  popularLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  popularThumb: { width: 48, height: 48, borderRadius: 8, overflow: 'hidden', flexShrink: 0 },
  popularRankBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  popularRankText: { fontSize: 13, fontWeight: '700' },
  popularName: { fontSize: 14, fontWeight: '600' },
  popularSummaryRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  popularSeasonBadge: { width: 16, height: 16, flexShrink: 0 },
  popularSummary: { fontSize: 12, fontWeight: '500', flex: 1 },
  popularMetric: { fontSize: 13, fontWeight: '600', flexShrink: 0, marginLeft: 8 },
})

function PlayerRow({
  player, seasons, strongLevel, isLast, colors, onPress,
}: {
  player: Player
  seasons: Season[]
  strongLevel: number
  isLast: boolean
  colors: ReturnType<typeof useTheme>['colors']
  onPress: () => void
}) {
  const seasonId = getSeasonId(player.id)
  const season = seasons.find((item) => item.seasonId === seasonId)
  const detail = player.detail
  const currentOverall =
    detail?.overall != null
      ? detail.overall - getStrongPoint(1) + getStrongPoint(strongLevel)
      : null

  return (
    <TouchableOpacity
      style={[playerRowStyle.row, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[playerRowStyle.thumb, { backgroundColor: colors.surfaceStrong }]}>
        <Image
          source={{ uri: `https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p${player.id}.png` }}
          style={{ width: 64, height: 64 }}
          resizeMode="contain"
        />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={playerRowStyle.nameRow}>
          {season && (
            <Image source={{ uri: season.seasonImg }} style={playerRowStyle.seasonBadge} resizeMode="contain" />
          )}
          <Text style={[playerRowStyle.name, { color: colors.title }]} numberOfLines={1}>{player.name}</Text>
          {typeof player.reviewCount === 'number' && player.reviewCount > 0 && (
            <Text style={[playerRowStyle.reviewCount, { color: colors.mutedText }]} numberOfLines={1}>
              <Text style={{ color: '#457ae5', fontWeight: '600' }}>{player.reviewCount.toLocaleString()}</Text>
              {' 평가'}
            </Text>
          )}
        </View>

        {detail && (
          <View style={playerRowStyle.stats}>
            <Text style={[playerRowStyle.statVal]}>{strongLevel}강</Text>
            <Text style={[playerRowStyle.statSep, { color: colors.mutedText }]}>|</Text>
            <Text style={[playerRowStyle.statItem, { color: colors.bodyText }]}>
              {'주포지션 '}
              <Text style={playerRowStyle.statVal}>{detail.position ?? '-'}</Text>
            </Text>
            <Text style={[playerRowStyle.statSep, { color: colors.mutedText }]}>|</Text>
            <Text style={[playerRowStyle.statItem, { color: colors.bodyText }]}>
              {'오버롤 '}
              <Text style={playerRowStyle.statVal}>{currentOverall ?? '-'}</Text>
            </Text>
            <Text style={[playerRowStyle.statSep, { color: colors.mutedText }]}>|</Text>
            <Text style={[playerRowStyle.statItem, { color: colors.bodyText }]}>
              {'급여 '}
              <Text style={playerRowStyle.statVal}>{detail.pay ?? '-'}</Text>
            </Text>
            <Text style={[playerRowStyle.statSep, { color: colors.mutedText }]}>|</Text>
            <Text style={[playerRowStyle.statItem, { color: colors.bodyText }]}>
              {'현재 금액 '}
              <Text style={playerRowStyle.statVal}>{formatPrice(detail.prices, strongLevel)}</Text>
            </Text>
            <Text style={[playerRowStyle.statSep, { color: colors.mutedText }]}>|</Text>
            <Text style={[playerRowStyle.statItem, { color: colors.bodyText }]}>
              {'키 '}
              <Text style={[playerRowStyle.statItem, { color: colors.bodyText }]}>{detail.height != null ? `${detail.height}cm` : '-'}</Text>
            </Text>
            <Text style={[playerRowStyle.statSep, { color: colors.mutedText }]}>|</Text>
            <Text style={[playerRowStyle.statItem, { color: colors.bodyText }]}>
              {'몸무게 '}
              <Text style={[playerRowStyle.statItem, { color: colors.bodyText }]}>{detail.weight != null ? `${detail.weight}kg` : '-'}</Text>
            </Text>
            <Text style={[playerRowStyle.statSep, { color: colors.mutedText }]}>|</Text>
            <Text style={[playerRowStyle.statItem, { color: colors.bodyText }]}>
              {'체형 '}{normalizeBodyType(detail.bodyType)}
            </Text>
            <Text style={[playerRowStyle.statSep, { color: colors.mutedText }]}>|</Text>
            <Text style={[playerRowStyle.statItem, { color: colors.bodyText }]}>
              {'왼발 '}
              <Text style={playerRowStyle.statVal}>{detail.leftFoot ?? '-'}</Text>
              {' 오른발 '}
              <Text style={playerRowStyle.statVal}>{detail.rightFoot ?? '-'}</Text>
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

const playerRowStyle = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  thumb: { width: 64, height: 64, borderRadius: 8, overflow: 'hidden', flexShrink: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  seasonBadge: { width: 22, height: 16, marginRight: -2 },
  name: { fontSize: 13, fontWeight: '600' },
  reviewCount: { fontSize: 11, fontWeight: '500' },
  stats: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  statItem: { fontSize: 11 },
  statSep: { fontSize: 11 },
  statVal: { fontSize: 11, fontWeight: '600', color: '#f64f5e' },
})

function PickerModal({
  visible, onClose, options, selected, onSelect, colors,
}: {
  visible: boolean
  onClose: () => void
  options: { value: string; label: string }[]
  selected: string
  onSelect: (value: string) => void
  colors: ReturnType<typeof useTheme>['colors']
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={[pickerStyle.overlay]} onPress={onClose} activeOpacity={1}>
        <View style={[pickerStyle.sheet, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          {options.map((opt, i) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                pickerStyle.option,
                i < options.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider },
              ]}
              onPress={() => onSelect(opt.value)}
              activeOpacity={0.7}
            >
              <Text style={[
                pickerStyle.optionText,
                { color: opt.value === selected ? '#457ae5' : colors.title },
                opt.value === selected && { fontWeight: '700' },
              ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  )
}

const pickerStyle = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  sheet: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  option: { paddingHorizontal: 20, paddingVertical: 16 },
  optionText: { fontSize: 15, fontWeight: '500' },
})

const styles = (c: ReturnType<typeof useTheme>['colors'], _isDark: boolean) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.pageBg },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 12, gap: 12 },
    header: { minHeight: 32, justifyContent: 'center' },
    title: { fontSize: 18, fontWeight: '800', color: c.title, letterSpacing: -0.4 },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    backText: { fontSize: 18, fontWeight: '700', color: c.title, letterSpacing: -0.4 },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 16,
      paddingLeft: 16,
      paddingRight: 6,
      height: 52,
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
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    guideText: { fontSize: 11, fontWeight: '500', color: c.mutedText },
    card: {
      backgroundColor: c.cardBg,
      borderRadius: 16,
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
    loadingText: { fontSize: 14, color: c.bodyText },
    emptyText: { fontSize: 14, color: c.bodyText, textAlign: 'center', paddingVertical: 16 },
    filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    picker: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      height: 40,
      paddingHorizontal: 12,
      backgroundColor: c.inputBg,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 10,
    },
    pickerText: { fontSize: 14, fontWeight: '500', color: c.title },
  })
