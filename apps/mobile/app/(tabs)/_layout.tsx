import { Tabs } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { HomeIcon, PlayerIcon, AnalysisIcon, CommunityIcon, MypageIcon } from '@/components/icons/NavIcons'
import { getAppFontFamily } from '@/constants/fonts'
import { useTheme } from '@/hooks/useTheme'

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
        },
        tabBarItemStyle: {
          paddingTop: 10,
          paddingBottom: tabBarBottomPadding + 2,
        },
        tabBarIconStyle: {
          marginBottom: 4,
        },
        tabBarLabelStyle: {
          fontFamily: getAppFontFamily('600'),
          fontSize: 11,
          lineHeight: 14,
          marginTop: 2,
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
        options={{
          title: '커뮤니티',
          unmountOnBlur: true,
          tabBarIcon: ({ focused }) => <CommunityIcon size={22} color={focused ? c.navActive : c.navIcon} />,
        }}
      />
      <Tabs.Screen
        name="mypage"
        options={{
          title: '마이',
          unmountOnBlur: true,
          tabBarIcon: ({ focused }) => <MypageIcon size={22} color={focused ? c.navActive : c.navIcon} />,
        }}
      />
    </Tabs>
  )
}
