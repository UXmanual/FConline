import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { formatRelativeTime, type CommunityPostSummary } from '@/lib/community'
import { getUserLevelMap } from '@/lib/userLevel.server'
import CommunityPageClient from './CommunityPageClient'

export const dynamic = 'force-dynamic'

const INITIAL_PAGE = 1
const POSTS_PER_PAGE = 5

type PostRow = {
  id: string
  category: string
  nickname: string
  comment_count: number | null
  author_user_id?: string | null
  password_hash?: string | null
  ip_prefix?: string | null
  title: string
  content: string
  created_at: string
}

type InitialCommunityData = {
  items: CommunityPostSummary[]
  totalCount: number
  page: number
  pageSize: number
}

async function fetchInitialPosts(): Promise<InitialCommunityData> {
  try {
    const supabase = createSupabaseAdminClient()
    const primaryResponsePromise = supabase
      .from('community_posts')
      .select('id, category, nickname, comment_count, author_user_id, password_hash, ip_prefix, title, content, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(0, POSTS_PER_PAGE - 1)

    const primaryResponse = await primaryResponsePromise

    const fallbackResponse = primaryResponse.error
      ? await supabase
          .from('community_posts')
          .select('id, category, nickname, comment_count, password_hash, ip_prefix, title, content, created_at', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(0, POSTS_PER_PAGE - 1)
      : null

    const response = fallbackResponse ?? primaryResponse
    const { data: posts, error: postsError, count } = response

    if (postsError || !posts) {
      return { items: [], totalCount: 0, page: INITIAL_PAGE, pageSize: POSTS_PER_PAGE }
    }

    const typedPosts = posts as unknown as PostRow[]
    const levelMap = await getUserLevelMap(typedPosts.map((post) => post.author_user_id))
    const items = typedPosts.map((post) => ({
      id: post.id,
      category: post.category as CommunityPostSummary['category'],
      nickname: post.nickname,
      level:
        typeof post.author_user_id === 'string' && post.author_user_id.trim().length > 0
          ? (levelMap.get(post.author_user_id) ?? 1)
          : null,
      ipPrefix: post.ip_prefix ?? null,
      title: post.title,
      content: post.content,
      createdAt: post.created_at,
      createdAtLabel: formatRelativeTime(post.created_at),
      commentCount: Math.max(0, Number(post.comment_count ?? 0) || 0),
      canDelete: false,
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
