'use client'

import Image from 'next/image'
import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import UserLevelBadge from '@/components/user/UserLevelBadge'
import {
  deriveCommunityNickname,
  type CommunityCommentItem,
  type CommunityPostSummary,
} from '@/lib/community'
import { useDarkModeEnabled } from '@/lib/darkMode'
import { useLockedBodyScroll } from '@/lib/mobileOverlay'
import { getSupabaseBrowserClient, getSupabaseUserSafely } from '@/lib/supabase/browser'
import type { UserLevelSnapshot } from '@/lib/userLevel'

const BOARD_TABS = ['자유게시판'] as const
const POSTS_PER_PAGE = 5
const MAX_VISIBLE_PAGES = 5
const URL_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+)/g
const URL_PART_PATTERN = /^(https?:\/\/[^\s]+|www\.[^\s]+)$/

type BoardTab = (typeof BOARD_TABS)[number]
type CommunityPageData = { items: CommunityPostSummary[]; totalCount: number; page: number; pageSize: number }

function LinkifiedText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(URL_PATTERN)
  return (
    <p className={`whitespace-pre-wrap break-words ${className ?? ''}`} style={{ color: 'var(--app-body-text)' }}>
      {parts.map((part, index) => {
        if (!part) return null
        if (!URL_PART_PATTERN.test(part)) return <span key={`${part}-${index}`}>{part}</span>
        const href = part.startsWith('http') ? part : `https://${part}`
        return (
          <a key={`${href}-${index}`} href={href} target="_blank" rel="noopener noreferrer" className="break-all text-[#457ae5] underline underline-offset-2" onClick={(event) => event.stopPropagation()}>
            {part}
          </a>
        )
      })}
    </p>
  )
}

function BoardTabButton({ active, label, count, isDarkModeEnabled }: { active: boolean; label: BoardTab; count: number; isDarkModeEnabled: boolean }) {
  return (
    <button type="button" className="inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-semibold transition" style={{ backgroundColor: active ? 'var(--app-card-bg)' : 'var(--app-surface-strong)', border: active ? '1px solid var(--app-card-border)' : '1px solid transparent', color: active ? (isDarkModeEnabled ? '#f3f4f6' : '#111827') : 'var(--app-body-text)' }}>
      <span>{label}</span>
      <span className="ml-1 text-[#457ae5]">{count}</span>
    </button>
  )
}


function CommunityPostSkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="rounded-lg px-5 py-4" style={{ backgroundColor: 'var(--app-card-bg)' }}>
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

function CommentSheetSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
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

