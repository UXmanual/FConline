import { forwardRef } from 'react'
import { StyleSheet, Text as RNText, TextInput as RNTextInput, View, type TextInputProps, type TextProps } from 'react-native'
import { getAppFontFamily } from '@/constants/fonts'

export const Text = forwardRef<RNText, TextProps>(function Text(props, ref) {
  const { style, ...rest } = props
  const { fontWeight, ...flatStyle } = StyleSheet.flatten(style) ?? {}
  return <RNText ref={ref} {...rest} style={[{ fontFamily: getAppFontFamily(fontWeight) }, flatStyle]} />
})

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput(props, ref) {
  const { style, ...rest } = props
  const { fontWeight, ...flatStyle } = StyleSheet.flatten(style) ?? {}
  return <RNTextInput ref={ref} {...rest} style={[{ fontFamily: getAppFontFamily(fontWeight) }, flatStyle]} />
})

export { View }
