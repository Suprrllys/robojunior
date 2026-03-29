'use client'

import { useState, useEffect, useTransition, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { clsx } from 'clsx'
import CharacterAvatar from './CharacterAvatar'
import { purchaseItem } from '@/lib/game/shop-actions'
import {
  type ItemCategory,
  type AvatarConfig,
  CATEGORY_INFO,
  getItemsByCategory,
  getItemById,
  loadAvatarConfig,
  saveAvatarConfig,
  loadInventory,
  saveInventory,
  DEFAULT_AVATAR,
} from '@/lib/game/shop-items'
import { saveAvatarToDB } from '@/lib/game/avatar-actions'
import { parseAvatarConfig } from '@/lib/game/avatar-utils'
import { IconCoin, IconCatHead, IconCatEyes, IconCatOutfit, IconCatAccessory, IconCatItem, IconCatEffect } from '@/components/ui/SvgIcon'
import type { ReactNode } from 'react'

const CATEGORY_ICON_MAP: Record<ItemCategory, ReactNode> = {
  heads: <IconCatHead size={18} />,
  eyes: <IconCatEyes size={18} />,
  outfits: <IconCatOutfit size={18} />,
  accessories: <IconCatAccessory size={18} />,
  heldItems: <IconCatItem size={18} />,
  effects: <IconCatEffect size={18} />,
}

const CATEGORIES: ItemCategory[] = ['heads', 'eyes', 'outfits', 'accessories', 'heldItems', 'effects']

// Map category to the avatar config key it controls
const CATEGORY_TO_CONFIG_KEY: Record<ItemCategory, keyof AvatarConfig> = {
  heads: 'headStyle',
  eyes: 'eyeStyle',
  outfits: 'outfit',
  accessories: 'accessory',
  heldItems: 'heldItem',
  effects: 'effect',
}

interface SkinShopProps {
  balance: number
  ownedSkinIds: string[]
  equippedSkinId: string | null
  /** Avatar config JSON string from DB (source of truth) */
  dbAvatarAccessory?: string | null
  /** User's avatar body color from DB */
  avatarColor?: string
}

export default function SkinShop({ balance, ownedSkinIds, dbAvatarAccessory, avatarColor = '#3B82F6' }: SkinShopProps) {
  const t = useTranslations('shop')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [activeCategory, setActiveCategory] = useState<ItemCategory>('heads')
  const [currentBalance, setCurrentBalance] = useState(balance)
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(DEFAULT_AVATAR)
  const [inventory, setInventory] = useState<Set<string>>(new Set())
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null)
  const [buyingItemId, setBuyingItemId] = useState<string | null>(null)
  const buyingRef = useRef(false) // instant guard against double-click
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Load config from DB first (source of truth), fallback to localStorage
  useEffect(() => {
    const hasDbConfig = dbAvatarAccessory && dbAvatarAccessory.startsWith('{')
    if (hasDbConfig) {
      const dbConfig = parseAvatarConfig(dbAvatarAccessory)
      setAvatarConfig(dbConfig)
      // Sync to localStorage as cache
      saveAvatarConfig(dbConfig)
    } else {
      const config = loadAvatarConfig()
      setAvatarConfig(config)
    }
    const inv = loadInventory()
    // Merge server-side owned skins
    ownedSkinIds.forEach(id => inv.add(id))
    setInventory(inv)
    saveInventory(inv)
  }, [ownedSkinIds, dbAvatarAccessory])

  const items = getItemsByCategory(activeCategory)

  // Check if an item is owned (default items are always owned)
  const isOwned = useCallback((itemId: string) => {
    const item = getItemById(itemId)
    if (!item) return false
    if (item.isDefault) return true
    return inventory.has(itemId)
  }, [inventory])

  // Check if an item is currently equipped
  const isEquipped = useCallback((itemId: string) => {
    const item = getItemById(itemId)
    if (!item) return false
    const configKey = CATEGORY_TO_CONFIG_KEY[item.category]
    const visualValue = Object.values(item.visual)[0]
    return avatarConfig[configKey] === visualValue
  }, [avatarConfig])

  // Preview config: shows the hovered item applied
  const previewConfig: AvatarConfig = (() => {
    if (!hoveredItemId) return avatarConfig
    const hoveredItem = getItemById(hoveredItemId)
    if (!hoveredItem) return avatarConfig
    const configKey = CATEGORY_TO_CONFIG_KEY[hoveredItem.category]
    const visualValue = Object.values(hoveredItem.visual)[0] as string
    return { ...avatarConfig, [configKey]: visualValue }
  })()

  async function handleBuy(itemId: string) {
    // Instant ref-based guard: blocks double-click before React state updates
    if (buyingRef.current) return
    if (buyingItemId) return
    if (inventory.has(itemId)) return // already owned locally
    buyingRef.current = true
    setError(null)
    setSuccess(null)
    setBuyingItemId(itemId)

    try {
      const result = await purchaseItem(itemId)
      if (!result.success) {
        setError(result.error ?? t('purchaseFailed'))
        return
      }

      if (result.newBalance !== undefined) {
        setCurrentBalance(result.newBalance)
      }

      // Add to local inventory
      setInventory(prev => {
        const next = new Set(Array.from(prev))
        next.add(itemId)
        saveInventory(next)
        return next
      })

      setSuccess(t('purchaseSuccess'))
      setTimeout(() => setSuccess(null), 2500)
      startTransition(() => router.refresh())
    } finally {
      setBuyingItemId(null)
      buyingRef.current = false
    }
  }

  async function handleEquip(itemId: string) {
    const item = getItemById(itemId)
    if (!item) return

    const configKey = CATEGORY_TO_CONFIG_KEY[item.category]
    const visualValue = Object.values(item.visual)[0] as string

    const next = { ...avatarConfig, [configKey]: visualValue }
    // Save to localStorage for instant feedback
    saveAvatarConfig(next)
    setAvatarConfig(next)
    // Save to DB so it persists everywhere (navbar, profile, etc.)
    try {
      await saveAvatarToDB(next)
    } catch {
      // DB save failed silently — localStorage still has the config
    }
    startTransition(() => router.refresh())
  }

  return (
    <div className="space-y-5">
      {/* Balance bar */}
      <div className="flex items-center gap-3 px-5 py-3 bg-gray-900/80 rounded-xl border border-gray-700/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <IconCoin size={28} />
          <span className="text-[var(--brand-gold)] font-black text-2xl">{currentBalance}</span>
        </div>
        <span className="text-gray-400 text-sm">{t('balance')}</span>
      </div>

      {/* Status messages */}
      {error && (
        <div className="px-4 py-2 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400 text-sm animate-fade-in">
          {error}
        </div>
      )}
      {success && (
        <div className="px-4 py-2 bg-green-900/20 border border-green-500/30 rounded-xl text-green-400 text-sm animate-fade-in">
          {success}
        </div>
      )}

      {/* Main layout: preview + grid */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Live Preview Panel */}
        <div className="lg:w-64 shrink-0">
          <div className="sticky top-4 bg-gray-900/60 border border-gray-700/50 rounded-2xl p-6 flex flex-col items-center gap-4 backdrop-blur-sm">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">{t('preview')}</h3>
            <div className="bg-gradient-to-b from-gray-800/50 to-gray-900/50 rounded-xl p-4 w-full flex justify-center">
              <CharacterAvatar
                        bodyType="bot"
                        bodyColor={avatarColor}
                        headStyle={previewConfig.headStyle}
                        eyeStyle={previewConfig.eyeStyle}
                        outfit={previewConfig.outfit}
                        accessory={previewConfig.accessory}
                        heldItem={previewConfig.heldItem}
                        effect={previewConfig.effect}
                        size={160}
                        animated
                      />
            </div>
            <p className="text-xs text-gray-500 text-center">{t('previewHint')}</p>
          </div>
        </div>

        {/* Shop content */}
        <div className="flex-1 min-w-0">
          {/* Category tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-thin">
            {CATEGORIES.map(cat => {
              const info = CATEGORY_INFO[cat]
              const isActive = activeCategory === cat
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border',
                    isActive
                      ? 'text-white border-opacity-60 scale-105 shadow-lg'
                      : 'text-gray-400 border-gray-700/50 bg-gray-900/30 hover:bg-gray-800/50 hover:text-gray-200',
                  )}
                  style={isActive ? {
                    backgroundColor: info.color + '20',
                    borderColor: info.color + '60',
                    boxShadow: `0 0 20px ${info.color}15`,
                  } : undefined}
                >
                  <span className="flex items-center">{CATEGORY_ICON_MAP[cat]}</span>
                  {t(`categories.${cat}`)}
                </button>
              )
            })}
          </div>

          {/* Item grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {items.map(item => {
              const owned = isOwned(item.id)
              const equipped = isEquipped(item.id)
              const canAfford = currentBalance >= item.price

              return (
                <div
                  key={item.id}
                  onMouseEnter={() => setHoveredItemId(item.id)}
                  onMouseLeave={() => setHoveredItemId(null)}
                  className={clsx(
                    'rounded-xl border p-3 transition-all duration-200 bg-gray-900/40',
                    equipped
                      ? 'border-[var(--brand-gold)]/50 ring-1 ring-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/5'
                      : 'border-gray-700/40 hover:border-gray-600/60 hover:bg-gray-800/40',
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Mini preview */}
                    <div className="w-14 h-14 rounded-lg bg-gray-800/60 flex items-center justify-center shrink-0 overflow-hidden">
                      <CharacterAvatar
                        bodyType="bot"
                        bodyColor={avatarColor}
                        headStyle={item.category === 'heads' ? Object.values(item.visual)[0] as string : DEFAULT_AVATAR.headStyle}
                        eyeStyle={item.category === 'eyes' ? Object.values(item.visual)[0] as string : DEFAULT_AVATAR.eyeStyle}
                        outfit={item.category === 'outfits' ? Object.values(item.visual)[0] as string : DEFAULT_AVATAR.outfit}
                        accessory={item.category === 'accessories' ? Object.values(item.visual)[0] as string : DEFAULT_AVATAR.accessory}
                        heldItem={item.category === 'heldItems' ? Object.values(item.visual)[0] as string : DEFAULT_AVATAR.heldItem}
                        effect={item.category === 'effects' ? Object.values(item.visual)[0] as string : DEFAULT_AVATAR.effect}
                        size={48}
                        animated={false}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold text-sm truncate">
                        {t(`items.${item.nameKey}`)}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        {item.price === 0 ? (
                          <span className="text-green-400 text-xs font-semibold">{t('free')}</span>
                        ) : (
                          <>
                            <span className="text-[var(--brand-gold)] font-black text-sm">{item.price}</span>
                            <span className="text-gray-500 text-xs">{t('coins')}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action button */}
                    <div className="shrink-0">
                      {equipped ? (
                        <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--brand-gold)]/15 text-[var(--brand-gold)] border border-[var(--brand-gold)]/30">
                          {t('equipped')}
                        </span>
                      ) : owned ? (
                        <button
                          onClick={() => handleEquip(item.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors"
                        >
                          {t('equip')}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBuy(item.id)}
                          disabled={isPending || !canAfford || buyingItemId === item.id}
                          className={clsx(
                            'px-3 py-1.5 rounded-lg text-xs font-bold border transition-all',
                            canAfford && buyingItemId !== item.id
                              ? 'bg-blue-600 text-white border-blue-500 hover:bg-blue-500 hover:scale-105 active:scale-95'
                              : 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed',
                            'disabled:opacity-50',
                          )}
                        >
                          {buyingItemId === item.id ? t('buying') : t('buy')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
