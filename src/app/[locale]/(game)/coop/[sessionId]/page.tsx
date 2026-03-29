import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import CoopSession from '@/components/game/CoopSession'

interface Props {
  params: { sessionId: string; locale: string }
}

export default async function CoopSessionPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: session } = await supabase
    .from('coop_sessions')
    .select('*')
    .eq('id', params.sessionId)
    .single()

  if (!session) notFound()

  const { data: participants } = await supabase
    .from('coop_participants')
    .select('*, profiles(username, country, avatar_color, avatar_accessory)')
    .eq('coop_session_id', params.sessionId)

  const { data: messages } = await supabase
    .from('chat_messages')
    .select('*, profiles(username)')
    .eq('coop_session_id', params.sessionId)
    .order('created_at', { ascending: true })
    .limit(50)

  const myParticipant = participants?.find(p => p.user_id === user!.id)
  const isCreator = session.created_by === user!.id

  // 3-role coop missions
  const COOP3_TEMPLATES = new Set([
    'coop_solar_farm', 'coop_bridge', 'coop_rescue',
    'coop_smart_district', 'coop_city_launch',
  ])
  const isCoop3 = COOP3_TEMPLATES.has(session.mission_template)
  const ALL_ROLES = ['drone_programmer', 'robot_constructor', 'entrepreneur']

  // Auto-join if coming as participant for the first time (session is waiting)
  if (!myParticipant && session.status === 'waiting' && !isCreator) {
    // Check one-session limit: player must not be in another active session
    const { data: existingParts } = await supabase
      .from('coop_participants')
      .select('coop_session_id, coop_sessions!inner(status)')
      .eq('user_id', user!.id)
    const alreadyActive = existingParts?.some((p: { coop_sessions: { status: string } }) =>
      p.coop_sessions.status === 'waiting' || p.coop_sessions.status === 'active'
    ) ?? false

    if (!alreadyActive) {
      const takenRoles = new Set(participants?.map(p => p.role) ?? [])
      const availableRole = ALL_ROLES.find(r => !takenRoles.has(r)) ?? 'robot_constructor'
      const requiredPlayers = isCoop3 ? 3 : 2
      const newCount = (participants?.length ?? 0) + 1

      await supabase.from('coop_participants').insert({
        coop_session_id: params.sessionId,
        user_id: user!.id,
        role: availableRole,
        progress: {},
        is_completed: false,
      })

      if (newCount >= requiredPlayers) {
        const expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
        await supabase.from('coop_sessions').update({ status: 'active', expires_at: expiresAt }).eq('id', params.sessionId)
      }
    }
  }

  if (!myParticipant && isCreator) notFound()

  return (
    <CoopSession
      userId={user!.id}
      session={session}
      participants={participants ?? []}
      initialMessages={messages ?? []}
    />
  )
}
