export type Difficulty = 'easy' | 'medium' | 'hard'

export interface RewardConfig {
  xp: number
  currency: number
}

// Legacy mission config — kept for backwards compatibility
export interface MissionConfig {
  role: 'drone_programmer' | 'robot_constructor' | 'entrepreneur'
  missionNumber: number
  difficulty: Difficulty
  titleKey: string         // i18n key, e.g. 'game.drone.m1_title'
  descKey: string          // i18n key, e.g. 'game.drone.m1_easy_desc'
  timeEstimate: string
  maxBlocks?: number       // drone only
  gridSize?: number        // drone only
  budget?: number          // robot only
  reqStrength?: number     // robot only
  reqPrecision?: number    // robot only
  reqSpeed?: number        // robot only
  sceneCount?: number      // entrepreneur only
}

// V2 mission config with full scoring, hints, skills, etc.
export interface MissionV2Config {
  role: 'drone_programmer' | 'robot_constructor' | 'entrepreneur'
  missionNumber: number
  // difficulty derived from mission number: 1-3=easy, 4-6=medium, 7-10=hard
  difficulty: Difficulty
  titleKey: string
  descKey: string
  timeEstimate: string

  // Hints (role-specific: drone has 3 levels, robot/entrepreneur have 2)
  hints: string[]

  // Skills practiced in this mission
  skills: string[]

  // Success criteria description
  successCriteria: string

  // Scoring config
  scoring: MissionScoringConfig

  // Drone-specific
  maxBlocks?: number
  gridSize?: number
  optimalBlocks?: number

  // Robot-specific
  budget?: number
  weightLimit?: number
  reqStrength?: number
  reqPrecision?: number
  reqSpeed?: number

  // Entrepreneur-specific
  sceneCount?: number
  npcCount?: number
}

export interface MissionScoringConfig {
  maxScore: number
  components: ScoringComponent[]
}

export interface ScoringComponent {
  key: string          // e.g. 'correctness', 'efficiency', 'speed', 'style'
  labelKey: string     // i18n key for display
  maxPoints: number
  weight: number       // 0-1, sum of all weights should equal 1
}

export interface ScoreBreakdown {
  label: string
  value: number
  max: number
}

export interface MissionResult {
  xpEarned: number
  currencyEarned: number
  isFirstCompletion: boolean
  isNewBestScore: boolean
  newBadges: string[]
  totalXp: number
  totalCurrency: number
}

export interface MissionResultV2 extends MissionResult {
  score: number
  stars: number
  scoreBreakdown: ScoreBreakdown[]
  nearMissPoints: number | null
  nearMissStarLevel: number | null
  unlockedSkins: string[]
}

export interface ShopItem {
  id: string
  key: string
  name_en: string
  name_ru: string
  name_ar: string
  description_en: string
  category: 'accessory' | 'skin' | 'effect'
  price: number
  rarity: 'common' | 'rare' | 'epic'
  asset_key: string
  is_active: boolean
}

export interface InventoryItem {
  id: string
  user_id: string
  item_id: string
  purchased_at: string
  equipped: boolean
  item?: ShopItem
}

// Block editor types for drone missions
export type BlockType = 'takeoff' | 'forward' | 'turnLeft' | 'turnRight' | 'land' | 'repeat'

export interface ProgramBlock {
  id: string
  type: BlockType
  value?: number         // for forward(N) and repeat(N)
  children?: ProgramBlock[]  // for repeat — nested blocks
}
