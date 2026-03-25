import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import DroneGame from '@/components/game/DroneGame'
import MissionCard from '@/components/game/MissionCard'

interface Props {
  searchParams: { mission?: string }
}

export default async function DroneMissionsPage({ searchParams }: Props) {
  const t = await getTranslations()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: progress } = await supabase
    .from('mission_progress')
    .select('mission_number, status, score')
    .eq('user_id', user!.id)
    .eq('role', 'drone_programmer')

  const m1 = progress?.find(p => p.mission_number === 1)
  const m2 = progress?.find(p => p.mission_number === 2)
  const defaultMission = m1?.status === 'completed' ? 2 : 1
  const activeMission = Number(searchParams.mission) || defaultMission
  // Can only play mission 2 if mission 1 completed
  const safeMission = activeMission === 2 && m1?.status !== 'completed' ? 1 : activeMission

  const missions = [
    { num: 1, title: t('missions.drone.m1_title'), desc: t('missions.drone.m1_desc'), progress: m1 },
    { num: 2, title: t('missions.drone.m2_title'), desc: t('missions.drone.m2_desc'), progress: m2 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/roles" className="text-gray-400 hover:text-white transition-colors">
          ← {t('missions.backToRoles')}
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-5xl">🛸</div>
        <div>
          <h1 className="text-3xl font-black text-white">{t('roles.drone_programmer.name')}</h1>
          <p className="text-gray-400">{t('roles.drone_programmer.skill')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {missions.map(m => (
          <MissionCard
            key={m.num}
            num={m.num}
            title={m.title}
            desc={m.desc}
            progress={m.progress}
            isLocked={m.num === 2 && m1?.status !== 'completed'}
            isActive={safeMission === m.num}
            href={`/missions/drone?mission=${m.num}`}
            timeEstimate="15-20"
          />
        ))}
      </div>

      <DroneGame
        userId={user!.id}
        missionNumber={safeMission}
        isCompleted={safeMission === 1 ? m1?.status === 'completed' : m2?.status === 'completed'}
      />
    </div>
  )
}
