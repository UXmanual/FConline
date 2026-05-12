import { forwardRef } from 'react'
import { Text as RNText, TextInput as RNTextInput, View, type TextInputProps, type TextProps } from 'react-native'
import { getAppTextStyle } from '@/constants/fonts'

export const Text = forwardRef<RNText, TextProps>(function Text(props, ref) {
  const { style, ...rest } = props
  return <RNText ref={ref} {...rest} style={[getAppTextStyle(style), style]} />
})

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput(props, ref) {
  const { style, ...rest } = props
  return <RNTextInput ref={ref} {...rest} style={[getAppTextStyle(style), style]} />
})

export { View }
