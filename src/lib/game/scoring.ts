import { createClient } from '@/lib/supabase/client'
import type { Role, MissionMetrics } from '@/types/database'

const XP_PER_MISSION = 150
const COMPETENCY_AXES: Record<Role, Partial<Record<string, number>>> = {
  drone_programmer: { analytical_thinking: 0.4, technical_precision: 0.4, learning_speed: 0.2 },
  robot_constructor: { technical_precision: 0.5, analytical_thinking: 0.3, creativity: 0.2 },
  entrepreneur: { management: 0.4, creativity: 0.3, teamwork: 0.3 },
}

export async function completeMission(
  userId: string,
  role: Role,
  missionNumber: number,
  score: number,
  metrics: Partial<MissionMetrics>
) {
  const supabase = createClient()

  // Сохраняем прогресс миссии
  await supabase.from('mission_progress').upsert({
    user_id: userId,
    role,
    mission_number: missionNumber,
    status: 'completed',
    score,
    metrics,
    completed_at: new Date().toISOString(),
  }, { onConflict: 'user_id,role,mission_number' })

  // Начисляем XP
  await supabase.rpc('increment_xp', { user_id: userId, amount: XP_PER_MISSION })
    .then(() => {
      // fallback если RPC не создана
      supabase.from('profiles')
        .select('xp')
        .eq('id', userId)
        .single()
        .then(({ data }) => {
          if (data) {
            supabase.from('profiles')
              .update({ xp: data.xp + XP_PER_MISSION })
              .eq('id', userId)
          }
        })
    })

  // Обновляем компетенции
  const axes = COMPETENCY_AXES[role]
  const boost = Math.round((score / 100) * 20)

  const { data: existing } = await supabase
    .from('competency_scores')
    .select('*')
    .eq('user_id', userId)
    .single()

  const updated: Record<string, number> = {
    technical_precision: existing?.technical_precision ?? 0,
    analytical_thinking: existing?.analytical_thinking ?? 0,
    creativity: existing?.creativity ?? 0,
    teamwork: existing?.teamwork ?? 0,
    management: existing?.management ?? 0,
    learning_speed: existing?.learning_speed ?? 0,
    updated_at: Date.now(),
  }

  for (const [axis, weight] of Object.entries(axes)) {
    updated[axis] = Math.min(100, (updated[axis] as number) + Math.round(boost * (weight as number)))
  }

  await supabase.from('competency_scores').upsert({
    user_id: userId,
    ...updated,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  // Проверяем бейджи
  await checkAndAwardBadges(userId, role, supabase)

  return { xpEarned: XP_PER_MISSION }
}

async function checkAndAwardBadges(userId: string, role: Role, supabase: ReturnType<typeof createClient>) {
  const { data: progress } = await supabase
    .from('mission_progress')
    .select('role, status')
    .eq('user_id', userId)
    .eq('status', 'completed')

  const completedRoles = new Set(progress?.map(p => p.role) ?? [])
  const roleMissions = progress?.filter(p => p.role === role) ?? []

  const { data: existingBadges } = await supabase
    .from('user_badges')
    .select('badge:badges(key)')
    .eq('user_id', userId)

  const earned = new Set(existingBadges?.map(b => (b.badge as unknown as { key: string })?.key) ?? [])

  const { data: allBadges } = await supabase.from('badges').select('id, key')
  const badgeMap = Object.fromEntries(allBadges?.map(b => [b.key, b.id]) ?? [])

  const toAward: string[] = []

  if (!earned.has('first_mission') && (progress?.length ?? 0) >= 1) toAward.push('first_mission')
  if (!earned.has('drone_master') && role === 'drone_programmer' && roleMissions.length >= 2) toAward.push('drone_master')
  if (!earned.has('robot_builder') && role === 'robot_constructor' && roleMissions.length >= 2) toAward.push('robot_builder')
  if (!earned.has('entrepreneur') && role === 'entrepreneur' && roleMissions.length >= 2) toAward.push('entrepreneur')
  if (!earned.has('all_roles') && completedRoles.size >= 3) toAward.push('all_roles')

  for (const key of toAward) {
    if (badgeMap[key]) {
      await supabase.from('user_badges').insert({ user_id: userId, badge_id: badgeMap[key] })
    }
  }
}
