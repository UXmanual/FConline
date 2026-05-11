import { useEffect, useState } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeft, CaretDown } from 'phosphor-react-native'
import { useTheme } from '@/hooks/useTheme'
import { API_BASE } from '@/constants/api'
import { Text } from '@/components/Themed'

const STRONG_LEVELS = Array.from({ length: 13 }, (_, i) => i + 1)

const STRONG_POINT_TABLE = [0, 0, 1, 2, 3, 5, 7, 10, 13, 17, 21, 25, 29, 33]
function getStrongPoint(level: number) { return STRONG_POINT_TABLE[level] ?? 0 }

const ABILITY_GROUPS = [
  ['속력', '반응 속도'],
  ['가속력', '밸런스'],
  ['골 결정력', '슛 파워'],
  ['중거리 슛', '위치 선정'],
  ['헤더', '짧은 패스'],
  ['긴 패스', '시야'],
  ['커브', '프리킥'],
  ['드리블', '볼 컨트롤'],
  ['민첩성', '침착성'],
  ['태클', '가로채기'],
  ['대인 수비', '슬라이딩 태클'],
  ['몸싸움', '스태미너'],
  ['점프', '키퍼 다이빙'],
  ['키퍼 핸들링', '키퍼 킥'],
  ['키퍼 반응속도', '키퍼 위치 선정'],
] as const

type AbilityStat = {
  name: string
  value: number
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
  prices: Record<number, string>
  nationName: string | null
  teamName: string | null
}

function getStatColor(value: number): string {
  if (value >= 120) return '#d4a017'
  if (value >= 110) return '#f64f5e'
  if (value >= 100) return '#ff8c00'
  if (value >= 90) return '#256ef4'
  if (value >= 60) return '#2f8f57'
  return '#8a949e'
}

function normalizeBodyType(v: string | null) {
  if (!v) return '-'
  return v.replace(/^\s*\(\d+\)\s*$/, '').trim() || '-'
}

