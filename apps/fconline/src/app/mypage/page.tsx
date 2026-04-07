'use client'

import { useState } from 'react'
import { APP_VERSION, RELEASE_NOTES_BY_VERSION } from '@/lib/appVersion'
import { setDarkModeEnabled, useDarkModeEnabled } from '@/lib/darkMode'

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
  '최종 업데이트: 2026.04.06',
  '본 약관은 FCO Ground(이하 "서비스")의 이용과 관련하여 서비스 운영자와 이용자 간의 권리, 의무 및 책임사항을 정하는 것을 목적으로 합니다.',
  '1. 서비스 소개',
  'FCO Ground는 FC Online 관련 정보 탐색을 지원하는 앱입니다.',
  '서비스는 경기 기록 조회, 선수 검색, 커뮤니티 이용, 설정 및 안내 정보 제공 기능 등을 포함할 수 있습니다.',
  '2. 약관 동의 및 적용',
  '이용자는 서비스 가입 또는 이용 시 본 약관에 동의한 것으로 봅니다.',
  '운영자는 관련 법령 및 서비스 운영 정책에 따라 약관 내용을 변경할 수 있으며, 중요한 변경이 있는 경우 앱 또는 관련 안내 페이지를 통해 공지합니다.',
  '3. 회원가입 및 계정 이용',
  '이 서비스는 회원가입 시 실제 이름, 생년월일, 휴대전화번호 등 실명 기반 개인정보 입력을 요구하지 않습니다.',
  '회원가입이 가능한 경우에도 이용자는 익명의 아이디(ID)와 비밀번호를 설정하여 가입할 수 있습니다.',
  '이용자는 다음 사항을 준수해야 합니다.',
  '- 타인을 사칭하거나 타인의 계정을 무단으로 사용해서는 안 됩니다.',
  '- 계정 정보는 이용자 본인이 관리해야 하며, 비밀번호 보안 책임은 이용자에게 있습니다.',
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
  '이용자는 언제든지 계정 삭제 또는 탈퇴를 요청할 수 있습니다.',
  '운영자는 서비스 종료 또는 장기 중단이 필요한 경우 가능한 범위 내에서 사전에 안내합니다.',
  '11. 문의',
  '서비스 이용 중 문의가 필요한 경우 운영자가 별도로 안내하는 연락 수단을 통해 문의할 수 있습니다.',
]

