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
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native'

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true)
}
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useScrollToTop, useFocusEffect } from '@react-navigation/native'
import { router } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from 'react-native-svg'
import { useTheme } from '@/hooks/useTheme'
import { supabase } from '@/lib/supabase'
import { apiFetch } from '@/lib/apiFetch'
import { Text } from '@/components/Themed'

function GoogleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18">
      <Path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.56 2.68-3.86 2.68-6.62Z" />
      <Path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <Path fill="#FBBC05" d="M3.97 10.71A5.41 5.41 0 0 1 3.69 9c0-.59.1-1.16.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3.01-2.33Z" />
      <Path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.36l2.58-2.58C13.46.9 11.42 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </Svg>
  )
}

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
  const [xpGuideOpen, setXpGuideOpen] = useState(false)
  const [xpBarWidth, setXpBarWidth] = useState(0)
  const themeToggleTranslateX = useRef(new Animated.Value(isDark ? 24 : 0)).current

  const s = styles(colors, isDark)
  const scrollRef = useRef<ScrollView>(null)
  useScrollToTop(scrollRef)

  useEffect(() => {
    themeToggleTranslateX.setValue(isDark ? 24 : 0)
  }, [isDark, themeToggleTranslateX])

  const fetchProfile = useCallback(async () => {
    setProfileLoading(true)
    try {
      const res = await apiFetch('/api/mypage/profile')
      const data = await res.json().catch(() => null)
      if (data?.id) setProfile(data)
      else setProfile(null)
    } catch {}
    finally { setProfileLoading(false) }
  }, [])

  useEffect(() => { void fetchProfile() }, [fetchProfile])

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false })
      void fetchProfile()
    }, [fetchProfile]),
  )

  const handleLogin = async () => {
    try {
      const redirectTo = Linking.createURL('auth/callback')
      if (Platform.OS === 'android') await WebBrowser.warmUpAsync().catch(() => null)

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams: { prompt: 'select_account' },
        },
      })
      if (error || !data.url) return Alert.alert('오류', '로그인 URL을 가져오지 못했습니다.')
      if (!data.url.startsWith('https://')) return Alert.alert('오류', '잘못된 로그인 URL입니다.')

      await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
      if (Platform.OS === 'android') await WebBrowser.coolDownAsync().catch(() => null)

      await fetchProfile()
    } catch {
      Alert.alert('오류', '로그인 중 문제가 발생했습니다.')
    }
  }

  const handleLogout = async () => {
    Alert.alert('로그아웃', '로그아웃 하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃', style: 'destructive', onPress: async () => {
          try {
            await supabase.auth.signOut()
            await apiFetch('/api/auth/logout', { method: 'POST' })
          } catch {}
          setProfile(null)
        }
      },
    ])
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

        {/* 구글 로그인 카드 */}
        <View style={s.card}>
          <View style={s.loginStatusRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[s.settingLabel, { color: colors.title }]}>구글 로그인</Text>
              {profileLoading ? (
                <ActivityIndicator size="small" color={colors.accentBlue} />
              ) : profile ? (
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#457ae5' }}>연결 중</Text>
              ) : (
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.mutedText }}>연결 전</Text>
              )}
            </View>
            {!profileLoading && profile && (
              <TouchableOpacity onPress={handleLogout} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: colors.mutedText }}>로그아웃</Text>
              </TouchableOpacity>
            )}
          </View>
          {!profileLoading && !profile && (
            <>
              <Text style={[s.loginDesc, { color: colors.mutedText, marginTop: 8 }]}>
                구글 로그인하고 커뮤니티와 선수평가에 참여해요
              </Text>
              <TouchableOpacity style={[s.googleBtn, { borderColor: isDark ? '#3c4043' : '#dadce0' }]} onPress={handleLogin} activeOpacity={0.8}>
                <View style={s.googleBtnInner}>
                  <View style={s.googleBtnIconWrap}>
                    <GoogleIcon />
                  </View>
                  <Text style={[s.googleBtnText, { color: colors.title }]}>Google 계정으로 로그인</Text>
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* 프로필 카드 (로그인 시) */}
        {profile && (
          <View style={s.card}>
            <View style={s.profileRow}>
              <View style={[s.avatarWrap, { backgroundColor: isDark ? '#3a3f52' : colors.surfaceSoft }]}>
                {profile.avatarUrl ? (
                  <Image source={{ uri: profile.avatarUrl }} style={{ width: 60, height: 60 }} />
                ) : (
                  <Text style={{ fontSize: 26 }}>{pickDefaultAvatar(profile.id)}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.nickname, { color: colors.title }]} numberOfLines={1}>
                  {profile.level != null && (
                    <Text style={{ color: getLevelColor(profile.level), fontWeight: '600' }}>{`Lv.${profile.level} `}</Text>
                  )}
                  {profile.nickname}
                </Text>
                <Text style={[s.email, { color: colors.mutedText }]} numberOfLines={1}>{profile.email}</Text>
                {xpPercent !== null && (
                  <View style={{ marginTop: 4 }}>
                    <View
                      style={[s.xpBar, { backgroundColor: colors.surfaceStrong }]}
                      onLayout={(e) => setXpBarWidth(e.nativeEvent.layout.width)}
                    >
                      {xpBarWidth > 0 && (
                        <Svg width={xpBarWidth} height={6} style={{ position: 'absolute', top: 0, left: 0 }}>
                          <Defs>
                            <SvgLinearGradient id="xpGrad" x1="0" y1="0" x2="1" y2="0">
                              <Stop offset="0" stopColor="#457ae5" />
                              <Stop offset="0.5" stopColor="#a855f7" />
                              <Stop offset="1" stopColor="#ec4899" />
                            </SvgLinearGradient>
                          </Defs>
                          <Rect x={0} y={0} width={(xpBarWidth * xpPercent) / 100} height={6} rx={3} fill="url(#xpGrad)" />
                        </Svg>
                      )}
                    </View>
                    <Text style={[s.xpLabel, { color: colors.mutedText }]}>XP {profile.xp} / {profile.xpForNextLevel}</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={[s.divider, { backgroundColor: colors.divider }]} />
            <View style={s.profileActions}>
              <TouchableOpacity
                style={s.profileAction}
                onPress={() => router.push({ pathname: '/(tabs)/mypage/edit', params: { nickname: profile.nickname, avatarUrl: profile.avatarUrl ?? '', userId: profile.id } })}
              >
                <Text style={[s.profileActionText, { color: colors.bodyText }]}>프로필 편집</Text>
                <Feather name="chevron-right" size={16} color={colors.mutedText} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 레벨 가이드 */}
        <View style={s.card}>
          <TouchableOpacity
            style={s.settingRowCompact}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
              setXpGuideOpen(prev => !prev)
            }}
            activeOpacity={0.7}
          >
            <Text style={[s.settingLabel, { color: colors.title }]}>경험치 획득 방법</Text>
            <Feather name={xpGuideOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.mutedText} />
          </TouchableOpacity>
          {xpGuideOpen && (
            <View style={{ gap: 6, marginTop: 12 }}>
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
          )}
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
              style={[s.themeToggleTrack, { backgroundColor: isDark ? '#457ae5' : '#d5dbe3' }]}
            >
              <Animated.View
                style={[s.themeToggleThumb, { transform: [{ translateX: themeToggleTranslateX }] }]}
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
    </SafeAreaView>
  )
}

