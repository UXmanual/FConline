import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as Font from 'expo-font'
import { useEffect } from 'react'
import { Platform, useColorScheme } from 'react-native'
import 'react-native-reanimated'

const WEB_FONT_STACK = 'Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

export default function RootLayout() {
  const scheme = useColorScheme()

  useEffect(() => {
    Font.loadAsync({
      Pretendard: require('@/assets/fonts/PretendardVariable.ttf'),
    }).catch(() => {})

    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return
    }

    document.documentElement.style.fontFamily = WEB_FONT_STACK
    document.body.style.fontFamily = WEB_FONT_STACK

    const styleId = 'fcoground-global-font'
    let styleElement = document.getElementById(styleId) as HTMLStyleElement | null

    if (!styleElement) {
      styleElement = document.createElement('style')
      styleElement.id = styleId
      styleElement.textContent = `
        html, body {
          font-family: ${WEB_FONT_STACK};
        }
      `
      document.head.appendChild(styleElement)
    }
  }, [])

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" options={{ headerShown: true }} />
      </Stack>
    </>
  )
}
