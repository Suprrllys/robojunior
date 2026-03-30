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

const RobotMission6 = dynamic(
  () => import('@/components/missions/robot/RobotMission6'),
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

export default function RobotMission6Wrapper({ initialScore = 0 }: { initialScore?: number }) {
  const t = useTranslations('game')
  const tMissions = useTranslations('missions')
  const locale = useLocale()
  const router = useRouter()
  const nextRouter = useNextRouter()

  const hints = [
    tMissions('robot.m6.hint1'),
    tMissions('robot.m6.hint2'),
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

    const runtimeScore = scoreBreakdown.find(b => b.max === 500)?.value ?? 0
    const efficiencyScore = scoreBreakdown.find(b => b.max === 350)?.value ?? 0

    const slotsCorrect = runtimeScore >= 500 ? 5 : runtimeScore >= 300 ? 3 : 1
    const testsPassed = efficiencyScore >= 300 ? 3 : efficiencyScore >= 200 ? 2 : 1

    try {
      const result = await completeMissionV2({
        role: 'robot_constructor',
        missionNumber: 6,
        slotsFilledCorrectly: slotsCorrect,
        totalSlots: 5,
        testsPassed: testsPassed,
        totalTests: 3,
        moneySpent: 0,
        budgetLimit: 50,
        testQuality: runtimeScore >= 500 ? 'smooth' : runtimeScore >= 300 ? 'jerky' : 'fail',
      }, getHintsUsed(), scoreBreakdown.map(b => ({ value: b.value, max: b.max })))
      // Keep client score and breakdown (server may differ due to telemetry mapping)
      setXpEarned(result.xpEarned)
      setCoinsEarned(result.currencyEarned)
      setIsFirstClear(result.isFirstCompletion)
      fireGameToast({ xp: result.xpEarned, score: result.score, badge: result.newBadges[0] })
    } catch (err) {
      console.error('Failed to save robot mission 6:', err)
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
    router.push('/missions/robot?mission=7')
  }, [router])

  return (
    <MissionShell
      missionTitle={tMissions('robot.m6.missionTitle')}
      missionNumber={6}
      totalMissions={TOTAL_MISSIONS}
      difficulty="medium"
      role="robot_constructor"
      score={score}
      maxScore={MAX_SCORE}
      onComplete={() => setMissionState('completed')}
      onFail={() => setMissionState('failed')}
      onExit={handleExit}
      hints={hints}
      scoreBreakdown={breakdown}
      skillsPracticed={locale === 'ru' ? ['Управление энергией', 'Бюджетирование', 'Системное мышление'] : locale === 'ar' ? ['إدارة الطاقة', 'إدارة الميزانية', 'التفكير المنهجي'] : ['Energy Management', 'Budgeting', 'Systems Thinking']}
      xpEarned={xpEarned}
      coinsEarned={coinsEarned}
      isFirstClear={isFirstClear}
      onRetry={handleRetry}
      onNext={handleNext}
      missionState={missionState === 'playing' ? 'playing' : missionState}
    >
      <RobotMission6 onComplete={handleComplete} />
    </MissionShell>
  )
}
