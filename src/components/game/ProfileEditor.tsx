'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { deleteAccount } from '@/lib/game/delete-account'
import RobotAvatar from '@/components/game/RobotAvatar'
import CharacterAvatar, {
  BODY_COLORS,
  HEAD_STYLES,
  EYE_STYLES,
  OUTFITS,
  ACCESSORIES,
  HELD_ITEMS,
  EFFECTS,
  loadAvatarConfig,
  saveAvatarConfig,
} from '@/components/game/CharacterAvatar'
import {
  loadInventory,
  SHOP_ITEMS,
} from '@/lib/game/shop-items'
import { saveAvatarToDB } from '@/lib/game/avatar-actions'
import { parseAvatarConfig } from '@/lib/game/avatar-utils'
import { isUsernameClean } from '@/lib/game/username-filter'
import { IconTabPalette, IconTabHead, IconTabOutfit, IconTabItems, IconTabEffects, IconTabSettings, IconCoin, IconStar } from '@/components/ui/SvgIcon'
import type { Country } from '@/types/database'

const AVATAR_COLORS = BODY_COLORS.map(c => c.hex)

// COLOR_NAMES, HEAD_LABELS, etc. are now loaded from translations inside the component

const COUNTRIES: { code: Country; flag: string }[] = [
  { code: 'SA', flag: 'sa' },
  { code: 'RU', flag: 'ru' },
  { code: 'IN', flag: 'in' },
  { code: 'CN', flag: 'cn' },
  { code: 'BR', flag: 'br' },
  { code: 'OTHER', flag: '' },
]

// Labels are now loaded from translations — see buildLabels() inside the component

// Colored SVG mini-icons for customization options
import { type ReactNode } from 'react'

