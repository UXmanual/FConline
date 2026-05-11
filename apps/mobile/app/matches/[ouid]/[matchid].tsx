import { useEffect, useState } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { CaretLeft } from 'phosphor-react-native'
import { useTheme } from '@/hooks/useTheme'
import { API_BASE } from '@/constants/api'
import { Text } from '@/components/Themed'

const MATCH_TYPE_NAMES: Record<number, string> = {
  30: '리그 친선',
  40: '클래식 1on1',
  50: '공식경기',
  52: '감독모드',
  60: '공식 친선',
  204: '볼타 친선',
  214: '볼타 공식',
  224: '볼타 AI 대전',
  234: '볼타 커스텀',
}

type MatchDetail = {
  matchId: string
  matchDate: string
  matchType: number
  matchInfo: Array<{
    ouid: string
    nickname: string
    matchDetail: {
      matchResult: string
      matchEndType: number
      foul: number
      redCards: number
      yellowCards: number
      dribble: number
      cornerKick: number
      possession: number
      averageRating: number
      controller: string
    }
    shoot: {
      shootTotal: number
      effectiveShootTotal: number
      goalTotal: number
      goalTotalDisplay: number
      goalHeading: number
      goalFreekick: number
    }
    pass: {
      shortPassTry: number
      shortPassSuccess: number
      longPassTry: number
      longPassSuccess: number
      bouncingLobPassTry: number
      bouncingLobPassSuccess: number
      drivenGroundPassTry: number
      drivenGroundPassSuccess: number
      throughPassTry: number
      throughPassSuccess: number
      lobbedThroughPassTry: number
      lobbedThroughPassSuccess: number
    }
    defence: {
      blockTry: number
      blockSuccess: number
      tackleTry: number
      tackleSuccess: number
    }
  }>
}

