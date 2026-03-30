'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import clsx from 'clsx'
import RoleIcon from '@/components/game/RoleIcon'
import { IconCoop, IconCoin, IconTrophy } from '@/components/ui/SvgIcon'
import type { Difficulty } from '@/types/game'
import type { Role } from '@/types/database'

interface CompletedCoopMission {
  mission_template: string
  stars: number
  score: number
}

interface RecentlyCompletedSession {
  id: string
  mission_template: string
  difficulty?: string
  updated_at: string
  coop_participants?: { user_id: string; role: string; is_completed: boolean; score?: number; profiles?: { username: string } | { username: string }[] | null }[]
}

interface CoopLobbyProps {
  userId: string
  username: string
  mySessions: CoopSessionRow[]
  openSessions: OpenSessionRow[]
  completedMissions: CompletedCoopMission[]
  recentlyCompleted: RecentlyCompletedSession[]
}

interface CoopSessionRow {
  id: string
  status: string
  mission_template: string
  difficulty?: string
  created_by: string
  created_at: string
  coop_participants?: { user_id: string; role: string; is_completed: boolean }[]
}

interface OpenSessionParticipant {
  user_id: string
  role: string
  profiles?: { username: string; country: string } | null
}

interface OpenSessionRow {
  id: string
  mission_template: string
  difficulty?: string
  created_at: string
  profiles?: { username: string; country: string } | null
  coop_participants?: OpenSessionParticipant[]
}

const MISSION_TYPES = [
  { id: 'city_infrastructure', difficulty: 'easy' as Difficulty },
  { id: 'smart_farm', difficulty: 'easy' as Difficulty },
  { id: 'startup_launch', difficulty: 'medium' as Difficulty },
  { id: 'coop_solar_farm', isCoop3: true, difficulty: 'easy' as Difficulty },
  { id: 'coop_bridge', isCoop3: true, difficulty: 'medium' as Difficulty },
  { id: 'coop_rescue', isCoop3: true, difficulty: 'medium' as Difficulty },
  { id: 'coop_smart_district', isCoop3: true, difficulty: 'hard' as Difficulty },
  { id: 'coop_city_launch', isCoop3: true, difficulty: 'hard' as Difficulty },
]

// Fixed difficulty per mission (no player choice)
const MISSION_DIFFICULTY: Record<string, Difficulty> = Object.fromEntries(
  MISSION_TYPES.map(m => [m.id, m.difficulty])
)

const COOP_ROLES = ['drone_programmer', 'robot_constructor', 'entrepreneur'] as const

const MISSION_ROLES: Record<string, readonly string[]> = {
  city_infrastructure: ['drone_programmer', 'robot_constructor'],
  smart_farm: ['robot_constructor', 'entrepreneur'],
  startup_launch: ['entrepreneur', 'drone_programmer'],
  coop_solar_farm: COOP_ROLES,
  coop_bridge: COOP_ROLES,
  coop_rescue: COOP_ROLES,
  coop_smart_district: COOP_ROLES,
  coop_city_launch: COOP_ROLES,
}

const COOP_REWARDS: Record<string, { xp: number; coins: number }> = {
  easy: { xp: 30, coins: 10 },
  medium: { xp: 60, coins: 25 },
  hard: { xp: 120, coins: 50 },
}

