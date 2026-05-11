import { forwardRef } from 'react'
import {
  Platform,
  Text as RNText,
  TextInput as RNTextInput,
  View,
  type TextInputProps,
  type TextProps,
} from 'react-native'

const FONT_FAMILY = Platform.select({
  web: 'Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  default: 'Pretendard',
})

export const Text = forwardRef<RNText, TextProps>(function Text(props, ref) {
  const { style, ...rest } = props
  return <RNText ref={ref} {...rest} style={[{ fontFamily: FONT_FAMILY }, style]} />
})

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput(props, ref) {
  const { style, ...rest } = props
  return <RNTextInput ref={ref} {...rest} style={[{ fontFamily: FONT_FAMILY }, style]} />
})

export { View }
