import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { getKoreaTimestampString } from '@/lib/community'
import {
  buildUserLevelSnapshot,
  COMMUNITY_COMMENT_XP,
  COMMUNITY_POST_XP,
  DAILY_COMMENT_XP_LIMIT,
  FIRST_COMMENT_BONUS_XP,
  FIRST_POST_BONUS_XP,
  LOGIN_REWARD_XP,
  MIN_COMMENT_XP_LENGTH,
  PLAYER_REVIEW_COMMENT_XP,
  PLAYER_REVIEW_POST_XP,
  type UserLevelSnapshot,
} from '@/lib/userLevel'

type UserLevelProfileRow = {
  user_id: string
  xp_total: number | null
  level: number | null
  last_login_reward_date: string | null
}

type RecordUserXpRpcRow = {
  awarded: boolean
  xp_total: number | null
  level: number | null
  last_login_reward_date: string | null
}

type UserLevelProfile = UserLevelSnapshot & {
  lastLoginRewardDate: string | null
}

function getKoreaDateString(date = new Date()) {
  return getKoreaTimestampString(date).slice(0, 10)
}

function getKoreaDayRange(dateString: string) {
  return {
    start: `${dateString}T00:00:00+09:00`,
    end: `${dateString}T23:59:59+09:00`,
  }
}

function isMissingLevelInfraError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()
  return (
    message.includes('user_level_profiles') ||
    message.includes('user_xp_history') ||
    message.includes('record_user_xp_event') ||
    message.includes('relation') ||
    message.includes('function')
  )
}

function toUserLevelProfile(row?: UserLevelProfileRow | null): UserLevelProfile {
  const snapshot = buildUserLevelSnapshot(Number(row?.xp_total ?? 0) || 0)

  return {
    ...snapshot,
    lastLoginRewardDate: row?.last_login_reward_date ?? null,
  }
}

async function fetchUserLevelProfileRow(userId: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('user_level_profiles')
    .select('user_id, xp_total, level, last_login_reward_date')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data ?? null) as UserLevelProfileRow | null
}

