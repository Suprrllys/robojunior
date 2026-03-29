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

const EntrepreneurMission3 = dynamic(
  () => import('@/components/missions/entrepreneur/EntrepreneurMission3'),
  { ssr: false, loading: () => <div className="h-64 flex items-center justify-center text-gray-500">Loading mission...</div> },
)

interface Props {
  userId: string
  initialScore?: number
}

const TOTAL_MISSIONS = 10
const MAX_SCORE = 1000

export default function EntrepreneurMission3Wrapper({ userId, initialScore = 0 }: Props) {
  const t = useTranslations('game')
  const tMissions = useTranslations('missions')
  const locale = useLocale()
  const router = useRouter()
  const nextRouter = useNextRouter()

  const hints = [
    tMissions('entrepreneur.m3.hint1'),
    tMissions('entrepreneur.m3.hint2'),
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

    try {
      // Map client score to telemetry values that produce the same score on server.
      // Server formula: decisions = (correct/total)*350, financials based on npcsSurveyed,
      //   team = flat 200, timing based on timeMinutes.
      // We set npcsSurveyed=12 (max financials=300), timeMinutes=3 (max timing=150),
      //   team is always 200. That gives 650 from those three.
      // So correctDecisions needs to produce: finalScore - 650 out of 350.
      const serverFixedScore = 300 + 200 + 150 // financials + team + timing
      const neededDecisions = Math.max(0, Math.min(350, finalScore - serverFixedScore))

      const result = await completeMissionV2({
        role: 'entrepreneur',
        missionNumber: 3,
        correctDecisions: neededDecisions,
        totalDecisions: 350,
        npcsSurveyed: 12,
        totalNpcs: 12,
        timeMinutes: 3,
      }, getHintsUsed())
      // Keep client score (server score used only for DB persistence)
      setBreakdown(scoreBreakdown) // Keep the client breakdown labels which are more meaningful
      setXpEarned(result.xpEarned)
      setCoinsEarned(result.currencyEarned)
      setIsFirstClear(result.isFirstCompletion)
      fireGameToast({ xp: result.xpEarned, score: result.score })
    } catch (err) {
      console.error('Failed to save entrepreneur mission 3:', err)
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
    router.push('/missions/entrepreneur')
  }, [router])

  const handleNext = useCallback(() => {
    router.push('/missions/entrepreneur?mission=4')
  }, [router])

  return (
    <MissionShell
      missionTitle={tMissions('entrepreneur.m3.title')}
      missionNumber={3}
      totalMissions={TOTAL_MISSIONS}
      difficulty="easy"
      role="entrepreneur"
      score={score}
      maxScore={MAX_SCORE}
      onComplete={() => setMissionState('completed')}
      onFail={() => setMissionState('failed')}
      onExit={handleExit}
      hints={hints}
      scoreBreakdown={breakdown}
      skillsPracticed={locale === 'ru' ? ['Стратегия MVP', 'Приоритизация продукта'] : locale === 'ar' ? ['بناء MVP', 'تحديد الأولويات', 'تخصيص الموارد'] : ['MVP Strategy', 'Product Prioritization']}
      xpEarned={xpEarned}
      coinsEarned={coinsEarned}
      isFirstClear={isFirstClear}
      onRetry={handleRetry}
      onNext={handleNext}
      missionState={missionState === 'playing' ? 'playing' : missionState}
    >
      <EntrepreneurMission3 userId={userId} onComplete={handleComplete} />
    </MissionShell>
  )
}
