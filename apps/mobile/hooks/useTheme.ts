import { useThemePreference } from '@/contexts/ThemePreferenceContext'

export function useTheme() {
  return useThemePreference()
}
