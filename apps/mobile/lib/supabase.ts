import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'

const CHUNK_SIZE = 1800

const ChunkedSecureStore = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const countStr = await SecureStore.getItemAsync(`${key}__n`)
      if (!countStr) return null // 청크로 저장된 데이터만 읽음 (이전 손상 데이터 무시)
      const count = parseInt(countStr, 10)
      const parts: string[] = []
      for (let i = 0; i < count; i++) {
        parts.push((await SecureStore.getItemAsync(`${key}__${i}`)) ?? '')
      }
      return parts.join('')
    } catch {
      return null
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      const chunks: string[] = []
      for (let i = 0; i < value.length; i += CHUNK_SIZE) {
        chunks.push(value.slice(i, i + CHUNK_SIZE))
      }
      await SecureStore.setItemAsync(`${key}__n`, String(chunks.length))
      await Promise.all(chunks.map((chunk, i) => SecureStore.setItemAsync(`${key}__${i}`, chunk)))
    } catch {}
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      const countStr = await SecureStore.getItemAsync(`${key}__n`)
      if (countStr) {
        const count = parseInt(countStr, 10)
        await SecureStore.deleteItemAsync(`${key}__n`).catch(() => null)
        await Promise.all(
          Array.from({ length: count }, (_, i) =>
            SecureStore.deleteItemAsync(`${key}__${i}`).catch(() => null)
          )
        )
      }
    } catch {}
  },
}

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: ChunkedSecureStore,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  },
)
