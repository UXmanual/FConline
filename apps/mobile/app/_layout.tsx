import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useFonts } from 'expo-font'
import { useEffect } from 'react'
import { Platform } from 'react-native'
import 'react-native-reanimated'
import { ThemePreferenceProvider } from '@/contexts/ThemePreferenceContext'
import { useTheme } from '@/hooks/useTheme'
import { APP_FONT_STACK } from '@/constants/fonts'

export default function RootLayout() {
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
    return null
  }

  return (
    <ThemePreferenceProvider>
      <RootLayoutContent />
    </ThemePreferenceProvider>
  )
}

function RootLayoutContent() {
  const { isDark } = useTheme()

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

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" options={{ headerShown: true }} />
      </Stack>
    </>
  )
}
