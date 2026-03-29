import { createClient } from '@/lib/supabase/client'
import type { Role, MissionMetrics } from '@/types/database'
import type { Difficulty, MissionResult, ScoreBreakdown } from '@/types/game'
import { calculateRewards, calculateRewardsV2 } from './rewards'

const COMPETENCY_AXES: Record<Role, Partial<Record<string, number>>> = {
  drone_programmer: { analytical_thinking: 0.4, technical_precision: 0.4, learning_speed: 0.2 },
  robot_constructor: { technical_precision: 0.5, analytical_thinking: 0.3, creativity: 0.2 },
  entrepreneur: { management: 0.4, creativity: 0.3, teamwork: 0.3 },
}

// ==============================
// Star calculation
// ==============================

/**
 * Calculate stars from score and maxScore.
 * 1 star = 50%+, 2 stars = 75%+, 3 stars = 95%+
 */
export function calculateStars(score: number, maxScore: number): 0 | 1 | 2 | 3 {
  if (maxScore <= 0) return 0
  const ratio = score / maxScore
  if (ratio >= 0.95) return 3
  if (ratio >= 0.75) return 2
  if (ratio >= 0.50) return 1
  return 0
}

/**
 * Calculate near-miss info: if within 10% of next star threshold.
 * Returns the number of points needed and which star level, or null if not near.
 */
export function calculateNearMiss(score: number, maxScore: number): { points: number; starLevel: number } | null {
  if (maxScore <= 0) return null
  const ratio = score / maxScore
  const thresholds = [
    { threshold: 0.50, starLevel: 1 },
    { threshold: 0.75, starLevel: 2 },
    { threshold: 0.95, starLevel: 3 },
  ]
  for (const { threshold, starLevel } of thresholds) {
    if (ratio < threshold) {
      const pointsNeeded = Math.ceil(threshold * maxScore) - score
      const gapRatio = (threshold * maxScore - score) / maxScore
      if (gapRatio <= 0.10) {
        return { points: pointsNeeded, starLevel }
      }
      return null
    }
  }
  return null
}

// ==============================
// Role-specific scoring functions
// ==============================

interface DroneScoringInput {
  reachedTarget: boolean
  blocksUsed: number
  optimalBlocks: number
  timeSeconds: number
  timeLimitSeconds: number
  usedRedundantBlocks: boolean
}

/**
 * Score a drone mission (programmer role).
 * correctness (50%) + efficiency (35%) + style (15%) = 1000 max
 * No speed scoring — players should think, not rush.
 */
export function scoreDroneMission(input: DroneScoringInput): { score: number; breakdown: ScoreBreakdown[] } {
  const correctness = input.reachedTarget ? 500 : 0
  const efficiencyRatio = input.optimalBlocks > 0
    ? Math.max(0, 1 - (input.blocksUsed / input.optimalBlocks - 1))
    : 0
  const efficiency = Math.round(efficiencyRatio * 350)
  const style = input.usedRedundantBlocks ? 0 : 150

  const score = correctness + efficiency + style

  return {
    score,
    breakdown: [
      { label: 'scoring.correctness', value: correctness, max: 500 },
      { label: 'scoring.efficiency', value: efficiency, max: 350 },
      { label: 'scoring.style', value: style, max: 150 },
    ],
  }
}

interface RobotScoringInput {
  slotsFilledCorrectly: number
  totalSlots: number
  testsPassed: number
  totalTests: number
  moneySpent: number
  budgetLimit: number
  testQuality: 'smooth' | 'jerky' | 'fail'
}

/**
 * Score a robot mission (constructor role).
 * design (35%) + physics (30%) + budget (20%) + testing (15%) = 1000 max
 */
