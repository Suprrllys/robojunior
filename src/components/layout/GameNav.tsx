'use client'

import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from '@/i18n/navigation'
import { clsx } from 'clsx'

interface GameNavProps {
  profile: {
    username: string
    xp: number
    avatar_color: string
    country: string
  } | null
  locale: string
}

const NAV_ITEMS = [
  { href: '/roles', icon: '🎮', key: 'roles' },
  { href: '/coop', icon: '🤝', key: 'coop' },
  { href: '/dashboard', icon: '📊', key: 'dashboard' },
  { href: '/leaderboard', icon: '🏆', key: 'leaderboard' },
  { href: '/profile', icon: '👤', key: 'profile' },
]

const COUNTRY_FLAGS: Record<string, string> = {
  SA: '🇸🇦', RU: '🇷🇺', IN: '🇮🇳', CN: '🇨🇳', BR: '🇧🇷', OTHER: '🌍',
}

export default function GameNav({ profile, locale }: GameNavProps) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="bg-brand-panel border-b border-brand-border sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/roles" className="text-xl font-black">
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
              <span>{item.icon}</span>
              <span>{t(item.key as 'roles')}</span>
            </Link>
          ))}
        </div>

        {/* User info */}
        {profile && (
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg border flex items-center justify-center text-sm"
              style={{ backgroundColor: `${profile.avatar_color}22`, borderColor: profile.avatar_color }}
            >
              {COUNTRY_FLAGS[profile.country] || '🌍'}
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-medium text-white">{profile.username}</div>
              <div className="text-xs text-brand-gold">{profile.xp} XP</div>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-red-400 transition-colors text-sm px-2 py-1"
            >
              ↩
            </button>
          </div>
        )}
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex border-t border-brand-border">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href as '/roles'}
            className={clsx(
              'flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors',
              pathname === item.href
                ? 'text-brand-blue'
                : 'text-gray-500 hover:text-white'
            )}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{t(item.key as 'roles')}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
