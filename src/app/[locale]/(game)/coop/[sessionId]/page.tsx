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
    .select('*, profiles(username, country)')
    .eq('coop_session_id', params.sessionId)

  const { data: messages } = await supabase
    .from('chat_messages')
    .select('*, profiles(username)')
    .eq('coop_session_id', params.sessionId)
    .order('created_at', { ascending: true })
    .limit(50)

  const myParticipant = participants?.find(p => p.user_id === user!.id)
  const isCreator = session.created_by === user!.id

  // Auto-join if coming as participant for the first time (session is waiting)
  if (!myParticipant && session.status === 'waiting' && !isCreator) {
    await supabase.from('coop_participants').insert({
      coop_session_id: params.sessionId,
      user_id: user!.id,
      role: 'robot_constructor',
      progress: {},
      is_completed: false,
    })
    await supabase.from('coop_sessions').update({ status: 'active' }).eq('id', params.sessionId)
  }

  if (!myParticipant && isCreator) notFound()

  return (
    <CoopSession
      userId={user!.id}
      session={session}
      participants={participants ?? []}
      initialMessages={messages ?? []}
      isCreator={isCreator}
    />
  )
}
