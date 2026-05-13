import { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
  useWindowDimensions,
} from 'react-native'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useScrollToTop, useFocusEffect } from '@react-navigation/native'
import Svg, { Path } from 'react-native-svg'
import { useTheme } from '@/hooks/useTheme'
import { API_BASE } from '@/constants/api'
import { AppLogo } from '@/components/icons/AppLogo'
import { PlayerActionIcon, AnalysisActionIcon } from '@/components/icons/QuickActionIcons'
import { Text } from '@/components/Themed'

const RECURRING_SEASON_DAYS = 70
const BANNER_ASPECT = 440 / 112

const BANNERS = [
  { id: '01', imageUrl: `${API_BASE}/banners/home-main-banner01@3x.png`, href: null },
  { id: '02', imageUrl: `${API_BASE}/banners/home-main-banner02@3x.png`, href: '/matches' },
  { id: '03', imageUrl: `${API_BASE}/banners/home-main-banner03@3x.png`, href: '/players' },
  { id: '04', imageUrl: `${API_BASE}/banners/home-main-banner04@3x.png`, href: null },
]

// 무한 루프: [마지막 클론, ...원본, 첫번째 클론]
const LOOP_DATA = [
  { ...BANNERS[BANNERS.length - 1], _key: 'clone-last' },
  ...BANNERS.map((b) => ({ ...b, _key: b.id })),
  { ...BANNERS[0], _key: 'clone-first' },
]
const LOOP_REAL_FIRST = 1
const LOOP_REAL_LAST = BANNERS.length

type ControllerUsageItem = {
  label: string
  percentage: string
  record: string
}

type HomeControllerUsage = {
  items: ControllerUsageItem[]
  basisLabel: string
  sourceUrl: string
  unavailable?: boolean
}

type LatestPlayerReviewItem = {
  id: string
  playerId: string
  playerName: string
  nickname: string
  seasonImg: string | null
  title: string
  trimmedTitle: string
  cardLevel: number | null
  createdAt: string
  createdAtLabel: string
}

function getKstNow() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000)
}

function getKstToday() {
  const kst = getKstNow()
  return new Date(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate())
}

