// GOLD STANDARD: Mission Page Pattern
// Reference: src/app/[locale]/(game)/missions/drone/page.tsx
//
// Mission pages are async server components that:
// 1. Parse difficulty from searchParams (default: 'medium')
// 2. Query all difficulties for progress
// 3. Use DifficultySelector shared component
// 4. Pass difficulty to game component

import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import DifficultySelector from '@/components/game/DifficultySelector'
import { getMissionConfig } from '@/lib/game/missions'
import { REWARDS_BY_DIFFICULTY } from '@/lib/game/rewards'
import type { Difficulty } from '@/types/game'

const VALID_DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

// Difficulty parsing — validate against enum, default 'medium'
const difficulty: Difficulty = VALID_DIFFICULTIES.includes(
  searchParams.difficulty as Difficulty
) ? (searchParams.difficulty as Difficulty) : 'medium'

// Progress query — fetch ALL difficulties, filter in code
const { data: progress } = await supabase
  .from('mission_progress')
  .select('mission_number, status, score, difficulty')
  .eq('user_id', user!.id)
  .eq('role', 'role_name')

// Unlock logic — any difficulty counts
const m1AnyDifficulty = progress?.some(
  p => p.mission_number === 1 && p.status === 'completed'
)

// Completion check — must filter by current difficulty
const currentProgress = progress?.find(
  p => p.mission_number === safeMission && p.difficulty === difficulty
)

// KEY RULES:
// 1. Default difficulty is 'medium' (not 'easy')
// 2. Unlock uses any-difficulty completion
// 3. Completion status filters by current difficulty
// 4. DifficultySelector receives per-difficulty progress, timeEstimates, rewards
// 5. All text via getTranslations() (server) or useTranslations() (client)
