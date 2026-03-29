import type { Role } from '@/types/database'
import type { AvatarConfig } from '@/lib/game/shop-items'
import { DEFAULT_AVATAR } from '@/lib/game/shop-items'

/**
 * Parse an avatar_accessory string from the database into an AvatarConfig.
 * Falls back to DEFAULT_AVATAR on any error.
 */
export function parseAvatarConfig(raw: string | null | undefined): AvatarConfig {
  if (!raw) return DEFAULT_AVATAR
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'object' && parsed !== null && parsed.headStyle) {
      return { ...DEFAULT_AVATAR, ...parsed }
    }
  } catch {
    // Not valid JSON (could be legacy "none" value)
  }
  return DEFAULT_AVATAR
}

/**
 * Compute which achievement skins are unlocked based on mission progress.
 * Shared between profile page and achievements page.
 */
export function computeUnlockedSkins(
  progress: { role: string; mission_number: number; status: string }[] | null,
): string[] {
  if (!progress) return []

  const completed = progress.filter(p => p.status === 'completed')
  const unlocked: string[] = []

  function countByRoleAndDifficulty(role: Role, difficulty: 'easy' | 'medium' | 'hard'): number {
    const range = difficulty === 'easy' ? [1, 3] : difficulty === 'medium' ? [4, 6] : [7, 10]
    return completed.filter(
      p => p.role === role && p.mission_number >= range[0] && p.mission_number <= range[1],
    ).length
  }

  function countByRole(role: Role): number {
    return completed.filter(p => p.role === role).length
  }

  const roles: { role: Role; prefix: string }[] = [
    { role: 'drone_programmer', prefix: 'drone' },
    { role: 'robot_constructor', prefix: 'robot' },
    { role: 'entrepreneur', prefix: 'entrepreneur' },
  ]

  for (const { role, prefix } of roles) {
    if (countByRoleAndDifficulty(role, 'easy') >= 3) unlocked.push(`${prefix}_easy_skin`)
    if (countByRoleAndDifficulty(role, 'medium') >= 3) unlocked.push(`${prefix}_medium_skin`)
    if (countByRoleAndDifficulty(role, 'hard') >= 4) unlocked.push(`${prefix}_hard_skin`)
    if (countByRole(role) >= 10) unlocked.push(`${prefix}_all_skin`)
  }

  const uniqueMissions = new Set(completed.map(p => `${p.role}:${p.mission_number}`))
  if (uniqueMissions.size >= 30) unlocked.push('brics_founder_skin')

  return unlocked
}

/**
 * Achievement definitions — purely recognition milestones.
 * No rewards, no item unlocks, no XP bonuses.
 */
export interface AchievementDef {
  id: string
  emoji: string
  name: string
  desc: string
  nameKey: string
  descKey: string
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: 'drone_easy_skin', emoji: '\u{1F6F8}', name: 'Pilot Cadet', desc: 'Complete all 3 Easy drone missions', nameKey: 'achievements_drone_easy_block_name', descKey: 'achievements_drone_easy_block_desc' },
  { id: 'drone_medium_skin', emoji: '\u{1F6F8}', name: 'Sky Navigator', desc: 'Complete all 3 Medium drone missions', nameKey: 'achievements_drone_medium_block_name', descKey: 'achievements_drone_medium_block_desc' },
  { id: 'drone_hard_skin', emoji: '\u{1F6F8}', name: 'Ace Pilot', desc: 'Complete all 4 Hard drone missions', nameKey: 'achievements_drone_hard_block_name', descKey: 'achievements_drone_hard_block_desc' },
  { id: 'drone_all_skin', emoji: '\u{1F6F8}', name: 'Drone Master', desc: 'Complete all 10 drone missions', nameKey: 'achievements_drone_all_name', descKey: 'achievements_drone_all_desc' },
  { id: 'robot_easy_skin', emoji: '\u2699\uFE0F', name: 'Junior Engineer', desc: 'Complete all 3 Easy robot missions', nameKey: 'achievements_robot_easy_block_name', descKey: 'achievements_robot_easy_block_desc' },
  { id: 'robot_medium_skin', emoji: '\u2699\uFE0F', name: 'Robot Builder', desc: 'Complete all 3 Medium robot missions', nameKey: 'achievements_robot_medium_block_name', descKey: 'achievements_robot_medium_block_desc' },
  { id: 'robot_hard_skin', emoji: '\u2699\uFE0F', name: 'Mech Specialist', desc: 'Complete all 4 Hard robot missions', nameKey: 'achievements_robot_hard_block_name', descKey: 'achievements_robot_hard_block_desc' },
  { id: 'robot_all_skin', emoji: '\u2699\uFE0F', name: 'Robot Master', desc: 'Complete all 10 robot missions', nameKey: 'achievements_robot_all_name', descKey: 'achievements_robot_all_desc' },
  { id: 'entrepreneur_easy_skin', emoji: '\u{1F4BC}', name: 'Startup Intern', desc: 'Complete all 3 Easy entrepreneur missions', nameKey: 'achievements_entrepreneur_easy_block_name', descKey: 'achievements_entrepreneur_easy_block_desc' },
  { id: 'entrepreneur_medium_skin', emoji: '\u{1F4BC}', name: 'Business Strategist', desc: 'Complete all 3 Medium entrepreneur missions', nameKey: 'achievements_entrepreneur_medium_block_name', descKey: 'achievements_entrepreneur_medium_block_desc' },
  { id: 'entrepreneur_hard_skin', emoji: '\u{1F4BC}', name: 'Market Leader', desc: 'Complete all 4 Hard entrepreneur missions', nameKey: 'achievements_entrepreneur_hard_block_name', descKey: 'achievements_entrepreneur_hard_block_desc' },
  { id: 'entrepreneur_all_skin', emoji: '\u{1F4BC}', name: 'Entrepreneur Master', desc: 'Complete all 10 entrepreneur missions', nameKey: 'achievements_entrepreneur_all_name', descKey: 'achievements_entrepreneur_all_desc' },
  { id: 'brics_founder_skin', emoji: '\u{1F30D}', name: 'BRICS City Founder', desc: 'Complete all 30 missions across all roles', nameKey: 'achievements_brics_founder_name', descKey: 'achievements_brics_founder_desc' },
  // Coop achievements
  { id: 'coop_team_player_skin', emoji: '\u{1F91D}', name: 'Team Player', desc: 'Complete your first co-op mission', nameKey: 'achievements_coop_team_player_name', descKey: 'achievements_coop_team_player_desc' },
  { id: 'coop_dream_team_skin', emoji: '\u{1F31F}', name: 'Dream Team', desc: 'Complete 5 different co-op missions', nameKey: 'achievements_coop_dream_team_name', descKey: 'achievements_coop_dream_team_desc' },
  { id: 'coop_brics_united_skin', emoji: '\u{1F30D}', name: 'BRICS United', desc: 'Play with a partner from another country', nameKey: 'achievements_coop_brics_united_name', descKey: 'achievements_coop_brics_united_desc' },
  { id: 'coop_perfect_sync_skin', emoji: '\u26A1', name: 'Perfect Sync', desc: 'All players score 800+ in one session', nameKey: 'achievements_coop_perfect_sync_name', descKey: 'achievements_coop_perfect_sync_desc' },
  { id: 'coop_all_missions_skin', emoji: '\u{1F3C6}', name: 'Co-op Master', desc: 'Complete all 5 unique co-op missions', nameKey: 'achievements_coop_all_missions_name', descKey: 'achievements_coop_all_missions_desc' },
]
