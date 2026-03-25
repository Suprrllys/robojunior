'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'
import clsx from 'clsx'
import DroneGame from '@/components/game/DroneGame'
import RobotGame from '@/components/game/RobotGame'
import EntrepreneurGame from '@/components/game/EntrepreneurGame'
import type { Difficulty } from '@/types/game'

/* ─── Constants ─── */

const PRESET_PHRASES = [
  { key: 'hello', icon: '👋' },
  { key: 'great', icon: '🌟' },
  { key: 'myTurn', icon: '▶️' },
  { key: 'done', icon: '✅' },
  { key: 'nice', icon: '👍' },
  { key: 'wait', icon: '⏳' },
  { key: 'thanks', icon: '🙏' },
]

// Maps mission_template to the role each player gets
const ROLE_MAP: Record<string, { creator: string; joiner: string }> = {
  city_infrastructure: { creator: 'drone_programmer', joiner: 'robot_constructor' },
  smart_farm: { creator: 'robot_constructor', joiner: 'entrepreneur' },
  startup_launch: { creator: 'entrepreneur', joiner: 'drone_programmer' },
}

/* ─── Types ─── */

interface Participant {
  user_id: string
  role: string
  is_completed: boolean
  score?: number
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
  session: {
    id: string
    status: string
    mission_template: string
    difficulty?: string
    created_by: string
  }
  participants: Participant[]
  initialMessages: Message[]
  isCreator: boolean
}

/* ─── Component ─── */

