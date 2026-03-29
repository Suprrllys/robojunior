'use client'

import { useTranslations } from 'next-intl'
import { COOP_MISSIONS } from './coopMissionData'
import clsx from 'clsx'

interface CoopMissionSelectorProps {
  onSelect: (missionId: string) => void
}

const DIFF_COLORS: Record<string, string> = {
  easy: 'text-green-400',
  medium: 'text-yellow-400',
  hard: 'text-red-400',
}

export default function CoopMissionSelector({ onSelect }: CoopMissionSelectorProps) {
  const t = useTranslations()
  const tGame = useTranslations('game')

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">{t('coopMissions.selectTitle')}</h2>
        <p className="text-gray-400 text-sm">{t('coopMissions.selectSubtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {COOP_MISSIONS.map((mission, idx) => (
          <button
            key={mission.id}
            onClick={() => onSelect(mission.id)}
            className={clsx(
              'text-left rounded-2xl border p-5 bg-gradient-to-br transition-all hover:scale-[1.02] hover:shadow-lg',
              mission.gradient,
              mission.border
            )}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{mission.icon}</span>
              <div>
                <p className="font-black text-white text-sm leading-tight">
                  {t(mission.titleKey)}
                </p>
                <p className={clsx('text-xs font-bold mt-0.5', DIFF_COLORS[mission.difficulty])}>
                  {tGame(`common.${mission.difficulty}`)}
                </p>
              </div>
            </div>
            <p className="text-gray-400 text-xs leading-snug mb-3">
              {t(mission.descKey)}
            </p>
            <div className="flex gap-2">
              <span className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-gray-300">
                {t('coopMissions.roles.drone')}
              </span>
              <span className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-gray-300">
                {t('coopMissions.roles.robot')}
              </span>
              <span className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-gray-300">
                {t('coopMissions.roles.entrepreneur')}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
