import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { Colors, type ThemeColors } from '@/constants/Colors'

type ThemeMode = 'light' | 'dark'

type ThemePreferenceContextValue = {
  colors: ThemeColors
  isDark: boolean
  themeMode: ThemeMode
  themeLoaded: boolean
  setThemeMode: (mode: ThemeMode) => void
  toggleThemeMode: () => void
}

const STORAGE_KEY = 'fcoground-mobile-theme-mode'

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null)

function canUseWebStorage() {
  return Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

async function readStoredThemeMode(): Promise<ThemeMode> {
  try {
    if (canUseWebStorage()) {
      const val = window.localStorage.getItem(STORAGE_KEY)
      return val === 'dark' ? 'dark' : 'light'
    }
    const val = await SecureStore.getItemAsync(STORAGE_KEY)
    return val === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

async function writeStoredThemeMode(themeMode: ThemeMode) {
  try {
    if (canUseWebStorage()) {
      window.localStorage.setItem(STORAGE_KEY, themeMode)
      return
    }
    await SecureStore.setItemAsync(STORAGE_KEY, themeMode)
  } catch {}
}

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light')
  const [themeLoaded, setThemeLoaded] = useState(false)

  useEffect(() => {
    readStoredThemeMode().then((mode) => {
      setThemeModeState(mode)
      setThemeLoaded(true)
    })
  }, [])

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode)
    writeStoredThemeMode(mode)
  }

  const toggleThemeMode = () => {
    setThemeModeState((current) => {
      const next = current === 'dark' ? 'light' : 'dark'
      writeStoredThemeMode(next)
      return next
    })
  }

  const value = useMemo<ThemePreferenceContextValue>(() => {
    const isDark = themeMode === 'dark'
    return {
      colors: isDark ? Colors.dark : Colors.light,
      isDark,
      themeMode,
      themeLoaded,
      setThemeMode,
      toggleThemeMode,
    }
  }, [themeMode, themeLoaded])

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>
}

export function useThemePreference() {
  const context = useContext(ThemePreferenceContext)
  if (!context) throw new Error('useThemePreference must be used within ThemePreferenceProvider')
  return context
}
