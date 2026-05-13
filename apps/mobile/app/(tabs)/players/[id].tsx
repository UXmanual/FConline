import { useEffect, useRef, useState } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Modal,
  Animated,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useLocalSearchParams, useRouter } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from 'react-native-svg'
import { useTheme } from '@/hooks/useTheme'
import { API_BASE } from '@/constants/api'
import { Text } from '@/components/Themed'

const STRONG_LEVELS = Array.from({ length: 13 }, (_, i) => i + 1)
const STRONG_POINT_TABLE = [0, 3, 4, 5, 7, 9, 11, 14, 18, 20, 22, 24, 27, 30]
function getStrongPoint(level: number) { return STRONG_POINT_TABLE[level] ?? 0 }

/**
 * 원화 금액 문자열을 한국식 단위(경/조/억/만)로 축약합니다.
 * @example "2790000000000" → "2조 7900억"
 */
function abbreviateKRW(priceStr: string): string {
  if (/[경조억만]/.test(priceStr)) return priceStr
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

const ABILITY_GROUPS = [
  ['속력', '반응 속도'], ['가속력', '밸런스'], ['골 결정력', '슛 파워'],
  ['중거리 슛', '위치 선정'], ['헤더', '짧은 패스'], ['긴 패스', '시야'],
  ['커브', '프리킥'], ['드리블', '볼 컨트롤'], ['민첩성', '침착성'],
  ['태클', '가로채기'], ['대인 수비', '슬라이딩 태클'], ['몸싸움', '스태미너'],
  ['점프', '키퍼 다이빙'], ['키퍼 핸들링', '키퍼 킥'], ['키퍼 반응속도', '키퍼 위치 선정'],
] as const

type AbilityStat = { name: string; value: number }

/** 선수 특성 아이템 */
type Trait = { name: string; iconSrc: string | null }

type PlayerReviewItem = {
  id: string
  nickname: string
  title: string
  content: string
  createdAtLabel: string
  commentCount: number
  likeCount: number
}

type PlayerDetail = {
  name: string
  seasonImg: string | null
  seasonName: string | null
  position: string | null
  overall: number | null
  pay: number | null
  height: number | null
  weight: number | null
  bodyType: string | null
  leftFoot: number | null
  rightFoot: number | null
  skillMove: number | null
  abilities: AbilityStat[]
  totalAbility: number | null
  prices: Record<number, string>
  nationName: string | null
  nationLogo: string | null
  teamName: string | null
  clubHistory: Array<{
    year: string
    club: string
    rent: string | null
  }>
  traits: Trait[]
}

/** 능력치 수치에 따른 색상 (웹과 동일) */
function getStatColor(value: number): string {
  if (value >= 160) return '#22c7a9'
  if (value >= 150) return '#28bdd6'
  if (value >= 140) return '#ff9f43'
  if (value >= 130) return '#ef4444'
  if (value >= 120) return '#a855f7'
  if (value >= 110) return '#457ae5'
  if (value >= 100) return '#2f8f57'
  if (value >= 90) return '#7f8a96'
  return '#58616a'
}

/** 강화 레벨에 따른 개인기 별 수 계산 (웹과 동일) */
function calculateSkillMoveStars(skillMove: number | null, strongLevel: number): number {
  if (skillMove == null) return 0
  let stars = skillMove + 1
  if (strongLevel >= 8) stars += 2
  else if (strongLevel >= 5) stars += 1
  return Math.min(stars, 6)
}

/** 체형 문자열 정규화 */
function normalizeBodyType(v: string | null) {
  if (!v) return '-'
  return v.replace(/^\s*\(\d+\)\s*$/, '').trim() || '-'
}

/** 포지션에 따른 배지 색상 */
function getPositionColors(position: string | null, isDark: boolean): { bg: string; fg: string } {
  if (!position) return isDark ? { bg: '#263142', fg: '#c6d0dc' } : { bg: '#e8edf5', fg: '#456' }
  if (['ST','CF','LF','RF','LW','RW'].includes(position)) {
    return isDark ? { bg: '#4a2930', fg: '#ff8f9c' } : { bg: '#fdeaea', fg: '#f64f5e' }
  }
  if (['CAM','CM','CDM','LAM','RAM','LM','RM'].includes(position)) {
    return isDark ? { bg: '#223a31', fg: '#67d49a' } : { bg: '#e6f4ee', fg: '#2f8f57' }
  }
  if (['CB','LB','RB','LWB','RWB','SW'].includes(position)) {
    return isDark ? { bg: '#22324d', fg: '#7eb2ff' } : { bg: '#e8eef9', fg: '#256ef4' }
  }
  return isDark ? { bg: '#323844', fg: '#c6d0dc' } : { bg: '#f0f0f0', fg: '#666' }
}

// ────────────────────────────────────────────────────────────────
// 서브 컴포넌트
// ────────────────────────────────────────────────────────────────

/**
 * 개별 정보 카드 (label 상단, value 하단)
 */
function InfoCard({
  label, value, colors,
}: {
  label: string
  value: string
  colors: ReturnType<typeof useTheme>['colors']
}) {
  return (
    <View style={[infoCardStyle.wrap, { backgroundColor: colors.surfaceSoft }]}>
      <Text style={[infoCardStyle.label, { color: colors.mutedText }]}>{label}</Text>
      <Text style={[infoCardStyle.value, { color: colors.title }]} numberOfLines={1}>{value}</Text>
    </View>
  )
}

const infoCardStyle = StyleSheet.create({
  wrap: { flexBasis: '48%', flexGrow: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  label: { fontSize: 11, fontWeight: '500' },
  value: { fontSize: 14, fontWeight: '600', marginTop: 4 },
})

/**
 * 왕발/오른발 통합 카드 (점 구분자 없이)
 */
function FootInfoCard({
  leftFoot, rightFoot, colors,
}: {
  leftFoot: number | null
  rightFoot: number | null
  colors: ReturnType<typeof useTheme>['colors']
}) {
  return (
    <View style={[infoCardStyle.wrap, { backgroundColor: colors.surfaceSoft }]}>
      <Text style={[infoCardStyle.label, { color: colors.mutedText }]}>발 능력치</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 10 }}>
        <Text style={[infoCardStyle.value, { color: colors.title }]}>
          {'왼발 '}<Text style={{ color: '#256ef4' }}>{leftFoot ?? '-'}</Text>
        </Text>
        <Text style={[infoCardStyle.value, { color: colors.title }]}>
          {'오른발 '}<Text style={{ color: '#256ef4' }}>{rightFoot ?? '-'}</Text>
        </Text>
      </View>
    </View>
  )
}

