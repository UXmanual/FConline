import { useState } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import { useTheme } from '@/hooks/useTheme'
import { supabase } from '@/lib/supabase'
import { apiFetch } from '@/lib/apiFetch'
import { Text } from '@/components/Themed'

const DELETION_ITEMS = [
  { label: '삭제되는 항목', color: '#e03131', items: ['계정 연동 정보 (이메일, User ID)', '닉네임 및 프로필 이미지', '즐겨찾기 선수 목록'] },
  { label: '익명 처리되는 항목', color: '#d97904', items: ['작성한 게시글 및 댓글 (내용은 유지, 계정 연결만 해제)', '선수 평가 글 (내용은 유지, 계정 연결만 해제)'] },
]

export default function DataDeletionScreen() {
  const { colors, isDark } = useTheme()
  const s = styles(colors, isDark)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = () => {
    Alert.alert(
      '계정을 삭제하시겠습니까?',
      '계정 삭제 후에는 복구할 수 없습니다. 작성한 게시글과 댓글은 익명으로 남습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              '정말 삭제하시겠습니까?',
              '이 작업은 되돌릴 수 없습니다.',
              [
                { text: '취소', style: 'cancel' },
                { text: '영구 삭제', style: 'destructive', onPress: () => void confirmDelete() },
              ],
            )
          },
        },
      ],
    )
  }

  const confirmDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await apiFetch('/api/mypage/account', { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        Alert.alert('삭제 실패', data?.message ?? '계정 삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.')
        return
      }
      await supabase.auth.signOut()
      router.replace('/(tabs)/mypage' as any)
    } catch {
      Alert.alert('오류', '계정 삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.pageBg }]} edges={['top', 'bottom']}>
      {/* 헤더 */}
      <View style={s.navHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="chevron-left" size={24} color={colors.title} />
        </TouchableOpacity>
        <View style={s.headerTitleWrap} pointerEvents="none">
          <Text style={[s.headerTitle, { color: colors.title }]}>계정 및 데이터 삭제</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* 안내 카드 */}
        <View style={[s.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <Text style={[s.cardTitle, { color: colors.title }]}>삭제 전 꼭 확인하세요</Text>
          <Text style={[s.cardDesc, { color: colors.bodyText }]}>
            계정 삭제 요청 시 아래 항목에 따라 처리되며, 삭제된 계정은 복구할 수 없습니다.
          </Text>

          {DELETION_ITEMS.map((section) => (
            <View key={section.label} style={s.section}>
              <View style={[s.sectionLabel, { backgroundColor: section.color + '1a' }]}>
                <Text style={[s.sectionLabelText, { color: section.color }]}>{section.label}</Text>
              </View>
              {section.items.map((item) => (
                <View key={item} style={s.itemRow}>
                  <Feather name="minus" size={12} color={colors.mutedText} style={{ marginTop: 3 }} />
                  <Text style={[s.itemText, { color: colors.bodyText }]}>{item}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* 법적 근거 안내 */}
        <View style={[s.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <Text style={[s.cardTitle, { color: colors.title }]}>개인정보 처리 근거</Text>
          <Text style={[s.cardDesc, { color: colors.bodyText }]}>
            계정 삭제 요청은 개인정보보호법 제36조(개인정보의 정정·삭제)에 따른 권리 행사입니다.
            {'\n\n'}게시글 및 댓글 내용이 익명 처리 후 남는 이유는 커뮤니티 맥락 유지 및 분쟁 대응을 위한 적법한 이익에 근거합니다.
            {'\n\n'}문의: uxdmanual@gmail.com
          </Text>
        </View>

        {/* 삭제 버튼 */}
        <TouchableOpacity
          style={[s.deleteBtn, isDeleting && { opacity: 0.6 }]}
          onPress={handleDelete}
          disabled={isDeleting}
          activeOpacity={0.85}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={s.deleteBtnText}>계정 및 데이터 삭제</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = (c: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    safe: { flex: 1 },
    navHeader: {
      height: 44,
      paddingHorizontal: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
    headerTitleWrap: { position: 'absolute' as const, left: 0, right: 0, alignItems: 'center' as const },
    headerTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
    content: { paddingHorizontal: 20, paddingTop: 16, gap: 12 },
    card: {
      borderRadius: 16,
      paddingHorizontal: 20,
      paddingVertical: 20,
      borderWidth: 1,
      gap: 12,
    },
    cardTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
    cardDesc: { fontSize: 13, fontWeight: '400', lineHeight: 20 },
    section: { gap: 8 },
    sectionLabel: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    sectionLabelText: { fontSize: 12, fontWeight: '700' },
    itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingLeft: 4 },
    itemText: { fontSize: 13, fontWeight: '400', lineHeight: 19, flex: 1 },
    deleteBtn: {
      height: 52,
      borderRadius: 14,
      backgroundColor: '#e03131',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 4,
    },
    deleteBtnText: { fontSize: 15, fontWeight: '500', color: '#ffffff' },
  })
