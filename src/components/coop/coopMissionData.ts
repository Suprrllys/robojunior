// Coop mission definitions — 5 missions, each with 3 role-specific tasks

export interface CoopMissionDef {
  id: string
  titleKey: string
  descKey: string
  difficulty: 'easy' | 'medium' | 'hard'
  icon: string
  roles: ('drone_programmer' | 'robot_constructor' | 'entrepreneur')[]
  gradient: string
  border: string
}

export const COOP_MISSIONS: CoopMissionDef[] = [
  {
    id: 'coop_solar_farm',
    titleKey: 'coopMissions.solarFarm.title',
    descKey: 'coopMissions.solarFarm.desc',
    difficulty: 'easy',
    icon: '☀️',
    roles: ['drone_programmer', 'robot_constructor', 'entrepreneur'],
    gradient: 'from-yellow-900/30 to-orange-900/20',
    border: 'border-yellow-500/20',
  },
  {
    id: 'coop_bridge',
    titleKey: 'coopMissions.bridge.title',
    descKey: 'coopMissions.bridge.desc',
    difficulty: 'medium',
    icon: '🌉',
    roles: ['drone_programmer', 'robot_constructor', 'entrepreneur'],
    gradient: 'from-blue-900/30 to-slate-900/20',
    border: 'border-blue-500/20',
  },
  {
    id: 'coop_rescue',
    titleKey: 'coopMissions.rescue.title',
    descKey: 'coopMissions.rescue.desc',
    difficulty: 'medium',
    icon: '🚁',
    roles: ['drone_programmer', 'robot_constructor', 'entrepreneur'],
    gradient: 'from-red-900/30 to-orange-900/20',
    border: 'border-red-500/20',
  },
  {
    id: 'coop_smart_district',
    titleKey: 'coopMissions.smartDistrict.title',
    descKey: 'coopMissions.smartDistrict.desc',
    difficulty: 'hard',
    icon: '🏘️',
    roles: ['drone_programmer', 'robot_constructor', 'entrepreneur'],
    gradient: 'from-purple-900/30 to-indigo-900/20',
    border: 'border-purple-500/20',
  },
  {
    id: 'coop_city_launch',
    titleKey: 'coopMissions.cityLaunch.title',
    descKey: 'coopMissions.cityLaunch.desc',
    difficulty: 'hard',
    icon: '🚀',
    roles: ['drone_programmer', 'robot_constructor', 'entrepreneur'],
    gradient: 'from-emerald-900/30 to-teal-900/20',
    border: 'border-emerald-500/20',
  },
]

export function getCoopMission(id: string): CoopMissionDef | undefined {
  return COOP_MISSIONS.find(m => m.id === id)
}
