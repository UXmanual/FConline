import { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  useWindowDimensions,
  Animated,
  PanResponder,
} from 'react-native'
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Polygon, Rect, Text as SvgText } from 'react-native-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useLocalSearchParams, router } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import { useTheme } from '@/hooks/useTheme'
import { Text } from '@/components/Themed'
import { API_BASE } from '@/constants/api'
import { PlayerImage } from '@/components/PlayerImage'

type FormationPlayer = {
  spId: number | null
  spPosition: number
  positionLabel: string
  enhancement: number
  pay: number | null
  price: string | null
  playerName: string | null
  seasonImg: string | null
  overallBase: number | null
  enhancementChemBoost: number
  teamColorBoost: number
}

type FormationData = {
  formation: string
  matchDate: string
  adaptationBoost: number
  teamColorNames: string[]
  appliedBoostLabels: string[]
  players: FormationPlayer[]
}

function calcSquadStats(players: FormationPlayer[]) {
  const totalPay = players.reduce((sum, p) => sum + (p.pay ?? 0), 0)
  const totalPriceNum = players.reduce((sum, p) => {
    if (!p.price) return sum
    return sum + parseRawPriceNum(p.price)
  }, 0)
  return { totalPay, totalPriceNum }
}

const POSITION_COORDS: Record<number, [number, number]> = {
  0:  [50, 89], // GK
  1:  [50, 80], // SW
  2:  [91, 71], // RWB
  3:  [87, 78], // RB
  4:  [66, 78], // RCB
  5:  [50, 78], // CB
  6:  [34, 78], // LCB
  7:  [13, 78], // LB
  8:  [9,  71], // LWB
  9:  [73, 64], // RDM
  10: [50, 64], // CDM
  11: [27, 64], // LDM
  12: [93, 50], // RM
  13: [65, 50], // RCM
  14: [50, 50], // CM
  15: [35, 50], // LCM
  16: [7,  50], // LM
  17: [79, 37], // RAM
  18: [50, 37], // CAM
  19: [21, 37], // LAM
  20: [76, 26], // RF
  21: [50, 26], // CF
  22: [24, 26], // LF
  23: [91, 23], // RW
  24: [67, 14], // RS
  25: [50, 14], // ST
  26: [33, 14], // LS
  27: [9,  23], // LW
}

const STRONG_POINT_TABLE = [0, 3, 4, 5, 7, 9, 11, 14, 18, 20, 22, 24, 27, 30]
function getStrongPoint(level: number) { return STRONG_POINT_TABLE[level] ?? 0 }

function getPositionColor(spPosition: number): string {
  if (spPosition === 0) return '#f5c842'
  if (spPosition <= 8) return '#4fa3f7'
  if (spPosition <= 19) return '#4fc87a'
  return '#f76464'
}

type EnhGrade = {
  gradStart: string; gradEnd: string
  text: string; border: string
  platinum?: boolean
}

function getEnhancementGrade(level: number): EnhGrade {
  if (level <= 1)  return { gradStart: '#51545a', gradEnd: '#42464d', text: '#c5c8c9', border: '#393a3c' }
  if (level <= 4)  return { gradStart: '#de946b', gradEnd: '#ad5f42', text: '#7e3f27', border: '#864229' }
  if (level <= 7)  return { gradStart: '#d8d9dc', gradEnd: '#b8bdca', text: '#4e545e', border: '#a5a8ae' }
  if (level <= 10) return { gradStart: '#f9dd62', gradEnd: '#dca908', text: '#695100', border: '#cda000' }
  return { gradStart: 'transparent', gradEnd: 'transparent', text: '#2d2b43', border: '#5274c0', platinum: true }
}

function PayHexBadge({ value }: { value: number }) {
  return (
    <Svg width={18} height={20} viewBox="0 0 18 20">
      <Polygon
        points="9,1 17,5.5 17,14.5 9,19 1,14.5 1,5.5"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="1.2"
        fill="none"
      />
      <SvgText
        x="9"
        y="10"
        textAnchor="middle"
        alignmentBaseline="central"
        fontSize="7"
        fontWeight="600"
        fill="rgba(255,255,255,0.85)"
      >
        {String(value)}
      </SvgText>
    </Svg>
  )
}

