import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated,
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  Easing,
  Modal,
  Platform,
} from 'react-native'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useScrollToTop, useFocusEffect } from '@react-navigation/native'
import Feather from '@expo/vector-icons/Feather'
import { useTheme } from '@/hooks/useTheme'
import { API_BASE } from '@/constants/api'
import { Text, TextInput } from '@/components/Themed'

type UserProfile = {
  id: string
  email: string
  nickname: string
  level?: number | null
  xp?: number | null
  xpForNextLevel?: number | null
  avatarUrl?: string | null
}

function getLevelColor(level?: number | null): string {
  if (!level || level < 5) return '#9aa3af'
  if (level < 10) return '#4ade80'
  if (level < 20) return '#60a5fa'
  if (level < 30) return '#c084fc'
  return '#fbbf24'
}

function pickDefaultAvatar(id: string): string {
  const emojis = ['😀', '😊', '🦊', '🐼', '🦁', '🐯', '🐸', '🐧', '🦅', '🐬']
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return emojis[hash % emojis.length] ?? '😀'
}

const APP_VERSION = '0.1.6'

const TERMS_CONTENT = [
  '최종 업데이트: 2026.04.20',
  'FConline Ground는 FC Online 관련 정보 탐색을 지원하는 앱입니다.',
  '서비스는 경기 기록 조회, 선수 검색, 커뮤니티 이용, 설정 및 안내 정보 제공 기능 등을 포함합니다.',
  '이용자가 서비스 내에 작성한 게시물, 댓글 등 콘텐츠에 대한 책임은 작성한 이용자에게 있습니다.',
  '운영자는 서비스의 전부 또는 일부 기능을 추가, 수정 또는 중단할 수 있습니다.',
].join('\n\n')

