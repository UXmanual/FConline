import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Platform } from 'react-native'
import { Colors, type ThemeColors } from '@/constants/Colors'

type ThemeMode = 'light' | 'dark'

type ThemePreferenceContextValue = {
  colors: ThemeColors
  isDark: boolean
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => void
  toggleThemeMode: () => void
}

const STORAGE_KEY = 'fcoground-mobile-theme-mode'

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null)

function canUseWebStorage() {
  return Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>('light')

  useEffect(() => {
    if (!canUseWebStorage()) {
      return
    }

    const storedThemeMode = window.localStorage.getItem(STORAGE_KEY)

    if (storedThemeMode === 'light' || storedThemeMode === 'dark') {
      setThemeMode(storedThemeMode)
    }
  }, [])

  useEffect(() => {
    if (!canUseWebStorage()) {
      return
    }

    window.localStorage.setItem(STORAGE_KEY, themeMode)
  }, [themeMode])

  const value = useMemo<ThemePreferenceContextValue>(() => {
    const isDark = themeMode === 'dark'

    return {
      colors: isDark ? Colors.dark : Colors.light,
      isDark,
      themeMode,
      setThemeMode,
      toggleThemeMode: () => setThemeMode((current) => (current === 'dark' ? 'light' : 'dark')),
    }
  }, [themeMode])

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>
}

export function useThemePreference() {
  const context = useContext(ThemePreferenceContext)

  if (!context) {
    throw new Error('useThemePreference must be used within ThemePreferenceProvider')
  }

  return context
}
