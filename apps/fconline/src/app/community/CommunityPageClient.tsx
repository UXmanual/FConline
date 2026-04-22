'use client'

import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { User } from '@supabase/supabase-js'
import {
  COMMUNITY_CATEGORIES,
  deriveCommunityNickname,
  type CommunityCategory,
  type CommunityCommentItem,
  type CommunityPostSummary,
} from '@/lib/community'
import { useDarkModeEnabled } from '@/lib/darkMode'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'

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

function CategoryChip({ active, label, onClick }: { active: boolean; label: CommunityCategory; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex h-9 items-center justify-center rounded-xl px-4 text-[12px] font-semibold transition" style={{ backgroundColor: active ? '#457ae5' : 'var(--app-surface-soft)', color: active ? '#fff' : 'var(--app-body-text)' }}>
      {label}
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

function PostCard({ post, onDelete, onOpenComments, highlight }: { post: CommunityPostSummary; onDelete: (post: CommunityPostSummary) => void; onOpenComments: (post: CommunityPostSummary) => void; highlight?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <article className="rounded-lg px-5 py-4" style={{ backgroundColor: 'var(--app-card-bg)', border: '1px solid var(--app-card-border)', boxShadow: highlight ? '0 0 0 2px rgba(69, 122, 229, 0.22)' : undefined }} onClick={() => setExpanded((current) => !current)}>
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-7 items-center rounded-lg px-3 text-[12px] font-semibold" style={{ backgroundColor: 'var(--app-surface-soft)', color: 'var(--app-body-text)' }}>{post.category}</span>
            <span className="text-[12px] font-semibold leading-none" style={{ color: 'var(--app-body-text)' }}>{post.nickname}</span>
            <span className="text-[12px] font-medium leading-none" style={{ color: 'var(--app-muted-text)' }}>·</span>
            <span className="text-[12px] font-medium leading-none" style={{ color: 'var(--app-muted-text)' }}>{post.createdAtLabel}</span>
          </div>
          {post.canDelete ? <button type="button" aria-label="게시글 삭제" onClick={(event) => { event.stopPropagation(); onDelete(post) }} className="shrink-0 text-[12px] font-medium leading-none" style={{ color: 'var(--app-muted-text)' }}>삭제</button> : null}
        </div>
        <h2 className={`mt-3 text-[15px] font-semibold tracking-[-0.02em] ${expanded ? 'whitespace-normal break-words' : 'overflow-hidden text-ellipsis whitespace-nowrap'}`} style={{ color: 'var(--app-title)' }}>{post.title}</h2>
        {expanded ? <LinkifiedText text={post.content} className="mt-3 text-sm leading-6" /> : null}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <button type="button" onClick={(event) => { event.stopPropagation(); onOpenComments(post) }} className="inline-flex items-center gap-1 text-[12px] font-medium">
          <span style={{ color: 'var(--app-title)' }}>댓글</span>
          <span className="font-[600] text-[#457ae5]">{post.commentCount}</span>
        </button>
        {post.ipPrefix ? <span className="shrink-0 text-[12px] font-medium" style={{ color: 'var(--app-muted-text)' }}>{post.ipPrefix}</span> : null}
      </div>
    </article>
  )
}

export default function CommunityPageClient({ initialData }: { initialData: CommunityPageData }) {
  const isDarkModeEnabled = useDarkModeEnabled()
  const commentsScrollRef = useRef<HTMLDivElement | null>(null)
  const listTopRef = useRef<HTMLElement | null>(null)
  const cacheRef = useRef<Map<number, CommunityPageData>>(new Map([[initialData.page, initialData]]))
  const dragPointerIdRef = useRef<number | null>(null)
  const dragStartYRef = useRef(0)
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [resolvedCommunityNickname, setResolvedCommunityNickname] = useState('')
  const [activeBoard] = useState<BoardTab>('자유게시판')
  const [selectedCategory, setSelectedCategory] = useState<CommunityCategory>('자유')
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
  const [commentSheetOffsetY, setCommentSheetOffsetY] = useState(0)
  const [isCommentSheetVisible, setIsCommentSheetVisible] = useState(false)
  const [isDraggingCommentSheet, setIsDraggingCommentSheet] = useState(false)
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null)
  const [isLoginRequiredOpen, setIsLoginRequiredOpen] = useState(false)
  const communityNickname = resolvedCommunityNickname || (authUser ? deriveCommunityNickname(authUser) : '')
  const totalPages = Math.max(1, Math.ceil(totalCount / POSTS_PER_PAGE))
  const maxPageWindowStart = Math.max(1, totalPages - MAX_VISIBLE_PAGES + 1)
  const safePageWindowStart = Math.min(pageWindowStart, maxPageWindowStart)
  const pageGroupEnd = Math.min(totalPages, safePageWindowStart + MAX_VISIBLE_PAGES - 1)
  const visiblePages = Array.from({ length: pageGroupEnd - safePageWindowStart + 1 }, (_, index) => safePageWindowStart + index)
  const sortedComments = [...comments].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())

  const resetCommentSheetState = useCallback(() => {
    setActiveCommentPost(null)
    setComments([])
    setCommentDraft('')
    setCommentSheetOffsetY(0)
    setIsDraggingCommentSheet(false)
    setIsCommentSheetVisible(false)
    dragPointerIdRef.current = null
  }, [])

  const closeCommentSheet = useCallback(() => {
    resetCommentSheetState()
  }, [resetCommentSheetState])

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    let isMounted = true

    const syncUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

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
      } catch {
        if (!isCancelled) {
          setResolvedCommunityNickname(fallbackNickname)
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
    const isOverlayOpen = isComposerOpen || activeCommentPost !== null
    const previousHtmlOverflow = document.documentElement.style.overflow
    const previousHtmlOverscrollBehavior = document.documentElement.style.overscrollBehavior
    const previousOverflow = document.body.style.overflow
    const previousOverscrollBehavior = document.body.style.overscrollBehavior

    if (isOverlayOpen) {
      document.documentElement.style.overflow = 'hidden'
      document.documentElement.style.overscrollBehavior = 'none'
      document.body.style.overflow = 'hidden'
      document.body.style.overscrollBehavior = 'none'
    }

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow
      document.documentElement.style.overscrollBehavior = previousHtmlOverscrollBehavior
      document.body.style.overflow = previousOverflow
      document.body.style.overscrollBehavior = previousOverscrollBehavior
    }
  }, [activeCommentPost, isComposerOpen])

  useEffect(() => {
    if (!highlightedPostId) return
    const frameId = window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(`[data-post-id="${highlightedPostId}"]`)
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    return () => window.cancelAnimationFrame(frameId)
  }, [highlightedPostId, posts])

  useEffect(() => {
    if (!activeCommentPost) return
    setCommentSheetOffsetY(0)
    setIsCommentSheetVisible(false)
    const frameId = window.requestAnimationFrame(() => setIsCommentSheetVisible(true))
    return () => window.cancelAnimationFrame(frameId)
  }, [activeCommentPost])

  useEffect(() => {
    if (!isDraggingCommentSheet) return
    function handlePointerMove(event: PointerEvent) {
      if (dragPointerIdRef.current !== event.pointerId) return
      setCommentSheetOffsetY(Math.max(0, event.clientY - dragStartYRef.current))
    }
    function handlePointerEnd(event: PointerEvent) {
      if (dragPointerIdRef.current !== event.pointerId) return
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
  }, [closeCommentSheet, commentSheetOffsetY, isDraggingCommentSheet])

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

  function handleCommentSheetDragStart(event: ReactPointerEvent<HTMLElement>) {
    dragPointerIdRef.current = event.pointerId
    dragStartYRef.current = event.clientY - commentSheetOffsetY
    setIsDraggingCommentSheet(true)
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
    try {
      setActiveCommentPost(post)
      setComments([])
      setCommentDraft('')
      setIsLoadingComments(true)
      const response = await fetch(`/api/community/comments?postId=${post.id}`, { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message ?? '댓글을 불러오지 못했습니다.')
      setComments(result.items ?? [])
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '댓글을 불러오지 못했습니다.')
      closeCommentSheet()
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
        body: JSON.stringify({ category: selectedCategory, title: trimmedTitle, content: trimmedContent }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message ?? '게시글을 저장하지 못했습니다.')
      setTitle('')
      setContent('')
      setSelectedCategory('자유')
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
      if (activeCommentPost?.id === targetPost.id) closeCommentSheet()
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
      commentsScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
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
      ) : authUser ? (
        <p className="text-[12px] font-medium" style={{ color: 'var(--app-muted-text)' }}>
          게시글 작성 시 닉네임은 {communityNickname}으로 표시됩니다.
        </p>
      ) : null}

      <section ref={listTopRef} className="space-y-3">
        {isLoadingPosts ? (
          <CommunityPostSkeletonList />
        ) : posts.length > 0 ? (
          posts.map((post) => (
            <div key={post.id} data-post-id={post.id}>
              <PostCard post={post} onDelete={handleDeletePost} onOpenComments={loadComments} highlight={post.id === highlightedPostId} />
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
            <section className="max-h-[calc(100vh-96px-env(safe-area-inset-bottom))] w-full overflow-y-auto rounded-[28px] px-5 pb-6 pt-6 shadow-[0_20px_48px_rgba(15,23,42,0.22)]" style={{ backgroundColor: 'var(--app-modal-bg, #ffffff)' }}>
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="pt-3">
                  <div className="mx-auto mb-4 h-1.5 w-12 rounded-full" style={{ backgroundColor: 'rgba(133, 148, 170, 0.32)' }} />
                  <p className="text-[16px] font-semibold tracking-[-0.02em]" style={{ color: 'var(--app-title)' }}>
                    글쓰기
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {COMMUNITY_CATEGORIES.map((option) => (
                      <CategoryChip key={option} label={option} active={option === selectedCategory} onClick={() => setSelectedCategory(option)} />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 px-0.5 text-sm">
                  <p className="font-semibold" style={{ color: 'var(--app-title)' }}>닉네임</p>
                  <p style={{ color: 'var(--app-body-text)' }}>{communityNickname}</p>
                </div>
                <label className="block">
                  <span className="hidden" style={{ color: 'var(--app-title)' }}>제목</span>
                  <input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="제목을 입력해 주세요" className="h-12 w-full rounded-[22px] border-0 px-4 text-sm outline-none transition" style={{ backgroundColor: 'var(--app-surface-soft)', color: 'var(--app-title)' }} />
                </label>
                <label className="block">
                  <span className="hidden" style={{ color: 'var(--app-title)' }}>내용</span>
                  <textarea required value={content} onChange={(event) => setContent(event.target.value)} placeholder="자유롭게 내용을 작성해 주세요" rows={4} className="min-h-[104px] w-full rounded-[22px] border-0 px-4 py-3 text-sm leading-6 outline-none transition" style={{ backgroundColor: 'var(--app-surface-soft)', color: 'var(--app-title)', resize: 'none' }} />
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

      {activeCommentPost ? (
        <div className="fixed inset-0 z-[70]">
          <div aria-hidden="true" className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.25)' }} />
          <button type="button" aria-label="댓글 바텀시트 닫기" className="absolute inset-0" onClick={closeCommentSheet} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10">
            <section className="pointer-events-auto mx-auto flex max-h-[50vh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-[28px] border-t sm:max-h-[42vh] sm:max-w-[440px]" style={{ paddingBottom: 'env(safe-area-inset-bottom)', transform: isDraggingCommentSheet ? `translateY(${commentSheetOffsetY}px)` : isCommentSheetVisible ? `translateY(${commentSheetOffsetY}px)` : 'translateY(calc(100dvh + env(safe-area-inset-bottom)))', backgroundColor: 'var(--app-modal-bg)', borderColor: 'var(--app-card-border, rgba(148, 163, 184, 0.22))', boxShadow: isDarkModeEnabled ? '0 -32px 76px rgba(0, 0, 0, 0.58)' : '0 -28px 68px rgba(15, 23, 42, 0.28)', willChange: 'transform', transition: isDraggingCommentSheet ? 'none' : 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1), background-color 180ms ease, border-color 180ms ease' }}>
              <div className="flex cursor-grab justify-center pt-3 active:cursor-grabbing" style={{ backgroundColor: 'var(--app-modal-bg, #ffffff)' }} onPointerDown={handleCommentSheetDragStart}>
                <span className="h-1.5 w-12 rounded-full" style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }} />
              </div>
              <div className="cursor-grab border-b px-5 py-4 active:cursor-grabbing" style={{ backgroundColor: 'var(--app-modal-bg, #ffffff)', borderColor: 'var(--app-divider, #eef2f6)' }} onPointerDown={handleCommentSheetDragStart}>
                <p className="text-sm font-semibold" style={{ color: 'var(--app-title)' }}>댓글 <span className="font-[600] text-[#457ae5]">{activeCommentPost.commentCount}</span></p>
              </div>
              <div ref={commentsScrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4" style={{ backgroundColor: 'var(--app-modal-bg, #ffffff)' }}>
                {isLoadingComments ? <CommentSheetSkeleton /> : sortedComments.length > 0 ? (
                  <div className="space-y-4">
                    {sortedComments.map((comment) => (
                      <article key={comment.id} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="text-sm font-semibold" style={{ color: 'var(--app-title)' }}>{comment.nickname}</span>
                            <span className="text-[12px] font-medium" style={{ color: 'var(--app-muted-text)' }}>{comment.createdAtLabel}</span>
                          </div>
                          {comment.canDelete ? (
                            <button
                              type="button"
                              onClick={() => void handleDeleteComment(comment)}
                              className="text-[12px] font-medium"
                              style={{ color: 'var(--app-muted-text)' }}
                            >
                              삭제
                            </button>
                          ) : null}
                        </div>
                        <LinkifiedText text={comment.content} className="text-sm leading-6" />
                      </article>
                    ))}
                  </div>
                ) : <p className="py-10 text-center text-sm" style={{ color: 'var(--app-muted-text)' }}>첫 댓글을 남겨보세요.</p>}
              </div>
              <form onSubmit={handleCommentSubmit} className="border-t px-5 py-4" style={{ backgroundColor: 'var(--app-modal-bg, #ffffff)', borderColor: 'var(--app-divider, #eef2f6)' }}>
                <div className="flex items-center gap-3">
                  {authUser ? (
                    <span className="shrink-0 text-sm font-medium" style={{ color: 'var(--app-title)' }}>
                      {communityNickname}
                    </span>
                  ) : null}
                  <div className="flex h-12 min-w-0 flex-1 items-center rounded-[22px] px-4" style={{ backgroundColor: 'var(--app-surface-soft)' }}>
                    <input disabled={!authUser || isSubmittingComment} value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} placeholder={authUser ? '댓글을 입력해주세요' : '로그인 후 이용해주세요'} className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:font-medium placeholder:text-[var(--app-muted-text)] disabled:cursor-not-allowed" style={{ color: 'var(--app-title)' }} />
                  </div>
                  <button disabled={!authUser || isSubmittingComment} type="submit" className="inline-flex h-11 shrink-0 items-center justify-center rounded-full px-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 sm:px-4" style={{ backgroundColor: '#457ae5' }}>{isSubmittingComment ? '등록 중...' : '등록'}</button>
                </div>
              </form>
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
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setIsLoginRequiredOpen(false)}
                  className="block w-full text-center text-sm font-medium"
                  style={{ color: 'var(--app-muted-text)' }}
                >
                  확인
                </button>
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </div>
  )
}