export default function PlayerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { colors, isDark } = useTheme()

  const [loading, setLoading] = useState(true)
  const [playerName, setPlayerName] = useState('')
  const [seasonImg, setSeasonImg] = useState<string | null>(null)
  const [seasonName, setSeasonName] = useState<string | null>(null)
  const [detail, setDetail] = useState<PlayerDetail | null>(null)
  const [strongLevel, setStrongLevel] = useState(1)
  const [showLevelPicker, setShowLevelPicker] = useState(false)

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

  const currentOverall =
    detail?.overall != null
      ? detail.overall - getStrongPoint(1) + getStrongPoint(strongLevel)
      : null

  const currentPrice = detail?.prices[strongLevel] ?? '-'

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 헤더 */}
        <TouchableOpacity style={s.backRow} onPress={() => router.back()}>
          <ArrowLeft size={18} color={colors.title} weight="bold" />
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
            {/* 선수 카드 */}
            <View style={s.card}>
              <View style={s.playerRow}>
                <View style={[s.thumbWrap, { backgroundColor: colors.surfaceStrong }]}>
                  <Image
                    source={{ uri: `https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p${id}.png` }}
                    style={{ width: 96, height: 96 }}
                    resizeMode="contain"
                  />
                </View>
                <View style={s.playerInfo}>
                  <View style={s.nameRow}>
                    {(seasonImg || detail.seasonImg) && (
                      <Image source={{ uri: seasonImg ?? detail.seasonImg ?? undefined }} style={s.seasonBadge} resizeMode="contain" />
                    )}
                    <Text style={[s.playerName, { color: colors.title }]} numberOfLines={1}>{playerName || detail.name}</Text>
                  </View>
                  {(seasonName || detail.seasonName) && (
                    <Text style={[s.seasonName, { color: colors.mutedText }]}>{seasonName ?? detail.seasonName}</Text>
                  )}
                  {detail.position && (
                    <Text style={[s.positionText, { color: '#457ae5' }]}>{detail.position}</Text>
                  )}
                  {(detail.nationName || detail.teamName) && (
                    <Text style={[s.teamText, { color: colors.bodyText }]} numberOfLines={1}>
                      {[detail.nationName, detail.teamName].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                </View>
              </View>

              {/* 강화 레벨 선택 */}
              <TouchableOpacity style={[s.levelPicker, { backgroundColor: colors.surfaceSoft, borderColor: colors.cardBorder }]} onPress={() => setShowLevelPicker(true)} activeOpacity={0.8}>
                <Text style={[s.levelPickerText, { color: colors.title }]}>{strongLevel}강</Text>
                <CaretDown size={14} color={colors.bodyText} weight="bold" />
              </TouchableOpacity>

              {/* 기본 스탯 */}
              <View style={[s.statsGrid, { borderTopColor: colors.divider }]}>
                <StatItem label="오버롤" value={currentOverall != null ? String(currentOverall) : '-'} valueColor="#256ef4" colors={colors} />
                <StatItem label="포지션" value={detail.position ?? '-'} valueColor="#f64f5e" colors={colors} />
                <StatItem label="급여" value={detail.pay != null ? String(detail.pay) : '-'} valueColor={colors.title} colors={colors} />
                <StatItem label={`${strongLevel}강 가격`} value={currentPrice} valueColor={colors.title} colors={colors} />
                <StatItem label="체형" value={normalizeBodyType(detail.bodyType)} valueColor={colors.title} colors={colors} />
                <StatItem label="신체" value={detail.height && detail.weight ? `${detail.height}/${detail.weight}` : '-'} valueColor={colors.title} colors={colors} />
                <StatItem label="왼발" value={detail.leftFoot != null ? String(detail.leftFoot) : '-'} valueColor={colors.title} colors={colors} />
                <StatItem label="오른발" value={detail.rightFoot != null ? String(detail.rightFoot) : '-'} valueColor={colors.title} colors={colors} />
                {detail.skillMove != null && (
                  <StatItem label="스킬무브" value={'★'.repeat(detail.skillMove)} valueColor={colors.title} colors={colors} />
                )}
              </View>
            </View>

            {/* 능력치 */}
            {detail.abilities.length > 0 && (
              <View style={s.card}>
                <Text style={[s.sectionTitle, { color: colors.title }]}>능력치</Text>
                <View style={{ marginTop: 12 }}>
                  {detail.abilities.map((ab, i) => (
                    <AbilityRow key={ab.name} stat={ab} strongLevel={strongLevel} isLast={i === detail.abilities.length - 1} colors={colors} />
                  ))}
                </View>
              </View>
            )}

            <View style={{ height: 20 }} />
          </>
        )}
      </ScrollView>

      {/* 강화 단계 모달 */}
      <Modal visible={showLevelPicker} transparent animationType="fade" onRequestClose={() => setShowLevelPicker(false)}>
        <TouchableOpacity style={pickerStyle.overlay} onPress={() => setShowLevelPicker(false)} activeOpacity={1}>
          <View style={[pickerStyle.sheet, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            {STRONG_LEVELS.map((lv, i) => (
              <TouchableOpacity
                key={lv}
                style={[pickerStyle.option, i < STRONG_LEVELS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}
                onPress={() => { setStrongLevel(lv); setShowLevelPicker(false) }}
                activeOpacity={0.7}
              >
                <Text style={[pickerStyle.optionText, { color: lv === strongLevel ? '#457ae5' : colors.title }, lv === strongLevel && { fontWeight: '700' }]}>
                  {lv}강
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  )
}

function StatItem({ label, value, valueColor, colors }: {
  label: string
  value: string
  valueColor: string
  colors: ReturnType<typeof useTheme>['colors']
}) {
  return (
    <View style={[statItemStyle.wrap, { borderBottomColor: colors.divider }]}>
      <Text style={[statItemStyle.label, { color: colors.mutedText }]}>{label}</Text>
      <Text style={[statItemStyle.value, { color: valueColor }]} numberOfLines={1}>{value}</Text>
    </View>
  )
}

const statItemStyle = StyleSheet.create({
  wrap: { width: '50%', paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1 },
  label: { fontSize: 11, fontWeight: '500', marginBottom: 2 },
  value: { fontSize: 14, fontWeight: '700' },
})

function AbilityRow({ stat, strongLevel, isLast, colors }: {
  stat: AbilityStat
  strongLevel: number
  isLast: boolean
  colors: ReturnType<typeof useTheme>['colors']
}) {
  const boosted = stat.value + getStrongPoint(strongLevel) - getStrongPoint(1)
  const barWidth = Math.min(100, Math.round((boosted / 130) * 100))
  const barColor = getStatColor(boosted)

  return (
    <View style={[abilityStyle.row, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
      <Text style={[abilityStyle.name, { color: colors.bodyText }]} numberOfLines={1}>{stat.name}</Text>
      <View style={abilityStyle.barWrap}>
        <View style={[abilityStyle.barTrack, { backgroundColor: colors.surfaceStrong }]}>
          <View style={[abilityStyle.barFill, { width: `${barWidth}%`, backgroundColor: barColor }]} />
        </View>
      </View>
      <Text style={[abilityStyle.value, { color: barColor }]}>{boosted}</Text>
    </View>
  )
}

const abilityStyle = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8 },
  name: { width: 90, fontSize: 12, fontWeight: '500' },
  barWrap: { flex: 1 },
  barTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  value: { width: 32, fontSize: 12, fontWeight: '700', textAlign: 'right' },
})

const pickerStyle = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  sheet: { width: '100%', maxWidth: 200, borderRadius: 14, borderWidth: 1, overflow: 'hidden', maxHeight: 400 },
  option: { paddingHorizontal: 20, paddingVertical: 14 },
  optionText: { fontSize: 15, fontWeight: '500' },
})

const styles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: c.pageBg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 28, marginBottom: 4 },
  backText: { fontSize: 18, fontWeight: '700', color: c.title, letterSpacing: -0.4, flex: 1 },
  loadingWrap: { flex: 1, paddingVertical: 48, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, textAlign: 'center' },
  card: { backgroundColor: c.cardBg, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 16, borderWidth: 1, borderColor: c.cardBorder },
  playerRow: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  thumbWrap: { width: 96, height: 96, borderRadius: 10, overflow: 'hidden', flexShrink: 0 },
  playerInfo: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  seasonBadge: { width: 22, height: 16 },
  playerName: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3, flex: 1 },
  seasonName: { fontSize: 12, fontWeight: '500', marginTop: 4 },
  positionText: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  teamText: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  levelPicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginTop: 16 },
  levelPickerText: { fontSize: 14, fontWeight: '600' },
  statsGrid: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, flexDirection: 'row', flexWrap: 'wrap' },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
})
