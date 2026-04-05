import pkg from '../../package.json'

export const APP_VERSION = pkg.version

export const RELEASE_NOTES_BY_VERSION: Record<string, string[]> = {
  '11.6': ['댓글 바텀시트 반응 속도 개선', '볼타 BEST/TOP 캐시 주기 5분으로 조정'],
  '11.5': ['다크모드 추가'],
  '11.4': ['분석 상세 사용 선수 카드 추가', '기타 버그 수정'],
}
