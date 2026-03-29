'use client'

import { useState, useEffect } from 'react'
import clsx from 'clsx'
import { ChevronRight, SkipForward } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { IconCoin, IconStar, IconTrophy, IconGlobeAnimated, IconHandshake, IconShop, IconProfile } from '@/components/ui/SvgIcon'
import RoleIcon from '@/components/game/RoleIcon'

const STORAGE_KEY = 'robojunior_game_onboarded'
const TOTAL_STEPS = 7

const ILLUSTRATIONS: React.ReactNode[] = [
  /* Step 1: Welcome to BRICS City — city skyline SVG */
  <div key="city" className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center shadow-lg">
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <rect x="4" y="24" width="10" height="28" rx="1" fill="#93C5FD" opacity="0.8" />
      <rect x="6" y="26" width="2" height="2" rx="0.5" fill="#FDE68A" /><rect x="10" y="26" width="2" height="2" rx="0.5" fill="#FDE68A" />
      <rect x="6" y="30" width="2" height="2" rx="0.5" fill="#FDE68A" /><rect x="10" y="30" width="2" height="2" rx="0.5" fill="#FDE68A" />
      <rect x="16" y="14" width="12" height="38" rx="1" fill="#60A5FA" />
      <rect x="18" y="16" width="2" height="2" rx="0.5" fill="#FDE68A" /><rect x="22" y="16" width="2" height="2" rx="0.5" fill="#FDE68A" /><rect x="26" y="16" width="2" height="2" rx="0.5" fill="#FDE68A" />
      <rect x="18" y="20" width="2" height="2" rx="0.5" fill="#FDE68A" /><rect x="22" y="20" width="2" height="2" rx="0.5" fill="#FDE68A" /><rect x="26" y="20" width="2" height="2" rx="0.5" fill="#FDE68A" />
      <rect x="18" y="24" width="2" height="2" rx="0.5" fill="#FDE68A" /><rect x="22" y="24" width="2" height="2" rx="0.5" fill="#FDE68A" />
      <rect x="30" y="8" width="14" height="44" rx="1" fill="#3B82F6" />
      <rect x="32" y="10" width="2" height="2" rx="0.5" fill="#FDE68A" /><rect x="36" y="10" width="2" height="2" rx="0.5" fill="#FDE68A" /><rect x="40" y="10" width="2" height="2" rx="0.5" fill="#FDE68A" />
      <rect x="32" y="14" width="2" height="2" rx="0.5" fill="#FDE68A" /><rect x="36" y="14" width="2" height="2" rx="0.5" fill="#FDE68A" /><rect x="40" y="14" width="2" height="2" rx="0.5" fill="#FDE68A" />
      <rect x="32" y="18" width="2" height="2" rx="0.5" fill="#FDE68A" /><rect x="36" y="18" width="2" height="2" rx="0.5" fill="#FDE68A" />
      <polygon points="37,4 44,8 30,8" fill="#2563EB" />
      <rect x="46" y="20" width="8" height="32" rx="1" fill="#93C5FD" opacity="0.7" />
      <rect x="48" y="22" width="2" height="2" rx="0.5" fill="#FDE68A" /><rect x="48" y="26" width="2" height="2" rx="0.5" fill="#FDE68A" />
    </svg>
  </div>,
  /* Step 2: 3 roles — role icons */
  <div key="roles" className="flex gap-3">
    <RoleIcon role="drone_programmer" size={64} />
    <RoleIcon role="robot_constructor" size={64} />
    <RoleIcon role="entrepreneur" size={64} />
  </div>,
  /* Step 3: 10 missions per role — stars + score bar */
  <div key="stars" className="flex flex-col items-center gap-2">
    <div className="flex gap-1">
      <IconStar size={28} animated />
      <IconStar size={28} animated />
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><polygon points="14,3 17.5,10 25,11 19.5,16.5 21,24 14,20 7,24 8.5,16.5 3,11 10.5,10" fill="#374151" /></svg>
    </div>
    <div className="h-2.5 w-32 bg-gray-700 rounded-full overflow-hidden">
      <div className="h-full w-[85%] bg-gradient-to-r from-yellow-500 to-amber-400 rounded-full" />
    </div>
  </div>,
  /* Step 4: Coop missions */
  <div key="coop" className="flex gap-3">
    <div className="w-14 h-14 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center">
      <IconGlobeAnimated size={32} />
    </div>
    <div className="w-14 h-14 rounded-xl bg-green-600/30 border border-green-400/30 flex items-center justify-center">
      <IconHandshake size={28} />
    </div>
    <div className="w-14 h-14 rounded-xl bg-purple-600/30 border border-purple-400/30 flex items-center justify-center">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="4" y="14" width="6" height="10" rx="1" fill="#A78BFA" opacity="0.7" />
        <rect x="11" y="10" width="6" height="14" rx="1" fill="#A78BFA" opacity="0.85" />
        <rect x="18" y="6" width="6" height="18" rx="1" fill="#A78BFA" />
        <path d="M7 12L14 8L21 4" stroke="#C4B5FD" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  </div>,
  /* Step 5: Rewards — XP, coins, skins */
  <div key="rewards" className="flex items-center gap-3">
    <div className="w-14 h-14 rounded-xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
      <IconStar size={28} animated />
    </div>
    <div className="w-14 h-14 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
      <IconCoin size={28} animated />
    </div>
    <div className="w-14 h-14 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="10" fill="none" stroke="#C084FC" strokeWidth="1.5" />
        <circle cx="10" cy="12" r="3" fill="#A78BFA" /><circle cx="18" cy="12" r="3" fill="#7C3AED" />
        <circle cx="14" cy="18" r="3" fill="#C084FC" />
        <circle cx="14" cy="14" r="1.5" fill="#E9D5FF" />
      </svg>
    </div>
  </div>,
  /* Step 6: Career dashboard — radar chart (no text labels) */
  <div key="dashboard" className="relative w-28 h-28">
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <polygon points="50,10 90,35 80,80 20,80 10,35" fill="none" stroke="#374151" strokeWidth="1" />
      <polygon points="50,25 75,40 70,68 30,68 25,40" fill="none" stroke="#374151" strokeWidth="0.5" />
      <polygon points="50,15 85,38 60,75 25,65 20,35" fill="rgba(59,130,246,0.3)" stroke="#3B82F6" strokeWidth="2" />
      <circle cx="50" cy="15" r="4" fill="#3B82F6" />
      <circle cx="85" cy="38" r="4" fill="#22C55E" />
      <circle cx="60" cy="75" r="4" fill="#A855F7" />
      <circle cx="25" cy="65" r="4" fill="#F59E0B" />
      <circle cx="20" cy="35" r="4" fill="#EF4444" />
    </svg>
  </div>,
  /* Step 7: Shop, leaderboard, profile */
  <div key="extras" className="flex gap-3">
    <div className="w-14 h-14 rounded-xl bg-yellow-600/30 border border-yellow-400/30 flex items-center justify-center">
      <IconShop size={28} />
    </div>
    <div className="w-14 h-14 rounded-xl bg-red-600/30 border border-red-400/30 flex items-center justify-center">
      <IconTrophy size={28} animated />
    </div>
    <div className="w-14 h-14 rounded-xl bg-cyan-600/30 border border-cyan-400/30 flex items-center justify-center">
      <IconProfile size={28} />
    </div>
  </div>,
]

