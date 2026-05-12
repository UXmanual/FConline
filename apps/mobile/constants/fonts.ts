import { Platform, StyleSheet, type StyleProp, type TextStyle } from 'react-native'

export const APP_FONT_STACK = 'Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

export const APP_FONT_FAMILIES = {
  100: Platform.select({ web: `'Pretendard-100', ${APP_FONT_STACK}`, default: 'Pretendard-100' }),
  200: Platform.select({ web: `'Pretendard-200', ${APP_FONT_STACK}`, default: 'Pretendard-200' }),
  300: Platform.select({ web: `'Pretendard-300', ${APP_FONT_STACK}`, default: 'Pretendard-300' }),
  400: Platform.select({ web: `'Pretendard-400', ${APP_FONT_STACK}`, default: 'Pretendard-400' }),
  500: Platform.select({ web: `'Pretendard-500', ${APP_FONT_STACK}`, default: 'Pretendard-500' }),
  600: Platform.select({ web: `'Pretendard-600', ${APP_FONT_STACK}`, default: 'Pretendard-600' }),
  700: Platform.select({ web: `'Pretendard-700', ${APP_FONT_STACK}`, default: 'Pretendard-700' }),
  800: Platform.select({ web: `'Pretendard-800', ${APP_FONT_STACK}`, default: 'Pretendard-800' }),
  900: Platform.select({ web: `'Pretendard-900', ${APP_FONT_STACK}`, default: 'Pretendard-900' }),
} as const

type AppFontWeight = keyof typeof APP_FONT_FAMILIES

function normalizeFontWeight(fontWeight: TextStyle['fontWeight']): AppFontWeight {
  const value = typeof fontWeight === 'number' ? String(fontWeight) : fontWeight

  switch (value) {
    case '100':
    case 'thin':
      return 100
    case '200':
    case 'ultralight':
      return 200
    case '300':
    case 'light':
      return 300
    case '400':
    case 'normal':
    case undefined:
      return 400
    case '500':
    case 'medium':
      return 500
    case '600':
    case 'semibold':
      return 600
    case '700':
    case 'bold':
      return 700
    case '800':
    case 'extrabold':
      return 800
    case '900':
    case 'black':
      return 900
    default:
      return 400
  }
}

export function getAppFontFamily(fontWeight?: TextStyle['fontWeight']) {
  return APP_FONT_FAMILIES[normalizeFontWeight(fontWeight)]
}

export function getAppTextStyle(style?: StyleProp<TextStyle>) {
  const flattened = StyleSheet.flatten(style) ?? {}
  return {
    fontFamily: getAppFontFamily(flattened.fontWeight),
    fontWeight: undefined,
  }
}
