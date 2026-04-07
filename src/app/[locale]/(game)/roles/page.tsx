import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { Link } from '@/i18n/navigation'
import GameOnboardingWrapper from '@/components/game/GameOnboardingWrapper'
import ComingSoonButton from '@/components/game/ComingSoonButton'
import { IconGlobeAnimated } from '@/components/ui/SvgIcon'
import type { Role } from '@/types/database'

// SVG-based role illustrations (80x80px with gradient backgrounds)
function DroneIllustration() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <defs>
        <linearGradient id="drone-bg" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E3A5F" />
          <stop offset="1" stopColor="#0F172A" />
        </linearGradient>
      </defs>
      <rect width="80" height="80" rx="16" fill="url(#drone-bg)" />
      {/* Drone body */}
      <rect x="30" y="36" width="20" height="10" rx="3" fill="#60A5FA" stroke="#3B82F6" strokeWidth="1" />
      {/* Camera */}
      <circle cx="40" cy="48" r="3" fill="#1E3A5F" stroke="#60A5FA" strokeWidth="0.5" />
      {/* Arms */}
      <line x1="30" y1="38" x2="16" y2="30" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="38" x2="64" y2="30" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
      <line x1="30" y1="44" x2="16" y2="52" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="44" x2="64" y2="52" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
      {/* Propellers */}
      <ellipse cx="16" cy="30" rx="8" ry="2" fill="#3B82F6" opacity="0.6">
        <animateTransform attributeName="transform" type="rotate" from="0 16 30" to="360 16 30" dur="0.5s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="64" cy="30" rx="8" ry="2" fill="#3B82F6" opacity="0.6">
        <animateTransform attributeName="transform" type="rotate" from="0 64 30" to="360 64 30" dur="0.5s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="16" cy="52" rx="8" ry="2" fill="#3B82F6" opacity="0.6">
        <animateTransform attributeName="transform" type="rotate" from="0 16 52" to="360 16 52" dur="0.5s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="64" cy="52" rx="8" ry="2" fill="#3B82F6" opacity="0.6">
        <animateTransform attributeName="transform" type="rotate" from="0 64 52" to="360 64 52" dur="0.5s" repeatCount="indefinite" />
      </ellipse>
      {/* LED lights */}
      <circle cx="34" cy="39" r="1.5" fill="#22C55E">
        <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="46" cy="39" r="1.5" fill="#EF4444">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

function RobotIllustration() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <defs>
        <linearGradient id="robot-bg" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor="#064E3B" />
          <stop offset="1" stopColor="#0F172A" />
        </linearGradient>
      </defs>
      <rect width="80" height="80" rx="16" fill="url(#robot-bg)" />
      {/* Main gear */}
      <circle cx="40" cy="36" r="14" fill="none" stroke="#34D399" strokeWidth="2.5" />
      <circle cx="40" cy="36" r="6" fill="#10B981" />
      {/* Gear teeth */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
        <rect
          key={angle}
          x="38" y="20" width="4" height="6" rx="1" fill="#34D399"
          transform={`rotate(${angle} 40 36)`}
        />
      ))}
      {/* Wrench */}
      <g transform="translate(52,50) rotate(-30)">
        <rect x="0" y="0" width="3" height="16" rx="1" fill="#9CA3AF" />
        <circle cx="1.5" cy="0" r="4" fill="none" stroke="#9CA3AF" strokeWidth="2" />
      </g>
      {/* Small gear */}
      <circle cx="26" cy="56" r="7" fill="none" stroke="#6EE7B7" strokeWidth="1.5" />
      <circle cx="26" cy="56" r="3" fill="#34D399" />
      {[0, 60, 120, 180, 240, 300].map(angle => (
        <rect
          key={`s${angle}`}
          x="25" y="48" width="2" height="3" rx="0.5" fill="#6EE7B7"
          transform={`rotate(${angle} 26 56)`}
        />
      ))}
      {/* Sparks */}
      <circle cx="58" cy="28" r="1" fill="#FDE68A">
        <animate attributeName="opacity" values="1;0;1" dur="0.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="62" cy="32" r="0.8" fill="#FDE68A">
        <animate attributeName="opacity" values="0;1;0" dur="1s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

