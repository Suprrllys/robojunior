'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import clsx from 'clsx'
import { ChevronRight, SkipForward } from 'lucide-react'

export interface OnboardingStep {
  titleKey: string
  descriptionKey: string
  imageComponent?: React.ReactNode
}

interface OnboardingOverlayProps {
  steps: OnboardingStep[]
  onComplete: () => void
}

export default function OnboardingOverlay({ steps, onComplete }: OnboardingOverlayProps) {
  const t = useTranslations('missionShell')
  const tOnboarding = useTranslations('onboarding')
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    if (steps.length === 0) onComplete()
  }, [steps.length, onComplete])

  if (steps.length === 0) return null

  const step = steps[currentStep]
  const isLast = currentStep === steps.length - 1

  const handleNext = () => {
    if (isLast) {
      onComplete()
    } else {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleSkip = () => {
    onComplete()
  }

  // Safely get translation — use the key itself as fallback
  const getTranslation = (key: string): string => {
    try {
      return tOnboarding(key)
    } catch {
      return key
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 bg-brand-panel border border-brand-border rounded-2xl p-6 shadow-2xl">
        {/* Skip button */}
        <div className="flex justify-end mb-2">
          <button
            onClick={handleSkip}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {t('skip')}
            <SkipForward className="w-3 h-3" />
          </button>
        </div>

        {/* Step content */}
        <div className="text-center mb-6">
          {/* Optional image/illustration */}
          {step.imageComponent && (
            <div className="flex justify-center mb-4">
              {step.imageComponent}
            </div>
          )}

          <h2 className="text-xl font-bold text-white mb-2">
            {getTranslation(step.titleKey)}
          </h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            {getTranslation(step.descriptionKey)}
          </p>
        </div>

        {/* Step indicator dots */}
        <div className="flex justify-center gap-2 mb-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={clsx(
                'w-2 h-2 rounded-full transition-all duration-300',
                i === currentStep
                  ? 'bg-brand-blue w-6'
                  : i < currentStep
                    ? 'bg-brand-blue/50'
                    : 'bg-gray-600'
              )}
            />
          ))}
        </div>

        {/* Next / Start button */}
        <button
          onClick={handleNext}
          className="w-full py-3 rounded-xl bg-brand-blue text-white font-bold text-sm hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
        >
          {isLast ? t('startMission') : t('nextStep')}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
