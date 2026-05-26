import { useState, useEffect } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import { useTheme } from '@/hooks/useTheme'
import { Text } from '@/components/Themed'
import { fetchReleaseFeed, markAllSeen, type ReleaseItem } from '@/lib/releaseNotifications'
import { getSessionSafely } from '@/lib/supabase'

type NotificationItem = ReleaseItem

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  return `${days}일 전`
}

export default function NotificationsScreen() {
  const { colors, isDark } = useTheme()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [visibleCount, setVisibleCount] = useState(5)
  const [feed, setFeed] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  const insets = useSafeAreaInsets()
  const s = styles(colors, isDark)

  useEffect(() => {
    Promise.all([fetchReleaseFeed(), getSessionSafely()])
      .then(([items, { session }]) => {
        setFeed(items)
        const userId = session?.user?.id ?? ''
        if (userId) return markAllSeen(items, userId)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const visible = feed.slice(0, visibleCount)
  const hasMore = visibleCount < feed.length

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <View style={[s.safeArea, { paddingTop: insets.top }]}>
      <View style={s.navHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Feather name="chevron-left" size={24} color={colors.title} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.title }]}>홈</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: Math.max(insets.bottom, 24) + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color={colors.mutedText} style={{ marginTop: 40 }} />
        ) : feed.length === 0 ? (
          <View style={[s.card, s.emptyWrap]}>
            <Text style={[s.emptyText, { color: colors.mutedText }]}>최근 7일 이내 알림이 없어요.</Text>
          </View>
        ) : (
          <View style={s.card}>
            {visible.map((item, index) => {
              const isExpanded = expanded.has(item.id)
              const isLast = index === visible.length - 1
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => toggle(item.id)}
                  activeOpacity={0.75}
                  style={[
                    s.item,
                    !isLast && { borderBottomWidth: 1, borderBottomColor: colors.divider },
                  ]}
                >
                  <View style={s.itemTop}>
                    <Text style={[s.itemTitle, { color: colors.title }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[s.itemTime, { color: colors.mutedText }]}>
                      {formatRelativeTime(item.createdAt)}
                    </Text>
                  </View>
                  <Text
                    style={[s.itemBody, { color: colors.bodyText }]}
                    numberOfLines={isExpanded ? undefined : 2}
                    ellipsizeMode="tail"
                  >
                    {item.body}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        {hasMore && (
          <TouchableOpacity
            style={s.moreBtn}
            onPress={() => setVisibleCount(feed.length)}
            activeOpacity={0.7}
          >
            <Text style={[s.moreBtnText, { color: colors.mutedText }]}>더보기</Text>
          </TouchableOpacity>
        )}

        {!hasMore && feed.length > 0 && (
          <Text style={[s.footer, { color: colors.mutedText }]}>
            7일 전 알림까지 확인할 수 있어요
          </Text>
        )}
      </ScrollView>
    </View>
  )
}

const styles = (c: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.pageBg },
    navHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, height: 56 },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 12, gap: 12 },
    card: {
      backgroundColor: c.cardBg,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.cardBorder,
      overflow: 'hidden',
    },
    emptyWrap: { paddingVertical: 32, alignItems: 'center' },
    emptyText: { fontSize: 14 },
    item: {
      paddingHorizontal: 20,
      paddingVertical: 18,
      gap: 6,
    },
    itemTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    itemTitle: { fontSize: 14, fontWeight: '600', letterSpacing: -0.2, flex: 1 },
    itemTime: { fontSize: 12, fontWeight: '500', flexShrink: 0 },
    itemBody: { fontSize: 14, lineHeight: 21 },
    moreBtn: {
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    moreBtnText: { fontSize: 13, fontWeight: '600' },
    footer: { fontSize: 12, textAlign: 'center' },
  })