function EntrepreneurIllustration() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <defs>
        <linearGradient id="entre-bg" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor="#78350F" />
          <stop offset="1" stopColor="#0F172A" />
        </linearGradient>
      </defs>
      <rect width="80" height="80" rx="16" fill="url(#entre-bg)" />
      {/* Chart bars */}
      <rect x="14" y="50" width="8" height="16" rx="2" fill="#F59E0B" opacity="0.6" />
      <rect x="26" y="40" width="8" height="26" rx="2" fill="#F59E0B" opacity="0.75" />
      <rect x="38" y="30" width="8" height="36" rx="2" fill="#F59E0B" opacity="0.9" />
      <rect x="50" y="22" width="8" height="44" rx="2" fill="#FFD700" />
      {/* Trend arrow */}
      <polyline points="18,48 30,38 42,28 54,20" fill="none" stroke="#FDE68A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points="54,16 58,22 50,22" fill="#FDE68A" />
      {/* Briefcase icon */}
      <rect x="58" y="52" width="14" height="10" rx="2" fill="#92400E" stroke="#B45309" strokeWidth="1" />
      <rect x="62" y="50" width="6" height="4" rx="1" fill="none" stroke="#B45309" strokeWidth="1" />
      <circle cx="65" cy="57" r="1.5" fill="#F59E0B" />
      {/* Stars */}
      <text x="62" y="38" fontSize="8" fill="#FDE68A" opacity="0.8">&#x2B50;</text>
    </svg>
  )
}

const ROLE_ILLUSTRATIONS: Record<Role, () => JSX.Element> = {
  drone_programmer: DroneIllustration,
  robot_constructor: RobotIllustration,
  entrepreneur: EntrepreneurIllustration,
}

const ROLES: { id: Role; color: string; bgGradient: string }[] = [
  { id: 'drone_programmer', color: '#1E90FF', bgGradient: 'from-blue-900/40 to-blue-950/20' },
  { id: 'robot_constructor', color: '#10B981', bgGradient: 'from-emerald-900/40 to-emerald-950/20' },
  { id: 'entrepreneur', color: '#FFD700', bgGradient: 'from-yellow-900/40 to-yellow-950/20' },
]

const TOTAL_MISSIONS_PER_ROLE = 10

