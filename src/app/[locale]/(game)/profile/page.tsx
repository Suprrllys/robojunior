import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { Link } from '@/i18n/navigation'
import ProfileEditor from '@/components/game/ProfileEditor'
import DeleteAccountSection from '@/components/game/DeleteAccountSection'
import ComingSoonButton from '@/components/game/ComingSoonButton'
import { computeUnlockedSkins, ACHIEVEMENT_DEFS } from '@/lib/game/avatar-utils'
import { AchievementIcon } from '@/components/ui/SvgIcon'

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations('profile')
  const tRewards = await getTranslations('rewards')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()

  // Query mission progress to compute achievement count
  const { data: missionProgress } = await supabase
    .from('mission_progress')
    .select('role, mission_number, status')
    .eq('user_id', user!.id)

  const unlockedSkinIds = computeUnlockedSkins(missionProgress)
  const unlockedSet = new Set(unlockedSkinIds)
  const achievementCount = unlockedSkinIds.length

  const { data: children } = await supabase
    .from('profiles')
    .select('id, username, xp, country')
    .eq('parent_id', user!.id)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-white">{t('title')}</h1>
      </div>

      {/* 1. Profile editor (avatar, username, settings) */}
      {profile && <ProfileEditor profile={profile} />}

      {/* 2. Verification */}
      <div className="bg-brand-panel border border-brand-border rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-blue flex-shrink-0">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-white">{t('verifyAccount')}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{t('verifyDesc')}</p>
        </div>
        <Link
          href="/verify"
          className="w-full sm:w-auto text-center px-6 py-2.5 bg-[var(--brand-blue)] text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap flex-shrink-0"
        >
          {t('verifyLink')}
        </Link>
      </div>

      {/* 2b. Matching filters (locked for unverified) */}
      <div className="bg-brand-panel border border-brand-border rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">{t('matchingFilters.title')}</h2>
        <p className="text-xs text-gray-400">{t('matchingFilters.verifyRequired')}</p>
        <div className="space-y-3">
          {/* Verified partners only */}
          <label className="flex items-center gap-3 opacity-50 cursor-not-allowed">
            <div className="w-10 h-6 bg-gray-700 rounded-full relative">
              <div className="absolute left-1 top-1 w-4 h-4 bg-gray-500 rounded-full" />
            </div>
            <span className="text-gray-400 text-sm">{t('matchingFilters.verifiedOnly')}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 ml-auto">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </label>
          {/* Same gender only */}
          <label className="flex items-center gap-3 opacity-50 cursor-not-allowed">
            <div className="w-10 h-6 bg-gray-700 rounded-full relative">
              <div className="absolute left-1 top-1 w-4 h-4 bg-gray-500 rounded-full" />
            </div>
            <span className="text-gray-400 text-sm">{t('matchingFilters.sameGender')}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 ml-auto">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </label>
        </div>
      </div>

      {/* Parental controls */}
      {(children && children.length > 0) && (
        <div className="bg-brand-panel border border-brand-border rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">{t('parentControls')}</h2>
          <h3 className="text-sm font-medium text-gray-400 mb-3">{t('linkedChildren')}</h3>
          <div className="space-y-2">
            {children.map(child => (
              <div key={child.id} className="flex items-center justify-between bg-brand-dark border border-brand-border rounded-xl px-4 py-3">
                <div>
                  <span className="font-medium text-white">{child.username}</span>
                  <span className="text-xs text-gray-400 ml-2">{child.country}</span>
                </div>
                <span className="text-brand-gold text-sm font-bold">{child.xp} XP</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Achievements */}
      <div className="bg-brand-panel border border-brand-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">{t('achievements')}</h2>
          <span className="text-sm text-gray-400">
            {t('achievementsProgress', { unlocked: achievementCount, total: ACHIEVEMENT_DEFS.length })}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-5">
          <div className="h-3 bg-brand-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-blue to-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${ACHIEVEMENT_DEFS.length > 0 ? (achievementCount / ACHIEVEMENT_DEFS.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Achievement grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ACHIEVEMENT_DEFS.map(achievement => {
            const isUnlocked = unlockedSet.has(achievement.id)

            return (
              <div
                key={achievement.id}
                className={`border rounded-xl p-4 transition-all ${
                  isUnlocked
                    ? 'bg-brand-dark border-green-600/40'
                    : 'bg-brand-dark/50 border-brand-border opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
                      isUnlocked ? 'bg-brand-blue/20' : 'bg-gray-700 opacity-50'
                    }`}
                  >
                    <AchievementIcon id={achievement.id} size={28} />
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-white font-medium text-sm">
                      {tRewards(achievement.nameKey)}
                    </h3>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {tRewards(achievement.descKey)}
                    </p>
                    <p className={`text-xs mt-1.5 font-medium ${
                      isUnlocked ? 'text-green-400' : 'text-gray-500'
                    }`}>
                      {isUnlocked ? `\u2705 ${t('achievementUnlocked')}` : `\u{1F512} ${t('achievementLocked')}`}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Certificate */}
      <div className="bg-gradient-to-br from-yellow-900/20 to-amber-900/10 border border-yellow-500/30 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-shrink-0">
          <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
            <rect x="6" y="4" width="36" height="40" rx="4" fill="#F59E0B" opacity="0.2" stroke="#F59E0B" strokeWidth="1.5"/>
            <line x1="14" y1="14" x2="34" y2="14" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="14" y1="20" x2="34" y2="20" stroke="#F59E0B" strokeWidth="1" opacity="0.5" strokeLinecap="round"/>
            <circle cx="24" cy="33" r="5" fill="#F59E0B" opacity="0.3" stroke="#F59E0B" strokeWidth="1"/>
            <path d="M22 33l1.5 1.5 3-3" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-white">{t('certificate.title')}</h2>
          <p className="text-gray-400 text-xs mt-0.5">{t('certificate.desc')}</p>
        </div>
        <Link
          href="/certificate"
          className="w-full sm:w-auto text-center px-6 py-2.5 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-bold rounded-xl transition-colors whitespace-nowrap flex-shrink-0"
        >
          {t('certificate.button')} →
        </Link>
      </div>

      {/* 4. Legal documents */}
      <div className="bg-brand-panel border border-brand-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <h2 className="text-lg font-bold text-white">{t('legalDocuments')}</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <a href={`/${locale}/terms`} className="flex-1 text-center px-4 py-3 bg-brand-dark border border-brand-border rounded-xl text-sm text-gray-300 hover:text-white hover:border-gray-500 transition-colors font-medium">
            {t('termsLink')}
          </a>
          <a href={`/${locale}/privacy`} className="flex-1 text-center px-4 py-3 bg-brand-dark border border-brand-border rounded-xl text-sm text-gray-300 hover:text-white hover:border-gray-500 transition-colors font-medium">
            {t('privacyLink')}
          </a>
        </div>
      </div>

      {/* 5. Delete account */}
      <DeleteAccountSection isDemo={user?.email === 'team13innovatika@mail.ru'} />
    </div>
  )
}
