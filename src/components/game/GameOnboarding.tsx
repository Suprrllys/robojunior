'use client'

import { useState, useEffect } from 'react'
import clsx from 'clsx'
import { ChevronRight, SkipForward } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { IconCoin, IconStar, IconTrophy, IconGlobeAnimated, IconHandshake, IconShop, IconProfile, IconRocket, IconMagnifier, IconLightbulb, IconGear, IconChart } from '@/components/ui/SvgIcon'
import RoleIcon from '@/components/game/RoleIcon'

const STORAGE_KEY = 'robojunior_game_onboarded'
const TOTAL_STEPS = 8

const ILLUSTRATIONS: React.ReactNode[] = [
  /* Step 1: Welcome — innovation process icon (lightbulb → rocket) */
  <div key="innovation" className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      {/* Lightbulb → arrow → rocket = innovation journey */}
      <circle cx="14" cy="20" r="8" fill="#FBBF24" opacity="0.8" />
      <rect x="11" y="28" width="6" height="4" rx="1" fill="#FBBF24" opacity="0.6" />
      <path d="M14 12V8" stroke="#FDE68A" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 14L5 11" stroke="#FDE68A" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M20 14L23 11" stroke="#FDE68A" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M26 28L34 28" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 2" />
      <polygon points="42,16 48,28 45,28 45,36 39,36 39,28 36,28" fill="#60A5FA" />
      <circle cx="42" cy="22" r="2" fill="#93C5FD" />
    </svg>
  </div>,
  /* Step 2: 6 stages of innovation process */
  <div key="stages" className="flex flex-wrap justify-center gap-2">
    <div className="w-12 h-12 rounded-lg bg-blue-600/30 border border-blue-400/30 flex items-center justify-center">
      <IconMagnifier size={22} />
    </div>
    <div className="w-12 h-12 rounded-lg bg-yellow-600/30 border border-yellow-400/30 flex items-center justify-center">
      <IconLightbulb size={22} />
    </div>
    <div className="w-12 h-12 rounded-lg bg-green-600/30 border border-green-400/30 flex items-center justify-center">
      <IconGear size={22} animated />
    </div>
    <div className="w-12 h-12 rounded-lg bg-orange-600/30 border border-orange-400/30 flex items-center justify-center">
      <IconChart size={22} />
    </div>
    <div className="w-12 h-12 rounded-lg bg-purple-600/30 border border-purple-400/30 flex items-center justify-center">
      <IconHandshake size={22} />
    </div>
    <div className="w-12 h-12 rounded-lg bg-red-600/30 border border-red-400/30 flex items-center justify-center">
      <IconRocket size={22} animated />
    </div>
  </div>,
  /* Step 3: 3 instruments (not "careers") */
  <div key="instruments" className="flex gap-3">
    <RoleIcon role="drone_programmer" size={64} />
    <RoleIcon role="robot_constructor" size={64} />
    <RoleIcon role="entrepreneur" size={64} />
  </div>,
  /* Step 4: Story Mode — book/narrative icon */
  <div key="storymode" className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-700 to-pink-600 flex items-center justify-center shadow-lg">
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      {/* Open book with sparkle = Story Mode */}
      <path d="M8 12C8 12 16 8 28 12V44C16 40 8 44 8 44V12Z" fill="#A78BFA" opacity="0.7" />
      <path d="M48 12C48 12 40 8 28 12V44C40 40 48 44 48 44V12Z" fill="#C084FC" opacity="0.7" />
      <line x1="28" y1="12" x2="28" y2="44" stroke="#E9D5FF" strokeWidth="1" />
      <circle cx="38" cy="8" r="3" fill="#FBBF24" />
      <path d="M38 4V3M42 8H43M34 8H33M41 5L42 4M35 5L34 4" stroke="#FDE68A" strokeWidth="1" strokeLinecap="round" />
      {/* Chapter markers */}
      <circle cx="16" cy="20" r="2" fill="#93C5FD" />
      <circle cx="16" cy="26" r="2" fill="#86EFAC" />
      <circle cx="16" cy="32" r="2" fill="#FDE68A" />
      <circle cx="40" cy="20" r="2" fill="#FCA5A5" />
      <circle cx="40" cy="26" r="2" fill="#C4B5FD" />
      <circle cx="40" cy="32" r="2" fill="#FDBA74" />
    </svg>
  </div>,
  /* Step 5: Coop missions */
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
  /* Step 6: Rewards — XP, coins, skins */
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
  /* Step 7: Innovation profile dashboard — radar chart */
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
  /* Step 8: Shop, leaderboard, profile */
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