export default function CoopSession({ userId, session, participants, initialMessages, isCreator }: CoopSessionProps) {
  const t = useTranslations()
  const router = useRouter()
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [allParts, setAllParts] = useState<Participant[]>(participants)
  const [sessionStatus, setSessionStatus] = useState(session.status)

  // Scores
  const [myScore, setMyScore] = useState<number | null>(null)
  const [partnerScore, setPartnerScore] = useState<number | null>(null)
  const [coopBonusXp, setCoopBonusXp] = useState(0)
  const [coopBonusCoins, setCoopBonusCoins] = useState(0)
  const [bonusAwarded, setBonusAwarded] = useState(false)

  const difficulty: Difficulty = (session.difficulty as Difficulty) || 'medium'
  const myPart = allParts.find(p => p.user_id === userId)
  const partner = allParts.find(p => p.user_id !== userId)
  const myRole = myPart?.role ?? (isCreator ? ROLE_MAP[session.mission_template]?.creator : ROLE_MAP[session.mission_template]?.joiner) ?? 'drone_programmer'
  const myDone = myPart?.is_completed ?? false
  const partnerDone = partner?.is_completed ?? false
  const bothDone = myDone && partnerDone && allParts.length >= 2

  // Scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Single Realtime channel (AD-007)
  useEffect(() => {
    const channel = supabase
      .channel(`coop:${session.id}`)
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
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'coop_participants',
        filter: `coop_session_id=eq.${session.id}`,
      }, (payload) => {
        const updated = payload.new as Participant
        setAllParts(prev => prev.map(p => p.user_id === updated.user_id ? { ...p, ...updated } : p))
        // Track partner score from realtime
        if (updated.user_id !== userId && updated.is_completed && updated.score != null) {
          setPartnerScore(updated.score)
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'coop_sessions',
        filter: `id=eq.${session.id}`,
      }, (payload) => {
        setSessionStatus((payload.new as { status: string }).status)
      })
      .on('broadcast', { event: 'score_update' }, (payload) => {
        const data = payload.payload as { user_id: string; score: number }
        if (data.user_id !== userId) {
          setPartnerScore(data.score)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- supabase ref is stable
  }, [session.id, userId])

  // Calculate and award coop bonus when both done
  useEffect(() => {
    if (!bothDone || bonusAwarded) return
    if (myScore == null || partnerScore == null) return

    const avgScore = (myScore + partnerScore) / 2
    const bonusXp = Math.round(avgScore * 0.3)
    const bonusCoins = Math.round(avgScore * 0.15)
    setCoopBonusXp(bonusXp)
    setCoopBonusCoins(bonusCoins)

    // Award bonus XP and coins
    async function awardBonus() {
      const { error: xpError } = await supabase.rpc('increment_xp', { p_user_id: userId, p_amount: bonusXp })
      if (xpError) {
        const { data: prof } = await supabase.from('profiles').select('xp').eq('id', userId).single()
        if (prof) {
          await supabase.from('profiles').update({ xp: prof.xp + bonusXp }).eq('id', userId)
        }
      }
      const { error: currError } = await supabase.rpc('increment_currency', { p_user_id: userId, p_amount: bonusCoins })
      if (currError) {
        const { data: prof } = await supabase.from('profiles').select('game_currency').eq('id', userId).single()
        if (prof) {
          await supabase.from('profiles').update({ game_currency: (prof.game_currency || 0) + bonusCoins }).eq('id', userId)
        }
      }
      setBonusAwarded(true)
    }
    awardBonus()
  }, [bothDone, myScore, partnerScore, bonusAwarded, userId, supabase])

  const sendMessage = useCallback(async (content: string, isPreset = false) => {
    await supabase.from('chat_messages').insert({
      coop_session_id: session.id,
      user_id: userId,
      content,
      is_preset: isPreset,
    })
  }, [supabase, session.id, userId])

  // When player completes their game
  const handleGameComplete = useCallback(async (score: number) => {
    setMyScore(score)

    // Update participant as completed with score
    await supabase
      .from('coop_participants')
      .update({ is_completed: true, score })
      .eq('coop_session_id', session.id)
      .eq('user_id', userId)

    // Broadcast score to partner
    supabase.channel(`coop:${session.id}`).send({
      type: 'broadcast',
      event: 'score_update',
      payload: { user_id: userId, score },
    })

    await sendMessage(t('chat.phrases.done'), true)

    // Check if both done
    const updatedParts = allParts.map(p =>
      p.user_id === userId ? { ...p, is_completed: true, score } : p
    )
    if (updatedParts.length >= 2 && updatedParts.every(p => p.is_completed)) {
      await supabase
        .from('coop_sessions')
        .update({ status: 'completed' })
        .eq('id', session.id)
      setSessionStatus('completed')
    }
  }, [session.id, userId, allParts, supabase, t, sendMessage])

  /* ─── Render: Combined Results ─── */
  if ((bothDone || sessionStatus === 'completed') && myScore != null && partnerScore != null) {
    return (
      <div className="space-y-6">
        <div className="bg-[var(--brand-panel)] border border-green-500/40 rounded-2xl p-8 text-center">
          <div className="text-6xl mb-4">🤝</div>
          <h2 className="text-2xl font-black text-white mb-4">{t('coop.missionComplete')}</h2>

          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-6">
            <div>
              <p className="text-xs text-gray-400 uppercase font-bold mb-1">{t('coop.yourScore')}</p>
              <p className="text-2xl font-black text-white">{myScore}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-bold mb-1">{t('coop.partnerScore')}</p>
              <p className="text-2xl font-black text-white">{partnerScore}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-bold mb-1">{t('coop.coopBonus')}</p>
              <p className="text-2xl font-black text-[var(--brand-gold)]">+{coopBonusXp}</p>
            </div>
          </div>

          <p className="text-green-400 font-bold text-lg mb-2">
            {t('coop.bonusXP', { xp: coopBonusXp })}
          </p>
          <p className="text-yellow-400 font-bold mb-6">
            {t('coop.bonusCoins', { coins: coopBonusCoins })}
          </p>

          <button
            onClick={() => router.push('/coop')}
            className="px-6 py-3 bg-[var(--brand-blue)] text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
          >
            ← {t('coop.backToLobby')}
          </button>
        </div>
      </div>
    )
  }

  /* ─── Render: Game + Status ─── */
  const isWaiting = sessionStatus === 'waiting'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white mb-1">
          {t(`coop.templates.${session.mission_template}`)}
        </h1>
        <p className="text-gray-400 text-sm">
          {isWaiting
            ? t('coop.waitingToStart')
            : `${t('coop.partnerFound')} — ${partner?.profiles?.username ?? t('coop.partnerDefault')}`}
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* My status */}
        <div className={clsx(
          'bg-[var(--brand-panel)] border rounded-2xl p-4',
          myDone ? 'border-green-500/50' : 'border-[var(--brand-blue)]'
        )}>
          <p className="text-xs font-bold text-gray-400 uppercase mb-1">{t('coop.yourScore')}</p>
          {myDone && myScore != null ? (
            <p className="text-xl font-black text-green-400">{myScore}</p>
          ) : (
            <p className="text-sm text-[var(--brand-blue)] font-medium">{t('coop.playYourGame')}</p>
          )}
        </div>

        {/* Partner status */}
        <div className={clsx(
          'bg-[var(--brand-panel)] border rounded-2xl p-4',
          partnerDone ? 'border-green-500/50' : 'border-[var(--brand-border)] opacity-70'
        )}>
          <p className="text-xs font-bold text-gray-400 uppercase mb-1">
            {partner?.profiles?.username ?? t('coop.partnerDefault')}
          </p>
          {partnerDone && partnerScore != null ? (
            <p className="text-xl font-black text-green-400">{partnerScore}</p>
          ) : partner ? (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              <p className="text-sm text-gray-400">{t('coop.partnerPlaying')}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">{t('coop.waitingToStart')}</p>
          )}
        </div>
      </div>

      {/* Per-player game */}
      {!isWaiting && !myDone && (
        <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl p-4">
          <GameForRole
            role={myRole}
            userId={userId}
            difficulty={difficulty}
            onComplete={handleGameComplete}
          />
        </div>
      )}

      {/* Chat */}
      <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-3">💬 {t('coop.teamChat')}</h3>

        <div className="flex flex-wrap gap-2 mb-4">
          {PRESET_PHRASES.map(p => (
            <button
              key={p.key}
              onClick={() => sendMessage(t(`chat.phrases.${p.key}` as never), true)}
              className="px-3 py-1.5 bg-[var(--brand-dark)] border border-[var(--brand-border)] hover:border-gray-500 text-gray-300 text-xs rounded-lg transition-colors"
            >
              {p.icon} {t(`chat.phrases.${p.key}` as never)}
            </button>
          ))}
        </div>

        <div className="h-48 overflow-y-auto bg-[var(--brand-dark)] rounded-xl p-3 space-y-2">
          {messages.length === 0 && (
            <p className="text-gray-600 text-sm text-center py-4">{t('coop.noMessages')}</p>
          )}
          {messages.map(msg => {
            const isMe = msg.user_id === userId
            return (
              <div key={msg.id} className={clsx('flex', isMe ? 'justify-end' : 'justify-start')}>
                <div className={clsx(
                  'max-w-xs px-3 py-2 rounded-xl text-sm',
                  isMe
                    ? 'bg-[var(--brand-blue)] text-white'
                    : 'bg-[var(--brand-panel)] border border-[var(--brand-border)] text-white'
                )}>
                  {!isMe && <p className="text-xs text-gray-400 mb-1">{msg.profiles?.username ?? t('coop.partnerDefault')}</p>}
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

/* ─── Per-Player Game Renderer ─── */

function GameForRole({ role, userId, difficulty, onComplete }: {
  role: string
  userId: string
  difficulty: Difficulty
  onComplete: (score: number) => void
}) {
  switch (role) {
    case 'drone_programmer':
      return <DroneGame userId={userId} missionNumber={1} difficulty={difficulty} isCompleted={false} onComplete={onComplete} />
    case 'robot_constructor':
      return <RobotGame userId={userId} missionNumber={1} difficulty={difficulty} isCompleted={false} onComplete={onComplete} />
    case 'entrepreneur':
      return <EntrepreneurGame userId={userId} missionNumber={1} difficulty={difficulty} isCompleted={false} onComplete={onComplete} />
    default:
      return <DroneGame userId={userId} missionNumber={1} difficulty={difficulty} isCompleted={false} onComplete={onComplete} />
  }
}