function MissionIcon({ template, size = 32 }: { template: string; size?: number }) {
  const icons: Record<string, JSX.Element> = {
    city_infrastructure: (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <rect x="4" y="16" width="8" height="20" rx="1" fill="#3B82F6" opacity="0.8" />
        <rect x="16" y="8" width="8" height="28" rx="1" fill="#60A5FA" />
        <rect x="28" y="12" width="8" height="24" rx="1" fill="#3B82F6" opacity="0.8" />
        <rect x="6" y="20" width="2" height="2" rx="0.5" fill="#FDE68A" />
        <rect x="18" y="12" width="2" height="2" rx="0.5" fill="#FDE68A" />
        <rect x="30" y="16" width="2" height="2" rx="0.5" fill="#FDE68A" />
      </svg>
    ),
    smart_farm: (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <path d="M20 6 C14 6 8 12 8 20 L32 20 C32 12 26 6 20 6Z" fill="#22C55E" opacity="0.7" />
        <rect x="19" y="20" width="2" height="14" fill="#92400E" />
        <ellipse cx="20" cy="34" rx="14" ry="3" fill="#22C55E" opacity="0.3" />
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
      </svg>
    ),
    coop_solar_farm: (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="12" r="6" fill="#F59E0B" />
        <path d="M20 18 V24" stroke="#F59E0B" strokeWidth="2" />
        <path d="M12 12 H6" stroke="#F59E0B" strokeWidth="2" />
        <path d="M28 12 H34" stroke="#F59E0B" strokeWidth="2" />
        <rect x="6" y="26" width="28" height="4" rx="1" fill="#3B82F6" opacity="0.6" />
        <rect x="8" y="30" width="24" height="6" rx="1" fill="#1E40AF" opacity="0.4" />
      </svg>
    ),
    coop_bridge: (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <path d="M4 28 Q12 16 20 28 Q28 16 36 28" stroke="#6B7280" strokeWidth="3" fill="none" />
        <rect x="2" y="28" width="36" height="3" rx="1" fill="#9CA3AF" />
        <rect x="8" y="20" width="3" height="8" fill="#6B7280" />
        <rect x="29" y="20" width="3" height="8" fill="#6B7280" />
      </svg>
    ),
    coop_rescue: (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="14" stroke="#EF4444" strokeWidth="3" fill="none" />
        <rect x="18" y="8" width="4" height="12" rx="1" fill="#EF4444" />
        <rect x="14" y="18" width="12" height="4" rx="1" fill="#EF4444" />
      </svg>
    ),
    coop_smart_district: (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <rect x="4" y="20" width="10" height="16" rx="1" fill="#3B82F6" opacity="0.7" />
        <rect x="15" y="12" width="10" height="24" rx="1" fill="#60A5FA" />
        <rect x="26" y="16" width="10" height="20" rx="1" fill="#3B82F6" opacity="0.7" />
        <circle cx="20" cy="8" r="3" fill="#22C55E" opacity="0.6" />
        <path d="M17 8 H23" stroke="#22C55E" strokeWidth="1" opacity="0.6" />
      </svg>
    ),
    coop_city_launch: (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <path d="M20 4 L14 24 H26 Z" fill="#3B82F6" />
        <rect x="16" y="24" width="8" height="4" rx="1" fill="#6B7280" />
        <path d="M18 28 L16 36 H18 L19 30" fill="#F59E0B" opacity="0.8" />
        <path d="M22 28 L24 36 H22 L21 30" fill="#F59E0B" opacity="0.8" />
        <rect x="4" y="32" width="32" height="4" rx="1" fill="#22C55E" opacity="0.3" />
      </svg>
    ),
  }
  return icons[template] ?? <IconCoop size={size} />
}

// All coop mission definitions for progress display
const ALL_COOP_MISSIONS = [
  { id: 'city_infrastructure', gradient: 'from-blue-900/30 to-slate-900/20', border: 'border-blue-500/30' },
  { id: 'smart_farm', gradient: 'from-green-900/30 to-emerald-900/20', border: 'border-green-500/30' },
  { id: 'startup_launch', gradient: 'from-blue-900/30 to-indigo-900/20', border: 'border-blue-500/30' },
  { id: 'coop_solar_farm', gradient: 'from-yellow-900/30 to-orange-900/20', border: 'border-yellow-500/30' },
  { id: 'coop_bridge', gradient: 'from-gray-800/30 to-blue-900/20', border: 'border-gray-500/30' },
  { id: 'coop_rescue', gradient: 'from-red-900/30 to-orange-900/20', border: 'border-red-500/30' },
  { id: 'coop_smart_district', gradient: 'from-blue-900/30 to-cyan-900/20', border: 'border-blue-500/30' },
  { id: 'coop_city_launch', gradient: 'from-indigo-900/30 to-purple-900/20', border: 'border-indigo-500/30' },
]

function StarDisplay({ stars, size = 14 }: { stars: number; size?: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" className={i <= stars ? 'text-yellow-400' : 'text-gray-700'}>
          <path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  )
}