const styles = (c: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.pageBg },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 12, gap: 12 },
    sectionHeader: { minHeight: 32, justifyContent: 'center' },
    pageTitle: { fontSize: 18, fontWeight: '700', color: c.title, letterSpacing: -0.4 },
    card: {
      backgroundColor: c.cardBg,
      borderRadius: 16,
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    avatarWrap: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    nickname: { fontSize: 17, fontWeight: '600', letterSpacing: -0.3 },
    email: { fontSize: 12, fontWeight: '500' },
    xpBar: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 6 },
    xpLabel: { fontSize: 11, fontWeight: '500', marginTop: 4 },
    divider: { height: 1, marginVertical: 12 },
    profileActions: { gap: 4 },
    profileAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
    profileActionText: { fontSize: 14, fontWeight: '500' },
    loginStatusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    connectedBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    connectedBadgeText: { fontSize: 12, fontWeight: '600' },
    loginDesc: { fontSize: 13, lineHeight: 20, fontWeight: '400' },
    googleBtn: {
      marginTop: 12,
      height: 46,
      borderRadius: 999,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    googleBtnInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    googleBtnIconWrap: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
    },
    googleBtnText: { fontSize: 14, fontWeight: '600' },
    sectionTitle: { fontSize: 14, fontWeight: '600' },
    guideItem: { fontSize: 13, lineHeight: 20, fontWeight: '400' },
    settingRowCompact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 28 },
    settingTitleRowCompact: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    settingLabel: { fontSize: 14, fontWeight: '500' },
    settingValue: { fontSize: 14, fontWeight: '500' },
    darkModeStatus: { fontSize: 14, fontWeight: '600' },
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
    termsText: { fontSize: 14, lineHeight: 22, fontWeight: '400' },
    licenseTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
    licenseDesc: { fontSize: 13, fontWeight: '400' },
  })
