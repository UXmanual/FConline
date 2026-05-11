import { useEffect, useRef } from 'react'
import { View, Animated, Easing, StyleSheet } from 'react-native'
import Svg, { Path, Polygon, Circle } from 'react-native-svg'
import { PlayerIcon, AnalysisIcon } from './NavIcons'

export function PlayerActionIcon({ isDark }: { isDark: boolean }) {
  const rotate = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(1)).current
  const glowOpacity = useRef(new Animated.Value(0.2)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.06, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.4, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 0.94, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      ])
    ).start()
  }, [])

  const iconColor = isDark ? '#ffd24f' : '#F3B400'
  const circleBg = isDark ? '#4f4318' : '#fff9d9'
  const glowColor = isDark ? 'rgba(255,210,79,0.3)' : 'rgba(255,202,40,0.5)'

  return (
    <View style={s.wrap}>
      <Animated.View style={[s.glowRing, { backgroundColor: glowColor, opacity: glowOpacity }]} />
      <Animated.View style={[s.circle, { backgroundColor: circleBg, transform: [{ scale }] }]}>
        <PlayerIcon size={28} color={iconColor} />
      </Animated.View>
    </View>
  )
}

export function AnalysisActionIcon({ isDark }: { isDark: boolean }) {
  const scale = useRef(new Animated.Value(1)).current
  const glowOpacity = useRef(new Animated.Value(0.15)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.05, duration: 1900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.35, duration: 1900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 0.95, duration: 1900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.1, duration: 1900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      ])
    ).start()
  }, [])

  const iconColor = isDark ? '#67d58f' : '#3FA86A'
  const circleBg = isDark ? '#173725' : '#dffbe6'
  const glowColor = isDark ? 'rgba(103,213,143,0.25)' : 'rgba(73,179,111,0.3)'

  return (
    <View style={s.wrap}>
      <Animated.View style={[s.glowRing, { backgroundColor: glowColor, opacity: glowOpacity }]} />
      <Animated.View style={[s.circle, { backgroundColor: circleBg, transform: [{ scale }] }]}>
        <AnalysisIcon size={28} color={iconColor} />
      </Animated.View>
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  glowRing: { position: 'absolute', width: 52, height: 52, borderRadius: 26 },
  circle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
})
