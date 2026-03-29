import type { Difficulty, MissionConfig, MissionV2Config } from '@/types/game'
import type { Role } from '@/types/database'

// ==============================
// Legacy mission registry — kept for backwards compatibility
// ==============================

export const MISSION_REGISTRY: MissionConfig[] = [
  // Drone Easy
  { role: 'drone_programmer', missionNumber: 1, difficulty: 'easy', titleKey: 'drone.m1_title', descKey: 'drone.m1_easy_desc', timeEstimate: '10', gridSize: 5, maxBlocks: 12 },
  { role: 'drone_programmer', missionNumber: 2, difficulty: 'easy', titleKey: 'drone.m2_title', descKey: 'drone.m2_easy_desc', timeEstimate: '12', gridSize: 5, maxBlocks: 12 },
  // Drone Medium
  { role: 'drone_programmer', missionNumber: 1, difficulty: 'medium', titleKey: 'drone.m1_title', descKey: 'drone.m1_med_desc', timeEstimate: '15', gridSize: 6, maxBlocks: 14 },
  { role: 'drone_programmer', missionNumber: 2, difficulty: 'medium', titleKey: 'drone.m2_title', descKey: 'drone.m2_med_desc', timeEstimate: '18', gridSize: 6, maxBlocks: 14 },
  // Drone Hard
  { role: 'drone_programmer', missionNumber: 1, difficulty: 'hard', titleKey: 'drone.m1_title', descKey: 'drone.m1_hard_desc', timeEstimate: '25', gridSize: 7, maxBlocks: 16 },
  { role: 'drone_programmer', missionNumber: 2, difficulty: 'hard', titleKey: 'drone.m2_title', descKey: 'drone.m2_hard_desc', timeEstimate: '30', gridSize: 7, maxBlocks: 16 },
  // Robot Easy
  { role: 'robot_constructor', missionNumber: 1, difficulty: 'easy', titleKey: 'robot.m1_title', descKey: 'robot.m1_easy_desc', timeEstimate: '10', budget: 80, reqStrength: 3, reqPrecision: 2, reqSpeed: 1 },
  { role: 'robot_constructor', missionNumber: 2, difficulty: 'easy', titleKey: 'robot.m2_title', descKey: 'robot.m2_easy_desc', timeEstimate: '12', budget: 90, reqStrength: 2, reqPrecision: 3, reqSpeed: 2 },
  // Robot Medium
  { role: 'robot_constructor', missionNumber: 1, difficulty: 'medium', titleKey: 'robot.m1_title', descKey: 'robot.m1_med_desc', timeEstimate: '15', budget: 100, reqStrength: 5, reqPrecision: 3, reqSpeed: 2 },
  { role: 'robot_constructor', missionNumber: 2, difficulty: 'medium', titleKey: 'robot.m2_title', descKey: 'robot.m2_med_desc', timeEstimate: '18', budget: 120, reqStrength: 3, reqPrecision: 7, reqSpeed: 4 },
  // Robot Hard
  { role: 'robot_constructor', missionNumber: 1, difficulty: 'hard', titleKey: 'robot.m1_title', descKey: 'robot.m1_hard_desc', timeEstimate: '25', budget: 140, reqStrength: 8, reqPrecision: 6, reqSpeed: 5 },
  { role: 'robot_constructor', missionNumber: 2, difficulty: 'hard', titleKey: 'robot.m2_title', descKey: 'robot.m2_hard_desc', timeEstimate: '30', budget: 160, reqStrength: 5, reqPrecision: 9, reqSpeed: 7 },
  // Entrepreneur Easy
  { role: 'entrepreneur', missionNumber: 1, difficulty: 'easy', titleKey: 'entrepreneur.m1_title', descKey: 'entrepreneur.m1_easy_desc', timeEstimate: '10', sceneCount: 2 },
  { role: 'entrepreneur', missionNumber: 2, difficulty: 'easy', titleKey: 'entrepreneur.m2_title', descKey: 'entrepreneur.m2_easy_desc', timeEstimate: '12', sceneCount: 2 },
  // Entrepreneur Medium
  { role: 'entrepreneur', missionNumber: 1, difficulty: 'medium', titleKey: 'entrepreneur.m1_title', descKey: 'entrepreneur.m1_med_desc', timeEstimate: '15', sceneCount: 3 },
  { role: 'entrepreneur', missionNumber: 2, difficulty: 'medium', titleKey: 'entrepreneur.m2_title', descKey: 'entrepreneur.m2_med_desc', timeEstimate: '18', sceneCount: 3 },
  // Entrepreneur Hard
  { role: 'entrepreneur', missionNumber: 1, difficulty: 'hard', titleKey: 'entrepreneur.m1_title', descKey: 'entrepreneur.m1_hard_desc', timeEstimate: '25', sceneCount: 4 },
  { role: 'entrepreneur', missionNumber: 2, difficulty: 'hard', titleKey: 'entrepreneur.m2_title', descKey: 'entrepreneur.m2_hard_desc', timeEstimate: '30', sceneCount: 4 },
]