export default function CoopLobby({ userId, mySessions: initialMySessions, openSessions: initialOpenSessions, completedMissions, recentlyCompleted }: CoopLobbyProps) {
  const t = useTranslations('coop')
  const tGame = useTranslations('game')
  const locale = useLocale()
  const supabase = createClient()

  const [creating, setCreating] = useState(false)
  const [selectedType, setSelectedType] = useState(MISSION_TYPES[0].id)
  const [selectedRole, setSelectedRole] = useState<string>('drone_programmer')
  const [loading, setLoading] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [joinRoleSelection, setJoinRoleSelection] = useState<{ sessionId: string; missionTemplate: string; freeRoles: string[] } | null>(null)

  const [mySessions, setMySessions] = useState(initialMySessions)
  const [openSessions, setOpenSessions] = useState(initialOpenSessions)

  const availableRoles = MISSION_ROLES[selectedType] ?? COOP_ROLES
  const effectiveRole = availableRoles.includes(selectedRole) ? selectedRole : availableRoles[0]

  const navigateTo = useCallback((path: string) => {
    const prefix = locale === 'ru' ? '' : `/${locale}`
    window.location.href = `${prefix}${path}`
  }, [locale])

  const refreshSessions = useCallback(async () => {
    const { data: mySessionsData } = await supabase
      .from('coop_sessions')
      .select('*, coop_participants(user_id, role, is_completed)')
      .or(`created_by.eq.${userId}`)
      .in('status', ['waiting', 'active'])
      .order('created_at', { ascending: false })

    const { data: joinedParts } = await supabase
      .from('coop_participants')
      .select('coop_session_id')
      .eq('user_id', userId)

    const joinedIds = joinedParts?.map(p => p.coop_session_id) ?? []
    let joinedSessions: CoopSessionRow[] = []
    if (joinedIds.length > 0) {
      const { data } = await supabase
        .from('coop_sessions')
        .select('*, coop_participants(user_id, role, is_completed)')
        .in('id', joinedIds)
        .neq('created_by', userId)
        .in('status', ['waiting', 'active'])
      joinedSessions = data ?? []
    }

    const allMy = [...(mySessionsData ?? []), ...joinedSessions]
    const seen = new Set<string>()
    setMySessions(allMy.filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true }))

    const { data: openData } = await supabase
      .from('coop_sessions')
      .select('*, profiles!created_by(username, country), coop_participants(user_id, role, profiles(username, country))')
      .eq('status', 'waiting')
      .neq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(10)
    setOpenSessions(openData ?? [])
  }, [supabase, userId])

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('coop-lobby')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coop_sessions' }, () => refreshSessions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coop_participants' }, () => refreshSessions())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Check if player already has an active (waiting/active) session
  const hasActiveSession = mySessions.some(s => s.status === 'waiting' || s.status === 'active')

  async function checkActiveSessionLimit(): Promise<boolean> {
    // Double-check from DB in case local state is stale
    const { data: myParts } = await supabase
      .from('coop_participants')
      .select('coop_session_id, coop_sessions!inner(status)')
      .eq('user_id', userId)
    const activeCount = myParts?.filter((p: { coop_sessions: { status: string } }) =>
      p.coop_sessions.status === 'waiting' || p.coop_sessions.status === 'active'
    ).length ?? 0
    return activeCount > 0
  }

  async function createSession() {
    setLoading(true)
    if (await checkActiveSessionLimit()) {
      alert(t('oneSessionLimit'))
      setLoading(false)
      return
    }

    const fixedDifficulty = MISSION_DIFFICULTY[selectedType] ?? 'medium'
    const { data: session, error } = await supabase
      .from('coop_sessions')
      .insert({
        created_by: userId, status: 'waiting', mission_template: selectedType,
        difficulty: fixedDifficulty,
      })
      .select().single()

    if (error || !session) {
      alert(error?.message ?? 'Failed to create session')
      setLoading(false)
      return
    }

    await supabase.from('coop_participants').insert({
      coop_session_id: session.id, user_id: userId, role: effectiveRole, progress: {}, is_completed: false,
    })

    setLoading(false)
    navigateTo(`/coop/${session.id}`)
  }

  async function cancelSession(sessionId: string) {
    setCancellingId(sessionId)
    await supabase.from('coop_sessions').update({ status: 'abandoned' }).eq('id', sessionId).eq('created_by', userId)
    setCancellingId(null)
    await refreshSessions()
  }

  async function leaveSession(sessionId: string) {
    setCancellingId(sessionId)
    await supabase.from('coop_participants').delete().eq('coop_session_id', sessionId).eq('user_id', userId)
    setCancellingId(null)
    await refreshSessions()
  }

  function startJoinSession(sessionId: string, missionTemplate: string, existingParticipants?: OpenSessionParticipant[]) {
    const missionRoles = MISSION_ROLES[missionTemplate] ?? COOP_ROLES
    const takenRoles = new Set(existingParticipants?.map(p => p.role) ?? [])
    const freeRoles = missionRoles.filter(r => !takenRoles.has(r))
    if (freeRoles.length === 1) joinSession(sessionId, missionTemplate, freeRoles[0])
    else if (freeRoles.length > 1) setJoinRoleSelection({ sessionId, missionTemplate, freeRoles })
  }

  async function joinSession(sessionId: string, missionTemplate: string, chosenRole: string) {
    setLoading(true)
    setJoiningId(sessionId)
    setJoinRoleSelection(null)

    if (await checkActiveSessionLimit()) {
      alert(t('oneSessionLimit'))
      setLoading(false)
      setJoiningId(null)
      return
    }

    const missionRoles = MISSION_ROLES[missionTemplate] ?? COOP_ROLES
    const { data: existingParts } = await supabase.from('coop_participants').select('role').eq('coop_session_id', sessionId)
    const shouldActivate = (existingParts?.length ?? 0) + 1 >= missionRoles.length

    // Insert participant FIRST — RLS requires being a participant to update the session
    await supabase.from('coop_participants').insert({
      coop_session_id: sessionId, user_id: userId, role: chosenRole, progress: {}, is_completed: false,
    })

    if (shouldActivate) {
      // Check if session already has expires_at (from a previous activation — don't reset timer)
      const { data: sess } = await supabase.from('coop_sessions').select('expires_at').eq('id', sessionId).single()
      const updateData: Record<string, string> = { status: 'active' }
      if (!sess?.expires_at) {
        updateData.expires_at = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
      }
      await supabase.from('coop_sessions').update(updateData).eq('id', sessionId)
    }

    setLoading(false)
    setJoiningId(null)
    navigateTo(`/coop/${sessionId}`)
  }

  // Build role description from translated role labels
  function missionRolesDescription(missionTemplate: string) {
    const roles = MISSION_ROLES[missionTemplate] ?? COOP_ROLES
    return roles.map(r => t(`roleLabels.${r}` as never)).join(' + ')
  }

  function formatTimeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h`
    return `${Math.floor(hours / 24)}d`
  }

  // Build progress map: mission_template -> best stars
  const progressMap = new Map<string, { stars: number; score: number }>()
  for (const cm of completedMissions) {
    const existing = progressMap.get(cm.mission_template)
    if (!existing || cm.stars > existing.stars) {
      progressMap.set(cm.mission_template, { stars: cm.stars, score: cm.score })
    }
  }
  const totalCoopStars = Array.from(progressMap.values()).reduce((sum, v) => sum + v.stars, 0)
  const maxCoopStars = ALL_COOP_MISSIONS.length * 3

  return (
    <div className="space-y-6">
      {/* Mission Progress Overview */}
      <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">{t('missionProgress')}</h2>
          <div className="flex items-center gap-2">
            <StarDisplay stars={3} size={16} />
            <span className="text-sm font-bold text-yellow-400">{totalCoopStars}/{maxCoopStars}</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {ALL_COOP_MISSIONS.map(m => {
            const prog = progressMap.get(m.id)
            const isCompleted = !!prog
            const diff = MISSION_DIFFICULTY[m.id] ?? 'medium'
            return (
              <div
                key={m.id}
                className={clsx(
                  'relative rounded-xl border p-3 transition-all bg-gradient-to-br',
                  m.gradient,
                  isCompleted ? m.border : 'border-[var(--brand-border)] opacity-80'
                )}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 mt-0.5">
                    <MissionIcon template={m.id} size={28} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-xs leading-tight">{t(`templates.${m.id}` as never)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <StarDisplay stars={prog?.stars ?? 0} size={12} />
                      <span className={clsx(
                        'text-[9px] font-bold px-1 py-0.5 rounded',
                        diff === 'easy' ? 'bg-green-900/40 text-green-400' :
                        diff === 'medium' ? 'bg-yellow-900/40 text-yellow-400' :
                        'bg-red-900/40 text-red-400'
                      )}>
                        {tGame(`common.${diff}`)}
                      </span>
                    </div>
                    {prog && (
                      <p className="text-[10px] text-gray-400 mt-1">{t('bestScore')}: {prog.score}</p>
                    )}
                    {!prog && (
                      <p className="text-[10px] text-gray-500 mt-1">{t('notCompleted')}</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recently completed sessions (offline results) */}
      {recentlyCompleted.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white">{t('recentResults')}</h2>
          {recentlyCompleted.map(s => {
            const parts = s.coop_participants ?? []
            const myP = parts.find(p => p.user_id === userId)
            const allScores = parts.map(p => p.score ?? 0)
            const totalScore = allScores.reduce((a, b) => a + b, 0)
            const maxScore = parts.length * 1000
            const starCount = maxScore > 0 ? (totalScore / maxScore >= 0.95 ? 3 : totalScore / maxScore >= 0.75 ? 2 : totalScore / maxScore >= 0.5 ? 1 : 0) : 0

            return (
              <div key={s.id} className="bg-[var(--brand-panel)] border border-green-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <MissionIcon template={s.mission_template} size={28} />
                    <div>
                      <p className="font-bold text-white text-sm">{t(`templates.${s.mission_template}` as never)}</p>
                      <p className="text-green-400 text-xs font-medium">{t('sessionComplete')}</p>
                    </div>
                  </div>
                  <StarDisplay stars={starCount} size={16} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-3">
                    {parts.map(p => (
                      <div key={p.user_id} className="flex items-center gap-1 text-xs text-gray-400">
                        <RoleIcon role={p.role as Role} size={14} />
                        <span>{p.user_id === userId ? t('you') : ((Array.isArray(p.profiles) ? p.profiles[0]?.username : p.profiles?.username) ?? '?')}</span>
                        <span className="text-gray-600">{p.score ?? 0}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[var(--brand-gold)]">{totalScore}</p>
                    <p className="text-[10px] text-gray-500">/ {maxScore}</p>
                  </div>
                </div>
                {myP && (
                  <p className="text-xs text-gray-500 mt-2">{t('yourScoreWas', { score: myP.score ?? 0 })}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* My sessions */}
      {mySessions.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-white mb-3">{t('mySessions')}</h2>
          <div className="space-y-3">
            {mySessions.map(s => {
              const myPart = s.coop_participants?.find(p => p.user_id === userId)
              const myDone = myPart?.is_completed
              const allDone = s.coop_participants?.every(p => p.is_completed)
              const isCreator = s.created_by === userId
              const missionRoles = MISSION_ROLES[s.mission_template] ?? COOP_ROLES
              const participantCount = s.coop_participants?.length ?? 0
              const isCancelling = cancellingId === s.id

              return (
                <div key={s.id} className={clsx(
                  'bg-[var(--brand-panel)] border rounded-xl p-4',
                  !myDone ? 'border-[var(--brand-blue)]' : 'border-[var(--brand-border)]'
                )}>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <IconCoop size={24} />
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate">{t(`templates.${s.mission_template}` as never)}</p>
                        <p className={clsx('text-sm mt-0.5', !myDone ? 'text-[var(--brand-blue)] font-bold' : 'text-gray-500')}>
                          {s.status === 'waiting' ? t('waitingForPartner') :
                           allDone ? t('missionComplete') :
                           !myDone ? t('yourTurn') : t('partnersTurn')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.status === 'waiting' && (
                        <button onClick={() => isCreator ? cancelSession(s.id) : leaveSession(s.id)} disabled={isCancelling}
                          className="px-3 py-1.5 text-red-400 hover:text-red-300 border border-red-400/30 hover:border-red-400/60 rounded-lg text-xs font-medium transition-colors disabled:opacity-50">
                          {isCancelling ? '...' : isCreator ? t('cancelSession') : t('leaveSession')}
                        </button>
                      )}
                      <button onClick={() => navigateTo(`/coop/${s.id}`)}
                        className="px-4 py-2 bg-[var(--brand-blue)] text-white font-bold rounded-xl text-sm hover:opacity-90 transition-opacity">
                        {t('open')} →
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {s.difficulty && (
                      <span className="text-xs text-gray-500 bg-[var(--brand-dark)] px-2 py-0.5 rounded">
                        {tGame(`common.${s.difficulty as Difficulty}`)}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">{participantCount}/{missionRoles.length} {t('playersJoined')}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {s.coop_participants?.map(p => (
                      <span key={p.user_id} className={clsx(
                        'text-xs px-2 py-1 rounded-lg border flex items-center gap-1',
                        p.is_completed ? 'bg-green-900/30 text-green-400 border-green-500/20' : 'bg-blue-900/20 text-blue-400 border-blue-500/20'
                      )}>
                        <RoleIcon role={p.role as Role} size={14} />
                        {t(`roleLabels.${p.role}` as never)}
                        {p.is_completed && ' ✓'}
                      </span>
                    ))}
                    {Array.from({ length: missionRoles.length - participantCount }, (_, i) => {
                      const takenRoles = new Set(s.coop_participants?.map(p => p.role) ?? [])
                      const freeRoles = [...missionRoles].filter(r => !takenRoles.has(r))
                      const freeRole = freeRoles[i]
                      return (
                        <span key={`empty-${i}`} className="text-xs px-2 py-1 rounded-lg border border-dashed border-[var(--brand-border)] text-gray-600 flex items-center gap-1">
                          {freeRole && <RoleIcon role={freeRole as Role} size={14} />}
                          {freeRole ? t(`roleLabels.${freeRole}` as never) : '?'} — {t('freeSlot')}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Create session */}
      <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">{t('createSession')}</h2>

        {hasActiveSession && (
          <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-xl">
            <p className="text-yellow-400 text-sm font-medium">{t('oneSessionLimitHint')}</p>
          </div>
        )}

        {!creating ? (
          <button onClick={() => setCreating(true)} disabled={hasActiveSession}
            className="px-6 py-3 bg-[var(--brand-blue)] text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
            + {t('createSession')}
          </button>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              {MISSION_TYPES.map(mt => {
                const roles = MISSION_ROLES[mt.id] ?? COOP_ROLES
                const diff = MISSION_DIFFICULTY[mt.id] ?? 'medium'
                const rewards = COOP_REWARDS[diff] ?? COOP_REWARDS.medium
                return (
                  <button key={mt.id} onClick={() => setSelectedType(mt.id)}
                    className={clsx(
                      'w-full text-left p-4 rounded-xl border transition-all',
                      selectedType === mt.id ? 'border-[var(--brand-blue)] bg-blue-900/20' : 'border-[var(--brand-border)] hover:border-gray-500 bg-[var(--brand-dark)]'
                    )}>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <MissionIcon template={mt.id} size={36} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-white">{t(`templates.${mt.id}` as never)}</p>
                          <span className={clsx(
                            'text-[10px] font-bold px-1.5 py-0.5 rounded',
                            diff === 'easy' ? 'bg-green-900/40 text-green-400' :
                            diff === 'medium' ? 'bg-yellow-900/40 text-yellow-400' :
                            'bg-red-900/40 text-red-400'
                          )}>
                            {tGame(`common.${diff}`)}
                          </span>
                        </div>
                        <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">
                          {t(`missionDesc_${mt.id}` as never, { defaultValue: t('missionDescDefault') })}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                          {roles.map(r => (
                            <span key={r} className="flex items-center gap-1 text-gray-400 text-xs">
                              <RoleIcon role={r as Role} size={14} />
                              <span>{t(`roleLabels.${r}` as never)}</span>
                            </span>
                          ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="text-xs text-yellow-400 flex items-center gap-1">
                            <IconTrophy size={12} /> +{rewards.xp} XP
                          </span>
                          <span className="text-xs text-yellow-400 flex items-center gap-1">
                            <IconCoin size={12} /> +{rewards.coins}
                          </span>
                          <span className="text-xs text-gray-500">{mt.isCoop3 ? '3' : '2'} {t('playersJoined')}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Role */}
            <div>
              <p className="text-sm text-gray-400 font-medium mb-2">{t('chooseRole')}:</p>
              <div className="flex gap-2">
                {availableRoles.map(role => (
                  <button key={role} onClick={() => setSelectedRole(role)}
                    className={clsx(
                      'px-4 py-2 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5',
                      role === effectiveRole ? 'border-[var(--brand-blue)] bg-blue-900/20 text-[var(--brand-blue)]' : 'border-[var(--brand-border)] text-gray-400 hover:border-gray-500'
                    )}>
                    <RoleIcon role={role as Role} size={16} />
                    {t(`roleLabels.${role}` as never)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={createSession} disabled={loading}
                className="px-6 py-3 bg-[var(--brand-blue)] text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity">
                {loading ? t('creating') : t('createAndWait')}
              </button>
              <button onClick={() => setCreating(false)} className="px-4 py-3 text-gray-400 hover:text-white transition-colors">
                {t('cancel')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Open sessions */}
      <div>
        <h2 className="text-lg font-bold text-white mb-3">{t('joinSession')}</h2>
        {openSessions.length === 0 ? (
          <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl p-8 text-center">
            <p className="text-gray-500">{t('noActiveSessions')}</p>
            <p className="text-gray-600 text-sm mt-1">{t('createFirst')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {openSessions.map(s => {
              const creator = s.profiles as { username: string; country: string } | null
              const participants = s.coop_participants ?? []
              const mRoles = MISSION_ROLES[s.mission_template] ?? COOP_ROLES
              const takenRoles = new Set(participants.map(p => p.role))
              const freeRoles = mRoles.filter(r => !takenRoles.has(r))
              const isJoining = joiningId === s.id
              const isSelectingRole = joinRoleSelection?.sessionId === s.id

              return (
                <div key={s.id} className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <IconCoop size={24} />
                      <div>
                        <p className="font-bold text-white">{t(`templates.${s.mission_template}` as never)}</p>
                        <p className="text-gray-400 text-sm">
                          {creator?.username ?? t('unknownUser')}
                          <span className="text-gray-600 ml-2">{formatTimeAgo(s.created_at)}</span>
                        </p>
                      </div>
                    </div>
                    {!isSelectingRole && (
                      <button onClick={() => startJoinSession(s.id, s.mission_template, participants)}
                        disabled={loading || isJoining || freeRoles.length === 0 || hasActiveSession}
                        className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors">
                        {isJoining ? '...' : t('join')} →
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {s.difficulty && (
                      <span className="text-xs text-gray-500 bg-[var(--brand-dark)] px-2 py-0.5 rounded">
                        {tGame(`common.${s.difficulty as Difficulty}`)}
                      </span>
                    )}
                    {participants.map(p => (
                      <span key={p.user_id} className="text-xs bg-blue-900/20 text-blue-400 px-2 py-1 rounded-lg border border-blue-500/20 flex items-center gap-1">
                        <RoleIcon role={p.role as Role} size={14} />
                        {t(`roleLabels.${p.role}` as never)}
                        {p.profiles?.username ? ` — ${p.profiles.username}` : ''}
                      </span>
                    ))}
                    {freeRoles.map(role => (
                      <span key={role} className="text-xs bg-[var(--brand-dark)] text-gray-500 px-2 py-1 rounded-lg border border-dashed border-[var(--brand-border)] flex items-center gap-1">
                        <RoleIcon role={role as Role} size={14} />
                        {t(`roleLabels.${role}` as never)} — {t('freeSlot')}
                      </span>
                    ))}
                  </div>

                  {isSelectingRole && (
                    <div className="mt-3 p-3 bg-[var(--brand-dark)] rounded-xl border border-[var(--brand-border)]">
                      <p className="text-sm text-gray-300 font-medium mb-2">{t('chooseRole')}:</p>
                      <div className="flex gap-2">
                        {joinRoleSelection.freeRoles.map(role => (
                          <button key={role} onClick={() => joinSession(s.id, s.mission_template, role)} disabled={loading}
                            className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1">
                            <RoleIcon role={role as Role} size={14} />
                            {t(`roleLabels.${role}` as never)}
                          </button>
                        ))}
                        <button onClick={() => setJoinRoleSelection(null)}
                          className="px-3 py-2 text-gray-400 hover:text-white text-xs transition-colors">
                          {t('cancel')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
