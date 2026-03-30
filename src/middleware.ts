import createMiddleware from 'next-intl/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

const protectedRoutes = ['/roles', '/missions', '/dashboard', '/coop', '/leaderboard', '/profile']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Serve landing page at root
  if (pathname === '/') {
    return NextResponse.rewrite(new URL('/landing.html', request.url))
  }

  // Извлекаем locale из пути
  const pathnameWithoutLocale = pathname.replace(/^\/(en|ru|ar)/, '') || '/'

  // Проверяем, защищённый ли маршрут
  const isProtected = protectedRoutes.some(route =>
    pathnameWithoutLocale.startsWith(route)
  )

  if (isProtected) {
    // Весь блок авторизации в try/catch — если Supabase недоступен, пропускаем
    try {
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

      const { data, error } = await supabase.auth.getUser()

      if (error) {
        // Supabase вернул ошибку (например, невалидная сессия после логаута) — редирект на логин
        const locale = pathname.match(/^\/(en|ru|ar)/)?.[1] || 'en'
        const url = request.nextUrl.clone()
        url.pathname = `/${locale}/login`
        return NextResponse.redirect(url)
      }

      const user = data.user

      if (!user) {
        // Пользователь точно не залогинен — редирект на логин
        const locale = pathname.match(/^\/(en|ru|ar)/)?.[1] || 'en'
        const url = request.nextUrl.clone()
        url.pathname = `/${locale}/login`
        return NextResponse.redirect(url)
      }

      // Передаём обновлённые cookie сессии в ответ
      const intlResult = intlMiddleware(request)
      response.cookies.getAll().forEach(cookie => {
        intlResult.cookies.set(cookie)
      })
      return intlResult
    } catch {
      // Supabase недоступен (таймаут, ECONNRESET, и т.д.) — пропускаем
      return intlMiddleware(request)
    }
  }

  return intlMiddleware(request)
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
