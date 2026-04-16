'use client'

import { useState } from 'react'
import { APP_VERSION } from '@/lib/appVersion'

export default function MyPageAdminPushPage() {
  const [pushAdminToken, setPushAdminToken] = useState('')
  const [broadcastTitle, setBroadcastTitle] = useState('')
  const [broadcastBody, setBroadcastBody] = useState('')
  const [broadcastUrl, setBroadcastUrl] = useState('/home')
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false)

  const cardStyle = {
    backgroundColor: 'var(--app-card-bg)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--app-card-border)',
  }
  const titleStyle = { color: 'var(--app-title)' }
  const mutedStyle = { color: 'var(--app-muted-text)' }
  const surfaceTransitionStyle = {
    transition: 'background-color 180ms ease, border-color 180ms ease, color 180ms ease',
  }

  const fillVersionPushTemplate = () => {
    setBroadcastTitle(`FCO Ground ${APP_VERSION} 업데이트`)
    setBroadcastBody(`새 버전 ${APP_VERSION}이 적용되었습니다. 앱에서 변경 내용을 확인해 보세요.`)
    setBroadcastUrl('/mypage')
  }

  const handleBroadcastPush = async () => {
    if (isSendingBroadcast) {
      return
    }

    const trimmedAdminToken = pushAdminToken.trim()
    const trimmedTitle = broadcastTitle.trim()
    const trimmedBody = broadcastBody.trim()
    const trimmedUrl = broadcastUrl.trim() || '/home'

    if (!trimmedAdminToken || !trimmedTitle || !trimmedBody) {
      window.alert('운영 토큰, 제목, 내용을 모두 입력해 주세요.')
      return
    }

    try {
      setIsSendingBroadcast(true)
      const response = await fetch('/api/push/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminToken: trimmedAdminToken,
          title: trimmedTitle,
          body: trimmedBody,
          url: trimmedUrl,
        }),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(result?.message ?? '운영 공지 발송에 실패했습니다.')
      }

      window.alert(`운영 공지를 발송했습니다. ${result?.sent ?? 0}개 기기에 전송되었습니다.`)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '운영 공지 발송에 실패했습니다.')
    } finally {
      setIsSendingBroadcast(false)
    }
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
            Administrator Page
          </h1>
        </div>

        <section className="rounded-lg px-5 pt-7 pb-4" style={{ ...cardStyle, ...surfaceTransitionStyle }}>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold" style={titleStyle}>
                푸시 알림
              </p>
              <button
                type="button"
                onClick={fillVersionPushTemplate}
                className="inline-flex items-center justify-center text-[12px] font-semibold"
                style={{
                  color: '#457ae5',
                }}
              >
                버전업 안내 공지 입력
              </button>
            </div>

            <label className="block">
              <span className="text-[12px] font-medium" style={mutedStyle}>
                푸시 패스워드
              </span>
              <input
                type="password"
                value={pushAdminToken}
                onChange={(event) => setPushAdminToken(event.target.value)}
                className="mt-1 h-12 w-full rounded-lg border px-3 text-sm outline-none"
                style={{
                  backgroundColor: 'var(--app-input-bg)',
                  borderColor: 'var(--app-input-border)',
                  color: 'var(--app-title)',
                }}
                placeholder="패스워드를 입력해주세요"
              />
            </label>

            <label className="block">
              <span className="text-[12px] font-medium" style={mutedStyle}>
                제목
              </span>
              <input
                type="text"
                value={broadcastTitle}
                onChange={(event) => setBroadcastTitle(event.target.value)}
                className="mt-1 h-12 w-full rounded-lg border px-3 text-sm outline-none"
                style={{
                  backgroundColor: 'var(--app-input-bg)',
                  borderColor: 'var(--app-input-border)',
                  color: 'var(--app-title)',
                }}
                placeholder="예: FCO Ground 16.0 업데이트"
              />
            </label>

            <label className="block">
              <span className="text-[12px] font-medium" style={mutedStyle}>
                내용
              </span>
              <textarea
                value={broadcastBody}
                onChange={(event) => setBroadcastBody(event.target.value)}
                className="mt-1 min-h-[88px] w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                style={{
                  backgroundColor: 'var(--app-input-bg)',
                  borderColor: 'var(--app-input-border)',
                  color: 'var(--app-title)',
                }}
                placeholder="예: 새 버전이 적용되었습니다. 앱에서 변경 내용을 확인해 보세요."
              />
            </label>

            <label className="block">
              <span className="text-[12px] font-medium" style={mutedStyle}>
                이동 경로
              </span>
              <input
                type="text"
                value={broadcastUrl}
                onChange={(event) => setBroadcastUrl(event.target.value)}
                className="mt-1 h-12 w-full rounded-lg border px-3 text-sm outline-none"
                style={{
                  backgroundColor: 'var(--app-input-bg)',
                  borderColor: 'var(--app-input-border)',
                  color: 'var(--app-title)',
                }}
                placeholder="/home"
              />
            </label>

            <button
              type="button"
              onClick={handleBroadcastPush}
              disabled={isSendingBroadcast}
              className="mt-3 mb-3 inline-flex h-12 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold transition-opacity disabled:cursor-default disabled:opacity-60"
              style={{
                backgroundColor: '#457ae5',
                color: '#ffffff',
              }}
            >
              {isSendingBroadcast ? '발송중...' : '푸시 알림 보내기'}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
