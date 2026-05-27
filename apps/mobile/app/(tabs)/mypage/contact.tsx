import { useState, useEffect } from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  Platform,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import { useTheme } from '@/hooks/useTheme'
import { Text, TextInput } from '@/components/Themed'
import { apiFetch } from '@/lib/apiFetch'

const CONTACT_CATEGORIES = ['앱 문의', '기능 요청', '오류 제보'] as const
type ContactCategory = typeof CONTACT_CATEGORIES[number]

export default function ContactScreen() {
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const [category, setCategory] = useState<ContactCategory>('앱 문의')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [contact, setContact] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const show = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height))
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0))
    return () => { show.remove(); hide.remove() }
  }, [])

  const s = styles(colors, isDark)
  const canSubmit = title.trim().length > 0 && content.trim().length > 0 && !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const res = await apiFetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          contact: contact.trim(),
          category,
        }),
      })
      if (res.ok) {
        Alert.alert('전송 완료', '문의가 전달되었습니다. 감사합니다!', [
          { text: '확인', onPress: () => router.back() },
        ])
      } else {
        const data = await res.json().catch(() => null)
        Alert.alert('오류', data?.message ?? '문의 전송에 실패했습니다.')
      }
    } catch {
      Alert.alert('오류', '네트워크 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View style={[s.safeArea, { paddingTop: insets.top }]}>
      <View style={s.navHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.backBtn}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 24 }}
        >
          <Feather name="chevron-left" size={24} color={colors.title} />
        </TouchableOpacity>
        <View style={s.headerTitleWrap} pointerEvents="none">
          <Text style={[s.headerTitle, { color: colors.title }]}>무엇을 도와드릴까요?</Text>
        </View>
        <TouchableOpacity
          style={[s.submitBtn, !canSubmit && { opacity: 0.4 }]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#457ae5" />
          ) : (
            <Text style={s.submitBtnText}>전송하기</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={s.categoryRow}>
        {CONTACT_CATEGORIES.map((cat) => {
          const isActive = category === cat
          return (
            <TouchableOpacity
              key={cat}
              style={[s.categoryChip, isActive && { backgroundColor: isDark ? '#3a3f52' : colors.surfaceSoft }]}
              onPress={() => setCategory(cat)}
              activeOpacity={0.8}
            >
              <Text style={[s.categoryText, { color: isActive ? colors.title : colors.mutedText }]}>{cat}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <View style={{ flex: 1, paddingBottom: keyboardHeight }}>
        <View style={[s.content, { flex: 1 }]}>
          <TextInput
            style={[s.titleInput, { color: colors.title, borderBottomColor: colors.divider }]}
            value={title}
            onChangeText={setTitle}
            placeholder="제목을 입력해 주세요"
            placeholderTextColor={colors.inputPlaceholder}
            returnKeyType="next"
            maxLength={100}
            keyboardAppearance={isDark ? 'dark' : 'light'}
            autoFocus
          />
          <TextInput
            style={[s.contentInput, { color: colors.title }]}
            value={content}
            onChangeText={setContent}
            placeholder="문의 내용을 입력해 주세요"
            placeholderTextColor={colors.inputPlaceholder}
            multiline
            textAlignVertical="top"
            keyboardAppearance={isDark ? 'dark' : 'light'}
          />
        </View>

        <View style={[s.contactWrap, { backgroundColor: colors.cardBg, borderTopColor: colors.divider, paddingBottom: insets.bottom + 14 }]}>
          <Text style={[s.contactLabel, { color: colors.mutedText }]}>연락수단 (선택)</Text>
          <TextInput
            style={[s.contactInput, { color: colors.title }]}
            value={contact}
            onChangeText={setContact}
            placeholder="이메일, 카카오 ID 등"
            placeholderTextColor={colors.inputPlaceholder}
            returnKeyType="done"
            maxLength={100}
            keyboardAppearance={isDark ? 'dark' : 'light'}
          />
        </View>
      </View>
    </View>
  )
}

const styles = (c: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.cardBg },
    navHeader: {
      height: 56,
      paddingHorizontal: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
    headerTitleWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3, textAlign: 'center' },
    submitBtn: { paddingHorizontal: 12, height: 40, alignItems: 'center', justifyContent: 'center' },
    submitBtnText: { fontSize: 15, fontWeight: '700', color: '#457ae5' },
    categoryRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    categoryChip: {
      height: 36,
      paddingHorizontal: 16,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryText: { fontSize: 13, fontWeight: '600' },
    content: { paddingHorizontal: 20, paddingTop: 0 },
    titleInput: {
      fontSize: 15,
      fontWeight: '600',
      paddingVertical: 18,
      borderBottomWidth: 1,
      letterSpacing: -0.3,
    },
    contentInput: {
      flex: 1,
      fontSize: 15,
      lineHeight: 24,
      paddingTop: 18,
    },
    contactWrap: {
      flexShrink: 0,
      borderTopWidth: 1,
      paddingTop: 12,
      paddingHorizontal: 20,
      gap: 4,
    },
    contactLabel: { fontSize: 12, fontWeight: '500' },
    contactInput: {
      fontSize: 14,
      lineHeight: 22,
      paddingVertical: 10,
    },
  })
