import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import LiveLeaderboard from '@/components/game/LiveLeaderboard'

export default async function LeaderboardPage() {
  const t = await getTranslations('leaderboard')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: leaders } = await supabase
    .from('profiles')
    .select('id, username, country, xp, avatar_color, avatar_accessory')
    .order('xp', { ascending: false })
    .limit(50)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">{t('title')}</h1>
        <p className="text-gray-400 mt-1 text-sm">{t('subtitle')}</p>
      </div>

      <LiveLeaderboard
        initialLeaders={leaders ?? []}
        currentUserId={user!.id}
      />
    </div>
  )
}
