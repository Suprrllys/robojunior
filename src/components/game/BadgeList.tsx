'use client'

import { useLocale } from 'next-intl'

interface BadgeListProps {
  badges: Array<{
    earned_at: string
    badge?: {
      key: string
      name_en: string
      name_ru: string
      name_ar: string
      description_en: string
      description_ru: string
      description_ar: string
      icon: string
      xp_reward: number
    }
  }>
}

export default function BadgeList({ badges }: BadgeListProps) {
  const locale = useLocale()

  function getName(badge: NonNullable<BadgeListProps['badges'][0]['badge']>) {
    if (locale === 'ru') return badge.name_ru
    if (locale === 'ar') return badge.name_ar
    return badge.name_en
  }

  function getDesc(badge: NonNullable<BadgeListProps['badges'][0]['badge']>) {
    if (locale === 'ru') return badge.description_ru
    if (locale === 'ar') return badge.description_ar
    return badge.description_en
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {badges.map(ub => {
        if (!ub.badge) return null
        return (
          <div
            key={ub.badge.key}
            className="bg-brand-dark border border-brand-border rounded-xl p-3 text-center hover:border-brand-gold transition-colors"
            title={getDesc(ub.badge)}
          >
            <div className="text-3xl mb-1">{ub.badge.icon}</div>
            <div className="text-xs font-bold text-white truncate">{getName(ub.badge)}</div>
            <div className="text-xs text-brand-gold mt-0.5">+{ub.badge.xp_reward} XP</div>
          </div>
        )
      })}
    </div>
  )
}
