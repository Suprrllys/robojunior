'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import clsx from 'clsx'
import type { Difficulty } from '@/types/game'

interface DifficultyProgress {
  easy?: { completed: boolean; score?: number }
  medium?: { completed: boolean; score?: number }
  hard?: { completed: boolean; score?: number }
}

interface DifficultySelectorProps {
  current: Difficulty
  missionNumber: number
  basePath: string
  progress: DifficultyProgress
  timeEstimates: Record<Difficulty, string>
  rewards: Record<Difficulty, { xp: number; coins: number }>
}

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

const PILL_STYLES: Record<Difficulty, { active: string; inactive: string }> = {
  easy: {
    active: 'bg-green-900/40 text-green-400 border-green-500/40 shadow-green-500/10',
    inactive: 'text-gray-400 border-[var(--brand-border)] hover:border-green-500/30 hover:text-green-400',
  },
  medium: {
    active: 'bg-yellow-900/40 text-yellow-400 border-yellow-500/40 shadow-yellow-500/10',
    inactive: 'text-gray-400 border-[var(--brand-border)] hover:border-yellow-500/30 hover:text-yellow-400',
  },
  hard: {
    active: 'bg-red-900/40 text-red-400 border-red-500/40 shadow-red-500/10',
    inactive: 'text-gray-400 border-[var(--brand-border)] hover:border-red-500/30 hover:text-red-400',
  },
}

export default function DifficultySelector({
  current,
  missionNumber,
  basePath,
  progress,
  timeEstimates,
  rewards,
}: DifficultySelectorProps) {
  const t = useTranslations()
  const router = useRouter()

  return (
    <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl p-4">
      <p className="text-xs font-bold text-gray-500 uppercase mb-3">
        {t('game.common.difficulty')}
      </p>
      <div className="grid grid-cols-3 gap-3">
        {DIFFICULTIES.map(d => {
          const isActive = d === current
          const dp = progress[d]
          const reward = rewards[d]
          const time = timeEstimates[d]
          const styles = PILL_STYLES[d]

          return (
            <button
              key={d}
              onClick={() => router.push(`${basePath}?mission=${missionNumber}&difficulty=${d}` as '/missions/drone')}
              className={clsx(
                'relative rounded-xl border p-3 transition-all text-center',
                isActive ? styles.active + ' shadow-lg' : styles.inactive + ' bg-[var(--brand-dark)]',
              )}
            >
              {/* Completion indicator */}
              {dp?.completed && (
                <span className="absolute top-2 right-2 text-green-400 text-xs font-bold">
                  &#x2713;
                </span>
              )}

              <span className="block text-sm font-black uppercase">
                {t(`game.common.${d}`)}
              </span>

              <span className="block text-[10px] text-gray-500 mt-1">
                ~{time} {t('game.common.minutes')}
              </span>

              <div className="mt-2 space-y-0.5">
                <span className="block text-[10px] text-gray-400">
                  +{reward.xp} XP
                </span>
                <span className="block text-[10px] text-[var(--brand-gold)]">
                  +{reward.coins} {t('game.common.coins')}
                </span>
              </div>

              {dp?.completed && dp.score !== undefined && (
                <span className="block text-[10px] text-green-400 mt-1 font-bold">
                  {dp.score} {t('game.common.pts')}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
