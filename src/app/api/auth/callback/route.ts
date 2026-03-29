import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/en/roles'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // If redirecting to reset-password, go to the locale-prefixed version
      const destination = next === '/reset-password'
        ? `${origin}/en/reset-password`
        : `${origin}${next}`
      return NextResponse.redirect(destination)
    }
  }

  return NextResponse.redirect(`${origin}/en/login?error=auth_callback_error`)
}