export function getMissionConfig(role: Role, missionNumber: number, difficulty: Difficulty): MissionConfig | undefined {
  return MISSION_REGISTRY.find(m => m.role === role && m.missionNumber === missionNumber && m.difficulty === difficulty)
}

// ==============================
// V2 Mission Registry — 30 missions (10 per role)
// Difficulty derived from mission number: 1-3=easy, 4-6=medium, 7-10=hard
// ==============================

function difficultyFromNumber(n: number): Difficulty {
  if (n <= 3) return 'easy'
  if (n <= 6) return 'medium'
  return 'hard'
}

// Drone scoring template
function droneScoringConfig() {
  return {
    maxScore: 1000,
    components: [
      { key: 'correctness', labelKey: 'scoring.correctness', maxPoints: 400, weight: 0.4 },
      { key: 'efficiency', labelKey: 'scoring.efficiency', maxPoints: 300, weight: 0.3 },
      { key: 'speed', labelKey: 'scoring.speed', maxPoints: 200, weight: 0.2 },
      { key: 'style', labelKey: 'scoring.style', maxPoints: 100, weight: 0.1 },
    ],
  }
}

// Robot scoring template
function robotScoringConfig() {
  return {
    maxScore: 1000,
    components: [
      { key: 'design', labelKey: 'scoring.design', maxPoints: 350, weight: 0.35 },
      { key: 'physics', labelKey: 'scoring.physics', maxPoints: 300, weight: 0.3 },
      { key: 'budget', labelKey: 'scoring.budget', maxPoints: 200, weight: 0.2 },
      { key: 'testing', labelKey: 'scoring.testing', maxPoints: 150, weight: 0.15 },
    ],
  }
}

// Entrepreneur scoring template
function entrepreneurScoringConfig() {
  return {
    maxScore: 1000,
    components: [
      { key: 'decisions', labelKey: 'scoring.decisions', maxPoints: 350, weight: 0.35 },
      { key: 'financials', labelKey: 'scoring.financials', maxPoints: 300, weight: 0.3 },
      { key: 'team', labelKey: 'scoring.team', maxPoints: 200, weight: 0.2 },
      { key: 'timing', labelKey: 'scoring.timing', maxPoints: 150, weight: 0.15 },
    ],
  }
}

