import { memo, useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
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
import { useFocusEffect } from '@react-navigation/native'
import Feather from '@expo/vector-icons/Feather'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from 'react-native-svg'
import { useTheme } from '@/hooks/useTheme'
import { API_BASE } from '@/constants/api'
import { Text } from '@/components/Themed'
import { apiFetch } from '@/lib/apiFetch'
import { reviewLikeStore } from '@/lib/reviewLikeStore'
import { reviewCommentCountStore } from '@/lib/reviewCommentCountStore'
import { PlayerImage } from '@/components/PlayerImage'

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
const ABILITY_ORDER = ABILITY_GROUPS.flat() as string[]

const FW_POSITIONS = new Set(['ST','CF','LF','RF','LW','RW'])
const MF_POSITIONS = new Set(['CAM','CM','CDM','LAM','RAM','LM','RM'])
const DF_POSITIONS = new Set(['CB','LB','RB','LWB','RWB','SW'])

const POSITIVE_TRAIT_HINTS = [
  { keyword: '예리한 감아차기', text: ' 특성상 감아차기 각이 열릴 때 마무리 기대치도 높은 편입니다.' },
  { keyword: '스피드 드리블러', text: ' 특성 덕분에 치고 나가는 드리블 체감도 함께 기대해볼 만합니다.' },
  { keyword: '파워 헤더', text: ' 특성상 크로스 상황이나 세트피스에서 존재감이 살아날 수 있어요.' },
  { keyword: '플레어', text: ' 플레어 성향이 있어 좁은 구간에서 예측 못한 터치가 장점으로 이어질 수 있습니다.' },
  { keyword: '롱 패서', text: ' 롱 패서 특성까지 있어 전개 길게 찔러주는 장면도 잘 어울립니다.' },
  { keyword: '얼리 크로스', text: ' 얼리 크로스 성향까지 겹치면 빠른 타이밍의 측면 전개도 잘 받습니다.' },
  { keyword: '긴 패스 선호', text: ' 긴 패스 선호 특성 덕분에 시원하게 방향 전환하는 장면도 기대해볼 만해요.' },
  { keyword: '테크니컬 드리블러', text: ' 테크니컬 드리블러 특성 덕분에 볼 간수와 탈압박 체감도 보완됩니다.' },
  { keyword: '중거리 슛 선호', text: ' 중거리 슛 성향이 있어 박스 앞 선택지까지 넓게 가져갈 수 있습니다.' },
  { keyword: '세트피스 스페셜리스트', text: ' 세트피스 상황에서 한 방 옵션이 있다는 점도 분명한 장점이에요.' },
]
const CAUTION_TRAIT_HINTS = [
  { keyword: '얼리 크로스', positions: ['ST','CF'], text: ' 다만 중앙 침투 위주로만 쓰면 얼리 크로스 성향은 덜 체감될 수 있어요.' },
  { keyword: '롱 스로어', positions: ['ST','CF','CAM','CM'], text: ' 다만 롱 스로어 특성은 주 포지션 활용에선 체감 포인트가 제한적일 수 있습니다.' },
]
const AI_REVIEW_TEMPLATES: Array<(a: { strongLevel:number; positionGroup:string; topAbilitySummary:string; playStyle:string; traitContext:string; levelTone:string; gradeTone:string }) => string> = [
  (a) => `${a.strongLevel}카 기준 ${a.positionGroup} ${a.topAbilitySummary} 수치가 두드러져 ${a.playStyle}에서 ${a.levelTone} ${a.gradeTone} 카드예요.${a.traitContext}`,
  (a) => `${a.strongLevel}카로 보면 ${a.positionGroup} ${a.topAbilitySummary} 쪽이 확실히 살아 있어 ${a.playStyle}에서 ${a.levelTone} ${a.gradeTone} 카드에 가깝습니다.${a.traitContext}`,
  (a) => `${a.strongLevel}카 시점에서는 ${a.positionGroup} ${a.topAbilitySummary} 조합이 좋아서 ${a.playStyle}을 노릴 때 ${a.levelTone} ${a.gradeTone} 카드로 읽혀요.${a.traitContext}`,
  (a) => `${a.strongLevel}카 기준 한줄로 정리하면, ${a.positionGroup} ${a.topAbilitySummary}가 강점이라 ${a.playStyle}에서 ${a.levelTone} ${a.gradeTone} 카드입니다.${a.traitContext}`,
  (a) => `${a.strongLevel}카에서는 ${a.positionGroup} ${a.topAbilitySummary} 수치가 먼저 눈에 들어오고, 실제로도 ${a.playStyle} 구간에서 ${a.levelTone} ${a.gradeTone} 카드예요.${a.traitContext}`,
  (a) => `${a.strongLevel}카만 놓고 보면 ${a.positionGroup} ${a.topAbilitySummary}가 좋아 ${a.playStyle}에 강점이 몰린 ${a.levelTone} ${a.gradeTone} 카드라고 볼 수 있어요.${a.traitContext}`,
  (a) => `${a.strongLevel}카 평가로는 ${a.positionGroup} ${a.topAbilitySummary} 쪽 완성도가 괜찮아서 ${a.playStyle}에서 ${a.levelTone} ${a.gradeTone} 카드로 보입니다.${a.traitContext}`,
  (a) => `${a.strongLevel}카 단계에선 ${a.positionGroup} ${a.topAbilitySummary} 수치가 받쳐줘서 ${a.playStyle} 체감 쪽으로 ${a.levelTone} ${a.gradeTone} 카드예요.${a.traitContext}`,
  (a) => `${a.strongLevel}카 기준으로 해석하면 ${a.positionGroup} ${a.topAbilitySummary}가 핵심이고, 그래서 ${a.playStyle}에서 ${a.levelTone} ${a.gradeTone} 카드라는 인상이 강합니다.${a.traitContext}`,
  (a) => `${a.strongLevel}카 기준 현재 수치만 봐도 ${a.positionGroup} ${a.topAbilitySummary}가 좋아 ${a.playStyle} 활용도 면에서 ${a.levelTone} ${a.gradeTone} 카드로 정리됩니다.${a.traitContext}`,
]
function hashReviewSeed(value: string) {
  let hash = 0
  for (const char of value) { hash = (hash * 31 + char.charCodeAt(0)) >>> 0 }
  return hash
}
function formatAbilitySummary(labels: Array<{ name: string; value: number }>) {
  if (labels.length === 0) return '핵심 능력치'
  if (labels.length === 1) return `${labels[0].name} ${labels[0].value}`
  if (labels.length === 2) return `${labels[0].name} ${labels[0].value}, ${labels[1].name} ${labels[1].value}`
  return `${labels[0].name} ${labels[0].value}, ${labels[1].name} ${labels[1].value}, ${labels[2].name} ${labels[2].value}`
}
function getTraitContextSummary(traits: Array<{ name: string }>, position: string | null) {
  if (traits.length === 0) return ''
  const names = traits.map((t) => t.name)
  const upper = position?.toUpperCase() ?? null
  const pos = POSITIVE_TRAIT_HINTS.find((h) => names.some((n) => n.includes(h.keyword)))
  const cau = CAUTION_TRAIT_HINTS.find((h) => names.some((n) => n.includes(h.keyword)) && !!upper && h.positions.includes(upper))
  if (pos && cau) return `${pos.text}${cau.text}`
  if (pos) return pos.text
  if (cau) return cau.text
  return ` ${names.slice(0, 2).join(', ')} 특성도 함께 달려 있어 실제 체감 방향을 잡을 때 참고할 만합니다.`
}
function getPositionGroupLabel(position: string | null) {
  const u = position?.toUpperCase()
  if (u && FW_POSITIONS.has(u)) return '공격수 자원으로 보면'
  if (u && MF_POSITIONS.has(u)) return '미드필더 자원으로 보면'
  if (u === 'GK') return '골키퍼 자원으로 보면'
  if (u && DF_POSITIONS.has(u)) return '수비수 자원으로 보면'
  return '포지션 수치만 놓고 보면'
}
function getPlayStyleLabel(position: string | null) {
  const u = position?.toUpperCase()
  if (u && FW_POSITIONS.has(u)) return '침투와 마무리'
  if (u && MF_POSITIONS.has(u)) return '연계와 전진 전개'
  if (u === 'GK') return '선방과 안정감'
  if (u && DF_POSITIONS.has(u)) return '대인 수비와 커버'
  return '실전 활용'
}
function buildAiReviewSummary({ playerName: pName, abilities, traits, position, overall, strongLevel: sl }: {
  playerName: string; abilities: Array<{ name: string; value: number }>; traits: Array<{ name: string }>; position: string | null; overall: number | null; strongLevel: number
}) {
  if (abilities.length === 0) return `${sl}카 기준 현재 시즌 카드 수치를 종합하면 직접 체감과 활용 포지션을 비교해볼 만한 카드예요.`
  const top3 = abilities.slice().sort((a, b) => b.value - a.value).slice(0, 3)
  const topAbilitySummary = formatAbilitySummary(top3)
  const positionGroup = getPositionGroupLabel(position)
  const playStyle = getPlayStyleLabel(position)
  const traitContext = getTraitContextSummary(traits, position)
  const gradeTone = overall == null ? '완성도가 괜찮은' : overall >= 130 ? '최상위권으로 볼 수 있는' : overall >= 120 ? '상위권으로 볼 수 있는' : overall >= 110 ? '준수한' : '무난한'
  const levelTone = sl >= 10 ? '확실히 체감이 살아나는' : sl >= 7 ? '실사용 메리트가 분명한' : sl >= 5 ? '밸런스가 더 안정되는' : '기본 장점이 드러나는'
  const seed = `${pName}|${position ?? 'NA'}|${sl}|${overall ?? 'NA'}|${topAbilitySummary}`
  const idx = hashReviewSeed(seed) % AI_REVIEW_TEMPLATES.length
  return AI_REVIEW_TEMPLATES[idx]!({ strongLevel: sl, positionGroup, topAbilitySummary, playStyle, traitContext, levelTone, gradeTone })
}

type AbilityStat = { name: string; value: number }

/** 선수 특성 아이템 */
type Trait = { name: string; iconSrc: string | null }

type PlayerReviewItem = {
  id: string
  nickname: string
  level?: number | null
  avatarUrl?: string | null
  authorId?: string | null
  title: string
  content: string
  createdAtLabel: string
  commentCount: number
  likeCount: number
  isLiked?: boolean
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
// 선수 평가 헬퍼
// ────────────────────────────────────────────────────────────────

function pickDefaultAvatar(id: string): string {
  const emojis = ['😀', '😊', '🦊', '🐼', '🦁', '🐯', '🐸', '🐧', '🦅', '🐬']
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return emojis[hash % emojis.length] ?? '😀'
}

function getLevelColor(level?: number | null): string {
  if (!level || !Number.isFinite(level)) return '#9aa3af'
  if (level <= 10) return '#9aa3af'
  if (level <= 20) return '#457ae5'
  if (level <= 30) return '#0f9f8c'
  if (level <= 40) return '#18a957'
  if (level <= 50) return '#65b32e'
  if (level <= 60) return '#d4a017'
  if (level <= 70) return '#d97904'
  if (level <= 80) return '#d94f3d'
  if (level <= 90) return '#c43d6b'
  return '#8b5cf6'
}

function LevelBadge({ level }: { level?: number | null }) {
  if (!level || !Number.isFinite(level)) return null
  return (
    <Text style={{ fontSize: 12, fontWeight: '600', color: getLevelColor(level), lineHeight: 16 }}>Lv.{level}</Text>
  )
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
const AbilityCard = memo(function AbilityCard({
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
})

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
  const [activePillLevel, setActivePillLevel] = useState(initialStrongLevel)
  const [strongLevel, setStrongLevel] = useState(initialStrongLevel)
  const [, startLevelTransition] = useTransition()
  const [isChemistryApplied, setIsChemistryApplied] = useState(false)
  const [teamColorBoost, setTeamColorBoost] = useState(0)
  const [showTeamColorPicker, setShowTeamColorPicker] = useState(false)
  const [activeTab, setActiveTab] = useState<'detail' | 'review'>(initialTab)
  const [aiSummaryLevel, setAiSummaryLevel] = useState(initialStrongLevel)
  const [showAiLevelPicker, setShowAiLevelPicker] = useState(false)
  const [reviewItems, setReviewItems] = useState<PlayerReviewItem[]>([])
  const [reviewCount, setReviewCount] = useState(0)
  const [reviewPage, setReviewPage] = useState(1)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [levelViewportWidth, setLevelViewportWidth] = useState(0)
  const [levelContentWidth, setLevelContentWidth] = useState(0)
  const levelScrollXRef = useRef(0)
  const [showLeftFade, setShowLeftFade] = useState(false)
  const [showRightFade, setShowRightFade] = useState(true)
  const showLeftFadeRef = useRef(false)
  const showRightFadeRef = useRef(true)

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

  const s = useMemo(() => styles(colors), [colors])

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
    setActivePillLevel(initialStrongLevel)
    setStrongLevel(initialStrongLevel)
  }, [initialStrongLevel, id])

  useEffect(() => {
    setAiSummaryLevel(strongLevel)
  }, [strongLevel])

  useEffect(() => {
    setActiveTab(initialTab)
    setReviewItems([])
    setReviewCount(0)
    setReviewPage(1)
  }, [id, initialTab])

  const fetchReviewPage = useCallback(async (page: number) => {
    if (!id) return
    setReviewLoading(true)
    try {
      const response = await apiFetch(
        `/api/player-reviews/posts?playerId=${encodeURIComponent(String(id))}&page=${page}&pageSize=5`,
      )
      const result = await response.json()
      const items = Array.isArray(result.items) ? result.items : []
      const totalCount = Number(result.totalCount ?? 0) || 0

      setReviewItems(items.map((r: PlayerReviewItem) => {
        const cached = reviewLikeStore.get(r.id)
        return cached ? { ...r, ...cached } : r
      }))
      setReviewCount(totalCount)
      setReviewPage(page)
    } catch {
      setReviewItems([])
      setReviewCount(0)
    } finally {
      setReviewLoading(false)
    }
  }, [id])

  useFocusEffect(
    useCallback(() => {
      setReviewItems((prev) => prev.map((r) => {
        const cachedLike = reviewLikeStore.get(r.id)
        const cachedCommentCount = reviewCommentCountStore.get(r.id)
        const merged = cachedLike ? { ...r, ...cachedLike } : r
        return cachedCommentCount !== undefined ? { ...merged, commentCount: cachedCommentCount } : merged
      }))
      void fetchReviewPage(1)
    }, [fetchReviewPage]),
  )

  const handleReviewLike = async (item: PlayerReviewItem) => {
    const newIsLiked = !item.isLiked
    const newLikeCount = item.likeCount + (item.isLiked ? -1 : 1)
    reviewLikeStore.set(item.id, newIsLiked, newLikeCount)
    setReviewItems((prev) => prev.map((r) =>
      r.id === item.id
        ? { ...r, isLiked: newIsLiked, likeCount: newLikeCount }
        : r,
    ))
    try {
      await apiFetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: item.id, postType: 'player_review' }),
      })
    } catch {}
  }

  useEffect(() => {
    void fetchReviewPage(1)
  }, [fetchReviewPage])

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
  const orderedAbilities = useMemo(() =>
    detail?.abilities.slice().sort((a, b) => {
      const ai = ABILITY_ORDER.indexOf(a.name)
      const bi = ABILITY_ORDER.indexOf(b.name)
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
    }) ?? [],
  [detail?.abilities])

  const aiSummaryText = useMemo(() => {
    if (!detail || detail.abilities.length === 0) return null
    const boost = getStrongPoint(aiSummaryLevel) - getStrongPoint(1)
    return buildAiReviewSummary({
      playerName: playerName || detail.name,
      abilities: detail.abilities.map((ab) => ({ name: ab.name, value: ab.value + boost })),
      traits: detail.traits,
      position: detail.position,
      overall: detail.overall != null ? detail.overall - getStrongPoint(1) + getStrongPoint(aiSummaryLevel) : null,
      strongLevel: aiSummaryLevel,
    })
  }, [detail, aiSummaryLevel, playerName])

  useEffect(() => {
    const activeLayout = levelTabLayouts.current[activePillLevel]
    if (!activeLayout || levelViewportWidth <= 0) {
      return
    }

    const maxScrollX = Math.max(0, levelContentWidth - levelViewportWidth)
    const targetX = activeLayout.x - (levelViewportWidth - activeLayout.width) / 2

    levelScrollRef.current?.scrollTo({
      x: Math.min(Math.max(0, targetX), maxScrollX),
      animated: true,
    })
  }, [activePillLevel, levelViewportWidth, levelContentWidth])

  const handleLevelTabLayout = (level: number, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout
    levelTabLayouts.current[level] = { x, width }
  }

  const handleLevelScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = event.nativeEvent.contentOffset.x
    levelScrollXRef.current = x
    const newLeft = x > 4
    const newRight = levelContentWidth - levelViewportWidth - x > 4
    if (newLeft !== showLeftFadeRef.current) {
      showLeftFadeRef.current = newLeft
      setShowLeftFade(newLeft)
    }
    if (newRight !== showRightFadeRef.current) {
      showRightFadeRef.current = newRight
      setShowRightFade(newRight)
    }
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
        <TouchableOpacity style={s.backRow} onPress={() => router.back()} delayPressIn={0}>
          <Feather name="chevron-left" size={22} color={colors.title} />
          <Text style={s.backText} numberOfLines={1}>{playerName || '선수 홈'}</Text>
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
                  <PlayerImage spid={id} size={96} />
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
                delayPressIn={0}
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
                delayPressIn={0}
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

            {orderedAbilities.length > 0 && (
              <View style={[s.card, activeTab !== 'detail' ? { display: 'none' } : null]}>
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
                        onPress={() => {
                          setActivePillLevel(level)
                          startLevelTransition(() => setStrongLevel(level))
                        }}
                        activeOpacity={0.75}
                        delayPressIn={0}
                        style={[
                          s.levelPill,
                          activePillLevel === level
                            ? s.levelPillActive
                            : { backgroundColor: isDark ? colors.surfaceSoft : '#ffffff', borderColor: colors.cardBorder },
                        ]}
                      >
                        <Text style={[s.levelPillText, { color: activePillLevel === level ? '#fff' : colors.bodyText }]}>
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
                  delayPressIn={0}
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
                  delayPressIn={0}
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

            {clubHistory.length > 0 && (
              <View style={[s.card, activeTab !== 'detail' ? { display: 'none' } : null]}>
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

            {/* ── 선수 평가 탭 ── */}
            <View style={activeTab !== 'review' ? { display: 'none' } : { gap: 12 }}>

              {/* 헤더 카드: 제목 + 글쓰기 버튼 + AI 선수평가 */}
              <View style={s.card}>
                <View style={s.reviewHeaderRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[s.reviewSectionTitle, { color: colors.title }]}>
                      {playerName || (detail?.name ?? '선수')} 선수 평가
                    </Text>
                    <Text style={[s.reviewSectionDesc, { color: colors.mutedText }]}>
                      총 {reviewCount.toLocaleString()}개의 평가가 있어요
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[s.reviewWriteBtn, { backgroundColor: '#457ae5' }]}
                    onPress={() => router.push({
                      pathname: '/(tabs)/players/review/new' as any,
                      params: { playerId: id, playerName },
                    })}
                    activeOpacity={0.85}
                    delayPressIn={0}
                  >
                    <Text style={s.reviewWriteBtnText}>글쓰기</Text>
                  </TouchableOpacity>
                </View>

                {/* AI 선수평가 섹션 */}
                {aiSummaryText != null && (
                  <>
                    <View style={[s.reviewDivider, { backgroundColor: colors.divider }]} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <Text style={[s.reviewAiLabel, { color: colors.mutedText }]}>요약 AI 선수평가</Text>
                      <TouchableOpacity
                        style={[s.reviewAiSelect, { backgroundColor: colors.surfaceSoft, borderColor: colors.cardBorder }]}
                        onPress={() => setShowAiLevelPicker(true)}
                        activeOpacity={0.75}
                        delayPressIn={0}
                      >
                        <Text style={[s.reviewAiSelectText, { color: colors.title }]}>{aiSummaryLevel}카</Text>
                        <Feather name="chevron-down" size={12} color={colors.mutedText} />
                      </TouchableOpacity>
                    </View>
                    <Text style={[s.reviewAiBody, { color: colors.bodyText }]}>{aiSummaryText}</Text>
                  </>
                )}
              </View>

              {/* 로딩 / 빈 상태 */}
              {reviewLoading && reviewItems.length === 0 ? (
                <View style={[s.card, s.reviewStateWrap]}>
                  <ActivityIndicator size="small" color={colors.accentBlue} />
                  <Text style={[s.reviewStateText, { color: colors.bodyText }]}>선수 평가를 불러오는 중이에요</Text>
                </View>
              ) : reviewItems.length === 0 ? (
                <View style={[s.card, s.reviewStateWrap]}>
                  <Text style={[s.reviewStateText, { color: colors.bodyText }]}>아직 등록된 선수 평가가 없어요</Text>
                </View>
              ) : (
                <>
                  {/* 개별 리뷰 카드 */}
                  {reviewItems.map((item) => {
                    const cardMatch = item.title?.match(/^\[(\d+)카\]/)
                    const cardLevel = cardMatch ? parseInt(cardMatch[1], 10) : null
                    const displayTitle = cardMatch ? item.title.slice(cardMatch[0].length).trim() : item.title
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={s.card}
                        onPress={() => router.push({
                          pathname: '/(tabs)/players/review/[reviewId]' as any,
                          params: { reviewId: item.id, postData: JSON.stringify(item), playerName },
                        })}
                        activeOpacity={0.8}
                        delayPressIn={0}
                      >
                        <View style={s.reviewAuthorRow}>
                          <View style={[s.reviewAvatar, { backgroundColor: isDark ? '#3a3f52' : colors.surfaceSoft }]}>
                            {item.avatarUrl ? (
                              <Image source={{ uri: item.avatarUrl }} style={{ width: 40, height: 40, borderRadius: 999 }} />
                            ) : (
                              <Text style={{ fontSize: 18 }}>{item.authorId ? pickDefaultAvatar(item.authorId) : '😀'}</Text>
                            )}
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <View style={s.reviewMetaLeft}>
                              <LevelBadge level={item.level} />
                              <Text style={[s.reviewNickname, { color: colors.bodyText }]} numberOfLines={1}>
                                {item.nickname}
                              </Text>
                              <Text style={[s.reviewTime, { color: colors.mutedText }]}>{item.createdAtLabel}</Text>
                            </View>
                            <Text style={[s.reviewTitle, { color: colors.title }]} numberOfLines={2}>
                              {cardLevel != null && (
                                <Text style={{ color: '#457ae5' }}>[{cardLevel}카] </Text>
                              )}{displayTitle}
                            </Text>
                            <Text style={[s.reviewBody, { color: colors.bodyText }]} numberOfLines={2}>
                              {item.content}
                            </Text>
                            <View style={s.reviewFooterRow}>
                              <TouchableOpacity style={s.reviewFooterAction} onPress={() => router.push({
                                pathname: '/(tabs)/players/review/[reviewId]' as any,
                                params: { reviewId: item.id, postData: JSON.stringify(item), playerName },
                              })} delayPressIn={0}>
                                <Feather name="message-circle" size={14} color={colors.mutedText} />
                                <Text style={[s.reviewFooterCount, { color: colors.mutedText }]}>{item.commentCount}</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={s.reviewFooterAction}
                                onPress={() => handleReviewLike(item)}
                                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                delayPressIn={0}
                              >
                                <FontAwesome name={item.isLiked ? 'heart' : 'heart-o'} size={14} color={item.isLiked ? '#e03131' : colors.mutedText} />
                                <Text style={[s.reviewFooterCount, { color: item.isLiked ? '#e03131' : colors.mutedText }]}>{item.likeCount}</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    )
                  })}

                  {/* 페이지네이션 */}
                  {(() => {
                    const totalPages = Math.max(1, Math.ceil(reviewCount / 5))
                    if (totalPages <= 1) return null
                    const windowStart = Math.max(1, Math.min(reviewPage - 2, totalPages - 4))
                    const windowEnd = Math.min(totalPages, windowStart + 4)
                    const pages = Array.from({ length: windowEnd - windowStart + 1 }, (_, i) => windowStart + i)
                    return (
                      <View style={[s.reviewPaginationRow, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                        <TouchableOpacity
                          onPress={() => void fetchReviewPage(Math.max(1, reviewPage - 1))}
                          disabled={reviewPage <= 1}
                          style={[s.reviewPageNavBtn, { backgroundColor: colors.surfaceSoft }, reviewPage <= 1 && { opacity: 0.4 }]}
                          activeOpacity={0.7}
                          delayPressIn={0}
                        >
                          <Feather name="chevron-left" size={16} color={colors.bodyText} />
                        </TouchableOpacity>
                        <View style={s.reviewPageNums}>
                          {pages.map((p) => (
                            <TouchableOpacity
                              key={p}
                              onPress={() => void fetchReviewPage(p)}
                              disabled={p === reviewPage}
                              style={[s.reviewPageBtn, { backgroundColor: p === reviewPage ? '#457ae5' : colors.surfaceSoft }]}
                              activeOpacity={0.7}
                              delayPressIn={0}
                            >
                              <Text style={[s.reviewPageBtnText, { color: p === reviewPage ? '#fff' : colors.bodyText }]}>{p}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <TouchableOpacity
                          onPress={() => void fetchReviewPage(Math.min(totalPages, reviewPage + 1))}
                          disabled={reviewPage >= totalPages}
                          style={[s.reviewPageNavBtn, { backgroundColor: colors.surfaceSoft }, reviewPage >= totalPages && { opacity: 0.4 }]}
                          activeOpacity={0.7}
                          delayPressIn={0}
                        >
                          <Feather name="chevron-right" size={16} color={colors.bodyText} />
                        </TouchableOpacity>
                      </View>
                    )
                  })()}
                </>
              )}
            </View>

            <View style={{ height: 8 }} />
          </>
        )}
      </ScrollView>

      {/* AI 강화단계 선택 Modal */}
      <Modal visible={showAiLevelPicker} transparent animationType="fade" onRequestClose={() => setShowAiLevelPicker(false)}>
        <TouchableOpacity style={teamPickerStyle.overlay} onPress={() => setShowAiLevelPicker(false)} activeOpacity={1}>
          <View style={[teamPickerStyle.sheet, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Text style={[teamPickerStyle.sheetTitle, { color: colors.mutedText }]}>카드 강화단계 선택</Text>
            {([1,2,3,4,5,6,7,8,9,10,11,12,13] as const).map((lv, i) => (
              <TouchableOpacity
                key={lv}
                style={[teamPickerStyle.option, i < 12 && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}
                onPress={() => { setAiSummaryLevel(lv); setShowAiLevelPicker(false) }}
                activeOpacity={0.7}
                delayPressIn={0}
              >
                <Text style={[teamPickerStyle.optionText, { color: lv === aiSummaryLevel ? '#457ae5' : colors.title }, lv === aiSummaryLevel && { fontWeight: '700' }]}>
                  {lv}카
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

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
                delayPressIn={0}
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
    content: { paddingHorizontal: 20, paddingTop: 12, gap: 12 },
    backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 },
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
    thumbWrap: { width: 96, height: 96, borderRadius: 16, overflow: 'hidden', flexShrink: 0 },
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
    reviewHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
    reviewHeaderCount: { fontSize: 12, fontWeight: '500' },
    reviewSectionTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
    reviewSectionDesc: { fontSize: 12, fontWeight: '500', marginTop: 3 },
    reviewDivider: { height: 1, marginVertical: 16 },
    reviewAiLabel: { fontSize: 13, fontWeight: '700' },
    reviewAiSelect: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 6,
      minWidth: 64,
    },
    reviewAiSelectText: { fontSize: 12, fontWeight: '600' },
    reviewAiBody: { fontSize: 13, fontWeight: '400', lineHeight: 20, marginTop: 10 },
    reviewCardBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    reviewCardBadgeText: { fontSize: 11, fontWeight: '700' },
    reviewWriteBtn: { borderRadius: 999, height: 36, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
    reviewWriteBtnText: { fontSize: 13, fontWeight: '600', color: '#ffffff' },
    reviewStateWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 28, gap: 10 },
    reviewStateText: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
    reviewItemCard: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14 },
    reviewAuthorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    reviewAvatar: { width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, marginTop: 2 },
    reviewMetaLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    reviewNickname: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
    reviewTime: { fontSize: 12, fontWeight: '500' },
    reviewTitle: { fontSize: 14, fontWeight: '700', marginTop: 6 },
    reviewBody: { fontSize: 13, fontWeight: '400', lineHeight: 19, marginTop: 4, color: c.bodyText },
    reviewFooterRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
    reviewFooterAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    reviewFooterCount: { fontSize: 12, fontWeight: '500' },
    reviewMoreButton: {
      height: 44,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    reviewMoreText: { fontSize: 14, fontWeight: '700' },
    reviewPaginationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    reviewPageNavBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
    reviewPageNums: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    reviewPageBtn: { minWidth: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 999, paddingHorizontal: 10 },
    reviewPageBtnText: { fontSize: 14, fontWeight: '600' },
  })

const teamPickerStyle = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  sheet: { width: '100%', maxWidth: 240, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  sheetTitle: { fontSize: 11, fontWeight: '600', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  option: { paddingHorizontal: 20, paddingVertical: 14 },
  optionText: { fontSize: 15, fontWeight: '500' },
})
