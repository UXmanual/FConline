import { Tabs } from 'expo-router'
import { useColorScheme } from 'react-native'
import { Colors } from '@/constants/Colors'
import { HomeIcon, PlayerIcon, AnalysisIcon, CommunityIcon, MypageIcon } from '@/components/icons/NavIcons'

export default function TabLayout() {
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'
  const c = isDark ? Colors.dark : Colors.light

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.navActive,
        tabBarInactiveTintColor: c.navIcon,
        tabBarStyle: {
          backgroundColor: c.navBg,
          borderTopColor: c.navBorder,
          borderTopWidth: 1,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          height: 70,
          paddingTop: 0,
          paddingBottom: 0,
          position: 'absolute',
        },
        tabBarItemStyle: {
          paddingTop: 12,
          paddingBottom: 12,
        },
        tabBarIconStyle: {
          marginBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: '홈',
          tabBarIcon: ({ color }) => <HomeIcon size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="players"
        options={{
          title: '선수',
          tabBarIcon: ({ color }) => <PlayerIcon size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: '분석',
          tabBarIcon: ({ color }) => <AnalysisIcon size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: '커뮤니티',
          tabBarIcon: ({ color }) => <CommunityIcon size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="mypage"
        options={{
          title: '마이',
          tabBarIcon: ({ color }) => <MypageIcon size={22} color={color} />,
        }}
      />
    </Tabs>
  )
}
