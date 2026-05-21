import { Stack } from 'expo-router'
import { useTheme } from '@/hooks/useTheme'

export default function Layout() {
  const { colors } = useTheme()
  return <Stack detachPreviousScreen={false} screenOptions={{ headerShown: false, animation: 'slide_from_right', animationDuration: 200, contentStyle: { backgroundColor: colors.pageBg } }} />
}