function getKoreaDateLabel() {
  const weekdays = ['일', '월', '화', '수', '목', '금', '토']
  const kst = getKstNow()
  return `${kst.getUTCFullYear()}.${kst.getUTCMonth() + 1}.${kst.getUTCDate()} ${weekdays[kst.getUTCDay()] ?? ''}`
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

function formatSeasonDate(date: Date) {
  return `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

function getRecurringSeasonStarts(year: number) {
  const starts: Date[] = []
  const nextYearStart = new Date(year + 1, 0, 1)
  let current = new Date(year, 4, 28)

  while (current < nextYearStart) {
    starts.push(current)
    current = addDays(current, RECURRING_SEASON_DAYS)
  }

  return starts
}

function buildSeasonRanges(year: number) {
  const ranges: { seasonNumber: number; start: Date; end: Date }[] = []
  const season2Start = new Date(year, 2, 19)
  const season3Start = new Date(year, 4, 28)
  const previousStarts = getRecurringSeasonStarts(year - 1)
  const previousLastStart = previousStarts[previousStarts.length - 1]
  const season1Start = previousLastStart ? addDays(previousLastStart, RECURRING_SEASON_DAYS) : new Date(year, 0, 1)

  if (season1Start < season2Start) {
    ranges.push({ seasonNumber: 1, start: season1Start, end: addDays(season2Start, -1) })
  }

  ranges.push({ seasonNumber: 2, start: season2Start, end: addDays(season3Start, -1) })

  getRecurringSeasonStarts(year).forEach((start, index, list) => {
    const next = list[index + 1]
    ranges.push({
      seasonNumber: index + 3,
      start,
      end: next ? addDays(next, -1) : addDays(start, RECURRING_SEASON_DAYS - 1),
    })
  })

  return ranges
}

function getSeasonInfo(today: Date) {
  const year = today.getFullYear()
  const ranges = [...buildSeasonRanges(year - 1), ...buildSeasonRanges(year), ...buildSeasonRanges(year + 1)]
  const current = ranges.find((range) => range.start <= today && today <= range.end) ?? buildSeasonRanges(year)[0]!
  const daysLeft = Math.max(0, Math.ceil((current.end.getTime() - today.getTime()) / 86400000))

  return {
    label: `시즌${current.seasonNumber} 진행 중`,
    period: `${formatSeasonDate(current.start)} - ${formatSeasonDate(current.end)}`,
    daysLeft,
  }
}

function NotificationIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={20} viewBox="0 0 18 20" fill="none">
      <Path d="M2 7C2 3.13401 5.13401 0 9 0C12.866 0 16 3.13401 16 7V14H2V7Z" fill={color} />
      <Path d="M6 17H12C12 18.6569 10.6569 20 9 20C7.34315 20 6 18.6569 6 17Z" fill={color} />
      <Path d="M0 13.5C0 12.1193 1.11929 11 2.5 11H15.5C16.8807 11 18 12.1193 18 13.5C18 14.8807 16.8807 16 15.5 16H2.5C1.11929 16 0 14.8807 0 13.5Z" fill={color} />
    </Svg>
  )
}

function CountdownNumber({ target, isUrgent }: { target: number; isUrgent: boolean }) {
  const [value, setValue] = useState(0)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const startAt = performance.now()

    const tick = (now: number) => {
      const progress = Math.min((now - startAt) / 1400, 1)
      setValue(Math.round(target * (1 - (1 - progress) * (1 - progress))))
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      }
    }

    frameRef.current = requestAnimationFrame(tick)

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [target])

  return (
    <Text style={{ fontSize: 16, fontWeight: '600', color: isUrgent ? '#d14343' : '#9aa3af' }}>
      D-{value}
    </Text>
  )
}

// 웹에서 CSS scroll-snap 애니메이션을 bypass해 즉시 점프
function bannerScrollTo(ref: ScrollView | null, x: number) {
  if (!ref) return
  if (Platform.OS === 'web') {
    const node = (ref as any).getScrollableNode?.() as HTMLElement | null
    if (node) {
      const prev = node.style.scrollBehavior
      node.style.scrollBehavior = 'auto'
      node.scrollLeft = x
      requestAnimationFrame(() => { node.style.scrollBehavior = prev })
      return
    }
  }
  ref.scrollTo({ x, animated: false })
}

export default function HomeScreen() {
  const { colors, isDark } = useTheme()
  const tabBarHeight = useBottomTabBarHeight()
  const router = useRouter()
  const { width: screenWidth } = useWindowDimensions()
  const { label, period, daysLeft } = getSeasonInfo(getKstToday())
  const dateLabel = getKoreaDateLabel()
  const s = styles(colors)
  const bannerWidth = screenWidth - 40
  const bannerHeight = bannerWidth / BANNER_ASPECT
  const [controllerUsage, setControllerUsage] = useState<HomeControllerUsage | null>(null)
  const [latestReviews, setLatestReviews] = useState<LatestPlayerReviewItem[]>([])
  const bannerRef = useRef<ScrollView>(null)
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const jumpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loopIdxRef = useRef(LOOP_REAL_FIRST)
  const bannerWidthRef = useRef(bannerWidth)
  const counterSetterRef = useRef<((n: number) => void) | null>(null)
  const scrollRef = useRef<ScrollView>(null)
  useScrollToTop(scrollRef)
  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false })
    }, []),
  )
  const handleCounterMount = useCallback((setter: (n: number) => void) => {
    counterSetterRef.current = setter
  }, [])
  useEffect(() => { bannerWidthRef.current = bannerWidth }, [bannerWidth])
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      bannerScrollTo(bannerRef.current, bannerWidthRef.current * LOOP_REAL_FIRST)
    })
    return () => cancelAnimationFrame(id)
  }, [])

  const jumpTo = useCallback((idx: number) => {
    loopIdxRef.current = idx
    bannerScrollTo(bannerRef.current, bannerWidthRef.current * idx)
  }, [])

  const startAutoPlay = useCallback(() => {
    if (autoRef.current) clearInterval(autoRef.current)
    autoRef.current = setInterval(() => {
      const bw = bannerWidthRef.current
      const next = loopIdxRef.current + 1
      loopIdxRef.current = next
      bannerRef.current?.scrollTo({ x: bw * next, animated: true })
      counterSetterRef.current?.(next >= LOOP_DATA.length - 1 ? 0 : next - 1)
      if (next === LOOP_DATA.length - 1) {
        if (jumpTimerRef.current) clearTimeout(jumpTimerRef.current)
        jumpTimerRef.current = setTimeout(() => {
          jumpTo(LOOP_REAL_FIRST)
          counterSetterRef.current?.(0)
        }, 350)
      }
    }, 4500)
  }, [jumpTo])

  useEffect(() => {
    startAutoPlay()
    return () => {
      if (autoRef.current) clearInterval(autoRef.current)
    }
  }, [startAutoPlay])

  useEffect(() => {
    fetch(`${API_BASE}/api/home/controller-usage`)
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data?.items) && typeof data?.basisLabel === 'string') {
          setControllerUsage(data)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/api/home/latest-player-reviews`)
      .then((response) => response.json())
      .then((data) => {
        setLatestReviews(Array.isArray(data?.items) ? data.items : [])
      })
      .catch(() => {})
  }, [])

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      <ScrollView ref={scrollRef} style={s.scroll} contentContainerStyle={[s.content, { paddingBottom: tabBarHeight + 12 }]} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <View style={s.logoWrap}>
            <AppLogo isDark={isDark} />
          </View>
          <View style={s.headerRight}>
            <Text style={s.dateLabel}>{dateLabel}</Text>
            <TouchableOpacity style={s.notifBtn} onPress={() => router.push('/notifications' as any)}>
              <NotificationIcon color={colors.navIcon} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.main}>
          <View style={s.card}>
            <View style={s.seasonRow}>
              <Text style={[s.seasonLabel, { color: '#457ae5' }]}>{label}</Text>
              <View style={s.seasonRight}>
                <Text style={[s.seasonPeriod, { color: colors.title }]}>{period}</Text>
                <Text style={[s.sep, { color: colors.mutedText }]}>|</Text>
                {daysLeft > 0 ? (
                  <CountdownNumber target={daysLeft} isUrgent={daysLeft <= 10} />
                ) : (
                  <Text style={[s.countdown, { color: '#d14343' }]}>D-0</Text>
                )}
              </View>
            </View>
          </View>

          <View style={s.quickRow}>
            <TouchableOpacity style={s.quickCard} onPress={() => router.push('/players')}>
              <View style={s.quickText}>
                <Text style={[s.quickTitle, { color: colors.title }]}>선수 이름으로</Text>
                <Text style={[s.quickTitle, { color: colors.title }]}>정보 검색</Text>
              </View>
              <PlayerActionIcon isDark={isDark} />
            </TouchableOpacity>
            <TouchableOpacity style={s.quickCard} onPress={() => router.push('/matches')}>
              <View style={s.quickText}>
                <Text style={[s.quickTitle, { color: colors.title }]}>내 경기</Text>
                <Text style={[s.quickTitle, { color: colors.title }]}>플레이 분석</Text>
              </View>
              <AnalysisActionIcon isDark={isDark} />
            </TouchableOpacity>
          </View>

          <LatestReviews colors={colors} router={router} reviews={latestReviews} />

          <View style={[s.bannerWrap, { height: bannerHeight }]}>
            <ScrollView
              ref={bannerRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              bounces={false}
              overScrollMode="never"
              onMomentumScrollEnd={(e) => {
                if (jumpTimerRef.current) clearTimeout(jumpTimerRef.current)
                const bw = bannerWidthRef.current
                const idx = Math.round(e.nativeEvent.contentOffset.x / bw)
                if (idx === 0) {
                  jumpTo(LOOP_REAL_LAST)
                  counterSetterRef.current?.(BANNERS.length - 1)
                } else if (idx === LOOP_DATA.length - 1) {
                  jumpTo(LOOP_REAL_FIRST)
                  counterSetterRef.current?.(0)
                } else {
                  loopIdxRef.current = idx
                  counterSetterRef.current?.(idx - 1)
                }
                startAutoPlay()
              }}
              onScrollEndDrag={(e) => {
                // web에서 momentum 없이 끝나는 경우 대응
                if (Platform.OS !== 'web') return
                const bw = bannerWidthRef.current
                const idx = Math.round(e.nativeEvent.contentOffset.x / bw)
                if (idx === 0) {
                  jumpTo(LOOP_REAL_LAST)
                  counterSetterRef.current?.(BANNERS.length - 1)
                  startAutoPlay()
                } else if (idx === LOOP_DATA.length - 1) {
                  jumpTo(LOOP_REAL_FIRST)
                  counterSetterRef.current?.(0)
                  startAutoPlay()
                }
              }}
            >
              {LOOP_DATA.map((item) => (
                <TouchableOpacity
                  key={item._key}
                  style={{ width: bannerWidth, height: bannerHeight, backgroundColor: colors.surfaceSoft }}
                  onPress={() => item.href && router.push(item.href as any)}
                  activeOpacity={item.href ? 0.8 : 1}
                >
                  <Image source={{ uri: item.imageUrl }} style={{ width: bannerWidth, height: bannerHeight }} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <BannerCounter
              total={BANNERS.length}
              onMount={handleCounterMount}
              counterStyle={s.bannerCounter}
              textStyle={s.bannerCounterText}
            />
          </View>

          <HomeControllerUsageCard colors={colors} usage={controllerUsage} />

          <TouchableOpacity style={s.card} onPress={() => router.push('/community')}>
            <View style={s.linkRow}>
              <Text style={[s.cardTitle, { color: colors.title }]}>와글와글 커뮤니티 ⌨️</Text>
              <View style={[s.badge, { backgroundColor: colors.actionBadgeBg }]}>
                <Text style={[s.badgeText, { color: colors.actionBadgeFg }]}>참여하기</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={s.card} onPress={() => router.push('/mypage')}>
            <View style={s.linkRow}>
              <Text style={[s.cardTitle, { color: colors.title }]}>화면 설정 ⚙️</Text>
              <View style={[s.badge, { backgroundColor: colors.actionBadgeBg }]}>
                <Text style={[s.badgeText, { color: colors.actionBadgeFg }]}>설정하기</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

function BannerCounter({
  total,
  onMount,
  counterStyle,
  textStyle,
}: {
  total: number
  onMount: (setter: (n: number) => void) => void
  counterStyle: any
  textStyle: any
}) {
  const [idx, setIdx] = useState(0)
  useEffect(() => { onMount(setIdx) }, [onMount])
  return (
    <View style={counterStyle}>
      <Text style={textStyle}>{idx + 1}/{total}</Text>
    </View>
  )
}

function LatestReviews({
  colors,
  router,
  reviews,
}: {
  colors: ReturnType<typeof useTheme>['colors']
  router: any
  reviews: LatestPlayerReviewItem[]
}) {
  const s = styles(colors)

  return (
    <View style={s.card}>
      {reviews.length > 0 ? (
        reviews.map((review, index) => (
          <TouchableOpacity
            key={review.id}
            style={[
              s.reviewRow,
              index < reviews.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
            ]}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/players/[id]',
                params: {
                  id: String(review.playerId),
                  tab: 'review',
                  level: review.cardLevel ? String(review.cardLevel) : '1',
                },
              } as any)
            }
            activeOpacity={0.8}
          >
            <View style={[s.reviewThumb, { backgroundColor: colors.surfaceStrong }]}>
              <Image
                source={{ uri: `https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p${review.playerId}.png` }}
                style={{ width: 48, height: 48 }}
                resizeMode="contain"
              />
            </View>
            <View style={s.reviewInfo}>
              <View style={s.reviewNameRow}>
                {review.seasonImg ? (
                  <Image source={{ uri: review.seasonImg }} style={s.seasonBadge} resizeMode="contain" />
                ) : null}
                <Text style={[s.reviewPlayer, { color: '#457ae5' }]} numberOfLines={1}>
                  {review.playerName}
                </Text>
                {review.cardLevel ? (
                  <>
                    <Text style={[s.reviewMetaDot, { color: colors.mutedText }]}>·</Text>
                    <Text style={[s.cardLevelText, { color: colors.title }]}>{review.cardLevel}카</Text>
                  </>
                ) : null}
              </View>
              <Text style={[s.reviewTitle, { color: colors.title }]} numberOfLines={1}>
                {review.trimmedTitle}
              </Text>
            </View>
            <Text style={[s.reviewTime, { color: colors.mutedText }]}>{review.createdAtLabel}</Text>
          </TouchableOpacity>
        ))
      ) : (
        <Text style={[s.emptyReviewText, { color: colors.bodyText }]}>아직 등록된 선수 평가가 없어요.</Text>
      )}
    </View>
  )
}

function HomeControllerUsageCard({
  colors,
  usage,
}: {
  colors: ReturnType<typeof useTheme>['colors']
  usage: HomeControllerUsage | null
}) {
  const s = styles(colors)
  const [animatedPercentages, setAnimatedPercentages] = useState<number[]>([])

  useEffect(() => {
    if (!usage?.items?.length || usage.unavailable) {
      setAnimatedPercentages([])
      return
    }

    let frameRef: number | null = null
    const targets = usage.items.map((item) => Number(item.percentage.replace('%', '').trim()) || 0)
    const startAt = performance.now()
    const duration = 1500

    const tick = (now: number) => {
      const progress = Math.min((now - startAt) / duration, 1)
      const easedProgress = 1 - (1 - progress) * (1 - progress)
      setAnimatedPercentages(targets.map((target) => target * easedProgress))

      if (progress < 1) {
        frameRef = requestAnimationFrame(tick)
      }
    }

    frameRef = requestAnimationFrame(tick)

    return () => {
      if (frameRef !== null) {
        cancelAnimationFrame(frameRef)
      }
    }
  }, [usage])

  const items = usage?.items ?? [
    { label: '키보드', percentage: '--%', record: '-승-무-패' },
    { label: '패드', percentage: '--%', record: '-승-무-패' },
  ]
  const rawPercentages = items.map((item) => Number(item.percentage.replace('%', '').trim()) || 0)
  const maxPercentage = Math.max(...rawPercentages, 0)

  return (
    <View style={s.card}>
      <View style={s.controllerHeader}>
        <Text style={[s.controllerTitle, { color: colors.title }]}>컨트롤러 이용 비중 🎮</Text>
      </View>
      <Text style={[s.controllerBasis, { color: colors.mutedText }]}>
        {usage?.basisLabel ?? '공식 경기 1 ON 1 | 매일 12시 업데이트 상위 1만명 기준'}
      </Text>

      <View style={s.controllerGrid}>
        {items.map((item, index) => {
          const isPrimary = !usage?.unavailable && rawPercentages[index] === maxPercentage
          const value = animatedPercentages[index] ?? 0
          const percentage = usage?.unavailable
            ? '--%'
            : `${item.percentage.includes('.') ? value.toFixed(1) : Math.round(value)}%`

          return (
            <View key={item.label} style={[s.controllerPanel, { backgroundColor: colors.surfaceSoft }]}>
              <Text style={[s.controllerLabel, { color: colors.bodyText }]}>{item.label}</Text>
              <Text style={[s.controllerPercentage, { color: isPrimary ? '#457ae5' : colors.title }]}>
                {percentage}
              </Text>
              <Text style={[s.controllerRecord, { color: colors.mutedText }]}>{item.record}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = (c: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.pageBg },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 12, gap: 12 },
    main: { gap: 12 },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 },
    logoWrap: { height: 24, justifyContent: 'center' },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    dateLabel: { fontSize: 13, fontWeight: '500', color: c.bodyText },
    notifBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },

    card: {
      backgroundColor: c.cardBg,
      borderRadius: 16,
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    seasonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
    seasonLabel: { fontSize: 18, fontWeight: '700', letterSpacing: -0.36 },
    seasonRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    seasonPeriod: { fontSize: 18, fontWeight: '700', letterSpacing: -0.36 },
    sep: { fontSize: 14, fontWeight: '500' },
    countdown: { fontSize: 16, fontWeight: '600' },

    quickRow: { flexDirection: 'row', gap: 12 },
    quickCard: {
      flex: 1,
      minHeight: 88,
      backgroundColor: c.cardBg,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 20,
      borderWidth: 1,
      borderColor: c.cardBorder,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    quickText: { flex: 1, gap: 4 },
    quickTitle: { fontSize: 15, fontWeight: '500', letterSpacing: -0.3, lineHeight: 18 },

    reviewRow: { paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
    reviewThumb: { width: 48, height: 48, borderRadius: 16, overflow: 'hidden', flexShrink: 0 },
    reviewInfo: { flex: 1, minWidth: 0 },
    reviewNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
    seasonBadge: { width: 20, height: 20 },
    reviewPlayer: { fontSize: 14, fontWeight: '600' },
    reviewMetaDot: { fontSize: 13, fontWeight: '500' },
    cardLevelText: { fontSize: 14, fontWeight: '600' },
    reviewTitle: { marginTop: 4, fontSize: 13, fontWeight: '600', lineHeight: 20 },
    reviewTime: { fontSize: 11, fontWeight: '500', flexShrink: 0 },
    emptyReviewText: { paddingTop: 8, fontSize: 14, fontWeight: '500' },

    bannerWrap: { borderRadius: 16, overflow: 'hidden', position: 'relative' },
    bannerCounter: {
      position: 'absolute',
      right: 12,
      top: 12,
      backgroundColor: 'rgba(0,0,0,0.3)',
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    bannerCounterText: { fontSize: 12, fontWeight: '600', color: '#fff' },

    controllerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    controllerTitle: { fontSize: 14, fontWeight: '600' },
    controllerSource: { fontSize: 11, fontWeight: '500' },
    controllerBasis: { marginTop: 4, fontSize: 12, lineHeight: 20 },
    controllerGrid: { marginTop: 12, flexDirection: 'row', gap: 12 },
    controllerPanel: { flex: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16 },
    controllerLabel: { fontSize: 13, fontWeight: '600' },
    controllerPercentage: { marginTop: 4, fontSize: 22, fontWeight: '800', letterSpacing: -0.66 },
    controllerRecord: { marginTop: 4, fontSize: 12, lineHeight: 20 },

    linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    cardTitle: { fontSize: 14, fontWeight: '600' },
    badge: { borderRadius: 8, paddingHorizontal: 12, height: 28, alignItems: 'center', justifyContent: 'center' },
    badgeText: { fontSize: 12, fontWeight: '600' },
  })