function EnhancementBadge({ level }: { level: number }) {
  const enh = getEnhancementGrade(level)
  const W = 16
  const H = 14
  const gradId = `enh_${level}`

  if (enh.platinum) {
    return (
      <View style={{ width: W, height: H, borderRadius: 2, borderWidth: 1, borderColor: enh.border, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        <Image
          source={{ uri: 'https://ssl.nexon.com/s2/game/fc/online/obt/datacenter/bg_plt.png' }}
          style={{ position: 'absolute', width: W, height: H }}
          resizeMode="stretch"
        />
        <Text style={{ fontSize: 9, fontWeight: '800', color: enh.text, lineHeight: H }}>
          {level}
        </Text>
      </View>
    )
  }

  return (
    <View style={{ borderRadius: 2, borderWidth: 1, borderColor: enh.border, overflow: 'hidden' }}>
      <Svg width={W} height={H}>
        <Defs>
          <SvgLinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={enh.gradStart} />
            <Stop offset="1" stopColor={enh.gradEnd} />
          </SvgLinearGradient>
        </Defs>
        <Rect x="0" y="0" width={W} height={H} fill={`url(#${gradId})`} />
        <SvgText
          x={W / 2}
          y={H / 2}
          textAnchor="middle"
          alignmentBaseline="central"
          fontSize="9"
          fontWeight="800"
          fill={enh.text}
        >
          {String(level)}
        </SvgText>
      </Svg>
    </View>
  )
}

function addCommas(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function parseRawPriceNum(price: string): number {
  // 이미 한국 단위 포맷된 경우: "1,500만", "1억 5,000만", "3조", "2경" 등
  const kyungMatch = price.match(/([\d,]+)\s*경/)
  const joMatch = price.match(/([\d,]+)\s*조/)
  const eokMatch = price.match(/([\d,]+)\s*억/)
  const manMatch = price.match(/([\d,]+)\s*만/)
  if (kyungMatch || joMatch || eokMatch || manMatch) {
    const k = kyungMatch ? parseInt(kyungMatch[1].replace(/,/g, ''), 10) : 0
    const j = joMatch ? parseInt(joMatch[1].replace(/,/g, ''), 10) : 0
    const e = eokMatch ? parseInt(eokMatch[1].replace(/,/g, ''), 10) : 0
    const m = manMatch ? parseInt(manMatch[1].replace(/,/g, ''), 10) : 0
    return (isNaN(k) ? 0 : k) * 10000000000000000
      + (isNaN(j) ? 0 : j) * 1000000000000
      + (isNaN(e) ? 0 : e) * 100000000
      + (isNaN(m) ? 0 : m) * 10000
  }
  // 원시 숫자 문자열: "15,000,000" 또는 "15000000"
  return parseInt(price.replace(/[^\d]/g, ''), 10) || 0
}

function formatPrice(price: string | null): string | null {
  if (!price) return null
  const num = parseRawPriceNum(price)
  if (!num) return null
  const kyung = Math.floor(num / 10000000000000000)
  const jo = Math.floor((num % 10000000000000000) / 1000000000000)
  const eok = Math.floor((num % 1000000000000) / 100000000)
  const man = Math.floor((num % 100000000) / 10000)
  const parts: string[] = []
  if (kyung > 0) parts.push(`${addCommas(kyung)}경`)
  if (jo > 0) parts.push(`${addCommas(jo)}조`)
  if (eok > 0) parts.push(`${addCommas(eok)}억`)
  if (man > 0 && kyung === 0 && jo === 0) parts.push(`${addCommas(man)}만`)
  return parts.length > 0 ? parts.join(' ') : `${addCommas(Math.floor(num / 10000))}만`
}


function getDisplayedOverall(player: FormationPlayer, adaptationBoost: number): number | null {
  if (player.overallBase == null) return null
  const enhancementLevel = player.enhancement > 0 ? player.enhancement : 1
  const cardOverall = player.overallBase - getStrongPoint(1) + getStrongPoint(enhancementLevel)
  return cardOverall + player.enhancementChemBoost + adaptationBoost + player.teamColorBoost
}

function PlayerCard({
  player,
  adaptationBoost,
  pitchWidth,
  onDragStart,
  onDragEnd,
}: {
  player: FormationPlayer
  adaptationBoost: number
  pitchWidth: number
  onDragStart?: () => void
  onDragEnd?: () => void
}) {
  const [x, y] = POSITION_COORDS[player.spPosition] ?? [50, 50]
  const displayedOverall = getDisplayedOverall(player, adaptationBoost)
  const posColor = getPositionColor(player.spPosition)
  const shadowStyle = { textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 6 }
  const priceStr = formatPrice(player.price)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const pitchHeight = pitchWidth * 1.6
  const anchorX = (x / 100) * pitchWidth
  const anchorY = (y / 100) * pitchHeight

  const isLeft = x <= 12
  const isRight = x >= 88
  const isTop = y <= 18
  const isBottom = y >= 82
  const alignItems = isLeft ? 'flex-start' : isRight ? 'flex-end' : 'center'

  const dx = size
    ? isLeft ? 0 : isRight ? -size.w : -size.w / 2
    : 0
  const dy = size
    ? isTop ? 0 : isBottom ? -size.h : -size.h / 2
    : 0

  // 드래그 offset (Animated)
  const dragX = useRef(new Animated.Value(0)).current
  const dragY = useRef(new Animated.Value(0)).current
  const dragXCurrent = useRef(0)
  const dragYCurrent = useRef(0)
  const dragXStart = useRef(0)
  const dragYStart = useRef(0)

  // PanResponder가 항상 최신 레이아웃 값을 참조하도록 ref에 보관
  const layoutRef = useRef({ baseLeft: 0, baseTop: 0, cW: 80, cH: 72, pitchWidth: 0, pitchHeight: 0 })
  layoutRef.current = {
    baseLeft: anchorX + dx,
    baseTop: anchorY + dy,
    cW: size?.w ?? 80,
    cH: size?.h ?? 72,
    pitchWidth,
    pitchHeight,
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragXStart.current = dragXCurrent.current
        dragYStart.current = dragYCurrent.current
        setIsDragging(true)
        onDragStart?.()
      },
      onPanResponderMove: (_, gs) => {
        const { baseLeft, baseTop, cW, cH, pitchWidth: pw, pitchHeight: ph } = layoutRef.current
        const rawX = dragXStart.current + gs.dx
        const rawY = dragYStart.current + gs.dy
        const clampedX = Math.max(-baseLeft, Math.min(pw - baseLeft - cW, rawX))
        const clampedY = Math.max(-baseTop, Math.min(ph - baseTop - cH, rawY))
        dragXCurrent.current = clampedX
        dragYCurrent.current = clampedY
        dragX.setValue(clampedX)
        dragY.setValue(clampedY)
      },
      onPanResponderRelease: () => {
        setIsDragging(false)
        onDragEnd?.()
      },
      onPanResponderTerminate: () => {
        setIsDragging(false)
        onDragEnd?.()
      },
    })
  ).current

  return (
    <Animated.View
      {...panResponder.panHandlers}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout
        const w = Math.round(width)
        const h = Math.round(height)
        setSize((prev) => (prev?.w === w && prev?.h === h ? prev : { w, h }))
      }}
      style={{
        position: 'absolute',
        left: anchorX + dx,
        top: anchorY + dy,
        alignItems,
        opacity: size ? 1 : 0,
        zIndex: isDragging ? 100 : 1,
        transform: [{ translateX: dragX }, { translateY: dragY }],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* OVR + 포지션 */}
        <View style={{ marginRight: 3, alignItems: 'center', gap: 4 }}>
          {displayedOverall !== null && (
            <Text style={[{ fontSize: 12, fontWeight: '800', color: '#fff', lineHeight: 14 }, shadowStyle]}>
              {displayedOverall}
            </Text>
          )}
          <Text style={[{ fontSize: 9, fontWeight: '600', color: posColor, lineHeight: 11 }, shadowStyle]}>
            {player.positionLabel}
          </Text>
        </View>

        {/* 선수 이미지 */}
        <View style={{ width: 40, height: 40, overflow: 'hidden' }}>
          {player.spId != null ? (
            <PlayerImage spid={player.spId} size={40} resizeMode="contain" />
          ) : null}
        </View>

        {/* 급여 + 강화단계 */}
        <View style={{ marginLeft: 3, alignItems: 'center', gap: 3 }}>
          {player.pay != null && <PayHexBadge value={player.pay} />}
          {player.enhancement > 0 && <EnhancementBadge level={player.enhancement} />}
        </View>
      </View>

      {/* 시즌엠블럼 + 선수명 + 시세 */}
      <View style={{ marginTop: 4, alignItems, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          {player.seasonImg && (
            <Image source={{ uri: player.seasonImg }} style={{ width: 14, height: 14 }} resizeMode="contain" />
          )}
          {player.playerName && (
            <Text style={[{ fontSize: 11, fontWeight: '600', color: '#fff', lineHeight: 13 }, shadowStyle]} numberOfLines={1}>
              {player.playerName}
            </Text>
          )}
        </View>
        {priceStr && (
          <Text style={[{ fontSize: 9, fontWeight: '500', color: 'rgba(255,255,255,0.7)', lineHeight: 11, alignSelf: 'center' }, shadowStyle]}>
            {priceStr} BP
          </Text>
        )}
      </View>
    </Animated.View>
  )
}

export default function FormationScreen() {
  const { ouid, mode, nickname } = useLocalSearchParams<{ ouid: string; mode: string; nickname: string }>()
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const tabBarHeight = useBottomTabBarHeight()
  const { width: screenWidth } = useWindowDimensions()
  const PITCH_H_MARGIN = 20
  const pitchWidth = screenWidth - PITCH_H_MARGIN * 2

  const [data, setData] = useState<FormationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [scrollEnabled, setScrollEnabled] = useState(true)


  const load = useCallback(async () => {
    if (!ouid) return
    setLoading(true)
    setError(false)
    try {
      const modeParam = mode ?? 'official1on1'
      const nicknameParam = nickname ? `&nickname=${encodeURIComponent(nickname)}` : ''
      const res = await fetch(`${API_BASE}/api/nexon/matches/formation?ouid=${ouid}&mode=${modeParam}${nicknameParam}`)
      const json = await res.json().catch(() => null)
      if (json?.players) {
        setData(json)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [ouid, mode])

  useEffect(() => { void load() }, [load])

  const s = styles(colors, isDark)
  const pitchHeight = pitchWidth * 1.6

  return (
    <View style={[s.safeArea, { paddingTop: insets.top }]}>
      <View style={s.navHeader}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="chevron-left" size={24} color={colors.title} />
        </TouchableOpacity>
        <View style={s.headerTitleWrap} pointerEvents="none">
          <Text style={[s.headerTitle, { color: colors.title }]}>
            {nickname ?? '스쿼드'}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={s.stateWrap}>
          <ActivityIndicator size="large" color={colors.accentBlue} />
        </View>
      ) : error || !data ? (
        <View style={s.stateWrap}>
          <Text style={s.stateText}>스쿼드 정보를 불러올 수 없어요.</Text>
          <Text style={s.stateSubText}>
            최근 경기 기록에 스쿼드 정보가 없거나, 일시적으로 전적 데이터를 가져오지 못했을 수 있어요.
          </Text>
          <TouchableOpacity onPress={load} style={{ marginTop: 12 }}>
            <Text style={{ color: colors.accentBlue, fontWeight: '600' }}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView scrollEnabled={scrollEnabled} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }}>
          {/* 블록 2: 급여 / 포메이션 / BP */}
          {(() => {
            const { totalPay, totalPriceNum } = calcSquadStats(data.players)
            const priceLabel = formatPrice(String(totalPriceNum)) ?? '-'
            const sep = <Text style={[s.statSep, { color: colors.divider }]}>|</Text>
            return (
              <View style={[s.statStrip, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                <Text style={[s.statLabel, { color: colors.bodyText }]}>급여</Text>
                <Text style={[s.statLabel, { color: colors.bodyText }]}><Text style={{ color: colors.accentBlue, fontWeight: '700' }}>{totalPay}</Text>/300</Text>
                {sep}
                <Text style={[s.statLabel, { color: colors.bodyText }]}>포메이션</Text>
                <Text style={[s.statValue, { color: colors.accentBlue }]}>{data.formation}</Text>
                {sep}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Text style={[s.statLabel, { color: colors.bodyText }]}>BP</Text>
                  <Text style={[s.statValue, { color: colors.accentBlue }]}>{totalPriceNum > 0 ? priceLabel : '-'}</Text>
                </View>
              </View>
            )
          })()}

          {/* 피치 */}
          <View style={{ marginHorizontal: PITCH_H_MARGIN, marginTop: 8, borderRadius: 12, overflow: 'hidden', width: pitchWidth, height: pitchHeight }}>
            <Image
              source={require('@/assets/images/ground.jpg')}
              style={{ width: pitchWidth, height: pitchHeight }}
              resizeMode="cover"
            />
            {data.players.map((player) => (
              <PlayerCard
                key={`${player.spId}-${player.spPosition}`}
                player={player}
                adaptationBoost={data.adaptationBoost}
                pitchWidth={pitchWidth}
                onDragStart={() => setScrollEnabled(false)}
                onDragEnd={() => setScrollEnabled(true)}
              />
            ))}
          </View>

          {/* 블록: 오버롤 계산 기준 */}
          <View style={[s.infoCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={[s.infoSection, { paddingBottom: 12 }]}>
              <Text style={[s.infoTitle, { color: colors.title }]}>오버롤 계산 기준</Text>
              <Text style={[s.infoDesc, { color: colors.mutedText }]}>
                기본 오버롤에 강화, 강화팀컬러, 팀컬러, 적응도를 합산해 표시합니다.
              </Text>
            </View>
          </View>

          {/* 블록: 적용 캐미 */}
          <View style={[s.infoCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={[s.infoSection, { paddingBottom: 12 }]}>
              <Text style={[s.infoTitle, { color: colors.title }]}>적용 캐미</Text>
              <Text style={[s.infoDesc, { color: colors.mutedText }]}>
                {data.appliedBoostLabels?.length > 0
                  ? data.appliedBoostLabels.join(' · ')
                  : '자동 적용된 캐미 정보가 없습니다.'}
              </Text>
              {data.teamColorNames?.length > 0 && (
                <Text style={[s.infoDesc, { color: colors.mutedText, marginTop: 2 }]}>
                  적용 중 팀컬러: {data.teamColorNames.join(' · ')}
                </Text>
              )}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  )
}

const styles = (c: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.pageBg },
    navHeader: { paddingHorizontal: 8, height: 56, flexDirection: 'row', alignItems: 'center' },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitleWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
    stateWrap: { paddingHorizontal: 20, paddingTop: 48, paddingBottom: 24, alignItems: 'center', justifyContent: 'center' },
    stateText: { fontSize: 14, textAlign: 'center', color: c.mutedText },
    stateSubText: { fontSize: 13, lineHeight: 19, textAlign: 'center', color: c.mutedText, marginTop: 6 },
    infoCard: { marginHorizontal: 16, marginTop: 12, borderRadius: 12, borderWidth: 1 },
    infoSection: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
    infoSection2: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
    infoTitle: { fontSize: 13, fontWeight: '600', letterSpacing: -0.2 },
    infoDesc: { fontSize: 12, lineHeight: 17, marginTop: 3 },
    statStrip: { marginHorizontal: 16, marginTop: 8, marginBottom: 4, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 5, flexWrap: 'wrap' },
    statLabel: { fontSize: 12, fontWeight: '500' },
    statValue: { fontSize: 12, fontWeight: '700' },
    statSep: { fontSize: 12, marginHorizontal: 2 },
  })
