'use server'

import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/types/database'
import type { Difficulty, MissionResultV2, ScoreBreakdown } from '@/types/game'
import { calculateStars, calculateNearMiss, scoreDroneMission, scoreRobotMission, scoreEntrepreneurMission } from './scoring'
import { calculateRewardsV2, checkBlockRewards, checkBricsFounderReward } from './rewards'

// ---------------------------------------------------------------------------
// Telemetry types — raw game data sent from client, scored on server
// ---------------------------------------------------------------------------

interface DroneTelemetry {
  role: 'drone_programmer'
  missionNumber: number
  reachedTarget: boolean
  blocksUsed: number
  optimalBlocks: number
  timeSeconds: number
  timeLimitSeconds: number
  usedRedundantBlocks: boolean
}

interface RobotTelemetry {
  role: 'robot_constructor'
  missionNumber: number
  slotsFilledCorrectly: number
  totalSlots: number
  testsPassed: number
  totalTests: number
  moneySpent: number
  budgetLimit: number
  testQuality: 'smooth' | 'jerky' | 'fail'
}

interface EntrepreneurTelemetry {
  role: 'entrepreneur'
  missionNumber: number
  correctDecisions: number
  totalDecisions: number
  npcsSurveyed: number
  totalNpcs: number
  timeMinutes: number
}

type MissionTelemetry = DroneTelemetry | RobotTelemetry | EntrepreneurTelemetry

// ---------------------------------------------------------------------------
// Difficulty derived from mission number
// ---------------------------------------------------------------------------

function difficultyFromNumber(n: number): Difficulty {
  if (n <= 3) return 'easy'
  if (n <= 6) return 'medium'
  return 'hard'
}

// ---------------------------------------------------------------------------
// Score telemetry on the server
// ---------------------------------------------------------------------------

function scoreTelemetry(telemetry: MissionTelemetry): { score: number; breakdown: ScoreBreakdown[] } {
  switch (telemetry.role) {
    case 'drone_programmer':
      return scoreDroneMission(telemetry)
    case 'robot_constructor':
      return scoreRobotMission(telemetry)
    case 'entrepreneur':
      return scoreEntrepreneurMission(telemetry)
  }
}

// ---------------------------------------------------------------------------
// Main Server Action
// ---------------------------------------------------------------------------

const MAX_SCORE = 1000

const COMPETENCY_AXES: Record<Role, Partial<Record<string, number>>> = {
  drone_programmer: { analytical_thinking: 0.4, technical_precision: 0.4, learning_speed: 0.2 },
  robot_constructor: { technical_precision: 0.5, analytical_thinking: 0.3, creativity: 0.2 },
  entrepreneur: { management: 0.4, creativity: 0.3, teamwork: 0.3 },
}