/**
 * 국적 카드 (국기 이미지 포함)
 */
function NationCard({
  nationName, nationLogo, colors,
}: {
  nationName: string | null
  nationLogo: string | null
  colors: ReturnType<typeof useTheme>['colors']
}) {
  return (
    <View style={[infoCardStyle.wrap, { backgroundColor: colors.surfaceSoft }]}>
      <Text style={[infoCardStyle.label, { color: colors.mutedText }]}>국적</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={[infoCardStyle.value, { color: colors.title }]} numberOfLines={1}>
          {nationName ?? '-'}
        </Text>
        {nationLogo && (
          <Image
            source={{ uri: nationLogo }}
            style={{ width: 32, height: 16, borderRadius: 4 }}
            resizeMode="contain"
          />
        )}
      </View>
    </View>
  )
}

/**
 * 능력치 행 컴포넌트
 */
/**
 * 능력치 카드 (웹과 동일 - soft-bg, 이름+값+부스표시)
 */
function AbilityCard({
  stat, abilityBoost, chemistryBoost, teamColorBoost, boostColor, colors,
}: {
  stat: AbilityStat
  abilityBoost: number
  chemistryBoost: number
  teamColorBoost: number
  boostColor: string
  colors: ReturnType<typeof useTheme>['colors']
}) {
  const boosted = stat.value + abilityBoost + chemistryBoost + teamColorBoost
  const color = getStatColor(boosted)
  const showAbility = abilityBoost > 0
  const showChem = chemistryBoost > 0
  const showTeam = teamColorBoost > 0
  return (
    <View style={[abilityCardStyle.wrap, { backgroundColor: colors.surfaceSoft }]}>
      <Text style={[abilityCardStyle.name, { color: colors.mutedText }]} numberOfLines={1}>{stat.name}</Text>
      <View style={abilityCardStyle.valueRow}>
        <Text style={[abilityCardStyle.value, { color }]}>{boosted}</Text>
        {(showAbility || showChem || showTeam) && (
          <View style={abilityCardStyle.boostRow}>
            {showAbility && <Text style={[abilityCardStyle.boost, { color: boostColor }]}>+{abilityBoost}</Text>}
            {showAbility && showChem && <Text style={[abilityCardStyle.boostSep, { color: colors.mutedText }]}>|</Text>}
            {showChem && <Text style={[abilityCardStyle.boost, { color: boostColor }]}>+{chemistryBoost}</Text>}
            {(showAbility || showChem) && showTeam && <Text style={[abilityCardStyle.boostSep, { color: colors.mutedText }]}>|</Text>}
            {showTeam && <Text style={[abilityCardStyle.boost, { color: boostColor }]}>+{teamColorBoost}</Text>}
          </View>
        )}
      </View>
    </View>
  )
}

