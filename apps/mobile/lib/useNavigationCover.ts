import { useCallback } from 'react'
import { router } from 'expo-router'

export function useNavigationCover() {
  const navigate = useCallback((href: Parameters<typeof router.push>[0]) => {
    router.push(href)
  }, [])

  const reset = useCallback(() => {}, [])

  return { covering: false as const, navigate, reset }
}