const privacyContent = [
  '최종 업데이트: 2026.04.06',
  'FCO Ground(이하 "서비스")는 이용자의 개인정보를 중요하게 생각하며, 관련 법령을 준수하기 위해 노력합니다.',
  '본 방침은 서비스가 어떤 정보를 수집하고, 왜 이용하며, 어떻게 보관 및 삭제하는지 설명합니다.',
  '1. 기본 원칙',
  '서비스는 회원가입 또는 서비스 이용 과정에서 꼭 필요한 최소한의 정보만 수집하는 것을 원칙으로 합니다.',
  '특히 이 서비스는 실제 이름, 생년월일, 휴대전화번호 등 실명 기반 개인정보를 회원가입 필수 정보로 요구하지 않는 방향으로 운영합니다.',
  '가입 기능이 제공되는 경우에도 익명의 아이디(ID)와 비밀번호를 통해 회원가입할 수 있도록 설계하는 것을 원칙으로 합니다.',
  '2. 수집하는 개인정보 항목',
  '서비스는 아래 정보를 수집하거나 처리할 수 있습니다.',
  '- 회원가입 시: 익명 아이디(ID), 인증을 위한 비밀번호 정보',
  '- 커뮤니티 이용 시: 닉네임, 게시글, 댓글 등 이용자가 직접 입력한 정보',
  '- 서비스 이용 과정에서 자동 생성되는 정보: 접속 기록, IP 일부 정보, 기기/브라우저 정보, 오류 기록, 이용 로그',
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
  '- 회원 정보: 탈퇴 전까지',
  '- 게시글/댓글 관련 기록: 분쟁 방지 또는 운영 기록 확인이 필요한 기간 동안',
  '- 접속 로그 및 보안 기록: 보안 대응 및 비정상 이용 방지에 필요한 기간 동안',
  '- 법령상 보관 의무가 있는 정보: 해당 법령이 정한 기간 동안',
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
  '- 기타 서비스 운영에 필요한 클라우드 또는 인프라 서비스',
  '이 과정에서 서비스 운영에 필요한 최소 범위의 정보가 관련 인프라를 통해 처리될 수 있습니다.',
  '실제 위탁 대상, 위탁 업무 내용, 보유 환경 등이 확정 또는 변경될 경우 앱 내 정책 또는 별도 문서를 통해 고지합니다.',
  '8. 정보주체의 권리와 행사 방법',
  '이용자는 자신의 계정정보, 게시글, 댓글 등 서비스 내에서 생성하거나 제공한 정보에 대해 조회, 수정, 삭제, 처리 정지 또는 회원 탈퇴를 요청할 수 있습니다.',
  '운영자는 관련 법령상 제한이 없는 범위에서 이러한 요청을 검토하고 처리합니다.',
  '9. 개인정보의 안전성 확보 조치',
  '서비스는 개인정보 보호를 위해 합리적인 수준의 보호 조치를 적용하도록 노력합니다.',
  '예를 들어 접근 제한, 인증 정보 보호, 관리 범위 최소화, 로그 확인 등의 방법을 사용할 수 있습니다.',
  '10. 개인정보 보호책임자 및 문의처',
  '개인정보 보호 관련 문의, 열람 요청, 정정 요청, 삭제 요청, 처리 정지 요청, 탈퇴 요청은 아래 연락처로 접수할 수 있습니다.',
  '- 이메일: uxdmanual@gmail.com',
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

export default function MyPage() {
  const isDarkModeEnabled = useDarkModeEnabled()
  const [isLicenseOpen, setIsLicenseOpen] = useState(false)
  const [isTermsOpen, setIsTermsOpen] = useState(false)
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false)
  const releaseNotes = RELEASE_NOTES_BY_VERSION[APP_VERSION] ?? RELEASE_NOTES_BY_VERSION['11.5']

  const handleDarkModeToggle = () => {
    const nextValue = !isDarkModeEnabled
    setDarkModeEnabled(nextValue)
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
  const badgeStyle = {
    backgroundColor: 'var(--app-badge-bg)',
    color: 'var(--app-badge-fg)',
    transition: 'background-color 180ms ease, color 180ms ease',
  }
  const surfaceTransitionStyle = {
    transition: 'background-color 180ms ease, border-color 180ms ease, color 180ms ease',
  }
  const darkModeLabelStyle = {
    color: isDarkModeEnabled ? '#457ae5' : 'var(--app-muted-text)',
    transition: 'color 180ms ease',
  }

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
      <div className="space-y-4">
        <div className="flex h-6 items-center">
          <h1 className="text-[18px] font-bold tracking-[-0.02em]" style={titleStyle}>
            마이페이지
          </h1>
        </div>

        <section className="rounded-lg px-5 py-4" style={{ ...cardStyle, ...surfaceTransitionStyle }}>
          <div className="flex items-center gap-1">
            <p className="text-sm font-semibold" style={titleStyle}>
              준비중이에요
            </p>
            <span aria-hidden="true" className="text-[18px] leading-none">
              🤗
            </span>
          </div>
        </section>

        <section className="rounded-lg px-5 py-4" style={{ ...cardStyle, ...surfaceTransitionStyle }}>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm leading-[1.45]" style={bodyStyle}>
                현재 베타 테스트 중입니다.
              </p>
              <p className="text-sm leading-[1.45]" style={bodyStyle}>
                문의사항은 이메일로 연락해 주세요.
              </p>
            </div>

            <a
              href="mailto:uxdmanual@gmail.com"
              aria-label="이메일 보내기"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[18px] leading-none"
              style={badgeStyle}
            >
              📧
            </a>
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
                backgroundColor: isDarkModeEnabled
                  ? '#457ae5'
                  : '#d5dbe3',
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

        <section className="rounded-lg px-5 py-4" style={{ ...cardStyle, ...surfaceTransitionStyle }}>
          <p className="text-sm font-medium" style={mutedStyle}>
            {`버전 ${APP_VERSION} (Beta)`}
          </p>
          <div className="mt-2.5 space-y-0.5">
            {releaseNotes.map((note) => (
              <p key={note} className="text-[12px] font-medium leading-[1.35]" style={mutedStyle}>
                - {note}
              </p>
            ))}
          </div>
        </section>

        <section className="rounded-lg px-5 py-4" style={{ ...cardStyle, ...surfaceTransitionStyle }}>
          <button
            type="button"
            onClick={() => setIsLicenseOpen((current) => !current)}
            className="block w-full text-left"
            aria-expanded={isLicenseOpen}
          >
            <p
              className={`text-sm font-medium ${isLicenseOpen ? '' : 'underline underline-offset-2'}`}
              style={mutedStyle}
            >
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
            <p
              className="text-sm font-medium"
              style={mutedStyle}
            >
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

        <section className="rounded-lg px-5 py-4" style={{ ...cardStyle, ...surfaceTransitionStyle }}>
          <button
            type="button"
            onClick={() => setIsPrivacyOpen((current) => !current)}
            className="block w-full text-left"
            aria-expanded={isPrivacyOpen}
          >
            <p
              className="text-sm font-medium"
              style={mutedStyle}
            >
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
      </div>
    </div>
  )
}
