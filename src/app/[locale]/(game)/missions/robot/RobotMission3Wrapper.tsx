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

// Dynamic import to avoid SSR issues with @dnd-kit and canvas
const RobotMission3 = dynamic(
  () => import('@/components/missions/robot/RobotMission3'),
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

export default function RobotMission3Wrapper({ initialScore = 0 }: { initialScore?: number }) {
  const t = useTranslations('game')
  const tMissions = useTranslations('missions')
  const locale = useLocale()
  const router = useRouter()
  const nextRouter = useNextRouter()

  const hints = [
    tMissions('robot.m3.hint1'),
    tMissions('robot.m3.hint2'),
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
    const balanceScore = scoreBreakdown.find(b => b.max === 500)?.value ?? 0
    const cargoScore = scoreBreakdown.find(b => b.max === 350)?.value ?? 0
    const crossingScore = scoreBreakdown.find(b => b.max === 150)?.value ?? 0

    // Map to robot telemetry format
    const slotsCorrect = Math.round((cargoScore / 350) * 5)
    const testsPassed = crossingScore > 0 ? 1 : 0

    try {
      const result = await completeMissionV2({
        role: 'robot_constructor',
        missionNumber: 3,
        slotsFilledCorrectly: slotsCorrect,
        totalSlots: 5,
        testsPassed: testsPassed,
        totalTests: 1,
        moneySpent: 0,
        budgetLimit: 50,
        testQuality: balanceScore >= 400 ? 'smooth' : balanceScore >= 200 ? 'jerky' : 'fail',
      }, getHintsUsed())
      // Keep client score and breakdown (server may differ due to telemetry mapping)
      setXpEarned(result.xpEarned)
      setCoinsEarned(result.currencyEarned)
      setIsFirstClear(result.isFirstCompletion)
      fireGameToast({ xp: result.xpEarned, score: result.score, badge: result.newBadges[0] })
    } catch (err) {
      console.error('Failed to save robot mission 3:', err)
      fireGameToast({ xp: 0, score: finalScore })
    }

    nextRouter.refresh()
  }, [nextRouter])

  const handleRetry = useCallback(() => {
    setMissionState('playing')
    setScore(0)
    setBreakdown([])
  }, [])

  const handleExit = useCallback(() => {
    router.push('/missions/robot')
  }, [router])

  const handleNext = useCallback(() => {
    router.push('/missions/robot?mission=4')
  }, [router])

  return (
    <MissionShell
      missionTitle={tMissions('robot.m3.missionTitle')}
      missionNumber={3}
      totalMissions={TOTAL_MISSIONS}
      difficulty="easy"
      role="robot_constructor"
      score={score}
      maxScore={MAX_SCORE}
      onComplete={() => setMissionState('completed')}
      onFail={() => setMissionState('failed')}
      onExit={handleExit}
      hints={hints}
      scoreBreakdown={breakdown}
      skillsPracticed={locale === 'ru' ? ['Инженерия', 'Физика', 'Балансировка нагрузки'] : locale === 'ar' ? ['الفيزياء', 'التوازن', 'التفكير المكاني'] : ['Engineering', 'Physics', 'Load Balancing']}
      xpEarned={xpEarned}
      coinsEarned={coinsEarned}
      isFirstClear={isFirstClear}
      onRetry={handleRetry}
      onNext={handleNext}
      missionState={missionState === 'playing' ? 'playing' : missionState}
    >
      <RobotMission3 onComplete={handleComplete} />
    </MissionShell>
  )
}
