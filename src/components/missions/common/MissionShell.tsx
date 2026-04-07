'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams, useRouter } from 'next/navigation'
import clsx from 'clsx'
import { X, BookOpen } from 'lucide-react'
import HintPanel from './HintPanel'
import ResultScreen from './ResultScreen'
import KnowledgeBase from './KnowledgeBase'
import OnboardingOverlay from './OnboardingOverlay'
import type { Role } from '@/types/database'
import { calculateNearMiss } from '@/lib/game/scoring'
import { getAudioManager } from '@/lib/game/audio'
import { STORY_PATH } from '@/lib/game/story-path'

/** Read the number of hints the player revealed during this mission. */
export function getHintsUsed(): number {
  if (typeof document === 'undefined') return 0
  const el = document.getElementById('mission-shell-actions') as any
  return el?.__hintsUsed?.current ?? 0
}

export type MissionState = 'onboarding' | 'playing' | 'completed' | 'failed'

export interface ScoreBreakdownItem {
  label: string
  value: number
  max: number
}

export interface KBEntry {
  titleKey: string
  contentKey: string
  category: string
}

export interface OnboardingStep {
  titleKey: string
  descriptionKey: string
  imageComponent?: React.ReactNode
}

export interface MissionShellProps {
  missionTitle: string
  missionNumber: number
  totalMissions: number
  difficulty: string
  role: Role
  score: number
  maxScore: number
  children: React.ReactNode
  onComplete: () => void
  onFail?: () => void
  onExit: () => void
  hints: string[]
  knowledgeBaseContent?: KBEntry[]
  onboardingSteps?: OnboardingStep[]
  /** Score breakdown for the result screen */
  scoreBreakdown?: ScoreBreakdownItem[]
  /** Skills practiced in this mission */
  skillsPracticed?: string[]
  /** XP earned on completion */
  xpEarned?: number
  /** Coins earned on completion */
  coinsEarned?: number
  /** Whether this is the user's first clear */
  isFirstClear?: boolean
  /** Callback for retry */
  onRetry?: () => void
  /** Callback for next mission */
  onNext?: () => void
  /** Override mission state from parent */
  missionState?: MissionState
  /** Whether onboarding was already completed for this mission */
  onboardingCompleted?: boolean
  /** Callback when onboarding overlay is dismissed */
  onOnboardingComplete?: () => void
}

