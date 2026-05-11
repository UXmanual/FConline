import pkg from '../../package.json'

export const APP_VERSION = pkg.version

export const RELEASE_PUBLISHED_AT_BY_VERSION: Record<string, string> = {
  '0.1.1': '2026-05-11T00:00:00+09:00',
}

export const RELEASE_NOTES_BY_VERSION: Record<string, string[]> = {
  '0.1.1': [
    'React Native + Expo 기반으로 전면 전환을 시작합니다.',
  ],
}
