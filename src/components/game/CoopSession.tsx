'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import clsx from 'clsx'
import DroneGame from '@/components/game/DroneGame'
import RobotGame from '@/components/game/RobotGame'
import EntrepreneurGame from '@/components/game/EntrepreneurGame'
import CoopTask from '@/components/coop/CoopTask'
import RoleIcon from '@/components/game/RoleIcon'
import CharacterAvatarPreview from '@/components/game/CharacterAvatarPreview'
import { parseAvatarConfig } from '@/lib/game/avatar-utils'
import { IconCoin, IconTrophy, IconHandshake, IconCoop } from '@/components/ui/SvgIcon'
import { completeCoopMission } from '@/lib/game/complete-coop-mission'
import type { CoopMissionResult } from '@/lib/game/complete-coop-mission'
import type { Difficulty } from '@/types/game'
import type { Role } from '@/types/database'
import { censorMessage } from '@/lib/game/chat-filter'

/* ─── Constants ─── */

const MAX_SCORE = 1000

const COOP3_MISSIONS = new Set([
  'coop_solar_farm', 'coop_bridge', 'coop_rescue',
  'coop_smart_district', 'coop_city_launch',
])

const MISSION_ROLES: Record<string, readonly string[]> = {
  city_infrastructure: ['drone_programmer', 'robot_constructor'],
  smart_farm: ['robot_constructor', 'entrepreneur'],
  startup_launch: ['entrepreneur', 'drone_programmer'],
  coop_solar_farm: ['drone_programmer', 'robot_constructor', 'entrepreneur'],
  coop_bridge: ['drone_programmer', 'robot_constructor', 'entrepreneur'],
  coop_rescue: ['drone_programmer', 'robot_constructor', 'entrepreneur'],
  coop_smart_district: ['drone_programmer', 'robot_constructor', 'entrepreneur'],
  coop_city_launch: ['drone_programmer', 'robot_constructor', 'entrepreneur'],
}

// Mission SVG icons (inline)
function MissionIcon({ template, size = 40 }: { template: string; size?: number }) {
  const icons: Record<string, JSX.Element> = {
    city_infrastructure: (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <rect x="4" y="16" width="8" height="20" rx="1" fill="#3B82F6" opacity="0.8" />
        <rect x="16" y="8" width="8" height="28" rx="1" fill="#60A5FA" />
        <rect x="28" y="12" width="8" height="24" rx="1" fill="#3B82F6" opacity="0.8" />
        <rect x="6" y="20" width="2" height="2" rx="0.5" fill="#FDE68A" />
        <rect x="6" y="26" width="2" height="2" rx="0.5" fill="#FDE68A" />
        <rect x="18" y="12" width="2" height="2" rx="0.5" fill="#FDE68A" />
        <rect x="18" y="18" width="2" height="2" rx="0.5" fill="#FDE68A" />
        <rect x="22" y="14" width="2" height="2" rx="0.5" fill="#FDE68A" />
        <rect x="30" y="16" width="2" height="2" rx="0.5" fill="#FDE68A" />
      </svg>
    ),
    smart_farm: (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <path d="M20 6 C14 6 8 12 8 20 L32 20 C32 12 26 6 20 6Z" fill="#22C55E" opacity="0.7" />
        <rect x="19" y="20" width="2" height="14" fill="#92400E" />
        <ellipse cx="20" cy="34" rx="14" ry="3" fill="#22C55E" opacity="0.3" />
        <circle cx="12" cy="28" r="2" fill="#22C55E" opacity="0.5" />
        <circle cx="28" cy="28" r="2" fill="#22C55E" opacity="0.5" />
        <circle cx="20" cy="12" r="4" fill="#F59E0B" opacity="0.6" />
      </svg>
    ),
    startup_launch: (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <path d="M20 4 L14 28 H26 Z" fill="#3B82F6" />
        <path d="M20 4 L18 20 H22 Z" fill="#60A5FA" opacity="0.6" />
        <rect x="16" y="28" width="8" height="4" rx="1" fill="#6B7280" />
        <path d="M17 32 L14 38 H16 L18 34" fill="#F59E0B" opacity="0.8" />
        <path d="M23 32 L26 38 H24 L22 34" fill="#F59E0B" opacity="0.8" />
        <path d="M19 32 L20 38 L21 32" fill="#EF4444" opacity="0.6" />
      </svg>
    ),
  }
  if (template.startsWith('coop_')) return <IconCoop size={size} />
  return icons[template] ?? <IconCoop size={size} />
}

// Country flags
const COUNTRY_FLAG_CODES: Record<string, string> = {
  SA: 'sa', RU: 'ru', IN: 'in', CN: 'cn', BR: 'br', ZA: 'za', EG: 'eg', AE: 'ae', IR: 'ir', ET: 'et',
}

function CountryFlag({ code }: { code: string }) {
  const flagCode = COUNTRY_FLAG_CODES[code?.toUpperCase()] ?? code?.toLowerCase()
  if (!flagCode) return null
  return (
    <Image
      src={`https://flagcdn.com/w40/${flagCode}.png`}
      alt={code}
      width={20}
      height={14}
      className="rounded-sm object-cover inline-block"
      unoptimized
    />
  )
}

