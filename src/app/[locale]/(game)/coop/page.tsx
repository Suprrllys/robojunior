import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import CoopLobby from '@/components/game/CoopLobby'
import CoopInfo from '@/components/game/CoopInfo'

export default async function CoopPage() {
  const t = await getTranslations()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, country')
    .eq('id', user!.id)
    .single()

  // Auto-cleanup: abandon waiting sessions older than 24 hours
  const staleDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  await supabase
    .from('coop_sessions')
    .update({ status: 'abandoned' })
    .eq('status', 'waiting')
    .lt('created_at', staleDate)

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

  // Open sessions to join (with participants and their profiles)
  const { data: openSessions } = await supabase
    .from('coop_sessions')
    .select('*, profiles!created_by(username, country), coop_participants(user_id, role, profiles(username, country))')
    .eq('status', 'waiting')
    .neq('created_by', user!.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Completed coop missions for progress display
  const { data: completedCoopMissions } = await supabase
    .from('coop_completed_missions')
    .select('mission_template, stars, score')
    .eq('user_id', user!.id)

  // Recently completed sessions (for offline result viewing)
  // Find sessions completed in the last 7 days where user participated
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recentCompletedParts } = await supabase
    .from('coop_participants')
    .select('coop_session_id')
    .eq('user_id', user!.id)

  const recentCompletedIds = recentCompletedParts?.map(p => p.coop_session_id) ?? []
  const { data: recentlyCompleted } = recentCompletedIds.length > 0 ? await supabase
    .from('coop_sessions')
    .select('id, mission_template, difficulty, updated_at, coop_participants(user_id, role, is_completed, score, profiles(username))')
    .in('id', recentCompletedIds)
    .eq('status', 'completed')
    .gt('updated_at', weekAgo)
    .order('updated_at', { ascending: false })
    .limit(5)
    : { data: [] }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">{t('coop.title')}</h1>
        <p className="text-gray-400 mt-1">{t('coop.subtitle')}</p>
      </div>

      <CoopInfo />

      <CoopLobby
        userId={user!.id}
        username={profile?.username ?? 'Player'}
        mySessions={allMySessions}
        openSessions={openSessions ?? []}
        completedMissions={completedCoopMissions ?? []}
        recentlyCompleted={recentlyCompleted ?? []}
      />
    </div>
  )
}