export default function MypageScreen() {
  const { colors, isDark, toggleThemeMode } = useTheme()
  const tabBarHeight = useBottomTabBarHeight()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [showTerms, setShowTerms] = useState(false)
  const [showLicenses, setShowLicenses] = useState(false)
  const [showNicknameEdit, setShowNicknameEdit] = useState(false)
  const [nicknameDraft, setNicknameDraft] = useState('')
  const [nicknameSubmitting, setNicknameSubmitting] = useState(false)
  const themeToggleTranslateX = useRef(new Animated.Value(isDark ? 24 : 0)).current

  const s = styles(colors, isDark)
  const scrollRef = useRef<ScrollView>(null)
  useScrollToTop(scrollRef)
  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false })
    }, []),
  )

  useEffect(() => {
    themeToggleTranslateX.setValue(isDark ? 24 : 0)
  }, [isDark, themeToggleTranslateX])

  useEffect(() => {
    fetch(`${API_BASE}/api/mypage/profile`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data?.id) setProfile(data)
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false))
  }, [])

  const handleLogin = () => {
    Alert.alert('로그인', '웹 브라우저에서 Google 로그인을 진행하세요.\n\nfconlineground.com')
  }

  const handleLogout = async () => {
    Alert.alert('로그아웃', '로그아웃 하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃', style: 'destructive', onPress: async () => {
          try {
            await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' })
          } catch {}
          setProfile(null)
        }
      },
    ])
  }

  const handleNicknameEdit = () => {
    setNicknameDraft(profile?.nickname ?? '')
    setShowNicknameEdit(true)
  }

  const handleNicknameSubmit = async () => {
    const trimmed = nicknameDraft.trim()
    if (!trimmed || nicknameSubmitting) return
    setNicknameSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/api/mypage/nickname`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ nickname: trimmed }),
      })
      if (res.ok) {
        setProfile((prev) => prev ? { ...prev, nickname: trimmed } : prev)
        setShowNicknameEdit(false)
      } else {
        const data = await res.json().catch(() => null)
        Alert.alert('오류', data?.message ?? '닉네임 변경에 실패했어요.')
      }
    } catch {
      Alert.alert('오류', '닉네임 변경에 실패했어요.')
    } finally {
      setNicknameSubmitting(false)
    }
  }

  const handleThemeToggle = useCallback(() => {
    Animated.timing(themeToggleTranslateX, {
      toValue: isDark ? 0 : 24,
      duration: 140,
      easing: Easing.out(Easing.circle),
      useNativeDriver: true,
    }).start()
    toggleThemeMode()
  }, [isDark, themeToggleTranslateX, toggleThemeMode])

  const xpPercent =
    profile?.xp != null && profile?.xpForNextLevel
      ? Math.min(100, Math.round((profile.xp / profile.xpForNextLevel) * 100))
      : null

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: tabBarHeight + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 헤더 */}
        <View style={s.sectionHeader}>
          <Text style={s.pageTitle}>마이페이지</Text>
        </View>

        {/* 프로필 카드 */}
        <View style={s.card}>
          {profileLoading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator size="small" color={colors.accentBlue} />
            </View>
          ) : profile ? (
            <>
              <View style={s.profileRow}>
                <View style={[s.avatarWrap, { backgroundColor: isDark ? '#3a3f52' : colors.surfaceSoft }]}>
                  {profile.avatarUrl ? (
                    <Image source={{ uri: profile.avatarUrl }} style={{ width: 60, height: 60 }} />
                  ) : (
                    <Text style={{ fontSize: 26 }}>{pickDefaultAvatar(profile.id)}</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.nicknameRow}>
                    <Text style={[s.nickname, { color: colors.title }]} numberOfLines={1}>{profile.nickname}</Text>
                    {profile.level != null && (
                      <View style={[s.levelBadge, { backgroundColor: colors.surfaceStrong }]}>
                        <Text style={[s.levelText, { color: getLevelColor(profile.level) }]}>Lv.{profile.level}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[s.email, { color: colors.mutedText }]} numberOfLines={1}>{profile.email}</Text>
                  {xpPercent !== null && (
                    <View style={{ marginTop: 8 }}>
                      <View style={[s.xpBar, { backgroundColor: colors.surfaceStrong }]}>
                        <View style={[s.xpFill, { width: `${xpPercent}%` }]} />
                      </View>
                      <Text style={[s.xpLabel, { color: colors.mutedText }]}>XP {profile.xp} / {profile.xpForNextLevel}</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={[s.divider, { backgroundColor: colors.divider }]} />

              <View style={s.profileActions}>
                <TouchableOpacity style={s.profileAction} onPress={handleNicknameEdit}>
                  <Text style={[s.profileActionText, { color: colors.bodyText }]}>닉네임 변경</Text>
                  <Feather name="chevron-right" size={16} color={colors.mutedText} />
                </TouchableOpacity>
                <TouchableOpacity style={s.profileAction} onPress={handleLogout}>
                  <Text style={[s.profileActionText, { color: colors.accentRed }]}>로그아웃</Text>
                  <Feather name="chevron-right" size={16} color={colors.mutedText} />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={s.loginPrompt}>
              <Text style={[s.loginTitle, { color: colors.title }]}>로그인이 필요해요</Text>
              <Text style={[s.loginDesc, { color: colors.bodyText }]}>커뮤니티 글쓰기, 선수 즐겨찾기 등을 이용하려면 로그인하세요.</Text>
              <TouchableOpacity style={s.loginBtn} onPress={handleLogin}>
                <Text style={s.loginBtnText}>Google로 로그인</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 레벨 가이드 */}
        <View style={s.card}>
          <Text style={[s.sectionTitle, { color: colors.title }]}>경험치 획득 방법</Text>
          <View style={{ gap: 6, marginTop: 10 }}>
            {[
              '하루 첫 로그인: +5 XP',
              '커뮤니티 글 작성: +12 XP',
              '선수평가 글 작성: +10 XP',
              '커뮤니티 댓글 작성: +4 XP',
              '선수평가 댓글 작성: +4 XP',
              '하루 첫 글 보너스: +5 XP',
              '하루 첫 댓글 보너스: +3 XP',
            ].map((item, i) => (
              <Text key={i} style={[s.guideItem, { color: colors.bodyText }]}>· {item}</Text>
            ))}
          </View>
        </View>

        {/* 다크모드 */}
        <View style={s.card}>
          <View style={s.settingRowCompact}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={s.settingTitleRowCompact}>
                <Text style={[s.settingLabel, { color: colors.title }]}>다크모드</Text>
                <Text style={[s.darkModeStatus, { color: isDark ? colors.accentBlue : colors.mutedText }]}>
                  {isDark ? '적용중' : '미적용'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              accessibilityRole="switch"
              accessibilityState={{ checked: isDark }}
              activeOpacity={0.85}
              onPress={handleThemeToggle}
              style={[
                s.themeToggleTrack,
                { backgroundColor: isDark ? '#457ae5' : '#d5dbe3' },
              ]}
            >
              <Animated.View
                style={[
                  s.themeToggleThumb,
                  { transform: [{ translateX: themeToggleTranslateX }] },
                ]}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* 버전 */}
        <View style={s.card}>
          <View style={s.settingRowCompact}>
            <Text style={[s.settingLabel, { color: colors.bodyText }]}>버전</Text>
            <Text style={[s.settingValue, { color: colors.mutedText }]}>{APP_VERSION}</Text>
          </View>
        </View>

        {/* 이용약관 */}
        <View style={s.card}>
          <TouchableOpacity style={s.settingRowCompact} onPress={() => setShowTerms(true)}>
            <Text style={[s.settingLabel, { color: colors.bodyText }]}>이용약관</Text>
            <Feather name="chevron-right" size={16} color={colors.mutedText} />
          </TouchableOpacity>
        </View>

        {/* 오픈소스 라이선스 */}
        <View style={s.card}>
          <TouchableOpacity style={s.settingRowCompact} onPress={() => setShowLicenses(true)}>
            <Text style={[s.settingLabel, { color: colors.bodyText }]}>오픈소스 라이선스</Text>
            <Feather name="chevron-right" size={16} color={colors.mutedText} />
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* 이용약관 모달 */}
      <Modal visible={showTerms} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowTerms(false)}>
        <SafeAreaView style={[s.modalSafe, { backgroundColor: colors.pageBg }]} edges={['top', 'bottom']}>
          <View style={[s.modalHeader, { borderBottomColor: colors.divider }]}>
            <Text style={[s.modalTitle, { color: colors.title }]}>이용약관</Text>
            <TouchableOpacity onPress={() => setShowTerms(false)}>
              <Feather name="x" size={22} color={colors.bodyText} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text style={[s.termsText, { color: colors.bodyText }]}>{TERMS_CONTENT}</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 오픈소스 모달 */}
      <Modal visible={showLicenses} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowLicenses(false)}>
        <SafeAreaView style={[s.modalSafe, { backgroundColor: colors.pageBg }]} edges={['top', 'bottom']}>
          <View style={[s.modalHeader, { borderBottomColor: colors.divider }]}>
            <Text style={[s.modalTitle, { color: colors.title }]}>오픈소스 라이선스</Text>
            <TouchableOpacity onPress={() => setShowLicenses(false)}>
              <Feather name="x" size={22} color={colors.bodyText} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            {[
              { name: '여기어때 잘난체', desc: '여기어때컴퍼니 폰트 라이선스' },
              { name: '넥슨 Open API', desc: 'FC Online 데이터 제공 · openapi.nexon.com' },
              { name: 'Expo', desc: 'MIT License · expo.dev' },
              { name: 'React Native', desc: 'MIT License · reactnative.dev' },
            ].map((item) => (
              <View key={item.name}>
                <Text style={[s.licenseTitle, { color: colors.title }]}>{item.name}</Text>
                <Text style={[s.licenseDesc, { color: colors.mutedText }]}>{item.desc}</Text>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 닉네임 변경 모달 */}
      <Modal visible={showNicknameEdit} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowNicknameEdit(false)}>
        <SafeAreaView style={[s.modalSafe, { backgroundColor: colors.pageBg }]} edges={['top', 'bottom']}>
          <View style={[s.modalHeader, { borderBottomColor: colors.divider }]}>
            <Text style={[s.modalTitle, { color: colors.title }]}>닉네임 변경</Text>
            <TouchableOpacity onPress={() => setShowNicknameEdit(false)}>
              <Feather name="x" size={22} color={colors.bodyText} />
            </TouchableOpacity>
          </View>
          <View style={{ padding: 20, gap: 12 }}>
            <TextInput
              style={[s.nicknameInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.title }]}
              value={nicknameDraft}
              onChangeText={setNicknameDraft}
              placeholder="새 닉네임 입력"
              placeholderTextColor={colors.inputPlaceholder}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleNicknameSubmit}
            />
            <TouchableOpacity
              style={[s.submitBtn, (!nicknameDraft.trim() || nicknameSubmitting) && { opacity: 0.5 }]}
              onPress={handleNicknameSubmit}
              disabled={!nicknameDraft.trim() || nicknameSubmitting}
            >
              {nicknameSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={s.submitBtnText}>변경하기</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = (c: ReturnType<typeof useTheme>['colors'], _isDark: boolean) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.pageBg },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 12, gap: 12 },
    sectionHeader: { minHeight: 32, justifyContent: 'center' },
    pageTitle: { fontSize: 18, fontWeight: '800', color: c.title, letterSpacing: -0.4 },
    card: {
      backgroundColor: c.cardBg,
      borderRadius: 16,
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    loadingWrap: { paddingVertical: 24, alignItems: 'center' },
    profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    avatarWrap: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    nicknameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    nickname: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
    levelBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    levelText: { fontSize: 11, fontWeight: '700' },
    email: { fontSize: 12, fontWeight: '500' },
    xpBar: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 6 },
    xpFill: { height: '100%', backgroundColor: '#457ae5', borderRadius: 3 },
    xpLabel: { fontSize: 11, fontWeight: '500', marginTop: 4 },
    divider: { height: 1, marginVertical: 12 },
    profileActions: { gap: 4 },
    profileAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
    profileActionText: { fontSize: 14, fontWeight: '500' },
    loginPrompt: { gap: 10 },
    loginTitle: { fontSize: 16, fontWeight: '700' },
    loginDesc: { fontSize: 13, lineHeight: 20 },
    loginBtn: {
      marginTop: 6,
      height: 48,
      backgroundColor: '#457ae5',
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loginBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
    sectionTitle: { fontSize: 14, fontWeight: '600' },
    guideItem: { fontSize: 13, lineHeight: 20 },
    settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
    settingRowCompact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 28 },
    settingTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    settingTitleRowCompact: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    settingLabel: { fontSize: 14, fontWeight: '500' },
    settingCaption: { fontSize: 12, lineHeight: 18, fontWeight: '500' },
    settingValue: { fontSize: 14, fontWeight: '500' },
    darkModeStatus: { fontSize: 14, fontWeight: '600' },
    themeBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
    themeBadgeText: { fontSize: 11, fontWeight: '700' },
    themeToggleTrack: {
      width: 64,
      height: 28,
      borderRadius: 999,
      padding: 3,
      justifyContent: 'center',
      flexShrink: 0,
    },
    themeToggleThumb: {
      width: 34,
      height: 22,
      borderRadius: 999,
      backgroundColor: '#ffffff',
    },
    modalSafe: { flex: 1 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
    modalTitle: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 12 },
    termsText: { fontSize: 14, lineHeight: 22 },
    licenseTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
    licenseDesc: { fontSize: 13 },
    nicknameInput: { height: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, fontSize: 15 },
    submitBtn: { height: 48, backgroundColor: '#457ae5', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    submitBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  })
