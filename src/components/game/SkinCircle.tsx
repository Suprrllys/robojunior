'use client'

import { getSkinVisual, RARITY_COLORS, type SkinVisual } from '@/lib/game/skin-data'
import { clsx } from 'clsx'

interface SkinCircleProps {
  skinId: string
  size?: number
  locked?: boolean
  equipped?: boolean
  showRarity?: boolean
  onClick?: () => void
}

/**
 * Renders an avatar skin as a colored circle with a role icon inside.
 * Animated skins get a pulsing glow effect.
 * Locked skins are grayed out.
 */
export default function SkinCircle({
  skinId,
  size = 64,
  locked = false,
  equipped = false,
  showRarity = true,
  onClick,
}: SkinCircleProps) {
  const skin = getSkinVisual(skinId)
  if (!skin) return null

  const rarity = RARITY_COLORS[skin.rarity] || RARITY_COLORS.common
  const isRainbow = skin.color === 'rainbow'

  return (
    <button
      onClick={onClick}
      disabled={locked && !onClick}
      className={clsx(
        'relative flex flex-col items-center gap-1 transition-transform',
        onClick && !locked && 'hover:scale-110 cursor-pointer',
        locked && 'opacity-40 grayscale cursor-default',
        equipped && 'ring-2 ring-brand-blue ring-offset-2 ring-offset-brand-dark rounded-full'
      )}
    >
      {/* Circle */}
      <div
        className={clsx(
          'rounded-full flex items-center justify-center border-2 relative overflow-hidden',
          skin.animated && !locked && 'animate-pulse',
        )}
        style={{
          width: size,
          height: size,
          backgroundColor: locked ? '#374151' : isRainbow ? undefined : skin.color,
          borderColor: locked ? '#4B5563' : isRainbow ? '#F472B6' : skin.color,
          background: isRainbow && !locked
            ? 'linear-gradient(135deg, #EF4444, #F59E0B, #22C55E, #3B82F6, #A855F7)'
            : undefined,
        }}
      >
        <span style={{ fontSize: size * 0.4 }}>{locked ? '🔒' : skin.icon}</span>
      </div>

      {/* Rarity badge */}
      {showRarity && (
        <span className={clsx(
          'text-[10px] px-1.5 py-0.5 rounded-full border capitalize font-medium',
          rarity.bg, rarity.text, rarity.border
        )}>
          {skin.rarity}
        </span>
      )}

      {/* Equipped indicator */}
      {equipped && (
        <span className="absolute -top-1 -right-1 bg-brand-blue text-white text-[9px] px-1 rounded-full font-bold">
          ON
        </span>
      )}
    </button>
  )
}