interface GameOnboardingProps {
  onComplete: () => void
}

export default function GameOnboarding({ onComplete }: GameOnboardingProps) {
  const t = useTranslations('gameOnboarding')
  const [currentStep, setCurrentStep] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY)
      if (!seen) {
        setVisible(true)
      } else {
        onComplete()
      }
    } catch {
      onComplete()
    }
  }, [onComplete])

  if (!visible) return null

  const isLast = currentStep === TOTAL_STEPS - 1

  const handleNext = () => {
    if (isLast) {
      handleFinish()
    } else {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleFinish = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true')
    } catch {}
    setVisible(false)
    onComplete()
  }

  const stepKey = `step${currentStep + 1}` as const

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 bg-[#1a1a2e] border border-gray-700 rounded-2xl p-6 shadow-2xl">
        {/* Skip button */}
        <div className="flex justify-end mb-2">
          <button
            onClick={handleFinish}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {t('skip')}
            <SkipForward className="w-3 h-3" />
          </button>
        </div>

        {/* Illustration */}
        <div className="flex justify-center mb-5">
          {ILLUSTRATIONS[currentStep]}
        </div>

        {/* Text */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-white mb-2">
            {t(`${stepKey}.title`)}
          </h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            {t(`${stepKey}.description`)}
          </p>
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-2 mb-6">
          {ILLUSTRATIONS.map((_, i) => (
            <div
              key={i}
              className={clsx(
                'h-2 rounded-full transition-all duration-300',
                i === currentStep
                  ? 'bg-blue-500 w-6'
                  : i < currentStep
                    ? 'bg-blue-500/50 w-2'
                    : 'bg-gray-600 w-2'
              )}
            />
          ))}
        </div>

        {/* Next / Let's Go button */}
        <button
          onClick={handleNext}
          className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
        >
          {isLast ? t('letsGo') : t('next')}
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Step counter */}
        <p className="text-center text-xs text-gray-600 mt-3">
          {currentStep + 1} / {TOTAL_STEPS}
        </p>
      </div>
    </div>
  )
}