function MiniSvg({ children, size = 22 }: { children: ReactNode; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none">{children}</svg>
}

const HEAD_ICONS: Record<string, ReactNode> = {
  round: <MiniSvg><circle cx="12" cy="12" r="8" fill="#60A5FA" stroke="#3B82F6" strokeWidth="1.5" /></MiniSvg>,
  square: <MiniSvg><rect x="4" y="4" width="16" height="16" rx="2" fill="#60A5FA" stroke="#3B82F6" strokeWidth="1.5" /></MiniSvg>,
  pointed: <MiniSvg><polygon points="12,2 4,20 20,20" fill="#60A5FA" stroke="#3B82F6" strokeWidth="1.5" /></MiniSvg>,
  dome: <MiniSvg><ellipse cx="12" cy="13" rx="9" ry="8" fill="#60A5FA" stroke="#3B82F6" strokeWidth="1.5" /></MiniSvg>,
  horned: <MiniSvg><rect x="4" y="8" width="16" height="12" rx="3" fill="#60A5FA" stroke="#3B82F6" strokeWidth="1.5" /><polygon points="5,8 2,2 8,8" fill="#F59E0B" /><polygon points="19,8 22,2 16,8" fill="#F59E0B" /></MiniSvg>,
  cat: <MiniSvg><rect x="4" y="10" width="16" height="10" rx="3" fill="#60A5FA" stroke="#3B82F6" strokeWidth="1.5" /><polygon points="5,10 2,2 9,8" fill="#60A5FA" stroke="#3B82F6" strokeWidth="1" /><polygon points="19,10 22,2 15,8" fill="#60A5FA" stroke="#3B82F6" strokeWidth="1" /><polygon points="6,9 3,4 8,8" fill="#F9A8D4" /></MiniSvg>,
}

const EYE_ICONS: Record<string, ReactNode> = {
  circle: <MiniSvg><circle cx="8" cy="12" r="4" fill="white" stroke="#1E3A5F" strokeWidth="1" /><circle cx="16" cy="12" r="4" fill="white" stroke="#1E3A5F" strokeWidth="1" /><circle cx="8" cy="12" r="2" fill="#1E3A5F" /><circle cx="16" cy="12" r="2" fill="#1E3A5F" /></MiniSvg>,
  visor: <MiniSvg><rect x="3" y="9" width="18" height="6" rx="3" fill="#1E3A5F" opacity="0.9" /><rect x="5" y="10" width="14" height="4" rx="2" fill="#3B82F6" opacity="0.4" /></MiniSvg>,
  angry: <MiniSvg><circle cx="8" cy="13" r="3" fill="white" /><circle cx="16" cy="13" r="3" fill="white" /><circle cx="8" cy="13" r="1.5" fill="#EF4444" /><circle cx="16" cy="13" r="1.5" fill="#EF4444" /><line x1="5" y1="8" x2="11" y2="10" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" /><line x1="19" y1="8" x2="13" y2="10" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" /></MiniSvg>,
  happy: <MiniSvg><path d="M5,12 Q8,7 11,12" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" fill="none" /><path d="M13,12 Q16,7 19,12" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" fill="none" /></MiniSvg>,
  glasses: <MiniSvg><circle cx="8" cy="12" r="5" fill="none" stroke="#6B7280" strokeWidth="1.5" /><circle cx="16" cy="12" r="5" fill="none" stroke="#6B7280" strokeWidth="1.5" /><line x1="13" y1="12" x2="11" y2="12" stroke="#6B7280" strokeWidth="1.5" /><circle cx="8" cy="12" r="2" fill="#60A5FA" /><circle cx="16" cy="12" r="2" fill="#60A5FA" /></MiniSvg>,
}

const OUTFIT_ICONS: Record<string, ReactNode> = {
  none: <MiniSvg><line x1="8" y1="12" x2="16" y2="12" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" /></MiniSvg>,
  tshirt: <MiniSvg><path d="M6,6 L4,10 L7,10 L7,20 L17,20 L17,10 L20,10 L18,6 L14,8 L10,8 Z" fill="#EF4444" stroke="#DC2626" strokeWidth="1" /><line x1="12" y1="8" x2="12" y2="14" stroke="#DC2626" strokeWidth="0.8" /></MiniSvg>,
  labcoat: <MiniSvg><path d="M6,6 L4,10 L6,10 L6,20 L18,20 L18,10 L20,10 L18,6 L14,8 L10,8 Z" fill="white" stroke="#D1D5DB" strokeWidth="1" /><line x1="12" y1="8" x2="12" y2="20" stroke="#E5E7EB" strokeWidth="0.8" /><circle cx="10" cy="14" r="1" fill="#D1D5DB" /></MiniSvg>,
  hoodie: <MiniSvg><path d="M6,6 L4,10 L7,10 L7,20 L17,20 L17,10 L20,10 L18,6 L14,8 L10,8 Z" fill="#6B7280" stroke="#4B5563" strokeWidth="1" /><path d="M9,6 Q12,12 15,6" fill="#4B5563" /></MiniSvg>,
  suit: <MiniSvg><path d="M6,6 L5,20 L19,20 L18,6 L14,8 L10,8 Z" fill="#1F2937" stroke="#374151" strokeWidth="1" /><polygon points="10,8 12,14 14,8" fill="#374151" /><rect x="11" y="14" width="2" height="2" rx="0.5" fill="#EF4444" /></MiniSvg>,
  armor: <MiniSvg><path d="M5,6 L4,20 L20,20 L19,6 L14,8 L10,8 Z" fill="#6B7280" stroke="#9CA3AF" strokeWidth="1.5" /><rect x="8" y="10" width="8" height="4" rx="1" fill="#9CA3AF" /><circle cx="12" cy="12" r="2" fill="#F59E0B" /></MiniSvg>,
  spacesuit: <MiniSvg><path d="M5,5 L4,20 L20,20 L19,5 L14,7 L10,7 Z" fill="white" stroke="#D1D5DB" strokeWidth="1.5" rx="3" /><rect x="7" y="10" width="4" height="3" rx="1" fill="#3B82F6" /><circle cx="17" cy="12" r="2" fill="#EF4444" /></MiniSvg>,
  cape: <MiniSvg><path d="M8,6 L2,20 Q12,22 22,20 L16,6" fill="#7C3AED" opacity="0.6" /><rect x="8" y="5" width="8" height="3" rx="1" fill="#7C3AED" stroke="#6D28D9" strokeWidth="0.8" /></MiniSvg>,
}

const ACCESSORY_ICONS: Record<string, ReactNode> = {
  none: <MiniSvg><line x1="8" y1="12" x2="16" y2="12" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" /></MiniSvg>,
  antenna: <MiniSvg><line x1="12" y1="20" x2="12" y2="8" stroke="#9CA3AF" strokeWidth="2" /><circle cx="12" cy="5" r="3" fill="#EF4444" /></MiniSvg>,
  hardhat: <MiniSvg><ellipse cx="12" cy="14" rx="10" ry="3" fill="#F59E0B" /><rect x="6" y="6" width="12" height="8" rx="3" fill="#F59E0B" stroke="#D97706" strokeWidth="1" /></MiniSvg>,
  crown: <MiniSvg><polygon points="4,16 4,8 8,12 12,4 16,12 20,8 20,16" fill="#FFD700" stroke="#D97706" strokeWidth="1" /><circle cx="8" cy="12" r="1.5" fill="#EF4444" /><circle cx="12" cy="7" r="1.5" fill="#3B82F6" /><circle cx="16" cy="12" r="1.5" fill="#22C55E" /></MiniSvg>,
  headphones: <MiniSvg><path d="M5,14 Q5,6 12,6 Q19,6 19,14" fill="none" stroke="#374151" strokeWidth="2.5" /><rect x="3" y="13" width="4" height="6" rx="2" fill="#374151" /><rect x="17" y="13" width="4" height="6" rx="2" fill="#374151" /></MiniSvg>,
  halo: <MiniSvg><ellipse cx="12" cy="8" rx="8" ry="3" fill="none" stroke="#FDE68A" strokeWidth="2.5" opacity="0.8" /></MiniSvg>,
}

const ITEM_ICONS: Record<string, ReactNode> = {
  none: <MiniSvg><line x1="8" y1="12" x2="16" y2="12" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" /></MiniSvg>,
  wrench: <MiniSvg><path d="M14,4 L20,10 L18,12 L12,6 Z" fill="#9CA3AF" stroke="#6B7280" strokeWidth="1" /><circle cx="8" cy="16" r="4" fill="none" stroke="#9CA3AF" strokeWidth="2" /></MiniSvg>,
  laptop: <MiniSvg><rect x="4" y="6" width="16" height="10" rx="1.5" fill="#374151" stroke="#6B7280" strokeWidth="1" /><rect x="6" y="8" width="12" height="6" rx="1" fill="#3B82F6" opacity="0.4" /><path d="M2,18 L22,18 L20,16 L4,16 Z" fill="#4B5563" /></MiniSvg>,
  briefcase: <MiniSvg><rect x="4" y="9" width="16" height="11" rx="2" fill="#92400E" stroke="#78350F" strokeWidth="1" /><rect x="8" y="6" width="8" height="5" rx="1" fill="none" stroke="#78350F" strokeWidth="1.5" /><circle cx="12" cy="14" r="1.5" fill="#F59E0B" /></MiniSvg>,
  sword: <MiniSvg><rect x="11" y="2" width="2" height="14" rx="0.5" fill="#D1D5DB" stroke="#9CA3AF" strokeWidth="0.5" /><rect x="7" y="15" width="10" height="2" rx="1" fill="#F59E0B" /><rect x="10.5" y="17" width="3" height="5" rx="1" fill="#78350F" /></MiniSvg>,
  shield: <MiniSvg><path d="M12,3 L4,7 L4,14 Q4,20 12,22 Q20,20 20,14 L20,7 Z" fill="#3B82F6" stroke="#2563EB" strokeWidth="1" /><path d="M12,6 L8,8 L8,13 Q8,17 12,19 Q16,17 16,13 L16,8 Z" fill="#60A5FA" /><polygon points="12,9 10.5,14 13.5,14" fill="#F59E0B" /></MiniSvg>,
}

const EFFECT_ICONS: Record<string, ReactNode> = {
  none: <MiniSvg><line x1="8" y1="12" x2="16" y2="12" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" /></MiniSvg>,
  sparkles: <MiniSvg><polygon points="12,2 13.5,8 20,9 14,13 16,20 12,15 8,20 10,13 4,9 10.5,8" fill="#FFD700" stroke="#D97706" strokeWidth="0.5" /><circle cx="6" cy="5" r="1.5" fill="#FDE68A" /><circle cx="19" cy="17" r="1" fill="#FDE68A" /></MiniSvg>,
  flames: <MiniSvg><ellipse cx="8" cy="18" rx="3" ry="5" fill="#EF4444" /><ellipse cx="12" cy="16" rx="4" ry="8" fill="#F59E0B" /><ellipse cx="16" cy="18" rx="3" ry="5" fill="#EF4444" /><ellipse cx="12" cy="18" rx="2" ry="4" fill="#FEF3C7" /></MiniSvg>,
  electric: <MiniSvg><polyline points="10,3 6,11 13,11 8,21" fill="none" stroke="#60A5FA" strokeWidth="2.5" strokeLinejoin="round" /><polyline points="16,5 14,10 18,10 15,17" fill="none" stroke="#93C5FD" strokeWidth="1.5" strokeLinejoin="round" /></MiniSvg>,
  smoke: <MiniSvg><circle cx="8" cy="16" r="4" fill="#9CA3AF" opacity="0.5" /><circle cx="14" cy="12" r="5" fill="#6B7280" opacity="0.4" /><circle cx="18" cy="16" r="3" fill="#9CA3AF" opacity="0.3" /><circle cx="11" cy="8" r="3" fill="#6B7280" opacity="0.2" /></MiniSvg>,
}

type EditorSection = 'body' | 'head' | 'outfit' | 'items' | 'effects' | 'settings'

interface ProfileEditorProps {
  profile: {
    id: string
    username: string
    avatar_color: string
    avatar_accessory: string
    preferred_language: string
    gender_filter: string
    only_verified_partners: boolean
    country: string
    xp: number
    game_currency: number
    equipped_skin: string | null
  }
}

export default function ProfileEditor({ profile }: ProfileEditorProps) {
  const t = useTranslations('profile')
  const tCountries = useTranslations('countries')
  const router = useRouter()
  const locale = useLocale()

  // Build translated label maps from translation keys
  const COLOR_NAMES: Record<string, string> = Object.fromEntries(
    AVATAR_COLORS.map(c => [c, t(`colors.${c}`)])
  )
  const HEAD_LABELS: Record<string, string> = Object.fromEntries(
    HEAD_STYLES.map(s => [s, t(`headLabels.${s}`)])
  )
  const EYE_LABELS: Record<string, string> = Object.fromEntries(
    EYE_STYLES.map(s => [s, t(`eyeLabels.${s}`)])
  )
  const OUTFIT_LABELS: Record<string, string> = Object.fromEntries(
    OUTFITS.map(s => [s, t(`outfitLabels.${s}`)])
  )
  const ACCESSORY_LABELS: Record<string, string> = Object.fromEntries(
    ACCESSORIES.map(s => [s, t(`accessoryLabels.${s}`)])
  )
  const ITEM_LABELS: Record<string, string> = Object.fromEntries(
    HELD_ITEMS.map(s => [s, t(`itemLabels.${s}`)])
  )
  const EFFECT_LABELS: Record<string, string> = Object.fromEntries(
    EFFECTS.map(s => [s, t(`effectLabels.${s}`)])
  )
  const supabase = createClient()
  const [activeSection, setActiveSection] = useState<EditorSection>('body')
  const [form, setForm] = useState({
    username: profile.username,
    avatar_color: profile.avatar_color,
    avatar_accessory: profile.avatar_accessory,
    preferred_language: profile.preferred_language,
    gender_filter: profile.gender_filter,
    only_verified_partners: profile.only_verified_partners,
    country: profile.country,
  })

  // Character customization state (loaded from localStorage)
  const [charConfig, setCharConfig] = useState({
    bodyType: 'bot' as const,
    headStyle: 'round',
    eyeStyle: 'circle',
    outfit: 'none',
    accessory: 'none',
    heldItem: 'none',
    effect: 'none',
  })

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Inventory of purchased items (loaded from localStorage)
  const [inventory, setInventory] = useState<Set<string>>(new Set())

  // Load character config from DB first, then localStorage as fallback.
  useEffect(() => {
    // Try DB data first (avatar_accessory field)
    const dbConfig = parseAvatarConfig(profile.avatar_accessory)
    const hasDbConfig = profile.avatar_accessory && profile.avatar_accessory.startsWith('{')

    if (hasDbConfig) {
      setCharConfig(prev => ({
        ...prev,
        bodyType: 'bot',
        headStyle: dbConfig.headStyle || prev.headStyle,
        eyeStyle: dbConfig.eyeStyle || prev.eyeStyle,
        outfit: dbConfig.outfit || prev.outfit,
        accessory: dbConfig.accessory || prev.accessory,
        heldItem: dbConfig.heldItem || prev.heldItem,
        effect: dbConfig.effect || prev.effect,
      }))
      // Also sync to localStorage as cache
      saveAvatarConfig(dbConfig)
    } else {
      // Fallback to localStorage
      const stored = loadAvatarConfig()
      if (stored && Object.keys(stored).length > 0) {
        setCharConfig(prev => ({
          ...prev,
          bodyType: 'bot',
          headStyle: stored.headStyle || prev.headStyle,
          eyeStyle: stored.eyeStyle || prev.eyeStyle,
          outfit: stored.outfit || prev.outfit,
          accessory: stored.accessory || prev.accessory,
          heldItem: stored.heldItem || prev.heldItem,
          effect: stored.effect || prev.effect,
        }))
      }
    }
    setInventory(loadInventory())
  }, [profile.avatar_accessory])

  // Save character config to localStorage whenever it changes
  useEffect(() => {
    saveAvatarConfig(charConfig)
  }, [charConfig])

  useEffect(() => () => { if (savedTimer.current) clearTimeout(savedTimer.current) }, [])

  function updateChar<K extends keyof typeof charConfig>(key: K, value: typeof charConfig[K]) {
    setCharConfig(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (!form.username.trim() || form.username.trim().length < 2) {
      alert(t('usernameTooShort'))
      return
    }
    if (!isUsernameClean(form.username)) {
      alert(t('usernameInappropriate'))
      return
    }
    setSaving(true)
    // Save profile form data
    await supabase.from('profiles').update(form).eq('id', profile.id)
    // Also persist avatar config to DB
    const { bodyType: _bt, ...avatarData } = charConfig
    await saveAvatarToDB(avatarData)
    setSaving(false)
    setSaved(true)
    // Refresh the server components (layout/navbar) so the avatar updates immediately
    router.refresh()
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSaved(false), 2000)
  }

  const sections: { key: EditorSection; label: string; iconEl: ReactNode }[] = [
    { key: 'body', label: t('bodyColor'), iconEl: <IconTabPalette size={18} /> },
    { key: 'head', label: t('tabHeadEyes'), iconEl: <IconTabHead size={18} /> },
    { key: 'outfit', label: t('tabOutfit'), iconEl: <IconTabOutfit size={18} /> },
    { key: 'items', label: t('tabItems'), iconEl: <IconTabItems size={18} /> },
    { key: 'effects', label: t('tabEffects'), iconEl: <IconTabEffects size={18} /> },
    { key: 'settings', label: t('settings'), iconEl: <IconTabSettings size={18} /> },
  ]

  // Check if a customization option is owned by the player
  // Maps option values back to shop item IDs to check inventory + achievement unlocks
  function isOptionOwned(category: string, value: string): boolean {
    const visualKey: Record<string, string> = {
      heads: 'headStyle', eyes: 'eyeStyle', outfits: 'outfit',
      accessories: 'accessory', heldItems: 'heldItem', effects: 'effect',
    }
    const key = visualKey[category]
    if (!key) return true
    const shopItem = SHOP_ITEMS.find(
      item => item.category === category && Object.values(item.visual)[0] === value,
    )
    if (!shopItem) return true // not in shop = free
    if (shopItem.isDefault) return true
    return inventory.has(shopItem.id)
  }

  // Option picker helper — locked items shown grayed out with "Buy in Shop"
  function OptionGrid<T extends string>({
    options,
    current,
    onChange,
    labels,
    icons,
    category,
  }: {
    options: readonly T[]
    current: string
    onChange: (val: T) => void
    labels: Record<string, string>
    icons: Record<string, ReactNode>
    category: string
  }) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {options.map(opt => {
          const owned = isOptionOwned(category, opt)
          return (
            <button
              key={opt}
              onClick={() => owned && onChange(opt)}
              disabled={!owned}
              className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all relative ${
                !owned
                  ? 'border-gray-700/50 bg-gray-900/50 opacity-50 cursor-not-allowed'
                  : current === opt
                    ? 'border-[var(--brand-blue)] bg-[var(--brand-blue)]/10 shadow-lg scale-105'
                    : 'border-[var(--brand-border)] hover:border-gray-500'
              }`}
            >
              <span className="flex justify-center">{icons[opt]}</span>
              <span className={`text-[11px] font-medium ${
                !owned
                  ? 'text-gray-600'
                  : current === opt ? 'text-[var(--brand-blue)]' : 'text-gray-400'
              }`}>
                {owned ? labels[opt] : t('buyInShop')}
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl p-6 space-y-6">
      <h2 className="text-lg font-bold text-white">{t('editProfile')}</h2>

      {/* Stats row: coins, XP, equipped skin */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2 bg-brand-dark border border-brand-border rounded-xl px-4 py-2">
          <IconCoin size={22} />
          <div>
            <p className="text-xs text-gray-400">{t('coins')}</p>
            <p className="text-sm font-bold text-brand-gold">{profile.game_currency}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-brand-dark border border-brand-border rounded-xl px-4 py-2">
          <IconStar size={22} />
          <div>
            <p className="text-xs text-gray-400">XP</p>
            <p className="text-sm font-bold text-brand-blue">{profile.xp}</p>
          </div>
        </div>
        {profile.equipped_skin && (
          <div className="flex items-center gap-2 bg-brand-dark border border-brand-border rounded-xl px-4 py-2">
          <IconTabEffects size={22} />
            <div>
              <p className="text-xs text-gray-400">{t('equippedSkin')}</p>
              <p className="text-sm font-bold text-purple-300">{profile.equipped_skin}</p>
            </div>
          </div>
        )}
      </div>

      {/* Large animated CharacterAvatar preview */}
      <div className="flex justify-center py-4">
        <div className="relative rounded-2xl bg-gradient-to-b from-[var(--brand-border)] to-transparent p-4">
          <CharacterAvatar
            bodyType={charConfig.bodyType}
            bodyColor={form.avatar_color}
            headStyle={charConfig.headStyle}
            eyeStyle={charConfig.eyeStyle}
            outfit={charConfig.outfit}
            accessory={charConfig.accessory}
            heldItem={charConfig.heldItem}
            effect={charConfig.effect}
            size={200}
            animated
          />
        </div>
      </div>

      {/* Username field */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          {t('username')}
        </label>
        <input
          type="text"
          value={form.username}
          onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
          maxLength={24}
          className="w-full bg-gray-900 border border-[var(--brand-border)] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--brand-blue)] transition-colors"
        />
      </div>

      {/* Section tabs — scrollable on mobile */}
      <div className="flex gap-2 border-b border-[var(--brand-border)] pb-0 overflow-x-auto scrollbar-hide">
        {sections.map(section => (
          <button
            key={section.key}
            onClick={() => setActiveSection(section.key)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
              activeSection === section.key
                ? 'bg-[var(--brand-blue)]/15 text-[var(--brand-blue)] border-b-2 border-[var(--brand-blue)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span className="flex items-center">{section.iconEl}</span>
            <span>{section.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[180px]">
        {/* Body type + color */}
        {activeSection === 'body' && (
          <div className="space-y-5">
            {/* Body color */}
            <div>
              <p className="text-sm text-gray-400 mb-2">{t('chooseColor')}</p>
              <div className="grid grid-cols-4 gap-3">
                {AVATAR_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setForm(f => ({ ...f, avatar_color: color }))}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                      form.avatar_color === color
                        ? 'border-white scale-105 shadow-lg'
                        : 'border-transparent hover:border-gray-600'
                    }`}
                    style={{ backgroundColor: `${color}22` }}
                  >
                    <div
                      className="w-10 h-10 rounded-full border-2 transition-transform"
                      style={{
                        backgroundColor: color,
                        borderColor: form.avatar_color === color ? 'white' : 'transparent',
                        boxShadow: form.avatar_color === color ? `0 0 12px ${color}88` : 'none',
                      }}
                    />
                    <span className="text-[11px] text-gray-400">{COLOR_NAMES[color]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Head & Eyes */}
        {activeSection === 'head' && (
          <div className="space-y-5">
            <div>
              <p className="text-sm text-gray-400 mb-2">{t('headShape')}</p>
              <OptionGrid
                options={HEAD_STYLES}
                current={charConfig.headStyle}
                onChange={val => updateChar('headStyle', val)}
                labels={HEAD_LABELS}
                icons={HEAD_ICONS}
                category="heads"
              />
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-2">{t('eyeStyle')}</p>
              <OptionGrid
                options={EYE_STYLES}
                current={charConfig.eyeStyle}
                onChange={val => updateChar('eyeStyle', val)}
                labels={EYE_LABELS}
                icons={EYE_ICONS}
                category="eyes"
              />
            </div>
          </div>
        )}

        {/* Outfit */}
        {activeSection === 'outfit' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-400 mb-2">{t('chooseOutfit')}</p>
            <OptionGrid
              options={OUTFITS}
              current={charConfig.outfit}
              onChange={val => updateChar('outfit', val)}
              labels={OUTFIT_LABELS}
              icons={OUTFIT_ICONS}
              category="outfits"
            />
          </div>
        )}

        {/* Items: accessory + held item */}
        {activeSection === 'items' && (
          <div className="space-y-5">
            <div>
              <p className="text-sm text-gray-400 mb-2">{t('headAccessory')}</p>
              <OptionGrid
                options={ACCESSORIES}
                current={charConfig.accessory}
                onChange={val => updateChar('accessory', val)}
                labels={ACCESSORY_LABELS}
                icons={ACCESSORY_ICONS}
                category="accessories"
              />
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-2">{t('heldItem')}</p>
              <OptionGrid
                options={HELD_ITEMS}
                current={charConfig.heldItem}
                onChange={val => updateChar('heldItem', val)}
                labels={ITEM_LABELS}
                icons={ITEM_ICONS}
                category="heldItems"
              />
            </div>
          </div>
        )}

        {/* Effects */}
        {activeSection === 'effects' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-400 mb-2">{t('characterEffect')}</p>
            <OptionGrid
              options={EFFECTS}
              current={charConfig.effect}
              onChange={val => updateChar('effect', val)}
              labels={EFFECT_LABELS}
              icons={EFFECT_ICONS}
              category="effects"
            />
            {/* Mini preview row */}
            <div className="flex gap-4 justify-center mt-4 flex-wrap">
              {EFFECTS.filter(e => e !== 'none').map(eff => (
                <div key={eff} className="text-center">
                  <CharacterAvatar
                    bodyType={charConfig.bodyType}
                    bodyColor={form.avatar_color}
                    headStyle={charConfig.headStyle}
                    eyeStyle={charConfig.eyeStyle}
                    outfit={charConfig.outfit}
                    accessory={charConfig.accessory}
                    heldItem={charConfig.heldItem}
                    effect={eff}
                    size={80}
                    animated
                  />
                  <p className="text-[10px] text-gray-500 mt-1">{EFFECT_LABELS[eff]}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings section (country, language, filters) */}
        {activeSection === 'settings' && (
          <div className="space-y-5">
            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('country')}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {COUNTRIES.map(({ code, flag }) => (
                  <button
                    key={code}
                    onClick={() => setForm(f => ({ ...f, country: code }))}
                    className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all ${
                      form.country === code
                        ? 'border-[var(--brand-blue)] bg-[var(--brand-blue)]/10'
                        : 'border-[var(--brand-border)] hover:border-gray-500'
                    }`}
                  >
                    {flag ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`https://flagcdn.com/w40/${flag}.png`}
                        alt={code}
                        width={32}
                        height={22}
                        className="rounded-sm"
                      />
                    ) : (
                      <span className="text-2xl leading-none">🌍</span>
                    )}
                    <span className="text-[11px] text-gray-400">{tCountries(code as 'SA')}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {t('language')}
              </label>
              <select
                value={form.preferred_language}
                onChange={e => setForm(f => ({ ...f, preferred_language: e.target.value }))}
                className="bg-gray-900 border border-[var(--brand-border)] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--brand-blue)]"
              >
                <option value="en">English</option>
                <option value="ru">Русский</option>
                <option value="ar">العربية</option>
              </select>
            </div>

            {/* Gender filter — disabled, coming in release */}
            <div className="opacity-50">
              <label className="block text-sm font-medium text-gray-500 mb-2">
                {t('genderFilter')}
              </label>
              <div className="flex gap-3">
                {['all', 'same'].map(opt => (
                  <label key={opt} className="flex items-center gap-2 cursor-not-allowed">
                    <input
                      type="radio"
                      name="gender_filter"
                      value={opt}
                      checked={form.gender_filter === opt}
                      disabled
                      className="accent-gray-500 cursor-not-allowed"
                    />
                    <span className="text-sm text-gray-500">
                      {opt === 'all' ? t('genderFilterAll') : t('genderFilterSame')}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-1">{t('comingSoonLabel')}</p>
            </div>

            {/* Verified only — disabled, coming in release */}
            <div className="opacity-50">
              <label className="flex items-center gap-3 cursor-not-allowed">
                <input
                  type="checkbox"
                  checked={form.only_verified_partners}
                  disabled
                  className="w-4 h-4 accent-gray-500 cursor-not-allowed"
                />
                <span className="text-sm text-gray-500">{t('verifiedOnly')}</span>
              </label>
              <p className="text-xs text-gray-600 mt-1 ml-7">{t('comingSoonLabel')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={`w-full sm:w-auto px-8 py-3 font-bold rounded-xl transition-all ${
          saved
            ? 'bg-green-600 text-white'
            : 'bg-[var(--brand-blue)] hover:opacity-90 disabled:opacity-50 text-white'
        }`}
      >
        {saved ? '✓ ' + t('saved') : saving ? '...' : t('save')}
      </button>

    </div>
  )
}
