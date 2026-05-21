import { useState } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import { useTheme } from '@/hooks/useTheme'
import { Text } from '@/components/Themed'

const RECENT_WINDOW_MS = 1000 * 60 * 60 * 24 * 7

const RELEASE_PUBLISHED_AT: Record<string, string> = {
  '0.2.0': '2026-05-21T00:00:00+09:00',
  '0.1.8': '2026-05-17T00:00:00+09:00',
  '0.1.7': '2026-05-14T00:25:40+09:00',
  '0.1.6': '2026-05-13T16:35:00+09:00',
  '0.1.5': '2026-05-13T10:15:00+09:00',
  '0.1.4': '2026-05-12T14:20:00+09:00',
  '0.1.3': '2026-05-11T22:30:00+09:00',
  '0.1.1': '2026-05-11T00:00:00+09:00',
}

const RELEASE_NOTES: Record<string, string[]> = {
  '0.2.0': [
    '네이티브 앱으로 전환되었습니다. 더 빠르고 안정적인 환경에서 이용하실 수 있습니다.',
    '앱 푸시 알림 기능이 추가되었습니다. 마이페이지에서 알림을 허용하면 업데이트 소식을 받아볼 수 있습니다.',
    '선수평가 탭 개편, 계정 삭제 화면, 화면 전환 최적화 등 다양한 개선이 적용되었습니다.',
  ],
  '0.1.8': [
    '마이페이지 팝업 헤더가 스테이터스바 위로 올라가던 문제를 수정했습니다.',
    '모달 헤더에 useSafeAreaInsets를 적용해 safe area 범위 내에 정확히 배치되도록 개선했습니다.',
  ],
  '0.1.7': [
    '모바일 최근 경기 화면을 TWA 기준으로 다시 정리하고, 1:1 공식경기·볼타 라이브·감독모드의 최근 10경기 카드와 아코디언 상세 구성을 일관되게 맞췄습니다.',
    '모바일 구단주 검색 결과에 대표팀/팀컬러 엠블럼 fallback을 보강해 랭크 배지 표시에 실패하던 오류를 줄였고, 최근 경기 상세의 한글 문구 깨짐과 표시 오류를 정리했습니다.',
    '워크스페이스에 UTF-8/LF 저장 규칙을 추가해 문자 인코딩이 다시 깨질 가능성을 낮췄습니다.',
  ],
  '0.1.6': [
    '모바일 선수 상세의 강화 단계, 총 능력치, 선수 평가 탭, 다크모드 간격과 토글 스타일을 현재 TWA 기준에 맞춰 정리했습니다.',
    '모바일 홈과 마이페이지 카드 여백, 선수평가 목록 간격, 다크모드 및 정책/버전 카드 분리 등 화면 리듬을 일관되게 조정했습니다.',
    '공유용 OG 이미지를 최신 시안으로 교체했습니다.',
  ],
  '0.1.5': [
    '운영 홈에서 최신 선수평가 3건을 바로 노출할 수 있도록 /api/home/latest-player-reviews 응답 경로를 추가했습니다.',
    '선수평가 홈 카드에서 선수 상세의 선수 평가 탭으로 바로 이동할 수 있게 최신 평가 메타데이터와 강화 단계 정보를 함께 제공하도록 정리했습니다.',
  ],
  '0.1.4': [
    '모바일 홈의 컨트롤러 이용 비중이 운영 API에서 직접 데이터를 받을 수 있도록 전용 응답 경로를 추가했습니다.',
    '넥슨 데이터센터 파싱 결과를 재사용하는 /api/home/controller-usage 엔드포인트를 운영 서버 기준으로 제공하도록 정리했습니다.',
  ],
  '0.1.3': [
    'React Native + Expo 모바일 작업 기준으로 Pretendard 폰트 자산과 홈 화면 레이아웃을 정리했습니다.',
    '모바일 홈의 기본 카드 반경, 여백, 아이콘 크기, 헤더 구성을 현재 기준에 맞게 조정했습니다.',
    '운영 웹에 영향이 가지 않도록 이번 작업 중 추가했던 웹 홈 전용 API 변경은 제외했습니다.',
  ],
  '0.1.1': [
    'React Native + Expo 기반으로 화면 전환 작업을 시작했습니다.',
  ],
}

type NotificationItem = {
  id: string
  title: string
  body: string
  createdAt: string
}

function buildFeed(): NotificationItem[] {
  const now = Date.now()
  const recent = Object.entries(RELEASE_PUBLISHED_AT)
    .filter(([, at]) => now - new Date(at).getTime() < RECENT_WINDOW_MS)
    .sort((a, b) => new Date(b[1]).getTime() - new Date(a[1]).getTime())

  const latestRelease = recent[0]
    ? [{
        id: `release-${recent[0][0]}`,
        title: `버전 ${recent[0][0]} 업데이트`,
        body: (RELEASE_NOTES[recent[0][0]] ?? []).join(' ').trim() || '새 버전 업데이트가 적용되었습니다.',
        createdAt: recent[0][1],
      }]
    : []

  return latestRelease
}

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

  const insets = useSafeAreaInsets()
  const s = styles(colors, isDark)
  const feed = buildFeed()
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
    <SafeAreaView style={s.safeArea} edges={['top']}>
      {/* 헤더 */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={s.navHeader}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 24 }}
        activeOpacity={0.7}
      >
        <Feather name="chevron-left" size={20} color={colors.title} />
        <Text style={[s.headerTitle, { color: colors.title }]}>홈</Text>
      </TouchableOpacity>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: Math.max(insets.bottom, 24) + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {feed.length === 0 ? (
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
    </SafeAreaView>
  )
}

const styles = (c: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.pageBg },
    navHeader: {
      height: 44,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
    },
    headerTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.4 },
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
