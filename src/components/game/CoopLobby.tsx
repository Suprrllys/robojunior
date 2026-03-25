'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'
import clsx from 'clsx'
import type { Difficulty } from '@/types/game'

interface CoopLobbyProps {
  userId: string
  username: string
  mySessions: CoopSessionRow[]
  openSessions: OpenSessionRow[]
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

interface OpenSessionRow {
  id: string
  mission_template: string
  difficulty?: string
  created_at: string
  profiles?: { username: string; country: string } | null
}

const MISSION_TYPES = [
  { id: 'city_infrastructure', labelKey: 'city_infrastructure', desc: 'drone_programmer + robot_constructor' },
  { id: 'smart_farm', labelKey: 'smart_farm', desc: 'robot_constructor + entrepreneur' },
  { id: 'startup_launch', labelKey: 'startup_launch', desc: 'entrepreneur + drone_programmer' },
]

const MISSION_ICONS: Record<string, string> = {
  city_infrastructure: '🏙️',
  smart_farm: '🌾',
  startup_launch: '🚀',
}

const VALID_DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

// Maps mission_template to roles for creator
const ROLE_MAP: Record<string, { creator: string; joiner: string }> = {
  city_infrastructure: { creator: 'drone_programmer', joiner: 'robot_constructor' },
  smart_farm: { creator: 'robot_constructor', joiner: 'entrepreneur' },
  startup_launch: { creator: 'entrepreneur', joiner: 'drone_programmer' },
}

export default function CoopLobby({ userId, mySessions, openSessions }: CoopLobbyProps) {
  const t = useTranslations('coop')
  const tGame = useTranslations('game')
  const router = useRouter()
  const supabase = createClient()

  const [creating, setCreating] = useState(false)
  const [selectedType, setSelectedType] = useState(MISSION_TYPES[0].id)
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium')
  const [loading, setLoading] = useState(false)

  async function createSession() {
    setLoading(true)
    const creatorRole = ROLE_MAP[selectedType]?.creator ?? 'drone_programmer'

    const { data: session, error } = await supabase
      .from('coop_sessions')
      .insert({
        created_by: userId,
        status: 'waiting',
        mission_template: selectedType,
        difficulty: selectedDifficulty,
      })
      .select()
      .single()

    if (error || !session) {
      setLoading(false)
      return
    }

    await supabase.from('coop_participants').insert({
      coop_session_id: session.id,
      user_id: userId,
      role: creatorRole,
      progress: {},
      is_completed: false,
    })

    setLoading(false)
    router.push(`/coop/${session.id}`)
  }

  async function joinSession(sessionId: string, missionTemplate: string) {
    setLoading(true)
    const joinerRole = ROLE_MAP[missionTemplate]?.joiner ?? 'robot_constructor'

    await supabase.from('coop_participants').insert({
      coop_session_id: sessionId,
      user_id: userId,
      role: joinerRole,
      progress: {},
      is_completed: false,
    })

    await supabase
      .from('coop_sessions')
      .update({ status: 'active' })
      .eq('id', sessionId)

    setLoading(false)
    router.push(`/coop/${sessionId}`)
  }

  function formatMissionLabel(template: string) {
    const icon = MISSION_ICONS[template] ?? '🎯'
    return `${icon} ${t(`templates.${template}` as never)}`
  }

  return (
    <div className="space-y-6">
      {/* My sessions */}
      {mySessions.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-white mb-3">{t('mySessions')}</h2>
          <div className="space-y-3">
            {mySessions.map(s => {
              const myPart = s.coop_participants?.find(p => p.user_id === userId)
              const missionLabel = formatMissionLabel(s.mission_template)
              const myDone = myPart?.is_completed
              const allDone = s.coop_participants?.every(p => p.is_completed)

              return (
                <div
                  key={s.id}
                  className={clsx(
                    'bg-[var(--brand-panel)] border rounded-xl p-4 flex items-center justify-between',
                    !myDone ? 'border-[var(--brand-blue)]' : 'border-[var(--brand-border)]'
                  )}
                >
                  <div>
                    <p className="font-bold text-white">{missionLabel}</p>
                    <p className={clsx('text-sm mt-0.5', !myDone ? 'text-[var(--brand-blue)] font-bold' : 'text-gray-500')}>
                      {s.status === 'waiting' ? t('waitingForPartner') :
                       allDone ? t('missionComplete') :
                       !myDone ? t('yourTurn') : t('partnersTurn')}
                    </p>
                    {s.difficulty && (
                      <span className="text-xs text-gray-500 mt-1">
                        {tGame(`common.${s.difficulty as Difficulty}`)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => router.push(`/coop/${s.id}`)}
                    className="px-4 py-2 bg-[var(--brand-blue)] text-white font-bold rounded-xl text-sm hover:opacity-90 transition-opacity"
                  >
                    {t('open')} →
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Create session */}
      <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">{t('createSession')}</h2>

        {!creating ? (
          <button
            onClick={() => setCreating(true)}
            className="px-6 py-3 bg-[var(--brand-blue)] text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
          >
            + {t('createSession')}
          </button>
        ) : (
          <div className="space-y-4">
            {/* Mission type */}
            <div className="space-y-2">
              {MISSION_TYPES.map(mt => (
                <button
                  key={mt.id}
                  onClick={() => setSelectedType(mt.id)}
                  className={clsx(
                    'w-full text-left p-4 rounded-xl border transition-all',
                    selectedType === mt.id
                      ? 'border-[var(--brand-blue)] bg-blue-900/20'
                      : 'border-[var(--brand-border)] hover:border-gray-500 bg-[var(--brand-dark)]'
                  )}
                >
                  <p className="font-bold text-white">{formatMissionLabel(mt.id)}</p>
                  <p className="text-gray-400 text-sm">{mt.desc}</p>
                </button>
              ))}
            </div>

            {/* Difficulty selector */}
            <div>
              <p className="text-sm text-gray-400 font-medium mb-2">{t('difficulty')}:</p>
              <div className="flex gap-2">
                {VALID_DIFFICULTIES.map(d => (
                  <button
                    key={d}
                    onClick={() => setSelectedDifficulty(d)}
                    className={clsx(
                      'px-4 py-2 text-xs font-bold rounded-lg border transition-all',
                      d === selectedDifficulty
                        ? 'border-[var(--brand-gold)] bg-yellow-900/20 text-[var(--brand-gold)]'
                        : 'border-[var(--brand-border)] text-gray-400 hover:border-gray-500'
                    )}
                  >
                    {tGame(`common.${d}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={createSession}
                disabled={loading}
                className="px-6 py-3 bg-[var(--brand-blue)] text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {loading ? t('creating') : t('createAndWait')}
              </button>
              <button
                onClick={() => setCreating(false)}
                className="px-4 py-3 text-gray-400 hover:text-white transition-colors"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Open sessions to join */}
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
              const missionLabel = formatMissionLabel(s.mission_template)
              const creator = s.profiles as { username: string; country: string } | null

              return (
                <div key={s.id} className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white">{missionLabel}</p>
                    <p className="text-gray-400 text-sm">
                      {creator?.username ?? t('unknownUser')} {creator?.country ? `🌍 ${creator.country}` : ''}
                    </p>
                    {s.difficulty && (
                      <span className="text-xs text-gray-500">
                        {tGame(`common.${s.difficulty as Difficulty}`)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => joinSession(s.id, s.mission_template)}
                    disabled={loading}
                    className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors"
                  >
                    {t('join')} →
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
