import { Stack } from 'expo-router'

export default function MatchesLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'simple_push', animationDuration: 150 }} />
}
