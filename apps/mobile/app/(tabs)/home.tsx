import { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Easing,
  useWindowDimensions,
  FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import Svg, { Path } from 'react-native-svg'
import { useTheme } from '@/hooks/useTheme'
import { API_BASE } from '@/constants/api'
import { AppLogo } from '@/components/icons/AppLogo'
import { PlayerActionIcon, AnalysisActionIcon } from '@/components/icons/QuickActionIcons'

// ─── 시즌 계산 ─────────────────────────────────────────────────────────────
const RECURRING_SEASON_DAYS = 70

function getKstToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const year = Number(parts.find((p) => p.type === 'year')?.value ?? 0)
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? 1)
  const day = Number(parts.find((p) => p.type === 'day')?.value ?? 1)
  return new Date(year, month - 1, day)
}

function getKoreaDateLabel() {
  const weekdays = ['일', '월', '화', '수', '목', '금', '토']
  const now = new Date()
  const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  return `${kst.getFullYear()}.${kst.getMonth() + 1}.${kst.getDate()} ${weekdays[kst.getDay()] ?? ''}`
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
  let cur = new Date(year, 4, 28)
  while (cur < nextYearStart) { starts.push(cur); cur = addDays(cur, RECURRING_SEASON_DAYS) }
  return starts
}

function buildSeasonRanges(year: number) {
  const ranges: { seasonNumber: number; start: Date; end: Date }[] = []
  const s2 = new Date(year, 2, 19)
  const s3 = new Date(year, 4, 28)
  const prev = getRecurringSeasonStarts(year - 1)
  const prevLast = prev[prev.length - 1]
  const s1 = prevLast ? addDays(prevLast, RECURRING_SEASON_DAYS) : new Date(year, 0, 1)
  if (s1 < s2) ranges.push({ seasonNumber: 1, start: s1, end: addDays(s2, -1) })
  ranges.push({ seasonNumber: 2, start: s2, end: addDays(s3, -1) })
  getRecurringSeasonStarts(year).forEach((start, i, arr) => {
    const next = arr[i + 1]
    ranges.push({ seasonNumber: i + 3, start, end: next ? addDays(next, -1) : addDays(start, RECURRING_SEASON_DAYS - 1) })
  })
  return ranges
}

function getSeasonInfo(today: Date) {
  const year = today.getFullYear()
  const all = [...buildSeasonRanges(year - 1), ...buildSeasonRanges(year), ...buildSeasonRanges(year + 1)]
  const cur = all.find((r) => r.start <= today && today <= r.end) ?? buildSeasonRanges(year)[0]!
  const daysLeft = Math.max(0, Math.ceil((cur.end.getTime() - today.getTime()) / 86400000))
  return { label: `시즌${cur.seasonNumber} 진행 중`, period: `${formatSeasonDate(cur.start)} - ${formatSeasonDate(cur.end)}`, daysLeft }
}

// ─── 타입 ──────────────────────────────────────────────────────────────────
type Review = {
  id: string; player_id: string; player_name: string
  nickname: string; season_img: string | null; title: string; created_at: string
}

function formatRelativeTime(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}

function trimTitle(title: string) { return title.replace(/^\[\d+카\]\s*/, '').trim() || title }
function getCardLevel(title: string) { const m = title.match(/^\[(\d+)카\]/); return m ? `${m[1]}카` : null }

// ─── 알림 아이콘 (웹과 동일한 SVG) ─────────────────────────────────────────
function NotificationIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={20} viewBox="0 0 18 20" fill="none">
      <Path d="M2 7C2 3.13401 5.13401 0 9 0C12.866 0 16 3.13401 16 7V14H2V7Z" fill={color} />
      <Path d="M6 17H12C12 18.6569 10.6569 20 9 20C7.34315 20 6 18.6569 6 17Z" fill={color} />
      <Path d="M0 13.5C0 12.1193 1.11929 11 2.5 11H15.5C16.8807 11 18 12.1193 18 13.5C18 14.8807 16.8807 16 15.5 16H2.5C1.11929 16 0 14.8807 0 13.5Z" fill={color} />
    </Svg>
  )
}

// ─── 카운트다운 애니메이션 ───────────────────────────────────────────────────
function CountdownNumber({ target, isUrgent }: { target: number; isUrgent: boolean }) {
  const [value, setValue] = useState(0)
  const frameRef = useRef<number | null>(null)
  useEffect(() => {
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / 1400, 1)
      setValue(Math.round(target * (1 - (1 - p) * (1 - p))))
      if (p < 1) frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [target])
  return (
    <Text style={{ fontSize: 16, fontWeight: '600', color: isUrgent ? '#d14343' : '#9aa3af' }}>
      D-{value}
    </Text>
  )
}

