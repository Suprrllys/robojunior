'use client'

import { useState, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { useRouter as useNextRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import MissionShell from '@/components/missions/common/MissionShell'
import { getHintsUsed } from '@/components/missions/common/MissionShell'
import type { ScoreBreakdownItem } from '@/components/missions/common/MissionShell'
import { completeMissionV2 } from '@/lib/game/complete-mission-v2'
import { fireGameToast } from '@/components/game/GameToast'
import {
  ROBOT_KNOWLEDGE_BASE,
} from '@/lib/game/onboarding-config'

// Dynamic import to avoid SSR issues with @dnd-kit
const RobotMission1 = dynamic(
  () => import('@/components/missions/robot/RobotMission1'),
  { ssr: false, loading: () => <LoadingPlaceholder /> },
)

function LoadingPlaceholder() {
  return (
    <div className="bg-gray-900/80 border border-gray-700 rounded-2xl p-8 text-center">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-800 rounded w-1/3 mx-auto" />
        <div className="h-4 bg-gray-800 rounded w-2/3 mx-auto" />
        <div className="h-48 bg-gray-800 rounded" />
      </div>
    </div>
  )
}

const TOTAL_MISSIONS = 10
const MAX_SCORE = 1000

export default function RobotMission1Wrapper({ initialScore = 0 }: { initialScore?: number }) {
  const t = useTranslations('game')
  const tMissions = useTranslations('missions')
  const locale = useLocale()
  const router = useRouter()
  const nextRouter = useNextRouter()

  const hints = [
    tMissions('robot.m1.hint1'),
    tMissions('robot.m1.hint2'),
  ]

  const [score, setScore] = useState(initialScore)
  const [breakdown, setBreakdown] = useState<ScoreBreakdownItem[]>([])
  const [missionState, setMissionState] = useState<'playing' | 'completed' | 'failed'>('playing')
  const [xpEarned, setXpEarned] = useState(0)
  const [coinsEarned, setCoinsEarned] = useState(0)
  const [isFirstClear, setIsFirstClear] = useState(false)

  const handleComplete = useCallback(async (
    finalScore: number,
    scoreBreakdown: ScoreBreakdownItem[],
  ) => {
    setScore(finalScore)
    setBreakdown(scoreBreakdown)
    setMissionState(finalScore >= 500 ? 'completed' : 'failed')

    // Derive telemetry from breakdown for server-side scoring
    const designScore = scoreBreakdown.find(b => b.max === 350)?.value ?? 0
    const physicsScore = scoreBreakdown.find(b => b.max === 300)?.value ?? 0
    const budgetScore = scoreBreakdown.find(b => b.max === 200)?.value ?? 0
    const testingScore = scoreBreakdown.find(b => b.max === 150)?.value ?? 0

    try {
      const result = await completeMissionV2({
        role: 'robot_constructor',
        missionNumber: 1,
        slotsFilledCorrectly: designScore > 0 ? 5 : 0,
        totalSlots: 5,
        testsPassed: physicsScore > 0 ? 1 : 0,
        totalTests: 1,
        moneySpent: Math.round(80 * (1 - budgetScore / 200)),
        budgetLimit: 80,
        testQuality: testingScore >= 150 ? 'smooth' : testingScore >= 75 ? 'jerky' : 'fail',
      }, getHintsUsed(), scoreBreakdown.map(b => ({ value: b.value, max: b.max })))
      // Keep client score (server score used only for DB persistence)
      // Keep client breakdown (has translated labels) instead of server's generic keys
      setXpEarned(result.xpEarned)
      setCoinsEarned(result.currencyEarned)
      setIsFirstClear(result.isFirstCompletion)
      fireGameToast({ xp: result.xpEarned, score: result.score, badge: result.newBadges[0] })
    } catch (err) {
      console.error('Failed to save robot mission:', err)
      fireGameToast({ xp: 0, score: finalScore })
    }

  }, [nextRouter])

  const handleRetry = useCallback(() => {
    setMissionState('playing')
    setScore(0)
    setBreakdown([])
  }, [])

  const handleExit = useCallback(() => {
    nextRouter.refresh()
    router.push('/missions/robot')
  }, [router, nextRouter])

  const handleNext = useCallback(() => {
    router.push('/missions/robot?mission=2')
  }, [router])

  return (
    <MissionShell
      missionTitle={tMissions('robot.m1.missionTitle')}
      missionNumber={1}
      totalMissions={TOTAL_MISSIONS}
      difficulty="easy"
      role="robot_constructor"
      score={score}
      maxScore={MAX_SCORE}
      onComplete={() => setMissionState('completed')}
      onFail={() => setMissionState('failed')}
      onExit={handleExit}
      hints={hints}
      knowledgeBaseContent={ROBOT_KNOWLEDGE_BASE}
      scoreBreakdown={breakdown}
      skillsPracticed={locale === 'ru' ? ['Проектирование роботов', 'Инженерия', 'Управление бюджетом'] : locale === 'ar' ? ['تصميم الروبوتات', 'الهندسة', 'إدارة الميزانية'] : ['Robot Design', 'Engineering', 'Budget Management']}
      xpEarned={xpEarned}
      coinsEarned={coinsEarned}
      isFirstClear={isFirstClear}
      onRetry={handleRetry}
      onNext={handleNext}
      missionState={missionState === 'playing' ? 'playing' : missionState}
    >
      <RobotMission1 onComplete={handleComplete} />
    </MissionShell>
  )
}
