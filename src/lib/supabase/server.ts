import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

type SetCookieItem = {
  name: string
  value: string
  options?: Partial<ResponseCookie>
}

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: SetCookieItem[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set({ name, value, ...options })
            )
          } catch {
            // Server Component — can't set cookies in read-only context
          }
        },
      },
    }
  )
}
