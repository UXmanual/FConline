import { Tabs } from 'expo-router'
import { Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated'
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs'
import { getFocusedRouteNameFromRoute } from '@react-navigation/native'
import { HomeIcon, PlayerIcon, AnalysisIcon, CommunityIcon, MypageIcon } from '@/components/icons/NavIcons'
import { getAppFontFamily } from '@/constants/fonts'
import { useTheme } from '@/hooks/useTheme'

function AnimatedTabBarButton({ children, onPress, onLongPress, style, accessibilityState, accessibilityLabel, testID }: BottomTabBarButtonProps) {
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ scale: scale.value }],
  }))

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => {
        scale.value = withSpring(0.86, { stiffness: 340, damping: 17, mass: 0.82 })
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { stiffness: 340, damping: 17, mass: 0.82 })
      }}
      style={style}
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      <Animated.View style={animatedStyle}>
        {children}
      </Animated.View>
    </Pressable>
  )
}

export default function TabLayout() {
  const { colors: c } = useTheme()
  const insets = useSafeAreaInsets()
  const baseTabBarHeight = 70
  const tabBarBottomPadding = Math.max(insets.bottom, 8)

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelPosition: 'below-icon',
        tabBarActiveTintColor: c.navActive,
        tabBarInactiveTintColor: c.navLabel,
        tabBarButton: (props) => <AnimatedTabBarButton {...props} />,
        tabBarStyle: {
          backgroundColor: c.navBg,
          borderTopColor: c.navBorder,
          borderTopWidth: 1,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          height: baseTabBarHeight + tabBarBottomPadding,
          paddingTop: 0,
          paddingBottom: 0,
          paddingHorizontal: 20,
          position: 'absolute',
          elevation: 0,
        },
        tabBarItemStyle: {
          paddingTop: 10,
          paddingBottom: tabBarBottomPadding + 2,
          alignItems: 'center',
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
        tabBarLabelStyle: {
          fontFamily: getAppFontFamily('600'),
          fontSize: 11,
          lineHeight: 14,
          marginTop: 0,
          includeFontPadding: false,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: '홈',
          unmountOnBlur: true,
          tabBarIcon: ({ focused }) => <HomeIcon size={22} color={focused ? c.navActive : c.navIcon} />,
        }}
      />
      <Tabs.Screen
        name="players"
        options={{
          title: '선수',
          unmountOnBlur: true,
          tabBarIcon: ({ focused }) => <PlayerIcon size={22} color={focused ? c.navActive : c.navIcon} />,
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: '분석',
          unmountOnBlur: true,
          tabBarIcon: ({ focused }) => <AnalysisIcon size={22} color={focused ? c.navActive : c.navIcon} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={({ route }) => {
          const focused = getFocusedRouteNameFromRoute(route)
          const isDetail = focused !== undefined && focused !== 'index'
          return {
            title: '커뮤니티',
            unmountOnBlur: true,
            tabBarIcon: ({ focused: f }) => <CommunityIcon size={22} color={f ? c.navActive : c.navIcon} />,
            ...(isDetail ? { tabBarStyle: { display: 'none' } } : {}),
          }
        }}
      />
      <Tabs.Screen
        name="mypage"
        options={({ route }) => {
          const focused = getFocusedRouteNameFromRoute(route)
          const isNested = focused !== undefined && focused !== 'index'
          return {
            title: '마이',
            unmountOnBlur: true,
            tabBarIcon: ({ focused: f }) => <MypageIcon size={22} color={f ? c.navActive : c.navIcon} />,
            ...(isNested ? { tabBarStyle: { display: 'none' } } : {}),
          }
        }}
      />
    </Tabs>
  )
}
