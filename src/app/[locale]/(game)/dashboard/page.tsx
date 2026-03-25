import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import CompetencyRadar from '@/components/game/CompetencyRadar'
import BadgeList from '@/components/game/BadgeList'
import CareerRecommendation from '@/components/game/CareerRecommendation'
import type { Role } from '@/types/database'

export default async function DashboardPage() {
  const t = await getTranslations('dashboard')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [profileRes, competencyRes, progressRes, badgesRes] = await Promise.all([
    supabase.from('profiles').select('username, xp, game_currency').eq('id', user!.id).single(),
    supabase.from('competency_scores').select('*').eq('user_id', user!.id).single(),
    supabase.from('mission_progress').select('role, status').eq('user_id', user!.id),
    supabase.from('user_badges').select('*, badge:badges(*)').eq('user_id', user!.id),
  ])

  const profile = profileRes.data
  const competency = competencyRes.data
  const progress = progressRes.data || []
  const userBadges = badgesRes.data || []

  const completedMissions = progress.filter(p => p.status === 'completed').length
  const rolesExplored = new Set(progress.filter(p => p.status === 'completed').map(p => p.role)).size
  const rolesNeeded = Math.max(0, 3 - rolesExplored)

  const stats = [
    { label: t('stats.totalXP'), value: profile?.xp || 0, icon: '⭐' },
    { label: t('stats.missionsCompleted'), value: completedMissions, icon: '🎯' },
    { label: t('stats.rolesExplored'), value: rolesExplored, icon: '🎭' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white">{t('title')}</h1>
        <p className="text-gray-400 mt-1">{t('subtitle')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="bg-brand-panel border border-brand-border rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-2xl font-black text-white">{stat.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Radar */}
      <div className="bg-brand-panel border border-brand-border rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">{t('competencies')}</h2>
        {competency ? (
          <CompetencyRadar scores={competency} />
        ) : (
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-2">📊</div>
            <p>{t('playMoreToUnlock', { count: 1 })}</p>
          </div>
        )}
      </div>

      {/* Career recommendation */}
      {rolesExplored >= 3 ? (
        <CareerRecommendation competency={competency} />
      ) : (
        <div className="bg-brand-panel border border-yellow-500/30 rounded-2xl p-6 text-center">
          <div className="text-4xl mb-2">🔮</div>
          <p className="text-yellow-400 font-medium">{t('playMoreToUnlock', { count: rolesNeeded })}</p>
          <p className="text-gray-400 text-sm mt-1">Complete missions in all 3 roles to unlock your career profile</p>
        </div>
      )}

      {/* Badges */}
      <div className="bg-brand-panel border border-brand-border rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">{t('badges')}</h2>
        {userBadges.length > 0 ? (
          <BadgeList badges={userBadges} />
        ) : (
          <p className="text-gray-400 text-sm">{t('noBadges')}</p>
        )}
      </div>
    </div>
  )
}
