import { useEffect, useRef } from 'react'
import { View, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { getSessionSafely, supabase } from '@/lib/supabase'

WebBrowser.maybeCompleteAuthSession()

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ code?: string; error?: string; error_description?: string }>()
  const handledRef = useRef(false)

  useEffect(() => {
    if (handledRef.current) {
      return
    }

    handledRef.current = true

    const handle = async () => {
      const maybeCloseBrowser = async () => {
        await WebBrowser.dismissBrowser().catch(() => undefined)
      }

      const oauthError = typeof params.error_description === 'string'
        ? params.error_description
        : typeof params.error === 'string'
          ? params.error
          : null

      if (oauthError) {
        await maybeCloseBrowser()
        Alert.alert('로그인 오류', oauthError)
        router.replace('/(tabs)/mypage')
        return
      }

      const { session } = await getSessionSafely()
      if (session?.user) {
        await maybeCloseBrowser()
        router.replace('/(tabs)/mypage')
        return
      }

      if (!params.code) {
        await maybeCloseBrowser()
        Alert.alert('로그인 오류', '로그인 승인 후 인증 코드를 받지 못했습니다.')
        router.replace('/(tabs)/mypage')
        return
      }

      const { error } = await supabase.auth.exchangeCodeForSession(params.code)
      await maybeCloseBrowser()
      if (error) {
        Alert.alert('로그인 오류', error.message)
      }

      router.replace('/(tabs)/mypage')
    }
    void handle()
  }, [params.code, params.error, params.error_description])

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  )
}
