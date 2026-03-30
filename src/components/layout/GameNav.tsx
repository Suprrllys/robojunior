'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from '@/i18n/navigation'
import { clsx } from 'clsx'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import VolumeControl from '@/components/game/VolumeControl'
import CharacterAvatarPreview from '@/components/game/CharacterAvatarPreview'
import { parseAvatarConfig } from '@/lib/game/avatar-utils'
import { IconRoles, IconCoop, IconDashboard, IconLeaderboard, IconShop, IconProfile, IconCoin, IconHandshake } from '@/components/ui/SvgIcon'

const NAV_ICON_MAP: Record<string, (props: { size?: number }) => JSX.Element> = {
  roles: IconRoles,
  coop: IconHandshake,
  dashboard: IconDashboard,
  leaderboard: IconLeaderboard,
  shop: IconShop,
  profile: IconProfile,
  parentDashboard: ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
}

interface GameNavProps {
  profile: {
    username: string
    xp: number
    avatar_color: string
    avatar_accessory?: string
    country: string
    game_currency?: number
    is_parent?: boolean
  } | null
  locale: string
}

// SVG nav icons — clean line-art style matching the role cards
const BASE_NAV_ITEMS = [
  { href: '/roles', key: 'roles' },
  { href: '/coop', key: 'coop' },
  { href: '/dashboard', key: 'dashboard' },
  { href: '/leaderboard', key: 'leaderboard' },
  { href: '/shop', key: 'shop' },
  { href: '/profile', key: 'profile' },
]

// Country codes that have flag images on flagcdn.com
const FLAG_COUNTRIES: Record<string, string> = {
  SA: 'sa', RU: 'ru', IN: 'in', CN: 'cn', BR: 'br', ZA: 'za', EG: 'eg', AE: 'ae', IR: 'ir', ET: 'et',
}

export default function GameNav({ profile }: GameNavProps) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const locale = useLocale()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  // Build nav items — add parent dashboard if user is a parent
  const NAV_ITEMS = [
    ...BASE_NAV_ITEMS,
    ...(profile?.is_parent ? [{ href: '/parent', key: 'parentDashboard' }] : []),
  ]

  async function handleLogout() {
    // Clear per-user localStorage cache before signing out
    try {
      localStorage.removeItem('robojunior_avatar')
      localStorage.removeItem('robojunior_inventory')
    } catch { /* ignore */ }
    await supabase.auth.signOut()
    // Hard redirect to login page to clear all cached state
    window.location.href = `/${locale}/login`
  }

  return (
    <nav className="bg-brand-panel border-b border-brand-border sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-2 sm:px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/roles" className="text-lg sm:text-xl font-black">
          <span className="text-white">Robo</span>
          <span className="text-brand-blue">Junior</span>
        </Link>

        {/* Navigation */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href as '/roles'}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                pathname === item.href
                  ? 'bg-brand-blue/20 text-brand-blue'
                  : 'text-gray-400 hover:text-white hover:bg-brand-border'
              )}
            >
              {(() => { const Icon = NAV_ICON_MAP[item.key]; return Icon ? <Icon size={18} /> : null })()}
              <span>{t(item.key as 'roles')}</span>
            </Link>
          ))}
        </div>

        {/* Language switcher + User info */}
        <div className="flex items-center gap-3">
          {/* Volume control */}
          <VolumeControl />

          {/* Language switcher */}
          <LanguageSwitcher />

          {/* User info */}
          {profile && (
            <>
              <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                <CharacterAvatarPreview
                  avatarColor={profile.avatar_color}
                  avatarConfig={parseAvatarConfig(profile.avatar_accessory)}
                  size={32}
                  animated={false}
                />
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-medium text-white">{profile.username}</div>
                <div className="text-xs text-brand-gold flex items-center gap-2">
                  <span>{profile.xp} XP</span>
                  <span className="text-yellow-400 flex items-center gap-1"><IconCoin size={16} /> {profile.game_currency ?? 0}</span>
                </div>
              </div>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="text-gray-500 hover:text-red-400 transition-colors text-sm px-2 py-1 min-h-[44px]"
              >
                ↩
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex border-t border-brand-border">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href as '/roles'}
            className={clsx(
              'flex-1 flex flex-col items-center gap-0.5 py-3 md:py-2 text-xs transition-colors',
              pathname === item.href
                ? 'text-brand-blue'
                : 'text-gray-500 hover:text-white'
            )}
          >
            {(() => { const Icon = NAV_ICON_MAP[item.key]; return Icon ? <Icon size={20} /> : null })()}
            <span>{t(item.key as 'roles')}</span>
          </Link>
        ))}
      </div>

      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
          <div className="bg-brand-panel border border-brand-border rounded-2xl p-6 mx-4 max-w-sm w-full text-center shadow-xl">
            <p className="text-white text-lg font-semibold mb-6">{t('logoutConfirm')}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-5 py-2.5 rounded-lg bg-brand-border text-gray-300 hover:text-white transition-colors font-medium min-h-[44px]"
              >
                {t('logoutCancel')}
              </button>
              <button
                onClick={handleLogout}
                className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors font-medium min-h-[44px]"
              >
                {t('logoutConfirmYes')}
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
