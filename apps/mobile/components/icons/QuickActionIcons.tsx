import { useEffect, useMemo, useRef } from 'react'
import { View, Animated, Easing, StyleSheet } from 'react-native'
import Svg, { Polygon, Circle } from 'react-native-svg'
import { PlayerIcon, AnalysisIcon } from './NavIcons'

function createLoop(values: Animated.CompositeAnimation[]) {
  return Animated.loop(Animated.parallel(values))
}

export function PlayerActionIcon({ isDark }: { isDark: boolean }) {

  const baseOpacity = useRef(new Animated.Value(0.18)).current
  const baseScaleX = useRef(new Animated.Value(0.84)).current
  const bodyTranslateX = useRef(new Animated.Value(-1)).current
  const bodyTranslateY = useRef(new Animated.Value(0)).current
  const bodyRotate = useRef(new Animated.Value(0)).current
  const bodyScale = useRef(new Animated.Value(0.96)).current


  useEffect(() => {
    const slowLoop = createLoop([
      Animated.sequence([
        Animated.timing(baseOpacity, { toValue: 0.32, duration: 2400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(baseOpacity, { toValue: 0.18, duration: 2400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(baseScaleX, { toValue: 1.06, duration: 2400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(baseScaleX, { toValue: 0.84, duration: 2400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),

    ])

    const bodyLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(bodyTranslateX, { toValue: 2, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(bodyTranslateY, { toValue: -2, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(bodyRotate, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(bodyScale, { toValue: 1.06, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(bodyTranslateX, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(bodyTranslateY, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(bodyRotate, { toValue: 0.5, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(bodyScale, { toValue: 0.92, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(bodyTranslateX, { toValue: -2, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(bodyTranslateY, { toValue: 2, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(bodyRotate, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(bodyScale, { toValue: 1.02, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(bodyTranslateX, { toValue: -1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(bodyTranslateY, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(bodyRotate, { toValue: 0.35, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(bodyScale, { toValue: 0.96, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      ]),
    )

    slowLoop.start()
    bodyLoop.start()

    return () => {
      slowLoop.stop()
      bodyLoop.stop()
    }
  }, [baseOpacity, baseScaleX, bodyRotate, bodyScale, bodyTranslateX, bodyTranslateY, isDark])

  const iconColor = isDark ? '#ffd24f' : '#F3B400'
  const circleBg = isDark ? '#4f4318' : '#fff9d9'
  const glowBase = isDark ? 'rgba(255, 196, 64, 0.16)' : 'rgba(255, 196, 64, 0.24)'


  const rotateY = bodyRotate.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['18deg', '-16deg', '-34deg'],
  })

  return (
    <View style={s.wrap}>
      <Animated.View
        style={[
          s.baseGlow,
          {
            backgroundColor: glowBase,
            opacity: baseOpacity,
            transform: [{ scaleX: baseScaleX }],
          },
        ]}
      />


      <Animated.View
        style={[
          s.circle,
          {
            backgroundColor: circleBg,
            transform: [
              { translateX: bodyTranslateX },
              { translateY: bodyTranslateY },
              { rotateY },
              { scale: bodyScale },
            ],
          },
        ]}
      >
        <PlayerIcon size={28} color={iconColor} />
      </Animated.View>
    </View>
  )
}

export function AnalysisActionIcon({ isDark }: { isDark: boolean }) {
  const haloOpacity = useRef(new Animated.Value(0.18)).current
  const haloScale = useRef(new Animated.Value(0.94)).current
  const baseOpacity = useRef(new Animated.Value(0.14)).current
  const baseScaleX = useRef(new Animated.Value(0.86)).current
  const bodyScale = useRef(new Animated.Value(1.0)).current
  const graphProgress = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const glowLoop = createLoop([
      Animated.sequence([
        Animated.timing(baseOpacity, { toValue: 0.26, duration: 2300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(baseOpacity, { toValue: 0.14, duration: 2300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(baseScaleX, { toValue: 1.03, duration: 2300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(baseScaleX, { toValue: 0.86, duration: 2300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(haloOpacity, { toValue: 0.3, duration: 1900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(haloOpacity, { toValue: 0.18, duration: 1900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(haloScale, { toValue: 1.05, duration: 1900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(haloScale, { toValue: 0.94, duration: 1900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ])

    // bodyScale을 별도 루프로 분리: 1.0 → 1.05 → 1.0 → 0.95 → 1.0
    // 시작값과 끝값이 동일(1.0)하여 루프 경계에서 끊김 없이 이어짐
    const scaleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bodyScale, { toValue: 1.05, duration: 950, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(bodyScale, { toValue: 1.0, duration: 950, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(bodyScale, { toValue: 0.95, duration: 950, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(bodyScale, { toValue: 1.0, duration: 950, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    )

    const graphLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(graphProgress, {
          toValue: 1,
          duration: 6800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(graphProgress, { toValue: 0, duration: 0, useNativeDriver: false }),
      ]),
    )

    glowLoop.start()
    scaleLoop.start()
    graphLoop.start()

    return () => {
      glowLoop.stop()
      scaleLoop.stop()
      graphLoop.stop()
    }
  }, [baseOpacity, baseScaleX, bodyScale, graphProgress, haloOpacity, haloScale])

  const iconColor = isDark ? '#67d58f' : '#3FA86A'
  const circleBg = isDark ? '#173725' : '#dffbe6'
  const glowBase = isDark ? 'rgba(73, 179, 111, 0.12)' : 'rgba(73, 179, 111, 0.22)'
  const glowStrong = isDark ? '#173725' : '#dffbe6'

  const pointFrames = useMemo(
    () => [
      [15, 6.4, 22.9, 11.5, 21.8, 23.1, 8.4, 22.7, 6.8, 11.1],
      [16.1, 8.9, 21.6, 13.4, 17.9, 18.7, 12.5, 18.1, 9.8, 12.8],
      [14.1, 5.8, 20.8, 9.4, 22.8, 23.5, 7.6, 23.2, 8.9, 10.5],
      [15.9, 7.1, 23.6, 10.2, 20.1, 21.7, 10.2, 20.2, 6.5, 12.6],
      [13.8, 9.6, 19.7, 13.7, 17.1, 17.8, 12.9, 19.8, 10.7, 13.8],
      [15.5, 6.1, 22.1, 12.2, 20.9, 22.4, 9.4, 23.3, 7.4, 9.8],
      [14.6, 8.4, 20.9, 11.6, 18.4, 20.5, 11.3, 18.8, 8.7, 13],
      [15.7, 5.9, 23.3, 10.8, 22.2, 22.9, 7.9, 22.1, 6.9, 10.7],
      [15, 6.4, 22.9, 11.5, 21.8, 23.1, 8.4, 22.7, 6.8, 11.1],
    ],
    [],
  )

  const animatedPoints = graphProgress.interpolate({
    inputRange: pointFrames.map((_, index) => index / (pointFrames.length - 1)),
    outputRange: pointFrames.map((frame) => `${frame[0]},${frame[1]} ${frame[2]},${frame[3]} ${frame[4]},${frame[5]} ${frame[6]},${frame[7]} ${frame[8]},${frame[9]}`),
  })

  const animatedTopX = graphProgress.interpolate({
    inputRange: pointFrames.map((_, index) => index / (pointFrames.length - 1)),
    outputRange: pointFrames.map((frame) => frame[0]),
  })
  const animatedTopY = graphProgress.interpolate({
    inputRange: pointFrames.map((_, index) => index / (pointFrames.length - 1)),
    outputRange: pointFrames.map((frame) => frame[1]),
  })

  return (
    <View style={s.wrap}>
      <Animated.View
        style={[
          s.baseGlow,
          {
            backgroundColor: glowBase,
            opacity: baseOpacity,
            transform: [{ scaleX: baseScaleX }],
          },
        ]}
      />
      <Animated.View
        style={[
          s.halo,
          {
            backgroundColor: glowStrong,
            opacity: haloOpacity,
            transform: [{ scale: haloScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          s.circle,
          {
            backgroundColor: circleBg,
            transform: [{ scale: bodyScale }],
          },
        ]}
      >
        <AnalysisIcon size={40} color={iconColor} />
        <Svg viewBox="0 0 30 30" style={s.graphOverlay}>
          <Polygon
            points="15,7.2 22.3,11.3 19.8,21.8 10.2,21.8 7.7,11.3"
            fill="none"
            stroke="rgba(255,255,255,0.34)"
            strokeWidth="0.7"
          />
          <AnimatedPolygon
            points={animatedPoints}
            fill="rgba(255,255,255,0.18)"
            stroke="rgba(255,255,255,0.96)"
            strokeWidth={1.15}
          />
          <AnimatedCircle cx={animatedTopX} cy={animatedTopY} r={1.05} fill="#F5FFF7" />
        </Svg>
      </Animated.View>
    </View>
  )
}

const AnimatedPolygon = Animated.createAnimatedComponent(Polygon)
const AnimatedCircle = Animated.createAnimatedComponent(Circle)

const s = StyleSheet.create({
  wrap: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseGlow: {
    position: 'absolute',
    bottom: 3,
    width: 36,
    height: 14,
    borderRadius: 999,
  },
  halo: {
    position: 'absolute',
    inset: 4,
    borderRadius: 999,
  },
  sweep: {
    position: 'absolute',
    left: 0,
    width: 12,
    height: 40,
    borderRadius: 999,
  },
  circle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  graphOverlay: {
    position: 'absolute',
    inset: 0,
    width: 48,
    height: 48,
  },
})
