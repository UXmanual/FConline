import { NextRequest } from 'next/server'
import { getKoreaTimestampString } from '@/lib/community'
import { appendAvatarVersion } from '@/lib/avatar'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { createSupabaseSsrClient } from '@/lib/supabase/ssr'

const BUCKET = 'fconlineground'

export async function POST(request: NextRequest) {
  try {
    const authSupabase = await createSupabaseSsrClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return Response.json({ message: '로그인 후 이용해 주세요.' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('avatar') as File | null

    if (!file) {
      return Response.json({ message: '이미지가 없습니다.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const filePath = `${user.id}/avatar`
    const updatedAt = getKoreaTimestampString()
    const adminSupabase = createSupabaseAdminClient()

    const { error: uploadError } = await adminSupabase.storage
      .from(BUCKET)
      .upload(filePath, buffer, { upsert: true, contentType: 'image/jpeg' })

    if (uploadError) throw uploadError

    const {
      data: { publicUrl },
    } = adminSupabase.storage.from(BUCKET).getPublicUrl(filePath)

    const { error: updateError } = await adminSupabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        custom_avatar_url: publicUrl,
      },
    })

    if (updateError) throw updateError

    await adminSupabase
      .from('user_level_profiles')
      .upsert(
        { user_id: user.id, avatar_url: publicUrl, updated_at: updatedAt },
        { onConflict: 'user_id' },
      )

    return Response.json({ avatarUrl: appendAvatarVersion(publicUrl, updatedAt) ?? publicUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : '프로필 사진을 저장하지 못했습니다.'
    return Response.json({ message }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const authSupabase = await createSupabaseSsrClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return Response.json({ message: '로그인 후 이용해 주세요.' }, { status: 401 })
    }

    const adminSupabase = createSupabaseAdminClient()

    await adminSupabase.storage.from(BUCKET).remove([`${user.id}/avatar`])

    const { error } = await adminSupabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        custom_avatar_url: null,
      },
    })

    if (error) throw error

    await adminSupabase
      .from('user_level_profiles')
      .update({ avatar_url: null, updated_at: getKoreaTimestampString() })
      .eq('user_id', user.id)

    return Response.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : '프로필 사진을 삭제하지 못했습니다.'
    return Response.json({ message }, { status: 500 })
  }
}
