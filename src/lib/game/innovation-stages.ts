/**
 * Innovation Process Stages — mapping from missions to stages.
 *
 * The game teaches 6 stages of the innovation process. Each mission contributes
 * to one or more stages, depending on what the player actually does.
 *
 * Two modes of contribution:
 * - PERSONAL: player actively worked on the stage (solid checkmark on dashboard)
 * - PROJECT: player participated in a coop project where this stage was done
 *   by another role — they saw it but did not do it personally (hollow checkmark)
 */

import type { Role } from '@/types/database'

export type InnovationStageId =
  | 'research'      // 1. Исследование проблемы
  | 'idea'          // 2. Генерация и выбор идеи
  | 'prototype'     // 3. Прототипирование
  | 'test'          // 4. Тестирование
  | 'pitch'         // 5. Питч и инвестиции
  | 'launch'        // 6. Запуск и масштабирование

export const INNOVATION_STAGES: InnovationStageId[] = [
  'research', 'idea', 'prototype', 'test', 'pitch', 'launch',
]

export interface StageMeta {
  id: InnovationStageId
  order: number
  icon: string
  color: string
}

export const STAGE_META: Record<InnovationStageId, StageMeta> = {
  research:  { id: 'research',  order: 1, icon: '\u{1F50D}', color: '#3B82F6' }, // 🔍 blue
  idea:      { id: 'idea',      order: 2, icon: '\u{1F4A1}', color: '#FBBF24' }, // 💡 amber
  prototype: { id: 'prototype', order: 3, icon: '\u{1F6E0}', color: '#10B981' }, // 🛠 emerald
  test:      { id: 'test',      order: 4, icon: '\u{1F9EA}', color: '#06B6D4' }, // 🧪 cyan
  pitch:     { id: 'pitch',     order: 5, icon: '\u{1F4CA}', color: '#A855F7' }, // 📊 purple
  launch:    { id: 'launch',    order: 6, icon: '\u{1F680}', color: '#EF4444' }, // 🚀 red
}

// ===========================================================================
// SOLO MISSIONS — personal contribution
// ===========================================================================

/**
 * Maps a solo mission (role + mission number) to the innovation stages
 * the player personally works on while completing it.
 *
 * Based on mission registry in src/lib/game/missions.ts (successCriteria + skills).
 */
export function getSoloMissionStages(role: Role, missionNumber: number): InnovationStageId[] {
  if (role === 'drone_programmer') {
    // All drone missions are programming prototypes; M4+ adds test (conditionals, optimization, algorithms)
    // M10 is system design = touches launch/scale
    if (missionNumber <= 3) return ['prototype']
    if (missionNumber <= 9) return ['prototype', 'test']
    return ['prototype', 'test', 'launch'] // M10 — full city drone delivery system
  }

  if (role === 'robot_constructor') {
    // Similar to drone: prototype focus, test from M4+, scale in M9-M10
    if (missionNumber <= 3) return ['prototype']
    if (missionNumber <= 8) return ['prototype', 'test']
    return ['prototype', 'test', 'launch'] // M9-M10 — assembly line / factory design
  }

  if (role === 'entrepreneur') {
    // Entrepreneur track is the only one covering the full cycle sequentially
    if (missionNumber === 1) return ['research', 'idea']          // Group problems, select idea
    if (missionNumber === 2) return ['research', 'idea']          // Validate via customer interviews
    if (missionNumber === 3) return ['prototype']                 // Build MVP within budget
    if (missionNumber === 4) return ['launch']                    // Team building = pre-launch prep
    if (missionNumber === 5) return ['pitch']                     // Secure funding, pitching
    return ['launch']                                             // M6-M10 — growth, pivot, expand, ecosystem
  }

  return []
}

// ===========================================================================
// COOP MISSIONS — personal contribution (depends on role) + project exposure
// ===========================================================================

type CoopStageMap = {
  personal: Record<Role, InnovationStageId[]>
  project: InnovationStageId[]  // All stages the coop project as a whole covers
}

