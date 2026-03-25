import createMiddleware from 'next-intl/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

const protectedRoutes = ['/roles', '/missions', '/dashboard', '/coop', '/leaderboard', '/profile']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Извлекаем locale из пути
  const pathnameWithoutLocale = pathname.replace(/^\/(en|ru|ar)/, '') || '/'

  // Проверяем, защищённый ли маршрут
  const isProtected = protectedRoutes.some(route =>
    pathnameWithoutLocale.startsWith(route)
  )

  if (isProtected) {
    let response = NextResponse.next({ request })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            response = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options as never)
            )
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // Определяем locale из пути для редиректа
      const locale = pathname.match(/^\/(en|ru|ar)/)?.[1] || 'en'
      const url = request.nextUrl.clone()
      url.pathname = `/${locale}/login`
      return NextResponse.redirect(url)
    }
  }

  return intlMiddleware(request)
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