export default function MissionShell({
  missionTitle,
  missionNumber,
  totalMissions,
  difficulty,
  role,
  score,
  maxScore,
  children,
  onComplete,
  onFail,
  onExit,
  hints,
  knowledgeBaseContent,
  onboardingSteps,
  scoreBreakdown = [],
  skillsPracticed = [],
  xpEarned = 0,
  coinsEarned = 0,
  isFirstClear = false,
  onRetry,
  onNext,
  missionState: externalState,
  onboardingCompleted = false,
  onOnboardingComplete,
}: MissionShellProps) {
  const t = useTranslations('missionShell')
  const tCommon = useTranslations('missions.common')

  // Story Mode detection — when player launches a mission from /story/[chapter],
  // the mission URL contains ?story=N. We use this to override navigation:
  // - "Back to map" button leads back to /story instead of mission list
  // - "Next mission" leads to next chapter intro instead of next solo mission
  // The mission progress itself is saved as usual (Variant A), so completing
  // a chapter mission counts toward both the story and solo progress.
  const searchParams = useSearchParams()
  const router = useRouter()
  const storyParam = searchParams?.get('story')
  const storyChapterOrder = storyParam ? parseInt(storyParam, 10) : null
  const storyChapter = storyChapterOrder
    ? STORY_PATH.find(c => c.order === storyChapterOrder)
    : null
  // Validate: only treat as story mode if the chapter exists AND it matches
  // this mission (defends against a player tampering with the URL)
  const isStoryMode = !!(
    storyChapter &&
    storyChapter.mission.role === role &&
    storyChapter.mission.missionNumber === missionNumber
  )
  const nextStoryChapter = isStoryMode && storyChapterOrder
    ? STORY_PATH.find(c => c.order === storyChapterOrder + 1)
    : null

  // Determine initial state
  const hasOnboarding = onboardingSteps && onboardingSteps.length > 0 && !onboardingCompleted
  const [internalState, setInternalState] = useState<MissionState>(
    hasOnboarding ? 'onboarding' : 'playing'
  )
  const [overrideExternal, setOverrideExternal] = useState(false)

  const state = overrideExternal ? internalState : (externalState ?? internalState)
  const setState = (s: MissionState) => {
    setOverrideExternal(true)
    setInternalState(s)
  }

  // Sync external state changes (reset override when new external state arrives)
  useEffect(() => {
    if (externalState) {
      setInternalState(externalState)
      setOverrideExternal(false)
    }
  }, [externalState])

  // Ensure music is playing (single looping track for entire game)
  useEffect(() => {
    try {
      getAudioManager().startMusic()
    } catch {
      // Audio may not be available
    }
  }, [])

  const hintsUsedRef = useRef(0)
  const [kbOpen, setKbOpen] = useState(false)

  const handleOnboardingComplete = useCallback(() => {
    setState('playing')
    onOnboardingComplete?.()
  }, [onOnboardingComplete])

  const handleComplete = useCallback(() => {
    setState('completed')
    onComplete()
  }, [onComplete])

  const handleFail = useCallback(() => {
    setState('failed')
    onFail?.()
  }, [onFail])

  // Calculate near-miss info using shared function
  const nearMiss = calculateNearMiss(score, maxScore)
  const nearMissPoints = nearMiss?.points
  const nearMissStarLevel = nearMiss?.starLevel

  const isSuccess = maxScore > 0 ? (score / maxScore) >= 0.50 : false

  return (
    <div className="relative w-full h-full min-h-screen bg-brand-dark">
      {/* Onboarding overlay */}
      {state === 'onboarding' && onboardingSteps && (
        <OnboardingOverlay
          steps={onboardingSteps}
          onComplete={handleOnboardingComplete}
        />
      )}

      {/* Top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-3 py-2 bg-brand-panel/95 backdrop-blur border-b border-brand-border">
        {/* Left: exit + title */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onExit}
            className="p-1.5 rounded-lg hover:bg-brand-border transition-colors shrink-0"
            aria-label={t('exit')}
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-white truncate">
              {missionTitle}
            </h1>
            <p className="text-xs text-gray-400">
              {t('missionOf', { current: missionNumber, total: totalMissions })} · {tCommon(difficulty)}
            </p>
          </div>
        </div>

        {/* Center: score */}
        <div className="flex items-center gap-1 px-3 py-1 rounded-lg bg-brand-dark/50">
          <span className="text-xs text-gray-400">{t('score')}:</span>
          <span className="text-sm font-bold text-brand-gold">{score}</span>
          <span className="text-xs text-gray-500">/ {maxScore}</span>
        </div>

        {/* Right: hint + KB toggle */}
        <div className="flex items-center gap-1.5 shrink-0">
          <HintPanel hints={hints} role={role} onHintUsed={() => { hintsUsedRef.current += 1 }} />
          {knowledgeBaseContent && knowledgeBaseContent.length > 0 && (
            <button
              onClick={() => setKbOpen(!kbOpen)}
              className={clsx(
                'p-1.5 rounded-lg transition-colors',
                kbOpen ? 'bg-brand-blue text-white' : 'hover:bg-brand-border text-gray-400'
              )}
              aria-label={t('knowledgeBase')}
            >
              <BookOpen className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="relative flex-1">
        {state === 'playing' && children}

        {/* Expose complete/fail handlers via data attributes for children to call */}
        {state === 'playing' && (
          <div
            id="mission-shell-actions"
            data-complete="true"
            data-fail="true"
            className="hidden"
            ref={(el) => {
              if (el) {
                (el as any).__missionComplete = handleComplete;
                (el as any).__missionFail = handleFail;
                (el as any).__hintsUsed = hintsUsedRef
              }
            }}
          />
        )}
      </div>

      {/* Knowledge Base panel */}
      {kbOpen && knowledgeBaseContent && (
        <KnowledgeBase
          entries={knowledgeBaseContent}
          onClose={() => setKbOpen(false)}
        />
      )}

      {/* Result screen */}
      {(state === 'completed' || state === 'failed') && (
        <ResultScreen
          score={score}
          maxScore={maxScore}
          scoreBreakdown={scoreBreakdown}
          isSuccess={isSuccess}
          isFirstClear={isFirstClear}
          xpEarned={xpEarned}
          coinsEarned={coinsEarned}
          skillsPracticed={skillsPracticed}
          role={role}
          missionNumber={missionNumber}
          totalMissions={totalMissions}
          nearMissPoints={nearMissPoints}
          nearMissStarLevel={nearMissStarLevel}
          storyMode={isStoryMode}
          storyHasNextChapter={!!nextStoryChapter}
          onRetry={() => {
            setState('playing')
            onRetry?.()
          }}
          onNext={
            isStoryMode
              ? nextStoryChapter
                ? () => router.push(`/story/${nextStoryChapter.id}`)
                : () => router.push('/story')
              : onNext
          }
          onBackToMap={() => {
            if (isStoryMode) {
              router.push('/story')
              return
            }
            setState('playing')
            onExit()
          }}
        />
      )}
    </div>
  )
}
