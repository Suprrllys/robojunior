'use client'

import { useState, useEffect } from 'react'
import CharacterAvatar, { loadAvatarConfig } from '@/components/game/CharacterAvatar'
import type { AvatarConfig } from '@/lib/game/shop-items'

interface CharacterAvatarPreviewProps {
  avatarColor: string
  size?: number
  animated?: boolean
  className?: string
  /** If provided, use this config directly (from DB) instead of reading localStorage */
  avatarConfig?: AvatarConfig | null
}

/**
 * A wrapper that renders CharacterAvatar. If avatarConfig prop is provided,
 * uses it directly (for showing other users' avatars from DB data).
 * Otherwise falls back to localStorage (for showing own avatar without DB data).
 */
export default function CharacterAvatarPreview({
  avatarColor,
  size = 80,
  animated = true,
  className = '',
  avatarConfig,
}: CharacterAvatarPreviewProps) {
  const [config, setConfig] = useState({
    bodyType: 'bot' as const,
    headStyle: avatarConfig?.headStyle || 'round',
    eyeStyle: avatarConfig?.eyeStyle || 'circle',
    outfit: avatarConfig?.outfit || 'none',
    accessory: avatarConfig?.accessory || 'none',
    heldItem: avatarConfig?.heldItem || 'none',
    effect: avatarConfig?.effect || 'none',
  })

  useEffect(() => {
    // If avatarConfig prop is provided, use it — no need for localStorage
    if (avatarConfig) {
      setConfig(prev => ({
        ...prev,
        headStyle: avatarConfig.headStyle || prev.headStyle,
        eyeStyle: avatarConfig.eyeStyle || prev.eyeStyle,
        outfit: avatarConfig.outfit || prev.outfit,
        accessory: avatarConfig.accessory || prev.accessory,
        heldItem: avatarConfig.heldItem || prev.heldItem,
        effect: avatarConfig.effect || prev.effect,
      }))
      return
    }

    // Fallback: load from localStorage (own avatar, no DB data available)
    const stored = loadAvatarConfig()
    if (stored && Object.keys(stored).length > 0) {
      setConfig(prev => ({
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
  }, [avatarConfig])

  return (
    <CharacterAvatar
      bodyType={config.bodyType}
      bodyColor={avatarColor}
      headStyle={config.headStyle}
      eyeStyle={config.eyeStyle}
      outfit={config.outfit}
      accessory={config.accessory}
      heldItem={config.heldItem}
      effect={config.effect}
      size={size}
      animated={animated}
      className={className}
    />
  )
}
