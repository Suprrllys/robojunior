import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import EntrepreneurGame from '@/components/game/EntrepreneurGame'
import MissionCard from '@/components/game/MissionCard'
import DifficultySelector from '@/components/game/DifficultySelector'
import { getMissionConfig } from '@/lib/game/missions'
import { REWARDS_BY_DIFFICULTY } from '@/lib/game/rewards'
import type { Difficulty } from '@/types/game'

const VALID_DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

interface Props {
  searchParams: { mission?: string; difficulty?: string }
}

export default async function EntrepreneurMissionsPage({ searchParams }: Props) {
  const t = await getTranslations()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const rawDifficulty = searchParams.difficulty as Difficulty | undefined
  const difficulty: Difficulty = rawDifficulty && VALID_DIFFICULTIES.includes(rawDifficulty)
    ? rawDifficulty
    : 'medium'

  const { data: progress } = await supabase
    .from('mission_progress')
    .select('mission_number, status, score, difficulty')
    .eq('user_id', user!.id)
    .eq('role', 'entrepreneur')

  const m1AnyDifficulty = progress?.some(p => p.mission_number === 1 && p.status === 'completed')
  const defaultMission = m1AnyDifficulty ? 2 : 1
  const activeMission = Number(searchParams.mission) || defaultMission
  const safeMission = activeMission === 2 && !m1AnyDifficulty ? 1 : activeMission

  const currentProgress = progress?.find(p => p.mission_number === safeMission && p.difficulty === difficulty)

  const difficultyProgress = Object.fromEntries(
    VALID_DIFFICULTIES.map(d => {
      const p = progress?.find(r => r.mission_number === safeMission && r.difficulty === d && r.status === 'completed')
      return [d, p ? { completed: true, score: p.score } : { completed: false }]
    }),
  ) as Record<Difficulty, { completed: boolean; score?: number }>

  const timeEstimates = Object.fromEntries(
    VALID_DIFFICULTIES.map(d => {
      const cfg = getMissionConfig('entrepreneur', safeMission, d)
      return [d, cfg?.timeEstimate ?? '15']
    }),
  ) as Record<Difficulty, string>

  const rewards = Object.fromEntries(
    VALID_DIFFICULTIES.map(d => [d, { xp: REWARDS_BY_DIFFICULTY[d].xp, coins: REWARDS_BY_DIFFICULTY[d].currency }]),
  ) as Record<Difficulty, { xp: number; coins: number }>

  const missions = [
    {
      num: 1,
      title: t('missions.entrepreneur.m1_title'),
      desc: t('missions.entrepreneur.m1_desc'),
      progress: progress?.find(p => p.mission_number === 1 && p.difficulty === difficulty),
    },
    {
      num: 2,
      title: t('missions.entrepreneur.m2_title'),
      desc: t('missions.entrepreneur.m2_desc'),
      progress: progress?.find(p => p.mission_number === 2 && p.difficulty === difficulty),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/roles" className="text-gray-400 hover:text-white transition-colors">
          &larr; {t('missions.backToRoles')}
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-5xl">&#x1F4BC;</div>
        <div>
          <h1 className="text-3xl font-black text-white">{t('roles.entrepreneur.name')}</h1>
          <p className="text-gray-400">{t('roles.entrepreneur.skill')}</p>
        </div>
      </div>

      <DifficultySelector
        current={difficulty}
        missionNumber={safeMission}
        basePath="/missions/entrepreneur"
        progress={difficultyProgress}
        timeEstimates={timeEstimates}
        rewards={rewards}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {missions.map(m => (
          <MissionCard
            key={m.num}
            num={m.num}
            title={m.title}
            desc={m.desc}
            progress={m.progress}
            isLocked={m.num === 2 && !m1AnyDifficulty}
            isActive={safeMission === m.num}
            href={`/missions/entrepreneur?mission=${m.num}&difficulty=${difficulty}`}
            timeEstimate={timeEstimates[difficulty]}
          />
        ))}
      </div>

      <EntrepreneurGame
        userId={user!.id}
        missionNumber={safeMission}
        difficulty={difficulty}
        isCompleted={currentProgress?.status === 'completed'}
      />
    </div>
  )
}