function LockIcon({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect x="10" y="22" width="28" height="22" rx="4" fill="#F59E0B" />
      <rect x="14" y="26" width="20" height="14" rx="2" fill="#D97706" opacity="0.5" />
      <path d="M16 22 V16 C16 10.5 19.6 8 24 8 C28.4 8 32 10.5 32 16 V22" stroke="#D97706" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="24" cy="32" r="3" fill="#FEF3C7" />
      <rect x="23" y="33" width="2" height="4" rx="1" fill="#FEF3C7" />
    </svg>
  )
}

function ClockIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className="inline-block">
      <circle cx="8" cy="8" r="6.5" stroke="#9CA3AF" strokeWidth="1.5" />
      <path d="M8 4 V8 L10.5 10.5" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function TeamworkIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className="inline-block">
      <rect x="2" y="10" width="3" height="4" rx="0.5" fill="#A855F7" opacity="0.7" />
      <rect x="6.5" y="6" width="3" height="8" rx="0.5" fill="#A855F7" opacity="0.85" />
      <rect x="11" y="3" width="3" height="11" rx="0.5" fill="#A855F7" />
    </svg>
  )
}

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return '0:00'
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const COOP_REWARDS: Record<string, { xp: number; coins: number }> = {
  easy: { xp: 30, coins: 10 },
  medium: { xp: 60, coins: 25 },
  hard: { xp: 120, coins: 50 },
}

const PRESET_PHRASES = [
  { key: 'hello', icon: '👋' },
  { key: 'great', icon: '🌟' },
  { key: 'myTurn', icon: '▶️' },
  { key: 'done', icon: '✅' },
  { key: 'nice', icon: '👍' },
  { key: 'wait', icon: '⏳' },
  { key: 'thanks', icon: '🙏' },
]

const ROLE_COLORS: Record<string, string> = {
  drone_programmer: 'border-cyan-500/40 bg-cyan-900/20',
  robot_constructor: 'border-orange-500/40 bg-orange-900/20',
  entrepreneur: 'border-purple-500/40 bg-purple-900/20',
}

/* ─── Types ─── */

interface Participant {
  user_id: string
  role: string
  is_completed: boolean
  score?: number
  last_active_at?: string
  profiles?: { username: string; country: string; avatar_color?: string; avatar_accessory?: string }
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
    created_at: string
    expires_at?: string | null
  }
  participants: Participant[]
  initialMessages: Message[]
}

/* ─── Component ─── */

