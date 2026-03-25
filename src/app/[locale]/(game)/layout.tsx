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
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, xp, avatar_color, country')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen flex flex-col">
      <GameNav profile={profile} locale={locale} />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        {children}
      </main>
      <GameToast />
    </div>
  )
}
