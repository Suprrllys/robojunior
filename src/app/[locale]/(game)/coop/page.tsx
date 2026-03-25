import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import CoopLobby from '@/components/game/CoopLobby'

export default async function CoopPage() {
  const t = await getTranslations()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, country')
    .eq('id', user!.id)
    .single()

  // My sessions (as creator or participant)
  const { data: mySessions } = await supabase
    .from('coop_sessions')
    .select('*, coop_participants(user_id, role, is_completed)')
    .or(`created_by.eq.${user!.id}`)
    .in('status', ['waiting', 'active'])
    .order('created_at', { ascending: false })

  // Sessions where I am a participant (but not creator)
  const { data: joinedParticipation } = await supabase
    .from('coop_participants')
    .select('coop_session_id')
    .eq('user_id', user!.id)
    .neq('coop_session_id', null)

  const joinedIds = joinedParticipation?.map(p => p.coop_session_id) ?? []

  const { data: joinedSessions } = joinedIds.length > 0 ? await supabase
    .from('coop_sessions')
    .select('*, coop_participants(user_id, role, is_completed)')
    .in('id', joinedIds)
    .neq('created_by', user!.id)
    .in('status', ['waiting', 'active'])
    : { data: [] }

  const allMySessions = [...(mySessions ?? []), ...(joinedSessions ?? [])]

  // Open sessions to join
  const { data: openSessions } = await supabase
    .from('coop_sessions')
    .select('*, profiles!created_by(username, country)')
    .eq('status', 'waiting')
    .neq('created_by', user!.id)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">{t('coop.title')}</h1>
        <p className="text-gray-400 mt-1">{t('coop.subtitle')}</p>
      </div>

      <div className="bg-brand-panel border border-brand-border rounded-2xl p-4 text-sm text-gray-400 flex items-start gap-3">
        <span className="text-2xl">⏳</span>
        <p>{t('coop.asyncNote')}</p>
      </div>

      <CoopLobby
        userId={user!.id}
        username={profile?.username ?? 'Player'}
        mySessions={allMySessions}
        openSessions={openSessions ?? []}
      />
    </div>
  )
}
