import { useEffect, useRef } from 'react'
import { View, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTheme } from '@/hooks/useTheme'
import { API_BASE } from '@/constants/api'
import { Text } from '@/components/Themed'
import { SkeletonBox } from '@/components/Skeleton'

export default function LookupScreen() {
  const { nickname, mode, candidateData } = useLocalSearchParams<{
    nickname: string
    mode: string
    candidateData: string
  }>()
  const router = useRouter()
  const { colors, isDark } = useTheme()
  const didResolve = useRef(false)

  useEffect(() => {
    if (!nickname || didResolve.current) return
    didResolve.current = true

    const resolve = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/nexon/matches/search?nickname=${encodeURIComponent(nickname.trim())}`,
        )
        const data = await res.json().catch(() => null)
        let exact = data?.exactMatch ?? null

        if (exact && !exact.ouid) {
          const userRes = await fetch(
            `${API_BASE}/api/nexon/matches/user?nickname=${encodeURIComponent(nickname.trim())}`,
          )
          if (userRes.ok) {
            const userData = await userRes.json().catch(() => null)
            const resolvedOuid = userData?.ouid ?? null
            if (resolvedOuid) exact = { ...exact, ouid: resolvedOuid }
          }
        }

        if (exact?.ouid) {
          const merged = candidateData
            ? JSON.stringify({ ...JSON.parse(candidateData), ...exact })
            : JSON.stringify(exact)
          router.replace({
            pathname: '/(tabs)/matches/[ouid]',
            params: { ouid: exact.ouid, mode: mode ?? 'official1on1', candidateData: merged },
          } as any)
        } else {
          router.back()
        }
      } catch {
        router.back()
      }
    }

    void resolve()
  }, [nickname])

  const s = styles(isDark ? colors.pageBg : '#ffffff')

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* 헤더 스켈레톤 */}
      <View style={s.header}>
        <SkeletonBox width={120} height={18} radius={6} />
      </View>

      {/* 모드 탭 스켈레톤 */}
      <View style={s.modeRow}>
        {[90, 80, 72].map((w, i) => (
          <SkeletonBox key={i} width={w} height={34} radius={999} />
        ))}
      </View>

      {/* 프로필 카드 스켈레톤 */}
      <View style={[s.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
        <View style={s.profileRow}>
          <SkeletonBox width={52} height={52} radius={999} />
          <View style={{ flex: 1, gap: 8 }}>
            <SkeletonBox width="55%" height={16} radius={5} />
            <SkeletonBox width="75%" height={13} radius={4} />
          </View>
        </View>
        <View style={{ marginTop: 16, gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <SkeletonBox width="40%" height={13} radius={4} />
              <SkeletonBox width="30%" height={13} radius={4} />
            </View>
          ))}
        </View>
      </View>

      {/* 경기 목록 스켈레톤 */}
      <View style={[s.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
        <SkeletonBox width={100} height={14} radius={4} style={{ marginBottom: 12 }} />
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={s.matchRow}>
            <SkeletonBox width={36} height={36} radius={8} />
            <View style={{ flex: 1, gap: 6 }}>
              <SkeletonBox width="60%" height={13} radius={4} />
              <SkeletonBox width="40%" height={11} radius={4} />
            </View>
            <SkeletonBox width={48} height={28} radius={6} />
          </View>
        ))}
      </View>

      <View style={s.hint}>
        <Text style={{ fontSize: 13, color: colors.mutedText }}>
          {nickname} 구단주 정보를 불러오는 중...
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = (bg: string) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: bg },
    header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
    modeRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, marginBottom: 12 },
    card: {
      marginHorizontal: 20,
      marginBottom: 12,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
    },
    profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    matchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: 'rgba(0,0,0,0.06)',
    },
    hint: { alignItems: 'center', marginTop: 8 },
  })
