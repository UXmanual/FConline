import { useCallback, useEffect, useState } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Linking,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useTheme } from '@/hooks/useTheme'
import { API_BASE } from '@/constants/api'
import { Text, TextInput } from '@/components/Themed'
import { apiFetch } from '@/lib/apiFetch'

const URL_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+)/g
const URL_PART_PATTERN = /^(https?:\/\/[^\s]+|www\.[^\s]+)$/

type Post = {
  id: string
  category: string
  nickname: string
  level?: number | null
  avatarUrl?: string | null
  authorId?: string | null
  title: string
  content: string
  createdAt: string
  createdAtLabel: string
  commentCount: number
  likeCount: number
  isLiked?: boolean
  canDelete?: boolean
}

type Comment = {
  id: string
  postId: string
  nickname: string
  level?: number | null
  avatarUrl?: string | null
  authorId?: string | null
  content: string
  createdAt: string
  createdAtLabel: string
  canDelete?: boolean
}

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

function LinkifiedText({ text, style }: { text: string; style?: object }) {
  const parts = text.split(URL_PATTERN)
  return (
    <Text style={style}>
      {parts.map((part, index) => {
        if (!part) return null
        if (!URL_PART_PATTERN.test(part)) return <Text key={index}>{part}</Text>
        const href = part.startsWith('http') ? part : `https://${part}`
        return (
          <Text key={index} style={{ color: '#457ae5', textDecorationLine: 'underline' }} onPress={() => void Linking.openURL(href)}>
            {part}
          </Text>
        )
      })}
    </Text>
  )
}

