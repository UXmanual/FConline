import { GoogleSignin } from '@react-native-google-signin/google-signin'

let configured = false

function getGoogleWebClientId() {
  return (
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim()
    ?? process.env.EXPO_PUBLIC_GOOGLE_SERVER_CLIENT_ID?.trim()
    ?? ''
  )
}

function getMissingConfigMessage() {
  return [
    'Google 로그인 설정이 아직 완료되지 않았습니다.',
    '1. Google Cloud 또는 Firebase에서 Web OAuth Client ID를 만들고',
    '2. 앱 환경변수에 EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID로 추가해 주세요.',
    '3. Android OAuth 클라이언트와 SHA-1을 연결한 뒤 google-services.json도 다시 받아야 합니다.',
  ].join('\n')
}

export function configureGoogleSignIn() {
  if (configured) {
    return
  }

  const webClientId = getGoogleWebClientId()
  if (!webClientId) {
    throw new Error(getMissingConfigMessage())
  }

  GoogleSignin.configure({
    webClientId,
    offlineAccess: false,
  })

  configured = true
}

export async function signOutFromGoogle() {
  try {
    await GoogleSignin.revokeAccess()
  } catch {}

  try {
    await GoogleSignin.signOut()
  } catch {}
}