async function ensureUserLevelProfileRow(userId: string) {
  const existingRow = await fetchUserLevelProfileRow(userId)

  if (existingRow) {
    return existingRow
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('user_level_profiles')
    .insert({
      user_id: userId,
      xp_total: 0,
      level: 1,
      updated_at: getKoreaTimestampString(),
    })
    .select('user_id, xp_total, level, last_login_reward_date')
    .single()

  if (error) {
    if (String((error as { code?: unknown }).code ?? '') === '23505') {
      return fetchUserLevelProfileRow(userId)
    }

    throw error
  }

  return data as UserLevelProfileRow
}

async function recordUserXpEvent(
  userId: string,
  actionType: string,
  xpAmount: number,
  referenceId: string,
  rewardDate?: string,
) {
  if (!referenceId) {
    return null
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.rpc('record_user_xp_event', {
    p_user_id: userId,
    p_action_type: actionType,
    p_xp_amount: xpAmount,
    p_reference_id: referenceId,
    p_reward_date: rewardDate ?? null,
  })

  if (error) {
    throw error
  }

  const row = Array.isArray(data) ? ((data[0] ?? null) as RecordUserXpRpcRow | null) : null
  return row
}

async function countAwardedActionsToday(userId: string, actionTypes: string[], dateString: string) {
  if (actionTypes.length === 0) {
    return 0
  }

  const supabase = createSupabaseAdminClient()
  const { start, end } = getKoreaDayRange(dateString)
  const { count, error } = await supabase
    .from('user_xp_history')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('action_type', actionTypes)
    .gte('created_at', start)
    .lte('created_at', end)

  if (error) {
    throw error
  }

  return Math.max(0, Number(count ?? 0) || 0)
}

async function countUserActionsForReference(userId: string, table: 'community_comments' | 'player_review_comments', column: 'post_id' | 'review_post_id', referenceId: string) {
  const supabase = createSupabaseAdminClient()
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('author_user_id', userId)
    .eq(column, referenceId)

  if (error) {
    throw error
  }

  return Math.max(0, Number(count ?? 0) || 0)
}

async function awardFirstPostBonusIfNeeded(userId: string, dateString: string) {
  await recordUserXpEvent(userId, 'daily_first_post_bonus', FIRST_POST_BONUS_XP, `first-post:${dateString}`)
}

async function awardFirstCommentBonusIfNeeded(userId: string, dateString: string) {
  await recordUserXpEvent(userId, 'daily_first_comment_bonus', FIRST_COMMENT_BONUS_XP, `first-comment:${dateString}`)
}

export async function getUserLevelProfile(userId: string) {
  try {
    const row = await ensureUserLevelProfileRow(userId)
    return toUserLevelProfile(row)
  } catch (error) {
    if (isMissingLevelInfraError(error)) {
      return toUserLevelProfile(null)
    }

    throw error
  }
}

export async function getUserLevelMap(userIds: Array<string | null | undefined>) {
  const uniqueUserIds = [...new Set(userIds.filter((userId): userId is string => typeof userId === 'string' && userId.trim().length > 0))]

  if (uniqueUserIds.length === 0) {
    return new Map<string, number>()
  }

  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from('user_level_profiles')
      .select('user_id, level')
      .in('user_id', uniqueUserIds)

    if (error) {
      throw error
    }

    const levelMap = new Map<string, number>()

    for (const userId of uniqueUserIds) {
      levelMap.set(userId, 1)
    }

    for (const row of (data ?? []) as UserLevelProfileRow[]) {
      if (row.user_id) {
        levelMap.set(row.user_id, Math.max(1, Number(row.level ?? 1) || 1))
      }
    }

    return levelMap
  } catch (error) {
    if (isMissingLevelInfraError(error)) {
      return new Map<string, number>()
    }

    throw error
  }
}

export async function rewardLoginXp(userId: string) {
  const rewardDate = getKoreaDateString()

  try {
    await ensureUserLevelProfileRow(userId)
    await recordUserXpEvent(userId, 'login_daily', LOGIN_REWARD_XP, `login:${rewardDate}`, rewardDate)
  } catch (error) {
    if (!isMissingLevelInfraError(error)) {
      throw error
    }
  }
}

export async function rewardCommunityPostXp(userId: string, postId: string) {
  const rewardDate = getKoreaDateString()

  try {
    await ensureUserLevelProfileRow(userId)
    await recordUserXpEvent(userId, 'community_post', COMMUNITY_POST_XP, `community-post:${postId}`)
    await awardFirstPostBonusIfNeeded(userId, rewardDate)
  } catch (error) {
    if (!isMissingLevelInfraError(error)) {
      throw error
    }
  }
}

export async function rewardPlayerReviewPostXp(userId: string, postId: string) {
  const rewardDate = getKoreaDateString()

  try {
    await ensureUserLevelProfileRow(userId)
    await recordUserXpEvent(userId, 'player_review_post', PLAYER_REVIEW_POST_XP, `player-review-post:${postId}`)
    await awardFirstPostBonusIfNeeded(userId, rewardDate)
  } catch (error) {
    if (!isMissingLevelInfraError(error)) {
      throw error
    }
  }
}

async function rewardCommentXp(params: {
  userId: string
  commentId: string
  actionType: 'community_comment' | 'player_review_comment'
  xpAmount: number
  referenceTargetId: string
  referenceTable: 'community_comments' | 'player_review_comments'
  referenceColumn: 'post_id' | 'review_post_id'
  content: string
}) {
  const { actionType, commentId, content, referenceColumn, referenceTable, referenceTargetId, userId, xpAmount } = params
  const trimmedContent = content.trim()

  if (trimmedContent.length < MIN_COMMENT_XP_LENGTH) {
    return
  }

  try {
    await ensureUserLevelProfileRow(userId)
    const rewardDate = getKoreaDateString()
    const awardedCommentCount = await countAwardedActionsToday(userId, ['community_comment', 'player_review_comment'], rewardDate)

    if (awardedCommentCount >= DAILY_COMMENT_XP_LIMIT) {
      return
    }

    const sameTargetCommentCount = await countUserActionsForReference(userId, referenceTable, referenceColumn, referenceTargetId)

    if (sameTargetCommentCount > 1) {
      return
    }

    const result = await recordUserXpEvent(userId, actionType, xpAmount, `${actionType}:${commentId}`)

    if (result?.awarded) {
      await awardFirstCommentBonusIfNeeded(userId, rewardDate)
    }
  } catch (error) {
    if (!isMissingLevelInfraError(error)) {
      throw error
    }
  }
}

export async function rewardCommunityCommentXp(userId: string, commentId: string, postId: string, content: string) {
  return rewardCommentXp({
    userId,
    commentId,
    actionType: 'community_comment',
    xpAmount: COMMUNITY_COMMENT_XP,
    referenceTargetId: postId,
    referenceTable: 'community_comments',
    referenceColumn: 'post_id',
    content,
  })
}

export async function rewardPlayerReviewCommentXp(userId: string, commentId: string, postId: string, content: string) {
  return rewardCommentXp({
    userId,
    commentId,
    actionType: 'player_review_comment',
    xpAmount: PLAYER_REVIEW_COMMENT_XP,
    referenceTargetId: postId,
    referenceTable: 'player_review_comments',
    referenceColumn: 'review_post_id',
    content,
  })
}