const abilityCardStyle = StyleSheet.create({
  wrap: { flexBasis: '48%', flexGrow: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  name: { fontSize: 11, fontWeight: '500' },
  valueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: 4 },
  value: { fontSize: 18, fontWeight: '800', lineHeight: 22, letterSpacing: -0.4 },
  boostRow: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingBottom: 2 },
  boost: { fontSize: 11, fontWeight: '600', color: '#2f8f57' },
  boostSep: { fontSize: 11, opacity: 0.4 },
})

function HorizontalEdgeFade({
  side,
  color,
}: {
  side: 'left' | 'right'
  color: string
}) {
  return (
    <View pointerEvents="none" style={[edgeFadeStyle.wrap, side === 'left' ? { left: 0 } : { right: 0 }]}>
      <Svg width="100%" height="100%">
        <Defs>
          <SvgLinearGradient
            id={`level-fade-${side}`}
            x1={side === 'left' ? '0%' : '100%'}
            y1="0%"
            x2={side === 'left' ? '100%' : '0%'}
            y2="0%"
          >
            <Stop offset="0%" stopColor={color} stopOpacity="1" />
            <Stop offset="38%" stopColor={color} stopOpacity="0.82" />
            <Stop offset="100%" stopColor={color} stopOpacity="0" />
          </SvgLinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#level-fade-${side})`} />
      </Svg>
    </View>
  )
}

const edgeFadeStyle = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 28,
    zIndex: 2,
  },
})

// ────────────────────────────────────────────────────────────────
// 메인 화면
// ────────────────────────────────────────────────────────────────

