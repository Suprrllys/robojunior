'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'

const PRESET_PHRASES = [
  { key: 'hello', icon: '👋' },
  { key: 'great', icon: '🌟' },
  { key: 'myTurn', icon: '▶️' },
  { key: 'done', icon: '✅' },
  { key: 'nice', icon: '👍' },
  { key: 'wait', icon: '⏳' },
  { key: 'thanks', icon: '🙏' },
]

interface Participant {
  user_id: string
  role: string
  is_completed: boolean
  profiles?: { username: string; country: string }
}

interface Message {
  id: string
  user_id: string
  content: string
  is_preset: boolean
  created_at: string
  profiles?: { username: string }
}

interface CoopSessionProps {
  userId: string
  session: { id: string; status: string; mission_template: string; created_by: string }
  participants: Participant[]
  initialMessages: Message[]
  isCreator: boolean
}

const MISSION_TASKS: Record<string, { creator: string; joiner: string; combined: string }> = {
  city_infrastructure: {
    creator: '🛸 Program the drone delivery route for medical supplies across the city grid',
    joiner: '🤖 Design the ground robot to handle last-mile delivery at each station',
    combined: 'Together you built a complete city logistics system!',
  },
  smart_farm: {
    creator: '🤖 Design a robot with soil sensors and precision arms for crop monitoring',
    joiner: '💼 Create a business plan for scaling the smart farm to 3 BRICS+ countries',
    combined: 'Together you created a scalable agri-tech solution!',
  },
  startup_launch: {
    creator: '💼 Define the product strategy and initial team structure for the EdTech startup',
    joiner: '🛸 Design the drone delivery network for physical learning kits to rural schools',
    combined: 'Together you launched a complete EdTech company!',
  },
}

