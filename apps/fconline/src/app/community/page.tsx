import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { createSupabaseSsrClient } from '@/lib/supabase/ssr'
import { canDeleteCommunityPost, formatRelativeTime, type CommunityPostSummary } from '@/lib/community'
import CommunityPageClient from './CommunityPageClient'

export const dynamic = 'force-dynamic'

const INITIAL_PAGE = 1
const POSTS_PER_PAGE = 5

type PostRow = {
  id: string
  category: string
  nickname: string
  author_user_id?: string | null
  password_hash?: string | null
  ip_prefix?: string | null
  title: string
  content: string
  created_at: string
}

type CommentCountRow = {
  post_id: string
}

type InitialCommunityData = {
  items: CommunityPostSummary[]
  totalCount: number
  page: number
  pageSize: number
}

async function fetchInitialPosts(): Promise<InitialCommunityData> {
  try {
    const authSupabase = await createSupabaseSsrClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()
    const supabase = createSupabaseAdminClient()
    const primaryResponse = await supabase
      .from('community_posts')
      .select('id, category, nickname, author_user_id, password_hash, ip_prefix, title, content, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(0, POSTS_PER_PAGE - 1)

    const fallbackResponse = primaryResponse.error
      ? await supabase
        .from('community_posts')
        .select('id, category, nickname, password_hash, ip_prefix, title, content, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(0, POSTS_PER_PAGE - 1)
      : null

    const response = fallbackResponse ?? primaryResponse
    const { data: posts, error: postsError, count } = response

    if (postsError || !posts) {
      return { items: [], totalCount: 0, page: INITIAL_PAGE, pageSize: POSTS_PER_PAGE }
    }

    const postIds = (posts as unknown as PostRow[]).map((post) => post.id)
    const { data: commentRows } = postIds.length
      ? await supabase.from('community_comments').select('post_id').in('post_id', postIds)
      : { data: [] as CommentCountRow[] }

    const commentCountMap = new Map<string, number>()
    for (const row of (commentRows ?? []) as CommentCountRow[]) {
      commentCountMap.set(row.post_id, (commentCountMap.get(row.post_id) ?? 0) + 1)
    }

    const items = (posts as unknown as PostRow[]).map((post) => ({
      id: post.id,
      category: post.category as CommunityPostSummary['category'],
      nickname: post.nickname,
      ipPrefix: post.ip_prefix ?? null,
      title: post.title,
      content: post.content,
      createdAt: post.created_at,
      createdAtLabel: formatRelativeTime(post.created_at),
      commentCount: commentCountMap.get(post.id) ?? 0,
      canDelete: canDeleteCommunityPost(post, user?.id, user?.email),
    }))

    return {
      items,
      totalCount: count ?? 0,
      page: INITIAL_PAGE,
      pageSize: POSTS_PER_PAGE,
    }
  } catch {
    return { items: [], totalCount: 0, page: INITIAL_PAGE, pageSize: POSTS_PER_PAGE }
  }
}

export default async function CommunityPage() {
  const initialData = await fetchInitialPosts()
  return <CommunityPageClient initialData={initialData} />
}
