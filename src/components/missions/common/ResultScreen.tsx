'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import clsx from 'clsx'
import { Star, RotateCcw, ArrowRight, Map } from 'lucide-react'
import { getAudioManager } from '@/lib/game/audio'
import { getSoloMissionStages, STAGE_META } from '@/lib/game/innovation-stages'
import type { Role } from '@/types/database'

interface ScoreBreakdownItem {
  label: string
  value: number
  max: number
}

interface ResultScreenProps {
  score: number
  maxScore: number
  scoreBreakdown: ScoreBreakdownItem[]
  isSuccess: boolean
  isFirstClear: boolean
  xpEarned: number
  coinsEarned: number
  skillsPracticed: string[]
  role?: Role
  missionNumber: number
  totalMissions: number
  nearMissPoints?: number
  nearMissStarLevel?: number
  /** When true, this mission was launched as part of Story Mode */
  storyMode?: boolean
  /** When in story mode, whether there is a next chapter to continue to */
  storyHasNextChapter?: boolean
  onRetry: () => void
  onNext?: () => void
  onBackToMap: () => void
}

function calculateStars(score: number, maxScore: number): number {
  if (maxScore <= 0) return 0
  const pct = (score / maxScore) * 100
  if (pct >= 95) return 3
  if (pct >= 75) return 2
  if (pct >= 50) return 1
  return 0
}