export default function CoopSession({ userId, session, participants, initialMessages, isCreator }: CoopSessionProps) {
  const t = useTranslations()
  const router = useRouter()
  const supabase = createClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [allParts, setAllParts] = useState<Participant[]>(participants)
  const [sessionStatus, setSessionStatus] = useState(session.status)
  const [submitting, setSubmitting] = useState(false)

  const myPart = allParts.find(p => p.user_id === userId)
  const partner = allParts.find(p => p.user_id !== userId)
  const taskMap = MISSION_TASKS[session.mission_template] ?? MISSION_TASKS.city_infrastructure
  const myTask = isCreator ? taskMap.creator : taskMap.joiner
  const partnerTask = isCreator ? taskMap.joiner : taskMap.creator
  const myDone = myPart?.is_completed ?? false
  const partnerDone = partner?.is_completed ?? false
  const bothDone = myDone && partnerDone && allParts.length >= 2

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const msgSub = supabase
      .channel(`chat:${session.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `coop_session_id=eq.${session.id}`,
      }, async (payload) => {
        const newMsg = payload.new as Message
        const { data: prof } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', newMsg.user_id)
          .single()
        setMessages(prev => [...prev, { ...newMsg, profiles: prof ?? undefined }])
      })
      .subscribe()

    const partSub = supabase
      .channel(`participants:${session.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'coop_participants',
        filter: `coop_session_id=eq.${session.id}`,
      }, (payload) => {
        const updated = payload.new as Participant
        setAllParts(prev => prev.map(p => p.user_id === updated.user_id ? { ...p, ...updated } : p))
      })
      .subscribe()

    const sessSub = supabase
      .channel(`session:${session.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'coop_sessions',
        filter: `id=eq.${session.id}`,
      }, (payload) => {
        setSessionStatus((payload.new as { status: string }).status)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(msgSub)
      supabase.removeChannel(partSub)
      supabase.removeChannel(sessSub)
    }
  }, [session.id, supabase])

  async function sendMessage(content: string, isPreset = false) {
    await supabase.from('chat_messages').insert({
      coop_session_id: session.id,
      user_id: userId,
      content,
      is_preset: isPreset,
    })
  }

  async function completeMyTurn() {
    setSubmitting(true)
    await supabase
      .from('coop_participants')
      .update({ is_completed: true })
      .eq('coop_session_id', session.id)
      .eq('user_id', userId)

    await sendMessage(t('chat.phrases.done'), true)

    const updatedParts = allParts.map(p => p.user_id === userId ? { ...p, is_completed: true } : p)
    if (updatedParts.length >= 2 && updatedParts.every(p => p.is_completed)) {
      await supabase
        .from('coop_sessions')
        .update({ status: 'completed' })
        .eq('id', session.id)
      setSessionStatus('completed')
    }

    setSubmitting(false)
  }

  if (bothDone || sessionStatus === 'completed') {
    return (
      <div className="space-y-6">
        <div className="bg-brand-panel border border-green-500/40 rounded-2xl p-8 text-center">
          <div className="text-6xl mb-4">🤝</div>
          <h2 className="text-2xl font-black text-white mb-2">{t('coop.missionComplete')}</h2>
          <p className="text-gray-400 mb-6">{taskMap.combined}</p>
          <p className="text-green-400 font-bold text-lg mb-6">{t('coop.bonusXP', { xp: 50 })}</p>
          <button
            onClick={() => router.push('/coop')}
            className="px-6 py-3 bg-brand-blue text-white font-bold rounded-xl hover:bg-blue-500 transition-colors"
          >
            ← Back to Co-op Lobby
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white mb-1">
          {session.mission_template.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
        </h1>
        <p className="text-gray-400 text-sm">
          {sessionStatus === 'waiting'
            ? '⌛ Waiting for a partner to join...'
            : `Playing with ${partner?.profiles?.username ?? 'Partner'}`}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* My task */}
        <div className={`bg-brand-panel border rounded-2xl p-5 ${
          !myDone ? 'border-brand-blue' : 'border-green-500/50'
        }`}>
          <p className="text-xs font-bold text-gray-400 uppercase mb-2">Your Task</p>
          <p className="text-white font-medium">{myTask}</p>
          {!myDone ? (
            <button
              onClick={completeMyTurn}
              disabled={submitting}
              className="mt-4 w-full py-2.5 bg-brand-blue hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors"
            >
              {submitting ? 'Saving...' : '✅ Mark as Done'}
            </button>
          ) : (
            <p className="mt-4 text-green-400 text-sm font-bold">✓ Completed!</p>
          )}
        </div>

        {/* Partner task */}
        <div className={`bg-brand-panel border rounded-2xl p-5 ${
          partnerDone ? 'border-green-500/50' : 'border-brand-border opacity-70'
        }`}>
          <p className="text-xs font-bold text-gray-400 uppercase mb-2">
            {partner ? `${partner.profiles?.username ?? 'Partner'}'s Task` : 'Partner Task'}
          </p>
          <p className="text-white font-medium">{partnerTask}</p>
          {partnerDone ? (
            <p className="mt-4 text-green-400 text-sm font-bold">✓ Partner done!</p>
          ) : (
            <p className="mt-4 text-gray-500 text-sm">
              {sessionStatus === 'waiting' ? 'Waiting for partner to join' : t('coop.partnersTurn')}
            </p>
          )}
        </div>
      </div>

      {/* Chat */}
      <div className="bg-brand-panel border border-brand-border rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-3">💬 Team Chat</h3>

        {/* Preset phrases */}
        <div className="flex flex-wrap gap-2 mb-4">
          {PRESET_PHRASES.map(p => (
            <button
              key={p.key}
              onClick={() => sendMessage(t(`chat.phrases.${p.key}` as never), true)}
              className="px-3 py-1.5 bg-brand-dark border border-brand-border hover:border-gray-500 text-gray-300 text-xs rounded-lg transition-colors"
            >
              {p.icon} {t(`chat.phrases.${p.key}` as never)}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="h-48 overflow-y-auto bg-brand-dark rounded-xl p-3 space-y-2">
          {messages.length === 0 && (
            <p className="text-gray-600 text-sm text-center py-4">No messages yet. Say hello!</p>
          )}
          {messages.map(msg => {
            const isMe = msg.user_id === userId
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs px-3 py-2 rounded-xl text-sm ${
                  isMe ? 'bg-brand-blue text-white' : 'bg-brand-panel border border-brand-border text-white'
                }`}>
                  {!isMe && <p className="text-xs text-gray-400 mb-1">{msg.profiles?.username ?? 'Partner'}</p>}
                  <p>{msg.content}</p>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  )
}