function PostCard({ post, onDelete, onOpenComments, onReport, highlight, isCommentOpen }: { post: CommunityPostSummary; onDelete: (post: CommunityPostSummary) => void; onOpenComments: (post: CommunityPostSummary) => void; onReport?: (post: CommunityPostSummary) => void; highlight?: boolean; isCommentOpen?: boolean }) {
  return (
    <article className={`px-5 pb-4 pt-5 ${isCommentOpen ? 'rounded-t-lg' : 'rounded-lg'}`} style={{ backgroundColor: 'var(--app-card-bg)', border: '1px solid var(--app-card-border)', borderBottom: isCommentOpen ? 'none' : undefined, boxShadow: highlight ? '0 0 0 2px rgba(69, 122, 229, 0.22)' : undefined }}>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full"
              style={{ backgroundColor: 'var(--app-surface-soft)' }}
            >
              {post.avatarUrl ? (
                <Image src={post.avatarUrl} alt="" width={40} height={40} className="h-full w-full object-cover" />
              ) : (
                <span className="text-lg leading-none">😀</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <UserLevelBadge level={post.level} />
                <span className="text-[12px] font-semibold leading-none" style={{ color: 'var(--app-body-text)' }}>{post.nickname}</span>
                <span className="text-[12px] font-medium leading-none" style={{ color: 'var(--app-muted-text)' }}>·</span>
                <span className="text-[12px] font-medium leading-none" style={{ color: 'var(--app-muted-text)' }}>{post.createdAtLabel}</span>
              </div>
              <h2 className="mt-3 whitespace-normal break-words text-[15px] font-semibold tracking-[-0.02em]" style={{ color: 'var(--app-title)' }}>{post.title}</h2>
              <LinkifiedText text={post.content} className="mt-3 text-sm leading-6" />
            </div>
          </div>
          {post.canDelete ? (
            <button type="button" aria-label="게시글 삭제" onClick={() => onDelete(post)} className="shrink-0 text-[12px] font-medium leading-none" style={{ color: 'var(--app-muted-text)' }}>삭제</button>
          ) : onReport ? (
            <button type="button" aria-label="게시글 신고" onClick={() => onReport(post)} className="shrink-0 text-[12px] font-medium leading-none" style={{ color: 'var(--app-muted-text)' }}>신고</button>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="relative">
          <button type="button" onClick={() => onOpenComments(post)} className="inline-flex items-center gap-1 text-[12px] font-medium">
            <span style={{ color: 'var(--app-title)' }}>댓글</span>
            <span className="font-[600] text-[#457ae5]">{post.commentCount}</span>
          </button>
          {isCommentOpen && post.commentCount > 0 && (
            <div className="absolute w-px" style={{ left: '10px', top: 'calc(100% + 4px)', height: '20px', backgroundColor: 'var(--app-thread-line)' }} />
          )}
        </div>
      </div>
    </article>
  )
}

export default function CommunityPageClient({ initialData }: { initialData: CommunityPageData }) {
  const router = useRouter()
  const isDarkModeEnabled = useDarkModeEnabled()
  const commentsScrollRef = useRef<HTMLDivElement | null>(null)
  const commentInputRef = useRef<HTMLInputElement | null>(null)
  const composerScrollRef = useRef<HTMLElement | null>(null)
  const listTopRef = useRef<HTMLElement | null>(null)
  const cacheRef = useRef<Map<number, CommunityPageData>>(new Map([[initialData.page, initialData]]))
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [resolvedCommunityNickname, setResolvedCommunityNickname] = useState('')
  const [currentUserLevel, setCurrentUserLevel] = useState<number | null>(null)
  const [activeBoard] = useState<BoardTab>('자유게시판')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [posts, setPosts] = useState(initialData.items)
  const [totalCount, setTotalCount] = useState(initialData.totalCount)
  const [currentPage, setCurrentPage] = useState(initialData.page)
  const [pageWindowStart, setPageWindowStart] = useState(1)
  const [isLoadingPosts, setIsLoadingPosts] = useState(false)
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [isSubmittingPost, setIsSubmittingPost] = useState(false)
  const [activeCommentPost, setActiveCommentPost] = useState<CommunityPostSummary | null>(null)
  const [comments, setComments] = useState<CommunityCommentItem[]>([])
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [commentDraft, setCommentDraft] = useState('')
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null)
  const [isLoginRequiredOpen, setIsLoginRequiredOpen] = useState(false)
  const [reportTarget, setReportTarget] = useState<{ type: string; id: string } | null>(null)
  const [isReporting, setIsReporting] = useState(false)
  const [isReportSuccessOpen, setIsReportSuccessOpen] = useState(false)
  const communityNickname = resolvedCommunityNickname || (authUser ? deriveCommunityNickname(authUser) : '')
  const totalPages = Math.max(1, Math.ceil(totalCount / POSTS_PER_PAGE))
  const maxPageWindowStart = Math.max(1, totalPages - MAX_VISIBLE_PAGES + 1)
  const safePageWindowStart = Math.min(pageWindowStart, maxPageWindowStart)
  const pageGroupEnd = Math.min(totalPages, safePageWindowStart + MAX_VISIBLE_PAGES - 1)
  const visiblePages = Array.from({ length: pageGroupEnd - safePageWindowStart + 1 }, (_, index) => safePageWindowStart + index)
  const sortedComments = [...comments].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())

  useLockedBodyScroll(isComposerOpen, isComposerOpen ? composerScrollRef : null)

  const closeCommentSection = useCallback(() => {
    setActiveCommentPost(null)
    setComments([])
    setCommentDraft('')
  }, [])

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    let isMounted = true

    const syncUser = async () => {
      const { user } = await getSupabaseUserSafely(supabase)

      if (!isMounted) {
        return
      }

      setAuthUser(user)
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
      setIsAuthLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!authUser) {
      setResolvedCommunityNickname('')
      setCurrentUserLevel(null)
      return
    }

    let isCancelled = false
    const fallbackNickname = deriveCommunityNickname(authUser)

    async function syncNickname() {
      try {
        const response = await fetch('/api/mypage/nickname', { cache: 'no-store' })
        const result = await response.json().catch(() => null)

        if (!response.ok || isCancelled) {
          return
        }

        setResolvedCommunityNickname(String(result?.nickname ?? fallbackNickname))
        setCurrentUserLevel((result?.levelProfile as UserLevelSnapshot | undefined)?.level ?? 1)
      } catch {
        if (!isCancelled) {
          setResolvedCommunityNickname(fallbackNickname)
          setCurrentUserLevel(1)
        }
      }
    }

    void syncNickname()

    return () => {
      isCancelled = true
    }
  }, [authUser])

  const fetchPostsPage = useCallback(async (page: number, useSkeleton = true) => {
    const cached = cacheRef.current.get(page)
    if (cached) {
      setPosts(cached.items)
      setTotalCount(cached.totalCount)
      return
    }
    try {
      setIsLoadingPosts(useSkeleton)
      const response = await fetch(`/api/community/posts?page=${page}&pageSize=${POSTS_PER_PAGE}`, { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message ?? '게시글을 불러오지 못했습니다.')
      const data: CommunityPageData = {
        items: result.items ?? [],
        totalCount: result.totalCount ?? 0,
        page: result.page ?? page,
        pageSize: result.pageSize ?? POSTS_PER_PAGE,
      }
      cacheRef.current.set(page, data)
      setPosts(data.items)
      setTotalCount(data.totalCount)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '게시글을 불러오지 못했습니다.')
    } finally {
      setIsLoadingPosts(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthLoading || !authUser) {
      return
    }

    cacheRef.current.delete(currentPage)
    void fetchPostsPage(currentPage, false)
  }, [authUser, currentPage, fetchPostsPage, isAuthLoading])

  useEffect(() => {
    if (!highlightedPostId) return
    const frameId = window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(`[data-post-id="${highlightedPostId}"]`)
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    return () => window.cancelAnimationFrame(frameId)
  }, [highlightedPostId, posts])


  useEffect(() => {
    if (isLoadingPosts) return

    const nextPage = currentPage + 1
    if (nextPage > totalPages || cacheRef.current.has(nextPage)) {
      return
    }

    let isCancelled = false
    const schedulePrefetch =
      typeof window !== 'undefined' && 'requestIdleCallback' in window
        ? window.requestIdleCallback.bind(window)
        : (callback: () => void) => window.setTimeout(callback, 500)
    const cancelScheduledPrefetch =
      typeof window !== 'undefined' && 'cancelIdleCallback' in window
        ? window.cancelIdleCallback.bind(window)
        : (handle: number) => window.clearTimeout(handle)

    async function prefetchNextPage() {
      try {
        const response = await fetch(`/api/community/posts?page=${nextPage}&pageSize=${POSTS_PER_PAGE}`, {
          cache: 'no-store',
        })
        const result = await response.json()

        if (!response.ok || isCancelled) {
          return
        }

        cacheRef.current.set(nextPage, {
          items: result.items ?? [],
          totalCount: result.totalCount ?? totalCount,
          page: result.page ?? nextPage,
          pageSize: result.pageSize ?? POSTS_PER_PAGE,
        })
      } catch {
        // Prefetch failures should not affect the current page experience.
      }
    }

    const timeoutId = schedulePrefetch(() => {
      void prefetchNextPage()
    })

    return () => {
      isCancelled = true
      cancelScheduledPrefetch(timeoutId)
    }
  }, [currentPage, isLoadingPosts, totalCount, totalPages])

  function scrollToListTop() {
    listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function openComposer() {
    if (isAuthLoading) {
      return
    }

    if (!authUser) {
      setIsLoginRequiredOpen(true)
      return
    }

    setIsComposerOpen(true)
  }

  async function goToPage(page: number) {
    if (page < 1 || page > totalPages || page === currentPage) return
    setCurrentPage(page)
    await fetchPostsPage(page)
    scrollToListTop()
  }

  async function loadComments(post: CommunityPostSummary) {
    if (activeCommentPost?.id === post.id) {
      closeCommentSection()
      return
    }
    setActiveCommentPost(post)
    setComments([])
    setCommentDraft('')
    setIsLoadingComments(true)
    try {
      const response = await fetch(`/api/community/comments?postId=${post.id}`, { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message ?? '댓글을 불러오지 못했습니다.')
      setComments(result.items ?? [])
      setTimeout(() => commentsScrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '댓글을 불러오지 못했습니다.')
      closeCommentSection()
    } finally {
      setIsLoadingComments(false)
    }
  }

  async function refreshCurrentPage(targetPage = currentPage) {
    cacheRef.current.delete(targetPage)
    await fetchPostsPage(targetPage, false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmittingPost) return
    if (!authUser) {
      setIsLoginRequiredOpen(true)
      return
    }
    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()
    if (!communityNickname || !trimmedTitle || !trimmedContent) return
    try {
      setIsSubmittingPost(true)
      const response = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: '자유', title: trimmedTitle, content: trimmedContent }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message ?? '게시글을 저장하지 못했습니다.')
      setCurrentUserLevel(Number.isFinite(result.item?.level) ? Number(result.item.level) : currentUserLevel)
      setTitle('')
      setContent('')

      setIsComposerOpen(false)
      setHighlightedPostId(result.item?.id ?? null)
      cacheRef.current.clear()
      setCurrentPage(1)
      setPageWindowStart(1)
      await fetchPostsPage(1, false)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '게시글을 저장하지 못했습니다.')
    } finally {
      setIsSubmittingPost(false)
    }
  }

  async function handleReport(reason: string) {
    if (!reportTarget || isReporting) return
    setIsReporting(true)
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType: reportTarget.type, targetId: reportTarget.id, reason }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok && response.status !== 409) throw new Error(result?.message ?? '신고를 접수하지 못했습니다.')
      setIsReportSuccessOpen(true)
    } finally {
      setIsReporting(false)
      setReportTarget(null)
    }
  }

  async function handleDeletePost(targetPost: CommunityPostSummary) {
    if (!window.confirm('이 게시글을 삭제할까요?')) return
    try {
      const response = await fetch('/api/community/posts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: targetPost.id }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message ?? '게시글을 삭제하지 못했습니다.')
      if (activeCommentPost?.id === targetPost.id) closeCommentSection()
      cacheRef.current.clear()
      const nextTotalCount = Math.max(0, totalCount - 1)
      const nextTotalPages = Math.max(1, Math.ceil(nextTotalCount / POSTS_PER_PAGE))
      const targetPage = Math.min(currentPage, nextTotalPages)
      setCurrentPage(targetPage)
      setPageWindowStart((current) => Math.min(current, Math.max(1, nextTotalPages - MAX_VISIBLE_PAGES + 1)))
      await refreshCurrentPage(targetPage)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '게시글을 삭제하지 못했습니다.')
    }
  }

  async function handleCommentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeCommentPost) return
    if (isSubmittingComment) return
    const trimmedCommentNickname = communityNickname || '익명'
    if (!authUser) {
      setIsLoginRequiredOpen(true)
      return
    }
    const trimmedComment = commentDraft.trim()
    if (!trimmedComment) return
    try {
      setIsSubmittingComment(true)
      const response = await fetch('/api/community/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: activeCommentPost.id, nickname: trimmedCommentNickname, content: trimmedComment }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message ?? '댓글을 저장하지 못했습니다.')
      const nextComment = result.item as CommunityCommentItem
      setCurrentUserLevel(Number.isFinite(nextComment?.level) ? Number(nextComment.level) : currentUserLevel)
      setComments((current) => [nextComment, ...current])
      setCommentDraft('')
      setPosts((current) => current.map((post) => post.id === activeCommentPost.id ? { ...post, commentCount: post.commentCount + 1 } : post))
      setActiveCommentPost((current) => (current ? { ...current, commentCount: current.commentCount + 1 } : current))
      const cached = cacheRef.current.get(currentPage)
      if (cached) {
        cacheRef.current.set(currentPage, {
          ...cached,
          items: cached.items.map((post) => post.id === activeCommentPost.id ? { ...post, commentCount: post.commentCount + 1 } : post),
        })
      }
      commentsScrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '댓글을 저장하지 못했습니다.')
    } finally {
      setIsSubmittingComment(false)
    }
  }

  async function handleDeleteComment(targetComment: CommunityCommentItem) {
    if (!window.confirm('이 댓글을 삭제할까요?')) return

    try {
      const response = await fetch('/api/community/comments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId: targetComment.id }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message ?? '댓글을 삭제하지 못했습니다.')

      setComments((current) => current.filter((comment) => comment.id !== targetComment.id))
      setPosts((current) =>
        current.map((post) =>
          activeCommentPost && post.id === activeCommentPost.id
            ? { ...post, commentCount: Math.max(0, post.commentCount - 1) }
            : post,
        ),
      )
      setActiveCommentPost((current) =>
        current ? { ...current, commentCount: Math.max(0, current.commentCount - 1) } : current,
      )
      const cached = cacheRef.current.get(currentPage)
      if (cached && activeCommentPost) {
        cacheRef.current.set(currentPage, {
          ...cached,
          items: cached.items.map((post) =>
            post.id === activeCommentPost.id ? { ...post, commentCount: Math.max(0, post.commentCount - 1) } : post,
          ),
        })
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '댓글을 삭제하지 못했습니다.')
    }
  }

  return (
    <div className="space-y-4 pt-5">
      <header className="space-y-2">
        <div className="flex h-6 items-center">
          <h1 className="text-[18px] font-bold tracking-[-0.02em]" style={{ color: 'var(--app-title)' }}>커뮤니티</h1>
        </div>
        <p className="text-sm" style={{ color: 'var(--app-nav-label)' }}>
          여기는 누구나 쓸 수 있는 공간이에요
          <br />
          서로를 배려해서 글을 작성해주세요
        </p>
      </header>

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {BOARD_TABS.map((tab) => (
            <BoardTabButton key={tab} label={tab} count={totalCount} active={tab === activeBoard} isDarkModeEnabled={isDarkModeEnabled} />
          ))}
        </div>
      {isLoadingPosts ? <div aria-hidden="true" className="home-image-shimmer h-9 w-[78px] shrink-0 rounded-lg" /> : <button type="button" onClick={openComposer} disabled={isAuthLoading} className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg px-4 text-sm font-semibold text-white transition disabled:opacity-60" style={{ backgroundColor: '#457ae5' }}>글쓰기</button>}
      </div>

      {!authUser && !isAuthLoading ? (
        <p className="text-[12px] font-medium" style={{ color: 'var(--app-muted-text)' }}>
          커뮤니티 글쓰기는 Google 로그인 후 이용할 수 있습니다.
        </p>
      ) : null}

      <section ref={listTopRef} className="space-y-3">
        {isLoadingPosts ? (
          <CommunityPostSkeletonList />
        ) : posts.length > 0 ? (
          posts.map((post) => (
            <div key={post.id} data-post-id={post.id}>
              <PostCard post={post} onDelete={handleDeletePost} onOpenComments={loadComments} onReport={authUser ? (p) => setReportTarget({ type: 'community_post', id: p.id }) : undefined} highlight={post.id === highlightedPostId} isCommentOpen={activeCommentPost?.id === post.id} />
              {activeCommentPost?.id === post.id && (
                <div ref={commentsScrollRef} className="rounded-b-lg border-x border-b px-5 pt-0 pb-3" style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                  {isLoadingComments ? (
                    <div className="pl-8">
                      <CommentSheetSkeleton rows={Math.min(Math.max(activeCommentPost.commentCount, 1), 5)} />
                    </div>
                  ) : sortedComments.length > 0 ? (
                    <div className="relative space-y-4 pl-7">
                      <div
                        aria-hidden="true"
                        className="absolute top-0 bottom-0 w-px"
                        style={{ left: '10px', backgroundColor: 'var(--app-thread-line)' }}
                      />
                      {sortedComments.map((comment, index) => {
                        const isLastComment = index === sortedComments.length - 1

                        return (
                          <article key={comment.id} className="relative min-w-0 space-y-1">
                            <div className="relative flex items-start justify-between gap-3">
                              {isLastComment ? (
                                <>
                                  <div
                                    aria-hidden="true"
                                    className="absolute left-[-19px] top-[calc(50%-9px)] bottom-[-12px] w-[3px]"
                                    style={{ backgroundColor: 'var(--app-card-bg)' }}
                                  />
                                  <div
                                    aria-hidden="true"
                                    className="absolute left-[-18px] top-[calc(50%-10px)] h-[10px] w-[10px] rounded-bl-[10px] border-b border-l"
                                    style={{ borderColor: 'var(--app-thread-line)' }}
                                  />
                                </>
                              ) : null}
                              <div className="flex min-w-0 items-start gap-3">
                                <div
                                  className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full"
                                  style={{ backgroundColor: 'var(--app-surface-soft)' }}
                                >
                                  {comment.avatarUrl ? (
                                    <Image src={comment.avatarUrl} alt="" width={40} height={40} className="h-full w-full object-cover" />
                                  ) : (
                                    <span className="text-lg leading-none">😀</span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                                    <UserLevelBadge level={comment.level} />
                                    <span className="text-[12px] font-semibold leading-none" style={{ color: 'var(--app-title)' }}>{comment.nickname}</span>
                                    <span className="text-[12px] font-medium leading-none" style={{ color: 'var(--app-muted-text)' }}>·</span>
                                    <span className="text-[12px] font-medium leading-none" style={{ color: 'var(--app-muted-text)' }}>{comment.createdAtLabel}</span>
                                  </div>
                                  <LinkifiedText text={comment.content} className="mt-2 text-sm leading-6" />
                                </div>
                              </div>
                              {comment.canDelete ? (
                                <button type="button" onClick={() => void handleDeleteComment(comment)} className="shrink-0 text-[12px] font-medium" style={{ color: 'var(--app-muted-text)' }}>삭제</button>
                              ) : authUser ? (
                                <button type="button" onClick={() => setReportTarget({ type: 'community_comment', id: comment.id })} className="shrink-0 text-[12px] font-medium" style={{ color: 'var(--app-muted-text)' }}>신고</button>
                              ) : null}
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  ) : null}
                  <form onSubmit={handleCommentSubmit} className={`${sortedComments.length > 0 || isLoadingComments ? 'mt-4' : ''} flex items-center gap-2`}>
                    <div className="flex h-11 min-w-0 flex-1 items-center rounded-[22px] px-4" style={{ backgroundColor: 'var(--app-comment-input-bg)' }}>
                      <input
                        ref={commentInputRef}
                        disabled={!authUser || isSubmittingComment}
                        value={commentDraft}
                        onChange={(event) => setCommentDraft(event.target.value)}
                        onFocus={() => setTimeout(() => commentInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 300)}
                        placeholder={authUser ? '댓글을 입력해주세요' : '로그인 후 이용해주세요'}
                        className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:font-medium placeholder:text-[var(--app-muted-text)] disabled:cursor-not-allowed"
                        style={{ color: 'var(--app-title)' }}
                      />
                    </div>
                    <button disabled={!authUser || isSubmittingComment} type="submit" className="inline-flex h-11 shrink-0 items-center justify-center rounded-full px-4 text-sm font-semibold text-white transition disabled:opacity-60" style={{ backgroundColor: '#457ae5' }}>
                      {isSubmittingComment ? '등록 중...' : '등록'}
                    </button>
                  </form>
                  <button type="button" onClick={() => closeCommentSection()} className="mt-3 flex w-full items-center justify-center gap-1 py-1.5 text-[12px] font-medium" style={{ color: 'var(--app-muted-text)' }}>
                    <span>댓글 접기</span>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M9 7.5L6 4.5L3 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="rounded-lg px-5 py-8 text-center text-sm" style={{ backgroundColor: 'var(--app-card-bg)', border: '1px solid var(--app-card-border)', color: 'var(--app-muted-text)' }}>
            아직 게시글이 없습니다.
          </div>
        )}

        <div className="flex items-center justify-center gap-2 rounded-lg px-4 py-3" style={{ backgroundColor: 'var(--app-card-bg)', border: '1px solid var(--app-card-border)' }}>
          <button type="button" onClick={() => { const nextPage = Math.max(1, currentPage - 1); setPageWindowStart(Math.max(1, safePageWindowStart - 1)); void goToPage(nextPage) }} disabled={currentPage === 1} className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-semibold transition disabled:opacity-40" style={{ backgroundColor: 'var(--app-surface-soft)', color: 'var(--app-body-text)' }}>이전</button>
          <div className="flex items-center gap-1.5">
            {visiblePages.map((page) => (
              <button key={page} type="button" onClick={() => { if (page < safePageWindowStart) setPageWindowStart(page); else if (page > pageGroupEnd) setPageWindowStart(Math.min(page, maxPageWindowStart)); void goToPage(page) }} className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-semibold transition" style={{ backgroundColor: page === currentPage ? '#457ae5' : 'var(--app-surface-soft)', color: page === currentPage ? '#fff' : 'var(--app-body-text)' }}>{page}</button>
            ))}
          </div>
          <button type="button" onClick={() => { const nextPage = Math.min(totalPages, currentPage + 1); setPageWindowStart(Math.min(maxPageWindowStart, safePageWindowStart + 1)); void goToPage(nextPage) }} disabled={currentPage === totalPages} className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-semibold transition disabled:opacity-40" style={{ backgroundColor: 'var(--app-surface-soft)', color: 'var(--app-body-text)' }}>다음</button>
        </div>

        <button type="button" onClick={openComposer} disabled={isAuthLoading} className="mx-auto mt-1 mb-2 flex items-center justify-center text-sm font-semibold text-white transition disabled:opacity-60" style={{ width: '100%', height: '54px', borderRadius: '16px', backgroundColor: '#457ae5' }}>글쓰기</button>
      </section>

      {isComposerOpen ? (
        <div className="fixed inset-0 z-[60]">
          <button type="button" aria-label="글쓰기 닫기" className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.58)' }} onClick={() => setIsComposerOpen(false)} />
          <div className="absolute left-1/2 z-10 w-[calc(100%-2rem)] max-w-[440px] -translate-x-1/2" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}>
            <section ref={composerScrollRef} className="max-h-[calc(100vh-96px-env(safe-area-inset-bottom))] w-full overflow-y-auto rounded-[28px] px-5 pb-6 pt-6 shadow-[0_20px_48px_rgba(15,23,42,0.22)]" style={{ backgroundColor: 'var(--app-modal-bg, #ffffff)' }}>
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <p className="text-[16px] font-semibold tracking-[-0.02em]" style={{ color: 'var(--app-title)' }}>
                    <span style={{ color: '#457ae5' }}>자유게시판</span>{' 글쓰기'}
                  </p>
                </div>
                <div className="flex items-center gap-2 px-0.5 text-sm">
                  <UserLevelBadge level={currentUserLevel} />
                  <p style={{ color: 'var(--app-body-text)' }}>{communityNickname}</p>
                </div>
                <label className="block">
                  <span className="hidden" style={{ color: 'var(--app-title)' }}>제목</span>
                  <input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="제목을 입력해 주세요" className="h-12 w-full rounded-[22px] border-0 px-4 text-sm outline-none transition" style={{ backgroundColor: 'var(--app-surface-soft)', color: 'var(--app-title)' }} />
                </label>
                <label className="block">
                  <span className="hidden" style={{ color: 'var(--app-title)' }}>내용</span>
                  <div className="relative">
                    <textarea required value={content} onChange={(event) => setContent(event.target.value.slice(0, 300))} maxLength={300} placeholder="자유롭게 내용을 작성해 주세요" rows={4} className="min-h-[104px] w-full rounded-[22px] border-0 px-4 pb-9 pt-4 text-sm leading-6 outline-none transition" style={{ backgroundColor: 'var(--app-surface-soft)', color: 'var(--app-title)', resize: 'none' }} />
                    <span className="pointer-events-none absolute bottom-4 right-4 text-[12px]" style={{ color: 'var(--app-muted-text)' }}>{content.length}/300</span>
                  </div>
                </label>
                <div className="mt-7 flex flex-col gap-3">
                  <button type="submit" disabled={isSubmittingPost} className="order-1 flex h-12 w-full items-center justify-center rounded-2xl px-4 text-sm font-semibold text-white transition disabled:opacity-70" style={{ backgroundColor: '#457ae5' }}>{isSubmittingPost ? '등록 중...' : '글쓰기'}</button>
                  <button type="button" onClick={() => setIsComposerOpen(false)} disabled={isSubmittingPost} className="order-2 block w-full text-center text-sm font-medium transition disabled:opacity-60" style={{ color: 'var(--app-muted-text)' }}>취소</button>
                </div>
              </form>
            </section>
          </div>
        </div>
      ) : null}


      {reportTarget ? (
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            aria-label="닫기"
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.58)' }}
            onClick={() => setReportTarget(null)}
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
              <p className="mb-4 text-[18px] font-semibold tracking-[-0.02em]" style={{ color: 'var(--app-title)' }}>
                신고 사유를 선택해 주세요
              </p>
              <div className="space-y-2">
                {['욕설 / 비방', '광고 / 도배', '성인 / 부적절', '기타'].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    disabled={isReporting}
                    onClick={() => void handleReport(reason)}
                    className="flex h-12 w-full items-center justify-center rounded-2xl px-4 text-sm font-semibold disabled:opacity-60"
                    style={{ backgroundColor: 'var(--app-surface-soft)', color: 'var(--app-title)' }}
                  >
                    {reason}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setReportTarget(null)}
                  className="block w-full pt-1 text-center text-sm font-medium"
                  style={{ color: 'var(--app-muted-text)' }}
                >
                  취소
                </button>
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {isReportSuccessOpen ? (
        <div className="fixed inset-0 z-[80]">
          <button type="button" aria-label="닫기" className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.58)' }} onClick={() => setIsReportSuccessOpen(false)} />
          <div className="absolute left-1/2 z-10 w-[calc(100%-2rem)] max-w-[440px] -translate-x-1/2" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}>
            <section className="rounded-[28px] px-5 pb-6 pt-6 shadow-[0_20px_48px_rgba(15,23,42,0.22)]" style={{ backgroundColor: 'var(--app-modal-bg, #ffffff)' }}>
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full" style={{ backgroundColor: 'rgba(133, 148, 170, 0.32)' }} />
              <div className="space-y-2">
                <p className="text-[18px] font-semibold tracking-[-0.02em]" style={{ color: 'var(--app-title)' }}>신고가 완료되었습니다</p>
                <p className="text-sm leading-[1.55]" style={{ color: 'var(--app-body-text)' }}>운영자가 검토 후 조치하겠습니다.</p>
              </div>
              <div className="mt-6">
                <button type="button" onClick={() => setIsReportSuccessOpen(false)} className="flex h-12 w-full items-center justify-center rounded-2xl px-4 text-sm font-semibold text-white" style={{ backgroundColor: '#457ae5' }}>확인</button>
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {isLoginRequiredOpen ? (
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            aria-label="닫기"
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.58)' }}
            onClick={() => setIsLoginRequiredOpen(false)}
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
                  커뮤니티 글쓰기와 댓글은 Google 로그인 후 이용할 수 있어요
                </p>
              </div>
              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={() => { setIsLoginRequiredOpen(false); router.push('/mypage') }}
                  className="flex h-12 w-full items-center justify-center rounded-2xl px-4 text-sm font-semibold text-white"
                  style={{ backgroundColor: '#457ae5' }}
                >
                  로그인하러 가기
                </button>
                <button
                  type="button"
                  onClick={() => setIsLoginRequiredOpen(false)}
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
    </div>
  )
}