function formatDate(dateStr: string) {
  const normalized = /Z$|[+-]\d{2}:\d{2}$/.test(dateStr) ? dateStr : `${dateStr}Z`
  const d = new Date(normalized)
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function goalDisplay(player: MatchDetail['matchInfo'][0]) {
  return player.shoot.goalTotalDisplay ?? player.shoot.goalTotal ?? 0
}

function calcPassTotal(pass: MatchDetail['matchInfo'][0]['pass']) {
  const tryTotal = (pass.shortPassTry ?? 0) + (pass.longPassTry ?? 0) + (pass.bouncingLobPassTry ?? 0) + (pass.drivenGroundPassTry ?? 0) + (pass.throughPassTry ?? 0) + (pass.lobbedThroughPassTry ?? 0)
  const successTotal = (pass.shortPassSuccess ?? 0) + (pass.longPassSuccess ?? 0) + (pass.bouncingLobPassSuccess ?? 0) + (pass.drivenGroundPassSuccess ?? 0) + (pass.throughPassSuccess ?? 0) + (pass.lobbedThroughPassSuccess ?? 0)
  return { try: tryTotal, success: successTotal }
}

function v(val: number | null | undefined) { return val ?? '-' }

export default function MatchDetailScreen() {
  const { ouid, matchid } = useLocalSearchParams<{ ouid: string; matchid: string }>()
  const router = useRouter()
  const { colors } = useTheme()

  const [loading, setLoading] = useState(true)
  const [match, setMatch] = useState<MatchDetail | null>(null)

  const s = styles(colors)

  useEffect(() => {
    if (!matchid) return
    setLoading(true)
    fetch(`${API_BASE}/api/nexon/matches/detail?matchid=${matchid}`)
      .then((r) => r.json())
      .then((data) => { if (data?.matchId) setMatch(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [matchid])

  const me = match?.matchInfo?.find((p) => p.ouid === ouid) ?? match?.matchInfo?.[0]
  const opponent = match?.matchInfo?.find((p) => p.ouid !== ouid) ?? match?.matchInfo?.[1]

  const meResult = me?.matchDetail.matchResult ?? null
  const opResult = opponent?.matchDetail.matchResult ?? null

  const resultBg = (r: string | null) =>
    r === '승' ? '#256ef4' : r === '패' ? '#f64f5e' : '#8a949e'

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* 헤더 */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <CaretLeft size={20} color={colors.title} weight="bold" />
          </TouchableOpacity>
          {match && (
            <View>
              <Text style={[s.matchType, { color: colors.mutedText }]}>{MATCH_TYPE_NAMES[match.matchType] ?? '경기'}</Text>
              <Text style={[s.matchDate, { color: colors.mutedText }]}>{formatDate(match.matchDate)}</Text>
            </View>
          )}
        </View>

        {loading && (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color={colors.accentBlue} />
          </View>
        )}

        {!loading && !match && (
          <View style={s.loadingWrap}>
            <Text style={{ color: colors.bodyText, fontSize: 14, textAlign: 'center' }}>경기 정보를 불러올 수 없어요.</Text>
          </View>
        )}

        {!loading && match && me && opponent && (
          <>
            {/* 스코어 카드 */}
            <View style={s.card}>
              <View style={s.scoreGrid}>
                {/* 나 */}
                <View style={s.scoreTeam}>
                  <View style={[s.resultBadge, { backgroundColor: resultBg(meResult) }]}>
                    <Text style={s.resultBadgeText}>{meResult ?? '-'}</Text>
                  </View>
                  <Text style={[s.nickname, { color: colors.title }]} numberOfLines={1}>{me.nickname || '-'}</Text>
                  <Text style={[s.goals, { color: colors.title }]}>{goalDisplay(me)}</Text>
                  <Text style={[s.avgRating, { color: colors.mutedText }]}>평점 {me.matchDetail.averageRating?.toFixed(1) ?? '-'}</Text>
                </View>
                {/* VS */}
                <Text style={[s.vsText, { color: colors.mutedText }]}>VS</Text>
                {/* 상대 */}
                <View style={s.scoreTeam}>
                  <View style={[s.resultBadge, { backgroundColor: resultBg(opResult) }]}>
                    <Text style={s.resultBadgeText}>{opResult ?? '-'}</Text>
                  </View>
                  <Text style={[s.nickname, { color: colors.title }]} numberOfLines={1}>{opponent.nickname || '-'}</Text>
                  <Text style={[s.goals, { color: colors.title }]}>{goalDisplay(opponent)}</Text>
                  <Text style={[s.avgRating, { color: colors.mutedText }]}>평점 {opponent.matchDetail.averageRating?.toFixed(1) ?? '-'}</Text>
                </View>
              </View>
            </View>

            {/* 경기 통계 */}
            <View style={s.card}>
              <Text style={[s.sectionTitle, { color: colors.title }]}>경기 통계</Text>
              <View style={[s.statsTable, { borderTopColor: colors.divider }]}>
                {[
                  { label: '점유율(%)', left: v(me.matchDetail.possession), right: v(opponent.matchDetail.possession) },
                  { label: '슈팅', left: v(me.shoot.shootTotal), right: v(opponent.shoot.shootTotal) },
                  { label: '유효 슈팅', left: v(me.shoot.effectiveShootTotal), right: v(opponent.shoot.effectiveShootTotal) },
                  { label: '헤더 골', left: v(me.shoot.goalHeading), right: v(opponent.shoot.goalHeading) },
                  { label: '프리킥 골', left: v(me.shoot.goalFreekick), right: v(opponent.shoot.goalFreekick) },
                  {
                    label: '패스 성공',
                    left: (() => { const p = calcPassTotal(me.pass); return `${p.success}/${p.try}` })(),
                    right: (() => { const p = calcPassTotal(opponent.pass); return `${p.success}/${p.try}` })(),
                  },
                  { label: '스루패스', left: v(me.pass.throughPassSuccess), right: v(opponent.pass.throughPassSuccess) },
                  { label: '코너킥', left: v(me.matchDetail.cornerKick), right: v(opponent.matchDetail.cornerKick) },
                  { label: '태클 성공', left: v(me.defence.tackleSuccess), right: v(opponent.defence.tackleSuccess) },
                  { label: '파울', left: v(me.matchDetail.foul), right: v(opponent.matchDetail.foul) },
                  { label: '옐로카드', left: v(me.matchDetail.yellowCards), right: v(opponent.matchDetail.yellowCards) },
                  { label: '레드카드', left: v(me.matchDetail.redCards), right: v(opponent.matchDetail.redCards) },
                  { label: '드리블', left: v(me.matchDetail.dribble), right: v(opponent.matchDetail.dribble) },
                  {
                    label: '컨트롤러',
                    left: me.matchDetail.controller === 'gamepad' ? '패드' : '키보드',
                    right: opponent.matchDetail.controller === 'gamepad' ? '패드' : '키보드',
                  },
                ].map((row, i, arr) => (
                  <View key={row.label} style={[s.statRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
                    <Text style={[s.statLeft, { color: colors.title }]}>{row.left}</Text>
                    <Text style={[s.statLabel, { color: colors.mutedText }]}>{row.label}</Text>
                    <Text style={[s.statRight, { color: colors.title }]}>{row.right}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={{ height: 20 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: c.pageBg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 36, marginBottom: 4 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  matchType: { fontSize: 12, fontWeight: '500' },
  matchDate: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  loadingWrap: { paddingVertical: 48, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: c.cardBg, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 16, borderWidth: 1, borderColor: c.cardBorder },
  scoreGrid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scoreTeam: { flex: 1, alignItems: 'center', gap: 4 },
  resultBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  resultBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  nickname: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  goals: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  avgRating: { fontSize: 12, fontWeight: '500' },
  vsText: { fontSize: 16, fontWeight: '700', marginHorizontal: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  statsTable: { borderTopWidth: 1, marginTop: 8 },
  statRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  statLeft: { flex: 1, fontSize: 13, fontWeight: '600', textAlign: 'right', paddingRight: 8 },
  statLabel: { width: 90, fontSize: 11, fontWeight: '500', textAlign: 'center' },
  statRight: { flex: 1, fontSize: 13, fontWeight: '600', textAlign: 'left', paddingLeft: 8 },
})
