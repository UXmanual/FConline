import { Stack } from 'expo-router'
import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { View, Text } from '@/components/Themed'

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: '페이지 없음' }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>페이지를 찾을 수 없어요</Text>
        </View>
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f3f5' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 18, fontWeight: '600', color: '#1e2124' },
})
