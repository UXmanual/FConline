import { NextRequest } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

const TELEGRAM_API_BASE = 'https://api.telegram.org'
const DEFAULT_CATEGORY = '앱 문의'

function getTelegramConfig() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim()
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim()

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
    '[FCO Ground 문의]',
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
    throw new Error('Failed to send Telegram message.')
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
    return !error
  } catch {
    return false
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

    const databaseSaved = await saveContactRequest({
      category,
      title,
      content,
      contact,
      created_at: new Date().toISOString(),
    })

    await sendTelegramMessage(
      buildTelegramMessage({
        category,
        title,
        content,
        contact,
        createdAt,
      }),
    )

    return Response.json({ success: true, databaseSaved })
  } catch {
    return Response.json({ message: '문의 전송에 실패했습니다.' }, { status: 500 })
  }
}
