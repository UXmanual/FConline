'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import SelectChevron from '@/components/ui/SelectChevron'
import { type CommunityPostSummary } from '@/lib/community'

const POSTS_PER_PAGE = 5
const MAX_VISIBLE_PAGES = 5
const PLAYER_SEARCH_RESULTS_KEY = 'player-search-results'
const PLAYER_QUERY_CACHE_KEY = 'players-query-cache'

type CommunityPageData = {
  items: CommunityPostSummary[]
  totalCount: number
  page: number
  pageSize: number
}

type Props = {
  playerId: string
  playerName: string
  defaultCardLevel?: number
  aiReviewSummariesByLevel?: Record<number, string>
  onTotalCountChange?: (count: number) => void
  initialHighlightedPostId?: string | null
}

function ReviewSkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="rounded-lg px-5 py-4"
          style={{ backgroundColor: 'var(--app-card-bg)', border: '1px solid var(--app-card-border)' }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="home-image-shimmer h-7 w-16 rounded-lg" />
              <div className="home-image-shimmer h-3.5 w-16 rounded-full" />
              <div className="home-image-shimmer h-3.5 w-2 rounded-full" />
              <div className="home-image-shimmer h-3.5 w-14 rounded-full" />
            </div>
            <div className="home-image-shimmer h-3.5 w-8 rounded-full" />
          </div>
          <div className="home-image-shimmer mt-3 h-4 w-[72%] rounded-full" />
          <div className="home-image-shimmer mt-3 h-3.5 w-[88%] rounded-full" />
          <div className="home-image-shimmer mt-2 h-3.5 w-[64%] rounded-full" />
        </div>
      ))}
    </div>
  )
}

