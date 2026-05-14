import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from '@/lib/supabase'

// Android에서 openAuthSessionAsync가 정상 종료되도록 세션 완료 신호 전달
WebBrowser.maybeCompleteAuthSession()

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ code?: string }>()

  useEffect(() => {
    const handle = async () => {
      const code = params.code
      if (code) {
        await supabase.auth.exchangeCodeForSession(code).catch(() => null)
      }
      router.replace('/(tabs)/mypage')
    }
    void handle()
  }, [params.code])

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  )
}