export function scoreRobotMission(input: RobotScoringInput): { score: number; breakdown: ScoreBreakdown[] } {
  const design = input.totalSlots > 0
    ? Math.round((input.slotsFilledCorrectly / input.totalSlots) * 350)
    : 0
  const physics = input.totalTests > 0
    ? Math.round((input.testsPassed / input.totalTests) * 300)
    : 0
  const budgetRatio = input.budgetLimit > 0
    ? Math.max(0, 1 - input.moneySpent / input.budgetLimit)
    : 0
  const budget = Math.round(budgetRatio * 200)
  const testingMap = { smooth: 150, jerky: 75, fail: 0 } as const
  const testing = testingMap[input.testQuality]

  const score = design + physics + budget + testing

  return {
    score,
    breakdown: [
      { label: 'scoring.design', value: design, max: 350 },
      { label: 'scoring.physics', value: physics, max: 300 },
      { label: 'scoring.budget', value: budget, max: 200 },
      { label: 'scoring.testing', value: testing, max: 150 },
    ],
  }
}

interface EntrepreneurScoringInput {
  correctDecisions: number
  totalDecisions: number
  npcsSurveyed: number
  totalNpcs: number
  timeMinutes: number
}

/**
 * Score an entrepreneur mission.
 * decisions (35%) + financials/survey (30%) + team (20%) + timing (15%) = 1000 max
 */
export function scoreEntrepreneurMission(input: EntrepreneurScoringInput): { score: number; breakdown: ScoreBreakdown[] } {
  const decisions = input.totalDecisions > 0
    ? Math.round((input.correctDecisions / input.totalDecisions) * 350)
    : 0

  // financials based on NPCs surveyed
  let financials: number
  if (input.npcsSurveyed >= 10) financials = 300
  else if (input.npcsSurveyed >= 8) financials = 200
  else if (input.npcsSurveyed >= 6) financials = 100
  else financials = 0

  // team: flat 200 for mission 1 (no team mechanic)
  const team = 200

  // timing
  let timing: number
  if (input.timeMinutes <= 5) timing = 150
  else if (input.timeMinutes <= 10) timing = 100
  else timing = 0

  const score = decisions + financials + team + timing

  return {
    score,
    breakdown: [
      { label: 'scoring.decisions', value: decisions, max: 350 },
      { label: 'scoring.financials', value: financials, max: 300 },
      { label: 'scoring.team', value: team, max: 200 },
      { label: 'scoring.timing', value: timing, max: 150 },
    ],
  }
}

// ==============================
// Legacy completeMission (backwards compatible)
// ==============================

