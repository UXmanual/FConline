import { enableScreens } from 'react-native-screens'
import { Stack } from 'expo-router'
import { ThemeProvider, DefaultTheme, DarkTheme } from '@react-navigation/native'
import { StatusBar } from 'expo-status-bar'
import { useFonts } from 'expo-font'
import { useEffect } from 'react'
import { Platform, PermissionsAndroid, View, useColorScheme } from 'react-native'
import * as SplashScreen from 'expo-splash-screen'
import * as ExpoNotifications from 'expo-notifications'
import 'react-native-reanimated'
import { ThemePreferenceProvider } from '@/contexts/ThemePreferenceContext'
import { useTheme } from '@/hooks/useTheme'
import { useThemePreference } from '@/contexts/ThemePreferenceContext'
import { APP_FONT_STACK } from '@/constants/fonts'
import { API_BASE } from '@/constants/api'
import { supabase } from '@/lib/supabase'

ExpoNotifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

enableScreens(Platform.OS !== 'web')
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const colorScheme = useColorScheme()
  const [fontsLoaded] = useFonts({
    'Pretendard-100': require('@/assets/fonts/Pretendard-Thin.ttf'),
    'Pretendard-200': require('@/assets/fonts/Pretendard-ExtraLight.ttf'),
    'Pretendard-300': require('@/assets/fonts/Pretendard-Light.ttf'),
    'Pretendard-400': require('@/assets/fonts/Pretendard-Regular.ttf'),
    'Pretendard-500': require('@/assets/fonts/Pretendard-Medium.ttf'),
    'Pretendard-600': require('@/assets/fonts/Pretendard-SemiBold.ttf'),
    'Pretendard-700': require('@/assets/fonts/Pretendard-Bold.ttf'),
    'Pretendard-800': require('@/assets/fonts/Pretendard-ExtraBold.ttf'),
    'Pretendard-900': require('@/assets/fonts/Pretendard-Black.ttf'),
  })

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colorScheme === 'dark' ? '#121318' : '#f0f3f5' }} />
    )
  }

  return (
    <ThemePreferenceProvider>
      <RootLayoutContent />
    </ThemePreferenceProvider>
  )
}

function RootLayoutContent() {
  const { isDark, colors } = useTheme()
  const { themeLoaded } = useThemePreference()

  useEffect(() => {
    if (themeLoaded) {
      requestAnimationFrame(() => {
        SplashScreen.hideAsync()
      })
    }
  }, [themeLoaded])

  useEffect(() => {
    if (Platform.OS !== 'android') return
    ;(async () => {
      try {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS ?? ('android.permission.POST_NOTIFICATIONS' as never),
        )
        if (!granted) return
        const { data: tokenData } = await ExpoNotifications.getExpoPushTokenAsync({
          projectId: 'fcbf4efe-5968-40ab-b8d9-af3518374baa',
        })
        if (!tokenData) return
        const { data: sessionData } = await supabase.auth.getSession()
        const userId = sessionData?.session?.user?.id ?? null
        await fetch(`${API_BASE}/api/push/expo-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: tokenData, userId }),
        })
      } catch {}
    })()
  }, [])

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return
    }

    document.documentElement.style.fontFamily = APP_FONT_STACK
    document.body.style.fontFamily = APP_FONT_STACK

    const styleId = 'fcoground-global-font'
    let styleElement = document.getElementById(styleId) as HTMLStyleElement | null

    if (!styleElement) {
      styleElement = document.createElement('style')
      styleElement.id = styleId
      styleElement.textContent = `
        html, body {
          font-family: ${APP_FONT_STACK};
        }
      `
      document.head.appendChild(styleElement)
    }
  }, [])

  const navTheme = isDark
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: colors.pageBg, card: colors.cardBg } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.pageBg, card: colors.cardBg } }

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.pageBg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" options={{ headerShown: true }} />
      </Stack>
    </ThemeProvider>
  )
}
