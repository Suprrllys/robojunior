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

const EntrepreneurMission7 = dynamic(
  () => import('@/components/missions/entrepreneur/EntrepreneurMission7'),
  { ssr: false, loading: () => <div className="h-64 flex items-center justify-center text-gray-500">Loading mission...</div> },
)

interface Props {
  userId: string
  initialScore?: number
}

const TOTAL_MISSIONS = 10
const MAX_SCORE = 1000

export default function EntrepreneurMission7Wrapper({ userId, initialScore = 0 }: Props) {
  const t = useTranslations('game')
  const tMissions = useTranslations('missions')
  const locale = useLocale()
  const router = useRouter()
  const nextRouter = useNextRouter()

  const hints = [
    tMissions('entrepreneur.m7.hint1'),
    tMissions('entrepreneur.m7.hint2'),
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
      const serverFixedScore = 300 + 200 + 150
      const neededDecisions = Math.max(0, Math.min(350, finalScore - serverFixedScore))

      const result = await completeMissionV2({
        role: 'entrepreneur',
        missionNumber: 7,
        correctDecisions: neededDecisions,
        totalDecisions: 350,
        npcsSurveyed: 12,
        totalNpcs: 12,
        timeMinutes: 5,
      }, getHintsUsed(), scoreBreakdown.map(b => ({ value: b.value, max: b.max })))
      setXpEarned(result.xpEarned)
      setCoinsEarned(result.currencyEarned)
      setIsFirstClear(result.isFirstCompletion)
      fireGameToast({ xp: result.xpEarned, score: result.score })
    } catch (err) {
      console.error('Failed to save entrepreneur mission 7:', err)
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
    router.push('/missions/entrepreneur')
  }, [router, nextRouter])

  const handleNext = useCallback(() => {
    router.push('/missions/entrepreneur?mission=8')
  }, [router])

  return (
    <MissionShell
      missionTitle={tMissions('entrepreneur.m7.title')}
      missionNumber={7}
      totalMissions={TOTAL_MISSIONS}
      difficulty="hard"
      role="entrepreneur"
      score={score}
      maxScore={MAX_SCORE}
      onComplete={() => setMissionState('completed')}
      onFail={() => setMissionState('failed')}
      onExit={handleExit}
      hints={hints}
      scoreBreakdown={breakdown}
      skillsPracticed={locale === 'ru' ? ['Глобальная стратегия', 'Выход на рынок', 'Управление командой'] : locale === 'ar' ? ['التوسع الدولي', 'التوطين', 'استراتيجية المنافسة'] : ['Global Strategy', 'Market Entry', 'Team Management']}
      xpEarned={xpEarned}
      coinsEarned={coinsEarned}
      isFirstClear={isFirstClear}
      onRetry={handleRetry}
      onNext={handleNext}
      missionState={missionState === 'playing' ? 'playing' : missionState}
    >
      <EntrepreneurMission7 userId={userId} onComplete={handleComplete} />
    </MissionShell>
  )
}
