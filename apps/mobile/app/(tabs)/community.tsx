import { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useScrollToTop, useFocusEffect } from '@react-navigation/native'
import Feather from '@expo/vector-icons/Feather'
import { useTheme } from '@/hooks/useTheme'
import { API_BASE } from '@/constants/api'
import { Text, TextInput } from '@/components/Themed'

const POSTS_PER_PAGE = 5

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
  if (!level || level < 5) return '#9aa3af'
  if (level < 10) return '#4ade80'
  if (level < 20) return '#60a5fa'
  if (level < 30) return '#c084fc'
  return '#fbbf24'
}

function LevelBadge({ level, colors }: { level?: number | null; colors: ReturnType<typeof useTheme>['colors'] }) {
  if (!level) return null
  return (
    <View style={[badgeStyle.badge, { backgroundColor: colors.surfaceStrong }]}>
      <Text style={[badgeStyle.text, { color: getLevelColor(level) }]}>Lv.{level}</Text>
    </View>
  )
}

const badgeStyle = StyleSheet.create({
  badge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  text: { fontSize: 10, fontWeight: '700' },
})

export default function CommunityScreen() {
  const { colors, isDark } = useTheme()
  const tabBarHeight = useBottomTabBarHeight()
  const [posts, setPosts] = useState<Post[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [activePost, setActivePost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const [composerTitle, setComposerTitle] = useState('')
  const [composerContent, setComposerContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [commentDraft, setCommentDraft] = useState('')
  const [submitCommentBusy, setSubmitCommentBusy] = useState(false)

  const s = styles(colors, isDark)
  const scrollRef = useRef<ScrollView>(null)
  useScrollToTop(scrollRef)
  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false })
    }, []),
  )

  const totalPages = Math.max(1, Math.ceil(totalCount / POSTS_PER_PAGE))

  const loadPosts = useCallback(async (page: number) => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/community/posts?page=${page}&pageSize=${POSTS_PER_PAGE}`)
      const data = await res.json().catch(() => null)
      if (data?.items) {
        setPosts(data.items)
        setTotalCount(data.totalCount ?? 0)
      }
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    void loadPosts(currentPage)
  }, [currentPage, loadPosts])

  const loadComments = useCallback(async (postId: string) => {
    setCommentsLoading(true)
    setComments([])
    try {
      const res = await fetch(`${API_BASE}/api/community/comments?postId=${postId}&page=1&pageSize=20`)
      const data = await res.json().catch(() => null)
      if (Array.isArray(data?.items)) setComments(data.items)
    } catch {}
    finally { setCommentsLoading(false) }
  }, [])

  const handleOpenPost = (post: Post) => {
    setActivePost(post)
    void loadComments(post.id)
  }

  const handleClosePost = () => {
    setActivePost(null)
    setComments([])
    setCommentDraft('')
  }

  const handleLike = async (post: Post) => {
    setPosts((prev) => prev.map((p) =>
      p.id === post.id
        ? { ...p, isLiked: !p.isLiked, likeCount: p.likeCount + (p.isLiked ? -1 : 1) }
        : p
    ))
    try {
      await fetch(`${API_BASE}/api/community/posts/${post.id}/like`, { method: 'POST' })
    } catch {}
  }

  const handleSubmitPost = async () => {
    if (!composerTitle.trim() || !composerContent.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/api/community/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: composerTitle.trim(), content: composerContent.trim(), category: '자유' }),
      })
      if (res.ok) {
        setComposerOpen(false)
        setComposerTitle('')
        setComposerContent('')
        await loadPosts(1)
        setCurrentPage(1)
      }
    } catch {}
    finally { setSubmitting(false) }
  }

  const handleSubmitComment = async () => {
    if (!activePost || !commentDraft.trim() || submitCommentBusy) return
    setSubmitCommentBusy(true)
    try {
      const res = await fetch(`${API_BASE}/api/community/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: activePost.id, content: commentDraft.trim() }),
      })
      if (res.ok) {
        setCommentDraft('')
        await loadComments(activePost.id)
        setPosts((prev) => prev.map((p) =>
          p.id === activePost.id ? { ...p, commentCount: p.commentCount + 1 } : p
        ))
      }
    } catch {}
    finally { setSubmitCommentBusy(false) }
  }

  const pageWindowStart = Math.max(1, Math.min(currentPage - 2, totalPages - 4))
  const pageWindowEnd = Math.min(totalPages, pageWindowStart + 4)
  const visiblePages = Array.from({ length: pageWindowEnd - pageWindowStart + 1 }, (_, i) => pageWindowStart + i)

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: tabBarHeight + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 헤더 */}
        <View style={s.header}>
          <Text style={s.title}>와글와글 커뮤니티</Text>
          <TouchableOpacity style={s.writeBtn} onPress={() => setComposerOpen(true)}>
            <Feather name="plus-circle" size={22} color={colors.accentBlue} />
            <Text style={[s.writeBtnText, { color: colors.accentBlue }]}>글쓰기</Text>
          </TouchableOpacity>
        </View>

        {/* 게시글 목록 */}
        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="small" color={colors.accentBlue} />
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {posts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={[s.postCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                onPress={() => handleOpenPost(post)}
                activeOpacity={0.8}
              >
                <View style={s.postAuthorRow}>
                  <View style={[s.avatar, { backgroundColor: isDark ? '#3a3f52' : colors.surfaceSoft }]}>
                    {post.avatarUrl ? (
                      <Image source={{ uri: post.avatarUrl }} style={{ width: 36, height: 36 }} />
                    ) : (
                      <Text style={{ fontSize: 16 }}>{post.authorId ? pickDefaultAvatar(post.authorId) : '😀'}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={s.authorMeta}>
                      <LevelBadge level={post.level} colors={colors} />
                      <Text style={[s.authorName, { color: colors.bodyText }]} numberOfLines={1}>{post.nickname}</Text>
                      <Text style={[s.dot, { color: colors.mutedText }]}>·</Text>
                      <Text style={[s.timeText, { color: colors.mutedText }]}>{post.createdAtLabel}</Text>
                    </View>
                  </View>
                </View>
                <Text style={[s.postTitle, { color: colors.title }]} numberOfLines={2}>{post.title}</Text>
                <Text style={[s.postContent, { color: colors.bodyText }]} numberOfLines={2}>{post.content}</Text>
                <View style={s.postFooter}>
                  <TouchableOpacity style={s.footerAction} onPress={() => handleLike(post)}>
                    <Feather name="heart" size={14} color={post.isLiked ? '#e03131' : colors.mutedText} />
                    <Text style={[s.footerCount, { color: post.isLiked ? '#e03131' : colors.mutedText }]}>{post.likeCount}</Text>
                  </TouchableOpacity>
                  <View style={s.footerAction}>
                    <Feather name="message-circle" size={14} color={colors.mutedText} />
                    <Text style={[s.footerCount, { color: '#457ae5' }]}>{post.commentCount}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 페이지네이션 */}
        {!loading && totalPages > 1 && (
          <View style={s.pagination}>
            <TouchableOpacity
              onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              style={[s.pageBtn, currentPage <= 1 && { opacity: 0.3 }]}
            >
              <Feather name="chevron-left" size={16} color={colors.bodyText} />
            </TouchableOpacity>
            {visiblePages.map((page) => (
              <TouchableOpacity
                key={page}
                onPress={() => setCurrentPage(page)}
                style={[s.pageBtn, page === currentPage && s.pageBtnActive]}
              >
                <Text style={[s.pageBtnText, { color: page === currentPage ? '#457ae5' : colors.bodyText }, page === currentPage && { fontWeight: '700' }]}>
                  {page}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              style={[s.pageBtn, currentPage >= totalPages && { opacity: 0.3 }]}
            >
              <Feather name="chevron-right" size={16} color={colors.bodyText} />
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* 게시글 상세 / 댓글 모달 */}
      <Modal visible={activePost !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClosePost}>
        <SafeAreaView style={[s.modalSafe, { backgroundColor: colors.pageBg }]} edges={['top', 'bottom']}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[s.modalHeader, { borderBottomColor: colors.divider }]}>
              <Text style={[s.modalTitle, { color: colors.title }]} numberOfLines={1}>{activePost?.title}</Text>
              <TouchableOpacity onPress={handleClosePost}>
                <Feather name="x" size={22} color={colors.bodyText} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 16 }}>
              {/* 본문 */}
              {activePost && (
                <View style={[s.postCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                  <View style={s.postAuthorRow}>
                    <View style={[s.avatar, { backgroundColor: isDark ? '#3a3f52' : colors.surfaceSoft }]}>
                      {activePost.avatarUrl ? (
                        <Image source={{ uri: activePost.avatarUrl }} style={{ width: 36, height: 36 }} />
                      ) : (
                        <Text style={{ fontSize: 16 }}>{activePost.authorId ? pickDefaultAvatar(activePost.authorId) : '😀'}</Text>
                      )}
                    </View>
                    <View>
                      <View style={s.authorMeta}>
                        <LevelBadge level={activePost.level} colors={colors} />
                        <Text style={[s.authorName, { color: colors.bodyText }]}>{activePost.nickname}</Text>
                        <Text style={[s.dot, { color: colors.mutedText }]}>·</Text>
                        <Text style={[s.timeText, { color: colors.mutedText }]}>{activePost.createdAtLabel}</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={[s.postTitle, { color: colors.title }]}>{activePost.title}</Text>
                  <Text style={[s.postContentFull, { color: colors.bodyText }]}>{activePost.content}</Text>
                </View>
              )}

              {/* 댓글 */}
              <Text style={[s.commentSectionTitle, { color: colors.title }]}>
                댓글 <Text style={{ color: '#457ae5' }}>{activePost?.commentCount ?? 0}</Text>
              </Text>

              {commentsLoading ? (
                <ActivityIndicator size="small" color={colors.accentBlue} />
              ) : comments.length === 0 ? (
                <Text style={[s.emptyComment, { color: colors.mutedText }]}>첫 댓글을 남겨보세요!</Text>
              ) : (
                <View style={{ gap: 12 }}>
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
                          <LevelBadge level={comment.level} colors={colors} />
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
              <View style={{ height: 60 }} />
            </ScrollView>

            {/* 댓글 입력 */}
            <View style={[s.commentInputRow, { borderTopColor: colors.divider, backgroundColor: colors.cardBg }]}>
              <TextInput
                style={[s.commentInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.title }]}
                value={commentDraft}
                onChangeText={setCommentDraft}
                placeholder="댓글을 입력해 주세요"
                placeholderTextColor={colors.inputPlaceholder}
                multiline
              />
              <TouchableOpacity
                style={[s.commentSendBtn, { opacity: commentDraft.trim() ? 1 : 0.4 }]}
                onPress={handleSubmitComment}
                disabled={!commentDraft.trim() || submitCommentBusy}
              >
                {submitCommentBusy ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.commentSendText}>등록</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* 글쓰기 모달 */}
      <Modal visible={composerOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setComposerOpen(false)}>
        <SafeAreaView style={[s.modalSafe, { backgroundColor: colors.pageBg }]} edges={['top', 'bottom']}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[s.modalHeader, { borderBottomColor: colors.divider }]}>
              <Text style={[s.modalTitle, { color: colors.title }]}>새 글 작성</Text>
              <TouchableOpacity onPress={() => setComposerOpen(false)}>
                <Feather name="x" size={22} color={colors.bodyText} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 12 }}>
              <TextInput
                style={[s.composerTitle, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.title }]}
                value={composerTitle}
                onChangeText={setComposerTitle}
                placeholder="제목을 입력해 주세요"
                placeholderTextColor={colors.inputPlaceholder}
              />
              <TextInput
                style={[s.composerContent, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.title }]}
                value={composerContent}
                onChangeText={setComposerContent}
                placeholder="내용을 입력해 주세요"
                placeholderTextColor={colors.inputPlaceholder}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
              />
            </ScrollView>

            <View style={[s.composerFooter, { borderTopColor: colors.divider, backgroundColor: colors.cardBg }]}>
              <TouchableOpacity
                style={[s.submitBtn, (!composerTitle.trim() || !composerContent.trim() || submitting) && { opacity: 0.5 }]}
                onPress={handleSubmitPost}
                disabled={!composerTitle.trim() || !composerContent.trim() || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.submitBtnText}>등록하기</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = (c: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.pageBg },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 12, gap: 12 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 },
    title: { fontSize: 18, fontWeight: '700', color: c.title, letterSpacing: -0.4 },
    writeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    writeBtnText: { fontSize: 14, fontWeight: '600' },
    loadingWrap: { paddingVertical: 40, alignItems: 'center' },
    postCard: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 8 },
    postAuthorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    authorMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
    authorName: { fontSize: 12, fontWeight: '600' },
    dot: { fontSize: 12 },
    timeText: { fontSize: 12, fontWeight: '500' },
    postTitle: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2, lineHeight: 22 },
    postContent: { fontSize: 13, lineHeight: 20 },
    postContentFull: { fontSize: 14, lineHeight: 22 },
    postFooter: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
    footerAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    footerCount: { fontSize: 12, fontWeight: '600' },
    pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8 },
    pageBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
    pageBtnActive: { backgroundColor: c.surfaceStrong },
    pageBtnText: { fontSize: 14, fontWeight: '500' },
    modalSafe: { flex: 1 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
    modalTitle: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 12 },
    commentSectionTitle: { fontSize: 14, fontWeight: '600' },
    emptyComment: { fontSize: 13, textAlign: 'center', paddingVertical: 16 },
    commentRow: { flexDirection: 'row', gap: 10 },
    commentAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },
    commentContent: { fontSize: 13, lineHeight: 20, marginTop: 4 },
    commentInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, borderTopWidth: 1 },
    commentInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, maxHeight: 100 },
    commentSendBtn: { backgroundColor: '#457ae5', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
    commentSendText: { fontSize: 13, fontWeight: '600', color: '#fff' },
    composerTitle: { height: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, fontSize: 15 },
    composerContent: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, minHeight: 180 },
    composerFooter: { padding: 20, borderTopWidth: 1 },
    submitBtn: { backgroundColor: '#457ae5', borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center' },
    submitBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  })
