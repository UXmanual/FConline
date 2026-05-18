import { supabase } from './supabase'
import { API_BASE } from '@/constants/api'

let _cachedToken: string | null = null

supabase.auth.onAuthStateChange((_event, session) => {
  _cachedToken = session?.access_token ?? null
})

export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  let token = _cachedToken
  if (!token) {
    const { data: { session } } = await supabase.auth.getSession()
    token = session?.access_token ?? null
    _cachedToken = token
  }
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> ?? {}),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' })
}
