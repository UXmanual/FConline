import { ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import Feather from '@expo/vector-icons/Feather'
import * as Linking from 'expo-linking'
import { useTheme } from '@/hooks/useTheme'
import { Text } from '@/components/Themed'
import { PRIVACY_CONTENT, PRIVACY_EMAIL } from '@/constants/legalContent'

const firstLineEnd = PRIVACY_CONTENT.indexOf('\n')
const updateLine = PRIVACY_CONTENT.slice(0, firstLineEnd).trim()
const bodyRaw = PRIVACY_CONTENT.slice(firstLineEnd).trim()
const [beforeEmail, afterEmail] = bodyRaw.split(PRIVACY_EMAIL)

export default function PrivacyScreen() {
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
        <Text style={s.headerTitle}>개인정보처리방침</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.content, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.bodyText, { color: colors.bodyText }]}>
          {beforeEmail}
          <Text style={{ color: '#457ae5' }} onPress={() => void Linking.openURL(`mailto:${PRIVACY_EMAIL}`)}>
            {PRIVACY_EMAIL}
          </Text>
          {afterEmail}
        </Text>
        <Text style={[s.updateText, { color: colors.mutedText }]}>{updateLine}</Text>
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
    content: { paddingHorizontal: 20, paddingTop: 12 },
    bodyText: { fontSize: 14, lineHeight: 22, fontWeight: '400' },
    updateText: { fontSize: 12, fontWeight: '400', marginTop: 32 },
  })
