import { useEffect } from 'react'
import { View, ViewStyle } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { useTheme } from '@/hooks/useTheme'

export function SkeletonBox({
  width,
  height,
  radius = 8,
  style,
}: {
  width?: number | `${number}%`
  height: number
  radius?: number
  style?: ViewStyle
}) {
  const { isDark } = useTheme()
  const opacity = useSharedValue(1)

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.38, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    )
  }, [opacity])

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))
  const bg = isDark ? '#2e3347' : '#e4e7ec'

  return (
    <Animated.View
      style={[
        { width: width ?? '100%', height, borderRadius: radius, backgroundColor: bg },
        animStyle,
        style,
      ]}
    />
  )
}

export function SkeletonPostCard({ colors, isDark }: { colors: { cardBg: string; cardBorder: string }; isDark: boolean }) {
  return (
    <View
      style={{
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
        borderWidth: 1,
        backgroundColor: colors.cardBg,
        borderColor: colors.cardBorder,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <SkeletonBox width={40} height={40} radius={999} />
        <View style={{ flex: 1, gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
            <SkeletonBox width={32} height={12} radius={4} />
            <SkeletonBox width={60} height={12} radius={4} />
            <SkeletonBox width={40} height={12} radius={4} />
          </View>
          <SkeletonBox width="85%" height={15} radius={5} />
          <SkeletonBox width="100%" height={13} radius={4} />
          <SkeletonBox width="65%" height={13} radius={4} />
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 2 }}>
            <SkeletonBox width={40} height={12} radius={4} />
            <SkeletonBox width={40} height={12} radius={4} />
          </View>
        </View>
      </View>
    </View>
  )
}

export function SkeletonRankRow({ colors, isDark }: { colors: { cardBg: string; cardBorder: string }; isDark: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 }}>
      <SkeletonBox width={44} height={44} radius={10} />
      <View style={{ flex: 1, gap: 7 }}>
        <SkeletonBox width="60%" height={13} radius={4} />
        <SkeletonBox width="40%" height={11} radius={4} />
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <SkeletonBox width={50} height={13} radius={4} />
        <SkeletonBox width={36} height={11} radius={4} />
      </View>
    </View>
  )
}
