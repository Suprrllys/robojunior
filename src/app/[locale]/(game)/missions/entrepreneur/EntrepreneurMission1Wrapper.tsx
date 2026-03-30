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
  ENTREPRENEUR_KNOWLEDGE_BASE,
} from '@/lib/game/onboarding-config'

const EntrepreneurMission1 = dynamic(
  () => import('@/components/missions/entrepreneur/EntrepreneurMission1'),
  { ssr: false, loading: () => <div className="h-64 flex items-center justify-center text-gray-500">Loading mission...</div> },
)

interface Props {
  userId: string
  initialScore?: number
}

const TOTAL_MISSIONS = 10
const MAX_SCORE = 1000

export default function EntrepreneurMission1Wrapper({ userId, initialScore = 0 }: Props) {
  const t = useTranslations('game')
  const tMissions = useTranslations('missions')
  const locale = useLocale()
  const router = useRouter()
  const nextRouter = useNextRouter()

  const hints = [
    tMissions('entrepreneur.m1.hint1'),
    tMissions('entrepreneur.m1.hint2'),
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
      const result = await completeMissionV2({
        role: 'entrepreneur',
        missionNumber: 1,
        correctDecisions: scoreBreakdown.find(b => b.max === 350)?.value ?? 0,
        totalDecisions: 350,
        npcsSurveyed: scoreBreakdown.find(b => b.max === 300)?.value === 300 ? 12 : scoreBreakdown.find(b => b.max === 300)?.value === 200 ? 8 : 6,
        totalNpcs: 12,
        timeMinutes: scoreBreakdown.find(b => b.max === 150)?.value === 150 ? 3 : scoreBreakdown.find(b => b.max === 150)?.value === 100 ? 7 : 15,
      }, getHintsUsed(), scoreBreakdown.map(b => ({ value: b.value, max: b.max })))
      // Keep client score (server score used only for DB persistence)
      setXpEarned(result.xpEarned)
      setCoinsEarned(result.currencyEarned)
      setIsFirstClear(result.isFirstCompletion)
      fireGameToast({ xp: result.xpEarned, score: result.score })
    } catch (err) {
      console.error('Failed to save entrepreneur mission:', err)
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
    router.push('/missions/entrepreneur?mission=2')
  }, [router])

  return (
    <MissionShell
      missionTitle={tMissions('entrepreneur.m1.title')}
      missionNumber={1}
      totalMissions={TOTAL_MISSIONS}
      difficulty="easy"
      role="entrepreneur"
      score={score}
      maxScore={MAX_SCORE}
      onComplete={() => setMissionState('completed')}
      onFail={() => setMissionState('failed')}
      onExit={handleExit}
      hints={hints}
      knowledgeBaseContent={ENTREPRENEUR_KNOWLEDGE_BASE}
      scoreBreakdown={breakdown}
      skillsPracticed={locale === 'ru' ? ['Исследование рынка', 'Определение проблемы'] : locale === 'ar' ? ['أبحاث السوق', 'اكتشاف العملاء', 'تحديد المشكلات'] : ['Market Research', 'Problem Identification']}
      xpEarned={xpEarned}
      coinsEarned={coinsEarned}
      isFirstClear={isFirstClear}
      onRetry={handleRetry}
      onNext={handleNext}
      missionState={missionState === 'playing' ? 'playing' : missionState}
    >
      <EntrepreneurMission1 userId={userId} onComplete={handleComplete} />
    </MissionShell>
  )
}
