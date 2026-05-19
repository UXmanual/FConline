import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ code?: string }>()

  useEffect(() => {
    const handle = async () => {
      if (params.code) {
        await supabase.auth.exchangeCodeForSession(params.code).catch(() => null)
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