// ─── 배너 이미지 ───────────────────────────────────────────────────────────
const BANNER_ASPECT = 440 / 112
const BANNERS = [
  { id: '01', imageUrl: `${API_BASE}/banners/home-main-banner01@3x.png`, href: null },
  { id: '02', imageUrl: `${API_BASE}/banners/home-main-banner02@3x.png`, href: '/matches' },
  { id: '03', imageUrl: `${API_BASE}/banners/home-main-banner03@3x.png`, href: '/players' },
  { id: '04', imageUrl: `${API_BASE}/banners/home-main-banner04@3x.png`, href: null },
]

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { colors, isDark } = useTheme()
  const router = useRouter()
  const today = getKstToday()
  const { label, period, daysLeft } = getSeasonInfo(today)
  const dateLabel = getKoreaDateLabel()
  const s = styles(colors)

  // Banner
  const { width: screenWidth } = useWindowDimensions()
  const bannerWidth = screenWidth - 32
  const bannerHeight = bannerWidth / BANNER_ASPECT
  const [bannerIndex, setBannerIndex] = useState(0)
  const bannerRef = useRef<FlatList>(null)
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    autoRef.current = setInterval(() => {
      setBannerIndex((prev) => {
        const next = (prev + 1) % BANNERS.length
        bannerRef.current?.scrollToIndex({ index: next, animated: true })
        return next
      })
    }, 4500)
    return () => { if (autoRef.current) clearInterval(autoRef.current) }
  }, [])

  return (
    <SafeAreaView style={[s.safeArea]} edges={['top']}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 헤더 — h-6(24px) 컨테이너 안에 로고, 우측에 날짜+알림 */}
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

        {/* 시즌 카드 */}
        <View style={s.card}>
          <View style={s.seasonRow}>
            <Text style={[s.seasonLabel, { color: '#457ae5' }]}>{label}</Text>
            <View style={s.seasonRight}>
              <Text style={[s.seasonPeriod, { color: colors.title }]}>{period}</Text>
              <Text style={[s.sep, { color: colors.mutedText }]}>|</Text>
              {daysLeft > 0
                ? <CountdownNumber target={daysLeft} isUrgent={daysLeft <= 10} />
                : <Text style={[s.countdown, { color: '#d14343' }]}>D-0</Text>}
            </View>
          </View>
        </View>

        {/* 퀵액션 */}
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

        {/* 최신 선수 평가 */}
        <LatestReviews colors={colors} router={router} />

        {/* 배너 캐러셀 */}
        <View style={[s.bannerWrap, { height: bannerHeight }]}>
          <FlatList
            ref={bannerRef}
            data={BANNERS}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / bannerWidth)
              setBannerIndex(idx)
              if (autoRef.current) clearInterval(autoRef.current)
              autoRef.current = setInterval(() => {
                setBannerIndex((prev) => {
                  const next = (prev + 1) % BANNERS.length
                  bannerRef.current?.scrollToIndex({ index: next, animated: true })
                  return next
                })
              }, 4500)
            }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={{ width: bannerWidth, height: bannerHeight, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.surfaceSoft }}
                onPress={() => item.href && router.push(item.href as any)}
                activeOpacity={item.href ? 0.8 : 1}
              >
                <Image source={{ uri: item.imageUrl }} style={{ width: bannerWidth, height: bannerHeight }} resizeMode="cover" />
              </TouchableOpacity>
            )}
          />
          {/* 페이지 카운터 */}
          <View style={s.bannerCounter}>
            <Text style={s.bannerCounterText}>{bannerIndex + 1}/{BANNERS.length}</Text>
          </View>
        </View>

        {/* 커뮤니티 카드 */}
        <TouchableOpacity style={s.card} onPress={() => router.push('/community')}>
          <View style={s.linkRow}>
            <Text style={[s.cardTitle, { color: colors.title }]}>와글와글 커뮤니티 ⌨️</Text>
            <View style={[s.badge, { backgroundColor: colors.actionBadgeBg }]}>
              <Text style={[s.badgeText, { color: colors.actionBadgeFg }]}>참여하기</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* 설정 카드 */}
        <TouchableOpacity style={s.card} onPress={() => router.push('/mypage')}>
          <View style={s.linkRow}>
            <Text style={[s.cardTitle, { color: colors.title }]}>화면 설정 ⚙️</Text>
            <View style={[s.badge, { backgroundColor: colors.actionBadgeBg }]}>
              <Text style={[s.badgeText, { color: colors.actionBadgeFg }]}>설정하기</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── 최신 선수 평가 컴포넌트 ──────────────────────────────────────────────
