import { Stack } from 'expo-router'
import { useTheme } from '@/hooks/useTheme'

export default function Layout() {
  const { colors } = useTheme()
  return <Stack screenOptions={{ headerShown: false, animation: 'simple_push', animationDuration: 150, detachPreviousScreen: false, contentStyle: { backgroundColor: colors.pageBg } }} />
}
