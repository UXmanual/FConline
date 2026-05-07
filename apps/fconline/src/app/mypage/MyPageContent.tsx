'use client'

import Image from 'next/image'
import { startTransition, ChangeEvent, FormEvent, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { PencilSimple } from '@phosphor-icons/react/dist/ssr'
import UserLevelBadge from '@/components/user/UserLevelBadge'
import { Button } from '@/components/ui/button'
import LoadingDots from '@/components/ui/LoadingDots'
import SelectChevron from '@/components/ui/SelectChevron'
import { APP_VERSION } from '@/lib/appVersion'
import { deriveCommunityNickname, normalizeCommunityNickname, validateCommunityNickname } from '@/lib/community'
import {
  requestAppNotificationsPermission,
  resetAppNotificationsEnabled,
  unsubscribeFromPushNotifications,
  useAppNotificationsEnabled,
} from '@/lib/appNotifications'
import { setDarkModeEnabled, useDarkModeEnabled } from '@/lib/darkMode'
import { getSupabaseBrowserClient, getSupabaseUserSafely } from '@/lib/supabase/browser'
import type { UserLevelSnapshot } from '@/lib/userLevel'
import { pickDefaultAvatar } from '@/lib/avatar'

const APP_NOTIFICATION_BOTTOM_SHEET_KEY = 'app-notifications-bottom-sheet-seen-v3'
const LEGACY_APP_NOTIFICATION_BOTTOM_SHEET_KEYS = [
  'app-notifications-bottom-sheet-seen-v2',
]
const COMMUNITY_NICKNAME_CACHE_KEY_PREFIX = 'mypage-community-nickname'
const GAME_CLUB_NAME_CACHE_KEY_PREFIX = 'mypage-game-club-name'
const LEVEL_PROFILE_CACHE_KEY_PREFIX = 'mypage-level-profile'

type MyPageLevelProfile = UserLevelSnapshot & {
  lastLoginRewardDate?: string | null
  avatarUrl?: string | null
}

const levelGuideItems = [
  '- 하루 첫 로그인: +5 XP',
  '- 커뮤니티 글 작성: +12 XP',
  '- 선수평가 글 작성: +10 XP',
  '- 커뮤니티 댓글 작성: +4 XP',
  '- 선수평가 댓글 작성: +4 XP',
  '- 하루 첫 글 보너스: +5 XP',
  '- 하루 첫 댓글 보너스: +3 XP',
  '- 댓글 XP는 하루 최대 5회까지만 지급',
  '- 같은 글에 반복 댓글을 달면 XP가 지급되지 않을 수 있음',
]

function canShowAppNotificationPrompt() {
  if (typeof window === 'undefined') {
    return false
  }

  return (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}

const openSourceLicenses = [
  {
    name: '여기어때 잘난체',
    href: 'https://gccompany.co.kr/font',
  },
  {
    name: '넥슨 Open API',
    href: 'https://openapi.nexon.com/ko/',
  },
]

const termsContent = [
  '최종 업데이트: 2026.04.20',
  '본 약관은 FConline Ground(이하 "서비스")의 이용과 관련하여 서비스 운영자와 이용자 간의 권리, 의무 및 책임사항을 정하는 것을 목적으로 합니다.',
  '1. 서비스 소개',
  'FConline Ground는 FC Online 관련 정보 탐색을 지원하는 앱입니다.',
  '서비스는 경기 기록 조회, 선수 검색, 커뮤니티 이용, 설정 및 안내 정보 제공 기능 등을 포함할 수 있습니다.',
  '2. 약관 동의 및 적용',
  '이용자는 서비스 가입 또는 이용 시 본 약관에 동의한 것으로 봅니다.',
  '운영자는 관련 법령 및 서비스 운영 정책에 따라 약관 내용을 변경할 수 있으며, 중요한 변경이 있는 경우 앱 또는 관련 안내 페이지를 통해 공지합니다.',
  '3. 회원가입 및 계정 이용',
  '이 서비스는 회원가입 시 실제 이름, 생년월일, 휴대전화번호 등 실명 기반 개인정보 입력을 요구하지 않습니다.',
  '현재 서비스는 Google 로그인 기반 계정 연동 기능을 제공할 수 있으며, 이용자는 Google 계정을 통해 로그인하고 커뮤니티 및 선수 평가 기능을 이용할 수 있습니다.',
  '이용자는 다음 사항을 준수해야 합니다.',
  '- 타인을 사칭하거나 타인의 계정을 무단으로 사용해서는 안 됩니다.',
  '- 연동 계정 정보는 이용자 본인이 관리해야 하며, Google 계정 및 기기 보안 책임은 이용자에게 있습니다.',
  '- 서비스 운영을 방해하거나 비정상적인 접근을 시도해서는 안 됩니다.',
  '운영자는 아래와 같은 경우 계정 이용을 제한할 수 있습니다.',
  '- 약관 또는 운영 정책을 위반한 경우',
  '- 서비스 안정성 또는 다른 이용자의 권리를 침해한 경우',
  '- 자동화된 비정상 호출, 스팸성 활동, 악의적 게시 행위가 확인된 경우',
  '4. 제공 기능 및 변경',
  '운영자는 서비스의 전부 또는 일부 기능을 추가, 수정 또는 중단할 수 있습니다.',
  '서비스 개선, 점검, 장애 대응, 외부 API 정책 변경 등의 사유로 일부 기능 제공이 제한될 수 있습니다.',
  '5. 게시물 및 커뮤니티 이용',
  '이용자가 서비스 내에 작성한 게시물, 댓글 등 콘텐츠에 대한 책임은 작성한 이용자에게 있습니다.',
  '이용자는 다음과 같은 내용을 게시해서는 안 됩니다.',
  '- 타인의 권리를 침해하는 내용',
  '- 명예훼손, 혐오, 음란, 불법 정보',
  '- 광고, 도배, 스팸 또는 서비스 운영을 방해하는 내용',
  '운영자는 서비스 운영상 필요하거나 법령 위반 소지가 있는 경우 해당 콘텐츠를 사전 통지 없이 숨김, 삭제 또는 제한할 수 있습니다.',
  '6. 지식재산권',
  '서비스 자체에 대한 권리와 운영자가 작성한 콘텐츠에 대한 권리는 운영자 또는 정당한 권리자에게 있습니다.',
  '이용자가 작성한 게시물의 권리는 원칙적으로 해당 이용자에게 있습니다. 다만 서비스 운영, 표시, 백업, 개선, 분쟁 대응을 위해 필요한 범위에서는 서비스 내에서 이를 사용할 수 있습니다.',
  '7. 오픈소스 및 외부 서비스',
  '서비스는 오픈소스 소프트웨어, 외부 아이콘, 외부 API 또는 외부 플랫폼을 사용할 수 있습니다.',
  '앱 내 "오픈 라이선스 보기" 또는 별도 고지 페이지를 통해 관련 정보를 안내할 수 있습니다.',
  '8. 개인정보 보호',
  '개인정보의 수집 및 처리에 관한 자세한 내용은 별도의 "개인정보처리방침"에 따릅니다.',
  '9. 책임의 한계',
  '운영자는 천재지변, 시스템 장애, 외부 API 장애, 통신망 문제 등 불가항력적 사유로 인해 서비스를 제공할 수 없는 경우 책임을 지지 않습니다.',
  '운영자는 이용자의 귀책 사유로 발생한 손해에 대하여 책임을 지지 않습니다.',
  '10. 서비스 종료 및 탈퇴',
  '이용자는 언제든지 앱 내 계정 삭제 기능 또는 별도 안내된 경로를 통해 연동 계정 삭제를 요청할 수 있습니다.',
  '계정 삭제 후에도 기존에 작성한 게시글, 댓글, 선수 평가 등 일부 공개 콘텐츠는 서비스 운영, 분쟁 대응 또는 게시물 맥락 유지를 위해 남아 있을 수 있으며, 이 경우 계정과의 연결은 해제됩니다.',
  '운영자는 서비스 종료 또는 장기 중단이 필요한 경우 가능한 범위 내에서 사전에 안내합니다.',
  '11. 문의',
  '서비스 이용 중 문의가 필요한 경우 운영자가 별도로 안내하는 연락 수단을 통해 문의할 수 있습니다.',
]

export const privacyContent = [
  '최종 업데이트: 2026.05.07',
  'FConline Ground(이하 "서비스")는 이용자의 개인정보를 중요하게 생각하며, 관련 법령을 준수하기 위해 노력합니다.',
  '본 방침은 서비스가 어떤 정보를 수집하고, 왜 이용하며, 어떻게 보관 및 삭제하는지 설명합니다.',
  '1. 기본 원칙',
  '서비스는 회원가입 또는 서비스 이용 과정에서 꼭 필요한 최소한의 정보만 수집하는 것을 원칙으로 합니다.',
  '특히 이 서비스는 실제 이름, 생년월일, 휴대전화번호 등 실명 기반 개인정보를 회원가입 필수 정보로 요구하지 않는 방향으로 운영합니다.',
  '현재 서비스는 Google 로그인 기반 계정 연동을 제공할 수 있으며, Google 계정을 통해 로그인한 이용자에게 커뮤니티 및 선수 평가 작성 기능을 제공합니다.',
  '2. 수집하는 개인정보 항목',
  '서비스는 아래 정보를 수집하거나 처리할 수 있습니다.',
  '- 로그인 시: Google 계정 이메일 주소, 사용자 식별자(User ID), 프로필 이름 또는 닉네임 정보',
  '- 커뮤니티 이용 시: 닉네임, 게시글, 댓글 등 이용자가 직접 입력한 정보',
  '- 서비스 이용 과정에서 자동 생성되는 정보: 접속 기록, IP 일부 정보, 기기/브라우저 정보, 오류 기록, 이용 로그',
  '- 알림 기능 이용 시: 푸시 알림 구독 정보 및 기기 식별 정보',
  '- 문의 또는 신고 접수 시: 이용자가 직접 제출한 정보',
  '서비스는 원칙적으로 주민등록번호, 실명, 생년월일, 휴대전화번호와 같은 민감하거나 불필요한 개인정보를 수집하지 않는 방향으로 운영합니다. 다만 추후 기능 변경으로 수집 항목이 달라질 경우, 앱 또는 관련 문서를 통해 고지합니다.',
  '3. 개인정보의 처리 목적',
  '수집한 정보는 다음 목적 범위에서만 이용합니다.',
  '- 회원 식별 및 로그인 처리',
  '- 커뮤니티 운영 및 게시글/댓글 표시',
  '- 부정 이용 방지 및 보안 대응',
  '- 서비스 품질 개선, 오류 분석, 장애 대응',
  '- 이용자 문의 처리 및 분쟁 대응',
  '4. 개인정보의 처리 및 보유 기간',
  '서비스는 개인정보 수집 및 이용 목적이 달성되면 지체 없이 삭제하는 것을 원칙으로 합니다.',
  '다만 아래와 같은 경우에는 필요한 기간 동안 보관할 수 있습니다.',
  '- 회원 정보: 연동 계정 삭제 전까지',
  '- 게시글/댓글 관련 기록: 분쟁 방지 또는 운영 기록 확인이 필요한 기간 동안',
  '- 접속 로그 및 보안 기록: 보안 대응 및 비정상 이용 방지에 필요한 기간 동안',
  '- 법령상 보관 의무가 있는 정보: 해당 법령이 정한 기간 동안',
  '연동 계정이 삭제되더라도 기존에 작성한 공개 게시글, 댓글, 선수 평가 등은 서비스 운영, 분쟁 대응 또는 게시물 맥락 유지를 위해 남아 있을 수 있으며, 이 경우 계정과의 연결은 해제됩니다.',
  '구체적인 보관 기간은 실제 서비스 운영 환경과 저장 구조에 맞춰 추후 세부화할 수 있습니다.',
  '5. 개인정보의 파기절차 및 파기방법',
  '이용자는 탈퇴 또는 삭제를 요청할 수 있으며, 서비스는 관련 법령 또는 정당한 보관 사유가 없는 한 지체 없이 개인정보를 삭제하거나 더 이상 개인을 식별할 수 없는 형태로 처리합니다.',
  '전자적 파일은 복구가 어렵도록 안전한 방식으로 삭제하며, 출력물은 분쇄 또는 이에 준하는 방법으로 폐기합니다.',
  '법령에 따라 개인정보를 보존해야 하는 경우에는 해당 기간이 종료된 후 지체 없이 파기합니다.',
  '6. 개인정보의 제3자 제공',
  '서비스는 원칙적으로 이용자의 개인정보를 외부에 판매하거나 무단 제공하지 않습니다.',
  '다만 법령에 근거가 있거나 이용자의 별도 동의가 있는 경우에 한하여 개인정보를 제3자에게 제공할 수 있습니다.',
  '현재 서비스는 일반적인 서비스 운영 과정에서 이용자의 개인정보를 제3자에게 판매하거나 임의 제공하는 것을 전제로 하지 않습니다.',
  '7. 개인정보 처리위탁',
  '서비스 운영을 위해 아래와 같은 외부 서비스 또는 인프라를 사용할 수 있습니다.',
  '- [Supabase](https://supabase.com): 데이터 저장 및 인증 서비스',
  '- [Vercel](https://vercel.com): 배포 및 호스팅 서비스',
  '- [Nexon Open API](https://openapi.nexon.com/ko/): 게임 데이터 조회를 위한 외부 API',
  '- [Telegram](https://telegram.org): 문의 접수 운영자 알림',
  '- Upstash (Redis): API 요청 빈도 제한(레이트리밋) 처리를 위한 임시 IP 기록',
  '- 기타 서비스 운영에 필요한 클라우드 또는 인프라 서비스',
  '이 과정에서 서비스 운영에 필요한 최소 범위의 정보가 관련 인프라를 통해 처리될 수 있습니다.',
  '실제 위탁 대상, 위탁 업무 내용, 보유 환경 등이 확정 또는 변경될 경우 앱 내 정책 또는 별도 문서를 통해 고지합니다.',
  '8. 정보주체의 권리와 행사 방법',
  '이용자는 자신의 계정정보, 게시글, 댓글 등 서비스 내에서 생성하거나 제공한 정보에 대해 조회, 수정, 삭제, 처리 정지 또는 회원 탈퇴를 요청할 수 있습니다.',
  '운영자는 관련 법령상 제한이 없는 범위에서 이러한 요청을 검토하고 처리합니다.',
  '이용자는 앱 내 마이페이지의 계정 삭제 기능 또는 별도 안내된 데이터 삭제 요청 경로를 통해 연동 계정 삭제를 요청할 수 있습니다.',
  '9. 개인정보의 안전성 확보 조치',
  '서비스는 개인정보 보호를 위해 합리적인 수준의 보호 조치를 적용하도록 노력합니다.',
  '예를 들어 접근 제한, 인증 정보 보호, 관리 범위 최소화, 로그 확인 등의 방법을 사용할 수 있습니다.',
  '10. 개인정보 보호책임자 및 문의처',
  '개인정보 보호 관련 문의, 열람 요청, 정정 요청, 삭제 요청, 처리 정지 요청, 탈퇴 요청은 아래 연락처로 접수할 수 있습니다.',
  '- 이메일: uxdmanual@gmail.com',
  '- 데이터 삭제 요청 안내: https://fconlineground.com/data-deletion',
  '11. 자동 수집 장치의 설치, 운영 및 거부',
  '서비스는 로그인 유지, 보안 처리, 접속 상태 관리, 서비스 품질 개선을 위해 쿠키 또는 이와 유사한 기술을 사용할 수 있습니다.',
  '이용자는 브라우저 설정을 통해 쿠키 저장을 거부하거나 삭제할 수 있습니다. 다만 이 경우 로그인 유지 또는 일부 기능 이용이 제한될 수 있습니다.',
  '12. 아동의 개인정보',
  '서비스는 원칙적으로 실명 기반 회원가입을 요구하지 않으며, 별도의 연령 확인 기반 서비스를 전제로 하지 않습니다.',
  '향후 연령 제한 기능 또는 추가 인증 기능이 도입되는 경우 관련 정책을 별도로 보완할 수 있습니다.',
  '13. 정책 변경',
  '본 개인정보처리방침은 서비스 운영 방식, 기능 변경, 법령 개정 등에 따라 수정될 수 있습니다.',
  '중요한 변경이 있는 경우 앱 또는 관련 페이지를 통해 안내합니다.',
]

function GoogleBrandIcon() {
  return (
    <span
      aria-hidden="true"
      className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white"
    >
      <svg viewBox="0 0 18 18" className="size-[18px]" role="img" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.56 2.68-3.86 2.68-6.62Z"
        />
        <path
          fill="#34A853"
          d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
        />
        <path
          fill="#FBBC05"
          d="M3.97 10.71A5.41 5.41 0 0 1 3.69 9c0-.59.1-1.16.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3.01-2.33Z"
        />
        <path
          fill="#EA4335"
          d="M9 3.58c1.32 0 2.5.46 3.44 1.36l2.58-2.58C13.46.9 11.42 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
        />
      </svg>
    </span>
  )
}

function MyPageAuthSkeleton() {
  return (
    <>
      <section className="rounded-lg px-5 py-3" style={{ minHeight: '62px', backgroundColor: 'var(--app-card-bg)', border: '1px solid var(--app-card-border)' }}>
        <div className="flex min-h-[36px] items-center justify-between gap-3">
          <div className="home-image-shimmer h-4 w-28 rounded-full" />
          <div className="flex items-center gap-1.5">
            <div className="home-image-shimmer h-3.5 w-28 rounded-full" />
            <div className="home-image-shimmer h-3.5 w-10 rounded-full" />
          </div>
        </div>
      </section>

      <section className="rounded-lg px-5 py-4" style={{ backgroundColor: 'var(--app-card-bg)', border: '1px solid var(--app-card-border)' }}>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="home-image-shimmer h-[60px] w-[60px] shrink-0 rounded-full" />
              <div className="flex min-w-0 flex-col gap-2">
                <div className="home-image-shimmer h-3.5 w-28 rounded-full" />
                <div className="flex items-center gap-2">
                  <div className="home-image-shimmer h-5 w-12 rounded-[8px]" />
                  <div className="home-image-shimmer h-4 w-24 rounded-full" />
                </div>
              </div>
            </div>
            <div className="home-image-shimmer h-6 w-12 rounded-[8px]" />
          </div>

          <div className="home-image-shimmer h-4 w-36 rounded-full" />
          <div className="home-image-shimmer h-2 w-full rounded-full" />
          <div className="flex items-center justify-between gap-3">
            <div className="home-image-shimmer h-3.5 w-14 rounded-full" />
            <div className="home-image-shimmer h-3.5 w-14 rounded-full" />
          </div>
          <div className="home-image-shimmer h-4 w-18 rounded-full" />
        </div>
      </section>
    </>
  )
}

function getCommunityNicknameCacheKey(userId: string) {
  return `${COMMUNITY_NICKNAME_CACHE_KEY_PREFIX}:${userId}`
}

function getGameClubNameCacheKey(userId: string) {
  return `${GAME_CLUB_NAME_CACHE_KEY_PREFIX}:${userId}`
}

function readCachedCommunityNickname(userId: string) {
  if (typeof window === 'undefined' || !userId) {
    return ''
  }

  return window.localStorage.getItem(getCommunityNicknameCacheKey(userId)) ?? ''
}

function writeCachedCommunityNickname(userId: string, nickname: string) {
  if (typeof window === 'undefined' || !userId) {
    return
  }

  const normalized = normalizeCommunityNickname(nickname)

  if (!normalized) {
    window.localStorage.removeItem(getCommunityNicknameCacheKey(userId))
    return
  }

  window.localStorage.setItem(getCommunityNicknameCacheKey(userId), normalized)
}

function readCachedGameClubName(userId: string) {
  if (typeof window === 'undefined') {
    return ''
  }

  return window.localStorage.getItem(getGameClubNameCacheKey(userId)) ?? ''
}

function writeCachedGameClubName(userId: string, clubName: string) {
  if (typeof window === 'undefined') {
    return
  }

  const normalized = clubName.trim()

  if (!normalized) {
    window.localStorage.removeItem(getGameClubNameCacheKey(userId))
    return
  }

  window.localStorage.setItem(getGameClubNameCacheKey(userId), normalized)
}

function getLevelProfileCacheKey(userId: string) {
  return `${LEVEL_PROFILE_CACHE_KEY_PREFIX}:${userId}`
}

function readCachedLevelProfile(userId: string): MyPageLevelProfile | null {
  if (typeof window === 'undefined' || !userId) return null
  try {
    const raw = window.localStorage.getItem(getLevelProfileCacheKey(userId))
    return raw ? (JSON.parse(raw) as MyPageLevelProfile) : null
  } catch {
    return null
  }
}

function writeCachedLevelProfile(userId: string, profile: MyPageLevelProfile) {
  if (typeof window === 'undefined' || !userId) return
  try {
    window.localStorage.setItem(getLevelProfileCacheKey(userId), JSON.stringify(profile))
  } catch {
    // storage quota exceeded — ignore
  }
}

export function MyPageContent({ initialPrivacyOpen = false }: { initialPrivacyOpen?: boolean }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isDarkModeEnabled = useDarkModeEnabled()
  const isAppNotificationsEnabled = useAppNotificationsEnabled()
  const prevAppNotificationsEnabledRef = useRef<boolean | null>(null)
  const privacySectionRef = useRef<HTMLElement | null>(null)
  const checkPopupRef = useRef<() => void>(() => {})
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [isAuthPending, setIsAuthPending] = useState(false)
  const [communityNickname, setCommunityNickname] = useState('')
  const [gameClubName, setGameClubName] = useState('')
  const [userLevelProfile, setUserLevelProfile] = useState<MyPageLevelProfile | null>(null)
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [isAvatarResolved, setIsAvatarResolved] = useState(false)
  const [isEditingNickname, setIsEditingNickname] = useState(false)
  const [isEditingGameClubName, setIsEditingGameClubName] = useState(false)
  const [isSavingNickname, setIsSavingNickname] = useState(false)
  const [isSavingGameClubName, setIsSavingGameClubName] = useState(false)
  const [nicknameError, setNicknameError] = useState<string | null>(null)
  const [gameClubNameError, setGameClubNameError] = useState<string | null>(null)
  const [nicknameSheetKeyboardOffset, setNicknameSheetKeyboardOffset] = useState(0)
  const [isGameClubLoginRequiredOpen, setIsGameClubLoginRequiredOpen] = useState(false)
  const [isFavoritesLoginRequiredOpen, setIsFavoritesLoginRequiredOpen] = useState(false)
  const [isLicenseOpen, setIsLicenseOpen] = useState(false)
  const [isLevelGuideOpen, setIsLevelGuideOpen] = useState(false)
  const [isTermsOpen, setIsTermsOpen] = useState(false)
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(initialPrivacyOpen)
  const [isAccountDeleteOpen, setIsAccountDeleteOpen] = useState(false)
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [contactCategory, setContactCategory] = useState('앱 문의')
  const [contactTitle, setContactTitle] = useState('')
  const [contactContent, setContactContent] = useState('')
  const [contactValue, setContactValue] = useState('')
  const [isSendingContact, setIsSendingContact] = useState(false)
  const [isAppNotificationPending, setIsAppNotificationPending] = useState(false)
  const [isAppNotificationSheetOpen, setIsAppNotificationSheetOpen] = useState(false)
  const authStatus = searchParams.get('auth')
  const authMessage = authStatus === 'error' ? '로그인 처리 중 문제가 발생했습니다. 다시 시도해 주세요.' : null
  const nicknameSheetVisualBottomOffset = Math.max(0, nicknameSheetKeyboardOffset - 20)
  const nicknameSheetBottomOffset =
    nicknameSheetKeyboardOffset > 0
      ? `${nicknameSheetVisualBottomOffset}px`
      : 'calc(env(safe-area-inset-bottom) + 20px)'
  const isGameClubNameRegistered = gameClubName.trim().length > 0
  const googleLoginButtonStyle = isDarkModeEnabled
    ? {
        backgroundColor: '#131314',
        borderColor: '#8E918F',
        color: '#E3E3E3',
      }
    : {
        backgroundColor: '#FFFFFF',
        borderColor: '#747775',
        color: '#1F1F1F',
      }

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    let isMounted = true

    const syncUser = async () => {
      const { user } = await getSupabaseUserSafely(supabase)

      if (!isMounted) {
        return
      }

      setAuthUser(user)
      if (user) {
        const cachedProfile = readCachedLevelProfile(user.id)
        setAvatarUrl(cachedProfile?.avatarUrl ?? null)
        setUserLevelProfile(cachedProfile)
        if (!cachedProfile) setIsProfileLoading(true)
      } else {
        setAvatarUrl(null)
      }
      setCommunityNickname(user ? readCachedCommunityNickname(user.id) || deriveCommunityNickname(user) : '')
      setGameClubName(user ? readCachedGameClubName(user.id) : '')
      setIsEditingNickname(false)
      setIsEditingGameClubName(false)
      setIsAuthLoading(false)
    }

    void syncUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return
      }

      setAuthUser(session?.user ?? null)
      if (session?.user) {
        const cachedProfile = readCachedLevelProfile(session.user.id)
        setAvatarUrl(cachedProfile?.avatarUrl ?? null)
        setUserLevelProfile(cachedProfile)
        if (!cachedProfile) setIsProfileLoading(true)
      } else {
        setAvatarUrl(null)
      }
      setCommunityNickname(
        session?.user ? readCachedCommunityNickname(session.user.id) || deriveCommunityNickname(session.user) : '',
      )
      setGameClubName(session?.user ? readCachedGameClubName(session.user.id) : '')
      setIsEditingNickname(false)
      setIsEditingGameClubName(false)
      setIsAuthLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!authUser) {
      setUserLevelProfile(null)
      setIsProfileLoading(false)
      setIsAvatarResolved(false)
      return
    }

    let isCancelled = false
    const userId = authUser.id
    const fallbackNickname = deriveCommunityNickname(authUser)

    async function syncProfile() {
      try {
        const [nicknameRes, gameClubRes] = await Promise.all([
          fetch('/api/mypage/nickname', { cache: 'no-store' }),
          fetch('/api/mypage/game-club-name', { cache: 'no-store' }),
        ])
        const nicknameResult = await nicknameRes.json().catch(() => null)
        const gameClubResult = await gameClubRes.json().catch(() => null)

        if (isCancelled) return

        if (!nicknameRes.ok) {
          setCommunityNickname(fallbackNickname)
          writeCachedCommunityNickname(userId, fallbackNickname)
          setIsProfileLoading(false)
          setIsAvatarResolved(true)
          return
        }

        const resolvedNickname = String(nicknameResult?.nickname ?? fallbackNickname)
        setCommunityNickname(resolvedNickname)
        writeCachedCommunityNickname(userId, resolvedNickname)
        const freshProfile = (nicknameResult?.levelProfile as MyPageLevelProfile | undefined) ?? null
        setUserLevelProfile(freshProfile)
        if (freshProfile) writeCachedLevelProfile(userId, freshProfile)
        if (freshProfile?.avatarUrl) {
          setAvatarUrl(`${freshProfile.avatarUrl}?t=${Date.now()}`)
        } else {
          setAvatarUrl(null)
        }

        if (gameClubRes.ok && gameClubResult?.gameClubName) {
          const resolvedClubName = String(gameClubResult.gameClubName).trim()
          setGameClubName(resolvedClubName)
          writeCachedGameClubName(userId, resolvedClubName)
        }

        setIsProfileLoading(false)
        setIsAvatarResolved(true)
      } catch {
        if (!isCancelled) {
          setCommunityNickname(fallbackNickname)
          writeCachedCommunityNickname(userId, fallbackNickname)
          setUserLevelProfile(null)
          setIsProfileLoading(false)
          setIsAvatarResolved(true)
        }
      }
    }

    void syncProfile()

    return () => {
      isCancelled = true
    }
  }, [authUser])

  useLayoutEffect(() => {
    if (!initialPrivacyOpen || !privacySectionRef.current) {
      return
    }

    let frameId = 0
    let timeoutId = 0
    let attemptCount = 0

    const scrollToPrivacy = () => {
      const sectionTop = privacySectionRef.current?.getBoundingClientRect().top

      if (typeof sectionTop !== 'number') {
        return
      }

      const targetTop = Math.max(window.scrollY + sectionTop - 16, 0)
      window.scrollTo({ top: targetTop, behavior: 'auto' })
    }

    const syncScrollPosition = () => {
      scrollToPrivacy()
      attemptCount += 1

      if (attemptCount < 12) {
        frameId = window.requestAnimationFrame(syncScrollPosition)
        return
      }

      timeoutId = window.setTimeout(scrollToPrivacy, 180)
    }

    frameId = window.requestAnimationFrame(syncScrollPosition)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.clearTimeout(timeoutId)
    }
  }, [initialPrivacyOpen])

  useEffect(() => {
    checkPopupRef.current = () => {
      if (typeof window === 'undefined' || !canShowAppNotificationPrompt()) return
      if (isAppNotificationSheetOpen) return
      if (isAppNotificationsEnabled) return

      if (process.env.NODE_ENV !== 'production') {
        window.localStorage.removeItem(APP_NOTIFICATION_BOTTOM_SHEET_KEY)
      }

      const hasSeenPrompt = window.localStorage.getItem(APP_NOTIFICATION_BOTTOM_SHEET_KEY) === 'true'
      if (hasSeenPrompt) return

      resetAppNotificationsEnabled()
      setIsAppNotificationSheetOpen(true)
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    LEGACY_APP_NOTIFICATION_BOTTOM_SHEET_KEYS.forEach((key) => {
      window.localStorage.removeItem(key)
    })
  }, [])

  useEffect(() => {
    checkPopupRef.current()

    const handleMypageEnter = () => checkPopupRef.current()
    window.addEventListener('mypage-enter', handleMypageEnter)
    return () => window.removeEventListener('mypage-enter', handleMypageEnter)
  }, [])

  useEffect(() => {
    const prev = prevAppNotificationsEnabledRef.current
    prevAppNotificationsEnabledRef.current = isAppNotificationsEnabled

    if (prev === true && isAppNotificationsEnabled === false && canShowAppNotificationPrompt()) {
      setIsAppNotificationSheetOpen(true)
    }
  }, [isAppNotificationsEnabled])

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    const themeColorMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (!themeColorMeta) {
      return
    }

    const nextThemeColor = isAppNotificationSheetOpen
      ? getComputedStyle(document.documentElement).getPropertyValue('--app-modal-bg').trim() || (isDarkModeEnabled ? '#1a1b21' : '#ffffff')
      : isDarkModeEnabled
        ? '#121318'
        : '#f0f3f5'

    themeColorMeta.setAttribute('content', nextThemeColor)

    return () => {
      themeColorMeta.setAttribute('content', isDarkModeEnabled ? '#121318' : '#f0f3f5')
    }
  }, [isAppNotificationSheetOpen, isDarkModeEnabled])

  useEffect(() => {
    const isOverlayOpen =
      isAppNotificationSheetOpen ||
      isContactModalOpen ||
      isEditingNickname ||
      isEditingGameClubName ||
      isGameClubLoginRequiredOpen ||
      isFavoritesLoginRequiredOpen

    if (!isOverlayOpen) return

    const scrollY = window.scrollY
    const prevPosition = document.body.style.position
    const prevTop = document.body.style.top
    const prevWidth = document.body.style.width
    const prevBodyOverscroll = document.body.style.overscrollBehavior
    const prevHtmlOverscroll = document.documentElement.style.overscrollBehavior

    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
    document.body.style.overscrollBehavior = 'none'
    document.documentElement.style.overscrollBehavior = 'none'

    return () => {
      document.body.style.position = prevPosition
      document.body.style.top = prevTop
      document.body.style.width = prevWidth
      document.body.style.overscrollBehavior = prevBodyOverscroll
      document.documentElement.style.overscrollBehavior = prevHtmlOverscroll
      window.scrollTo(0, scrollY)
    }
  }, [isAppNotificationSheetOpen, isContactModalOpen, isEditingNickname, isEditingGameClubName, isGameClubLoginRequiredOpen, isFavoritesLoginRequiredOpen])

  useEffect(() => {
    if ((!isEditingNickname && !isEditingGameClubName) || typeof window === 'undefined') {
      setNicknameSheetKeyboardOffset(0)
      return
    }

    const prevent = (e: TouchEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      e.preventDefault()
    }
    document.addEventListener('touchmove', prevent, { passive: false })

    const viewport = window.visualViewport
    let resetTimer: ReturnType<typeof setTimeout> | null = null
    const update = () => {
      if (viewport) {
        const offset = Math.max(0, window.innerHeight - viewport.offsetTop - viewport.height)
        if (offset === 0) {
          if (resetTimer) clearTimeout(resetTimer)
          resetTimer = setTimeout(() => setNicknameSheetKeyboardOffset(0), 350)
        } else {
          if (resetTimer) { clearTimeout(resetTimer); resetTimer = null }
          setNicknameSheetKeyboardOffset(offset)
        }
      }
    }

    if (viewport) {
      viewport.addEventListener('resize', update)
      viewport.addEventListener('scroll', update)
      update()
    }
    window.addEventListener('resize', update)

    return () => {
      if (resetTimer) clearTimeout(resetTimer)
      document.removeEventListener('touchmove', prevent)
      if (viewport) {
        viewport.removeEventListener('resize', update)
        viewport.removeEventListener('scroll', update)
      }
      window.removeEventListener('resize', update)
      setNicknameSheetKeyboardOffset(0)
    }
  }, [isEditingNickname, isEditingGameClubName])

  const handleGoogleLogin = async () => {
    try {
      setIsAuthPending(true)

      const supabase = getSupabaseBrowserClient()
      const redirectTo = `${window.location.origin}/auth/callback?next=/mypage`
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      })

      if (error) {
        throw error
      }

      if (data.url) {
        window.location.assign(data.url)
        return
      }

      throw new Error('로그인 이동 URL을 만들지 못했습니다.')
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Google 로그인을 시작하지 못했습니다.')
      setIsAuthPending(false)
    }
  }

  const handleLogout = async () => {
    try {
      setIsAuthPending(true)

      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase.auth.signOut()

      if (error) {
        throw error
      }

      startTransition(() => {
        router.replace('/mypage')
        router.refresh()
      })
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '로그아웃하지 못했습니다.')
    } finally {
      setIsAuthPending(false)
    }
  }

  const handleSaveCommunityNickname = async () => {
    if (!authUser || isSavingNickname) {
      return
    }

    const trimmedNickname = normalizeCommunityNickname(communityNickname)
    const validationMessage = validateCommunityNickname(trimmedNickname, authUser.email)

    if (validationMessage) {
      setNicknameError(validationMessage)
      return
    }

    try {
      setIsSavingNickname(true)
      setNicknameError(null)

      const response = await fetch('/api/mypage/nickname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: trimmedNickname }),
      })
      const result = await response.json().catch(() => null)

      if (!response.ok) {
        setNicknameError(result?.message ?? '닉네임을 저장하지 못했습니다.')
        return
      }

      setAuthUser((current) => {
        if (!current) {
          return current
        }

        return {
          ...current,
          user_metadata: {
            ...current.user_metadata,
            community_nickname: result?.nickname ?? trimmedNickname,
          },
        } as User
      })
      const resolvedNickname = result?.nickname ?? trimmedNickname
      setCommunityNickname(resolvedNickname)
      writeCachedCommunityNickname(authUser.id, resolvedNickname)
      const updatedProfile = (result?.levelProfile as MyPageLevelProfile | undefined) ?? userLevelProfile
      setUserLevelProfile(updatedProfile)
      if (updatedProfile) writeCachedLevelProfile(authUser.id, updatedProfile)
      setNicknameError(null)
      setIsEditingNickname(false)
    } catch (error) {
      setNicknameError(error instanceof Error ? error.message : '닉네임을 저장하지 못했습니다.')
    } finally {
      setIsSavingNickname(false)
    }
  }

  const handleDeleteLinkedAccount = async () => {
    if (!authUser || isAuthPending) {
      return
    }

    const confirmed = window.confirm(
      '연동 계정을 삭제할까요?\n계정 정보는 삭제되지만 기존에 작성한 커뮤니티 글, 댓글, 선수 평가는 삭제되지 않고 남아 있을 수 있습니다.\n계정 삭제 후에는 기존 작성 글을 직접 삭제할 수 없습니다.',
    )

    if (!confirmed) {
      return
    }

    try {
      setIsAuthPending(true)

      const response = await fetch('/api/mypage/account', {
        method: 'DELETE',
      })
      const result = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(result?.message ?? '연동 계정을 삭제하지 못했습니다.')
      }

      const supabase = getSupabaseBrowserClient()
      await supabase.auth.signOut().catch(() => undefined)

      setAuthUser(null)
      setCommunityNickname('')
      setIsEditingNickname(false)
      window.alert('연동 계정이 삭제되었습니다.')

      startTransition(() => {
        router.replace('/mypage')
        router.refresh()
      })
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '연동 계정을 삭제하지 못했습니다.')
    } finally {
      setIsAuthPending(false)
    }
  }

  const resizeImageToJpeg = (file: File, targetSize = 200): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const img = new window.Image()
      const objectUrl = URL.createObjectURL(file)

      img.onload = () => {
        URL.revokeObjectURL(objectUrl)
        const canvas = document.createElement('canvas')
        canvas.width = targetSize
        canvas.height = targetSize
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          reject(new Error('Canvas를 사용할 수 없습니다.'))
          return
        }

        const size = Math.min(img.width, img.height)
        const offsetX = (img.width - size) / 2
        const offsetY = (img.height - size) / 2
        ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, targetSize, targetSize)

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob)
            else reject(new Error('이미지 변환에 실패했습니다.'))
          },
          'image/jpeg',
          0.85,
        )
      }

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        reject(new Error('이미지를 불러오지 못했습니다.'))
      }

      img.src = objectUrl
    })

  const handleAvatarFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file || !authUser) return

    try {
      setIsUploadingAvatar(true)

      const resized = await resizeImageToJpeg(file)
      const formData = new FormData()
      formData.append('avatar', new Blob([resized], { type: 'image/jpeg' }), 'avatar.jpg')

      const response = await fetch('/api/mypage/avatar', {
        method: 'POST',
        body: formData,
      })
      const result = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(result?.message ?? '프로필 사진을 저장하지 못했습니다.')
      }

      const supabase = getSupabaseBrowserClient()
      await supabase.auth.refreshSession()

      setAvatarUrl(`${result.avatarUrl}?t=${Date.now()}`)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '프로필 사진 업로드에 실패했습니다.')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleDarkModeToggle = () => {
    const nextValue = !isDarkModeEnabled
    setDarkModeEnabled(nextValue)
  }

  const handleEnableAppNotifications = async () => {
    const result = await requestAppNotificationsPermission()

    if (result.ok) {
      return
    }

    if (result.reason === 'unsupported') {
      window.alert('이 브라우저에서는 앱 알림을 지원하지 않습니다.')
      return
    }

    if (result.reason === 'subscription_failed') {
      window.alert('알림 권한은 허용되었지만 구독 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.')
      return
    }

    if (result.reason === 'denied') {
      window.alert('브라우저 알림 권한이 차단되어 있습니다. 브라우저 설정에서 알림을 허용한 뒤 다시 시도해 주세요.')
      return
    }

    window.alert('앱 알림 권한이 허용되지 않았습니다.')
  }

  const closeAppNotificationSheet = (persistSeen = true) => {
    if (persistSeen && typeof window !== 'undefined') {
      window.localStorage.setItem(APP_NOTIFICATION_BOTTOM_SHEET_KEY, 'true')
    }

    setIsAppNotificationSheetOpen(false)
  }

  const handleAcceptAppNotificationSheet = async () => {
    if (isAppNotificationPending) {
      return
    }

    closeAppNotificationSheet(false)

    try {
      setIsAppNotificationPending(true)
      await handleEnableAppNotifications()
    } finally {
      setIsAppNotificationPending(false)
    }
  }

  const handleDismissAppNotificationSheet = () => {
    closeAppNotificationSheet(false)
  }

  const handleDeferAppNotificationSheet = () => {
    closeAppNotificationSheet()
  }

  const handleAppNotificationToggle = async () => {
    if (isAppNotificationPending) {
      return
    }

    try {
      setIsAppNotificationPending(true)

      if (isAppNotificationsEnabled) {
        const unsubscribed = await unsubscribeFromPushNotifications()
        if (!unsubscribed) {
          window.alert('앱 알림 해제에 실패했습니다. 잠시 후 다시 시도해 주세요.')
          return
        }

        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(APP_NOTIFICATION_BOTTOM_SHEET_KEY)
        }

        return
      }

      await handleEnableAppNotifications()
      const result: {
        reason?: 'unsupported' | 'subscription_failed' | 'denied'
      } = {}
      return

      if (result.reason === 'unsupported') {
        window.alert('이 브라우저에서는 앱 알림을 지원하지 않습니다.')
        return
      }

      if (result.reason === 'subscription_failed') {
        window.alert('알림 권한은 허용되었지만 구독 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.')
        return
      }

      if (result.reason === 'denied') {
        window.alert('브라우저 알림 권한이 차단되어 있습니다. 브라우저 설정에서 알림을 허용한 뒤 다시 시도해 주세요.')
        return
      }

      window.alert('앱 알림 권한이 허용되지 않았습니다.')
    } finally {
      setIsAppNotificationPending(false)
    }
  }

  const resetContactForm = () => {
    setContactCategory('앱 문의')
    setContactTitle('')
    setContactContent('')
    setContactValue('')
  }

  const handleSubmitContact = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isSendingContact) {
      return
    }

    const trimmedTitle = contactTitle.trim()
    const trimmedContent = contactContent.trim()
    const trimmedContact = contactValue.trim()

    if (!trimmedTitle || !trimmedContent) {
      return
    }

    try {
      setIsSendingContact(true)
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: contactCategory,
          title: trimmedTitle,
          content: trimmedContent,
          contact: trimmedContact,
        }),
      })
      const result = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(result?.message ?? '문의 전송에 실패했습니다.')
      }

      resetContactForm()
      setIsContactModalOpen(false)
      window.alert('문의가 성공적으로 접수되었습니다.')
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '문의 전송에 실패했습니다.')
    } finally {
      setIsSendingContact(false)
    }
  }

  const cardStyle = {
    backgroundColor: 'var(--app-card-bg)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--app-card-border)',
  }
  const titleStyle = { color: 'var(--app-title)' }
  const bodyStyle = { color: 'var(--app-body-text)' }
  const mutedStyle = { color: 'var(--app-muted-text)' }
  const surfaceTransitionStyle = {
    transition: 'background-color 180ms ease, border-color 180ms ease, color 180ms ease',
  }

  const handleSaveGameClubName = async () => {
    if (!authUser || isSavingGameClubName) {
      return
    }

    const trimmedClubName = gameClubName.trim()

    if (!trimmedClubName) {
      setGameClubNameError('게임 구단주명을 입력해주세요.')
      return
    }

    try {
      setIsSavingGameClubName(true)
      setGameClubNameError(null)

      const response = await fetch('/api/mypage/game-club-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameClubName: trimmedClubName }),
      })
      const result = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(result?.message ?? '게임 구단주명을 저장하지 못했습니다.')
      }

      const saved = String(result?.gameClubName ?? trimmedClubName).trim()
      writeCachedGameClubName(authUser.id, saved)
      setGameClubName(saved)
      setIsEditingGameClubName(false)
    } catch (error) {
      setGameClubNameError(error instanceof Error ? error.message : '게임 구단주명을 저장하지 못했습니다.')
    } finally {
      setIsSavingGameClubName(false)
    }
  }

  const handleOpenGameClubAnalysis = (mode: 'official1on1' | 'voltaLive' | 'manager') => {
    const trimmedClubName = gameClubName.trim()

    if (!trimmedClubName) {
      return
    }

    router.push(`/matches?nickname=${encodeURIComponent(trimmedClubName)}&mode=${mode}`)
  }
  const darkModeLabelStyle = {
    color: isDarkModeEnabled ? '#457ae5' : 'var(--app-muted-text)',
    transition: 'color 180ms ease',
  }
  const appNotificationLabelStyle = {
    color: isAppNotificationPending
      ? '#457ae5'
      : isAppNotificationsEnabled
        ? '#457ae5'
        : 'var(--app-muted-text)',
    transition: 'color 180ms ease',
  }
  const appNotificationStatusLabel = isAppNotificationPending
    ? '처리중'
    : isAppNotificationsEnabled
      ? '허용중'
      : '미허용'

  const renderPolicyLine = (item: string) => {
    const linkedServices = [
      {
        label: '[Supabase](https://supabase.com)',
        href: 'https://supabase.com',
        text: 'Supabase',
      },
      {
        label: '[Vercel](https://vercel.com)',
        href: 'https://vercel.com',
        text: 'Vercel',
      },
      {
        label: '[Nexon Open API](https://openapi.nexon.com/ko/)',
        href: 'https://openapi.nexon.com/ko/',
        text: 'Nexon Open API',
      },
      {
        label: '[Telegram](https://telegram.org)',
        href: 'https://telegram.org',
        text: 'Telegram',
      },
    ]

    const matchedService = linkedServices.find((service) => item.includes(service.label))

    if (item.includes('uxdmanual@gmail.com')) {
      const [before, after] = item.split('uxdmanual@gmail.com')

      return (
        <>
          {before}
          <a href="mailto:uxdmanual@gmail.com" className="underline underline-offset-2">
            uxdmanual@gmail.com
          </a>
          {after}
        </>
      )
    }

    if (!matchedService) {
      if (item.includes('https://fconlineground.com/data-deletion')) {
        const [before, after] = item.split('https://fconlineground.com/data-deletion')

        return (
          <>
            {before}
            <a
              href="https://fconlineground.com/data-deletion"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              https://fconlineground.com/data-deletion
            </a>
            {after}
          </>
        )
      }

      return item
    }

    const [before, after] = item.split(matchedService.label)

    return (
      <>
        {before}
        <a href={matchedService.href} target="_blank" rel="noreferrer" className="underline underline-offset-2">
          {matchedService.text}
        </a>
        {after}
      </>
    )
  }

  return (
    <div
      className="-mx-5 px-5 pt-5"
      style={{
        backgroundColor: 'var(--app-page-bg)',
        transition: 'background-color 180ms ease',
      }}
    >
      <div className="space-y-3">
        <div className="flex h-6 items-center">
          <h1 className="text-[18px] font-bold tracking-[-0.02em]" style={titleStyle}>
            마이페이지
          </h1>
        </div>

        {isAuthLoading ? (
          <MyPageAuthSkeleton />
        ) : (
          <>
            <section
              className="rounded-lg px-5 py-3"
              style={{
                ...cardStyle,
                ...surfaceTransitionStyle,
                minHeight: authUser && !authMessage ? '62px' : undefined,
              }}
            >
              {authUser && !authMessage ? (
                <div className="flex min-h-[36px] items-center justify-between gap-3">
                  <p className="text-sm font-semibold" style={titleStyle}>
                    <span>구글 로그인</span>
                    <span style={{ color: '#457ae5' }}> 연결 중</span>
                  </p>

                  <div className="flex min-w-0 items-center justify-end gap-1.5 text-[12px] font-medium" style={mutedStyle}>
                    <p className="max-w-[180px] truncate" title={authUser.email ?? ''}>
                      {authUser.email}
                    </p>
                    <span aria-hidden="true" style={{ color: 'var(--app-muted-text)', opacity: 0.4 }}>
                      |
                    </span>
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={isAuthPending || isSavingNickname}
                      className="shrink-0 disabled:opacity-50"
                      style={mutedStyle}
                    >
                      {isAuthPending ? '로그아웃 중...' : '로그아웃'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 py-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold" style={titleStyle}>
                      <span>구글 로그인</span>
                      <span style={{ color: 'var(--app-muted-text)' }}>{authUser ? ' 연결 중' : ' 연결 전'}</span>
                    </p>
                  </div>

                  {authMessage ? (
                    <p className="text-[12px] font-semibold leading-[1.35]" style={{ color: '#cf3f5b' }}>
                      {authMessage}
                    </p>
                  ) : null}

                  {!authUser ? (
                    <>
                      <p className="text-sm leading-[1.25]" style={bodyStyle}>
                        구글 로그인하고 커뮤니티와 선수평가에 참여해요
                      </p>
                      <Button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={isAuthPending || isAuthLoading}
                        className="mt-1 h-10 gap-0 rounded-xl border px-0 text-sm font-medium"
                        style={googleLoginButtonStyle}
                      >
                        <span className="flex items-center gap-[10px] pl-3 pr-3">
                          <GoogleBrandIcon />
                          <span className="leading-5">{isAuthPending ? '이동 중...' : 'Google 계정으로 로그인'}</span>
                        </span>
                      </Button>
                    </>
                  ) : null}
                </div>
              )}
            </section>

            {authUser ? (
          <section className="rounded-lg px-5 py-4" style={{ ...cardStyle, ...surfaceTransitionStyle }}>
            <div className="space-y-3">
              {(
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      aria-label="프로필 사진 변경"
                      className="relative shrink-0"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                    >
                      <div
                        className="flex h-[60px] w-[60px] items-center justify-center overflow-hidden rounded-full"
                        style={{ backgroundColor: isDarkModeEnabled ? '#3a3f52' : 'var(--app-surface-soft)' }}
                      >
                        {isUploadingAvatar ? (
                          <LoadingDots size="sm" showLabel={false} />
                        ) : avatarUrl ? (
                          <Image
                            src={avatarUrl}
                            alt="프로필 사진"
                            width={60}
                            height={60}
                            className="h-full w-full object-cover"
                          />
                        ) : isAvatarResolved ? (
                          <span className="text-[28px] leading-none">
                            {authUser ? pickDefaultAvatar(authUser.id) : '😀'}
                          </span>
                        ) : null}
                      </div>
                      {!isUploadingAvatar && (
                        <span
                          className="absolute bottom-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full"
                          style={{ backgroundColor: isDarkModeEnabled ? '#6b7a99' : '#b0bac9' }}
                          aria-hidden="true"
                        >
                          <PencilSimple size={11} weight="fill" color="white" />
                        </span>
                      )}
                    </button>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarFileChange}
                    />
                    <div className="flex min-w-0 flex-col gap-1.5">
                      {userLevelProfile && (
                        <p className="text-[12px] font-medium" style={mutedStyle}>
                          {userLevelProfile.nextLevel
                            ? `다음 레벨까지 ${userLevelProfile.remainingXp} XP 남았습니다`
                            : '최고 레벨 달성'}
                        </p>
                      )}
                      <div className="flex min-w-0 items-center gap-2">
                        <UserLevelBadge level={userLevelProfile?.level} className="!text-[16px]" />
                        <p className="truncate text-[16px] font-medium leading-none" style={{ color: 'var(--app-title)' }}>
                          {communityNickname}
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsEditingNickname(true)}
                          className="inline-flex h-6 shrink-0 items-center justify-center rounded-[8px] px-2.5 text-[11px] font-semibold"
                          style={{
                            backgroundColor: 'var(--app-action-badge-bg)',
                            color: 'var(--app-action-badge-fg)',
                          }}
                        >
                          변경
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isProfileLoading ? (

                <div className="mt-4">
                  <div className="flex items-center gap-3">
                    <div className="home-image-shimmer h-[18px] w-32 rounded-full" />
                  </div>
                  <div className="home-image-shimmer mt-3 h-2 w-full rounded-full" />
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="home-image-shimmer h-3.5 w-10 rounded-full" />
                    <div className="home-image-shimmer h-3.5 w-10 rounded-full" />
                  </div>
                </div>
              ) : userLevelProfile ? (
                <div className="mt-4">
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold" style={{ color: 'var(--app-title)' }}>
                      현재 누적 XP {userLevelProfile.xpTotal}
                    </p>
                  </div>
                  <div
                    className="mt-3 h-2 overflow-hidden rounded-full"
                    style={{ backgroundColor: 'rgba(148, 163, 184, 0.2)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${userLevelProfile.progressPercent}%`,
                        background: 'linear-gradient(to right, #1c98ff, #b326ff)',
                      }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-[12px] font-medium" style={mutedStyle}>
                    <span>{`${userLevelProfile.currentLevelXp} XP`}</span>
                    <span>{`${userLevelProfile.nextLevelXp ?? userLevelProfile.currentLevelXp} XP`}</span>
                  </div>
                </div>
              ) : null}

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setIsLevelGuideOpen((current) => !current)}
                  className="block w-full text-left"
                  aria-expanded={isLevelGuideOpen}
                >
                  <p
                    className={`text-[13px] font-medium ${isLevelGuideOpen ? '' : 'underline underline-offset-2'}`}
                    style={mutedStyle}
                  >
                    레벨업 기준
                  </p>
                </button>

                {isLevelGuideOpen ? (
                  <div className="mt-3 space-y-1">
                    {levelGuideItems.map((item) => (
                      <p key={item} className="text-[12px] font-medium leading-[1.22]" style={bodyStyle}>
                        {item}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </section>
            ) : null}
          </>
        )}

        <section
          className={`rounded-lg px-5 pt-3 ${authUser && isGameClubNameRegistered ? 'pb-6' : 'pb-3'}`}
          style={{ ...cardStyle, ...surfaceTransitionStyle, minHeight: '62px' }}
        >
          <div className="flex min-h-[36px] items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="flex min-w-0 items-center gap-1 whitespace-nowrap text-sm font-semibold leading-[1.35]">
                <span className="shrink-0" style={{ color: isDarkModeEnabled ? '#ffffff' : 'var(--app-title)' }}>게임 구단주명</span>
                <span
                  className="min-w-0 truncate"
                  title={isGameClubNameRegistered ? gameClubName.trim() : '등록 전'}
                  style={{
                    color: isGameClubNameRegistered ? '#457ae5' : 'var(--app-muted-text)',
                  }}
                >
                  {isGameClubNameRegistered ? gameClubName.trim() : '등록 전'}
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!authUser) {
                  setIsGameClubLoginRequiredOpen(true)
                  return
                }

                setGameClubName((current) => current.trim())
                setGameClubNameError(null)
                setIsEditingGameClubName(true)
              }}
              aria-label={isGameClubNameRegistered ? '게임 구단주명 변경하기' : '게임 구단주명 등록하기'}
              className="shrink-0 text-sm font-medium"
              style={mutedStyle}
            >
              {isGameClubNameRegistered ? '변경하기' : '등록하기'}
            </button>
          </div>
          {authUser && isGameClubNameRegistered ? (
            <div className="mt-2 flex items-center gap-3 text-[12px] font-medium leading-none">
              <button
                type="button"
                onClick={() => handleOpenGameClubAnalysis('official1on1')}
                className="inline-flex shrink-0 items-center"
                style={titleStyle}
              >
                <span>{'1:1 공식경기↗'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenGameClubAnalysis('voltaLive')}
                className="inline-flex shrink-0 items-center"
                style={titleStyle}
              >
                <span>{'볼타 라이브↗'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenGameClubAnalysis('manager')}
                className="inline-flex shrink-0 items-center"
                style={titleStyle}
              >
                <span>{'감독모드↗'}</span>
              </button>
            </div>
          ) : null}
        </section>

        <section className="rounded-lg px-5 py-3" style={{ ...cardStyle, ...surfaceTransitionStyle, minHeight: '62px' }}>
          <div className="flex min-h-[36px] items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold leading-[1.35]" style={{ color: isDarkModeEnabled ? '#ffffff' : 'var(--app-title)' }}>
                내 즐겨찾기
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!authUser) {
                  setIsFavoritesLoginRequiredOpen(true)
                  return
                }

                router.push('/mypage/favorites')
              }}
              className="shrink-0 text-sm font-medium"
              style={mutedStyle}
            >
              자세히보기
            </button>
          </div>
        </section>

        <section className="rounded-lg px-5 py-4" style={{ ...cardStyle, ...surfaceTransitionStyle }}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1">
              <p className="text-sm font-semibold" style={titleStyle}>
                다크모드
              </p>
              <p className="text-sm font-semibold" style={darkModeLabelStyle}>
                {isDarkModeEnabled ? '적용중' : '미적용'}
              </p>
            </div>

            <button
              type="button"
              aria-label="다크모드 토글"
              aria-pressed={isDarkModeEnabled}
              onClick={handleDarkModeToggle}
              className="relative inline-flex h-7 w-[64px] shrink-0 items-center rounded-full p-[3px] transition-colors duration-200"
              style={{
                backgroundColor: isDarkModeEnabled ? '#457ae5' : '#d5dbe3',
                cursor: 'pointer',
              }}
            >
              <span
                className="block h-[22px] w-[34px] rounded-full bg-white shadow-[0_2px_8px_rgba(15,23,42,0.18)] transition-transform duration-200"
                style={{ transform: `translateX(${isDarkModeEnabled ? '24px' : '0px'})` }}
                aria-hidden="true"
              />
            </button>
          </div>
        </section>

        <section
          className={`rounded-lg px-5 py-4 ${isAppNotificationPending ? 'pointer-events-none' : ''}`}
          style={{
            ...cardStyle,
            ...surfaceTransitionStyle,
            opacity: isAppNotificationPending ? 0.76 : 1,
          }}
          aria-busy={isAppNotificationPending}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1">
              <p className="text-sm font-semibold" style={titleStyle}>
                앱 알림
              </p>
              <p className="text-sm font-semibold" style={appNotificationLabelStyle}>
                {appNotificationStatusLabel}
              </p>
            </div>

            <button
              type="button"
              aria-label="앱 알림 토글"
              aria-pressed={isAppNotificationsEnabled}
              onClick={handleAppNotificationToggle}
              disabled={isAppNotificationPending}
              className="relative inline-flex h-7 w-[64px] shrink-0 items-center rounded-full p-[3px] transition-colors duration-200"
              style={{
                backgroundColor: isAppNotificationPending
                  ? 'var(--app-surface-soft)'
                  : isAppNotificationsEnabled
                    ? '#457ae5'
                    : '#d5dbe3',
              }}
            >
              {isAppNotificationPending ? (
                <span className="flex h-full w-full items-center justify-center" aria-hidden="true">
                  <LoadingDots size="sm" showLabel={false} />
                </span>
              ) : (
                <span
                  className="block h-[22px] w-[34px] rounded-full bg-white shadow-[0_2px_8px_rgba(15,23,42,0.18)] transition-transform duration-200"
                  style={{ transform: `translateX(${isAppNotificationsEnabled ? '24px' : '0px'})` }}
                  aria-hidden="true"
                />
              )}
            </button>
          </div>
        </section>

        <section className="rounded-lg px-5 py-3" style={{ ...cardStyle, ...surfaceTransitionStyle, minHeight: '62px' }}>
          <div className="flex min-h-[36px] items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold leading-[1.35]" style={{ color: isDarkModeEnabled ? '#ffffff' : 'var(--app-title)' }}>
                무엇을 도와드릴까요?
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsContactModalOpen(true)}
              aria-label="문의하기"
              className="shrink-0 text-sm font-medium"
              style={mutedStyle}
            >
              문의하기
            </button>
          </div>
        </section>

        <section className="rounded-lg px-5 py-4" style={{ ...cardStyle, ...surfaceTransitionStyle }}>
          <button
            type="button"
            onClick={() => setIsLicenseOpen((current) => !current)}
            className="block w-full text-left"
            aria-expanded={isLicenseOpen}
          >
            <p className={`text-sm font-medium ${isLicenseOpen ? '' : 'underline underline-offset-2'}`} style={mutedStyle}>
              오픈소스 라이선스 보기
            </p>
          </button>

          {isLicenseOpen ? (
            <div className="mt-3 space-y-2">
              {openSourceLicenses.map((license) => (
                <a
                  key={license.name}
                  href={license.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-sm font-medium"
                  style={bodyStyle}
                >
                  <span aria-hidden="true" className="text-[12px] leading-none" style={mutedStyle}>
                    ↗
                  </span>
                  <span>{license.name}</span>
                </a>
              ))}
            </div>
          ) : null}
        </section>

        <section className="rounded-lg px-5 py-4" style={{ ...cardStyle, ...surfaceTransitionStyle }}>
          <button
            type="button"
            onClick={() => setIsTermsOpen((current) => !current)}
            className="block w-full text-left"
            aria-expanded={isTermsOpen}
          >
            <p className="text-sm font-medium" style={mutedStyle}>
              이용약관
            </p>
          </button>

          {isTermsOpen ? (
            <div className="mt-3 space-y-2">
              {termsContent.map((item) => (
                <p key={item} className="text-[12px] font-medium leading-[1.5]" style={bodyStyle}>
                  {item}
                </p>
              ))}
            </div>
          ) : null}
        </section>

        <section ref={privacySectionRef} className="rounded-lg px-5 py-4" style={{ ...cardStyle, ...surfaceTransitionStyle }}>
          <button
            type="button"
            onClick={() => setIsPrivacyOpen((current) => !current)}
            className="block w-full text-left"
            aria-expanded={isPrivacyOpen}
          >
            <p className="text-sm font-medium" style={mutedStyle}>
              개인정보처리방침
            </p>
          </button>

          {isPrivacyOpen ? (
            <div className="mt-3 space-y-2">
              {privacyContent.map((item) => (
                <p key={item} className="text-[12px] font-medium leading-[1.5]" style={bodyStyle}>
                  {renderPolicyLine(item)}
                </p>
              ))}
            </div>
          ) : null}

        </section>

        <section className="rounded-lg px-5 py-4" style={{ ...cardStyle, ...surfaceTransitionStyle }}>
          <p className="text-sm font-medium" style={mutedStyle}>
            {`버전 ${APP_VERSION} (Beta)`}
          </p>
        </section>

        {authUser ? (
          <section className="rounded-lg px-5 py-4" style={{ ...cardStyle, ...surfaceTransitionStyle }}>
            <button
              type="button"
              onClick={() => setIsAccountDeleteOpen((current) => !current)}
              className="block w-full text-left"
              aria-expanded={isAccountDeleteOpen}
            >
              <p className="text-sm font-medium" style={mutedStyle}>
                탈퇴하기
              </p>
            </button>

            {isAccountDeleteOpen ? (
              <div className="mt-3 space-y-3">
                <p className="text-[12px] font-medium leading-[1.5]" style={bodyStyle}>
                  연동 계정을 탈퇴하면 계정 정보는 삭제되지만 기존에 작성한 글과 댓글은 남아 있을 수 있습니다.
                </p>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleDeleteLinkedAccount}
                    disabled={isAuthPending}
                    className="text-sm font-medium underline underline-offset-2 disabled:opacity-50"
                    style={mutedStyle}
                  >
                    연동 계정 탈퇴
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>

      {isAppNotificationSheetOpen ? (
        <div className="fixed inset-0 z-[70]">
          <button
            type="button"
            aria-label="앱 알림 안내 닫기"
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.58)' }}
            onClick={handleDismissAppNotificationSheet}
          />

          <div
            className="absolute left-1/2 z-10 w-[calc(100%-2rem)] max-w-[440px] -translate-x-1/2"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
          >
            <section
              className="rounded-[28px] px-5 pb-6 pt-6 shadow-[0_20px_48px_rgba(15,23,42,0.22)]"
              style={{
                backgroundColor: 'var(--app-modal-bg, #ffffff)',
              }}
            >
              <div
                className="mx-auto mb-4 h-1.5 w-12 rounded-full"
                style={{ backgroundColor: 'rgba(133, 148, 170, 0.32)' }}
              />
              <div className="space-y-2">
                <p className="text-[18px] font-semibold tracking-[-0.02em]" style={titleStyle}>
                  앱 알림 내용을 알려드릴까요?
                </p>
                <p className="text-sm leading-[1.55]" style={bodyStyle}>
                  주요 업데이트와 필요한 알림을 앱으로 바로 받아보실 수 있어요
                </p>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={handleAcceptAppNotificationSheet}
                  disabled={isAppNotificationPending}
                  className="flex h-12 w-full items-center justify-center rounded-2xl px-4 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: '#457ae5' }}
                >
                  {isAppNotificationPending ? '처리 중...' : '동의하기'}
                </button>
                <button
                  type="button"
                  onClick={handleDeferAppNotificationSheet}
                  disabled={isAppNotificationPending}
                  className="block w-full text-center text-sm font-medium disabled:opacity-60"
                  style={{ color: 'var(--app-muted-text)' }}
                >
                  나중에
                </button>
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {isEditingNickname ? (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            aria-label="닉네임 변경 닫기"
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.58)' }}
            onClick={() => {
              setCommunityNickname(authUser ? deriveCommunityNickname(authUser) : '')
              setNicknameError(null)
              setIsEditingNickname(false)
            }}
          />
          <div
            className="absolute left-1/2 z-20 w-[calc(100%-2rem)] max-w-[440px] -translate-x-1/2"
            style={{ bottom: nicknameSheetBottomOffset }}
          >
            <section
              className="rounded-[28px] px-5 pb-6 pt-6 shadow-[0_20px_48px_rgba(15,23,42,0.22)]"
              style={{ backgroundColor: 'var(--app-modal-bg, #ffffff)' }}
            >
              <p className="text-[18px] font-semibold tracking-[-0.02em]" style={titleStyle}>
                닉네임 변경
              </p>
              <div className="mt-5 space-y-2">
                <input
                  autoFocus
                  value={communityNickname}
                  onChange={(event) => {
                    setCommunityNickname(event.target.value.slice(0, 10))
                    setNicknameError(null)
                  }}
                  maxLength={10}
                  placeholder="닉네임을 입력해주세요"
                  className="h-12 w-full rounded-[22px] border-0 px-4 text-sm outline-none transition"
                  style={{
                    backgroundColor: 'var(--app-surface-soft)',
                    color: 'var(--app-title)',
                  }}
                />
                <p
                  className="px-1 text-[12px] font-medium leading-[1.5]"
                  style={{ color: nicknameError ? '#cf3f5b' : 'var(--app-muted-text)' }}
                >
                  {nicknameError ?? '닉네임은 2~10자의 한글, 영문, 숫자와 특수기호(_),(-)만 사용 가능합니다'}
                </p>
              </div>
              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={handleSaveCommunityNickname}
                  disabled={isSavingNickname || isAuthPending}
                  className="flex h-12 w-full items-center justify-center rounded-2xl px-4 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: '#457ae5' }}
                >
                  {isSavingNickname ? '저장 중...' : '변경하기'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCommunityNickname(authUser ? deriveCommunityNickname(authUser) : '')
                    setIsEditingNickname(false)
                  }}
                  disabled={isSavingNickname}
                  className="block w-full text-center text-sm font-medium disabled:opacity-60"
                  style={{ color: 'var(--app-muted-text)' }}
                >
                  취소
                </button>
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {isEditingGameClubName ? (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            aria-label="게임 구단주명 등록 닫기"
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.58)' }}
            onClick={() => {
              setGameClubName(authUser ? readCachedGameClubName(authUser.id) : '')
              setGameClubNameError(null)
              setIsEditingGameClubName(false)
            }}
          />
          <div
            className="absolute left-1/2 z-20 w-[calc(100%-2rem)] max-w-[440px] -translate-x-1/2"
            style={{ bottom: nicknameSheetBottomOffset }}
          >
            <section
              className="rounded-[28px] px-5 pb-6 pt-6 shadow-[0_20px_48px_rgba(15,23,42,0.22)]"
              style={{ backgroundColor: 'var(--app-modal-bg, #ffffff)' }}
            >
              <p className="text-[18px] font-semibold tracking-[-0.02em]" style={titleStyle}>
                게임 구단주명 등록
              </p>
              <div className="mt-5 space-y-2">
                <input
                  autoFocus
                  value={gameClubName}
                  onChange={(event) => {
                    setGameClubName(event.target.value)
                    setGameClubNameError(null)
                  }}
                  placeholder="게임 구단주명을 입력해주세요"
                  className="h-12 w-full rounded-[22px] border-0 px-4 text-sm outline-none transition"
                  style={{
                    backgroundColor: 'var(--app-surface-soft)',
                    color: 'var(--app-title)',
                  }}
                />
                {gameClubNameError ? (
                  <p
                    className="px-1 text-[12px] font-medium leading-[1.5]"
                    style={{ color: '#cf3f5b' }}
                  >
                    {gameClubNameError}
                  </p>
                ) : null}
              </div>
              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={handleSaveGameClubName}
                  disabled={isSavingGameClubName || isAuthPending}
                  className="flex h-12 w-full items-center justify-center rounded-2xl px-4 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: '#457ae5' }}
                >
                  {isSavingGameClubName ? '저장 중...' : isGameClubNameRegistered ? '변경하기' : '등록하기'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGameClubName(authUser ? readCachedGameClubName(authUser.id) : '')
                    setGameClubNameError(null)
                    setIsEditingGameClubName(false)
                  }}
                  disabled={isSavingGameClubName}
                  className="block w-full text-center text-sm font-medium disabled:opacity-60"
                  style={{ color: 'var(--app-muted-text)' }}
                >
                  취소
                </button>
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {isGameClubLoginRequiredOpen ? (
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            aria-label="닫기"
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.58)' }}
            onClick={() => setIsGameClubLoginRequiredOpen(false)}
          />
          <div
            className="absolute left-1/2 z-10 w-[calc(100%-2rem)] max-w-[440px] -translate-x-1/2"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
          >
            <section
              className="rounded-[28px] px-5 pb-6 pt-6 shadow-[0_20px_48px_rgba(15,23,42,0.22)]"
              style={{ backgroundColor: 'var(--app-modal-bg, #ffffff)' }}
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full" style={{ backgroundColor: 'rgba(133, 148, 170, 0.32)' }} />
              <div className="space-y-2">
                <p className="text-[18px] font-semibold tracking-[-0.02em]" style={{ color: 'var(--app-title)' }}>
                  로그인이 필요해요
                </p>
                <p className="text-sm leading-[1.55]" style={{ color: 'var(--app-body-text)' }}>
                  게임 구단주명 등록은 Google 로그인 후 이용할 수 있어요
                </p>
              </div>
              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={async () => {
                    setIsGameClubLoginRequiredOpen(false)
                    await handleGoogleLogin()
                  }}
                  disabled={isAuthPending}
                  className="flex h-12 w-full items-center justify-center rounded-2xl px-4 text-sm font-semibold text-white"
                  style={{ backgroundColor: '#457ae5' }}
                >
                  로그인하러 가기
                </button>
                <button
                  type="button"
                  onClick={() => setIsGameClubLoginRequiredOpen(false)}
                  className="block w-full text-center text-sm font-medium"
                  style={{ color: 'var(--app-muted-text)' }}
                >
                  취소
                </button>
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {isFavoritesLoginRequiredOpen ? (
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            aria-label="닫기"
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.58)' }}
            onClick={() => setIsFavoritesLoginRequiredOpen(false)}
          />
          <div
            className="absolute left-1/2 z-10 w-[calc(100%-2rem)] max-w-[440px] -translate-x-1/2"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
          >
            <section
              className="rounded-[28px] px-5 pb-6 pt-6 shadow-[0_20px_48px_rgba(15,23,42,0.22)]"
              style={{ backgroundColor: 'var(--app-modal-bg, #ffffff)' }}
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full" style={{ backgroundColor: 'rgba(133, 148, 170, 0.32)' }} />
              <div className="space-y-2">
                <p className="text-[18px] font-semibold tracking-[-0.02em]" style={{ color: 'var(--app-title)' }}>
                  로그인이 필요해요
                </p>
                <p className="text-sm leading-[1.55]" style={{ color: 'var(--app-body-text)' }}>
                  내 즐겨찾기는 Google 로그인 후 이용할 수 있어요
                </p>
              </div>
              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={async () => {
                    setIsFavoritesLoginRequiredOpen(false)
                    await handleGoogleLogin()
                  }}
                  disabled={isAuthPending}
                  className="flex h-12 w-full items-center justify-center rounded-2xl px-4 text-sm font-semibold text-white"
                  style={{ backgroundColor: '#457ae5' }}
                >
                  로그인하러 가기
                </button>
                <button
                  type="button"
                  onClick={() => setIsFavoritesLoginRequiredOpen(false)}
                  className="block w-full text-center text-sm font-medium"
                  style={{ color: 'var(--app-muted-text)' }}
                >
                  취소
                </button>
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {isContactModalOpen ? (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            aria-label="문의 작성 닫기"
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.58)' }}
            onClick={() => setIsContactModalOpen(false)}
          />

          <div
            className="absolute left-1/2 z-10 w-[calc(100%-2rem)] max-w-[440px] -translate-x-1/2"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
          >
            <section
              className="max-h-[calc(100vh-96px-env(safe-area-inset-bottom))] w-full overflow-y-auto rounded-[28px] px-5 pb-6 pt-6 shadow-[0_20px_48px_rgba(15,23,42,0.22)]"
              style={{ backgroundColor: 'var(--app-modal-bg, #ffffff)' }}
            >
              <form className="space-y-5" onSubmit={handleSubmitContact}>
                <div>
                  <p className="text-[16px] font-semibold tracking-[-0.02em]" style={titleStyle}>
                    <span style={{ color: '#457ae5' }}>앱문의</span>
                    <span>{' 보내기'}</span>
                  </p>
                </div>

                <label className="block">
                  <span className="hidden" style={titleStyle}>
                    문의 유형
                  </span>
                  <div className="relative">
                    <select
                      value={contactCategory}
                      onChange={(event) => setContactCategory(event.target.value)}
                      className="h-12 w-full appearance-none rounded-[22px] border-0 pl-4 pr-11 text-sm font-semibold outline-none transition"
                      style={{
                        backgroundColor: 'var(--app-surface-soft)',
                        color: 'var(--app-title)',
                      }}
                    >
                      <option value="앱 문의">앱 문의</option>
                      <option value="기능 요청">기능 요청</option>
                      <option value="오류 제보">오류 제보</option>
                    </select>
                    <SelectChevron className="right-3" />
                  </div>
                </label>

                <label className="block">
                  <span className="hidden" style={titleStyle}>
                    제목
                  </span>
                  <input
                    required
                    maxLength={100}
                    value={contactTitle}
                    onChange={(event) => setContactTitle(event.target.value)}
                    placeholder="제목을 입력해주세요"
                    className="h-12 w-full rounded-[22px] border-0 px-4 text-sm outline-none transition"
                    style={{
                      backgroundColor: 'var(--app-surface-soft)',
                      color: 'var(--app-title)',
                    }}
                  />
                </label>

                <label className="block">
                  <span className="hidden" style={titleStyle}>
                    내용
                  </span>
                  <textarea
                    required
                    maxLength={2000}
                    value={contactContent}
                    onChange={(event) => setContactContent(event.target.value)}
                    placeholder="문의 내용을 입력해주세요"
                    rows={4}
                    className="min-h-[104px] w-full rounded-[22px] border-0 px-4 py-3 text-sm outline-none transition"
                    style={{
                      backgroundColor: 'var(--app-surface-soft)',
                      color: 'var(--app-title)',
                      resize: 'none',
                    }}
                  />
                </label>

                <label className="block">
                  <span className="hidden" style={titleStyle}>
                    연락수단
                  </span>
                  <input
                    maxLength={100}
                    value={contactValue}
                    onChange={(event) => setContactValue(event.target.value)}
                    placeholder="이메일 또는 연락처 (선택)"
                    className="h-12 w-full rounded-[22px] border-0 px-4 text-sm outline-none transition"
                    style={{
                      backgroundColor: 'var(--app-surface-soft)',
                      color: 'var(--app-title)',
                    }}
                  />
                </label>

                <div className="mt-7 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => setIsContactModalOpen(false)}
                    className="order-2 block w-full text-center text-sm font-medium"
                    style={{
                      color: 'var(--app-muted-text)',
                    }}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingContact}
                    className="order-1 flex h-12 w-full items-center justify-center rounded-2xl px-4 text-sm font-semibold text-white disabled:opacity-60"
                    style={{ backgroundColor: '#457ae5' }}
                  >
                    {isSendingContact ? '보내는 중...' : '보내기'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      ) : null}
    </div>
  )
}