export default function ResultScreen({
  score,
  maxScore,
  scoreBreakdown,
  isSuccess,
  isFirstClear,
  xpEarned,
  coinsEarned,
  skillsPracticed,
  role,
  missionNumber,
  totalMissions,
  nearMissPoints,
  nearMissStarLevel,
  storyMode = false,
  storyHasNextChapter = false,
  onRetry,
  onNext,
  onBackToMap,
}: ResultScreenProps) {
  const t = useTranslations('missionShell')
  const tStages = useTranslations('dashboard.stages')
  const stars = calculateStars(score, maxScore)

  // Compute stages this mission covers (for success feedback)
  const missionStages = role ? getSoloMissionStages(role, missionNumber) : []

  // Animated states
  const [displayedScore, setDisplayedScore] = useState(0)
  const [filledStars, setFilledStars] = useState(0)
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [showRewards, setShowRewards] = useState(false)
  const audioPlayed = useRef(false)

  // Play result sound effect
  useEffect(() => {
    if (audioPlayed.current) return
    audioPlayed.current = true

    try {
      const audio = getAudioManager()
      audio.playSFX(isSuccess ? 'success' : 'fail')
    } catch {
      // Audio may not be available
    }
  }, [isSuccess])

  // Score counting animation (0 to final in ~1.5s)
  useEffect(() => {
    const duration = 1500
    const startTime = performance.now()
    let raf: number

    function animate(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out curve
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayedScore(Math.round(eased * score))

      if (progress < 1) {
        raf = requestAnimationFrame(animate)
      }
    }

    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [score])

  // Star fill animation — one star every 0.3s after score animation
  useEffect(() => {
    if (stars === 0) return

    const timers: ReturnType<typeof setTimeout>[] = []
    const startDelay = 1600 // After score animation finishes

    for (let i = 1; i <= stars; i++) {
      const timer = setTimeout(() => {
        setFilledStars(i)
        try {
          getAudioManager().playSFX('star')
        } catch {
          // Audio may not be available
        }
      }, startDelay + i * 300)
      timers.push(timer)
    }

    // Show breakdown after stars
    const breakdownTimer = setTimeout(() => {
      setShowBreakdown(true)
    }, startDelay + stars * 300 + 300)
    timers.push(breakdownTimer)

    // Show rewards after breakdown
    const rewardsTimer = setTimeout(() => {
      setShowRewards(true)
    }, startDelay + stars * 300 + 600)
    timers.push(rewardsTimer)

    return () => timers.forEach(clearTimeout)
  }, [stars])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-brand-panel border border-brand-border rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Title */}
        <h2
          className={clsx(
            'text-2xl font-black text-center mb-2',
            isSuccess ? 'text-brand-gold' : 'text-red-400'
          )}
        >
          {isSuccess ? t('missionComplete') : t('missionFailed')}
        </h2>

        {/* Stars */}
        <div className="flex justify-center gap-2 my-4">
          {[1, 2, 3].map((starNum) => (
            <Star
              key={starNum}
              className={clsx(
                'w-10 h-10 transition-all duration-300',
                filledStars >= starNum
                  ? 'text-yellow-400 fill-yellow-400 scale-110'
                  : 'text-gray-600'
              )}
              style={{
                transitionDelay: `${starNum * 50}ms`,
              }}
            />
          ))}
        </div>

        {/* Score */}
        <div className="text-center mb-4">
          <span className="text-4xl font-black text-white">{displayedScore}</span>
          <span className="text-lg text-gray-500 ml-1">/ {maxScore}</span>
        </div>

        {/* Near-miss indicator */}
        {nearMissPoints !== undefined && nearMissStarLevel !== undefined && (
          <div className="text-center mb-4 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-sm text-yellow-400">
              {t('nearMiss', { points: nearMissPoints, stars: nearMissStarLevel })}
            </p>
          </div>
        )}

        {/* Score breakdown */}
        {showBreakdown && scoreBreakdown.length > 0 && (
          <div className="space-y-2 mb-4 animate-fadeIn">
            {scoreBreakdown.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-400">{item.label}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-brand-dark rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-blue rounded-full transition-all duration-500"
                      style={{ width: `${item.max > 0 ? (item.value / item.max) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-white font-medium w-16 text-right">
                    {item.value}/{item.max}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rewards (only on first clear) */}
        {showRewards && isFirstClear && isSuccess && (
          <div className="flex justify-center gap-4 mb-4 animate-fadeIn">
            {xpEarned > 0 && (
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <span className="text-blue-400 font-bold text-sm">+{xpEarned}</span>
                <span className="text-blue-300 text-xs">{t('xp')}</span>
              </div>
            )}
            {coinsEarned > 0 && (
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <span className="text-yellow-400 font-bold text-sm">+{coinsEarned}</span>
                <span className="text-yellow-300 text-xs">{t('coins')}</span>
              </div>
            )}
          </div>
        )}

        {/* Skills practiced */}
        {showRewards && skillsPracticed.length > 0 && (
          <div className="mb-4 animate-fadeIn">
            <p className="text-xs text-gray-500 mb-1">{t('skillsPracticed')}</p>
            <div className="flex flex-wrap gap-1">
              {skillsPracticed.map((skill) => (
                <span
                  key={skill}
                  className="px-2 py-0.5 rounded text-xs bg-brand-border text-gray-300"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Innovation process stage(s) covered */}
        {showRewards && isSuccess && missionStages.length > 0 && (
          <div className="mb-4 animate-fadeIn">
            <p className="text-xs text-gray-500 mb-1.5">{t('stageCovered')}</p>
            <div className="flex flex-wrap gap-1.5">
              {missionStages.map(stageId => {
                const meta = STAGE_META[stageId]
                return (
                  <span
                    key={stageId}
                    className="px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5"
                    style={{
                      backgroundColor: `${meta.color}22`,
                      color: meta.color,
                      border: `1px solid ${meta.color}66`,
                    }}
                  >
                    <span>{meta.icon}</span>
                    <span>{tStages(`${stageId}Short`)}</span>
                    <span className="text-[10px] opacity-70">{meta.order}/6</span>
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col gap-2 mt-6">
          {/* Story Mode: prominent "Continue Story" button */}
          {storyMode && isSuccess && onNext && (
            <button
              onClick={onNext}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-500 transition-colors"
            >
              {storyHasNextChapter ? t('continueStory') : t('finishStory')}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {/* Solo mode: Next mission button (hidden in story mode) */}
          {!storyMode && onNext && isSuccess && missionNumber < totalMissions && (
            <button
              onClick={onNext}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-brand-blue text-white font-bold text-sm hover:bg-blue-600 transition-colors"
            >
              {t('nextMission')}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {/* Retry */}
          <button
            onClick={onRetry}
            className={clsx(
              'flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm transition-colors',
              isSuccess
                ? 'bg-brand-dark text-gray-300 hover:bg-brand-border'
                : 'bg-brand-blue text-white hover:bg-blue-600'
            )}
          >
            <RotateCcw className="w-4 h-4" />
            {t('retry')}
          </button>

          {/* Back to map (or Back to Story) */}
          <button
            onClick={onBackToMap}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-gray-400 text-sm hover:text-gray-300 transition-colors"
          >
            <Map className="w-4 h-4" />
            {storyMode ? t('backToStory') : t('backToMap')}
          </button>
        </div>
      </div>
    </div>
  )
}
