import { ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import Feather from '@expo/vector-icons/Feather'
import { useTheme } from '@/hooks/useTheme'
import { Text } from '@/components/Themed'

const LICENSES = [
  { name: '여기어때 잘난체', desc: '여기어때컴퍼니 폰트 라이선스' },
  { name: '넥슨 Open API', desc: 'FC Online 데이터 제공 · openapi.nexon.com' },
  { name: 'Expo', desc: 'MIT License · expo.dev' },
  { name: 'React Native', desc: 'MIT License · reactnative.dev' },
]

export default function LicensesScreen() {
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
        <Text style={s.headerTitle}>오픈소스 라이선스</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.content, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        {LICENSES.map((item) => (
          <View key={item.name} style={s.licenseItem}>
            <Text style={[s.licenseName, { color: colors.title }]}>{item.name}</Text>
            <Text style={[s.licenseDesc, { color: colors.mutedText }]}>{item.desc}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = (c: ReturnType<typeof useTheme>['colors'], _isDark: boolean) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.cardBg },
    navHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, height: 56 },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '700', color: c.title },
    content: { paddingHorizontal: 20, paddingTop: 12, gap: 20 },
    licenseItem: { gap: 2 },
    licenseName: { fontSize: 14, fontWeight: '600' },
    licenseDesc: { fontSize: 13, fontWeight: '400' },
  })
