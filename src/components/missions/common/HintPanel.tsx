'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import clsx from 'clsx'
import { Lightbulb, X } from 'lucide-react'
import { getAudioManager } from '@/lib/game/audio'
import type { Role } from '@/types/database'

interface HintPanelProps {
  hints: string[]
  maxLevels?: number
  role: Role
  onHintUsed?: () => void
}

export default function HintPanel({ hints, maxLevels, role, onHintUsed }: HintPanelProps) {
  const t = useTranslations('missionShell')
  const [currentLevel, setCurrentLevel] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const levels = maxLevels ?? hints.length

  // Close panel when clicking outside
  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleToggle = () => {
    if (!isOpen) {
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }

  const handleRevealNext = () => {
    if (currentLevel < levels && currentLevel < hints.length) {
      setCurrentLevel((prev) => prev + 1)
      onHintUsed?.()
      try {
        getAudioManager().playSFX('hint')
      } catch {
        // Audio may not be available
      }
    }
  }

  // Role-specific accent colors
  const accentColor =
    role === 'drone_programmer'
      ? 'text-blue-400 border-blue-500/30 bg-blue-500/10'
      : role === 'robot_constructor'
        ? 'text-green-400 border-green-500/30 bg-green-500/10'
        : 'text-amber-400 border-amber-500/30 bg-amber-500/10'

  const revealedHints = hints.slice(0, currentLevel)
  const hasMore = currentLevel < hints.length && currentLevel < levels

  return (
    <div className="relative" ref={panelRef}>
      {/* Hint button — always visible */}
      <button
        onClick={handleToggle}
        className={clsx(
          'p-1.5 rounded-lg transition-colors',
          isOpen ? 'bg-yellow-500/20 text-yellow-400' : 'hover:bg-brand-border text-gray-400'
        )}
        aria-label={t('hint')}
      >
        <Lightbulb className="w-5 h-5" />
      </button>

      {/* Hint panel — popup on desktop, full-screen overlay on mobile */}
      {isOpen && (
        <>
          {/* Mobile: full-screen overlay */}
          <div className="fixed inset-0 z-50 flex items-end sm:items-start sm:justify-end sm:relative sm:inset-auto">
            {/* Backdrop (mobile only) */}
            <div
              className="absolute inset-0 bg-black/50 sm:hidden"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <div
              className={clsx(
                'relative w-full sm:w-80 sm:absolute sm:right-0 sm:top-full sm:mt-2',
                'bg-brand-panel border border-brand-border rounded-t-2xl sm:rounded-2xl',
                'p-4 shadow-xl max-h-[70vh] sm:max-h-96 overflow-y-auto',
                'z-10'
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-400" />
                  {t('hints')}
                  <span className="text-xs text-gray-500">
                    ({currentLevel}/{Math.min(levels, hints.length)})
                  </span>
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded hover:bg-brand-border sm:hidden"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Revealed hints */}
              {revealedHints.length === 0 && (
                <p className="text-xs text-gray-500 mb-3">{t('noHintsYet')}</p>
              )}

              <div className="space-y-2 mb-3">
                {revealedHints.map((hint, i) => (
                  <div
                    key={i}
                    className={clsx(
                      'rounded-lg border p-3 text-sm',
                      accentColor
                    )}
                  >
                    <span className="font-semibold text-xs opacity-70">
                      {t('hintLevel', { level: i + 1 })}
                    </span>
                    <p className="mt-1">{hint}</p>
                  </div>
                ))}
              </div>

              {/* Reveal next button */}
              {hasMore && (
                <button
                  onClick={handleRevealNext}
                  className="w-full py-2 px-3 rounded-lg bg-yellow-500/20 text-yellow-400 text-sm font-medium hover:bg-yellow-500/30 transition-colors"
                >
                  {t('revealHint')}
                </button>
              )}

              {!hasMore && revealedHints.length > 0 && (
                <p className="text-xs text-gray-500 text-center">
                  {t('allHintsRevealed')}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
