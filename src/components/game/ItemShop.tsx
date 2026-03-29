'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import clsx from 'clsx'
import { purchaseItem, equipItem } from '@/lib/game/shop'
import RobotAvatar from '@/components/game/RobotAvatar'
import type { ShopItem, InventoryItem } from '@/types/game'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Category = ShopItem['category']
type Rarity = ShopItem['rarity']

interface ItemShopProps {
  userId: string
  items: ShopItem[]
  inventory: InventoryItem[]
  balance: number
  avatarColor: string
  locale: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RARITY_STYLES: Record<Rarity, { border: string; bg: string; text: string }> = {
  common: { border: 'border-gray-500/40', bg: 'bg-gray-500/10', text: 'text-gray-400' },
  rare: { border: 'border-blue-500/40', bg: 'bg-blue-500/10', text: 'text-blue-400' },
  epic: { border: 'border-purple-500/40', bg: 'bg-purple-500/10', text: 'text-purple-400' },
}

const CATEGORIES: Category[] = ['accessory', 'skin', 'effect']

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ItemShop({ userId, items, inventory, balance, avatarColor, locale }: ItemShopProps) {
  const t = useTranslations('game')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [currentBalance, setCurrentBalance] = useState(balance)
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all')
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [previewAccessory, setPreviewAccessory] = useState<string | null>(null)

  // Build sets for quick lookup
  const ownedItemIds = new Set(inventory.map(i => i.item_id))
  const equippedItemIds = new Set(inventory.filter(i => i.equipped).map(i => i.item_id))

  // Get the currently equipped accessory keys for the avatar preview
  const equippedAccessories = inventory
    .filter(i => i.equipped && i.item?.category === 'accessory')
    .map(i => i.item?.asset_key ?? '')
    .filter(Boolean)

  // Filter items by category
  const filteredItems = activeCategory === 'all'
    ? items
    : items.filter(i => i.category === activeCategory)

  // Get localized item name
  function getItemName(item: ShopItem): string {
    if (locale === 'ru') return item.name_ru || item.name_en
    if (locale === 'ar') return item.name_ar || item.name_en
    return item.name_en
  }

  // Get localized item description (ready for description_ru/description_ar columns)
  function getItemDescription(item: ShopItem): string {
    const rec = item as unknown as Record<string, unknown>
    if (locale === 'ru' && typeof rec.description_ru === 'string') return rec.description_ru || item.description_en
    if (locale === 'ar' && typeof rec.description_ar === 'string') return rec.description_ar || item.description_en
    return item.description_en
  }

  // Handle purchase
  async function handleBuy(item: ShopItem) {
    setError(null)
    setSuccessMsg(null)

    if (currentBalance < item.price) {
      setError(t('shop.insufficientFunds'))
      return
    }

    try {
      const result = await purchaseItem(userId, item.id)
      if (!result.success) {
        setError(result.error ?? t('shop.insufficientFunds'))
        return
      }

      if (result.newBalance !== undefined) {
        setCurrentBalance(result.newBalance)
      } else {
        setCurrentBalance(prev => prev - item.price)
      }

      setSuccessMsg(t('shop.purchaseSuccess'))
      setTimeout(() => setSuccessMsg(null), 2000)
      startTransition(() => router.refresh())
    } catch {
      setError(t('shop.insufficientFunds'))
    }
  }

  // Handle equip
  async function handleEquip(itemId: string) {
    setError(null)
    try {
      await equipItem(userId, itemId)
      startTransition(() => router.refresh())
    } catch {
      setError(t('shop.insufficientFunds'))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with balance and avatar preview */}
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Avatar preview */}
        <div className="flex-shrink-0">
          <RobotAvatar
            color={avatarColor}
            equippedAccessories={previewAccessory ? [previewAccessory] : equippedAccessories}
            size={96}
            animated
          />
        </div>
        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-black text-white">{t('shop.title')}</h1>
          <p className="text-gray-400 text-sm">{t('shop.subtitle')}</p>
          <div className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-gray-900 rounded-xl border border-[var(--brand-border)]">
            <span className="text-[var(--brand-gold)] font-black text-lg">{currentBalance}</span>
            <span className="text-gray-400 text-sm">{t('shop.balance')}</span>
          </div>
        </div>
      </div>

      {/* Status messages */}
      {error && (
        <div className="px-4 py-2 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="px-4 py-2 bg-green-900/20 border border-green-500/30 rounded-xl text-green-400 text-sm">
          {successMsg}
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveCategory('all')}
          className={clsx(
            'px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors',
            activeCategory === 'all'
              ? 'border-[var(--brand-blue)] bg-[var(--brand-blue)]/20 text-[var(--brand-blue)]'
              : 'border-[var(--brand-border)] text-gray-400 hover:text-white',
          )}
        >
          {t('shop.categories.all')}
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={clsx(
              'px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors',
              activeCategory === cat
                ? 'border-[var(--brand-blue)] bg-[var(--brand-blue)]/20 text-[var(--brand-blue)]'
                : 'border-[var(--brand-border)] text-gray-400 hover:text-white',
            )}
          >
            {t(`shop.categories.${cat}`)}
          </button>
        ))}
      </div>

      {/* Item grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map(item => {
          const isOwned = ownedItemIds.has(item.id)
          const isEquipped = equippedItemIds.has(item.id)
          const rarity = RARITY_STYLES[item.rarity]

          return (
            <div
              key={item.id}
              className={clsx(
                'rounded-2xl border p-4 transition-all',
                rarity.border,
                isEquipped ? 'ring-2 ring-[var(--brand-gold)]/50' : '',
                'bg-[var(--brand-panel)]',
              )}
              onMouseEnter={() => item.category === 'accessory' && setPreviewAccessory(item.asset_key)}
              onMouseLeave={() => setPreviewAccessory(null)}
            >
              {/* Item header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-white font-bold text-sm">{getItemName(item)}</h3>
                  <p className="text-gray-500 text-xs mt-0.5">{getItemDescription(item)}</p>
                </div>
                <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full border', rarity.border, rarity.bg, rarity.text)}>
                  {t(`shop.rarity.${item.rarity}`)}
                </span>
              </div>

              {/* Preview: small avatar with this accessory */}
              {item.category === 'accessory' && (
                <div className="flex justify-center py-2">
                  <RobotAvatar
                    color={avatarColor}
                    equippedAccessories={[item.asset_key]}
                    size={56}
                  />
                </div>
              )}

              {/* Price + action */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--brand-border)]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[var(--brand-gold)] font-black">{item.price}</span>
                  <span className="text-gray-500 text-xs">{t('common.coins')}</span>
                </div>

                {isEquipped ? (
                  <span className="px-3 py-1 rounded-lg text-xs font-bold bg-[var(--brand-gold)]/20 text-[var(--brand-gold)] border border-[var(--brand-gold)]/40">
                    {t('shop.equipped')}
                  </span>
                ) : isOwned ? (
                  <button
                    onClick={() => handleEquip(item.id)}
                    disabled={isPending}
                    className="px-3 py-1 rounded-lg text-xs font-bold bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border border-[var(--brand-blue)]/40 hover:bg-[var(--brand-blue)]/30 transition-colors disabled:opacity-50"
                  >
                    {t('shop.equip')}
                  </button>
                ) : (
                  <button
                    onClick={() => handleBuy(item)}
                    disabled={isPending || currentBalance < item.price}
                    className={clsx(
                      'px-3 py-1 rounded-lg text-xs font-bold border transition-all',
                      currentBalance >= item.price
                        ? 'bg-[var(--brand-blue)] text-white border-[var(--brand-blue)] hover:opacity-90 hover:scale-105 active:scale-95'
                        : 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed',
                      'disabled:opacity-50',
                    )}
                  >
                    {t('shop.buy')}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {t('shop.noItems')}
        </div>
      )}
    </div>
  )
}
