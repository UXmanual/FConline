import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { formatRelativeTime, type CommunityPostSummary } from '@/lib/community'
import CommunityPageClient from './CommunityPageClient'

export const dynamic = 'force-dynamic'

type PostRow = {
  id: string
  category: string
  nickname: string
  ip_prefix?: string | null
  title: string
  content: string
  created_at: string
}

type CommentCountRow = {
  post_id: string
}

async function fetchInitialPosts(): Promise<CommunityPostSummary[]> {
  try {
    const supabase = createSupabaseAdminClient()
    const [{ data: posts, error: postsError }, { data: commentRows, error: commentsError }] = await Promise.all([
      supabase.from('community_posts').select('id, category, nickname, ip_prefix, title, content, created_at').order('created_at', { ascending: false }),
      supabase.from('community_comments').select('post_id'),
    ])

    if (postsError || commentsError || !posts) return []

    const commentCountMap = new Map<string, number>()
    for (const row of (commentRows ?? []) as CommentCountRow[]) {
      commentCountMap.set(row.post_id, (commentCountMap.get(row.post_id) ?? 0) + 1)
    }

    return (posts as unknown as PostRow[]).map((post) => ({
      id: post.id,
      category: post.category as CommunityPostSummary['category'],
      nickname: post.nickname,
      ipPrefix: post.ip_prefix ?? null,
      title: post.title,
      content: post.content,
      createdAt: post.created_at,
      createdAtLabel: formatRelativeTime(post.created_at),
      commentCount: commentCountMap.get(post.id) ?? 0,
    }))
  } catch {
    return []
  }
}

export default async function CommunityPage() {
  const initialPosts = await fetchInitialPosts()
  return <CommunityPageClient initialPosts={initialPosts} />
}
