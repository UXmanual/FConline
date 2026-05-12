import pkg from '../../package.json'

export const APP_VERSION = pkg.version

export const RELEASE_PUBLISHED_AT_BY_VERSION: Record<string, string> = {
  '0.1.4': '2026-05-12T14:20:00+09:00',
  '0.1.3': '2026-05-11T22:30:00+09:00',
  '0.1.1': '2026-05-11T00:00:00+09:00',
}

export const RELEASE_NOTES_BY_VERSION: Record<string, string[]> = {
  '0.1.4': [
    '모바일 홈의 컨트롤러 이용 비중이 운영 API에서 직접 데이터를 받을 수 있도록 전용 응답 경로를 추가했습니다.',
    '넥슨 데이터센터 파싱 결과를 재사용하는 /api/home/controller-usage 엔드포인트를 운영 서버 기준으로 제공하도록 정리했습니다.',
  ],
  '0.1.3': [
    'React Native + Expo 모바일 작업 기준으로 Pretendard 폰트 자산과 홈 화면 레이아웃을 정리했습니다.',
    '모바일 홈의 기본 카드 반경, 여백, 아이콘 크기, 헤더 구성을 현재 기준에 맞게 조정했습니다.',
    '운영 웹에 영향이 가지 않도록 이번 작업 중 추가했던 웹 홈 전용 API 변경은 제외했습니다.',
  ],
  '0.1.1': [
    'React Native + Expo 기반으로 화면 전환 작업을 시작했습니다.',
  ],
}
