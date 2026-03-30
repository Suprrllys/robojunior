'use server'

import { createClient } from '@/lib/supabase/server'
import { calculateStars, calculateNearMiss } from './scoring'
import type { Difficulty } from '@/types/game'

// Coop reward values (base rewards for first completion of each mission template)
const COOP_BASE_REWARDS: Record<Difficulty, { xp: number; coins: number }> = {
  easy:   { xp: 30, coins: 10 },
  medium: { xp: 60, coins: 25 },
  hard:   { xp: 120, coins: 50 },
}

// Competency boost weights per role (same as solo, but teamwork always gets a boost)
const COMPETENCY_AXES: Record<string, Record<string, number>> = {
  drone_programmer: { analytical_thinking: 0.25, technical_precision: 0.25, learning_speed: 0.15, teamwork: 0.35 },
  robot_constructor: { technical_precision: 0.3, analytical_thinking: 0.2, creativity: 0.15, teamwork: 0.35 },
  entrepreneur: { management: 0.25, creativity: 0.2, teamwork: 0.55 },
}

export interface CompetencyBoost {
  axis: string
  amount: number
}

export interface CoopMissionResult {
  baseXp: number
  baseCoins: number
  bonusXp: number
  bonusCoins: number
  totalXp: number
  totalCoins: number
  stars: 0 | 1 | 2 | 3
  totalSessionScore: number
  maxSessionScore: number
  nearMiss: { points: number; starLevel: number } | null
  isFirstCompletion: boolean
  coopMissionsCompleted: number
  unlockedAchievements: string[]
  competencyBoosts: CompetencyBoost[]
}

/**
 * Server action called when ALL players in a coop session have completed.
 * Awards base rewards, bonus rewards, competency boosts, and checks achievements.
 */
