import { useState } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import { useTheme } from '@/hooks/useTheme'
import { Text, TextInput } from '@/components/Themed'
import { apiFetch } from '@/lib/apiFetch'
import { markCommunityRefresh } from '@/lib/communityRefresh'

export default function CommunityNewScreen() {
  const { colors, isDark } = useTheme()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const s = styles(colors, isDark)
  const canSubmit = title.trim().length > 0 && content.trim().length > 0 && !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const res = await apiFetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), category: '자유' }),
      })
      if (res.ok) {
        markCommunityRefresh()
        router.back()
      }
    } catch {}
    finally { setSubmitting(false) }
  }

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      <View style={s.navHeader}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="chevron-left" size={24} color={colors.title} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.title }]}>글쓰기</Text>
        <TouchableOpacity
          style={[s.submitBtn, !canSubmit && { opacity: 0.4 }]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#457ae5" />
          ) : (
            <Text style={s.submitBtnText}>등록하기</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={[s.categoryRow, { borderBottomColor: colors.divider }]}>
        <View style={[s.categoryChip, { backgroundColor: isDark ? '#2a2f3d' : colors.surfaceSoft }]}>
          <Text style={[s.categoryText, { color: colors.title }]}>자유게시판</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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
            placeholder={`내용을 입력해 주세요\n\n광고, 비난, 도배성 글을 남기면 영구적으로 활동이 제한될 수 있어요.`}
            placeholderTextColor={colors.inputPlaceholder}
            multiline
            textAlignVertical="top"
            keyboardAppearance={isDark ? 'dark' : 'light'}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = (c: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.cardBg },
    navHeader: {
      height: 44,
      paddingHorizontal: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3, position: 'absolute', left: 0, right: 0, textAlign: 'center' },
    submitBtn: { paddingHorizontal: 12, height: 40, alignItems: 'center', justifyContent: 'center' },
    submitBtnText: { fontSize: 15, fontWeight: '700', color: '#457ae5' },
    categoryRow: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
    },
    categoryChip: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    categoryText: { fontSize: 13, fontWeight: '600' },
    content: { paddingHorizontal: 20, paddingTop: 0, paddingBottom: 40 },
    titleInput: {
      fontSize: 17,
      fontWeight: '600',
      paddingVertical: 18,
      borderBottomWidth: 1,
      letterSpacing: -0.3,
    },
    contentInput: {
      fontSize: 15,
      lineHeight: 24,
      paddingTop: 18,
      minHeight: 300,
    },
  })