export const COOP_MISSION_STAGES: Record<string, CoopStageMap> = {
  coop_solar_farm: {
    personal: {
      drone_programmer:  ['prototype'],  // Site selection via terrain scan
      robot_constructor: ['prototype'],  // Chassis type/weight config
      entrepreneur:      ['launch'],     // Price per kWh, payback calc
    },
    project: ['prototype', 'launch'],
  },
  coop_bridge: {
    personal: {
      drone_programmer:  ['prototype'],  // Survey gorge dimensions for design
      robot_constructor: ['prototype'],  // Bridge construction
      entrepreneur:      ['pitch', 'launch'], // Budget allocation / project pitch
    },
    project: ['prototype', 'pitch', 'launch'],
  },
  coop_rescue: {
    personal: {
      drone_programmer:  ['test'],                 // Operational scan for survivors
      robot_constructor: ['prototype'],            // Select rescue robot type
      entrepreneur:      ['pitch', 'launch'],      // Budget + PR strategy
    },
    project: ['prototype', 'test', 'pitch', 'launch'],
  },
  coop_smart_district: {
    personal: {
      drone_programmer:  ['prototype', 'test'],    // Coverage planning
      robot_constructor: ['prototype', 'launch'],  // District deployment
      entrepreneur:      ['pitch', 'launch'],      // Radar + budget allocation
    },
    project: ['prototype', 'test', 'pitch', 'launch'],
  },
  coop_city_launch: {
    personal: {
      drone_programmer:  ['launch'],
      robot_constructor: ['launch'],
      entrepreneur:      ['pitch', 'launch'],
    },
    project: ['launch'],
  },
}

// ===========================================================================
// Progress aggregation
// ===========================================================================

export interface StageCoverage {
  stage: InnovationStageId
  personalCount: number   // How many missions contributed personally
  projectCount: number    // How many coop projects exposed this stage (without personal work)
  hasPersonal: boolean
  hasProject: boolean     // Only true if coop exposure exists AND no personal work
}

export interface MissionCompletion {
  role: Role
  missionNumber: number
  isCoop?: false
}

export interface CoopCompletion {
  coopId: string          // e.g. 'coop_solar_farm'
  role: Role              // Which role the player used
  isCoop: true
}

export type CompletedMission = MissionCompletion | CoopCompletion

/**
 * Given a list of completed missions (solo + coop), compute the coverage
 * of each innovation stage.
 */
export function computeStageCoverage(completed: CompletedMission[]): StageCoverage[] {
  const personal: Record<InnovationStageId, number> = {
    research: 0, idea: 0, prototype: 0, test: 0, pitch: 0, launch: 0,
  }
  const projectExposure: Record<InnovationStageId, number> = {
    research: 0, idea: 0, prototype: 0, test: 0, pitch: 0, launch: 0,
  }

  for (const m of completed) {
    if (m.isCoop) {
      const coop = COOP_MISSION_STAGES[m.coopId]
      if (!coop) continue
      const personalStages = coop.personal[m.role] || []
      for (const s of personalStages) personal[s]++
      // Project exposure = all project stages EXCEPT those the player did personally
      const personalSet = new Set(personalStages)
      for (const s of coop.project) {
        if (!personalSet.has(s)) projectExposure[s]++
      }
    } else {
      const stages = getSoloMissionStages(m.role, m.missionNumber)
      for (const s of stages) personal[s]++
    }
  }

  return INNOVATION_STAGES.map(stage => {
    const p = personal[stage]
    const e = projectExposure[stage]
    return {
      stage,
      personalCount: p,
      projectCount: e,
      hasPersonal: p > 0,
      hasProject: p === 0 && e > 0,
    }
  })
}

/**
 * Count stages that have at least personal OR project coverage.
 */
export function countCoveredStages(coverage: StageCoverage[]): number {
  return coverage.filter(c => c.hasPersonal || c.hasProject).length
}

/**
 * Count stages with personal coverage only (used for achievements).
 */
export function countPersonalStages(coverage: StageCoverage[]): number {
  return coverage.filter(c => c.hasPersonal).length
}
