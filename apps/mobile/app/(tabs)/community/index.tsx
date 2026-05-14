import { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useScrollToTop, useFocusEffect } from '@react-navigation/native'
import { router } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useTheme } from '@/hooks/useTheme'
import { API_BASE } from '@/constants/api'
import { Text } from '@/components/Themed'
import { consumeCommunityRefresh } from '@/lib/communityRefresh'

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

function clampLines(text: string, max: number): string {
  const lines = text.split('\n')
  if (lines.length > max) return lines.slice(0, max).join('\n') + '...'
  return text
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

export default function CommunityScreen() {
  const { colors, isDark } = useTheme()
  const tabBarHeight = useBottomTabBarHeight()
  const [posts, setPosts] = useState<Post[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const s = styles(colors, isDark)
  const scrollRef = useRef<ScrollView>(null)
  useScrollToTop(scrollRef)
  const totalPages = Math.max(1, Math.ceil(totalCount / POSTS_PER_PAGE))

  const loadPosts = useCallback(async (page: number) => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/community/posts?page=${page}&pageSize=${POSTS_PER_PAGE}&includeTotalCount=1`)
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

  useFocusEffect(
    useCallback(() => {
      if (consumeCommunityRefresh()) {
        setCurrentPage(1)
        void loadPosts(1)
      }
    }, [loadPosts]),
  )

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

  const handleOpenPost = (post: Post) => {
    router.push({ pathname: '/(tabs)/community/[id]/', params: { id: post.id, data: JSON.stringify(post) } })
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
          <View style={s.titleRow}>
            <Text style={s.title}>커뮤니티</Text>
          </View>
          <Text style={[s.desc, { color: colors.mutedText }]}>{'여기는 누구나 쓸 수 있는 공간이에요\n서로를 배려해서 글을 작성해주세요'}</Text>
          <View style={s.boardRow}>
            <TouchableOpacity style={[s.boardTab, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]} activeOpacity={0.8}>
              <Text style={[s.boardTabText, { color: colors.title }]}>자유게시판</Text>
              <Text style={s.countText}>{totalCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.writeBtn} onPress={() => router.push('/(tabs)/community/new/')} activeOpacity={0.85}>
              <Text style={s.writeBtnText}>글쓰기</Text>
            </TouchableOpacity>
          </View>
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
                <View style={s.postTop}>
                  <View style={[s.avatar, { backgroundColor: isDark ? '#3a3f52' : colors.surfaceSoft, marginTop: 2 }]}>
                    {post.avatarUrl ? (
                      <Image source={{ uri: post.avatarUrl }} style={{ width: 40, height: 40 }} />
                    ) : (
                      <Text style={{ fontSize: 18 }}>{post.authorId ? pickDefaultAvatar(post.authorId) : '😀'}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={s.authorMeta}>
                      <LevelBadge level={post.level} />
                      <Text style={[s.authorName, { color: colors.bodyText }]} numberOfLines={1}>{post.nickname}</Text>
                      <Text style={[s.dot, { color: colors.mutedText }]}>·</Text>
                      <Text style={[s.timeText, { color: colors.mutedText }]}>{post.createdAtLabel}</Text>
                    </View>
                    <Text style={[s.postTitle, { color: colors.title }]} numberOfLines={2}>{post.title}</Text>
                    <Text style={[s.postContent, { color: colors.bodyText }]} numberOfLines={2} ellipsizeMode="tail">{clampLines(post.content, 2)}</Text>
                  </View>
                </View>
                <View style={s.postFooter}>
                  <TouchableOpacity style={s.footerAction} onPress={() => handleOpenPost(post)}>
                    <Text style={[s.footerLabel, { color: colors.title }]}>댓글</Text>
                    <Text style={[s.footerCount, { color: '#457ae5' }]}>{post.commentCount}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.footerAction}
                    onPress={() => handleLike(post)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <FontAwesome name={post.isLiked ? 'heart' : 'heart-o'} size={14} color={post.isLiked ? '#e03131' : colors.mutedText} />
                    <Text style={[s.footerCount, { color: post.isLiked ? '#e03131' : colors.mutedText }]}>{post.likeCount}</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 페이지네이션 */}
        {!loading && totalPages > 1 && (
          <View style={[s.pagination, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <TouchableOpacity
              onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              style={[s.pageNavBtn, { backgroundColor: colors.surfaceSoft }, currentPage <= 1 && { opacity: 0.4 }]}
            >
              <Feather name="chevron-left" size={16} color={colors.bodyText} />
            </TouchableOpacity>
            <View style={s.pageNums}>
              {visiblePages.map((page) => (
                <TouchableOpacity
                  key={page}
                  onPress={() => setCurrentPage(page)}
                  style={[s.pageBtn, { backgroundColor: page === currentPage ? '#457ae5' : colors.surfaceSoft }]}
                >
                  <Text style={[s.pageBtnText, { color: page === currentPage ? '#fff' : colors.bodyText }]}>
                    {page}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              style={[s.pageNavBtn, { backgroundColor: colors.surfaceSoft }, currentPage >= totalPages && { opacity: 0.4 }]}
            >
              <Feather name="chevron-right" size={16} color={colors.bodyText} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

    </SafeAreaView>
  )
}

const styles = (c: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.pageBg },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 12, gap: 12 },
    header: { gap: 6 },
    titleRow: { minHeight: 32, justifyContent: 'center' },
    title: { fontSize: 18, fontWeight: '700', color: c.title, letterSpacing: -0.4 },
    desc: { fontSize: 13, lineHeight: 19 },
    boardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
    boardTab: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 36, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1 },
    boardTabText: { fontSize: 14, fontWeight: '600' },
    countText: { fontSize: 14, fontWeight: '600', color: '#457ae5' },
    writeBtn: { backgroundColor: '#457ae5', borderRadius: 999, height: 36, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
    writeBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
    loadingWrap: { paddingVertical: 40, alignItems: 'center' },
    postCard: { borderRadius: 16, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderWidth: 1 },
    postTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    avatar: { width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },
    authorMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
    authorName: { fontSize: 12, fontWeight: '600' },
    dot: { fontSize: 12 },
    timeText: { fontSize: 12, fontWeight: '500' },
    postTitle: { fontSize: 15, fontWeight: '600', letterSpacing: -0.3, lineHeight: 22, marginTop: 12 },
    postContent: { fontSize: 14, lineHeight: 20, marginTop: 8 },
    postFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
    footerAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    footerLabel: { fontSize: 12, fontWeight: '500' },
    footerCount: { fontSize: 12, fontWeight: '600' },
    pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
    pageNavBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
    pageNums: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    pageBtn: { minWidth: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 999, paddingHorizontal: 10 },
    pageBtnText: { fontSize: 14, fontWeight: '600' },
  })
