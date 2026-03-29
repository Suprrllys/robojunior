import type { Difficulty, RewardConfig } from '@/types/game'
import type { Role } from '@/types/database'

// Legacy reward values — kept for backwards compatibility
export const REWARDS_BY_DIFFICULTY: Record<Difficulty, RewardConfig> = {
  easy:   { xp: 100, currency: 10 },
  medium: { xp: 150, currency: 25 },
  hard:   { xp: 250, currency: 50 },
}

export function calculateRewards(difficulty: Difficulty, score: number): { xp: number; currency: number } {
  const base = REWARDS_BY_DIFFICULTY[difficulty]
  return {
    xp: base.xp,
    currency: Math.round(base.currency * score / 100),
  }
}

// ==============================
// V2 reward values (per spec: first successful completion only)
// ==============================

export const REWARDS_V2: Record<Difficulty, RewardConfig> = {
  easy:   { xp: 50,  currency: 20 },
  medium: { xp: 100, currency: 40 },
  hard:   { xp: 200, currency: 80 },
}

export function calculateRewardsV2(difficulty: Difficulty): { xp: number; currency: number } {
  return { ...REWARDS_V2[difficulty] }
}

// ==============================
// Block completion reward checks (avatar skin unlocks)
// ==============================

// Maps achievement conditions to the missions that need to be completed
const BLOCK_REWARDS: {
  achievementId: string
  role: Role
  missions: number[]
  skinId: string
}[] = [
  // Drone
  { achievementId: 'drone_easy_block', role: 'drone_programmer', missions: [1, 2, 3], skinId: 'drone_easy_skin' },
  { achievementId: 'drone_medium_block', role: 'drone_programmer', missions: [4, 5, 6], skinId: 'drone_medium_skin' },
  { achievementId: 'drone_hard_block', role: 'drone_programmer', missions: [7, 8, 9, 10], skinId: 'drone_hard_skin' },
  { achievementId: 'drone_all', role: 'drone_programmer', missions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], skinId: 'drone_all_skin' },
  // Robot
  { achievementId: 'robot_easy_block', role: 'robot_constructor', missions: [1, 2, 3], skinId: 'robot_easy_skin' },
  { achievementId: 'robot_medium_block', role: 'robot_constructor', missions: [4, 5, 6], skinId: 'robot_medium_skin' },
  { achievementId: 'robot_hard_block', role: 'robot_constructor', missions: [7, 8, 9, 10], skinId: 'robot_hard_skin' },
  { achievementId: 'robot_all', role: 'robot_constructor', missions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], skinId: 'robot_all_skin' },
  // Entrepreneur
  { achievementId: 'entrepreneur_easy_block', role: 'entrepreneur', missions: [1, 2, 3], skinId: 'entrepreneur_easy_skin' },
  { achievementId: 'entrepreneur_medium_block', role: 'entrepreneur', missions: [4, 5, 6], skinId: 'entrepreneur_medium_skin' },
  { achievementId: 'entrepreneur_hard_block', role: 'entrepreneur', missions: [7, 8, 9, 10], skinId: 'entrepreneur_hard_skin' },
  { achievementId: 'entrepreneur_all', role: 'entrepreneur', missions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], skinId: 'entrepreneur_all_skin' },
]

/**
 * Check if completing a mission unlocks any block rewards (skins).
 * Returns list of skin IDs that should be unlocked.
 *
 * @param role - The role the player is playing
 * @param completedMissions - Set of mission numbers the player has completed for this role
 */
export function checkBlockRewards(
  role: Role,
  completedMissions: Set<number>
): { achievementId: string; skinId: string }[] {
  const unlocked: { achievementId: string; skinId: string }[] = []

  for (const reward of BLOCK_REWARDS) {
    if (reward.role !== role) continue
    const allDone = reward.missions.every(m => completedMissions.has(m))
    if (allDone) {
      unlocked.push({ achievementId: reward.achievementId, skinId: reward.skinId })
    }
  }

  return unlocked
}

/**
 * Check if completing missions across all roles unlocks the BRICS Founder skin.
 */
export function checkBricsFounderReward(
  droneCompleted: Set<number>,
  robotCompleted: Set<number>,
  entrepreneurCompleted: Set<number>
): boolean {
  const allDrone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].every(m => droneCompleted.has(m))
  const allRobot = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].every(m => robotCompleted.has(m))
  const allEntrepreneur = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].every(m => entrepreneurCompleted.has(m))
  return allDrone && allRobot && allEntrepreneur
}
