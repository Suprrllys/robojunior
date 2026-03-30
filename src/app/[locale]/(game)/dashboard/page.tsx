import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { Link } from '@/i18n/navigation'
import CompetencyRadar from '@/components/game/CompetencyRadar'
import CareerRecommendation from '@/components/game/CareerRecommendation'
import { computeUnlockedSkins, ACHIEVEMENT_DEFS } from '@/lib/game/avatar-utils'
import { IconStar, IconMissions, IconRolesExplored, AchievementIcon, IconDroneMini, IconRobotMini, IconLightbulb } from '@/components/ui/SvgIcon'
import type { Role } from '@/types/database'
import type { ReactNode } from 'react'

export default async function DashboardPage() {
  const t = await getTranslations('dashboard')
  const tRewards = await getTranslations('rewards')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [profileRes, competencyRes, progressRes, coopCompletedRes, activeCoopRes] = await Promise.all([
    supabase.from('profiles').select('username, xp, game_currency, coop_missions_completed').eq('id', user!.id).single(),
    supabase.from('competency_scores').select('*').eq('user_id', user!.id).single(),
    supabase.from('mission_progress').select('role, status, mission_number, score').eq('user_id', user!.id),
    supabase.from('coop_completed_missions').select('mission_template, role, score, stars, total_session_score, completed_at').eq('user_id', user!.id).order('completed_at', { ascending: false }).limit(10),
    supabase.from('coop_sessions').select('id, mission_template, status').or(`created_by.eq.${user!.id}`).in('status', ['waiting', 'active']),
  ])

  const profile = profileRes.data
  const competency = competencyRes.data
  const progress = progressRes.data || []
  const coopCompleted = coopCompletedRes.data || []
  const activeCoop = activeCoopRes.data || []

  // Try to fetch hints_used separately (column may not exist yet)
  let hintsData: { mission_number: number; role: string; hints_used: number }[] | null = null
  const hintsRes = await supabase
    .from('mission_progress')
    .select('mission_number, role, hints_used')
    .eq('user_id', user!.id)
    .eq('status', 'completed')
  if (!hintsRes.error && hintsRes.data) {
    hintsData = hintsRes.data as unknown as { mission_number: number; role: string; hints_used: number }[]
  }

  const completedMissions = progress.filter(p => p.status === 'completed').length
  const rolesExplored = new Set(progress.filter(p => p.status === 'completed').map(p => p.role)).size
  const rolesNeeded = Math.max(0, 3 - rolesExplored)

  // Per-role progress for progress bars
  const roleProgress: { role: Role; label: string; iconEl: ReactNode; completed: number; total: number }[] = [
    {
      role: 'drone_programmer',
      label: t('roles.drone'),
      iconEl: <IconDroneMini size={20} />,
      completed: progress.filter(p => p.role === 'drone_programmer' && p.status === 'completed').length,
      total: 10,
    },
    {
      role: 'robot_constructor',
      label: t('roles.robot'),
      iconEl: <IconRobotMini size={20} />,
      completed: progress.filter(p => p.role === 'robot_constructor' && p.status === 'completed').length,
      total: 10,
    },
    {
      role: 'entrepreneur',
      label: t('roles.entrepreneur'),
      iconEl: <IconLightbulb size={20} />,
      completed: progress.filter(p => p.role === 'entrepreneur' && p.status === 'completed').length,
      total: 10,
    },
  ]

  // Independence meter — count completed missions where no hints were used
  // hints_used = -1 means "not tracked" (completed before tracking was added), skip those
  const trackedMissions = hintsData ? hintsData.filter(h => h.hints_used >= 0) : []
  const totalTracked = trackedMissions.length
  const withoutHints = trackedMissions.filter(h => h.hints_used === 0).length
  const independencePct = totalTracked > 0 ? Math.round((withoutHints / totalTracked) * 100) : 0

  const stats = [
    { label: t('stats.totalXP'), value: profile?.xp || 0, iconEl: <IconStar size={32} animated /> },
    { label: t('stats.missionsCompleted'), value: completedMissions, iconEl: <IconMissions size={32} animated /> },
    { label: t('stats.rolesExplored'), value: rolesExplored, iconEl: <IconRolesExplored size={32} animated /> },
  ]

  // Compute achievements: solo from mission_progress + coop from user_achievements
  const soloUnlocked = computeUnlockedSkins(progress)
  let coopAchievementIds: string[] = []
  try {
    const { data, error } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', user!.id)
    if (!error && data) {
      coopAchievementIds = data.map(a => `${a.achievement_id}_skin`)
    }
  } catch { /* table may not exist */ }
  const unlockedSet = new Set([...soloUnlocked, ...coopAchievementIds])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white">{t('title')}</h1>
        <p className="text-gray-400 mt-1">{t('subtitle')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="bg-brand-panel border border-brand-border rounded-xl p-4 text-center">
            <div className="flex justify-center mb-1">{stat.iconEl}</div>
            <div className="text-2xl font-black text-white">{stat.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Active coop sessions banner */}
      {activeCoop.length > 0 && (
        <Link
          href="/coop"
          className="block bg-blue-900/20 border border-blue-500/30 rounded-2xl p-4 hover:border-blue-500/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🤝</span>
              <div>
                <p className="text-white font-bold text-sm">{t('coopBanner', { count: activeCoop.length })}</p>
                <p className="text-gray-400 text-xs">{t('coopBannerDesc')}</p>
              </div>
            </div>
            <span className="text-blue-400 text-sm font-bold">→</span>
          </div>
        </Link>
      )}

      {/* Coop stats */}
      {(profile?.coop_missions_completed ?? 0) > 0 && (() => {
        const coopStarsTotal = coopCompleted.reduce((sum, c) => sum + ((c as Record<string, unknown>).stars as number ?? 0), 0)
        const coopStarsMax = coopCompleted.length * 3
        const teamworkLevel = competency?.teamwork ?? 0
        return (
        <div className="bg-brand-panel border border-brand-border rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">{t('coopProgress')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-black text-white">{profile?.coop_missions_completed ?? 0}</p>
              <p className="text-xs text-gray-400">{t('coopMissionsCompleted')}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-0.5 mb-1">
                {[1, 2, 3].map(i => (
                  <svg key={i} width={16} height={16} viewBox="0 0 24 24" className={coopStarsTotal > 0 ? 'text-yellow-400' : 'text-gray-600'}>
                    <path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>
              <p className="text-2xl font-black text-yellow-400">{coopStarsTotal}/{coopStarsMax}</p>
              <p className="text-xs text-gray-400">{t('coopStars')}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-purple-400">{teamworkLevel}</p>
              <p className="text-xs text-gray-400">{t('teamworkLevel')}</p>
            </div>
          </div>

          {/* Teamwork impact on career */}
          {teamworkLevel > 0 && (
            <div className="mt-4 bg-purple-900/20 border border-purple-500/20 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <svg width={16} height={16} viewBox="0 0 24 24" className="text-purple-400">
                  <path fill="currentColor" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                </svg>
                <p className="text-xs font-bold text-purple-400">{t('teamworkCareerImpact')}</p>
              </div>
              <div className="h-2 bg-brand-dark rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-400 rounded-full transition-all duration-500"
                  style={{ width: `${teamworkLevel}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-500 mt-1">{t('teamworkCareerDesc')}</p>
            </div>
          )}

          {coopCompleted.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-gray-500 font-medium">{t('recentCoopMissions')}</p>
              {coopCompleted.slice(0, 3).map((c, i) => {
                const cStars = (c as Record<string, unknown>).stars as number ?? 0
                return (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">{t(`coopTemplates.${c.mission_template}` as never)}</span>
                  <span className="flex items-center gap-2">
                    <span className="flex gap-0.5">
                      {[1, 2, 3].map(s => (
                        <svg key={s} width={12} height={12} viewBox="0 0 24 24" className={s <= cStars ? 'text-yellow-400' : 'text-gray-700'}>
                          <path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      ))}
                    </span>
                    <span className="text-gray-500">{c.score} pts</span>
                  </span>
                </div>
                )
              })}
            </div>
          )}
        </div>
        )
      })()}

      {/* Mission Progress per role */}
      <div className="bg-brand-panel border border-brand-border rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">{t('missionProgress')}</h2>
        <div className="space-y-4">
          {roleProgress.map(rp => (
            <div key={rp.role}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-300 flex items-center gap-1.5">
                  {rp.iconEl}
                  {rp.label}
                </span>
                <span className="text-gray-400">{rp.completed}/{rp.total}</span>
              </div>
              <div className="h-2.5 bg-brand-dark rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(rp.completed / rp.total) * 100}%`,
                    backgroundColor: rp.role === 'drone_programmer' ? '#3B82F6'
                      : rp.role === 'robot_constructor' ? '#22C55E' : '#F59E0B',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Independence Meter */}
      <div className="bg-brand-panel border border-brand-border rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-2">{t('independenceMeter')}</h2>
        <p className="text-xs text-gray-400 mb-3">{t('independenceDesc')}</p>
        <div className="flex items-center gap-4">
          <div className="flex-1 h-3 bg-brand-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${independencePct}%` }}
            />
          </div>
          <span className="text-lg font-black text-white min-w-[3rem] text-right">{independencePct}%</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {totalTracked > 0
            ? t('independenceDetail', { without: withoutHints, total: totalTracked })
            : t('independenceNoData')}
        </p>
      </div>

      {/* Radar */}
      <div className="bg-brand-panel border border-brand-border rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">{t('competencies')}</h2>
        {competency ? (
          <CompetencyRadar scores={competency} />
        ) : (
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-2">{'\u{1F4CA}'}</div>
            <p>{t('playMoreToUnlock', { count: 1 })}</p>
          </div>
        )}
      </div>

      {/* Career recommendation */}
      {rolesExplored >= 3 ? (
        <CareerRecommendation competency={competency} />
      ) : (
        <div className="bg-brand-panel border border-yellow-500/30 rounded-2xl p-6 text-center">
          <div className="text-4xl mb-2">{'\u{1F52E}'}</div>
          <p className="text-yellow-400 font-medium">{t('playMoreToUnlock', { count: rolesNeeded })}</p>
          <p className="text-gray-400 text-sm mt-1">{t('unlockCareerHint')}</p>
        </div>
      )}

      {/* Achievements — only unlocked ones */}
      <div className="bg-brand-panel border border-brand-border rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">{t('recentAchievements')}</h2>
        {unlockedSet.size > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {ACHIEVEMENT_DEFS.filter(ach => unlockedSet.has(ach.id)).map(ach => (
              <div
                key={ach.id}
                className="flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-colors bg-brand-dark border-green-600/40"
              >
                <AchievementIcon id={ach.id} size={28} />
                <span className="text-xs font-bold text-white">{tRewards(ach.nameKey)}</span>
                <span className="text-[10px]">{'\u2705'}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-4">
            {t('noAchievements')}
          </p>
        )}
      </div>
    </div>
  )
}
