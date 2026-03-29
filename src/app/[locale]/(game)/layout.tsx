import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GameNav from '@/components/layout/GameNav'
import GameToast from '@/components/game/GameToast'

export default async function GameLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()

  let user = null
  let authFailed = false
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      authFailed = true
    } else {
      user = data.user
    }
  } catch {
    authFailed = true
  }

  // Only redirect if Supabase confirmed no user (not a timeout/error)
  if (!user && !authFailed) {
    redirect(`/${locale}/login`)
  }

  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('username, xp, avatar_color, avatar_accessory, country, game_currency, is_parent')
      .eq('id', user.id)
      .single()
    profile = data
  }

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <GameNav profile={profile} locale={locale} />
      <main className="flex-1 max-w-6xl mx-auto w-full px-3 sm:px-4 py-8">
        {children}
      </main>
      <GameToast />
    </div>
  )
}
