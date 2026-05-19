import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { router } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import { useTheme } from '@/hooks/useTheme'
import { Text } from '@/components/Themed'

const XP_ITEMS = [
  { label: '하루 첫 로그인', xp: '+5 XP' },
  { label: '커뮤니티 글 작성', xp: '+12 XP' },
  { label: '선수평가 글 작성', xp: '+10 XP' },
  { label: '커뮤니티 댓글 작성', xp: '+4 XP' },
  { label: '선수평가 댓글 작성', xp: '+4 XP' },
  { label: '하루 첫 글 보너스', xp: '+5 XP' },
  { label: '하루 첫 댓글 보너스', xp: '+3 XP' },
]

export default function XpGuideScreen() {
  const { colors, isDark } = useTheme()
  const tabBarHeight = useBottomTabBarHeight()
  const insets = useSafeAreaInsets()
  const bottomPad = Math.max(tabBarHeight, insets.bottom) + 40
  const s = styles(colors, isDark)

  return (
    <View style={[s.safeArea, { paddingTop: insets.top }]}>
      <View style={s.navHeader}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="chevron-left" size={24} color={colors.title} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>경험치 획득 방법</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.content, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.desc, { color: colors.mutedText }]}>
          아래 활동을 통해 경험치를 획득하고 레벨을 올릴 수 있어요.
        </Text>

        <View style={[s.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          {XP_ITEMS.map((item, i) => (
            <View key={i}>
              <View style={s.row}>
                <Text style={[s.rowLabel, { color: colors.bodyText }]}>{item.label}</Text>
                <Text style={[s.rowXp, { color: '#457ae5' }]}>{item.xp}</Text>
              </View>
              {i < XP_ITEMS.length - 1 && (
                <View style={[s.divider, { backgroundColor: colors.divider }]} />
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = (c: ReturnType<typeof useTheme>['colors'], _isDark: boolean) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.pageBg },
    navHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, height: 56 },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '700', color: c.title },
    content: { paddingHorizontal: 20, paddingTop: 16, gap: 16 },
    desc: { fontSize: 13, lineHeight: 20, fontWeight: '400' },
    card: {
      borderRadius: 16,
      borderWidth: 1,
      overflow: 'hidden',
      paddingVertical: 4,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    rowLabel: { fontSize: 14, fontWeight: '400' },
    rowXp: { fontSize: 14, fontWeight: '700' },
    divider: { height: 1, marginHorizontal: 20 },
  })