export async function completeCoopMission(
  sessionId: string,
  myScore: number,
  allScores: number[],
): Promise<CoopMissionResult> {
  const supabase = await createClient()

  // 1. Authenticate
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')
  const userId = user.id

  // 2. Get session info
  const { data: session } = await supabase
    .from('coop_sessions')
    .select('id, mission_template, difficulty, created_by')
    .eq('id', sessionId)
    .single()
  if (!session) throw new Error('Session not found')

  const difficulty: Difficulty = (session.difficulty as Difficulty) || 'medium'

  // 3. Get ALL participant scores from DB (server-authoritative, not client)
  const { data: allParticipants } = await supabase
    .from('coop_participants')
    .select('user_id, role, score')
    .eq('coop_session_id', sessionId)
  if (!allParticipants) throw new Error('No participants found')

  const myPart = allParticipants.find(p => p.user_id === userId)
  if (!myPart) throw new Error('Not a participant')

  // Use DB scores (server-authoritative) instead of client-provided scores
  // Only count players who actually played (score > 0) to avoid penalizing teams for inactive members
  const dbMyScore = Math.min(1000, Math.max(0, myPart.score ?? 0))
  const activePlayers = allParticipants.filter(p => p.score && p.score > 0)
  const dbAllScores = activePlayers.length > 0
    ? activePlayers.map(p => Math.min(1000, Math.max(0, p.score ?? 0)))
    : allParticipants.map(p => Math.min(1000, Math.max(0, p.score ?? 0)))

  // 4. Check if this is first completion of this mission template for this user
  const { data: existing } = await supabase
    .from('coop_completed_missions')
    .select('id')
    .eq('user_id', userId)
    .eq('mission_template', session.mission_template)
    .limit(1)
  const isFirstCompletion = !existing || existing.length === 0

  // 5. Calculate stars from total session score (using DB scores)
  const totalSessionScore = dbAllScores.reduce((a, b) => a + b, 0)
  const maxSessionScore = dbAllScores.length * 1000
  const stars = calculateStars(totalSessionScore, maxSessionScore)
  const nearMiss = calculateNearMiss(totalSessionScore, maxSessionScore)

  // 6. Calculate rewards
  const baseRewards = COOP_BASE_REWARDS[difficulty]
  const baseXp = isFirstCompletion ? baseRewards.xp : 0
  const baseCoins = isFirstCompletion ? baseRewards.coins : 0

  // Bonus from team average (using DB scores)
  const avgScore = dbAllScores.reduce((a, b) => a + b, 0) / dbAllScores.length
  const bonusXp = Math.round(avgScore * 0.3)
  const bonusCoins = Math.round(avgScore * 0.15)

  const totalXp = baseXp + bonusXp
  const totalCoins = baseCoins + bonusCoins

  // 6. Get partner countries for BRICS United achievement
  const { data: partnerParts } = await supabase
    .from('coop_participants')
    .select('user_id, profiles(country)')
    .eq('coop_session_id', sessionId)
    .neq('user_id', userId)

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('country, coop_missions_completed, total_missions_completed')
    .eq('id', userId)
    .single()

  const myCountry = (myProfile?.country ?? '').toUpperCase()
  const partnerCountries = partnerParts?.map(p => {
    const prof = p.profiles as { country: string } | null
    return (prof?.country ?? '').toUpperCase()
  }) ?? []
  // BRICS United: both players must have a real country set, and they must differ
  const hasInternationalPartner = myCountry.length >= 2 && partnerCountries.some(c => c.length >= 2 && c !== myCountry && c !== 'OTHER')

  // 7. Save completion record (with stars)
  await supabase.from('coop_completed_missions').upsert({
    user_id: userId,
    coop_session_id: sessionId,
    mission_template: session.mission_template,
    role: myPart.role,
    score: dbMyScore,
    stars,
    total_session_score: totalSessionScore,
    partner_country: partnerCountries.filter(c => c.length >= 2).join(',') || null,
    completed_at: new Date().toISOString(),
  }, { onConflict: 'user_id, coop_session_id' })

  // 8. Award XP and coins
  const writePromises: Promise<unknown>[] = []

  if (totalXp > 0) {
    writePromises.push(
      supabase.rpc('increment_xp', { p_user_id: userId, p_amount: totalXp })
        .then(async ({ error }) => {
          if (error) {
            const { data: prof } = await supabase.from('profiles').select('xp').eq('id', userId).single()
            if (prof) await supabase.from('profiles').update({ xp: prof.xp + totalXp }).eq('id', userId)
          }
        })
    )
  }

  if (totalCoins > 0) {
    writePromises.push(
      supabase.rpc('increment_currency', { p_user_id: userId, p_amount: totalCoins })
        .then(async ({ error }) => {
          if (error) {
            const { data: prof } = await supabase.from('profiles').select('game_currency').eq('id', userId).single()
            if (prof) await supabase.from('profiles').update({ game_currency: (prof.game_currency || 0) + totalCoins }).eq('id', userId)
          }
        })
    )
  }

  // 9. Update competency scores (always boost teamwork for coop)
  const { data: existingComp } = await supabase
    .from('competency_scores')
    .select('*')
    .eq('user_id', userId)
    .single()

  const axes = COMPETENCY_AXES[myPart.role] ?? { teamwork: 1.0 }
  const boost = Math.round((dbMyScore / 1000) * 25) // Slightly higher boost for coop

  const updated: Record<string, number> = {
    technical_precision: existingComp?.technical_precision ?? 0,
    analytical_thinking: existingComp?.analytical_thinking ?? 0,
    creativity: existingComp?.creativity ?? 0,
    teamwork: existingComp?.teamwork ?? 0,
    management: existingComp?.management ?? 0,
    learning_speed: existingComp?.learning_speed ?? 0,
  }

  const competencyBoosts: CompetencyBoost[] = []
  for (const [axis, weight] of Object.entries(axes)) {
    const amount = Math.round(boost * weight)
    if (amount > 0) {
      const before = updated[axis]
      updated[axis] = Math.min(100, before + amount)
      const actual = updated[axis] - before
      if (actual > 0) competencyBoosts.push({ axis, amount: actual })
    }
  }

  writePromises.push(
    supabase.from('competency_scores').upsert({
      user_id: userId,
      ...updated,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  )

  // 10. Update coop missions counter
  const newCoopCount = (myProfile?.coop_missions_completed ?? 0) + 1
  const newTotalCount = (myProfile?.total_missions_completed ?? 0) + 1
  writePromises.push(
    supabase.from('profiles').update({
      coop_missions_completed: newCoopCount,
      total_missions_completed: newTotalCount,
    }).eq('id', userId)
  )

  await Promise.all(writePromises)

  // 11. Check achievements
  const unlockedAchievements: string[] = []

  // Get all coop completions for this user
  const { data: allCompletions } = await supabase
    .from('coop_completed_missions')
    .select('mission_template, partner_country')
    .eq('user_id', userId)

  const completedTemplates = new Set(allCompletions?.map(c => c.mission_template) ?? [])
  const coopCount = completedTemplates.size

  // Check existing achievements
  const { data: existingAch } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId)
  const existingAchSet = new Set(existingAch?.map(a => a.achievement_id) ?? [])

  // Team Player — first coop mission
  if (!existingAchSet.has('coop_team_player') && coopCount >= 1) {
    try {
      await supabase.from('user_achievements').insert({ user_id: userId, achievement_id: 'coop_team_player' })
      await supabase.from('user_skins').insert({ user_id: userId, skin_id: 'coop_team_player_skin' })
      unlockedAchievements.push('coop_team_player')
    } catch { /* skip if table missing */ }
  }

  // Dream Team — 5 unique coop missions
  if (!existingAchSet.has('coop_dream_team') && coopCount >= 5) {
    try {
      await supabase.from('user_achievements').insert({ user_id: userId, achievement_id: 'coop_dream_team' })
      await supabase.from('user_skins').insert({ user_id: userId, skin_id: 'coop_dream_team_skin' })
      unlockedAchievements.push('coop_dream_team')
    } catch { /* skip */ }
  }

  // BRICS United — played with partner from different country
  if (!existingAchSet.has('coop_brics_united') && hasInternationalPartner) {
    try {
      await supabase.from('user_achievements').insert({ user_id: userId, achievement_id: 'coop_brics_united' })
      await supabase.from('user_skins').insert({ user_id: userId, skin_id: 'coop_brics_united_skin' })
      unlockedAchievements.push('coop_brics_united')
    } catch { /* skip */ }
  }

  // Perfect Sync — all players scored 800+
  if (!existingAchSet.has('coop_perfect_sync') && dbAllScores.every(s => s >= 800)) {
    try {
      await supabase.from('user_achievements').insert({ user_id: userId, achievement_id: 'coop_perfect_sync' })
      await supabase.from('user_skins').insert({ user_id: userId, skin_id: 'coop_perfect_sync_skin' })
      unlockedAchievements.push('coop_perfect_sync')
    } catch { /* skip */ }
  }

  // All Coop — completed all 5 unique 3-player missions
  const COOP3_TEMPLATES = ['coop_solar_farm', 'coop_bridge', 'coop_rescue', 'coop_smart_district', 'coop_city_launch']
  if (!existingAchSet.has('coop_all_missions') && COOP3_TEMPLATES.every(t => completedTemplates.has(t))) {
    try {
      await supabase.from('user_achievements').insert({ user_id: userId, achievement_id: 'coop_all_missions' })
      await supabase.from('user_skins').insert({ user_id: userId, skin_id: 'coop_all_missions_skin' })
      unlockedAchievements.push('coop_all_missions')
    } catch { /* skip */ }
  }

  return {
    baseXp,
    baseCoins,
    bonusXp,
    bonusCoins,
    totalXp,
    totalCoins,
    stars,
    totalSessionScore,
    maxSessionScore,
    nearMiss,
    isFirstCompletion,
    coopMissionsCompleted: newCoopCount,
    unlockedAchievements,
    competencyBoosts,
  }
}
