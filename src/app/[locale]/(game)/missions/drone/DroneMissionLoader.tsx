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
  DRONE_KNOWLEDGE_BASE,
} from '@/lib/game/onboarding-config'
import type { Difficulty } from '@/types/game'

// Dynamic imports of mission components (contain canvas, must be client-only)
const missionLoadingFallback = () => <div className="h-64 flex items-center justify-center text-gray-500">Loading mission...</div>

const DroneMission1 = dynamic(
  () => import('@/components/missions/drone/DroneMission1'),
  { ssr: false, loading: missionLoadingFallback },
)

const DroneMission2 = dynamic(
  () => import('@/components/missions/drone/DroneMission2'),
  { ssr: false, loading: missionLoadingFallback },
)

const DroneMission3 = dynamic(
  () => import('@/components/missions/drone/DroneMission3'),
  { ssr: false, loading: missionLoadingFallback },
)

const DroneMission4 = dynamic(
  () => import('@/components/missions/drone/DroneMission4'),
  { ssr: false, loading: missionLoadingFallback },
)

const DroneMission5 = dynamic(
  () => import('@/components/missions/drone/DroneMission5'),
  { ssr: false, loading: missionLoadingFallback },
)

const DroneMission6 = dynamic(
  () => import('@/components/missions/drone/DroneMission6'),
  { ssr: false, loading: missionLoadingFallback },
)

const DroneMission7 = dynamic(
  () => import('@/components/missions/drone/DroneMission7'),
  { ssr: false, loading: missionLoadingFallback },
)

const DroneMission8 = dynamic(
  () => import('@/components/missions/drone/DroneMission8'),
  { ssr: false, loading: missionLoadingFallback },
)

const DroneMission9 = dynamic(
  () => import('@/components/missions/drone/DroneMission9'),
  { ssr: false, loading: missionLoadingFallback },
)

const DroneMission10 = dynamic(
  () => import('@/components/missions/drone/DroneMission10'),
  { ssr: false, loading: missionLoadingFallback },
)

interface Props {
  missionNumber: number
  userId: string
  difficulty: Difficulty
  isCompleted?: boolean
  initialScore?: number
}

const TOTAL_MISSIONS = 10
const MAX_SCORE = 1000

