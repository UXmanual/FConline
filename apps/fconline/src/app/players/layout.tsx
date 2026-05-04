import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '선수 검색',
  description: 'FC온라인 선수를 검색하고 능력치, 시즌, 포지션, 선수 평가를 확인하세요. 피파온라인 선수 정보와 상세 분석을 제공합니다.',
  keywords: ['FC온라인 선수', '피파 선수정보', '피파선수정보', 'FC온라인 선수 검색', '피파온라인 선수', '선수 능력치', '선수 분석', 'FC온라인 선수 평가', '피파 선수 평가', '선수 시즌'],
}

export default function PlayersLayout({ children }: { children: React.ReactNode }) {
  return children
}