export default function CoopSession({ userId, session, participants, initialMessages }: CoopSessionProps) {
  const t = useTranslations()
  const locale = useLocale()
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [allParts, setAllParts] = useState<Participant[]>(participants)
  const [sessionStatus, setSessionStatus] = useState(session.status)

  const [myBestScore, setMyBestScore] = useState<number | null>(() => {
    const myP = participants.find(p => p.user_id === userId)
    return myP?.score ?? null
  })
  const [isPlaying, setIsPlaying] = useState(false)
  const [showMyResult, setShowMyResult] = useState(false)
  const [lastScore, setLastScore] = useState<number>(0)
  const [coopResult, setCoopResult] = useState<CoopMissionResult | null>(null)
  const [rewardsProcessing, setRewardsProcessing] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [inactivityDismissed, setInactivityDismissed] = useState(false)

  // 5-day deadline — timer only runs after session becomes active
  const MISSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000
  const expiresAt = session.expires_at
    ? new Date(session.expires_at).getTime()
    : new Date(session.created_at).getTime() + MISSION_DURATION_MS
  const [timeLeft, setTimeLeft] = useState<number | null>(null) // null = not yet mounted
  const isExpired = timeLeft !== null && timeLeft <= 0
  const [mounted, setMounted] = useState(false)

  // Countdown timer — ticks when active, or when waiting with expires_at already set (reopened session)
  const hasExpiry = !!session.expires_at
  useEffect(() => {
    setMounted(true)
    if (sessionStatus === 'completed' || sessionStatus === 'abandoned') {
      setTimeLeft(0)
      return
    }
    // If waiting and never activated (no expires_at) — show static text, no countdown
    if (sessionStatus === 'waiting' && !hasExpiry) {
      setTimeLeft(Math.max(0, expiresAt - Date.now()))
      return
    }
    // Active, or waiting-with-expiry (reopened after replacing inactive players) — tick
    setTimeLeft(Math.max(0, expiresAt - Date.now()))
    const interval = setInterval(() => {
      setTimeLeft(Math.max(0, expiresAt - Date.now()))
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt, sessionStatus, hasExpiry])

  // Update last_active_at when player opens the session
  useEffect(() => {
    supabase.from('coop_participants')
      .update({ last_active_at: new Date().toISOString() })
      .eq('coop_session_id', session.id)
      .eq('user_id', userId)
      .then(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id, userId])

  const difficulty: Difficulty = (session.difficulty as Difficulty) || 'medium'
  const isCoop3 = COOP3_MISSIONS.has(session.mission_template)
  const missionRoles = MISSION_ROLES[session.mission_template] ?? ['drone_programmer', 'robot_constructor', 'entrepreneur']
  const requiredPlayers = missionRoles.length
  const myPart = allParts.find(p => p.user_id === userId)
  const partners = allParts.filter(p => p.user_id !== userId)
  const myRole = myPart?.role ?? 'drone_programmer'
  const myDone = myPart?.is_completed ?? false // has played at least once
  const isWaiting = sessionStatus === 'waiting'
  const isCompleted = sessionStatus === 'completed'
  const isCreator = session.created_by === userId
  const isActive = sessionStatus === 'active'

  // Partner inactivity detection: 48+ hours since session started AND score = 0
  const INACTIVITY_THRESHOLD_MS = 48 * 60 * 60 * 1000
  const sessionAge = Date.now() - new Date(session.created_at).getTime()
  const inactivePartners = partners.filter(p => {
    // Inactive = session is 48h+ old AND player never completed (score 0 or null)
    return sessionAge >= INACTIVITY_THRESHOLD_MS && (!p.score || p.score === 0) && !p.is_completed
  })
  const hasInactivePartners = inactivePartners.length > 0
  const showInactivityBanner = isActive && isCreator && hasInactivePartners && !inactivityDismissed

  const allMaxScore = allParts.length >= requiredPlayers && allParts.every(p => p.score === MAX_SCORE)

  const navigateTo = useCallback((path: string) => {
    const prefix = locale === 'ru' ? '' : `/${locale}`
    window.location.href = `${prefix}${path}`
  }, [locale])

  // Replace inactive partners: kick them from session, reopen for new players
  const [replacingPartners, setReplacingPartners] = useState(false)
  const handleReplaceInactive = useCallback(async () => {
    setReplacingPartners(true)
    // Delete inactive participants from the session
    const inactiveIds = inactivePartners.map(p => p.user_id)
    for (const pid of inactiveIds) {
      await supabase.from('coop_participants')
        .delete()
        .eq('coop_session_id', session.id)
        .eq('user_id', pid)
    }
    // Reopen session to 'waiting' so new players can join
    await supabase.from('coop_sessions')
      .update({ status: 'waiting' })
      .eq('id', session.id)
    setSessionStatus('waiting')
    setAllParts(prev => prev.filter(p => !inactiveIds.includes(p.user_id)))
    setReplacingPartners(false)
    setInactivityDismissed(true)
  }, [supabase, session.id, inactivePartners])

  const leaveSession = useCallback(async () => {
    setLeaving(true)
    if (isCreator) {
      await supabase.from('coop_sessions').update({ status: 'abandoned' }).eq('id', session.id)
    } else {
      await supabase.from('coop_participants').delete().eq('coop_session_id', session.id).eq('user_id', userId)
    }
    navigateTo('/coop')
  }, [supabase, session.id, userId, isCreator, navigateTo])

  // Finish session (creator action or auto on timer/max scores)
  const finishSession = useCallback(async () => {
    setFinishing(true)
    // Mark all participants who haven't played as completed with score 0
    await supabase.from('coop_participants').update({ is_completed: true, score: 0 })
      .eq('coop_session_id', session.id).eq('is_completed', false)
    await supabase.from('coop_sessions').update({ status: 'completed' }).eq('id', session.id)
    setSessionStatus('completed')
    setAllParts(prev => prev.map(p => p.is_completed ? p : { ...p, is_completed: true, score: 0 }))
    setFinishing(false)
  }, [supabase, session.id])

  // Auto-finish: timer expired
  useEffect(() => {
    if (!isExpired || isCompleted || sessionStatus === 'abandoned' || rewardsProcessing || coopResult) return
    finishSession()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpired, sessionStatus])

  // Auto-finish: all players have max score
  useEffect(() => {
    if (!allMaxScore || isCompleted || sessionStatus === 'abandoned' || isWaiting) return
    finishSession()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMaxScore, sessionStatus])

  const rewards = COOP_REWARDS[difficulty] ?? COOP_REWARDS.medium

  const prevMessageCountRef = useRef(messages.length)
  useEffect(() => {
    // Only scroll chat when new messages are actually added, not on every poll
    if (messages.length > prevMessageCountRef.current) {
      const el = messagesEndRef.current
      if (el?.parentElement) {
        el.parentElement.scrollTop = el.parentElement.scrollHeight
      }
    }
    prevMessageCountRef.current = messages.length
  }, [messages])

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`coop:${session.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `coop_session_id=eq.${session.id}`,
      }, async (payload) => {
        const newMsg = payload.new as Message
        // Skip if already in state (from sendMessage or previous realtime)
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev
          return prev
        })
        // Fetch username for the sender
        const { data: prof } = await supabase.from('profiles').select('username').eq('id', newMsg.user_id).single()
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev
          return [...prev, { ...newMsg, profiles: prof ?? undefined }]
        })
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'coop_participants',
        filter: `coop_session_id=eq.${session.id}`,
      }, async (payload) => {
        const newPart = payload.new as Participant
        let newCount = 0
        setAllParts(prev => {
          if (prev.some(p => p.user_id === newPart.user_id)) { newCount = prev.length; return prev }
          const next = [...prev, newPart]
          newCount = next.length
          return next
        })
        const { data: prof } = await supabase.from('profiles').select('username, country, avatar_color, avatar_accessory').eq('id', newPart.user_id).single()
        if (prof) {
          setAllParts(prev => prev.map(p => p.user_id === newPart.user_id ? { ...p, profiles: prof } : p))
        }
        // Auto-activate session if enough players joined (safety net)
        setSessionStatus(prev => {
          if (prev !== 'waiting') return prev
          const mRoles = MISSION_ROLES[session.mission_template] ?? ['drone_programmer', 'robot_constructor', 'entrepreneur']
          if (newCount >= mRoles.length) {
            const expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
            supabase.from('coop_sessions').update({ status: 'active', expires_at: expiresAt }).eq('id', session.id)
            return 'active'
          }
          return prev
        })
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'coop_participants',
        filter: `coop_session_id=eq.${session.id}`,
      }, (payload) => {
        const updated = payload.new as Participant
        setAllParts(prev => prev.map(p => p.user_id === updated.user_id ? { ...p, ...updated } : p))
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'coop_participants',
        filter: `coop_session_id=eq.${session.id}`,
      }, (payload) => {
        const removed = payload.old as { user_id?: string }
        if (removed.user_id) {
          setAllParts(prev => prev.filter(p => p.user_id !== removed.user_id))
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'coop_sessions',
        filter: `id=eq.${session.id}`,
      }, (payload) => {
        setSessionStatus((payload.new as { status: string }).status)
      })
      .on('broadcast', { event: 'score_update' }, (payload) => {
        const data = payload.payload as { user_id: string; score: number }
        if (data.user_id !== userId) {
          setAllParts(prev => prev.map(p =>
            p.user_id === data.user_id
              ? { ...p, is_completed: true, score: Math.max(p.score ?? 0, data.score) }
              : p
          ))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id, userId])

  // Polling fallback: fetch messages & participants every 10s in case realtime is blocked by RLS
  useEffect(() => {
    if (isCompleted) return
    const interval = setInterval(async () => {
      const { data: freshMsgs } = await supabase
        .from('chat_messages')
        .select('*, profiles(username)')
        .eq('coop_session_id', session.id)
        .order('created_at', { ascending: true })
        .limit(100)
      if (freshMsgs) {
        setMessages(freshMsgs)
      }
      const { data: freshParts } = await supabase
        .from('coop_participants')
        .select('*, profiles(username, country, avatar_color, avatar_accessory)')
        .eq('coop_session_id', session.id)
      if (freshParts && freshParts.length > 0) {
        setAllParts(freshParts)
      }
    }, 10000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id, isCompleted])

  // Process rewards when session is completed
  useEffect(() => {
    if (!isCompleted || coopResult || rewardsProcessing) return
    const myScore = myBestScore ?? (myPart?.score ?? 0)
    const otherScores = allParts.filter(p => p.user_id !== userId).map(p => p.score ?? 0)
    if (otherScores.length < requiredPlayers - 1) return
    setRewardsProcessing(true)
    const allScores = [myScore, ...otherScores]
    completeCoopMission(session.id, myScore, allScores)
      .then(result => setCoopResult(result))
      .catch(err => {
        console.error('Failed to process coop rewards:', err)
        const avgScore = allScores.reduce((a, b) => a + b, 0) / allScores.length
        const totalFallback = allScores.reduce((a, b) => a + b, 0)
        const maxFallback = allScores.length * 1000
        setCoopResult({
          baseXp: 0, baseCoins: 0,
          bonusXp: Math.round(avgScore * 0.3), bonusCoins: Math.round(avgScore * 0.15),
          totalXp: Math.round(avgScore * 0.3), totalCoins: Math.round(avgScore * 0.15),
          stars: 0, totalSessionScore: totalFallback, maxSessionScore: maxFallback, nearMiss: null,
          isFirstCompletion: false, coopMissionsCompleted: 0, unlockedAchievements: [], competencyBoosts: [],
        })
      })
      .finally(() => setRewardsProcessing(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCompleted, coopResult, rewardsProcessing, allParts])

  const sendMessage = useCallback(async (content: string, isPreset = false) => {
    const safeContent = isPreset ? content : censorMessage(content)
    const { data: inserted } = await supabase.from('chat_messages').insert({
      coop_session_id: session.id, user_id: userId, content: safeContent, is_preset: isPreset,
    }).select('*').single()
    // Add sent message to local state immediately (with real server data)
    if (inserted) {
      const myUsername = allParts.find(p => p.user_id === userId)?.profiles?.username ?? ''
      setMessages(prev => {
        if (prev.some(m => m.id === inserted.id)) return prev
        return [...prev, { ...inserted, profiles: { username: myUsername } }]
      })
    }
    // Update activity timestamp on message send
    await supabase.from('coop_participants')
      .update({ last_active_at: new Date().toISOString() })
      .eq('coop_session_id', session.id)
      .eq('user_id', userId)
  }, [supabase, session.id, userId, allParts])

  // Called when player completes a game attempt
  const handleGameComplete = useCallback(async (score: number) => {
    const bestScore = Math.max(myBestScore ?? 0, score)
    setMyBestScore(bestScore)
    setLastScore(score)
    setIsPlaying(false)
    setShowMyResult(true)

    // Update DB with best score
    await supabase.from('coop_participants')
      .update({ is_completed: true, score: bestScore })
      .eq('coop_session_id', session.id).eq('user_id', userId)

    // Broadcast score to other players
    supabase.channel(`coop:${session.id}`).send({
      type: 'broadcast', event: 'score_update',
      payload: { user_id: userId, score: bestScore },
    })

    // Send chat message on first completion
    if (!myDone) {
      await sendMessage(t('chat.phrases.done'), true)
    }

    setAllParts(prev => prev.map(p =>
      p.user_id === userId ? { ...p, is_completed: true, score: bestScore } : p
    ))
  }, [session.id, userId, myBestScore, myDone, supabase, t, sendMessage])

  /* ─── Results Screen ─── */
  if (isCompleted && coopResult) {
    const myFinalScore = myBestScore ?? (myPart?.score ?? 0)
    const otherScores = allParts.filter(p => p.user_id !== userId).map(p => p.score ?? 0)
    const totalScore = coopResult.totalSessionScore
    const maxScore = coopResult.maxSessionScore
    const stars = coopResult.stars

    return (
      <div className="space-y-6">
        <div className="bg-[var(--brand-panel)] border border-green-500/40 rounded-2xl p-8 text-center">
          <div className="flex justify-center mb-4"><IconHandshake size={64} /></div>
          <h2 className="text-2xl font-black text-white mb-2">{t('coop.missionComplete')}</h2>

          {/* Stars display */}
          <div className="flex justify-center gap-1 mb-4">
            {[1, 2, 3].map(i => (
              <svg key={i} width={40} height={40} viewBox="0 0 24 24" className={i <= stars ? 'text-yellow-400' : 'text-gray-600'}>
                <path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
          </div>
          {coopResult.nearMiss && (
            <p className="text-yellow-400/70 text-sm mb-4">
              {t('coop.nearMiss', { points: coopResult.nearMiss.points, stars: coopResult.nearMiss.starLevel })}
            </p>
          )}

          {/* Total team score */}
          <div className="mb-6">
            <p className="text-4xl font-black text-[var(--brand-gold)]">{totalScore}</p>
            <p className="text-gray-500 text-sm">/ {maxScore}</p>
          </div>

          <div className={clsx('grid gap-4 max-w-lg mx-auto mb-6', isCoop3 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2')}>
            <div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <RoleIcon role={myRole as Role} size={20} />
                <p className="text-xs text-gray-400 uppercase font-bold">{t('coop.yourScore')}</p>
              </div>
              <p className="text-2xl font-black text-white">{myFinalScore}</p>
              <p className="text-xs text-gray-500">/ {MAX_SCORE}</p>
            </div>
            {partners.map((p, i) => (
              <div key={p.user_id}>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <RoleIcon role={p.role as Role} size={20} />
                  <p className="text-xs text-gray-400 uppercase font-bold">{p.profiles?.username ?? `${t('coop.partnerDefault')} ${i + 1}`}</p>
                </div>
                <p className="text-2xl font-black text-white">{p.score ?? 0}</p>
                <p className="text-xs text-gray-500">/ {MAX_SCORE}</p>
              </div>
            ))}
          </div>

          <div className="max-w-sm mx-auto space-y-2 mb-6">
            {coopResult.isFirstCompletion && coopResult.baseXp > 0 && (
              <p className="text-blue-400 font-medium text-sm">+{coopResult.baseXp} XP {t('coop.baseReward')}</p>
            )}
            {coopResult.bonusXp > 0 && (
              <p className="text-green-400 font-bold text-lg">{t('coop.bonusXP', { xp: coopResult.bonusXp })}</p>
            )}
            <p className="text-white font-black text-xl">
              +{coopResult.totalXp} XP
            </p>
            <p className="text-yellow-400 font-bold flex items-center justify-center gap-1">
              <IconCoin size={18} /> +{coopResult.totalCoins} {t('coop.coinsLabel')}
            </p>
            {coopResult.competencyBoosts && coopResult.competencyBoosts.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {coopResult.competencyBoosts.map(b => (
                  <span key={b.axis} className="text-xs px-2 py-1 rounded-lg bg-purple-900/30 border border-purple-500/20 text-purple-400">
                    {t(`coop.skills.${b.axis}` as never)} +{b.amount}
                  </span>
                ))}
              </div>
            )}
          </div>

          {coopResult.unlockedAchievements.length > 0 && (
            <div className="max-w-sm mx-auto mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
              <p className="text-yellow-400 font-bold text-sm mb-2">{t('coop.newAchievements')}</p>
              {coopResult.unlockedAchievements.map(ach => (
                <p key={ach} className="text-white text-sm flex items-center gap-1">
                  <IconTrophy size={16} /> {t(`coop.achievements.${ach}` as never)}
                </p>
              ))}
            </div>
          )}

          <button onClick={() => navigateTo('/coop')} className="px-6 py-3 bg-[var(--brand-blue)] text-white font-bold rounded-xl hover:opacity-90 transition-opacity">
            {t('coop.backToLobby')}
          </button>
        </div>
      </div>
    )
  }

  /* ─── Waiting for rewards ─── */
  if (isCompleted && !coopResult) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">{t('coop.calculatingRewards')}</p>
        </div>
      </div>
    )
  }

  /* ─── Individual Mission Result (after player finishes their task) ─── */
  if (showMyResult && !isCompleted) {
    const isNewBest = lastScore >= (myBestScore ?? 0)
    const othersDone = allParts.filter(p => p.user_id !== userId).every(p => p.is_completed)
    const othersCount = allParts.filter(p => p.user_id !== userId && p.is_completed).length
    const totalPartners = allParts.length - 1

    return (
      <div className="space-y-6">
        <div className="bg-[var(--brand-panel)] border border-green-500/40 rounded-2xl p-8 text-center">
          <div className="flex justify-center mb-4">
            <RoleIcon role={myRole as Role} size={64} />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">{t('coop.myMissionComplete')}</h2>

          <div className="text-5xl font-black text-[var(--brand-gold)] mb-1" style={{ textShadow: '0 0 20px rgba(245, 158, 11, 0.3)' }}>
            {lastScore}
          </div>
          <p className="text-gray-500 text-sm mb-4">/ {MAX_SCORE}</p>

          {isNewBest && myBestScore != null && lastScore > 0 && (
            <p className="text-blue-400 font-bold text-sm mb-2">{t('coop.newBestScore')}</p>
          )}

          {/* Team status */}
          <div className="max-w-sm mx-auto mb-6 p-4 bg-[var(--brand-dark)] rounded-xl border border-[var(--brand-border)]">
            <p className="text-sm text-gray-400 mb-2">{t('coop.teamStatus')}</p>
            <div className="flex justify-center gap-3">
              {allParts.map(p => (
                <div key={p.user_id} className="flex flex-col items-center gap-1">
                  <div className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center border-2',
                    p.is_completed ? 'border-green-500 bg-green-900/30' : 'border-gray-600 bg-[var(--brand-dark)]'
                  )}>
                    <RoleIcon role={p.role as Role} size={16} />
                  </div>
                  <span className="text-[10px] text-gray-500">
                    {p.user_id === userId ? t('coop.you') : (p.profiles?.username ?? '?')}
                  </span>
                  {p.is_completed && <span className="text-green-400 text-[10px]">✓</span>}
                </div>
              ))}
            </div>
            {!othersDone && (
              <p className="text-xs text-gray-500 mt-3">
                {t('coop.waitingForTeam', { done: othersCount, total: totalPartners })}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3">
            {lastScore < MAX_SCORE && (
              <button
                onClick={() => { setShowMyResult(false); setIsPlaying(true) }}
                className="px-6 py-3 bg-[var(--brand-panel)] border border-[var(--brand-blue)] text-[var(--brand-blue)] font-bold rounded-xl hover:bg-[var(--brand-blue)] hover:text-white transition-colors"
              >
                {t('coop.retryMission')}
              </button>
            )}
            <button
              onClick={() => setShowMyResult(false)}
              className="px-6 py-3 bg-[var(--brand-blue)] text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
            >
              {t('coop.viewTeamProgress')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ─── Main Game View ─── */
  return (
    <div className="space-y-6">
      {/* Mission header */}
      <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <MissionIcon template={session.mission_template} size={48} />
          <div className="flex-1">
            <h1 className="text-2xl font-black text-white mb-1">{t(`coop.templates.${session.mission_template}`)}</h1>
            <p className="text-gray-400 text-sm mb-3">
              {t(`coop.missionDesc_${session.mission_template}` as never, { defaultValue: t('coop.missionDescDefault') })}
            </p>
            <div className="flex flex-wrap gap-3">
              <span className={clsx(
                'text-xs px-3 py-1 rounded-lg flex items-center gap-1 font-mono font-bold',
                isExpired ? 'bg-red-900/30 text-red-400 border border-red-500/30' :
                timeLeft !== null && timeLeft < 24 * 60 * 60 * 1000 ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/30' :
                'bg-[var(--brand-dark)] text-gray-400'
              )}>
                <ClockIcon size={14} /> {!mounted ? '...' : (isWaiting && !hasExpiry) ? t('coop.timerAfterStart') : isExpired ? t('coop.timeExpired') : formatTimeRemaining(timeLeft ?? 0)}
              </span>
              <span className="text-xs bg-[var(--brand-dark)] text-yellow-400 px-3 py-1 rounded-lg flex items-center gap-1">
                <IconTrophy size={14} /> +{rewards.xp} XP
              </span>
              <span className="text-xs bg-[var(--brand-dark)] text-yellow-400 px-3 py-1 rounded-lg flex items-center gap-1">
                <IconCoin size={14} /> +{rewards.coins} {t('coop.coinsLabel')}
              </span>
              <span className="text-xs bg-[var(--brand-dark)] text-purple-400 px-3 py-1 rounded-lg flex items-center gap-1">
                <TeamworkIcon size={14} /> {t('coop.teamworkSkill')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Team Roster ─── */}
      <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <IconCoop size={18} /> {t('coop.teamRoster')} ({allParts.length}/{requiredPlayers})
        </h3>
        <div className={clsx('grid gap-3', requiredPlayers === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2')}>
          {allParts.map(p => {
            const isMe = p.user_id === userId
            const hasMaxScore = p.score === MAX_SCORE
            return (
              <div key={p.user_id} className={clsx(
                'border rounded-xl p-4 transition-all',
                isMe ? 'border-[var(--brand-blue)] bg-blue-900/10' :
                hasMaxScore ? 'border-green-500/40 bg-green-900/10' :
                p.is_completed ? 'border-yellow-500/30 bg-yellow-900/5' :
                ROLE_COLORS[p.role] ?? 'border-[var(--brand-border)] bg-[var(--brand-dark)]'
              )}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                    <CharacterAvatarPreview
                      avatarColor={p.profiles?.avatar_color ?? '#1E90FF'}
                      avatarConfig={parseAvatarConfig(p.profiles?.avatar_accessory)}
                      size={40}
                      animated={false}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm truncate">
                      {p.profiles?.username ?? (isMe ? t('coop.you') : t('coop.partnerDefault'))}
                      {isMe && <span className="text-[var(--brand-blue)] ml-1">({t('coop.you')})</span>}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <RoleIcon role={p.role as Role} size={16} />
                      <span>{t(`coop.roleLabels.${p.role}` as never)}</span>
                      {p.profiles?.country && (
                        <span className="ml-1"><CountryFlag code={p.profiles.country} /></span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {p.score != null && p.is_completed ? (
                      <div>
                        <p className={clsx('font-black text-lg', hasMaxScore ? 'text-green-400' : 'text-yellow-400')}>
                          {p.score}
                        </p>
                        <p className="text-xs text-gray-500">/ {MAX_SCORE}</p>
                      </div>
                    ) : isWaiting ? (
                      <span className="text-xs text-gray-500">{t('coop.waitingLabel')}</span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                        <span className="text-xs text-yellow-400">{t('coop.playing')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Empty slots */}
          {Array.from({ length: requiredPlayers - allParts.length }, (_, i) => {
            const takenRoles = new Set(allParts.map(p => p.role))
            const freeRolesList = [...missionRoles].filter(r => !takenRoles.has(r))
            const freeRole = freeRolesList[i]
            return (
              <div key={`empty-${i}`} className="border border-dashed border-[var(--brand-border)] rounded-xl p-4 opacity-60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--brand-dark)] flex items-center justify-center text-gray-600">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="8" r="3" stroke="#6B7280" strokeWidth="1.5"/><path d="M4 18 C4 14 7 12 10 12 C13 12 16 14 16 18" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-500 text-sm">{t('coop.emptySlot')}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      {freeRole && <RoleIcon role={freeRole as Role} size={14} />}
                      <span>{freeRole ? t(`coop.roleLabels.${freeRole}` as never) : t('coop.anyRole')}</span>
                    </div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-gray-600 animate-pulse" />
                </div>
              </div>
            )
          })}
        </div>

        {/* Creator: finish session button */}
        {isCreator && !isWaiting && allParts.some(p => p.is_completed) && (
          <div className="mt-4 pt-4 border-t border-[var(--brand-border)]">
            <button onClick={finishSession} disabled={finishing}
              className="w-full px-4 py-3 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
              <IconTrophy size={18} />
              {finishing ? '...' : t('coop.finishSession')}
            </button>
            <p className="text-xs text-gray-500 text-center mt-2">{t('coop.finishSessionHint')}</p>
          </div>
        )}
      </div>

      {/* ─── Partner Inactivity Warning (creator only) ─── */}
      {showInactivityBanner && (
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mt-0.5">
              <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div className="flex-1">
              <p className="text-yellow-400 font-bold text-sm mb-1">
                {t('coop.partnerInactiveWarning', { count: inactivePartners.length })}
              </p>
              <div className="mb-3 space-y-1">
                {inactivePartners.map(p => (
                  <div key={p.user_id} className="flex items-center gap-2 text-xs text-gray-400">
                    <RoleIcon role={p.role as Role} size={14} />
                    <span>{p.profiles?.username ?? '?'}</span>
                    <span className="text-red-400">— {t('coop.noActivity')}</span>
                  </div>
                ))}
              </div>
              <p className="text-gray-400 text-xs mb-3">{t('coop.replaceInactiveDesc')}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleReplaceInactive}
                  disabled={replacingPartners}
                  className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {replacingPartners ? '...' : t('coop.replaceInactive', { count: inactivePartners.length })}
                </button>
                <button
                  onClick={() => setInactivityDismissed(true)}
                  className="px-4 py-2 text-gray-400 border border-[var(--brand-border)] text-sm rounded-xl hover:text-white transition-colors"
                >
                  {t('coop.continueWaiting')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Waiting for team (locked mission) ─── */}
      {isWaiting && (
        <div className="bg-[var(--brand-panel)] border border-yellow-500/20 rounded-2xl p-6">
          <div className="text-center">
            <div className="flex justify-center mb-3"><LockIcon size={48} /></div>
            <h3 className="text-lg font-bold text-yellow-400 mb-2">{t('coop.teamNotReady')}</h3>
            <p className="text-gray-400 text-sm max-w-md mx-auto mb-4">
              {t('coop.teamNotReadyDesc', { needed: requiredPlayers - allParts.length })}
            </p>
            <div className="bg-[var(--brand-dark)] rounded-xl p-4 max-w-sm mx-auto">
              <p className="text-xs text-gray-500 uppercase font-bold mb-3">{t('coop.missionPreview')}</p>
              <div className={clsx('grid gap-4', requiredPlayers === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
                {[...missionRoles].map(role => (
                  <div key={role} className="flex flex-col items-center text-center">
                    <div className="opacity-40"><RoleIcon role={role as Role} size={36} /></div>
                    <p className="text-xs text-gray-500 mt-1">{t(`coop.roleLabels.${role}` as never)}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-3">{t('coop.asyncReminder')}</p>
            </div>
          </div>
          <div className="flex justify-center gap-3 mt-4">
            <button onClick={leaveSession} disabled={leaving}
              className="px-4 py-2 text-red-400 hover:text-red-300 border border-red-400/30 hover:border-red-400/60 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {leaving ? '...' : isCreator ? t('coop.cancelSession') : t('coop.leaveSession')}
            </button>
            <button onClick={() => navigateTo('/coop')} className="px-4 py-2 text-gray-400 hover:text-white border border-[var(--brand-border)] rounded-lg text-sm transition-colors">
              ← {t('coop.backToLobby')}
            </button>
          </div>
        </div>
      )}

      {/* ─── Active game area ─── */}
      {!isWaiting && isPlaying && (
        <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <p className="text-sm font-bold text-green-400">{t('coop.missionActive')}</p>
            {myBestScore != null && (
              <span className="text-xs text-gray-500 ml-auto">{t('coop.bestScore')}: {myBestScore}/{MAX_SCORE}</span>
            )}
          </div>
          {isCoop3 ? (
            <CoopTask
              missionId={session.mission_template}
              role={myRole as 'drone_programmer' | 'robot_constructor' | 'entrepreneur'}
              onComplete={(score, resultData) => {
                supabase.from('coop_participants').update({ progress: resultData })
                  .eq('coop_session_id', session.id).eq('user_id', userId)
                  .then(() => handleGameComplete(score))
              }}
              otherResults={partners.filter(p => p.is_completed).map(() => ({}))}
            />
          ) : (
            <GameForRole role={myRole} userId={userId} difficulty={difficulty} onComplete={handleGameComplete} />
          )}
        </div>
      )}

      {/* ─── Play / Replay controls ─── */}
      {!isWaiting && !isPlaying && (
        <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl p-6">
          {myBestScore != null ? (
            // Already played — show score + replay option
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-2">{t('coop.yourBestScore')}</p>
              <p className={clsx('text-4xl font-black mb-1', myBestScore === MAX_SCORE ? 'text-green-400' : 'text-yellow-400')}>
                {myBestScore} <span className="text-lg text-gray-500">/ {MAX_SCORE}</span>
              </p>
              {myBestScore < MAX_SCORE ? (
                <>
                  <p className="text-gray-500 text-sm mb-4">{t('coop.canImprove')}</p>
                  <button onClick={() => setIsPlaying(true)}
                    className="px-6 py-3 bg-[var(--brand-blue)] text-white font-bold rounded-xl hover:opacity-90 transition-opacity">
                    {t('coop.retryMission')}
                  </button>
                </>
              ) : (
                <p className="text-green-400 text-sm font-bold mt-2">{t('coop.maxScoreReached')}</p>
              )}
            </div>
          ) : (
            // First time — start mission
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <p className="text-sm font-bold text-green-400">{t('coop.missionActive')}</p>
              </div>
              <p className="text-gray-400 text-sm mb-4">{t('coop.startYourPart')}</p>
              <button onClick={() => setIsPlaying(true)}
                className="px-6 py-3 bg-[var(--brand-blue)] text-white font-bold rounded-xl hover:opacity-90 transition-opacity">
                {t('coop.startMission')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── Chat ─── */}
      <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 3h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H5l-3 3V4a1 1 0 0 1 1-1z" fill="#3B82F6" opacity="0.7"/></svg>
          {t('coop.teamChat')}
        </h3>

        <div className="flex flex-wrap gap-2 mb-3">
          {PRESET_PHRASES.map(p => (
            <button key={p.key} onClick={() => sendMessage(t(`chat.phrases.${p.key}` as never), true)}
              className="px-3 py-1.5 bg-[var(--brand-dark)] border border-[var(--brand-border)] hover:border-gray-500 text-gray-300 text-xs rounded-lg transition-colors">
              {p.icon} {t(`chat.phrases.${p.key}` as never)}
            </button>
          ))}
        </div>

        <ChatInput onSend={(text) => sendMessage(text, false)} t={t} />

        <div className="h-48 overflow-y-auto overflow-x-hidden bg-[var(--brand-dark)] rounded-xl p-3 space-y-2">
          {messages.length === 0 && (
            <p className="text-gray-600 text-sm text-center py-4">{t('coop.noMessages')}</p>
          )}
          {messages.map(msg => {
            const isMe = msg.user_id === userId
            // Client-side censoring as extra safety for free-text messages
            const displayContent = msg.is_preset ? msg.content : censorMessage(msg.content)
            return (
              <div key={msg.id} className={clsx('flex', isMe ? 'justify-end' : 'justify-start')}>
                <div className={clsx(
                  'max-w-xs px-3 py-2 rounded-xl text-sm',
                  isMe ? 'bg-[var(--brand-blue)] text-white' : 'bg-[var(--brand-panel)] border border-[var(--brand-border)] text-white'
                )}>
                  {!isMe && <p className="text-xs text-gray-400 mb-1">{msg.profiles?.username ?? t('coop.partnerDefault')}</p>}
                  <p>{displayContent}</p>
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

/* ─── Chat Text Input ─── */

const MAX_MESSAGE_LENGTH = 200

function ChatInput({ onSend, t }: { onSend: (text: string) => Promise<void> | void; t: ReturnType<typeof useTranslations> }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    try {
      await onSend(trimmed)
      setText('')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex gap-2 mb-3">
      <input
        type="text"
        value={text}
        onChange={e => setText(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
        onKeyDown={handleKeyDown}
        placeholder={t('chat.typeMessage')}
        maxLength={MAX_MESSAGE_LENGTH}
        disabled={sending}
        className="flex-1 px-3 py-2 bg-[var(--brand-dark)] border border-[var(--brand-border)] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[var(--brand-blue)] transition-colors disabled:opacity-50"
      />
      <button
        onClick={handleSend}
        disabled={!text.trim() || sending}
        className="px-4 py-2 bg-[var(--brand-blue)] text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {t('chat.send')}
      </button>
    </div>
  )
}

/* ─── Per-Player Game Renderer ─── */

function GameForRole({ role, userId, difficulty, onComplete }: {
  role: string; userId: string; difficulty: Difficulty; onComplete: (score: number) => void
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
