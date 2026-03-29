'use client'

import { useTranslations } from 'next-intl'
import CoopSolarFarm from './CoopSolarFarm'
import CoopBridge from './CoopBridge'
import CoopRescue from './CoopRescue'
import CoopSmartDistrict from './CoopSmartDistrict'
import CoopCityLaunch from './CoopCityLaunch'

interface CoopTaskProps {
  missionId: string
  role: 'drone_programmer' | 'robot_constructor' | 'entrepreneur'
  onComplete: (score: number, resultData: Record<string, unknown>) => void
  otherResults?: Record<string, unknown>[]
}

// Shared wrapper that loads the right mission component for the player's role
export default function CoopTask({ missionId, role, onComplete, otherResults }: CoopTaskProps) {
  const t = useTranslations()

  const missionMap: Record<string, React.FC<{
    role: string
    onComplete: (score: number, resultData: Record<string, unknown>) => void
    otherResults?: Record<string, unknown>[]
  }>> = {
    coop_solar_farm: CoopSolarFarm,
    coop_bridge: CoopBridge,
    coop_rescue: CoopRescue,
    coop_smart_district: CoopSmartDistrict,
    coop_city_launch: CoopCityLaunch,
  }

  const MissionComponent = missionMap[missionId]

  if (!MissionComponent) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">{t('coopMissions.unknownMission')}</p>
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-hidden">
      <MissionComponent
        role={role}
        onComplete={onComplete}
        otherResults={otherResults}
      />
    </div>
  )
}