export default async function RolesPage() {
  const t = await getTranslations()
  const supabase = await createClient()

  let user = null
  try {
    const { data, error } = await supabase.auth.getUser()
    if (!error) user = data.user
  } catch { /* Supabase unreachable */ }

  let progress = null
  if (user) {
    const { data } = await supabase
      .from('mission_progress')
      .select('role, mission_number, status')
      .eq('user_id', user.id)
    progress = data
  }

  function getMissionCount(role: Role): { completed: number; total: number; xp: number } {
    const roleMissions = progress?.filter(p => p.role === role && p.status === 'completed') || []
    return { completed: roleMissions.length, total: TOTAL_MISSIONS_PER_ROLE, xp: roleMissions.length * 150 }
  }

  return (
    <div>
      {/* First-time game onboarding overlay */}
      <GameOnboardingWrapper />

      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-white">{t('roles.title')}</h1>
        <p className="text-gray-400 mt-1">{t('roles.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
        {ROLES.map(role => {
          const { completed, total, xp } = getMissionCount(role.id)
          const isStarted = completed > 0
          const isFinished = completed === total

          return (
            <div
              key={role.id}
              className={`bg-gradient-to-br ${role.bgGradient} border rounded-2xl p-6 flex flex-col h-full`}
              style={{ borderColor: `${role.color}44` }}
            >
              {/* Role illustration */}
              <div className="flex justify-center mb-4">
                {(() => {
                  const Illustration = ROLE_ILLUSTRATIONS[role.id]
                  return <Illustration />
                })()}
              </div>

              {/* Info — grows to fill the available height so progress and
                  button stick to the bottom and align across all 3 cards */}
              <div className="flex flex-col flex-1">
                <h2 className="text-xl font-bold text-white text-center mb-1">
                  {t(`roles.${role.id}.name`)}
                </h2>
                <p
                  className="text-xs italic text-center mb-2"
                  style={{ color: role.color }}
                >
                  {t(`roles.${role.id}.roleLabel`)}
                </p>
                <p className="text-gray-400 text-sm text-center mb-3">
                  {t(`roles.${role.id}.description`)}
                </p>

                {/* Stages chip — centered horizontally */}
                <div className="flex justify-center mb-4">
                  <div
                    className="text-xs font-medium text-center px-3 py-1 rounded-full"
                    style={{ backgroundColor: `${role.color}22`, color: role.color }}
                  >
                    {t(`roles.${role.id}.skill`)}
                  </div>
                </div>

                {/* Spacer pushes progress + button to the bottom */}
                <div className="flex-1" />

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{t('roles.missions')}</span>
                    <span>
                      {completed}/{total} {t('roles.completed')}
                      {xp > 0 && <span className="ml-1 text-brand-gold">{xp} XP</span>}
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
                  href={`/missions/${role.id === 'drone_programmer' ? 'drone' : role.id === 'robot_constructor' ? 'robot' : 'entrepreneur'}` as '/roles'}
                  prefetch={true}
                  className="block w-full text-center py-3.5 sm:py-3 rounded-xl font-bold text-sm touch-manipulation"
                  style={{
                    backgroundColor: isFinished ? `${role.color}33` : role.color,
                    color: isFinished ? role.color : '#000',
                  }}
                >
                  {isFinished
                    ? '\u2713 ' + t('roles.completed')
                    : isStarted
                    ? t('roles.continueRole')
                    : t('roles.startRole')}
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {/* Story Mode — full innovation cycle in 6 chapters */}
      <div className="mt-8 bg-gradient-to-r from-purple-900/40 via-pink-900/30 to-red-900/30 border border-purple-500/40 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex-shrink-0">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            {/* Book cover */}
            <rect x="8" y="8" width="32" height="32" rx="3" fill="#A855F7" opacity="0.2" stroke="#A855F7" strokeWidth="1.5"/>
            {/* Spine */}
            <line x1="14" y1="8" x2="14" y2="40" stroke="#A855F7" strokeWidth="1.5"/>
            {/* Pages — text lines */}
            <line x1="18" y1="16" x2="34" y2="16" stroke="#D8B4FE" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="18" y1="21" x2="34" y2="21" stroke="#D8B4FE" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="18" y1="26" x2="30" y2="26" stroke="#D8B4FE" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="18" y1="31" x2="32" y2="31" stroke="#D8B4FE" strokeWidth="1.5" strokeLinecap="round"/>
            {/* Bookmark */}
            <path d="M30 8 L30 18 L33 15 L36 18 L36 8 Z" fill="#EC4899" stroke="#A855F7" strokeWidth="0.5"/>
          </svg>
        </div>
        <div className="flex-1">
          <div className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">
            {t('story.label')}
          </div>
          <h3 className="font-bold text-white text-lg">{t('story.title')}</h3>
          <p className="text-gray-300 text-sm leading-relaxed">{t('story.tileDescription')}</p>
        </div>
        <Link
          href={'/story' as never}
          className="px-5 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors text-sm whitespace-nowrap"
        >
          {t('story.openCta')} {'\u2192'}
        </Link>
      </div>

      {/* Special Missions (fakedor) */}
      <div className="mt-4 bg-gradient-to-r from-indigo-900/30 via-blue-900/20 to-cyan-900/30 border border-indigo-500/30 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex-shrink-0">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect x="4" y="8" width="40" height="32" rx="6" fill="#7C3AED" opacity="0.2" stroke="#7C3AED" strokeWidth="1.5"/>
            <path d="M24 16l2.5 5 5.5.8-4 3.9.9 5.3-4.9-2.6-4.9 2.6.9-5.3-4-3.9 5.5-.8L24 16z" fill="#A78BFA" stroke="#7C3AED" strokeWidth="0.5"/>
            <rect x="14" y="34" width="20" height="2" rx="1" fill="#7C3AED" opacity="0.4"/>
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-white">{t('roles.specialMissions.title')}</h3>
          <p className="text-gray-400 text-sm">{t('roles.specialMissions.desc')}</p>
        </div>
        <ComingSoonButton
          label={`${t('roles.specialMissions.explore')} \u2192`}
          className="px-5 py-3 bg-indigo-700 hover:bg-indigo-600 text-white font-bold rounded-xl transition-colors text-sm whitespace-nowrap"
        />
      </div>

      {/* Coop hint */}
      <div className="mt-4 bg-brand-panel border border-brand-border rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
        <IconGlobeAnimated size={48} />
        <div className="flex-1">
          <h3 className="font-bold text-white">{t('coop.title')}</h3>
          <p className="text-gray-400 text-sm">{t('coop.subtitle')}</p>
        </div>
        <Link
          href="/coop"
          className="px-5 py-3 bg-brand-blue hover:bg-blue-500 text-white font-bold rounded-xl transition-colors text-sm whitespace-nowrap"
        >
          {t('coop.findTeam')} {'\u2192'}
        </Link>
      </div>
    </div>
  )
}
