'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import SkinCircle from './SkinCircle'
import { SKIN_VISUALS } from '@/lib/game/skin-data'

interface SkinGalleryProps {
  unlockedSkinIds: string[]
  equippedSkinId: string | null
}

/**
 * Shows all achievement skins in a grid. Unlocked ones show their icon
 * and can be clicked to equip. Locked ones are grayed out with a lock icon.
 *
 * Equipping is stored in localStorage (no server table needed) via the
 * same key used by the shop inventory system.
 */
export default function SkinGallery({ unlockedSkinIds, equippedSkinId }: SkinGalleryProps) {
  const t = useTranslations('rewards')
  const [equipped, setEquipped] = useState(equippedSkinId)

  function handleEquip(skinId: string) {
    if (!unlockedSkinIds.includes(skinId)) return
    const newSkin = equipped === skinId ? null : skinId
    setEquipped(newSkin)

    // Store equipped achievement skin in localStorage
    try {
      if (newSkin) {
        localStorage.setItem('robojunior_equipped_achievement_skin', newSkin)
      } else {
        localStorage.removeItem('robojunior_equipped_achievement_skin')
      }
    } catch {
      // storage blocked
    }
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-white mb-4">{t('mySkins')}</h2>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
        {SKIN_VISUALS.map(skin => {
          const isUnlocked = unlockedSkinIds.includes(skin.id)
          const isEquipped = equipped === skin.id
          return (
            <div key={skin.id} className="flex flex-col items-center gap-1">
              <SkinCircle
                skinId={skin.id}
                size={56}
                locked={!isUnlocked}
                equipped={isEquipped}
                onClick={isUnlocked ? () => handleEquip(skin.id) : undefined}
              />
              <span className="text-[11px] text-gray-400 text-center leading-tight">
                {t(skin.nameKey)}
              </span>
              {!isUnlocked && (
                <span className="text-[9px] text-gray-500">{t('locked')}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
