export type Role = 'drone_programmer' | 'robot_constructor' | 'entrepreneur'
export type Country = 'SA' | 'RU' | 'IN' | 'CN' | 'BR' | 'OTHER'
export type MissionStatus = 'not_started' | 'in_progress' | 'completed'
export type CoopStatus = 'waiting' | 'active' | 'completed' | 'abandoned'

export interface Profile {
  id: string
  email: string
  username: string
  country: Country
  age: number
  avatar_color: string
  avatar_accessory: string
  xp: number
  game_currency: number
  is_verified: boolean
  parent_id: string | null
  gender_filter: 'all' | 'same'
  only_verified_partners: boolean
  created_at: string
}

export interface MissionProgress {
  id: string
  user_id: string
  role: Role
  mission_number: number
  status: MissionStatus
  score: number
  metrics: MissionMetrics
  completed_at: string | null
  created_at: string
}

export interface MissionMetrics {
  decision_time_avg: number   // среднее время на решение (сек)
  attempts: number            // количество попыток
  style: 'fast' | 'analytical' | 'balanced'
  creativity_score: number    // 0–100
  precision_score: number     // 0–100
  teamwork_score: number      // 0–100 (только кооп)
}

export interface CoopSession {
  id: string
  mission_template: string
  status: CoopStatus
  created_by: string
  created_at: string
  updated_at: string
  participants?: CoopParticipant[]
}

export interface CoopParticipant {
  id: string
  coop_session_id: string
  user_id: string
  role: Role
  progress: object
  is_completed: boolean
  last_active_at: string
  profile?: Profile
}

export interface ChatMessage {
  id: string
  coop_session_id: string
  user_id: string
  content: string
  is_preset: boolean
  preset_key: string | null
  created_at: string
  profile?: Pick<Profile, 'username' | 'country'>
}

export interface Badge {
  id: string
  key: string
  name_en: string
  name_ru: string
  name_ar: string
  description_en: string
  icon: string
  xp_reward: number
}

export interface UserBadge {
  id: string
  user_id: string
  badge_id: string
  earned_at: string
  badge?: Badge
}

export interface CompetencyScore {
  user_id: string
  technical_precision: number
  analytical_thinking: number
  creativity: number
  teamwork: number
  management: number
  learning_speed: number
  updated_at: string
}
