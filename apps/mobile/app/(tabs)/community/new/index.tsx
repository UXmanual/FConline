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
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import { useTheme } from '@/hooks/useTheme'
import { Text, TextInput } from '@/components/Themed'
import { apiFetch } from '@/lib/apiFetch'
import { markCommunityRefresh } from '@/lib/communityRefresh'

const POST_CATEGORIES = ['자유', '팁'] as const
type PostCategory = typeof POST_CATEGORIES[number]

export default function CommunityNewScreen() {
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<PostCategory>('자유')
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
        body: JSON.stringify({ title: title.trim(), content: content.trim(), category }),
      })
      if (res.ok) {
        markCommunityRefresh()
        router.back()
      }
    } catch {}
    finally { setSubmitting(false) }
  }

  return (
    <View style={[s.safeArea, { paddingTop: insets.top }]}>
      <View style={s.navHeader}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 16, bottom: 16, left: 16, right: 24 }}>
          <Feather name="chevron-left" size={24} color={colors.title} />
        </TouchableOpacity>
        <View style={s.headerTitleWrap} pointerEvents="none">
          <Text style={[s.headerTitle, { color: colors.title }]}>글쓰기</Text>
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
            <Text style={s.submitBtnText}>등록하기</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={s.categoryRow}>
        {POST_CATEGORIES.map((cat) => {
          const isActive = category === cat
          return (
            <TouchableOpacity
              key={cat}
              style={[s.categoryChip, isActive
                ? { backgroundColor: isDark ? '#3a3f52' : colors.surfaceSoft }
                : {}
              ]}
              onPress={() => setCategory(cat)}
              activeOpacity={0.8}
            >
              <Text style={[s.categoryText, { color: isActive ? colors.title : colors.mutedText }]}>{cat}</Text>
            </TouchableOpacity>
          )
        })}
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
    content: { paddingHorizontal: 20, paddingTop: 0, paddingBottom: 40 },
    titleInput: {
      fontSize: 15,
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
