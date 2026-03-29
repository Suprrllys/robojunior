'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import SkinCircle from './SkinCircle'
import { getSkinVisual } from '@/lib/game/skin-data'

interface RewardUnlockProps {
  skinIds: string[]
  onDismiss: () => void
}

/**
 * Full-screen celebration overlay when new skins/achievements are unlocked.
 * Shows confetti animation and the unlocked skin(s).
 */
export default function RewardUnlock({ skinIds, onDismiss }: RewardUnlockProps) {
  const t = useTranslations('rewards')
  const [confettiPieces, setConfettiPieces] = useState<ConfettiPiece[]>([])

  useEffect(() => {
    // Generate confetti pieces on mount
    const pieces: ConfettiPiece[] = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360,
    }))
    setConfettiPieces(pieces)
  }, [])

  // Close on Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onDismiss()
  }, [onDismiss])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (skinIds.length === 0) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onDismiss}
    >
      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confettiPieces.map(piece => (
          <div
            key={piece.id}
            className="absolute animate-confetti-fall"
            style={{
              left: `${piece.x}%`,
              top: '-20px',
              width: piece.size,
              height: piece.size,
              backgroundColor: piece.color,
              transform: `rotate(${piece.rotation}deg)`,
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div
        className="relative bg-brand-panel border border-brand-border rounded-3xl p-8 max-w-md w-full mx-4 text-center animate-bounce-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Stars */}
        <div className="text-5xl mb-2">
          {'✨ 🎉 ✨'}
        </div>

        <h2 className="text-2xl font-black text-white mb-2">
          {t('unlocked')}
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          {t('unlockedDesc')}
        </p>

        {/* Unlocked skins */}
        <div className="flex justify-center gap-6 flex-wrap mb-6">
          {skinIds.map(skinId => {
            const visual = getSkinVisual(skinId)
            return (
              <div key={skinId} className="flex flex-col items-center gap-2">
                <SkinCircle skinId={skinId} size={80} />
                {visual && (
                  <span className="text-white text-sm font-medium">
                    {t(visual.nameKey)}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        <button
          onClick={onDismiss}
          className="bg-brand-blue hover:bg-brand-blue/80 text-white font-bold py-3 px-8 rounded-xl text-lg transition-colors"
        >
          {t('awesome')}
        </button>
      </div>

      {/* CSS animations */}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti-fall {
          animation: confetti-fall linear forwards;
        }
        @keyframes bounce-in {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.6s ease-out;
        }
      `}</style>
    </div>
  )
}

// Confetti helpers
const CONFETTI_COLORS = ['#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#A855F7', '#EC4899']

interface ConfettiPiece {
  id: number
  x: number
  delay: number
  duration: number
  color: string
  size: number
  rotation: number
}