function ReviewPostCard({
  post,
  onDelete,
  highlight,
}: {
  post: CommunityPostSummary
  onDelete: (post: CommunityPostSummary) => void
  highlight?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const cardLevelMatch = post.title.match(/^\[(\d+카)\]\s*(.*)$/)
  const cardLevelLabel = cardLevelMatch?.[1] ?? null
  const titleBody = cardLevelMatch?.[2] ?? post.title

  return (
    <article
      className="rounded-lg px-5 py-4"
      style={{
        backgroundColor: 'var(--app-card-bg)',
        border: '1px solid var(--app-card-border)',
        boxShadow: highlight ? '0 0 0 2px rgba(69, 122, 229, 0.22)' : undefined,
      }}
      onClick={() => setExpanded((current) => !current)}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex h-7 items-center rounded-lg px-3 text-[12px] font-semibold"
            style={{ backgroundColor: 'var(--app-surface-soft)', color: 'var(--app-body-text)' }}
          >
            선수 평가
          </span>
          <span className="text-[12px] font-semibold leading-none" style={{ color: 'var(--app-body-text)' }}>
            {post.nickname}
          </span>
          <span className="text-[12px] font-medium leading-none" style={{ color: 'var(--app-muted-text)' }}>
            ·
          </span>
          <span className="text-[12px] font-medium leading-none" style={{ color: 'var(--app-muted-text)' }}>
            {post.createdAtLabel}
          </span>
        </div>

        {expanded ? (
          <button
            type="button"
            className="shrink-0 text-[12px] font-medium leading-none"
            style={{ color: 'var(--app-muted-text)' }}
            onClick={(event) => {
              event.stopPropagation()
              onDelete(post)
            }}
          >
            삭제
          </button>
        ) : null}
      </div>

      <h2
        className={`mt-3 text-[15px] font-semibold tracking-[-0.02em] ${
          expanded ? 'whitespace-normal break-words' : 'overflow-hidden text-ellipsis whitespace-nowrap'
        }`}
        style={{ color: 'var(--app-title)' }}
      >
        {cardLevelLabel ? <span style={{ color: '#457ae5' }}>{`[${cardLevelLabel}] `}</span> : null}
        <span>{titleBody}</span>
      </h2>

      <p
        className={`mt-3 text-sm leading-6 ${
          expanded ? 'whitespace-pre-wrap break-words' : 'line-clamp-2 break-words'
        }`}
        style={{ color: 'var(--app-body-text)' }}
      >
        {post.content}
      </p>

      {post.ipPrefix ? (
        <div className="mt-3 text-right text-[12px] font-medium" style={{ color: 'var(--app-muted-text)' }}>
          {post.ipPrefix}
        </div>
      ) : null}
    </article>
  )
}

export default function PlayerReviewSection({
  playerId,
  playerName,
  defaultCardLevel = 1,
  aiReviewSummariesByLevel,
  onTotalCountChange,
  initialHighlightedPostId = null,
}: Props) {
  const listTopRef = useRef<HTMLElement | null>(null)
  const cacheRef = useRef<Map<number, CommunityPageData>>(new Map())
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [selectedCardLevel, setSelectedCardLevel] = useState(defaultCardLevel)
  const [aiSelectedCardLevel, setAiSelectedCardLevel] = useState(defaultCardLevel)
  const [posts, setPosts] = useState<CommunityPostSummary[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageWindowStart, setPageWindowStart] = useState(1)
  const [isLoadingPosts, setIsLoadingPosts] = useState(true)
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [isSubmittingPost, setIsSubmittingPost] = useState(false)
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null)
  const totalPages = Math.max(1, Math.ceil(totalCount / POSTS_PER_PAGE))
  const maxPageWindowStart = Math.max(1, totalPages - MAX_VISIBLE_PAGES + 1)
  const safePageWindowStart = Math.min(pageWindowStart, maxPageWindowStart)
  const pageGroupEnd = Math.min(totalPages, safePageWindowStart + MAX_VISIBLE_PAGES - 1)
  const visiblePages = Array.from({ length: pageGroupEnd - safePageWindowStart + 1 }, (_, index) => safePageWindowStart + index)

  useEffect(() => {
    onTotalCountChange?.(totalCount)
  }, [onTotalCountChange, totalCount])

  function invalidatePlayerSearchCaches() {
    if (typeof window === 'undefined') return

    window.sessionStorage.removeItem(PLAYER_SEARCH_RESULTS_KEY)
    window.sessionStorage.removeItem(PLAYER_QUERY_CACHE_KEY)
  }

  useEffect(() => {
    setSelectedCardLevel(defaultCardLevel)
    setAiSelectedCardLevel(defaultCardLevel)
  }, [defaultCardLevel, playerId])

  const aiReviewSummary = aiReviewSummariesByLevel?.[aiSelectedCardLevel] ?? null

  useEffect(() => {
    cacheRef.current.clear()
    setPosts([])
    setTotalCount(0)
    setCurrentPage(1)
    setPageWindowStart(1)
    setHighlightedPostId(initialHighlightedPostId)
    void fetchPostsPage(1, { highlightPostId: initialHighlightedPostId })
  }, [initialHighlightedPostId, playerId])

  useEffect(() => {
    if (!highlightedPostId) return

    const frameId = window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(`[data-post-id="${highlightedPostId}"]`)
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [highlightedPostId, posts])

  function scrollToListTop() {
    listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function fetchPostsPage(
    page: number,
    options?: {
      useSkeleton?: boolean
      highlightPostId?: string | null
    },
  ) {
    const useSkeleton = options?.useSkeleton ?? true
    const highlightPostId = options?.highlightPostId ?? null
    const shouldBypassCache = Boolean(highlightPostId)
    const cached = shouldBypassCache ? null : cacheRef.current.get(page)

    if (cached) {
      setPosts(cached.items)
      setTotalCount(cached.totalCount)
      setCurrentPage(cached.page)
      setPageWindowStart(Math.max(1, Math.min(cached.page, Math.max(1, Math.ceil(cached.totalCount / POSTS_PER_PAGE) - MAX_VISIBLE_PAGES + 1))))
      setIsLoadingPosts(false)
      return
    }

    try {
      setIsLoadingPosts(useSkeleton)
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(POSTS_PER_PAGE),
        playerId,
      })

      if (highlightPostId) {
        params.set('postId', highlightPostId)
      }

      const response = await fetch(`/api/player-reviews/posts?${params.toString()}`, { cache: 'no-store' })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message ?? '게시글을 불러오지 못했습니다.')
      }

      const data: CommunityPageData = {
        items: result.items ?? [],
        totalCount: result.totalCount ?? 0,
        page: result.page ?? page,
        pageSize: result.pageSize ?? POSTS_PER_PAGE,
      }

      cacheRef.current.set(data.page, data)
      setPosts(data.items)
      setTotalCount(data.totalCount)
      setCurrentPage(data.page)
      setPageWindowStart(
        Math.max(1, Math.min(data.page, Math.max(1, Math.ceil(data.totalCount / POSTS_PER_PAGE) - MAX_VISIBLE_PAGES + 1))),
      )
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '게시글을 불러오지 못했습니다.')
    } finally {
      setIsLoadingPosts(false)
    }
  }

  async function goToPage(page: number) {
    if (page < 1 || page > totalPages || page === currentPage) return

    setCurrentPage(page)
    await fetchPostsPage(page)
    scrollToListTop()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmittingPost) return

    const trimmedNickname = nickname.trim()
    const trimmedPassword = password.trim()
    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()

    if (!trimmedNickname || !trimmedPassword || !trimmedTitle || !trimmedContent || trimmedNickname.length > 10) {
      return
    }

    try {
      setIsSubmittingPost(true)
      const response = await fetch('/api/player-reviews/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: '선수',
          playerName,
          nickname: trimmedNickname,
          password: trimmedPassword,
          title: `[${selectedCardLevel}카] ${trimmedTitle}`,
          content: trimmedContent,
          playerId,
        }),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message ?? '게시글을 등록하지 못했습니다.')
      }

      setNickname('')
      setPassword('')
      setTitle('')
      setContent('')
      setIsComposerOpen(false)
      setHighlightedPostId(result.item?.id ?? null)
      invalidatePlayerSearchCaches()
      cacheRef.current.clear()
      setCurrentPage(1)
      setPageWindowStart(1)
      await fetchPostsPage(1, { useSkeleton: false })
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '게시글을 등록하지 못했습니다.')
    } finally {
      setIsSubmittingPost(false)
    }
  }

  async function handleDeletePost(targetPost: CommunityPostSummary) {
    const enteredPassword = window.prompt('게시글 비밀번호를 입력해 주세요.')
    if (enteredPassword === null) return

    try {
      const response = await fetch('/api/player-reviews/posts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: targetPost.id, password: enteredPassword }),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message ?? '게시글을 삭제하지 못했습니다.')
      }

      invalidatePlayerSearchCaches()
      cacheRef.current.clear()
      const nextTotalCount = Math.max(0, totalCount - 1)
      const nextTotalPages = Math.max(1, Math.ceil(nextTotalCount / POSTS_PER_PAGE))
      const targetPage = Math.min(currentPage, nextTotalPages)
      setCurrentPage(targetPage)
      setPageWindowStart((current) => Math.min(current, Math.max(1, nextTotalPages - MAX_VISIBLE_PAGES + 1)))
      await fetchPostsPage(targetPage, { useSkeleton: false })
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '게시글을 삭제하지 못했습니다.')
    }
  }

  return (
    <div className="space-y-3">
      <section
        className="rounded-lg px-5 py-4"
        style={{ backgroundColor: 'var(--app-card-bg)', border: '1px solid var(--app-card-border)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-semibold tracking-[-0.02em]" style={{ color: 'var(--app-title)' }}>
              {playerName} 선수 평가
            </h2>
            <p className="mt-1 text-sm leading-5" style={{ color: 'var(--app-nav-label)' }}>
              체감, 장단점, 추천 포지션을
              <br />
              자유롭게 남겨보세요
            </p>
          </div>
          {isLoadingPosts ? (
            <div aria-hidden="true" className="home-image-shimmer h-9 w-[78px] shrink-0 rounded-lg" />
          ) : (
            <button
              type="button"
              onClick={() => setIsComposerOpen(true)}
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg px-4 text-sm font-semibold text-white transition"
              style={{ backgroundColor: '#457ae5' }}
            >
              글쓰기
            </button>
          )}
        </div>

        {aiReviewSummary ? (
          <div
            className="mt-3 border-t pt-3"
            style={{ borderColor: 'color-mix(in srgb, var(--app-card-border) 88%, transparent)' }}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold tracking-[-0.02em]" style={{ color: 'var(--app-title)' }}>
                🤖 AI 선수평가
              </p>
              <div className="relative shrink-0">
                <select
                  value={aiSelectedCardLevel}
                  onChange={(event) => setAiSelectedCardLevel(Number(event.target.value))}
                  className="h-8 appearance-none rounded-lg border pl-2.5 pr-7 text-[12px] font-semibold outline-none transition focus:bg-transparent"
                  style={{
                    minWidth: '72px',
                    backgroundColor: 'var(--app-input-bg)',
                    borderColor: 'var(--app-input-border)',
                    color: 'var(--app-title)',
                  }}
                >
                  {Array.from({ length: 13 }, (_, index) => {
                    const level = index + 1
                    return (
                      <option key={level} value={level}>
                        {level}카
                      </option>
                    )
                  })}
                </select>
                <SelectChevron size={12} className="right-2" />
              </div>
            </div>
            <p className="mt-2 text-sm leading-5" style={{ color: 'var(--app-body-text)' }}>
              {aiReviewSummary}
            </p>
          </div>
        ) : null}
      </section>

      <section ref={listTopRef} className="space-y-3">
        {isLoadingPosts ? (
          <ReviewSkeletonList />
        ) : posts.length > 0 ? (
          posts.map((post) => (
            <div key={post.id} data-post-id={post.id}>
              <ReviewPostCard post={post} onDelete={handleDeletePost} highlight={post.id === highlightedPostId} />
            </div>
          ))
        ) : (
          <div
            className="rounded-lg px-5 py-8 text-center text-sm"
            style={{ backgroundColor: 'var(--app-card-bg)', border: '1px solid var(--app-card-border)', color: 'var(--app-muted-text)' }}
          >
            아직 등록된 선수 평가가 없습니다.
          </div>
        )}

        <div
          className="flex items-center justify-center gap-2 rounded-lg px-4 py-3"
          style={{ backgroundColor: 'var(--app-card-bg)', border: '1px solid var(--app-card-border)' }}
        >
          <button
            type="button"
            onClick={() => {
              const nextPage = Math.max(1, currentPage - 1)
              setPageWindowStart(Math.max(1, safePageWindowStart - 1))
              void goToPage(nextPage)
            }}
            disabled={currentPage === 1}
            className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-semibold transition disabled:opacity-40"
            style={{ backgroundColor: 'var(--app-surface-soft)', color: 'var(--app-body-text)' }}
          >
            이전
          </button>

          <div className="flex items-center gap-1.5">
            {visiblePages.map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => {
                  if (page < safePageWindowStart) setPageWindowStart(page)
                  else if (page > pageGroupEnd) setPageWindowStart(Math.min(page, maxPageWindowStart))
                  void goToPage(page)
                }}
                className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-semibold transition"
                style={{ backgroundColor: page === currentPage ? '#457ae5' : 'var(--app-surface-soft)', color: page === currentPage ? '#fff' : 'var(--app-body-text)' }}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              const nextPage = Math.min(totalPages, currentPage + 1)
              setPageWindowStart(Math.min(maxPageWindowStart, safePageWindowStart + 1))
              void goToPage(nextPage)
            }}
            disabled={currentPage === totalPages}
            className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-semibold transition disabled:opacity-40"
            style={{ backgroundColor: 'var(--app-surface-soft)', color: 'var(--app-body-text)' }}
          >
            다음
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsComposerOpen(true)}
          className="mx-auto mt-1 mb-2 flex h-[54px] w-full items-center justify-center text-sm font-semibold text-white transition"
          style={{ borderRadius: '16px', backgroundColor: '#457ae5' }}
        >
          글쓰기
        </button>
      </section>

      {isComposerOpen ? (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            aria-label="글쓰기 닫기"
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(37, 52, 82, 0.58)' }}
            onClick={() => setIsComposerOpen(false)}
          />

          <div className="absolute inset-0 z-10 flex items-center justify-center px-8 py-6 sm:px-7">
            <section
              className="max-h-[calc(100vh-48px)] w-full max-w-[320px] overflow-y-auto px-5 py-6 shadow-[0_20px_44px_rgba(15,23,42,0.18)] sm:max-w-[360px] sm:px-6 sm:py-6"
              style={{ borderRadius: '24px', backgroundColor: 'var(--app-modal-bg, #ffffff)' }}
            >
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <p
                    className="text-[16px] font-semibold tracking-[-0.02em]"
                    style={{ color: 'var(--app-title)' }}
                  >
                    <span style={{ color: '#457ae5' }}>{playerName}</span>
                    <span>{' 선수 평가'}</span>
                  </p>
                  <label className="block">
                    <div className="relative mt-2">
                      <select
                        value={selectedCardLevel}
                        onChange={(event) => setSelectedCardLevel(Number(event.target.value))}
                        className="h-11 w-full appearance-none rounded-lg border pl-3 pr-10 text-sm font-semibold outline-none transition focus:bg-transparent"
                        style={{
                          backgroundColor: 'var(--app-input-bg)',
                          borderColor: 'var(--app-input-border)',
                          color: 'var(--app-title)',
                        }}
                      >
                        {Array.from({ length: 13 }, (_, index) => {
                          const level = index + 1
                          return (
                            <option key={level} value={level}>
                              {level}카
                            </option>
                          )
                        })}
                      </select>
                      <SelectChevron className="right-3" />
                    </div>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-sm font-semibold" style={{ color: 'var(--app-title)' }}>닉네임</span>
                    <input
                      required
                      maxLength={10}
                      value={nickname}
                      onChange={(event) => setNickname(event.target.value.slice(0, 10))}
                      placeholder="닉네임"
                      className="mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none transition focus:bg-transparent"
                      style={{ backgroundColor: 'var(--app-input-bg)', borderColor: 'var(--app-input-border)', color: 'var(--app-title)' }}
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold" style={{ color: 'var(--app-title)' }}>비밀번호</span>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="비밀번호"
                      className="mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none transition focus:bg-transparent"
                      style={{ backgroundColor: 'var(--app-input-bg)', borderColor: 'var(--app-input-border)', color: 'var(--app-title)' }}
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-semibold" style={{ color: 'var(--app-title)' }}>제목</span>
                  <input
                    required
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="제목을 입력해주세요"
                    className="mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none transition focus:bg-transparent"
                    style={{ backgroundColor: 'var(--app-input-bg)', borderColor: 'var(--app-input-border)', color: 'var(--app-title)' }}
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold" style={{ color: 'var(--app-title)' }}>내용</span>
                  <textarea
                    required
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    placeholder={`${playerName} 선수 평가를 입력해주세요`}
                    rows={6}
                    className="mt-2 w-full rounded-lg border px-3 py-3 text-sm leading-6 outline-none transition focus:bg-transparent"
                    style={{ backgroundColor: 'var(--app-input-bg)', borderColor: 'var(--app-input-border)', color: 'var(--app-title)' }}
                  />
                </label>

                <div className="flex items-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsComposerOpen(false)}
                    disabled={isSubmittingPost}
                    className="flex items-center justify-center text-sm font-semibold transition disabled:opacity-60"
                    style={{ flex: '1 1 0%', height: '54px', borderRadius: '14px', backgroundColor: 'var(--app-card-bg)', border: '1px solid var(--app-input-border)', color: 'var(--app-muted-text)' }}
                  >
                    취소
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmittingPost}
                    className="flex items-center justify-center text-sm font-semibold text-white transition disabled:opacity-70"
                    style={{ flex: '2 1 0%', height: '54px', borderRadius: '16px', backgroundColor: '#457ae5' }}
                  >
                    {isSubmittingPost ? '등록 중...' : '글쓰기'}
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
