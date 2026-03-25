// GOLD STANDARD: Game Component Pattern
// Reference: src/components/game/DroneGame.tsx
//
// Every game component follows this structure:
// 1. 'use client' directive
// 2. Imports: React hooks, next-intl, clsx, scoring, missions, GameToast, types
// 3. Types section (props interface with difficulty: Difficulty)
// 4. Component with getMissionConfig() + scoring integration
// 5. All text via useTranslations() — zero hardcoded English

'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import clsx from 'clsx'
import { completeMission } from '@/lib/game/scoring'
import { getMissionConfig } from '@/lib/game/missions'
import { fireGameToast } from '@/components/game/GameToast'
import { Link } from '@/i18n/navigation'
import type { Difficulty, MissionResult } from '@/types/game'

interface ExampleGameProps {
  userId: string
  missionNumber: number
  difficulty: Difficulty       // REQUIRED — drives config lookup
  isCompleted: boolean
  onComplete?: (score: number) => void
}

export default function ExampleGame({ userId, missionNumber, difficulty, isCompleted }: ExampleGameProps) {
  const t = useTranslations()  // no namespace — access any key
  const mission = getMissionConfig('role_name', missionNumber, difficulty)
  const [startTime] = useState(Date.now)

  // ... game logic ...

  // SCORING: always wrap in try/catch, always include decision_time_avg
  const handleComplete = useCallback(async (score: number) => {
    const elapsed = (Date.now() - startTime) / 1000
    try {
      const result = await completeMission(userId, 'role_name', missionNumber, difficulty, score, {
        decision_time_avg: elapsed / stepCount,
        attempts: 1,
        style: 'analytical',                    // 'fast' | 'analytical' | 'balanced'
        precision_score: Math.round(score * 0.8),
        creativity_score: Math.max(0, score - 50),
        teamwork_score: 0,
      })
      fireGameToast({ xp: result.xpEarned, score, badge: result.newBadges[0] })
    } catch {
      fireGameToast({ xp: 0, score })
    }
  }, [userId, missionNumber, difficulty, startTime])

  // NAVIGATION: always use Link from @/i18n/navigation
  // return <Link href="/roles">...</Link>
}
