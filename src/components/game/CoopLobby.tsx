'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'

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
  created_by: string
  created_at: string
  coop_participants?: { user_id: string; role: string; is_completed: boolean }[]
}

interface OpenSessionRow {
  id: string
  mission_template: string
  created_at: string
  profiles?: { username: string; country: string } | null
}

const MISSION_TYPES = [
  { id: 'city_infrastructure', label: '🏙️ City Infrastructure', desc: 'Drone Programmer + Robot Constructor' },
  { id: 'smart_farm', label: '🌾 Smart Farm', desc: 'Robot Constructor + Tech Entrepreneur' },
  { id: 'startup_launch', label: '🚀 Startup Launch', desc: 'Tech Entrepreneur + Drone Programmer' },
]

export default function CoopLobby({ userId, mySessions, openSessions }: CoopLobbyProps) {
  const t = useTranslations('coop')
  const router = useRouter()
  const supabase = createClient()

  const [creating, setCreating] = useState(false)
  const [selectedType, setSelectedType] = useState(MISSION_TYPES[0].id)
  const [loading, setLoading] = useState(false)

  async function createSession() {
    setLoading(true)
    const { data: session, error } = await supabase
      .from('coop_sessions')
      .insert({
        created_by: userId,
        status: 'waiting',
        mission_template: selectedType,
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
      role: 'drone_programmer',
      progress: {},
      is_completed: false,
    })

    setLoading(false)
    router.push(`/coop/${session.id}`)
  }

  async function joinSession(sessionId: string) {
    setLoading(true)
    await supabase.from('coop_participants').insert({
      coop_session_id: sessionId,
      user_id: userId,
      role: 'robot_constructor',
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

  return (
    <div className="space-y-6">
      {/* My sessions */}
      {mySessions.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-white mb-3">My Active Sessions</h2>
          <div className="space-y-3">
            {mySessions.map(s => {
              const myPart = s.coop_participants?.find(p => p.user_id === userId)
              const missionLabel = MISSION_TYPES.find(m => m.id === s.mission_template)?.label ?? s.mission_template
              const myDone = myPart?.is_completed
              const allDone = s.coop_participants?.every(p => p.is_completed)

              return (
                <div
                  key={s.id}
                  className={`bg-brand-panel border rounded-xl p-4 flex items-center justify-between ${
                    !myDone ? 'border-brand-blue' : 'border-brand-border'
                  }`}
                >
                  <div>
                    <p className="font-bold text-white">{missionLabel}</p>
                    <p className={`text-sm mt-0.5 ${!myDone ? 'text-brand-blue font-bold' : 'text-gray-500'}`}>
                      {s.status === 'waiting' ? '⌛ Waiting for partner...' :
                       allDone ? '✅ Both done!' :
                       !myDone ? '👉 ' + t('yourTurn') : '⏳ ' + t('partnersTurn')}
                    </p>
                  </div>
                  <button
                    onClick={() => router.push(`/coop/${s.id}`)}
                    className="px-4 py-2 bg-brand-blue text-white font-bold rounded-xl text-sm hover:bg-blue-500 transition-colors"
                  >
                    Open →
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Create session */}
      <div className="bg-brand-panel border border-brand-border rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">{t('createSession')}</h2>

        {!creating ? (
          <button
            onClick={() => setCreating(true)}
            className="px-6 py-3 bg-brand-blue text-white font-bold rounded-xl hover:bg-blue-500 transition-colors"
          >
            + {t('createSession')}
          </button>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              {MISSION_TYPES.map(mt => (
                <button
                  key={mt.id}
                  onClick={() => setSelectedType(mt.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedType === mt.id
                      ? 'border-brand-blue bg-blue-900/20'
                      : 'border-brand-border hover:border-gray-500 bg-brand-dark'
                  }`}
                >
                  <p className="font-bold text-white">{mt.label}</p>
                  <p className="text-gray-400 text-sm">{mt.desc}</p>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={createSession}
                disabled={loading}
                className="px-6 py-3 bg-brand-blue text-white font-bold rounded-xl hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Creating...' : 'Create & Wait for Partner'}
              </button>
              <button
                onClick={() => setCreating(false)}
                className="px-4 py-3 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Open sessions to join */}
      <div>
        <h2 className="text-lg font-bold text-white mb-3">{t('joinSession')}</h2>
        {openSessions.length === 0 ? (
          <div className="bg-brand-panel border border-brand-border rounded-2xl p-8 text-center">
            <p className="text-gray-500">{t('noActiveSessions')}</p>
            <p className="text-gray-600 text-sm mt-1">{t('createFirst')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {openSessions.map(s => {
              const missionLabel = MISSION_TYPES.find(m => m.id === s.mission_template)?.label ?? s.mission_template
              const creator = s.profiles as { username: string; country: string } | null

              return (
                <div key={s.id} className="bg-brand-panel border border-brand-border rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white">{missionLabel}</p>
                    <p className="text-gray-400 text-sm">
                      by {creator?.username ?? 'Unknown'} {creator?.country ? `🌍 ${creator.country}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => joinSession(s.id)}
                    disabled={loading}
                    className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors"
                  >
                    Join →
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
