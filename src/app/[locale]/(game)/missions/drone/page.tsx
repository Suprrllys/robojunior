export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { redirect } from 'next/navigation'
import { REWARDS_V2 } from '@/lib/game/rewards'
import type { Difficulty } from '@/types/game'
import DroneMissionLoader from './DroneMissionLoader'
import MenuMusicPlayer from '@/components/game/MenuMusicPlayer'
import RoleIcon from '@/components/game/RoleIcon'

const TOTAL_MISSIONS = 10

function missionDifficulty(num: number): Difficulty {
  if (num <= 3) return 'easy'
  if (num <= 6) return 'medium'
  return 'hard'
}

interface Props {
  searchParams: { mission?: string }
}

export default async function DroneMissionsPage({ searchParams }: Props) {
  const t = await getTranslations()
  const supabase = await createClient()

  let user = null
  let authFailed = false
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      authFailed = true
    } else {
      user = data.user
    }
  } catch {
    authFailed = true
  }

  // Only redirect if Supabase confirmed no user (not a timeout/error)
  if (!user && !authFailed) redirect('/en/login')

  const activeMission = Math.min(Math.max(Number(searchParams.mission) || 1, 1), TOTAL_MISSIONS)

  let progress = null
  if (user) {
    const { data } = await supabase
      .from('mission_progress')
      .select('mission_number, status, score, difficulty')
      .eq('user_id', user.id)
      .eq('role', 'drone_programmer')
    progress = data
  }

  // Localized difficulty labels
  const diffLabels: Record<Difficulty, string> = {
    easy: t('missions.common.easy'),
    medium: t('missions.common.medium'),
    hard: t('missions.common.hard'),
  }

  const diffColors: Record<Difficulty, string> = {
    easy: 'bg-green-600',
    medium: 'bg-yellow-600',
    hard: 'bg-red-600',
  }

  // Localized mission names
  const missionNames: Record<number, string> = {
    1: t('missions.drone.m1.title'),
    2: t('missions.drone.m2.title'),
    3: t('missions.drone.m3.title'),
    4: t('missions.drone.m4.title'),
    5: t('missions.drone.m5.title'),
    6: t('missions.drone.m6.title'),
    7: t('missions.drone.m7.title'),
    8: t('missions.drone.m8.title'),
    9: t('missions.drone.m9.title'),
    10: t('missions.drone.m10.title'),
  }

  return (
    <div className="space-y-6">
      <MenuMusicPlayer />
      <div className="flex items-center gap-4">
        <Link href="/roles" className="text-gray-400 hover:text-white transition-colors">
          &larr; {t('missions.backToRoles')}
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <RoleIcon role="drone_programmer" size={64} />
        <div>
          <h1 className="text-3xl font-black text-white">{t('roles.drone_programmer.name')}</h1>
          <p className="text-gray-400">{t('roles.drone_programmer.skill')}</p>
        </div>
      </div>

      {/* Mission Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: TOTAL_MISSIONS }, (_, i) => {
          const num = i + 1
          const diff = missionDifficulty(num)
          const reward = REWARDS_V2[diff]
          const missionProgress = progress
            ?.filter(p => p.mission_number === num && p.status === 'completed')
            ?.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0]
          const isActive = activeMission === num
          const isImplemented = num <= 10
          const bestScore = missionProgress?.score ?? 0
          const stars = bestScore >= 950 ? 3 : bestScore >= 750 ? 2 : bestScore >= 500 ? 1 : 0

          return (
            <Link
              key={num}
              href={`/missions/drone?mission=${num}`}
              className={`relative block p-4 rounded-xl transition-all ${
                isActive
                  ? 'border-2 border-white bg-blue-900/30 scale-[1.05] shadow-lg shadow-blue-500/30 ring-2 ring-blue-400/50'
                  : missionProgress
                  ? 'border-2 border-green-600/50 bg-green-900/10 hover:border-green-500'
                  : 'border-2 border-gray-700 bg-gray-800/50 hover:border-gray-500'
              }`}
            >
              {/* Difficulty badge */}
              <span className={`absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded text-white ${diffColors[diff]}`}>
                {diffLabels[diff]}
              </span>

              {/* Mission number */}
              <div className="text-2xl font-black text-gray-500 mb-1">#{num}</div>

              {/* Mission name */}
              <div className="text-sm font-bold text-white mb-1 pr-12">
                {missionNames[num] ?? `Mission ${num}`}
              </div>

              {/* Rewards */}
              <div className="text-[10px] text-gray-500">
                +{reward.xp} XP &middot; +{reward.currency} {t('missions.common.coins')}
              </div>

              {/* Stars + score if completed */}
              {missionProgress && (
                <div className="mt-1">
                  <div className="flex gap-0.5">
                    {[1, 2, 3].map(s => (
                      <span key={s} className={`text-sm ${s <= stars ? 'text-yellow-400' : 'text-gray-600'}`}>★</span>
                    ))}
                  </div>
                  <div className="text-[10px] text-green-400 font-bold mt-0.5">
                    {bestScore}/1000
                  </div>
                </div>
              )}

              {/* Coming Soon overlay */}
              {!isImplemented && (
                <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center backdrop-blur-[1px]">
                  <span className="text-gray-400 text-xs font-bold bg-gray-900/80 px-2 py-1 rounded">
                    {t('missions.common.comingSoon')}
                  </span>
                </div>
              )}
            </Link>
          )
        })}
      </div>

      {/* Active Mission Content */}
      {(() => {
        const activeProgress = progress
          ?.filter(p => p.mission_number === activeMission && p.status === 'completed')
          ?.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0]
        const initialScore = activeProgress?.score ?? 0
        return (
          <DroneMissionLoader
            missionNumber={activeMission}
            userId={user?.id ?? 'anonymous'}
            difficulty={missionDifficulty(activeMission)}
            initialScore={initialScore}
          />
        )
      })()}
    </div>
  )
}