export async function completeMissionV2(
  telemetry: MissionTelemetry,
  hintsUsed: number
): Promise<MissionResultV2> {
  const supabase = await createClient()

  // 1. Get authenticated user (server-side — cannot be spoofed)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Not authenticated')
  }
  const userId = user.id

  const role = telemetry.role
  const missionNumber = telemetry.missionNumber
  const difficulty = difficultyFromNumber(missionNumber)

  // 2. Score on server
  const { score, breakdown } = scoreTelemetry(telemetry)
  const stars = calculateStars(score, MAX_SCORE)
  const nearMiss = calculateNearMiss(score, MAX_SCORE)
  const isSuccess = stars >= 1 // 1+ star = passed

  // 3. Read existing progress and profile counters
  const [{ data: existing }, { data: existingComp }, { data: profileCounters }] = await Promise.all([
    supabase
      .from('mission_progress')
      .select('score')
      .eq('user_id', userId)
      .eq('role', role)
      .eq('mission_number', missionNumber)
      .single(),
    supabase
      .from('competency_scores')
      .select('*')
      .eq('user_id', userId)
      .single(),
    supabase
      .from('profiles')
      .select('total_missions_completed')
      .eq('id', userId)
      .single(),
  ])

  const isFirstCompletion = !existing
  const isNewBestScore = !existing || score > (existing.score ?? 0)

  // 4. Calculate rewards (V2 values, first completion only)
  const rewards = calculateRewardsV2(difficulty)
  const xpEarned = isFirstCompletion && isSuccess ? rewards.xp : 0
  const coinsEarned = isFirstCompletion && isSuccess ? rewards.currency : 0

  // 5. Write progress (using only columns that exist in current schema)
  const progressData = {
    status: 'completed' as const,
    score: isNewBestScore ? score : (existing?.score ?? score),
    hints_used: hintsUsed,
    metrics: { telemetry },
    completed_at: new Date().toISOString(),
  }

  const progressResult = existing
    ? await supabase.from('mission_progress').update(progressData)
        .eq('user_id', userId).eq('role', role)
        .eq('mission_number', missionNumber)
    : await supabase.from('mission_progress').insert({
        user_id: userId, role, mission_number: missionNumber, difficulty, ...progressData,
      })

  if (progressResult.error) {
    throw new Error(`Mission save failed: ${progressResult.error.message}`)
  }

  // 6. Award XP + currency (first successful completion only)
  const writePromises: PromiseLike<unknown>[] = []

  if (xpEarned > 0) {
    writePromises.push(
      supabase.rpc('increment_xp', { p_user_id: userId, p_amount: xpEarned })
        .then(async ({ error }) => {
          if (error) {
            const { data: prof } = await supabase.from('profiles').select('xp').eq('id', userId).single()
            if (prof) await supabase.from('profiles').update({ xp: prof.xp + xpEarned }).eq('id', userId)
          }
        })
    )
  }

  if (coinsEarned > 0) {
    writePromises.push(
      supabase.rpc('increment_currency', { p_user_id: userId, p_amount: coinsEarned })
        .then(async ({ error }) => {
          if (error) {
            const { data: prof } = await supabase.from('profiles').select('game_currency').eq('id', userId).single()
            if (prof) await supabase.from('profiles').update({ game_currency: (prof.game_currency || 0) + coinsEarned }).eq('id', userId)
          }
        })
    )
  }

  // 7. Update competencies
  if (isNewBestScore && isSuccess) {
    const axes = COMPETENCY_AXES[role]
    const boost = Math.round((score / MAX_SCORE) * 20)

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

  // 8. Profile counters (total_missions_completed)
  if (isFirstCompletion && isSuccess) {
    writePromises.push(
      supabase.from('profiles').update({
        total_missions_completed: (profileCounters?.total_missions_completed ?? 0) + 1,
      }).eq('id', userId)
    )
  }

  await Promise.all(writePromises)

  // 9. Block rewards — check if completing this mission unlocks any skins
  //    Wrapped in try/catch because user_skins / user_achievements tables
  //    may not exist if V2 schema migration was not applied.
  const unlockedSkins: string[] = []

  if (isSuccess) {
    try {
      // Get all completed missions for this role
      const { data: allProgress } = await supabase
        .from('mission_progress')
        .select('role, mission_number')
        .eq('user_id', userId)
        .eq('status', 'completed')

      if (allProgress) {
        // Build completed sets per role
        const completedByRole: Record<string, Set<number>> = {}
        for (const p of allProgress) {
          if (!completedByRole[p.role]) completedByRole[p.role] = new Set()
          completedByRole[p.role].add(p.mission_number)
        }
        // Make sure current mission is included
        if (!completedByRole[role]) completedByRole[role] = new Set()
        completedByRole[role].add(missionNumber)

        const roleCompleted = completedByRole[role] || new Set<number>()

        // Check block rewards for this role
        const blockRewards = checkBlockRewards(role, roleCompleted)

        // Check which are actually new (not already unlocked)
        const { data: existingSkins, error: skinsQueryError } = await supabase
          .from('user_skins')
          .select('skin_id')
          .eq('user_id', userId)

        // If query failed (table missing etc), skip block rewards
        if (skinsQueryError) {
          // Skip — table may not exist
        } else {
          const ownedSkinIds = new Set((existingSkins || []).map(s => s.skin_id))

          for (const reward of blockRewards) {
            if (ownedSkinIds.has(reward.skinId)) continue
            try {
              await supabase.from('user_skins').insert({
                user_id: userId,
                skin_id: reward.skinId,
              })
              await supabase.from('user_achievements').insert({
                user_id: userId,
                achievement_id: reward.achievementId,
              })
              unlockedSkins.push(reward.skinId)
            } catch {
              // Table missing or insert failed — skip this reward
            }
          }

          // Check BRICS Founder (cross-role)
          if (!ownedSkinIds.has('brics_founder_skin')) {
            const droneSet = completedByRole['drone_programmer'] || new Set<number>()
            const robotSet = completedByRole['robot_constructor'] || new Set<number>()
            const entSet = completedByRole['entrepreneur'] || new Set<number>()
            if (checkBricsFounderReward(droneSet, robotSet, entSet)) {
              try {
                await supabase.from('user_skins').insert({ user_id: userId, skin_id: 'brics_founder_skin' })
                await supabase.from('user_achievements').insert({ user_id: userId, achievement_id: 'brics_founder' })
                unlockedSkins.push('brics_founder_skin')
              } catch {
                // Table missing — skip
              }
            }
          }
        }
      }
    } catch {
      // Entire block rewards section failed (table missing etc.) — continue gracefully
      console.warn('Block rewards processing skipped due to missing tables')
    }
  }

  // 10. Get updated profile
  const { data: profile } = await supabase.from('profiles')
    .select('xp, game_currency')
    .eq('id', userId).single()

  return {
    xpEarned,
    currencyEarned: coinsEarned,
    isFirstCompletion,
    isNewBestScore,
    newBadges: [],
    totalXp: profile?.xp ?? 0,
    totalCurrency: profile?.game_currency ?? 0,
    score,
    stars,
    scoreBreakdown: breakdown,
    nearMissPoints: nearMiss?.points ?? null,
    nearMissStarLevel: nearMiss?.starLevel ?? null,
    unlockedSkins,
  }
}
