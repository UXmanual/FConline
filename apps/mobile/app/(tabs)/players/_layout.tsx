import { Stack } from 'expo-router'

export default function PlayersLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'simple_push', animationDuration: 150 }} />
}
