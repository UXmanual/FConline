import { useState } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import * as ImagePicker from 'expo-image-picker'
import * as Linking from 'expo-linking'
import Svg, { Path } from 'react-native-svg'
import { useTheme } from '@/hooks/useTheme'
import { Text, TextInput } from '@/components/Themed'
import { apiFetch } from '@/lib/apiFetch'

function pickDefaultAvatar(id: string): string {
  const emojis = ['😀', '😊', '🦊', '🐼', '🦁', '🐯', '🐸', '🐧', '🦅', '🐬']
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return emojis[hash % emojis.length] ?? '😀'
}

export default function ProfileEditScreen() {
  const { colors, isDark } = useTheme()
  const params = useLocalSearchParams<{ nickname?: string; avatarUrl?: string; userId?: string }>()
  const [nickname, setNickname] = useState(params.nickname ?? '')
  const [avatarUri, setAvatarUri] = useState<string | null>(params.avatarUrl || null)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)

  const s = styles(colors, isDark)
  const canSubmit = nickname.trim().length > 0 && !submitting && !uploading

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert(
        '권한 필요',
        '사진 접근 권한이 필요해요.',
        [
          { text: '설정 열기', onPress: () => Linking.openSettings() },
          { text: '취소', style: 'cancel' },
        ],
      )
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    })

    if (result.canceled || !result.assets[0]) return

    setUploading(true)
    try {
      const asset = result.assets[0]
      const formData = new FormData()
      formData.append('avatar', {
        uri: asset.uri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      } as unknown as Blob)

      const res = await apiFetch('/api/mypage/avatar', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        setAvatarUri(data.avatarUrl)
      } else {
        const data = await res.json().catch(() => null)
        Alert.alert('오류', data?.message ?? '프로필 사진을 저장하지 못했어요.')
      }
    } catch {
      Alert.alert('오류', '프로필 사진을 저장하지 못했어요.')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteAvatar = async () => {
    setUploading(true)
    try {
      const res = await apiFetch('/api/mypage/avatar', { method: 'DELETE' })
      if (res.ok) {
        setAvatarUri(null)
      } else {
        Alert.alert('오류', '기본 이미지로 변경하지 못했어요.')
      }
    } catch {
      Alert.alert('오류', '기본 이미지로 변경하지 못했어요.')
    } finally {
      setUploading(false)
    }
  }

  const handleAvatarPress = () => {
    const buttons: Parameters<typeof Alert.alert>[2] = [
      { text: '앨범에서 선택', onPress: handlePickImage },
    ]
    if (avatarUri) {
      buttons.push({ text: '기본 이미지로 변경', style: 'destructive', onPress: handleDeleteAvatar })
    }
    buttons.push({ text: '취소', style: 'cancel' })
    Alert.alert('프로필 사진', '', buttons)
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const res = await apiFetch('/api/mypage/nickname', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim() }),
      })
      if (res.ok) {
        router.back()
      } else {
        const data = await res.json().catch(() => null)
        Alert.alert('오류', data?.message ?? '닉네임 변경에 실패했어요.')
      }
    } catch {
      Alert.alert('오류', '닉네임 변경에 실패했어요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      <View style={s.navHeader}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Feather name="chevron-left" size={24} color={colors.title} />
        </TouchableOpacity>
        <View style={s.headerTitleWrap} pointerEvents="none">
          <Text style={[s.headerTitle, { color: colors.title }]}>프로필 편집</Text>
        </View>
        <TouchableOpacity
          style={[s.submitBtn, !canSubmit && { opacity: 0.4 }]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#457ae5" />
          ) : (
            <Text style={s.submitBtnText}>저장</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 프로필 이미지 */}
          <View style={s.avatarSection}>
            <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.85} disabled={uploading}>
              <View style={[s.avatarWrap, { backgroundColor: isDark ? '#3a3f52' : colors.surfaceSoft }]}>
                {uploading ? (
                  <ActivityIndicator size="large" color={colors.accentBlue} />
                ) : avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={s.avatarImg} />
                ) : (
                  <Text style={s.avatarEmoji}>{params.userId ? pickDefaultAvatar(params.userId) : '😀'}</Text>
                )}
              </View>
              <View style={[s.avatarEditBtn, { backgroundColor: isDark ? '#6b7a99' : '#b0bac9' }]}>
                <Svg width={16} height={16} viewBox="0 0 256 256">
                  <Path d="M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM192,108.68,147.31,64l24-24L216,84.68Z" fill="white" />
                </Svg>
              </View>
            </TouchableOpacity>
          </View>

          {/* 닉네임 */}
          <View style={s.section}>
            <Text style={[s.label, { color: colors.title }]}>닉네임</Text>
            <TextInput
              style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.title }]}
              value={nickname}
              onChangeText={setNickname}
              placeholder="닉네임 입력"
              placeholderTextColor={colors.inputPlaceholder}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              keyboardAppearance={isDark ? 'dark' : 'light'}
              autoFocus
              maxLength={10}
            />
            <Text style={[s.guide, { color: colors.mutedText }]}>
              닉네임은 2~10자의 한글, 영문, 숫자와 특수기호(_),(-)만 사용 가능합니다
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = (c: ReturnType<typeof useTheme>['colors'], _isDark: boolean) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.cardBg },
    navHeader: {
      height: 44,
      paddingHorizontal: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
    headerTitleWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
    submitBtn: { paddingHorizontal: 12, height: 40, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
    submitBtnText: { fontSize: 15, fontWeight: '700', color: '#457ae5' },
    content: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 40, gap: 28 },
    avatarSection: { alignItems: 'center' },
    avatarWrap: {
      width: 90,
      height: 90,
      borderRadius: 45,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImg: { width: 90, height: 90 },
    avatarEmoji: { fontSize: 38, fontWeight: '400' },
    avatarEditBtn: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    section: { gap: 10 },
    label: { fontSize: 13, fontWeight: '600' },
    input: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, fontSize: 15, fontWeight: '400' },
    guide: { fontSize: 12, lineHeight: 18, fontWeight: '400' },
  })
