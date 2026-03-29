'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'
import CharacterAvatarPreview from '@/components/game/CharacterAvatarPreview'
import { parseAvatarConfig } from '@/lib/game/avatar-utils'
import Image from 'next/image'
import { IconMedalGold, IconMedalSilver, IconMedalBronze } from '@/components/ui/SvgIcon'

interface Player {
  id: string
  username: string
  country: string
  xp: number
  avatar_color: string
  avatar_accessory: string
}

// Country code to flagcdn.com code mapping
const COUNTRY_FLAG_CODES: Record<string, string> = {
  SA: 'sa',
  RU: 'ru',
  IN: 'in',
  CN: 'cn',
  BR: 'br',
}

const FILTER_COUNTRIES = ['SA', 'RU', 'IN', 'CN', 'BR'] as const
type CountryFilter = 'ALL' | typeof FILTER_COUNTRIES[number]

function CountryBadge({ code }: { code: string }) {
  const flagCode = COUNTRY_FLAG_CODES[code]

  if (!flagCode) {
    // Unknown country: show a gray placeholder with globe
    return (
      <span className="w-[20px] h-[14px] bg-gray-600 rounded-sm flex items-center justify-center text-[9px] text-gray-400 flex-shrink-0">
        {'\u{1F310}'}
      </span>
    )
  }

  return (
    <Image
      src={`https://flagcdn.com/w40/${flagCode}.png`}
      alt={code}
      width={20}
      height={14}
      className="rounded-sm object-cover flex-shrink-0"
      unoptimized
    />
  )
}

const RANK_MEDAL_COMPONENTS = [
  <IconMedalGold key="g" size={28} />,
  <IconMedalSilver key="s" size={28} />,
  <IconMedalBronze key="b" size={28} />,
]

interface LiveLeaderboardProps {
  initialLeaders: Player[]
  currentUserId: string
}

export default function LiveLeaderboard({ initialLeaders, currentUserId }: LiveLeaderboardProps) {
  const t = useTranslations('leaderboard')
  const supabaseRef = useRef(createClient())
  const [leaders, setLeaders] = useState<Player[]>(initialLeaders)
  const [flashId, setFlashId] = useState<string | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [countryFilter, setCountryFilter] = useState<CountryFilter>('ALL')

  useEffect(() => {
    const supabase = supabaseRef.current
    const channel = supabase
      .channel('leaderboard')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
      }, (payload) => {
        const updated = payload.new as Player
        setLeaders(prev => {
          const exists = prev.find(p => p.id === updated.id)
          const newList = exists
            ? prev.map(p => p.id === updated.id ? { ...p, xp: updated.xp, avatar_color: updated.avatar_color, avatar_accessory: updated.avatar_accessory } : p)
            : [...prev, {
                id: updated.id,
                username: updated.username,
                country: updated.country,
                xp: updated.xp,
                avatar_color: updated.avatar_color || '#3B82F6',
                avatar_accessory: updated.avatar_accessory || 'none',
              }]
          return newList.sort((a, b) => b.xp - a.xp).slice(0, 50)
        })
        setFlashId(updated.id)
        if (flashTimer.current) clearTimeout(flashTimer.current)
        flashTimer.current = setTimeout(() => setFlashId(null), 2000)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      if (flashTimer.current) clearTimeout(flashTimer.current)
    }
  }, [])

  // Filter leaders by country
  const filteredLeaders = countryFilter === 'ALL'
    ? leaders
    : leaders.filter(p => p.country === countryFilter)

  return (
    <div>
      {/* Country filter tabs */}
      <div className="flex flex-wrap gap-2 mb-4 overflow-x-auto">
        <button
          onClick={() => setCountryFilter('ALL')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
            countryFilter === 'ALL'
              ? 'bg-[var(--brand-blue)] text-white'
              : 'bg-brand-panel border border-brand-border text-gray-400 hover:text-white hover:border-gray-500'
          }`}
        >
          {t('global')}
        </button>
        {FILTER_COUNTRIES.map(code => {
          const flagCode = COUNTRY_FLAG_CODES[code]
          return (
            <button
              key={code}
              onClick={() => setCountryFilter(code)}
              className={`px-3 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 ${
                countryFilter === code
                  ? 'bg-[var(--brand-blue)] text-white'
                  : 'bg-brand-panel border border-brand-border text-gray-400 hover:text-white hover:border-gray-500'
              }`}
            >
              {flagCode && (
                <Image
                  src={`https://flagcdn.com/w40/${flagCode}.png`}
                  alt={code}
                  width={20}
                  height={14}
                  className="rounded-sm object-cover"
                  unoptimized
                />
              )}
              {code}
            </button>
          )
        })}
      </div>

      <div className="bg-brand-panel border border-brand-border rounded-2xl overflow-hidden overflow-x-auto">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-bold text-gray-500 uppercase border-b border-brand-border min-w-[600px]">
          <div className="col-span-1">{t('rank')}</div>
          <div className="col-span-7">{t('player')}</div>
          <div className="col-span-2 text-center">{t('country')}</div>
          <div className="col-span-2 text-right">{t('xp')}</div>
        </div>

        {filteredLeaders.map((player, i) => {
          const rank = i + 1
          const isMe = player.id === currentUserId
          const isFlashing = player.id === flashId

          return (
            <div
              key={player.id}
              className={`grid grid-cols-12 gap-4 px-6 py-4 border-b border-brand-border last:border-0 transition-all duration-700 min-w-[600px] ${
                isFlashing ? 'bg-brand-gold/10' :
                isMe ? 'bg-brand-blue/10' : 'hover:bg-brand-dark'
              }`}
            >
              <div className="col-span-1 flex items-center">
                {rank <= 3 ? (
                  RANK_MEDAL_COMPONENTS[rank - 1]
                ) : (
                  <span className="text-lg font-black" style={{ color: '#6B7280' }}>{rank}</span>
                )}
              </div>
              <div className="col-span-7 flex items-center gap-3">
                <Link href={`/profile/${player.id}`} className="flex-shrink-0">
                  <CharacterAvatarPreview
                    avatarColor={player.avatar_color || '#3B82F6'}
                    avatarConfig={parseAvatarConfig(player.avatar_accessory)}
                    size={40}
                    animated={false}
                  />
                </Link>
                <Link
                  href={`/profile/${player.id}`}
                  className="font-medium text-white hover:text-[var(--brand-blue)] transition-colors"
                >
                  {player.username}
                  {isMe && <span className="ml-2 text-xs text-brand-blue">({t('you')})</span>}
                </Link>
              </div>
              <div className="col-span-2 flex items-center justify-center">
                <CountryBadge code={player.country} />
              </div>
              <div className="col-span-2 flex items-center justify-end">
                <span className={`font-bold transition-all duration-300 ${isFlashing ? 'text-brand-gold scale-105' : 'text-brand-gold'}`}>
                  {player.xp.toLocaleString()}
                </span>
              </div>
            </div>
          )
        })}

        {filteredLeaders.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-400">
            <p>{t('empty')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