export const NEW_MISSION_REGISTRY: MissionV2Config[] = [
  // ==============================
  // DRONE PROGRAMMER — 10 missions
  // ==============================
  {
    role: 'drone_programmer', missionNumber: 1, difficulty: 'easy',
    titleKey: 'missions.drone.m1.title', descKey: 'missions.drone.m1.description',
    timeEstimate: '10', gridSize: 5, maxBlocks: 8, optimalBlocks: 5,
    hints: ['missions.drone.m1.hint1', 'missions.drone.m1.hint2', 'missions.drone.m1.hint3'],
    skills: ['skills.sequential_commands'],
    successCriteria: 'Drone reaches target cell',
    scoring: droneScoringConfig(),
  },
  {
    role: 'drone_programmer', missionNumber: 2, difficulty: 'easy',
    titleKey: 'missions.drone.m2.title', descKey: 'missions.drone.m2.description',
    timeEstimate: '12', gridSize: 6, maxBlocks: 14, optimalBlocks: 8,
    hints: ['missions.drone.m2.hint1', 'missions.drone.m2.hint2', 'missions.drone.m2.hint3'],
    skills: ['skills.loops'],
    successCriteria: 'All 5 photo points visited',
    scoring: droneScoringConfig(),
  },
  {
    role: 'drone_programmer', missionNumber: 3, difficulty: 'easy',
    titleKey: 'missions.drone.m3.title', descKey: 'missions.drone.m3.description',
    timeEstimate: '12', gridSize: 5, maxBlocks: 12, optimalBlocks: 7,
    hints: ['missions.drone.m3.hint1', 'missions.drone.m3.hint2', 'missions.drone.m3.hint3'],
    skills: ['skills.sequential_commands', 'skills.loops'],
    successCriteria: 'Package delivered to target',
    scoring: droneScoringConfig(),
  },
  {
    role: 'drone_programmer', missionNumber: 4, difficulty: 'medium',
    titleKey: 'missions.drone.m4.title', descKey: 'missions.drone.m4.description',
    timeEstimate: '15', gridSize: 6, maxBlocks: 16, optimalBlocks: 10,
    hints: ['missions.drone.m4.hint1', 'missions.drone.m4.hint2', 'missions.drone.m4.hint3'],
    skills: ['skills.conditionals', 'skills.loops'],
    successCriteria: 'Navigate around obstacles to target',
    scoring: droneScoringConfig(),
  },
  {
    role: 'drone_programmer', missionNumber: 5, difficulty: 'medium',
    titleKey: 'missions.drone.m5.title', descKey: 'missions.drone.m5.description',
    timeEstimate: '18', gridSize: 7, maxBlocks: 18, optimalBlocks: 12,
    hints: ['missions.drone.m5.hint1', 'missions.drone.m5.hint2', 'missions.drone.m5.hint3'],
    skills: ['skills.conditionals', 'skills.variables'],
    successCriteria: 'Deliver 3 packages in order',
    scoring: droneScoringConfig(),
  },
  {
    role: 'drone_programmer', missionNumber: 6, difficulty: 'medium',
    titleKey: 'missions.drone.m6.title', descKey: 'missions.drone.m6.description',
    timeEstimate: '20', gridSize: 7, maxBlocks: 20, optimalBlocks: 14,
    hints: ['missions.drone.m6.hint1', 'missions.drone.m6.hint2', 'missions.drone.m6.hint3'],
    skills: ['skills.functions', 'skills.loops'],
    successCriteria: 'Map entire area with efficient path',
    scoring: droneScoringConfig(),
  },
  {
    role: 'drone_programmer', missionNumber: 7, difficulty: 'hard',
    titleKey: 'missions.drone.m7.title', descKey: 'missions.drone.m7.description',
    timeEstimate: '25', gridSize: 8, maxBlocks: 24, optimalBlocks: 16,
    hints: ['missions.drone.m7.hint1', 'missions.drone.m7.hint2', 'missions.drone.m7.hint3'],
    skills: ['skills.algorithms', 'skills.optimization'],
    successCriteria: 'Find and rescue survivor in maze',
    scoring: droneScoringConfig(),
  },
  {
    role: 'drone_programmer', missionNumber: 8, difficulty: 'hard',
    titleKey: 'missions.drone.m8.title', descKey: 'missions.drone.m8.description',
    timeEstimate: '25', gridSize: 8, maxBlocks: 26, optimalBlocks: 18,
    hints: ['missions.drone.m8.hint1', 'missions.drone.m8.hint2', 'missions.drone.m8.hint3'],
    skills: ['skills.algorithms', 'skills.data_structures'],
    successCriteria: 'Deliver packages with battery management',
    scoring: droneScoringConfig(),
  },
  {
    role: 'drone_programmer', missionNumber: 9, difficulty: 'hard',
    titleKey: 'missions.drone.m9.title', descKey: 'missions.drone.m9.description',
    timeEstimate: '30', gridSize: 9, maxBlocks: 30, optimalBlocks: 20,
    hints: ['missions.drone.m9.hint1', 'missions.drone.m9.hint2', 'missions.drone.m9.hint3'],
    skills: ['skills.algorithms', 'skills.coordination'],
    successCriteria: 'Coordinate 3-drone swarm to cover area',
    scoring: droneScoringConfig(),
  },
  {
    role: 'drone_programmer', missionNumber: 10, difficulty: 'hard',
    titleKey: 'missions.drone.m10.title', descKey: 'missions.drone.m10.description',
    timeEstimate: '35', gridSize: 10, maxBlocks: 35, optimalBlocks: 22,
    hints: ['missions.drone.m10.hint1', 'missions.drone.m10.hint2', 'missions.drone.m10.hint3'],
    skills: ['skills.system_design', 'skills.optimization'],
    successCriteria: 'Design full city drone delivery system',
    scoring: droneScoringConfig(),
  },

  // ==============================
  // ROBOT CONSTRUCTOR — 10 missions
  // ==============================
  {
    role: 'robot_constructor', missionNumber: 1, difficulty: 'easy',
    titleKey: 'missions.robot.m1.title', descKey: 'missions.robot.m1.description',
    timeEstimate: '10', budget: 80, weightLimit: 50, reqStrength: 5, reqPrecision: 2, reqSpeed: 1,
    hints: ['missions.robot.m1.hint1', 'missions.robot.m1.hint2'],
    skills: ['skills.mechanical_design'],
    successCriteria: 'Robot lifts 10kg box',
    scoring: robotScoringConfig(),
  },
  {
    role: 'robot_constructor', missionNumber: 2, difficulty: 'easy',
    titleKey: 'missions.robot.m2.title', descKey: 'missions.robot.m2.description',
    timeEstimate: '12', budget: 90, weightLimit: 55, reqStrength: 3, reqPrecision: 4, reqSpeed: 2,
    hints: ['missions.robot.m2.hint1', 'missions.robot.m2.hint2'],
    skills: ['skills.sensor_integration'],
    successCriteria: 'Robot navigates to target zone',
    scoring: robotScoringConfig(),
  },
  {
    role: 'robot_constructor', missionNumber: 3, difficulty: 'easy',
    titleKey: 'missions.robot.m3.title', descKey: 'missions.robot.m3.description',
    timeEstimate: '12', budget: 85, weightLimit: 50, reqStrength: 4, reqPrecision: 3, reqSpeed: 3,
    hints: ['missions.robot.m3.hint1', 'missions.robot.m3.hint2'],
    skills: ['skills.mechanical_design', 'skills.budgeting'],
    successCriteria: 'Robot sorts items by weight',
    scoring: robotScoringConfig(),
  },
  {
    role: 'robot_constructor', missionNumber: 4, difficulty: 'medium',
    titleKey: 'missions.robot.m4.title', descKey: 'missions.robot.m4.description',
    timeEstimate: '15', budget: 110, weightLimit: 60, reqStrength: 6, reqPrecision: 5, reqSpeed: 3,
    hints: ['missions.robot.m4.hint1', 'missions.robot.m4.hint2'],
    skills: ['skills.physics', 'skills.optimization'],
    successCriteria: 'Robot traverses rough terrain',
    scoring: robotScoringConfig(),
  },
  {
    role: 'robot_constructor', missionNumber: 5, difficulty: 'medium',
    titleKey: 'missions.robot.m5.title', descKey: 'missions.robot.m5.description',
    timeEstimate: '18', budget: 120, weightLimit: 65, reqStrength: 5, reqPrecision: 7, reqSpeed: 4,
    hints: ['missions.robot.m5.hint1', 'missions.robot.m5.hint2'],
    skills: ['skills.precision_engineering'],
    successCriteria: 'Robot assembles circuit board',
    scoring: robotScoringConfig(),
  },
  {
    role: 'robot_constructor', missionNumber: 6, difficulty: 'medium',
    titleKey: 'missions.robot.m6.title', descKey: 'missions.robot.m6.description',
    timeEstimate: '20', budget: 130, weightLimit: 70, reqStrength: 7, reqPrecision: 5, reqSpeed: 5,
    hints: ['missions.robot.m6.hint1', 'missions.robot.m6.hint2'],
    skills: ['skills.power_management', 'skills.physics'],
    successCriteria: 'Robot operates for full shift',
    scoring: robotScoringConfig(),
  },
  {
    role: 'robot_constructor', missionNumber: 7, difficulty: 'hard',
    titleKey: 'missions.robot.m7.title', descKey: 'missions.robot.m7.description',
    timeEstimate: '25', budget: 150, weightLimit: 75, reqStrength: 8, reqPrecision: 7, reqSpeed: 5,
    hints: ['missions.robot.m7.hint1', 'missions.robot.m7.hint2'],
    skills: ['skills.advanced_mechanics', 'skills.optimization'],
    successCriteria: 'Robot performs search and rescue',
    scoring: robotScoringConfig(),
  },
  {
    role: 'robot_constructor', missionNumber: 8, difficulty: 'hard',
    titleKey: 'missions.robot.m8.title', descKey: 'missions.robot.m8.description',
    timeEstimate: '25', budget: 160, weightLimit: 80, reqStrength: 7, reqPrecision: 8, reqSpeed: 6,
    hints: ['missions.robot.m8.hint1', 'missions.robot.m8.hint2'],
    skills: ['skills.advanced_mechanics', 'skills.sensor_integration'],
    successCriteria: 'Robot performs underwater repair',
    scoring: robotScoringConfig(),
  },
  {
    role: 'robot_constructor', missionNumber: 9, difficulty: 'hard',
    titleKey: 'missions.robot.m9.title', descKey: 'missions.robot.m9.description',
    timeEstimate: '30', budget: 170, weightLimit: 85, reqStrength: 9, reqPrecision: 8, reqSpeed: 7,
    hints: ['missions.robot.m9.hint1', 'missions.robot.m9.hint2'],
    skills: ['skills.system_integration', 'skills.optimization'],
    successCriteria: 'Multi-robot assembly line',
    scoring: robotScoringConfig(),
  },
  {
    role: 'robot_constructor', missionNumber: 10, difficulty: 'hard',
    titleKey: 'missions.robot.m10.title', descKey: 'missions.robot.m10.description',
    timeEstimate: '35', budget: 200, weightLimit: 100, reqStrength: 9, reqPrecision: 9, reqSpeed: 8,
    hints: ['missions.robot.m10.hint1', 'missions.robot.m10.hint2'],
    skills: ['skills.factory_design', 'skills.system_integration'],
    successCriteria: 'Design complete robot factory',
    scoring: robotScoringConfig(),
  },

  // ==============================
  // ENTREPRENEUR — 10 missions
  // ==============================
  {
    role: 'entrepreneur', missionNumber: 1, difficulty: 'easy',
    titleKey: 'missions.entrepreneur.m1.title', descKey: 'missions.entrepreneur.m1.description',
    timeEstimate: '10', sceneCount: 2, npcCount: 12,
    hints: ['missions.entrepreneur.m1.hint1', 'missions.entrepreneur.m1.hint2'],
    skills: ['skills.market_research'],
    successCriteria: 'Group problems and select viable idea',
    scoring: entrepreneurScoringConfig(),
  },
  {
    role: 'entrepreneur', missionNumber: 2, difficulty: 'easy',
    titleKey: 'missions.entrepreneur.m2.title', descKey: 'missions.entrepreneur.m2.description',
    timeEstimate: '12', sceneCount: 2, npcCount: 8,
    hints: ['missions.entrepreneur.m2.hint1', 'missions.entrepreneur.m2.hint2'],
    skills: ['skills.customer_discovery'],
    successCriteria: 'Validate idea with customer interviews',
    scoring: entrepreneurScoringConfig(),
  },
  {
    role: 'entrepreneur', missionNumber: 3, difficulty: 'easy',
    titleKey: 'missions.entrepreneur.m3.title', descKey: 'missions.entrepreneur.m3.description',
    timeEstimate: '12', sceneCount: 3, npcCount: 6,
    hints: ['missions.entrepreneur.m3.hint1', 'missions.entrepreneur.m3.hint2'],
    skills: ['skills.mvp_building', 'skills.budgeting'],
    successCriteria: 'Build MVP within budget',
    scoring: entrepreneurScoringConfig(),
  },
  {
    role: 'entrepreneur', missionNumber: 4, difficulty: 'medium',
    titleKey: 'missions.entrepreneur.m4.title', descKey: 'missions.entrepreneur.m4.description',
    timeEstimate: '15', sceneCount: 3, npcCount: 10,
    hints: ['missions.entrepreneur.m4.hint1', 'missions.entrepreneur.m4.hint2'],
    skills: ['skills.team_building', 'skills.hiring'],
    successCriteria: 'Build balanced team within budget',
    scoring: entrepreneurScoringConfig(),
  },
  {
    role: 'entrepreneur', missionNumber: 5, difficulty: 'medium',
    titleKey: 'missions.entrepreneur.m5.title', descKey: 'missions.entrepreneur.m5.description',
    timeEstimate: '18', sceneCount: 3, npcCount: 8,
    hints: ['missions.entrepreneur.m5.hint1', 'missions.entrepreneur.m5.hint2'],
    skills: ['skills.fundraising', 'skills.pitching'],
    successCriteria: 'Secure funding from investors',
    scoring: entrepreneurScoringConfig(),
  },
  {
    role: 'entrepreneur', missionNumber: 6, difficulty: 'medium',
    titleKey: 'missions.entrepreneur.m6.title', descKey: 'missions.entrepreneur.m6.description',
    timeEstimate: '20', sceneCount: 4, npcCount: 10,
    hints: ['missions.entrepreneur.m6.hint1', 'missions.entrepreneur.m6.hint2'],
    skills: ['skills.growth_strategy', 'skills.marketing'],
    successCriteria: 'Reach 1000 users milestone',
    scoring: entrepreneurScoringConfig(),
  },
  {
    role: 'entrepreneur', missionNumber: 7, difficulty: 'hard',
    titleKey: 'missions.entrepreneur.m7.title', descKey: 'missions.entrepreneur.m7.description',
    timeEstimate: '25', sceneCount: 4, npcCount: 12,
    hints: ['missions.entrepreneur.m7.hint1', 'missions.entrepreneur.m7.hint2'],
    skills: ['skills.crisis_management', 'skills.pivoting'],
    successCriteria: 'Survive market crisis and pivot',
    scoring: entrepreneurScoringConfig(),
  },
  {
    role: 'entrepreneur', missionNumber: 8, difficulty: 'hard',
    titleKey: 'missions.entrepreneur.m8.title', descKey: 'missions.entrepreneur.m8.description',
    timeEstimate: '25', sceneCount: 4, npcCount: 14,
    hints: ['missions.entrepreneur.m8.hint1', 'missions.entrepreneur.m8.hint2'],
    skills: ['skills.international_expansion', 'skills.localization'],
    successCriteria: 'Expand to BRICS+ market successfully',
    scoring: entrepreneurScoringConfig(),
  },
  {
    role: 'entrepreneur', missionNumber: 9, difficulty: 'hard',
    titleKey: 'missions.entrepreneur.m9.title', descKey: 'missions.entrepreneur.m9.description',
    timeEstimate: '30', sceneCount: 5, npcCount: 16,
    hints: ['missions.entrepreneur.m9.hint1', 'missions.entrepreneur.m9.hint2'],
    skills: ['skills.competition_strategy', 'skills.innovation'],
    successCriteria: 'Outcompete rivals and dominate market',
    scoring: entrepreneurScoringConfig(),
  },
  {
    role: 'entrepreneur', missionNumber: 10, difficulty: 'hard',
    titleKey: 'missions.entrepreneur.m10.title', descKey: 'missions.entrepreneur.m10.description',
    timeEstimate: '35', sceneCount: 5, npcCount: 20,
    hints: ['missions.entrepreneur.m10.hint1', 'missions.entrepreneur.m10.hint2'],
    skills: ['skills.ecosystem_building', 'skills.leadership'],
    successCriteria: 'Build complete BRICS+ tech ecosystem',
    scoring: entrepreneurScoringConfig(),
  },
]

export function getMissionConfigV2(role: Role, missionNumber: number): MissionV2Config | undefined {
  return NEW_MISSION_REGISTRY.find(m => m.role === role && m.missionNumber === missionNumber)
}

/**
 * Returns the total number of missions for a given role.
 */
export function getTotalMissions(_role: Role): number {
  return 10
}

/**
 * Returns difficulty based on mission number (1-3=easy, 4-6=medium, 7-10=hard).
 */
export function getDifficultyForMission(missionNumber: number): Difficulty {
  return difficultyFromNumber(missionNumber)
}
