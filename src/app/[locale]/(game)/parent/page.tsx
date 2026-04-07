import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { computeUnlockedSkins, computeStageAchievements, ACHIEVEMENT_DEFS } from '@/lib/game/avatar-utils'
import { computeStageCoverage, STAGE_META, INNOVATION_STAGES, type CompletedMission, type InnovationStageId } from '@/lib/game/innovation-stages'
import { getStoryProgress } from '@/lib/game/story-path'
import type { Role } from '@/types/database'

export default async function ParentDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('parentDashboard')
  const tCoop = await getTranslations('coop')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  // Fetch profile with is_parent check
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, country, created_at, is_parent, is_verified, xp, game_currency, coop_missions_completed')
    .eq('id', user.id)
    .single()

  // If not a parent account, show access denied
  if (!profile?.is_parent) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-5xl mb-4">{'\u{1F6AB}'}</div>
        <h1 className="text-2xl font-bold text-white mb-2">{t('accessDenied')}</h1>
        <p className="text-gray-400">{t('accessDeniedDesc')}</p>
      </div>
    )
  }

  // Fetch all dashboard data in parallel
  const [
    missionProgressRes,
    allMissionProgressRes,
    competencyRes,
    coopCompletedRes,
    allCoopCompletedRes,
    chatMessagesRes,
    userAchievementsRes,
  ] = await Promise.all([
    // Recent completed missions — for the activity table (limited to 20)
    supabase
      .from('mission_progress')
      .select('role, mission_number, status, score, hints_used, completed_at')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(20),
    // ALL mission progress — for independence / story / stage calculations
    supabase
      .from('mission_progress')
      .select('role, mission_number, status, hints_used')
      .eq('user_id', user.id),
    supabase
      .from('competency_scores')
      .select('*')
      .eq('user_id', user.id)
      .single(),
    // Recent coop — for the activity table (limited to 10)
    supabase
      .from('coop_completed_missions')
      .select('mission_template, role, score, stars, total_session_score, partner_country, completed_at')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(10),
    // ALL coop completions — for achievement / stage coverage calculations
    supabase
      .from('coop_completed_missions')
      .select('mission_template, role')
      .eq('user_id', user.id),
    supabase
      .from('chat_messages')
      .select('content, is_preset, created_at, coop_session_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', user.id),
  ])

  const missions = missionProgressRes.data || []
  const allProgress = (allMissionProgressRes.data || []) as { role: string; mission_number: number; status: string; hints_used?: number }[]
  const competency = competencyRes.data
  const coopCompleted = coopCompletedRes.data || []
  const allCoop = (allCoopCompletedRes.data || []) as { mission_template: string; role: string }[]
  const chatMessages = chatMessagesRes.data || []
  const userAchievementRows = userAchievementsRes.data || []

  const totalMissionsCompleted = allProgress.filter(p => p.status === 'completed').length

  // Independence metric — share of completed missions done without hints
  const tracked = allProgress.filter(p => p.status === 'completed' && typeof p.hints_used === 'number' && p.hints_used >= 0)
  const withoutHints = tracked.filter(p => (p.hints_used ?? 0) === 0).length
  const independencePct = tracked.length > 0 ? Math.round((withoutHints / tracked.length) * 100) : 0

  // Story Mode progress
  const storyProgress = getStoryProgress(
    allProgress.filter(p => p.status === 'completed').map(p => ({
      role: p.role,
      mission_number: p.mission_number,
      status: p.status,
    })),
  )

  // Innovation stage coverage (personal + project)
  const completedForMap: CompletedMission[] = [
    ...allProgress
      .filter(p => p.status === 'completed')
      .map(p => ({ isCoop: false as const, role: p.role as Role, missionNumber: p.mission_number })),
    ...allCoop.map(c => ({ isCoop: true as const, coopId: c.mission_template, role: c.role as Role })),
  ]
  const stageCoverage = computeStageCoverage(completedForMap)
  const stageCoverageMap: Record<InnovationStageId, { hasPersonal: boolean; hasProject: boolean }> = {} as Record<InnovationStageId, { hasPersonal: boolean; hasProject: boolean }>
  for (const c of stageCoverage) {
    stageCoverageMap[c.stage] = { hasPersonal: c.hasPersonal, hasProject: c.hasProject }
  }

  // Achievements — solo (from mission_progress) + coop (from user_achievements) + innovation stage
  const soloUnlocked = computeUnlockedSkins(allProgress.map(p => ({ role: p.role, mission_number: p.mission_number, status: p.status })))
  const coopAchievementIds = userAchievementRows.map(a => `${(a as { achievement_id: string }).achievement_id}_skin`)
  const stageAchievements = computeStageAchievements(
    allProgress.map(p => ({ role: p.role, mission_number: p.mission_number, status: p.status })),
    allCoop,
  )
  const unlockedAchievementSet = new Set<string>([...soloUnlocked, ...coopAchievementIds, ...stageAchievements])
  const unlockedAchievements = ACHIEVEMENT_DEFS.filter(a => unlockedAchievementSet.has(a.id))
  const registrationDate = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '-'

  const roleLabels: Record<string, string> = {
    drone_programmer: t('roles.drone'),
    robot_constructor: t('roles.robot'),
    entrepreneur: t('roles.entrepreneur'),
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function starsDisplay(score: number) {
    const stars = score >= 950 ? 3 : score >= 750 ? 2 : score >= 500 ? 1 : 0
    return stars
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white">{t('title')}</h1>
        <p className="text-gray-400 mt-1">{t('subtitle')}</p>
      </div>

      {/* Account Overview */}
      <div className="bg-brand-panel border border-brand-border rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">{t('accountOverview')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500">{t('username')}</p>
            <p className="text-white font-medium">{profile.username}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('country')}</p>
            <p className="text-white font-medium">{profile.country}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('registered')}</p>
            <p className="text-white font-medium">{registrationDate}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('missionsCompleted')}</p>
            <p className="text-white font-medium">{totalMissionsCompleted}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('xp')}</p>
            <p className="text-white font-medium">{profile.xp ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('coins')}</p>
            <p className="text-white font-medium">{profile.game_currency ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500" title={t('independenceHint')}>{t('independence')}</p>
            <p className="text-white font-medium">{independencePct}%</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('storyProgress')}</p>
            <p className="text-white font-medium">{t('storyProgressValue', { done: storyProgress.completed, total: storyProgress.total })}</p>
          </div>
        </div>
      </div>

      {/* Innovation Process Stages */}
      <div className="bg-brand-panel border border-brand-border rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-1">{t('innovationStages')}</h2>
        <p className="text-xs text-gray-400 mb-4">{t('innovationStagesDesc')}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {INNOVATION_STAGES.map(stage => {
            const cov = stageCoverageMap[stage] || { hasPersonal: false, hasProject: false }
            const status = cov.hasPersonal ? 'personal' : cov.hasProject ? 'project' : 'none'
            const bgClass =
              status === 'personal' ? 'bg-brand-blue/20 border-brand-blue/50'
              : status === 'project' ? 'bg-gray-700/30 border-gray-600'
              : 'bg-brand-dark border-brand-border opacity-60'
            const label =
              status === 'personal' ? t('stagePersonal')
              : status === 'project' ? t('stageProject')
              : t('stageNotYet')
            return (
              <div key={stage} className={`rounded-xl border p-3 text-center ${bgClass}`}>
                <div className="text-2xl mb-1" style={{ color: STAGE_META[stage].color }}>{STAGE_META[stage].icon}</div>
                <div className="text-xs font-bold text-white">{t(`stages.${stage}` as 'stages.research')}</div>
                <div className="text-[10px] text-gray-400 mt-1">{label}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Achievements */}
      <div className="bg-brand-panel border border-brand-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">{t('achievementsUnlocked')}</h2>
          <span className="text-xs text-gray-400">{t('achievementsTotal', { unlocked: unlockedAchievements.length, total: ACHIEVEMENT_DEFS.length })}</span>
        </div>
        {unlockedAchievements.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">{t('noAchievements')}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {unlockedAchievements.map(a => (
              <div key={a.id} className="flex items-start gap-2 bg-brand-dark border border-brand-border rounded-xl p-3">
                <div className="text-2xl leading-none flex-shrink-0">{a.emoji}</div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{a.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mission Activity */}
      <div className="bg-brand-panel border border-brand-border rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">{t('missionActivity')}</h2>
        {missions.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">{t('noMissions')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-brand-border">
                  <th className="text-left pb-2 pr-4">{t('table.date')}</th>
                  <th className="text-left pb-2 pr-4">{t('table.role')}</th>
                  <th className="text-left pb-2 pr-4">{t('table.mission')}</th>
                  <th className="text-right pb-2 pr-4">{t('table.score')}</th>
                  <th className="text-center pb-2">{t('table.stars')}</th>
                </tr>
              </thead>
              <tbody>
                {missions.map((m, i) => {
                  const stars = starsDisplay(m.score)
                  return (
                    <tr key={i} className="border-b border-brand-border/50 last:border-0">
                      <td className="py-2 pr-4 text-gray-400">{formatDate(m.completed_at)}</td>
                      <td className="py-2 pr-4 text-gray-300">{roleLabels[m.role] || m.role}</td>
                      <td className="py-2 pr-4 text-white">#{m.mission_number}</td>
                      <td className="py-2 pr-4 text-right text-white font-medium">{m.score}</td>
                      <td className="py-2 text-center">
                        <span className="inline-flex gap-0.5">
                          {[1, 2, 3].map(s => (
                            <svg key={s} width={14} height={14} viewBox="0 0 24 24"
                              className={s <= stars ? 'text-yellow-400' : 'text-gray-700'}>
                              <path fill="currentColor"
                                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          ))}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Coop Activity */}
      <div className="bg-brand-panel border border-brand-border rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">{t('coopActivity')}</h2>
        {coopCompleted.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">{t('noCoopActivity')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-brand-border">
                  <th className="text-left pb-2 pr-4">{t('table.date')}</th>
                  <th className="text-left pb-2 pr-4">{t('table.mission')}</th>
                  <th className="text-left pb-2 pr-4">{t('table.role')}</th>
                  <th className="text-right pb-2 pr-4">{t('table.score')}</th>
                  <th className="text-center pb-2 pr-4">{t('table.stars')}</th>
                  <th className="text-left pb-2">{t('table.partner')}</th>
                </tr>
              </thead>
              <tbody>
                {coopCompleted.map((c, i) => (
                  <tr key={i} className="border-b border-brand-border/50 last:border-0">
                    <td className="py-2 pr-4 text-gray-400">{formatDate(c.completed_at)}</td>
                    <td className="py-2 pr-4 text-white">{tCoop(`templates.${c.mission_template}` as never)}</td>
                    <td className="py-2 pr-4 text-gray-300">{roleLabels[c.role] || c.role}</td>
                    <td className="py-2 pr-4 text-right text-white font-medium">{c.score}</td>
                    <td className="py-2 pr-4 text-center">
                      <span className="inline-flex gap-0.5">
                        {[1, 2, 3].map(s => (
                          <svg key={s} width={14} height={14} viewBox="0 0 24 24"
                            className={s <= (c.stars ?? 0) ? 'text-yellow-400' : 'text-gray-700'}>
                            <path fill="currentColor"
                              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        ))}
                      </span>
                    </td>
                    <td className="py-2 text-gray-400">{c.partner_country || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Chat History */}
      <div className="bg-brand-panel border border-brand-border rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">{t('chatHistory')}</h2>
        {chatMessages.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">{t('noChatMessages')}</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {chatMessages.map((msg, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-brand-border/50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm break-words">
                    {msg.is_preset ? (
                      <span className="text-blue-400">[{t('preset')}]</span>
                    ) : null}
                    {' '}{msg.content}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatDate(msg.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Competency Summary */}
      <div className="bg-brand-panel border border-brand-border rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">{t('competencySummary')}</h2>
        {competency ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {([
              ['technical_precision', t('skills.technicalPrecision')],
              ['analytical_thinking', t('skills.analyticalThinking')],
              ['creativity', t('skills.creativity')],
              ['teamwork', t('skills.teamwork')],
              ['management', t('skills.management')],
              ['learning_speed', t('skills.learningSpeed')],
            ] as const).map(([key, label]) => (
              <div key={key} className="text-center">
                <div className="text-2xl font-black text-white">
                  {(competency as Record<string, number>)[key] ?? 0}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{label}</div>
                <div className="h-1.5 bg-brand-dark rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-brand-blue rounded-full transition-all"
                    style={{ width: `${Math.min(100, (competency as Record<string, number>)[key] ?? 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-4">{t('noCompetencyData')}</p>
        )}
      </div>

      {/* Safety Status */}
      <div className="bg-brand-panel border border-brand-border rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">{t('safetyStatus')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${profile.is_verified ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <div>
              <p className="text-white text-sm font-medium">{t('verificationStatus')}</p>
              <p className="text-xs text-gray-400">
                {profile.is_verified ? t('verified') : t('notVerified')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <div>
              <p className="text-white text-sm font-medium">{t('accountStatus')}</p>
              <p className="text-xs text-gray-400">{t('accountActive')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