function LatestReviews({ colors, router }: { colors: ReturnType<typeof useTheme>['colors']; router: any }) {
  const [reviews, setReviews] = useState<Review[]>([])
  const s = styles(colors)

  useEffect(() => {
    fetch(`${API_BASE}/api/player-reviews/posts?limit=3`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data?.posts)) setReviews(data.posts.slice(0, 3)) })
      .catch(() => {})
  }, [])

  return (
    <View style={s.card}>
      {reviews.length > 0 ? reviews.map((review, i) => (
        <TouchableOpacity
          key={review.id}
          style={[s.reviewRow, i < reviews.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}
          onPress={() => router.push(`/players/${review.player_id}?tab=review&postId=${review.id}` as any)}
        >
          <View style={[s.reviewThumb, { backgroundColor: colors.surfaceStrong }]}>
            <Image
              source={{ uri: `https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p${review.player_id}.png` }}
              style={{ width: 48, height: 48 }}
              resizeMode="contain"
            />
          </View>
          <View style={s.reviewInfo}>
            <View style={s.reviewNameRow}>
              {review.season_img && (
                <Image source={{ uri: review.season_img }} style={s.seasonBadge} resizeMode="contain" />
              )}
              <Text style={[s.reviewPlayer, { color: '#457ae5' }]} numberOfLines={1}>{review.player_name}</Text>
              {getCardLevel(review.title) && (
                <Text style={[s.cardLevelText, { color: colors.mutedText }]}> · {getCardLevel(review.title)}</Text>
              )}
            </View>
            <Text style={[s.reviewTitle, { color: colors.title }]} numberOfLines={1}>{trimTitle(review.title)}</Text>
          </View>
          <Text style={[s.reviewTime, { color: colors.mutedText }]}>{formatRelativeTime(review.created_at)}</Text>
        </TouchableOpacity>
      )) : (
        <Text style={[{ fontSize: 14, paddingTop: 8 }, { color: colors.bodyText }]}>아직 등록된 선수 평가가 없어요.</Text>
      )}
    </View>
  )
}

// ─── 스타일 ────────────────────────────────────────────────────────────────
const styles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: c.pageBg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 20, gap: 12 },

  // 헤더 — flex h-6 items-center justify-between (h-6 = 24px)
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 24 },
  logoWrap: { height: 24, justifyContent: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateLabel: { fontSize: 13, fontWeight: '500', color: c.bodyText },
  notifBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },

  // 시즌 카드
  card: {
    backgroundColor: c.cardBg, borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 16,
    borderWidth: 1, borderColor: c.cardBorder,
  },
  seasonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seasonLabel: { fontSize: 15, fontWeight: '700', letterSpacing: -0.3 },
  seasonRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  seasonPeriod: { fontSize: 15, fontWeight: '700', letterSpacing: -0.3 },
  sep: { fontSize: 13, fontWeight: '500' },
  countdown: { fontSize: 16, fontWeight: '600' },

  // 퀵액션 — min-h-[88px] px-4 py-5 flex items-center justify-between
  quickRow: { flexDirection: 'row', gap: 12 },
  quickCard: {
    flex: 1, backgroundColor: c.cardBg, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 20,
    borderWidth: 1, borderColor: c.cardBorder,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: 88,
  },
  quickText: { flex: 1 },
  quickTitle: { fontSize: 15, fontWeight: '600', letterSpacing: -0.3, lineHeight: 21 },

  // 리뷰
  reviewRow: { paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  reviewThumb: { width: 48, height: 48, borderRadius: 8, overflow: 'hidden', flexShrink: 0 },
  reviewInfo: { flex: 1, minWidth: 0 },
  reviewNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  seasonBadge: { width: 20, height: 20 },
  reviewPlayer: { fontSize: 13, fontWeight: '600' },
  cardLevelText: { fontSize: 13, fontWeight: '600' },
  reviewTitle: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  reviewTime: { fontSize: 11, fontWeight: '500', flexShrink: 0 },

  // 배너
  bannerWrap: { borderRadius: 10, overflow: 'hidden', position: 'relative' },
  bannerCounter: {
    position: 'absolute', right: 10, top: 10,
    backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  bannerCounterText: { fontSize: 11, fontWeight: '600', color: '#fff' },

  // 하단 카드
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 14, fontWeight: '600' },
  badge: { borderRadius: 8, paddingHorizontal: 12, height: 28, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 12, fontWeight: '600' },
})