export async function completeMission(
  userId: string,
  role: Role,
  missionNumber: number,
  difficulty: Difficulty,
  score: number,
  metrics: Partial<MissionMetrics> & Record<string, unknown>
): Promise<MissionResult> {
  const supabase = createClient()
  const rewards = calculateRewards(difficulty, score)

  // Phase 1: read existing progress and competency scores in parallel
  const [{ data: existing }, { data: existingComp }] = await Promise.all([
    supabase
      .from('mission_progress')
      .select('score')
      .eq('user_id', userId)
      .eq('role', role)
      .eq('mission_number', missionNumber)
      .eq('difficulty', difficulty)
      .single(),
    supabase
      .from('competency_scores')
      .select('*')
      .eq('user_id', userId)
      .single(),
  ])

  const isFirstCompletion = !existing
  const isNewBestScore = !existing || score > existing.score

  // Phase 2: writes in parallel (INSERT or UPDATE progress + XP/currency + competency)
  const progressData = {
    status: 'completed' as const,
    score: isNewBestScore ? score : (existing?.score ?? score),
    metrics,
    completed_at: new Date().toISOString(),
  }
  const progressResult = existing
    ? await supabase.from('mission_progress').update(progressData)
        .eq('user_id', userId).eq('role', role)
        .eq('mission_number', missionNumber).eq('difficulty', difficulty)
    : await supabase.from('mission_progress').insert({
        user_id: userId, role, mission_number: missionNumber, difficulty, ...progressData,
      })

  if (progressResult.error) {
    throw new Error(`Mission save failed: ${progressResult.error.message}`)
  }

  const writePromises: PromiseLike<unknown>[] = []

  if (isFirstCompletion) {
    // XP
    writePromises.push(
      supabase.rpc('increment_xp', { p_user_id: userId, p_amount: rewards.xp })
        .then(async ({ error }) => {
          if (error) {
            const { data: prof } = await supabase.from('profiles').select('xp').eq('id', userId).single()
            if (prof) await supabase.from('profiles').update({ xp: prof.xp + rewards.xp }).eq('id', userId)
          }
        })
    )
    // Currency
    writePromises.push(
      supabase.rpc('increment_currency', { p_user_id: userId, p_amount: rewards.currency })
        .then(async ({ error }) => {
          if (error) {
            const { data: prof } = await supabase.from('profiles').select('game_currency').eq('id', userId).single()
            if (prof) await supabase.from('profiles').update({ game_currency: (prof.game_currency || 0) + rewards.currency }).eq('id', userId)
          }
        })
    )
  }

  if (isNewBestScore) {
    const axes = COMPETENCY_AXES[role]
    const boost = Math.round((score / 100) * 20)

    const updated: Record<string, number> = {
      technical_precision: existingComp?.technical_precision ?? 0,
      analytical_thinking: existingComp?.analytical_thinking ?? 0,
      creativity: existingComp?.creativity ?? 0,
      teamwork: existingComp?.teamwork ?? 0,
      management: existingComp?.management ?? 0,
      learning_speed: existingComp?.learning_speed ?? 0,
    }

    for (const [axis, weight] of Object.entries(axes)) {
      updated[axis] = Math.min(100, (updated[axis] as number) + Math.round(boost * (weight as number)))
    }

    writePromises.push(
      supabase.from('competency_scores').upsert({
        user_id: userId,
        ...updated,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
    )
  }

  await Promise.all(writePromises)

  // Phase 3: badges + profile totals in parallel
  const [newBadges, { data: profile }] = await Promise.all([
    checkAndAwardBadges(userId, role, supabase),
    supabase.from('profiles').select('xp, game_currency').eq('id', userId).single(),
  ])

  return {
    xpEarned: isFirstCompletion ? rewards.xp : 0,
    currencyEarned: isFirstCompletion ? rewards.currency : 0,
    isFirstCompletion,
    isNewBestScore,
    newBadges,
    totalXp: profile?.xp ?? 0,
    totalCurrency: profile?.game_currency ?? 0,
  }
}

async function checkAndAwardBadges(userId: string, role: Role, supabase: ReturnType<typeof createClient>): Promise<string[]> {
  // Fetch all needed data in parallel
  const [{ data: progress }, { data: existingBadges }, { data: allBadges }] = await Promise.all([
    supabase
      .from('mission_progress')
      .select('role, status')
      .eq('user_id', userId)
      .eq('status', 'completed'),
    supabase
      .from('user_badges')
      .select('badge:badges(key)')
      .eq('user_id', userId),
    supabase.from('badges').select('id, key'),
  ])

  const completedRoles = new Set(progress?.map(p => p.role) ?? [])
  const roleMissions = progress?.filter(p => p.role === role) ?? []

  const earned = new Set(existingBadges?.map(b => (b.badge as unknown as { key: string })?.key) ?? [])
  const badgeMap = Object.fromEntries(allBadges?.map(b => [b.key, b.id]) ?? [])

  const toAward: string[] = []

  if (!earned.has('first_mission') && (progress?.length ?? 0) >= 1) toAward.push('first_mission')
  if (!earned.has('drone_master') && role === 'drone_programmer' && roleMissions.length >= 2) toAward.push('drone_master')
  if (!earned.has('robot_builder') && role === 'robot_constructor' && roleMissions.length >= 2) toAward.push('robot_builder')
  if (!earned.has('entrepreneur') && role === 'entrepreneur' && roleMissions.length >= 2) toAward.push('entrepreneur')
  if (!earned.has('all_roles') && completedRoles.size >= 3) toAward.push('all_roles')

  // Award badges in parallel
  await Promise.all(
    toAward
      .filter(key => badgeMap[key])
      .map(key => supabase.from('user_badges').insert({ user_id: userId, badge_id: badgeMap[key] }))
  )

  return toAward
}
