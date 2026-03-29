import type { Role } from '@/types/database'

// All avatar skins with their visual properties (used for rendering)
export interface SkinVisual {
  id: string
  nameKey: string
  role: Role | 'all'
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'secret'
  color: string
  animated: boolean
  icon: string // emoji used as icon inside the circle
  titleKey?: string // title awarded with this skin
}

export const SKIN_VISUALS: SkinVisual[] = [
  // Drone skins
  { id: 'drone_easy_skin', nameKey: 'skins_drone_easy', role: 'drone_programmer', rarity: 'common', color: '#3B82F6', animated: false, icon: '🛸' },
  { id: 'drone_medium_skin', nameKey: 'skins_drone_medium', role: 'drone_programmer', rarity: 'rare', color: '#2563EB', animated: true, icon: '🛸' },
  { id: 'drone_hard_skin', nameKey: 'skins_drone_hard', role: 'drone_programmer', rarity: 'epic', color: '#F59E0B', animated: false, icon: '🛸', titleKey: 'titles.master_pilot' },
  { id: 'drone_all_skin', nameKey: 'skins_drone_all', role: 'drone_programmer', rarity: 'legendary', color: '#F59E0B', animated: true, icon: '🛸' },

  // Robot skins
  { id: 'robot_easy_skin', nameKey: 'skins_robot_easy', role: 'robot_constructor', rarity: 'common', color: '#22C55E', animated: false, icon: '🤖' },
  { id: 'robot_medium_skin', nameKey: 'skins_robot_medium', role: 'robot_constructor', rarity: 'rare', color: '#16A34A', animated: true, icon: '🤖' },
  { id: 'robot_hard_skin', nameKey: 'skins_robot_hard', role: 'robot_constructor', rarity: 'epic', color: '#94A3B8', animated: false, icon: '🤖', titleKey: 'titles.chief_engineer' },
  { id: 'robot_all_skin', nameKey: 'skins_robot_all', role: 'robot_constructor', rarity: 'legendary', color: '#94A3B8', animated: true, icon: '🤖' },

  // Entrepreneur skins
  { id: 'entrepreneur_easy_skin', nameKey: 'skins_entrepreneur_easy', role: 'entrepreneur', rarity: 'common', color: '#F59E0B', animated: false, icon: '💡' },
  { id: 'entrepreneur_medium_skin', nameKey: 'skins_entrepreneur_medium', role: 'entrepreneur', rarity: 'rare', color: '#D97706', animated: true, icon: '💡' },
  { id: 'entrepreneur_hard_skin', nameKey: 'skins_entrepreneur_hard', role: 'entrepreneur', rarity: 'epic', color: '#A855F7', animated: false, icon: '💡', titleKey: 'titles.ceo' },
  { id: 'entrepreneur_all_skin', nameKey: 'skins_entrepreneur_all', role: 'entrepreneur', rarity: 'legendary', color: '#A855F7', animated: true, icon: '💡' },

  // Cross-role
  { id: 'brics_founder_skin', nameKey: 'skins_brics_founder', role: 'all', rarity: 'secret', color: 'rainbow', animated: true, icon: '🌍', titleKey: 'titles.brics_founder' },
]

export function getSkinVisual(skinId: string): SkinVisual | undefined {
  return SKIN_VISUALS.find(s => s.id === skinId)
}

// Skin prices by rarity (in coins)
export const RARITY_PRICES: Record<string, number> = {
  common: 50,
  rare: 100,
  epic: 200,
  legendary: 500,
  secret: 1000,
}

export function getSkinPrice(rarity: string): number {
  return RARITY_PRICES[rarity] ?? 100
}

// Rarity display colors
export const RARITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  common:    { bg: 'bg-gray-500/20', text: 'text-gray-300', border: 'border-gray-500/50' },
  rare:      { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/50' },
  epic:      { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/50' },
  legendary: { bg: 'bg-yellow-500/20', text: 'text-yellow-300', border: 'border-yellow-500/50' },
  secret:    { bg: 'bg-pink-500/20', text: 'text-pink-300', border: 'border-pink-500/50' },
}

// Achievement data for display (matches seed data in schema-update-v2.sql)
export interface AchievementDisplay {
  id: string
  nameKey: string
  descKey: string
  category: 'drone' | 'robot' | 'entrepreneur' | 'cross'
  rewardSkinId: string | null
  icon: string
}

export const ACHIEVEMENTS_DISPLAY: AchievementDisplay[] = [
  // Drone block achievements
  { id: 'drone_easy_block', nameKey: 'achievements_drone_easy_block_name', descKey: 'achievements_drone_easy_block_desc', category: 'drone', rewardSkinId: 'drone_easy_skin', icon: '🛸' },
  { id: 'drone_medium_block', nameKey: 'achievements_drone_medium_block_name', descKey: 'achievements_drone_medium_block_desc', category: 'drone', rewardSkinId: 'drone_medium_skin', icon: '🛸' },
  { id: 'drone_hard_block', nameKey: 'achievements_drone_hard_block_name', descKey: 'achievements_drone_hard_block_desc', category: 'drone', rewardSkinId: 'drone_hard_skin', icon: '🛸' },
  { id: 'drone_all', nameKey: 'achievements_drone_all_name', descKey: 'achievements_drone_all_desc', category: 'drone', rewardSkinId: 'drone_all_skin', icon: '🛸' },
  // Robot block achievements
  { id: 'robot_easy_block', nameKey: 'achievements_robot_easy_block_name', descKey: 'achievements_robot_easy_block_desc', category: 'robot', rewardSkinId: 'robot_easy_skin', icon: '🤖' },
  { id: 'robot_medium_block', nameKey: 'achievements_robot_medium_block_name', descKey: 'achievements_robot_medium_block_desc', category: 'robot', rewardSkinId: 'robot_medium_skin', icon: '🤖' },
  { id: 'robot_hard_block', nameKey: 'achievements_robot_hard_block_name', descKey: 'achievements_robot_hard_block_desc', category: 'robot', rewardSkinId: 'robot_hard_skin', icon: '🤖' },
  { id: 'robot_all', nameKey: 'achievements_robot_all_name', descKey: 'achievements_robot_all_desc', category: 'robot', rewardSkinId: 'robot_all_skin', icon: '🤖' },
  // Entrepreneur block achievements
  { id: 'entrepreneur_easy_block', nameKey: 'achievements_entrepreneur_easy_block_name', descKey: 'achievements_entrepreneur_easy_block_desc', category: 'entrepreneur', rewardSkinId: 'entrepreneur_easy_skin', icon: '💡' },
  { id: 'entrepreneur_medium_block', nameKey: 'achievements_entrepreneur_medium_block_name', descKey: 'achievements_entrepreneur_medium_block_desc', category: 'entrepreneur', rewardSkinId: 'entrepreneur_medium_skin', icon: '💡' },
  { id: 'entrepreneur_hard_block', nameKey: 'achievements_entrepreneur_hard_block_name', descKey: 'achievements_entrepreneur_hard_block_desc', category: 'entrepreneur', rewardSkinId: 'entrepreneur_hard_skin', icon: '💡' },
  { id: 'entrepreneur_all', nameKey: 'achievements_entrepreneur_all_name', descKey: 'achievements_entrepreneur_all_desc', category: 'entrepreneur', rewardSkinId: 'entrepreneur_all_skin', icon: '💡' },
  // Cross-role
  { id: 'brics_founder', nameKey: 'achievements_brics_founder_name', descKey: 'achievements_brics_founder_desc', category: 'cross', rewardSkinId: 'brics_founder_skin', icon: '🌍' },
]