export default function PlayerDetailScreen() {
  const { id, level, tab } = useLocalSearchParams<{ id: string; level?: string; tab?: string }>()
  const router = useRouter()
  const { colors, isDark } = useTheme()
  const tabBarHeight = useBottomTabBarHeight()
  /** boost 표시 색상 - 웹과 동일 (light: #8a96aa, dark: #5275bc) */
  const boostColor = isDark ? '#5275bc' : '#8a96aa'

  const [loading, setLoading] = useState(true)
  const [playerName, setPlayerName] = useState('')
  const [seasonImg, setSeasonImg] = useState<string | null>(null)
  const [seasonName, setSeasonName] = useState<string | null>(null)
  const [detail, setDetail] = useState<PlayerDetail | null>(null)
  const initialStrongLevel = (() => {
    const parsed = Number(level)
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= 13 ? parsed : 1
  })()
  const initialTab: 'detail' | 'review' = tab === 'review' ? 'review' : 'detail'
  const [strongLevel, setStrongLevel] = useState(initialStrongLevel)
  const [isChemistryApplied, setIsChemistryApplied] = useState(false)
  const [teamColorBoost, setTeamColorBoost] = useState(0)
  const [showTeamColorPicker, setShowTeamColorPicker] = useState(false)
  const [activeTab, setActiveTab] = useState<'detail' | 'review'>(initialTab)
  const [reviewItems, setReviewItems] = useState<PlayerReviewItem[]>([])
  const [reviewCount, setReviewCount] = useState(0)
  const [reviewPage, setReviewPage] = useState(1)
  const [reviewHasMore, setReviewHasMore] = useState(false)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [levelViewportWidth, setLevelViewportWidth] = useState(0)
  const [levelContentWidth, setLevelContentWidth] = useState(0)
  const [levelScrollX, setLevelScrollX] = useState(0)

  /** 적응도 토글 애니메이션 */
  const chemToggleAnim = useRef(new Animated.Value(0)).current
  const handleChemToggle = () => {
    const next = !isChemistryApplied
    setIsChemistryApplied(next)
    Animated.timing(chemToggleAnim, {
      toValue: next ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start()
  }
  const chemThumbX = chemToggleAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 24] })

  /** 강화 레벨 pill 가로 스크롤 ref (선택 레벨 자동 센터 스크롤용) */
  const levelScrollRef = useRef<ScrollView>(null)
  const levelTabLayouts = useRef<Record<number, { x: number; width: number }>>({})

  const s = styles(colors)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`${API_BASE}/api/nexon/players/detail?spid=${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.player?.name) setPlayerName(data.player.name)
        if (data.season?.seasonImg) setSeasonImg(data.season.seasonImg)
        if (data.season?.className) setSeasonName(data.season.className)
        if (data.detail) setDetail(data.detail)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    setStrongLevel(initialStrongLevel)
  }, [initialStrongLevel, id])

  useEffect(() => {
    setActiveTab(initialTab)
    setReviewItems([])
    setReviewCount(0)
    setReviewPage(1)
    setReviewHasMore(false)
  }, [id, initialTab])

  const fetchReviewPage = async (page: number, append = false) => {
    if (!id) return
    setReviewLoading(true)
    try {
      const response = await fetch(
        `${API_BASE}/api/player-reviews/posts?playerId=${encodeURIComponent(String(id))}&page=${page}&pageSize=5`,
      )
      const result = await response.json()
      const items = Array.isArray(result.items) ? result.items : []
      const totalCount = Number(result.totalCount ?? 0) || 0

      setReviewItems((current) => (append ? [...current, ...items] : items))
      setReviewCount(totalCount)
      setReviewPage(page)
      setReviewHasMore(page * 5 < totalCount)
    } catch {
      if (!append) {
        setReviewItems([])
        setReviewCount(0)
        setReviewHasMore(false)
      }
    } finally {
      setReviewLoading(false)
    }
  }

  useEffect(() => {
    void fetchReviewPage(1, false)
  }, [id])

  const currentPrice = detail?.prices[strongLevel]
    ? abbreviateKRW(detail.prices[strongLevel])
    : '-'

  const posColors = getPositionColors(detail?.position ?? null, isDark)

  /** 강화/적응도/팀컬러 부스트 계산 */
  const abilityBoost = getStrongPoint(strongLevel) - getStrongPoint(1)
  const chemistryBoost = isChemistryApplied ? 4 : 0
  const totalStatBoost = abilityBoost + chemistryBoost + teamColorBoost
  const currentOverall =
    detail?.overall != null
      ? detail.overall - getStrongPoint(1) + getStrongPoint(strongLevel) + chemistryBoost + teamColorBoost
      : null
  const adjustedTotalAbility =
    detail?.totalAbility != null
      ? detail.totalAbility + totalStatBoost * detail.abilities.length
      : null
  const clubHistory = Array.isArray(detail?.clubHistory) ? detail.clubHistory : []

  /** 능력치 정렬 (웹과 동일한 ABILITY_GROUPS 순서) */
  const orderedAbilities = detail?.abilities.slice().sort((a, b) => {
    const order = ABILITY_GROUPS.flat() as string[]
    const ai = order.indexOf(a.name)
    const bi = order.indexOf(b.name)
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  }) ?? []

  const showLeftFade = levelScrollX > 4
  const showRightFade = levelContentWidth - levelViewportWidth - levelScrollX > 4

  useEffect(() => {
    const activeLayout = levelTabLayouts.current[strongLevel]
    if (!activeLayout || levelViewportWidth <= 0) {
      return
    }

    const maxScrollX = Math.max(0, levelContentWidth - levelViewportWidth)
    const targetX = activeLayout.x - (levelViewportWidth - activeLayout.width) / 2

    levelScrollRef.current?.scrollTo({
      x: Math.min(Math.max(0, targetX), maxScrollX),
      animated: true,
    })
  }, [strongLevel, levelViewportWidth, levelContentWidth])

  const handleLevelTabLayout = (level: number, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout
    levelTabLayouts.current[level] = { x, width }
  }

  const handleLevelScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setLevelScrollX(event.nativeEvent.contentOffset.x)
  }

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: tabBarHeight + 16 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 헤더 뒤로가기 */}
        <TouchableOpacity style={s.backRow} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={colors.title} />
          <Text style={s.backText} numberOfLines={1}>{playerName || '선수 정보'}</Text>
        </TouchableOpacity>

        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color={colors.accentBlue} />
          </View>
        ) : !detail ? (
          <View style={s.loadingWrap}>
            <Text style={[s.emptyText, { color: colors.bodyText }]}>선수 정보를 불러올 수 없어요</Text>
          </View>
        ) : (
          <>
            {/* ── 선수 카드 ── */}
            <View style={s.card}>
              {/* 이미지 + 이름/포지션/오버롤 */}
              <View style={s.playerRow}>
                <View style={[s.thumbWrap, { backgroundColor: colors.surfaceStrong }]}>
                  <Image
                    source={{ uri: `https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p${id}.png` }}
                    style={{ width: 96, height: 96 }}
                    resizeMode="contain"
                  />
                </View>

                <View style={s.playerInfo}>
                  {/* 시즌 배지 + 선수 이름 */}
                  <View style={s.nameRow}>
                    {(seasonImg || detail.seasonImg) && (
                      <Image
                        source={{ uri: seasonImg ?? detail.seasonImg ?? undefined }}
                        style={s.seasonBadge}
                        resizeMode="contain"
                      />
                    )}
                    <Text style={[s.playerName, { color: colors.title }]} numberOfLines={1}>
                      {playerName || detail.name}
                    </Text>
                  </View>

                  {/* 포지션 배지 + 오버롤 */}
                  <View style={s.posOverallRow}>
                    {detail.position && (
                      <View style={[s.posBadge, { backgroundColor: posColors.bg }]}>
                        <Text style={[s.posBadgeText, { color: posColors.fg }]}>{detail.position}</Text>
                      </View>
                    )}
                    {currentOverall != null && (
                      <Text style={[s.overallText, { color: colors.title }]}>{currentOverall}</Text>
                    )}
                  </View>

                  {/* 시즌명 */}
                  {(seasonName || detail.seasonName) && (
                    <Text style={[s.seasonName, { color: colors.bodyText }]}>
                      {seasonName ?? detail.seasonName}
                    </Text>
                  )}

                  {/* 국적 · 팀 */}
                  {(detail.nationName || detail.teamName) && (
                    <Text style={[s.teamText, { color: colors.mutedText }]} numberOfLines={1}>
                      {[detail.nationName, detail.teamName].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                </View>
              </View>

              {/* ── 정보 카드 그리드 (2열) ── */}
              <View style={s.infoGrid}>
                <FootInfoCard leftFoot={detail.leftFoot} rightFoot={detail.rightFoot} colors={colors} />
                <NationCard nationName={detail.nationName} nationLogo={detail.nationLogo} colors={colors} />
                <InfoCard label="키" value={detail.height ? `${detail.height}cm` : '-'} colors={colors} />
                <InfoCard label="몸무게" value={detail.weight ? `${detail.weight}kg` : '-'} colors={colors} />
                <InfoCard label="체형" value={normalizeBodyType(detail.bodyType)} colors={colors} />
                <InfoCard label="급여" value={detail.pay?.toString() ?? '-'} colors={colors} />
              </View>

              {/* ── 특성 블럭 ── */}
              {Array.isArray(detail.traits) && detail.traits.length > 0 && (
                <View style={[s.traitsBlock, { backgroundColor: colors.surfaceSoft }]}>
                  <Text style={[s.priceLabel, { color: colors.mutedText }]}>특성</Text>
                  {/* 특성 아이콘 */}
                  {detail.traits.some((t) => t.iconSrc) && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                      {detail.traits
                        .filter((t) => t.iconSrc)
                        .map((t, i) => (
                          <Image
                            key={`icon-${i}`}
                            source={{ uri: t.iconSrc! }}
                            style={{ width: 44, height: 44 }}
                            resizeMode="contain"
                          />
                        ))}
                    </View>
                  )}
                  {/* 특성 이름 */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 10, gap: 4 }}>
                    {detail.traits.map((t, i) => (
                      <View key={`name-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        {i > 0 && <Text style={[s.traitSep, { color: colors.mutedText }]}>|</Text>}
                        <Text style={[s.traitName, { color: colors.bodyText }]}>{t.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>

            <View style={s.tabSection}>
              <TouchableOpacity
                onPress={() => setActiveTab('detail')}
                activeOpacity={0.8}
                style={[
                  s.topTabButton,
                  activeTab === 'detail'
                    ? s.topTabButtonActive
                    : { backgroundColor: colors.surfaceSoft, borderColor: colors.cardBorder },
                ]}
              >
                <Text style={[s.topTabText, { color: activeTab === 'detail' ? '#ffffff' : colors.mutedText }]}>
                  선수 상세
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('review')}
                activeOpacity={0.8}
                style={[
                  s.topTabButton,
                  activeTab === 'review'
                    ? s.topTabButtonActive
                    : { backgroundColor: colors.surfaceSoft, borderColor: colors.cardBorder },
                ]}
              >
                <View style={s.topTabReviewRow}>
                  <Text style={[s.topTabText, { color: activeTab === 'review' ? '#ffffff' : colors.mutedText }]}>
                    선수 평가
                  </Text>
                  <Text style={[s.topTabCount, { color: activeTab === 'review' ? '#ffffff' : '#457ae5' }]}>
                    {reviewCount.toLocaleString()}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {activeTab === 'detail' && orderedAbilities.length > 0 && (
              <View style={s.card}>
                <View style={s.sectionHeaderRow}>
                  <Text style={[s.sectionTitle, { color: colors.title }]}>능력치</Text>
                  {adjustedTotalAbility != null && (
                    <Text style={[s.totalAbilityLabel, { color: colors.title }]}>
                      총 능력치{' '}
                      <Text
                        style={[s.totalAbilityValue, {
                          color: getStatColor(
                            Math.round(adjustedTotalAbility / Math.max(1, orderedAbilities.length)),
                          ),
                        }]}
                      >
                        {adjustedTotalAbility.toLocaleString()}
                      </Text>
                    </Text>
                  )}
                </View>

                {/* 강화 레벨 가로 스크롤 pill */}
                <View
                  style={s.levelScrollWrap}
                  onLayout={(event) => setLevelViewportWidth(event.nativeEvent.layout.width)}
                >
                  {showLeftFade && <HorizontalEdgeFade side="left" color={colors.cardBg} />}
                  {showRightFade && <HorizontalEdgeFade side="right" color={colors.cardBg} />}

                  <ScrollView
                    ref={levelScrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleLevelScroll}
                    scrollEventThrottle={16}
                    onContentSizeChange={(width) => setLevelContentWidth(width)}
                    contentContainerStyle={s.levelScrollContent}
                  >
                    {STRONG_LEVELS.map((level) => (
                      <TouchableOpacity
                        key={level}
                        onLayout={(event) => handleLevelTabLayout(level, event)}
                        onPress={() => setStrongLevel(level)}
                        activeOpacity={0.75}
                        style={[
                          s.levelPill,
                          strongLevel === level
                            ? s.levelPillActive
                            : { backgroundColor: isDark ? colors.surfaceSoft : '#ffffff', borderColor: colors.cardBorder },
                        ]}
                      >
                        <Text style={[s.levelPillText, { color: strongLevel === level ? '#fff' : colors.bodyText }]}>
                          {level}카
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* 적응도 토글 - 마이페이지 테마 스위치와 동일한 스타일 */}
                <TouchableOpacity
                  onPress={handleChemToggle}
                  activeOpacity={0.85}
                  style={[s.controlRow, s.controlRowFirst, { backgroundColor: colors.surfaceSoft }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={[s.controlLabel, { color: colors.title }]}>적응도</Text>
                    <Text style={[s.controlSub, { color: isChemistryApplied ? '#457ae5' : colors.mutedText }]}>
                      {isChemistryApplied ? '적용중' : '미적용'}
                    </Text>
                  </View>
                  <View
                    style={[
                      s.toggle,
                      { backgroundColor: isChemistryApplied ? '#457ae5' : '#d5dbe3' },
                    ]}
                  >
                    <Animated.View
                      style={[s.toggleThumb, { transform: [{ translateX: chemThumbX }] }]}
                    />
                  </View>
                </TouchableOpacity>

                {/* 팀컬러 셀렉트박스 */}
                <TouchableOpacity
                  onPress={() => setShowTeamColorPicker(true)}
                  activeOpacity={0.85}
                  style={[s.controlRow, { backgroundColor: colors.surfaceSoft }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={[s.controlLabel, { color: colors.title }]}>팀컬러</Text>
                    <Text style={[s.controlSub, { color: teamColorBoost > 0 ? '#457ae5' : colors.mutedText }]}>
                      {teamColorBoost > 0 ? '적용중' : '미적용'}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[s.controlLabel, { color: teamColorBoost > 0 ? '#457ae5' : colors.mutedText }]}>
                      {teamColorBoost > 0 ? `+${teamColorBoost}` : '0'}
                    </Text>
                    <Feather name="chevron-down" size={14} color={colors.mutedText} />
                  </View>
                </TouchableOpacity>

                {/* 현재 금액 */}
                <View style={[s.controlRow, { backgroundColor: colors.surfaceSoft }]}>
                  <Text style={[s.controlLabel, { color: colors.mutedText }]}>현재 금액</Text>
                  <Text style={[s.controlLabel, { color: colors.title }]}>{currentPrice}</Text>
                </View>

                {/* 개인기 - 강화 레벨에 따라 별 수 변동 (웹과 동일) */}
                {detail.skillMove != null && (
                  <View style={[s.controlRow, { backgroundColor: colors.surfaceSoft }]}>
                    <Text style={[s.controlLabel, { color: colors.mutedText }]}>개인기</Text>
                    <View style={{ flexDirection: 'row', gap: 2 }}>
                      {Array.from({ length: 6 }, (_, i) => (
                        <Text
                          key={i}
                          style={{ fontSize: 18, color: i < calculateSkillMoveStars(detail.skillMove, strongLevel) ? '#F1C018' : '#d1d5db' }}
                        >
                          ★
                        </Text>
                      ))}
                    </View>
                  </View>
                )}

                {/* 능력치 2열 그리드 */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
                  {orderedAbilities.map((ab) => (
                    <AbilityCard
                      key={ab.name}
                      stat={ab}
                      abilityBoost={abilityBoost}
                      chemistryBoost={chemistryBoost}
                      teamColorBoost={teamColorBoost}
                      boostColor={boostColor}
                      colors={colors}
                    />
                  ))}
                </View>
              </View>
            )}

            {activeTab === 'detail' && clubHistory.length > 0 && (
              <View style={s.card}>
                <Text style={[s.sectionTitle, { color: colors.title }]}>소속 정보</Text>
                <View style={{ marginTop: 14 }}>
                  <Text style={[s.clubHistoryLabel, { color: colors.mutedText }]}>이전 소속팀</Text>
                  <View style={{ gap: 8, marginTop: 12 }}>
                    {clubHistory.map((club, index) => (
                      <View
                        key={`${club.year}-${club.club}-${index}`}
                        style={[s.clubHistoryItem, { backgroundColor: colors.surfaceSoft }]}
                      >
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[s.clubHistoryClub, { color: colors.title }]} numberOfLines={1}>
                            {club.club}
                          </Text>
                          <Text style={[s.clubHistoryYear, { color: colors.mutedText }]}>
                            {club.year}
                          </Text>
                        </View>
                        {club.rent && (
                          <Text style={[s.clubHistoryRent, { color: colors.bodyText }]}>
                            {club.rent}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {activeTab === 'review' && (
              <View style={s.card}>
                <View style={s.reviewHeaderRow}>
                  <Text style={[s.sectionTitle, { color: colors.title }]}>선수 평가</Text>
                  <Text style={[s.reviewHeaderCount, { color: colors.mutedText }]}>
                    총 {reviewCount.toLocaleString()}개
                  </Text>
                </View>

                {reviewLoading && reviewItems.length === 0 ? (
                  <View style={s.reviewStateWrap}>
                    <ActivityIndicator size="small" color={colors.accentBlue} />
                    <Text style={[s.reviewStateText, { color: colors.bodyText }]}>선수 평가를 불러오는 중이에요</Text>
                  </View>
                ) : reviewItems.length === 0 ? (
                  <View style={s.reviewStateWrap}>
                    <Text style={[s.reviewStateText, { color: colors.bodyText }]}>아직 등록된 선수 평가가 없습니다.</Text>
                  </View>
                ) : (
                  <View style={{ marginTop: 14, gap: 10 }}>
                    {reviewItems.map((item) => (
                      <View
                        key={item.id}
                        style={[s.reviewItemCard, { backgroundColor: colors.surfaceSoft }]}
                      >
                        <View style={s.reviewMetaRow}>
                          <View style={s.reviewMetaLeft}>
                            <Text style={[s.reviewNickname, { color: colors.title }]} numberOfLines={1}>
                              {item.nickname}
                            </Text>
                            <Text style={[s.reviewDot, { color: colors.mutedText }]}>·</Text>
                            <Text style={[s.reviewTime, { color: colors.mutedText }]}>{item.createdAtLabel}</Text>
                          </View>
                        </View>

                        <Text style={[s.reviewTitle, { color: colors.title }]} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={[s.reviewBody, { color: colors.bodyText }]} numberOfLines={3}>
                          {item.content}
                        </Text>

                        <View style={s.reviewFooterRow}>
                          <Text style={[s.reviewFooterText, { color: colors.mutedText }]}>
                            댓글 <Text style={{ color: '#457ae5', fontWeight: '600' }}>{item.commentCount}</Text>
                          </Text>
                          <Text style={[s.reviewFooterText, { color: colors.mutedText }]}>
                            좋아요 <Text style={{ color: '#457ae5', fontWeight: '600' }}>{item.likeCount}</Text>
                          </Text>
                        </View>
                      </View>
                    ))}

                    {reviewHasMore && (
                      <TouchableOpacity
                        onPress={() => void fetchReviewPage(reviewPage + 1, true)}
                        activeOpacity={0.8}
                        style={[s.reviewMoreButton, { borderColor: colors.cardBorder, backgroundColor: colors.cardBg }]}
                      >
                        {reviewLoading ? (
                          <ActivityIndicator size="small" color={colors.accentBlue} />
                        ) : (
                          <Text style={[s.reviewMoreText, { color: colors.title }]}>선수 평가 더 보기</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )}

            <View style={{ height: 8 }} />
          </>
        )}
      </ScrollView>

      {/* 팀컬러 선택 Modal */}
      <Modal visible={showTeamColorPicker} transparent animationType="fade" onRequestClose={() => setShowTeamColorPicker(false)}>
        <TouchableOpacity style={teamPickerStyle.overlay} onPress={() => setShowTeamColorPicker(false)} activeOpacity={1}>
          <View style={[teamPickerStyle.sheet, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Text style={[teamPickerStyle.sheetTitle, { color: colors.mutedText }]}>팀컬러 부스트 선택</Text>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((val, i) => (
              <TouchableOpacity
                key={val}
                style={[
                  teamPickerStyle.option,
                  i < 9 && { borderBottomWidth: 1, borderBottomColor: colors.divider },
                ]}
                onPress={() => { setTeamColorBoost(val); setShowTeamColorPicker(false) }}
                activeOpacity={0.7}
              >
                <Text style={[teamPickerStyle.optionText, { color: val === teamColorBoost ? '#457ae5' : colors.title }, val === teamColorBoost && { fontWeight: '700' }]}>
                  {val === 0 ? '미적용 (0)' : `+${val}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  )
}

// ────────────────────────────────────────────────────────────────
// 스타일
// ────────────────────────────────────────────────────────────────

const styles = (c: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.pageBg },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 16, gap: 12 },
    backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 28, marginBottom: 4 },
    backText: { fontSize: 18, fontWeight: '700', color: c.title, letterSpacing: -0.4, flex: 1 },
    loadingWrap: { flex: 1, paddingVertical: 48, alignItems: 'center', justifyContent: 'center' },
    emptyText: { fontSize: 14, textAlign: 'center' },

    /* 선수 카드 */
    card: {
      backgroundColor: c.cardBg,
      borderRadius: 16,
      paddingHorizontal: 20,
      paddingVertical: 20,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    playerRow: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
    thumbWrap: { width: 96, height: 96, borderRadius: 12, overflow: 'hidden', flexShrink: 0 },
    playerInfo: { flex: 1, minWidth: 0 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    seasonBadge: { width: 24, height: 17 },
    playerName: { fontSize: 20, fontWeight: '700', letterSpacing: -0.4, flexShrink: 1 },
    posOverallRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
    posBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    posBadgeText: { fontSize: 13, fontWeight: '700' },
    overallText: { fontSize: 18, fontWeight: '800', letterSpacing: -0.4 },
    seasonName: { fontSize: 13, fontWeight: '500', marginTop: 4 },
    teamText: { fontSize: 12, fontWeight: '500', marginTop: 3 },

    /* InfoCard 그리드 */
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },

    /* 능력치 카드 */
    tabSection: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
    topTabButton: {
      flex: 1,
      height: 48,
      borderRadius: 999,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    topTabButtonActive: { backgroundColor: '#457ae5', borderColor: '#457ae5' },
    topTabText: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
    topTabReviewRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    topTabCount: { fontSize: 15, fontWeight: '700' },
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    sectionTitle: { fontSize: 15, fontWeight: '700' },
    totalAbilityLabel: { fontSize: 13, fontWeight: '700' },
    totalAbilityValue: { fontWeight: '700' },
    levelScrollWrap: { marginTop: 14, position: 'relative' },
    levelScrollContent: { gap: 8, paddingHorizontal: 2, paddingBottom: 1 },
    levelPill: {
      borderRadius: 100,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    levelPillActive: { backgroundColor: '#256ef4', borderColor: '#256ef4' },
    levelPillText: { fontSize: 13, fontWeight: '600' },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginTop: 10,
    },
    priceLabel: { fontSize: 13, fontWeight: '500' },
    priceValue: { fontSize: 14, fontWeight: '600' },

    /* 적응도/팀컬러/현재금액/개인기 공통 row */
    controlRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginTop: 10, minHeight: 52,
    },
    controlRowFirst: { marginTop: 16 },
    controlLabel: { fontSize: 14, fontWeight: '600' },
    controlSub: { fontSize: 13, fontWeight: '500' },

    /* 적응도 토글 - 마이페이지와 동일 */
    toggle: { width: 64, height: 28, borderRadius: 999, padding: 3, justifyContent: 'center', flexShrink: 0 },
    toggleThumb: {
      width: 34, height: 22, borderRadius: 999, backgroundColor: '#ffffff',
    },

    /* 특성 블럭 */
    traitsBlock: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginTop: 10 },
    traitSep: { fontSize: 13, fontWeight: '500', opacity: 0.4 },
    traitName: { fontSize: 13, fontWeight: '500', lineHeight: 20 },

    /* 소속 정보 */
    clubHistoryLabel: { fontSize: 12, fontWeight: '500' },
    clubHistoryItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    clubHistoryClub: { fontSize: 14, fontWeight: '700' },
    clubHistoryYear: { fontSize: 12, fontWeight: '500', marginTop: 4 },
    clubHistoryRent: { fontSize: 12, fontWeight: '500', flexShrink: 0, marginTop: 1 },

    /* 선수 평가 */
    reviewHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    reviewHeaderCount: { fontSize: 12, fontWeight: '500' },
    reviewStateWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 28, gap: 10 },
    reviewStateText: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
    reviewItemCard: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14 },
    reviewMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    reviewMetaLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 },
    reviewNickname: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
    reviewDot: { fontSize: 12, fontWeight: '500' },
    reviewTime: { fontSize: 12, fontWeight: '500' },
    reviewTitle: { fontSize: 15, fontWeight: '700', marginTop: 10 },
    reviewBody: { fontSize: 13, fontWeight: '500', lineHeight: 20, marginTop: 8 },
    reviewFooterRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 12 },
    reviewFooterText: { fontSize: 12, fontWeight: '500' },
    reviewMoreButton: {
      height: 44,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    reviewMoreText: { fontSize: 14, fontWeight: '700' },
  })

const teamPickerStyle = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  sheet: { width: '100%', maxWidth: 240, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  sheetTitle: { fontSize: 11, fontWeight: '600', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  option: { paddingHorizontal: 20, paddingVertical: 14 },
  optionText: { fontSize: 15, fontWeight: '500' },
})