export default function PostDetailScreen() {
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const [keyboardVisible, setKeyboardVisible] = useState(false)

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const show = Keyboard.addListener(showEvent, () => setKeyboardVisible(true))
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false))
    return () => { show.remove(); hide.remove() }
  }, [])
  const { data } = useLocalSearchParams<{ id: string; data: string }>()

  const post: Post | null = (() => {
    try { return data ? (JSON.parse(data) as Post) : null } catch { return null }
  })()

  const [comments, setComments] = useState<Comment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [commentDraft, setCommentDraft] = useState('')
  const [submitBusy, setSubmitBusy] = useState(false)
  const [commentCount, setCommentCount] = useState(post?.commentCount ?? 0)
  const [isLiked, setIsLiked] = useState(post?.isLiked ?? false)
  const [likeCount, setLikeCount] = useState(post?.likeCount ?? 0)

  const s = styles(colors, isDark)

  const loadComments = useCallback(async () => {
    if (!post) return
    setCommentsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/community/comments?postId=${post.id}&page=1&pageSize=50`)
      const json = await res.json().catch(() => null)
      if (Array.isArray(json?.items)) setComments(json.items)
    } catch {}
    finally { setCommentsLoading(false) }
  }, [post?.id])

  useEffect(() => { void loadComments() }, [loadComments])

  const handleLike = async () => {
    if (!post) return
    setIsLiked((v) => !v)
    setLikeCount((n) => n + (isLiked ? -1 : 1))
    try {
      await fetch(`${API_BASE}/api/community/posts/${post.id}/like`, { method: 'POST' })
    } catch {}
  }

  const handleSubmitComment = async () => {
    if (!post || !commentDraft.trim() || submitBusy) return
    setSubmitBusy(true)
    try {
      const res = await apiFetch('/api/community/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, content: commentDraft.trim() }),
      })
      if (res.ok) {
        setCommentDraft('')
        setCommentCount((n) => n + 1)
        await loadComments()
      }
    } catch {}
    finally { setSubmitBusy(false) }
  }

  if (!post) {
    return (
      <SafeAreaView style={[s.safeArea]} edges={['top']}>
        <View style={s.navHeader}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Feather name="chevron-left" size={24} color={colors.title} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.mutedText }}>게시글을 불러올 수 없습니다.</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      {/* 헤더 */}
      <View style={s.navHeader}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="chevron-left" size={24} color={colors.title} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 작성자 정보 */}
          <View style={s.authorRow}>
            <View style={[s.avatar, { backgroundColor: isDark ? '#3a3f52' : colors.surfaceSoft }]}>
              {post.avatarUrl ? (
                <Image source={{ uri: post.avatarUrl }} style={{ width: 44, height: 44 }} />
              ) : (
                <Text style={{ fontSize: 20 }}>{post.authorId ? pickDefaultAvatar(post.authorId) : '😀'}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.authorMeta}>
                <LevelBadge level={post.level} />
                <Text style={[s.authorName, { color: colors.bodyText }]}>{post.nickname}</Text>
                <Text style={[s.dot, { color: colors.mutedText }]}>·</Text>
                <Text style={[s.timeText, { color: colors.mutedText }]}>{post.createdAtLabel}</Text>
              </View>
            </View>
          </View>

          {/* 타이틀 */}
          <Text style={[s.postTitle, { color: colors.title }]}>{post.title}</Text>

          {/* 본문 */}
          <LinkifiedText text={post.content} style={[s.postContent, { color: colors.bodyText }]} />

          {/* 하트 */}
          <TouchableOpacity style={s.likeBtn} onPress={handleLike} activeOpacity={0.7} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <FontAwesome name={isLiked ? 'heart' : 'heart-o'} size={18} color={isLiked ? '#e03131' : colors.mutedText} />
            <Text style={[s.likeCount, { color: isLiked ? '#e03131' : colors.mutedText }]}>{likeCount}</Text>
          </TouchableOpacity>

          {/* 섹션 구분 */}
          <View style={[s.sectionDivider, { backgroundColor: colors.pageBg }]} />

          {/* 댓글 헤더 */}
          <Text style={[s.commentHeader, { color: colors.title }]}>
            댓글 <Text style={{ color: '#457ae5' }}>{commentCount}</Text>
          </Text>

          {/* 댓글 목록 */}
          {commentsLoading ? (
            <ActivityIndicator size="small" color={colors.accentBlue} style={{ marginVertical: 20 }} />
          ) : comments.length === 0 ? (
            <Text style={[s.emptyComment, { color: colors.mutedText }]}>첫 댓글을 남겨보세요!</Text>
          ) : (
            <View style={{ gap: 20 }}>
              {comments.map((comment) => (
                <View key={comment.id} style={s.commentRow}>
                  <View style={[s.commentAvatar, { backgroundColor: isDark ? '#3a3f52' : colors.surfaceSoft }]}>
                    {comment.avatarUrl ? (
                      <Image source={{ uri: comment.avatarUrl }} style={{ width: 32, height: 32 }} />
                    ) : (
                      <Text style={{ fontSize: 14 }}>{comment.authorId ? pickDefaultAvatar(comment.authorId) : '😀'}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.authorMeta}>
                      <LevelBadge level={comment.level} />
                      <Text style={[s.authorName, { color: colors.bodyText }]}>{comment.nickname}</Text>
                      <Text style={[s.dot, { color: colors.mutedText }]}>·</Text>
                      <Text style={[s.timeText, { color: colors.mutedText }]}>{comment.createdAtLabel}</Text>
                    </View>
                    <Text style={[s.commentContent, { color: colors.title }]}>{comment.content}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* 댓글 입력 */}
        <View style={[s.commentInputRow, { backgroundColor: colors.cardBg, borderTopColor: colors.divider, paddingBottom: keyboardVisible ? 14 : Math.max(insets.bottom, 12) }]}>
          <View style={[s.inputAvatar, { backgroundColor: isDark ? '#3a3f52' : colors.surfaceSoft }]}>
            <Text style={{ fontSize: 20 }}>😀</Text>
          </View>
          <TextInput
            style={[s.commentInput, { backgroundColor: isDark ? '#2a2f3d' : colors.surfaceSoft, color: colors.title }]}
            value={commentDraft}
            onChangeText={setCommentDraft}
            placeholder="댓글로 의견을 남겨보세요"
            placeholderTextColor={colors.inputPlaceholder}
            keyboardAppearance={isDark ? 'dark' : 'light'}
            multiline
          />
          <TouchableOpacity
            style={[s.commentSendBtn, { backgroundColor: commentDraft.trim() ? '#457ae5' : (isDark ? '#2a2f3d' : colors.surfaceSoft) }]}
            onPress={handleSubmitComment}
            disabled={!commentDraft.trim() || submitBusy}
          >
            {submitBusy ? (
              <ActivityIndicator size="small" color={commentDraft.trim() ? '#fff' : colors.mutedText} />
            ) : (
              <Feather name="arrow-up" size={18} color={commentDraft.trim() ? '#fff' : colors.mutedText} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = (c: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.cardBg },
    navHeader: { paddingHorizontal: 8, height: 44, justifyContent: 'center' },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    content: { paddingHorizontal: 20, paddingTop: 12, gap: 0 },
    authorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    avatar: { width: 44, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },
    authorMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
    authorName: { fontSize: 13, fontWeight: '600' },
    dot: { fontSize: 12 },
    timeText: { fontSize: 12, fontWeight: '500' },
    postTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.4, lineHeight: 26, marginBottom: 14 },
    postContent: { fontSize: 14, lineHeight: 24 },
    likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 8, marginTop: 16 },
    likeCount: { fontSize: 14, fontWeight: '600' },
    sectionDivider: { height: 16, marginHorizontal: -20, marginTop: 16 },
    commentHeader: { fontSize: 15, fontWeight: '700', marginTop: 24, marginBottom: 16 },
    emptyComment: { fontSize: 13, textAlign: 'center', paddingVertical: 20 },
    commentRow: { flexDirection: 'row', gap: 12 },
    commentAvatar: { width: 32, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, marginTop: 1 },
    inputAvatar: { width: 46, height: 46, borderRadius: 999, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },
    commentContent: { fontSize: 14, lineHeight: 22, marginTop: 6 },
    commentInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1 },
    commentInput: { flex: 1, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 14, fontSize: 14, maxHeight: 120 },
    commentSendBtn: { width: 46, height: 46, borderRadius: 999, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  })
