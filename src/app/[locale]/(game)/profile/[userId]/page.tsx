import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { Link } from '@/i18n/navigation'
import CharacterAvatarPreview from '@/components/game/CharacterAvatarPreview'
import RoleIcon from '@/components/game/RoleIcon'
import ReportPlayerButton from '@/components/game/ReportPlayerButton'
import { parseAvatarConfig, computeUnlockedSkins, ACHIEVEMENT_DEFS } from '@/lib/game/avatar-utils'
import { AchievementIcon } from '@/components/ui/SvgIcon'
import type { Role } from '@/types/database'

const ROLES: Role[] = ['drone_programmer', 'robot_constructor', 'entrepreneur']

interface Props {
  params: Promise<{ locale: string; userId: string }>
}

export default async function PublicProfilePage({ params }: Props) {
  const { locale, userId } = await params
  const t = await getTranslations('publicProfile')
  const tRewards = await getTranslations('rewards')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: profile },
    { data: progress },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('mission_progress').select('role, mission_number, status').eq('user_id', userId),
  ])

  if (!profile) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-lg">{t('notFound')}</p>
        <Link href="/leaderboard" className="text-[var(--brand-blue)] hover:underline mt-4 inline-block">
          {t('backToLeaderboard')}
        </Link>
      </div>
    )
  }

  const isOwnProfile = user?.id === userId

  // Count completed missions per role
  const completedProgress = progress?.filter(p => p.status === 'completed') ?? []
  const missionsByRole: Record<string, number> = {}
  for (const role of ROLES) {
    missionsByRole[role] = completedProgress.filter(p => p.role === role).length
  }
  const totalMissions = completedProgress.length

  // Compute achievements from mission progress
  const unlockedSkinIds = computeUnlockedSkins(progress)
  const unlockedSet = new Set(unlockedSkinIds)

  const earnedAchievements = ACHIEVEMENT_DEFS.filter(a => unlockedSet.has(a.id))

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Back link */}
      <Link href="/leaderboard" className="text-sm text-gray-400 hover:text-[var(--brand-blue)] transition-colors">
        &larr; {t('backToLeaderboard')}
      </Link>

      {/* Profile card */}
      <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl p-8 text-center">
        <div className="flex justify-center mb-4">
          <CharacterAvatarPreview
            avatarColor={profile.avatar_color || '#3B82F6'}
            avatarConfig={parseAvatarConfig(profile.avatar_accessory)}
            size={200}
            animated
          />
        </div>

        <h1 className="text-2xl font-black text-white">{profile.username}</h1>
        {profile.country && (
          <p className="text-gray-400 text-sm mt-1">{profile.country}</p>
        )}

        <div className="flex justify-center gap-6 mt-4">
          <div className="text-center">
            <span className="text-[var(--brand-gold)] font-black text-xl">{profile.xp}</span>
            <p className="text-gray-500 text-xs">XP</p>
          </div>
          <div className="text-center">
            <span className="text-white font-black text-xl">{totalMissions}</span>
            <p className="text-gray-500 text-xs">{t('missionsCompleted')}</p>
          </div>
        </div>

        {/* Reports count badge — only shown if > 0 */}
        {profile.reports_count > 0 && (
          <p className="text-gray-500 text-xs mt-2">
            {t('reports')}: {profile.reports_count}
          </p>
        )}

        {isOwnProfile && (
          <Link
            href="/profile"
            className="inline-block mt-4 px-4 py-2 bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border border-[var(--brand-blue)]/40 rounded-xl text-sm font-bold hover:bg-[var(--brand-blue)]/30 transition-colors"
          >
            {t('editProfile')}
          </Link>
        )}

        {/* Report button — only shown on other players' profiles */}
        {!isOwnProfile && user && (
          <div className="mt-4">
            <ReportPlayerButton reporterId={user.id} reportedId={userId} />
          </div>
        )}
      </div>

      {/* Mission stats by role */}
      <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">{t('missionStats')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {ROLES.map(role => (
            <div key={role} className="bg-[var(--brand-dark)] border border-[var(--brand-border)] rounded-xl p-4 text-center">
              <div className="flex justify-center">
                <RoleIcon role={role} size={48} />
              </div>
              <p className="text-sm text-gray-400 mt-2">{t(`roles.${role}`)}</p>
              <p className="text-white font-bold text-lg">{missionsByRole[role]}</p>
              <p className="text-gray-500 text-xs">{t('completed')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Achievements — only show unlocked ones */}
      {earnedAchievements.length > 0 && (
        <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">{t('achievements')}</h2>
          <div className="flex flex-wrap gap-2">
            {earnedAchievements.map(ach => (
              <div
                key={ach.id}
                className="flex items-center gap-2 bg-[var(--brand-dark)] border border-green-600/40 rounded-lg px-3 py-2"
              >
                <div className="w-7 h-7 rounded-md bg-brand-blue/20 flex items-center justify-center flex-shrink-0">
                  <AchievementIcon id={ach.id} size={18} />
                </div>
                <span className="text-xs font-bold text-white">{tRewards(ach.nameKey)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
