import { NextRequest } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

const TELEGRAM_API_BASE = 'https://api.telegram.org'
const DEFAULT_CATEGORY = '앱 문의'

function unwrapEnv(value?: string | null) {
  const trimmed = value?.trim()

  if (!trimmed) {
    return ''
  }

  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return trimmed.slice(1, -1).trim()
  }

  return trimmed
}

function getTelegramConfig() {
  const botToken = unwrapEnv(process.env.TELEGRAM_BOT_TOKEN)
  const chatId = unwrapEnv(process.env.TELEGRAM_CHAT_ID)

  if (!botToken || !chatId) {
    throw new Error('Missing Telegram configuration.')
  }

  return { botToken, chatId }
}

function buildTelegramMessage({
  category,
  title,
  content,
  contact,
  createdAt,
}: {
  category: string
  title: string
  content: string
  contact: string
  createdAt: string
}) {
  return [
    '[FConline Ground 문의]',
    `유형: ${category}`,
    `제목: ${title}`,
    `내용: ${content}`,
    `연락수단: ${contact || '미입력'}`,
    `시간: ${createdAt}`,
  ].join('\n')
}

async function sendTelegramMessage(text: string) {
  const { botToken, chatId } = getTelegramConfig()
  const response = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const failureText = await response.text().catch(() => '')
    throw new Error(`Failed to send Telegram message. ${failureText}`.trim())
  }
}

async function saveContactRequest(payload: {
  category: string
  title: string
  content: string
  contact: string
  created_at: string
}) {
  try {
    const supabase = createSupabaseAdminClient()
    const { error } = await supabase.from('contact_requests').insert(payload)
    if (error) {
      return { ok: false, error: error.message }
    }

    return { ok: true as const }
  } catch {
    return { ok: false as const, error: 'Unexpected database error.' }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const category = String(body.category ?? DEFAULT_CATEGORY).trim() || DEFAULT_CATEGORY
    const title = String(body.title ?? '').trim()
    const content = String(body.content ?? '').trim()
    const contact = String(body.contact ?? '').trim()
    const createdAt = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })

    if (!title || !content) {
      return Response.json({ message: '제목과 내용을 입력해 주세요.' }, { status: 400 })
    }

    if (title.length > 100 || content.length > 2000 || contact.length > 100) {
      return Response.json({ message: '입력 길이를 다시 확인해 주세요.' }, { status: 400 })
    }

    const databaseResult = await saveContactRequest({
      category,
      title,
      content,
      contact,
      created_at: new Date().toISOString(),
    })

    let telegramDelivered = false
    let telegramErrorMessage: string | null = null

    try {
      await sendTelegramMessage(
        buildTelegramMessage({
          category,
          title,
          content,
          contact,
          createdAt,
        }),
      )
      telegramDelivered = true
    } catch (error) {
      telegramErrorMessage = error instanceof Error ? error.message : 'Unknown Telegram error.'
      console.error('[contact] Telegram delivery failed', {
        message: telegramErrorMessage,
      })
    }

    if (!databaseResult.ok && !telegramDelivered) {
      console.error('[contact] Contact request failed for both database and Telegram', {
        databaseError: databaseResult.error,
        telegramError: telegramErrorMessage,
      })
      return Response.json({ message: '문의 전송에 실패했습니다.' }, { status: 500 })
    }

    return Response.json({
      success: true,
      databaseSaved: databaseResult.ok,
      telegramDelivered,
    })
  } catch (error) {
    console.error('[contact] Unexpected contact request failure', {
      message: error instanceof Error ? error.message : 'Unknown error.',
    })
    return Response.json({ message: '문의 전송에 실패했습니다.' }, { status: 500 })
  }
}
