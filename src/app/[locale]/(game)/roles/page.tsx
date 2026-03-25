import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { Link } from '@/i18n/navigation'
import RobotAvatar from '@/components/game/RobotAvatar'
import type { Role } from '@/types/database'

const ROLES: { id: Role; color: string; bgGradient: string }[] = [
  { id: 'drone_programmer', color: '#1E90FF', bgGradient: 'from-blue-900/40 to-blue-950/20' },
  { id: 'robot_constructor', color: '#10B981', bgGradient: 'from-emerald-900/40 to-emerald-950/20' },
  { id: 'entrepreneur', color: '#FFD700', bgGradient: 'from-yellow-900/40 to-yellow-950/20' },
]

export default async function RolesPage() {
  const t = await getTranslations()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('avatar_color, avatar_accessory')
    .eq('id', user!.id)
    .single()

  const { data: progress } = await supabase
    .from('mission_progress')
    .select('role, mission_number, status')
    .eq('user_id', user!.id)

  function getMissionCount(role: Role): { completed: number; total: number; xp: number } {
    const roleMissions = progress?.filter(p => p.role === role && p.status === 'completed') || []
    return { completed: roleMissions.length, total: 2, xp: roleMissions.length * 150 }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">{t('roles.title')}</h1>
        <p className="text-gray-400 mt-1">{t('roles.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {ROLES.map(role => {
          const { completed, total, xp } = getMissionCount(role.id)
          const isStarted = completed > 0
          const isFinished = completed === total

          return (
            <div
              key={role.id}
              className={`bg-gradient-to-br ${role.bgGradient} border rounded-2xl p-6 hover:scale-[1.02] transition-transform`}
              style={{ borderColor: `${role.color}44` }}
            >
              {/* Avatar */}
              <div className="flex justify-center mb-4">
                <RobotAvatar
                  role={role.id}
                  color={profile?.avatar_color || role.color}
                  accessory={profile?.avatar_accessory || 'none'}
                  size={80}
                  animated
                />
              </div>

              {/* Info */}
              <h2 className="text-xl font-bold text-white text-center mb-1">
                {t(`roles.${role.id}.name`)}
              </h2>
              <p className="text-gray-400 text-sm text-center mb-2">
                {t(`roles.${role.id}.description`)}
              </p>

              <div
                className="text-xs font-medium text-center px-3 py-1 rounded-full inline-block mb-4 mx-auto block w-fit"
                style={{ backgroundColor: `${role.color}22`, color: role.color }}
              >
                ⚡ {t(`roles.${role.id}.skill`)}
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{t('roles.missions')}</span>
                  <span>
                    {completed}/{total}
                    {xp > 0 && <span className="ml-1 text-brand-gold">· {xp} XP</span>}
                  </span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(completed / total) * 100}%`,
                      backgroundColor: role.color,
                    }}
                  />
                </div>
              </div>

              {/* Button */}
              <Link
                href={`/missions/${role.id === 'drone_programmer' ? 'drone' : role.id === 'robot_constructor' ? 'robot' : 'entrepreneur'}`}
                className="block w-full text-center py-3 rounded-xl font-bold transition-all text-sm"
                style={{
                  backgroundColor: isFinished ? `${role.color}33` : role.color,
                  color: isFinished ? role.color : '#000',
                }}
              >
                {isFinished
                  ? '✓ ' + t('roles.completed')
                  : isStarted
                  ? t('roles.continueRole')
                  : t('roles.startRole')}
              </Link>
            </div>
          )
        })}
      </div>

      {/* Coop hint */}
      <div className="mt-8 bg-brand-panel border border-brand-border rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="text-4xl">🌍</div>
        <div className="flex-1">
          <h3 className="font-bold text-white">{t('coop.title')}</h3>
          <p className="text-gray-400 text-sm">{t('coop.subtitle')}</p>
        </div>
        <Link
          href="/coop"
          className="px-5 py-2.5 bg-brand-panel border border-brand-blue text-brand-blue font-bold rounded-xl hover:bg-brand-blue hover:text-black transition-all text-sm whitespace-nowrap"
        >
          {t('coop.findTeam')} →
        </Link>
      </div>
    </div>
  )
}
