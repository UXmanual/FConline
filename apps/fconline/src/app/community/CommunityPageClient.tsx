'use client'

import { FormEvent, type PointerEvent as ReactPointerEvent, type RefObject, useEffect, useRef, useState } from 'react'
import { COMMUNITY_CATEGORIES, type CommunityCategory, type CommunityCommentItem, type CommunityPostSummary } from '@/lib/community'

const BOARD_TABS = ['자유게시판'] as const
const POSTS_PER_PAGE = 5
const MAX_VISIBLE_PAGES = 5
const URL_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+)/g

type BoardTab = (typeof BOARD_TABS)[number]

function LinkifiedText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(URL_PATTERN)

  return (
    <p className={className}>
      {parts.map((part, index) => {
        if (!part) return null

        const isUrl = URL_PATTERN.test(part)
        URL_PATTERN.lastIndex = 0

        if (!isUrl) {
          return <span key={`${part}-${index}`}>{part}</span>
        }

        const href = part.startsWith('http') ? part : `https://${part}`

        return (
          <a
            key={`${href}-${index}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-[#457ae5] underline underline-offset-2"
            onClick={(event) => event.stopPropagation()}
          >
            {part}
          </a>
        )
      })}
    </p>
  )
}

function BoardTabButton({
  active,
  label,
  count,
}: {
  active: boolean
  label: BoardTab
  count: number
}) {
  return (
    <button
      type="button"
      className="inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-semibold transition"
      style={{
        backgroundColor: active ? '#1f2937' : '#eef2f6',
        color: active ? '#ffffff' : '#5f6b76',
      }}
    >
      <span>{label}</span>
      <span className="ml-1 text-[#457ae5]">{count}</span>
    </button>
  )
}

function CategoryChip({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: CommunityCategory
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 items-center justify-center rounded-lg px-3 text-[12px] font-semibold transition"
      style={{
        backgroundColor: active ? '#457ae5' : '#f3f6f8',
        color: active ? '#ffffff' : '#6b7682',
      }}
    >
      {label}
    </button>
  )
}

function CommunityPostSkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="rounded-lg bg-white px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="home-image-shimmer h-7 w-14 rounded-lg" />
              <div className="home-image-shimmer h-3.5 w-16 rounded-full" />
              <div className="home-image-shimmer h-3.5 w-2 rounded-full" />
              <div className="home-image-shimmer h-3.5 w-14 rounded-full" />
            </div>
            <div className="home-image-shimmer h-3.5 w-8 rounded-full" />
          </div>
          <div className="home-image-shimmer mt-3 h-4 w-[78%] rounded-full" />
          <div className="mt-3 inline-flex items-center gap-1">
            <div className="home-image-shimmer h-3.5 w-8 rounded-full" />
            <div className="home-image-shimmer h-3.5 w-4 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

function CommentSheetSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="home-image-shimmer h-4 w-16 rounded-full" />
            <div className="home-image-shimmer h-3.5 w-12 rounded-full" />
          </div>
          <div className="home-image-shimmer h-3.5 w-[82%] rounded-full" />
          <div className="home-image-shimmer h-3.5 w-[60%] rounded-full" />
        </div>
      ))}
    </div>
  )
}

function PostCard({
  post,
  onDelete,
  onOpenComments,
  cardRef,
}: {
  post: CommunityPostSummary
  onDelete: (post: CommunityPostSummary) => void
  onOpenComments: (post: CommunityPostSummary) => void
  cardRef?: RefObject<HTMLElement | null>
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <article
      ref={cardRef}
      className="rounded-lg bg-white px-5 py-4"
      onClick={() => setExpanded((current) => !current)}
    >
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex h-7 items-center rounded-lg px-3 text-[12px] font-semibold"
              style={{ backgroundColor: '#f3f6f8', color: '#5f6b76' }}
            >
              {post.category}
            </span>
            <span className="text-[12px] font-semibold leading-none text-[#5f6b76]">{post.nickname}</span>
            <span className="text-[12px] font-medium leading-none text-[#96a0aa]">·</span>
            <span className="text-[12px] font-medium leading-none text-[#96a0aa]">{post.createdAtLabel}</span>
          </div>

          {expanded ? (
            <button
              type="button"
              aria-label="게시글 삭제"
              onClick={(event) => {
                event.stopPropagation()
                onDelete(post)
              }}
              className="shrink-0 text-[12px] font-medium leading-none text-[#96a0aa] transition"
            >
              삭제
            </button>
          ) : null}
        </div>

        <h2
          className={`mt-3 text-[15px] font-semibold tracking-[-0.02em] text-[#1e2124] ${
            expanded ? 'whitespace-normal break-words' : 'overflow-hidden text-ellipsis whitespace-nowrap'
          }`}
        >
          {post.title}
        </h2>

        {expanded ? <LinkifiedText text={post.content} className="mt-3 text-sm leading-6 text-[#58616a]" /> : null}
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onOpenComments(post)
        }}
        className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium transition"
      >
        <span className="text-[#1e2124]">댓글</span>
        <span className="font-[600] text-[#457ae5]">{post.commentCount}</span>
      </button>
    </article>
  )
}

export default function CommunityPageClient() {
  const newestPostRef = useRef<HTMLElement | null>(null)
  const commentsScrollRef = useRef<HTMLDivElement | null>(null)
  const listTopRef = useRef<HTMLElement | null>(null)
  const dragPointerIdRef = useRef<number | null>(null)
  const dragStartYRef = useRef(0)
  const [activeBoard] = useState<BoardTab>('자유게시판')
  const [selectedCategory, setSelectedCategory] = useState<CommunityCategory>('자유')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [posts, setPosts] = useState<CommunityPostSummary[]>([])
  const [isLoadingPosts, setIsLoadingPosts] = useState(true)
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [activeCommentPost, setActiveCommentPost] = useState<CommunityPostSummary | null>(null)
  const [comments, setComments] = useState<CommunityCommentItem[]>([])
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [commentNickname, setCommentNickname] = useState('')
  const [commentDraft, setCommentDraft] = useState('')
  const [commentSheetOffsetY, setCommentSheetOffsetY] = useState(0)
  const [isDraggingCommentSheet, setIsDraggingCommentSheet] = useState(false)
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageWindowStart, setPageWindowStart] = useState(1)

  useEffect(() => {
    let cancelled = false

    async function loadPosts() {
      try {
        setIsLoadingPosts(true)
        const response = await fetch('/api/community/posts', { cache: 'no-store' })
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.message ?? '게시글을 불러오지 못했습니다.')
        }

        if (!cancelled) {
          setPosts(result.items ?? [])
        }
      } catch (error) {
        if (!cancelled) {
          window.alert(error instanceof Error ? error.message : '게시글을 불러오지 못했습니다.')
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPosts(false)
        }
      }
    }

    void loadPosts()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = isComposerOpen || activeCommentPost !== null ? 'hidden' : previousOverflow

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [activeCommentPost, isComposerOpen])

  useEffect(() => {
    if (!highlightedPostId) return

    newestPostRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHighlightedPostId(null)
  }, [highlightedPostId, posts])

  const totalPages = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE))
  const maxPageWindowStart = Math.max(1, totalPages - MAX_VISIBLE_PAGES + 1)
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (safeCurrentPage - 1) * POSTS_PER_PAGE
  const paginatedPosts = posts.slice(startIndex, startIndex + POSTS_PER_PAGE)
  const safePageWindowStart = Math.min(pageWindowStart, maxPageWindowStart)
  const pageGroupStart = safePageWindowStart
  const pageGroupEnd = Math.min(totalPages, pageGroupStart + MAX_VISIBLE_PAGES - 1)
  const visiblePages = Array.from(
    { length: pageGroupEnd - pageGroupStart + 1 },
    (_, index) => pageGroupStart + index,
  )
  const sortedComments = [...comments].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  )

  function scrollToListTop() {
    listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function closeCommentSheet() {
    setActiveCommentPost(null)
    setComments([])
    setCommentNickname('')
    setCommentDraft('')
    setCommentSheetOffsetY(0)
    setIsDraggingCommentSheet(false)
    dragPointerIdRef.current = null
  }

  function handleCommentSheetDragStart(event: ReactPointerEvent<HTMLElement>) {
    dragPointerIdRef.current = event.pointerId
    dragStartYRef.current = event.clientY - commentSheetOffsetY
    setIsDraggingCommentSheet(true)
  }

  useEffect(() => {
    if (!isDraggingCommentSheet) {
      return
    }

    function handlePointerMove(event: PointerEvent) {
      if (dragPointerIdRef.current !== event.pointerId) {
        return
      }

      const nextOffset = Math.max(0, event.clientY - dragStartYRef.current)
      setCommentSheetOffsetY(nextOffset)
    }

    function handlePointerEnd(event: PointerEvent) {
      if (dragPointerIdRef.current !== event.pointerId) {
        return
      }

      dragPointerIdRef.current = null
      setIsDraggingCommentSheet(false)

      if (commentSheetOffsetY > 96) {
        closeCommentSheet()
        return
      }

      setCommentSheetOffsetY(0)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerEnd)
    window.addEventListener('pointercancel', handlePointerEnd)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerEnd)
      window.removeEventListener('pointercancel', handlePointerEnd)
    }
  }, [commentSheetOffsetY, isDraggingCommentSheet])

  async function loadComments(post: CommunityPostSummary) {
    try {
      setIsLoadingComments(true)
      setActiveCommentPost(post)
      const response = await fetch(`/api/community/comments?postId=${post.id}`, { cache: 'no-store' })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message ?? '댓글을 불러오지 못했습니다.')
      }

      setComments(result.items ?? [])
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '댓글을 불러오지 못했습니다.')
      setActiveCommentPost(null)
      setComments([])
      setCommentNickname('')
    } finally {
      setIsLoadingComments(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedNickname = nickname.trim()
    const trimmedPassword = password.trim()
    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()

    if (!trimmedNickname || !trimmedPassword || !trimmedTitle || !trimmedContent || trimmedNickname.length > 10) {
      return
    }

    try {
      const response = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedCategory,
          nickname: trimmedNickname,
          password: trimmedPassword,
          title: trimmedTitle,
          content: trimmedContent,
        }),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message ?? '게시글을 저장하지 못했습니다.')
      }

      const nextPost = result.item as CommunityPostSummary
      setPosts((current) => [nextPost, ...current])
      setNickname('')
      setPassword('')
      setTitle('')
      setContent('')
      setSelectedCategory('자유')
      setIsComposerOpen(false)
      setHighlightedPostId(nextPost.id)
      setCurrentPage(1)
      setPageWindowStart(1)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '게시글을 저장하지 못했습니다.')
    }
  }

  async function handleDeletePost(targetPost: CommunityPostSummary) {
    const enteredPassword = window.prompt('게시글 비밀번호를 입력해 주세요')

    if (enteredPassword === null) return

    try {
      const response = await fetch('/api/community/posts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: targetPost.id, password: enteredPassword }),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message ?? '게시글을 삭제하지 못했습니다.')
      }

      setPosts((current) => current.filter((post) => post.id !== targetPost.id))

      if (activeCommentPost?.id === targetPost.id) {
        setActiveCommentPost(null)
        setComments([])
        setCommentDraft('')
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '게시글을 삭제하지 못했습니다.')
    }
  }

  async function handleCommentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!activeCommentPost) return

    const trimmedCommentNickname = commentNickname.trim() || '익명'
    const trimmedComment = commentDraft.trim()
    if (!trimmedComment) return

    try {
      const response = await fetch('/api/community/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: activeCommentPost.id,
          nickname: trimmedCommentNickname,
          content: trimmedComment,
        }),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message ?? '댓글을 저장하지 못했습니다.')
      }

      const nextComment = result.item as CommunityCommentItem
      setComments((current) => [nextComment, ...current])
      setCommentNickname('')
      setCommentDraft('')
      setPosts((current) =>
        current.map((post) =>
          post.id === activeCommentPost.id ? { ...post, commentCount: post.commentCount + 1 } : post,
        ),
      )
      setActiveCommentPost((current) =>
        current ? { ...current, commentCount: current.commentCount + 1 } : current,
      )
      commentsScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '댓글을 저장하지 못했습니다.')
    }
  }

  return (
    <div className="space-y-4 pt-5">
      <header className="space-y-2">
        <div className="flex h-6 items-center">
          <h1 className="text-[18px] font-bold tracking-[-0.02em] text-[#1e2124]">커뮤니티</h1>
        </div>
        <p className="text-sm text-[#86919e]">모두 편안하게 이용할 수 있도록 예의를 지켜주세요</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {BOARD_TABS.map((tab) => (
          <BoardTabButton key={tab} label={tab} count={posts.length} active={tab === activeBoard} />
        ))}
      </div>

      <section ref={listTopRef} className="space-y-3">
        {isLoadingPosts ? (
          <CommunityPostSkeletonList />
        ) : paginatedPosts.length > 0 ? (
          paginatedPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onDelete={handleDeletePost}
              onOpenComments={loadComments}
              cardRef={post.id === highlightedPostId ? newestPostRef : undefined}
            />
          ))
        ) : (
          <div className="rounded-lg bg-white px-5 py-8 text-center text-sm text-[#96a0aa]">아직 게시글이 없습니다.</div>
        )}

        <div className="flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3">
          <button
            type="button"
            onClick={() => {
              const nextPage = Math.max(1, safeCurrentPage - 1)
              setCurrentPage(nextPage)
              setPageWindowStart(Math.max(1, safePageWindowStart - 1))
              scrollToListTop()
            }}
            disabled={safeCurrentPage === 1}
            className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-semibold transition disabled:opacity-40"
            style={{ backgroundColor: '#f3f6f8', color: '#5f6b76' }}
          >
            이전
          </button>

          <div className="flex items-center gap-1.5">
            {visiblePages.map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => {
                  setCurrentPage(page)
                  if (page < safePageWindowStart) {
                    setPageWindowStart(page)
                    scrollToListTop()
                    return
                  }

                  if (page > pageGroupEnd) {
                    setPageWindowStart(Math.min(page, maxPageWindowStart))
                  }

                  scrollToListTop()
                }}
                className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-semibold transition"
                style={{
                  backgroundColor: page === safeCurrentPage ? '#457ae5' : '#f3f6f8',
                  color: page === safeCurrentPage ? '#ffffff' : '#5f6b76',
                }}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              const nextPage = Math.min(totalPages, safeCurrentPage + 1)
              setCurrentPage(nextPage)
              setPageWindowStart(Math.min(maxPageWindowStart, safePageWindowStart + 1))
              scrollToListTop()
            }}
            disabled={safeCurrentPage === totalPages}
            className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-semibold transition disabled:opacity-40"
            style={{ backgroundColor: '#f3f6f8', color: '#5f6b76' }}
          >
            다음
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsComposerOpen(true)}
          className="mx-auto mt-1 mb-2 flex items-center justify-center text-sm font-semibold text-white transition"
          style={{
            width: '100%',
            height: '54px',
            borderRadius: '16px',
            backgroundColor: '#457ae5',
          }}
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
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.42)' }}
            onClick={() => setIsComposerOpen(false)}
          />

          <div className="absolute inset-0 z-10 flex items-center justify-center px-8 py-6 sm:px-7">
            <section
              className="max-h-[calc(100vh-48px)] w-full max-w-[340px] overflow-y-auto bg-white px-5 py-6 shadow-[0_20px_44px_rgba(15,23,42,0.18)] sm:max-w-[380px] sm:px-6 sm:py-6"
              style={{ borderRadius: '24px' }}
            >
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="pt-3">
                  <div className="flex flex-wrap gap-2">
                    {COMMUNITY_CATEGORIES.map((option) => (
                      <CategoryChip
                        key={option}
                        label={option}
                        active={option === selectedCategory}
                        onClick={() => setSelectedCategory(option)}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-sm font-semibold text-[#1e2124]">닉네임</span>
                    <input
                      required
                      maxLength={10}
                      value={nickname}
                      onChange={(event) => setNickname(event.target.value.slice(0, 10))}
                      placeholder="닉네임"
                      className="mt-2 h-11 w-full rounded-lg border px-3 text-sm text-[#1e2124] outline-none transition placeholder:text-[#a0a9b3] focus:bg-white"
                      style={{ backgroundColor: '#f9fbfc', borderColor: '#dbe3ea' }}
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-[#1e2124]">패스워드</span>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="패스워드"
                      className="mt-2 h-11 w-full rounded-lg border px-3 text-sm text-[#1e2124] outline-none transition placeholder:text-[#a0a9b3] focus:bg-white"
                      style={{ backgroundColor: '#f9fbfc', borderColor: '#dbe3ea' }}
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-semibold text-[#1e2124]">제목</span>
                  <input
                    required
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="제목을 입력해 주세요"
                    className="mt-2 h-11 w-full rounded-lg border px-3 text-sm text-[#1e2124] outline-none transition placeholder:text-[#a0a9b3] focus:bg-white"
                    style={{ backgroundColor: '#f9fbfc', borderColor: '#dbe3ea' }}
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-[#1e2124]">내용</span>
                  <textarea
                    required
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    placeholder="자유롭게 내용을 작성해 주세요"
                    rows={6}
                    className="mt-2 w-full rounded-lg border px-3 py-3 text-sm leading-6 text-[#1e2124] outline-none transition placeholder:text-[#a0a9b3] focus:bg-white"
                    style={{ backgroundColor: '#f9fbfc', borderColor: '#dbe3ea' }}
                  />
                </label>

                <div className="flex items-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsComposerOpen(false)}
                    className="flex items-center justify-center text-sm font-semibold transition"
                    style={{
                      flex: '1 1 0%',
                      height: '54px',
                      borderRadius: '14px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #d5dbe3',
                      color: '#7b8794',
                    }}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="flex items-center justify-center text-sm font-semibold text-white transition"
                    style={{
                      flex: '2 1 0%',
                      height: '54px',
                      borderRadius: '16px',
                      backgroundColor: '#457ae5',
                    }}
                  >
                    글쓰기
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      ) : null}

      {activeCommentPost ? (
        <div className="fixed inset-0 z-[70]">
          <button
            type="button"
            aria-label="댓글 바텀시트 닫기"
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.42)' }}
            onClick={closeCommentSheet}
          />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10">
            <section
              className="pointer-events-auto mx-auto flex max-h-[50vh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_-12px_32px_rgba(15,23,42,0.16)] sm:max-h-[42vh] sm:max-w-[440px]"
              style={{
                paddingBottom: 'env(safe-area-inset-bottom)',
                transform: `translateY(${commentSheetOffsetY}px)`,
                transition: isDraggingCommentSheet ? 'none' : 'transform 180ms ease',
              }}
            >
              <div
                className="flex cursor-grab justify-center pt-3 active:cursor-grabbing"
                onPointerDown={handleCommentSheetDragStart}
              >
                <span className="h-1.5 w-12 rounded-full bg-[#dbe3ea]" />
              </div>

              <div
                className="cursor-grab border-b border-[#eef2f6] px-5 py-4 active:cursor-grabbing"
                onPointerDown={handleCommentSheetDragStart}
              >
                <p className="text-sm font-semibold text-[#1e2124]">
                  댓글 <span className="font-[600] text-[#457ae5]">{activeCommentPost.commentCount}</span>
                </p>
              </div>

              <div
                ref={commentsScrollRef}
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4"
              >
                {isLoadingComments ? (
                  <CommentSheetSkeleton />
                ) : sortedComments.length > 0 ? (
                  <div className="space-y-4">
                    {sortedComments.map((comment) => (
                      <article key={comment.id} className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#1e2124]">{comment.nickname}</span>
                          <span className="text-[12px] font-medium text-[#96a0aa]">{comment.createdAtLabel}</span>
                        </div>
                        <LinkifiedText text={comment.content} className="text-sm leading-6 text-[#58616a]" />
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="py-10 text-center text-sm text-[#96a0aa]">첫 댓글을 남겨보세요.</p>
                )}
              </div>

              <form onSubmit={handleCommentSubmit} className="border-t border-[#eef2f6] px-5 py-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 min-w-0 flex-1 items-center rounded-full border pr-2"
                    style={{ backgroundColor: '#f9fbfc', borderColor: '#dbe3ea' }}
                  >
                    <input
                      value={commentNickname}
                      onChange={(event) => setCommentNickname(event.target.value.slice(0, 10))}
                      placeholder="닉네임"
                      maxLength={10}
                      className="h-full w-[78px] bg-transparent px-4 text-sm text-[#1e2124] outline-none placeholder:text-[#a0a9b3]"
                    />
                    <span className="h-5 w-px shrink-0 bg-[#dbe3ea]" />
                    <input
                      value={commentDraft}
                      onChange={(event) => setCommentDraft(event.target.value)}
                      placeholder="댓글 올리기"
                      className="h-full min-w-0 flex-1 bg-transparent px-4 text-sm text-[#1e2124] outline-none placeholder:text-[#a0a9b3]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex h-11 shrink-0 items-center justify-center rounded-full px-3 text-sm font-semibold text-white transition sm:px-4"
                    style={{ backgroundColor: '#457ae5' }}
                  >
                    등록
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
