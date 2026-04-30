'use client'

import { useState } from 'react'
import { APP_VERSION } from '@/lib/appVersion'

type ReportItem = {
  id: string
  target_type: string
  target_id: string
  reason: string
  status: string
  created_at: string
  preview?: string
  title?: string | null
  link: string
}

const TARGET_TYPE_LABELS: Record<string, string> = {
  community_post: '커뮤니티 게시글',
  community_comment: '커뮤니티 댓글',
  player_review_post: '선수평가 게시글',
  player_review_comment: '선수평가 댓글',
}

export default function MyPageAdminPushPage() {
  const [pushAdminToken, setPushAdminToken] = useState('')
  const [broadcastTitle, setBroadcastTitle] = useState('')
  const [broadcastBody, setBroadcastBody] = useState('')
  const [broadcastUrl, setBroadcastUrl] = useState('/home')
  const [broadcastKind, setBroadcastKind] = useState<'general' | 'app_update'>('general')
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false)
  const [reports, setReports] = useState<ReportItem[]>([])
  const [isLoadingReports, setIsLoadingReports] = useState(false)
  const [reportActionId, setReportActionId] = useState<string | null>(null)

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
    setBroadcastTitle(`FConline Ground ${APP_VERSION} 업데이트`)
    setBroadcastBody(`새 버전 ${APP_VERSION}이 적용되었습니다. 앱에서 변경 내용을 확인해 보세요.`)
    setBroadcastUrl('/notifications')
    setBroadcastKind('app_update')
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
      window.alert('관리자 패스워드, 제목, 내용을 모두 입력해 주세요.')
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
          kind: broadcastKind,
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

  async function loadReports() {
    if (isLoadingReports) return
    const token = pushAdminToken.trim()
    if (!token) {
      window.alert('관리자 패스워드를 먼저 입력해 주세요.')
      return
    }
    setIsLoadingReports(true)
    try {
      const response = await fetch(`/api/reports?token=${encodeURIComponent(token)}`)
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.message ?? '신고 목록을 불러오지 못했습니다.')
      setReports(result.items ?? [])
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '신고 목록을 불러오지 못했습니다.')
    } finally {
      setIsLoadingReports(false)
    }
  }

  async function handleResolveReport(reportId: string) {
    if (reportActionId) return
    setReportActionId(reportId)
    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminToken: pushAdminToken.trim() }),
      })
      if (!response.ok) throw new Error('처리에 실패했습니다.')
      setReports((prev) => prev.filter((r) => r.id !== reportId))
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '처리에 실패했습니다.')
    } finally {
      setReportActionId(null)
    }
  }

  async function handleDeleteReportContent(reportId: string) {
    if (reportActionId) return
    if (!window.confirm('신고된 콘텐츠를 삭제하고 신고를 해제할까요?')) return
    setReportActionId(reportId)
    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminToken: pushAdminToken.trim() }),
      })
      if (!response.ok) throw new Error('삭제에 실패했습니다.')
      setReports((prev) => prev.filter((r) => r.id !== reportId))
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '삭제에 실패했습니다.')
    } finally {
      setReportActionId(null)
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

        <section className="rounded-lg px-5 pt-7 pb-5" style={{ ...cardStyle, ...surfaceTransitionStyle }}>
          <div className="space-y-3">
            <p className="text-sm font-semibold" style={titleStyle}>관리자 패스워드</p>
            <label className="block">
              <input
                type="password"
                value={pushAdminToken}
                onChange={(event) => setPushAdminToken(event.target.value)}
                className="h-12 w-full rounded-lg border px-3 text-sm outline-none"
                style={{
                  backgroundColor: 'var(--app-input-bg)',
                  borderColor: 'var(--app-input-border)',
                  color: 'var(--app-title)',
                }}
                placeholder="패스워드를 입력해주세요"
              />
            </label>
          </div>
        </section>

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
                style={{ color: '#457ae5' }}
              >
                버전업 안내 공지 입력
              </button>
            </div>

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
                placeholder="예: FConline Ground 16.0 업데이트"
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

        <section className="rounded-lg px-5 pt-7 pb-4" style={{ ...cardStyle, ...surfaceTransitionStyle }}>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold" style={titleStyle}>
                신고 관리
              </p>
              <button
                type="button"
                onClick={() => void loadReports()}
                disabled={isLoadingReports}
                className="inline-flex items-center justify-center text-[12px] font-semibold disabled:opacity-60"
                style={{ color: '#457ae5' }}
              >
                {isLoadingReports ? '불러오는 중...' : '목록 불러오기'}
              </button>
            </div>

            {reports.length === 0 ? (
              <p className="py-2 text-sm" style={mutedStyle}>
                신고 목록 불러오기를 눌러 확인하세요.
              </p>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="rounded-lg border p-4 space-y-2"
                    style={{ borderColor: 'var(--app-card-border)', backgroundColor: 'var(--app-surface-soft)' }}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] font-semibold" style={titleStyle}>
                          {TARGET_TYPE_LABELS[report.target_type] ?? report.target_type}
                        </p>
                        <a
                          href={report.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-[11px] font-semibold underline"
                          style={{ color: '#457ae5' }}
                        >
                          새 창으로 보기
                        </a>
                      </div>
                      {report.title && (
                        <p className="text-[13px] font-semibold break-words" style={titleStyle}>
                          {report.title}
                        </p>
                      )}
                      {report.preview && !report.preview.startsWith('ID:')
                        ? report.preview.split('\n').map((line, i) => (
                            <p key={i} className="text-[12px] break-words" style={mutedStyle}>
                              {line}
                            </p>
                          ))
                        : <p className="text-[12px] break-all" style={mutedStyle}>ID: {report.target_id}</p>
                      }
                      <p className="text-[12px] font-medium" style={{ color: '#d97904' }}>
                        신고 사유: {report.reason}
                      </p>
                      <p className="text-[11px]" style={mutedStyle}>
                        {new Date(report.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                      </p>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        disabled={reportActionId === report.id}
                        onClick={() => void handleDeleteReportContent(report.id)}
                        className="flex h-9 flex-1 items-center justify-center rounded-lg text-[12px] font-semibold disabled:opacity-60"
                        style={{ backgroundColor: '#d94f3d', color: '#ffffff' }}
                      >
                        콘텐츠 삭제
                      </button>
                      <button
                        type="button"
                        disabled={reportActionId === report.id}
                        onClick={() => void handleResolveReport(report.id)}
                        className="flex h-9 flex-1 items-center justify-center rounded-lg text-[12px] font-semibold disabled:opacity-60"
                        style={{ backgroundColor: 'var(--app-surface-strong)', color: 'var(--app-body-text)' }}
                      >
                        신고 해제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