export default function DroneMissionLoader({ missionNumber, userId, difficulty, isCompleted, initialScore = 0 }: Props) {
  const t = useTranslations('game')
  const tMissions = useTranslations('missions')
  const locale = useLocale()

  // Get translated hints for current mission (3 levels for programmer)
  const hintsByMission: Record<number, string[]> = {
    1: [tMissions('drone.m1.hint1'), tMissions('drone.m1.hint2'), tMissions('drone.m1.hint3')],
    2: [tMissions('drone.m2.hint1'), tMissions('drone.m2.hint2'), tMissions('drone.m2.hint3')],
    3: [tMissions('drone.m3.hint1'), tMissions('drone.m3.hint2'), tMissions('drone.m3.hint3')],
    4: [tMissions('drone.m4.hint1'), tMissions('drone.m4.hint2'), tMissions('drone.m4.hint3')],
    5: [tMissions('drone.m5.hint1'), tMissions('drone.m5.hint2'), tMissions('drone.m5.hint3')],
    6: [tMissions('drone.m6.hint1'), tMissions('drone.m6.hint2'), tMissions('drone.m6.hint3')],
    7: [tMissions('drone.m7.hint1'), tMissions('drone.m7.hint2'), tMissions('drone.m7.hint3')],
    8: [tMissions('drone.m8.hint1'), tMissions('drone.m8.hint2'), tMissions('drone.m8.hint3')],
    9: [tMissions('drone.m9.hint1'), tMissions('drone.m9.hint2'), tMissions('drone.m9.hint3')],
    10: [tMissions('drone.m10.hint1'), tMissions('drone.m10.hint2'), tMissions('drone.m10.hint3')],
  }
  const hints = hintsByMission[missionNumber] ?? []

  const router = useRouter()
  const nextRouter = useNextRouter()
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
        role: 'drone_programmer',
        missionNumber,
        reachedTarget: finalScore >= 500,
        blocksUsed: 5,
        optimalBlocks: 5,
        timeSeconds: 60,
        timeLimitSeconds: 120,
        usedRedundantBlocks: false,
      }, getHintsUsed(), scoreBreakdown.map(b => ({ value: b.value, max: b.max })))
      setXpEarned(result.xpEarned)
      setCoinsEarned(result.currencyEarned)
      setIsFirstClear(result.isFirstCompletion)
      fireGameToast({ xp: result.xpEarned, score: finalScore, badge: result.newBadges[0] })
    } catch (err) {
      console.error('Failed to save mission progress:', err)
      fireGameToast({ xp: 0, score: finalScore })
    }
  }, [missionNumber])

  const handleRetry = useCallback(() => {
    setMissionState('playing')
    setScore(0)
    setBreakdown([])
  }, [])

  const handleExit = useCallback(() => {
    nextRouter.refresh()
    router.push('/missions/drone')
  }, [router, nextRouter])

  const handleNext = useCallback(() => {
    if (missionNumber < TOTAL_MISSIONS) {
      nextRouter.refresh()
      router.push(`/missions/drone?mission=${missionNumber + 1}&difficulty=${difficulty}`)
    }
  }, [missionNumber, difficulty, router, nextRouter])

  // Mission title and skills per mission
  const missionTitles: Record<number, string> = {
    1: t('droneMission1.title'),
    2: t('droneMission2.title'),
    3: t('droneMission3.title'),
    4: t('droneMission4.title'),
    5: t('droneMission5.title'),
    6: t('droneMission6.title'),
    7: t('droneMission7.title'),
    8: t('droneMission8.title'),
    9: t('droneMission9.title'),
    10: t('droneMission10.title'),
  }

  const missionSkills: Record<number, string[]> = locale === 'ru' ? {
    1: ['Визуальное программирование', 'Пространственное мышление'],
    2: ['Циклы (repeat)', 'Распознавание паттернов'],
    3: ['Бесконечные циклы', 'Алгоритмы покрытия'],
    4: ['Компенсация ветра', 'Предпросмотр кода'],
    5: ['Массивы', 'Циклы for', 'JavaScript'],
    6: ['Sensor API', 'Следование вдоль стен', 'Циклы while'],
    7: ['Вложенные циклы', 'Тепловые карты', 'Алгоритмы поиска'],
    8: ['Тригонометрия', 'Навигация по ориентирам', 'Счисление пути'],
    9: ['Управление флотом', 'Маршрутизация', 'Методы массивов'],
    10: ['Очереди приоритетов', 'Обработка событий', 'Проектирование систем'],
  } : locale === 'ar' ? {
    1: ['البرمجة المرئية', 'التفكير المكاني'],
    2: ['الحلقات (repeat)', 'التعرف على الأنماط'],
    3: ['حلقات لا نهائية', 'خوارزميات التغطية'],
    4: ['تعويض الرياح', 'معاينة الكود'],
    5: ['المصفوفات', 'حلقات for', 'JavaScript'],
    6: ['Sensor API', 'تتبع الجدران', 'حلقات while'],
    7: ['حلقات متداخلة', 'خرائط حرارية', 'خوارزميات البحث'],
    8: ['حساب المثلثات', 'الملاحة بالمعالم', 'تقدير المسار'],
    9: ['إدارة الأسطول', 'التوجيه', 'دوال المصفوفات'],
    10: ['طوابير الأولوية', 'معالجة الأحداث', 'تصميم الأنظمة'],
  } : {
    1: ['Visual Programming', 'Spatial Reasoning'],
    2: ['Loops (repeat)', 'Pattern Recognition'],
    3: ['Infinite Loops', 'Coverage Algorithms'],
    4: ['Wind Compensation', 'Code Preview'],
    5: ['Arrays', 'For Loops', 'JavaScript'],
    6: ['Sensor API', 'Wall-Following', 'While Loops'],
    7: ['Nested Loops', 'Heat Mapping', 'Search Algorithms'],
    8: ['Trigonometry', 'Landmark Navigation', 'Dead Reckoning'],
    9: ['Fleet Management', 'Routing', 'Array Methods'],
    10: ['Priority Queues', 'Event Handling', 'System Design'],
  }

  // Missions 1-10 are implemented
  if (missionNumber < 1 || missionNumber > 10) {
    return (
      <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl p-8 text-center">
        <p className="text-2xl font-bold text-gray-400 mb-2">
          {t('droneMission.comingSoonTitle')}
        </p>
        <p className="text-gray-500">
          {t('droneMission.comingSoonDesc')}
        </p>
      </div>
    )
  }

  // Render the appropriate mission component
  const missionComponents: Record<number, React.ReactNode> = {
    1: <DroneMission1 onComplete={handleComplete} />,
    2: <DroneMission2 onComplete={handleComplete} />,
    3: <DroneMission3 onComplete={handleComplete} />,
    4: <DroneMission4 onComplete={handleComplete} />,
    5: <DroneMission5 onComplete={handleComplete} />,
    6: <DroneMission6 onComplete={handleComplete} />,
    7: <DroneMission7 onComplete={handleComplete} />,
    8: <DroneMission8 onComplete={handleComplete} />,
    9: <DroneMission9 onComplete={handleComplete} />,
    10: <DroneMission10 onComplete={handleComplete} />,
  }

  return (
    <MissionShell
      missionTitle={missionTitles[missionNumber] ?? `Mission ${missionNumber}`}
      missionNumber={missionNumber}
      totalMissions={TOTAL_MISSIONS}
      difficulty={difficulty}
      role="drone_programmer"
      score={score}
      maxScore={MAX_SCORE}
      onComplete={() => setMissionState('completed')}
      onFail={() => setMissionState('failed')}
      onExit={handleExit}
      hints={hints}
      knowledgeBaseContent={DRONE_KNOWLEDGE_BASE}
      scoreBreakdown={breakdown}
      skillsPracticed={missionSkills[missionNumber] ?? []}
      xpEarned={xpEarned}
      coinsEarned={coinsEarned}
      isFirstClear={isFirstClear}
      onRetry={handleRetry}
      onNext={missionNumber < TOTAL_MISSIONS ? handleNext : undefined}
      missionState={missionState === 'playing' ? 'playing' : missionState}
    >
      {missionComponents[missionNumber]}
    </MissionShell>
  )
}
