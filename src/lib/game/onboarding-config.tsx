import type { OnboardingStep, KBEntry } from '@/components/missions/common/MissionShell'
import { IconCoin, IconStar, IconTrophy, IconTarget, IconChartUp, IconGear, IconRobot, IconMagnifier, IconChart, IconHandshake } from '@/components/ui/SvgIcon'
import RoleIcon from '@/components/game/RoleIcon'

// ---------------------------------------------------------------------------
// Role-specific onboarding steps (shown on Mission 1 of each role, once only)
// ---------------------------------------------------------------------------

export const DRONE_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    titleKey: 'drone.role.step1.title',
    descriptionKey: 'drone.role.step1.description',
    imageComponent: <RoleIcon role="drone_programmer" size={80} />,
  },
  {
    titleKey: 'drone.role.step2.title',
    descriptionKey: 'drone.role.step2.description',
    imageComponent: (
      <div className="flex gap-3">
        <div className="w-14 h-14 rounded-xl bg-green-900/50 border border-green-600/30 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="4" y="8" width="8" height="16" rx="2" fill="#4ADE80" opacity="0.7" /><rect x="16" y="14" width="8" height="10" rx="2" fill="#4ADE80" opacity="0.4" /></svg>
        </div>
        <div className="w-14 h-14 rounded-xl bg-yellow-900/50 border border-yellow-600/30 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M4 20L8 8h4l4 12" stroke="#FACC15" strokeWidth="2" strokeLinecap="round" /><path d="M16 12h8M16 16h6M16 20h4" stroke="#FACC15" strokeWidth="2" strokeLinecap="round" opacity="0.6" /></svg>
        </div>
        <div className="w-14 h-14 rounded-xl bg-red-900/50 border border-red-600/30 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M6 6h6l-3 8h6l-8 10 2-7H6z" fill="#F87171" /><circle cx="20" cy="8" r="4" stroke="#F87171" strokeWidth="1.5" fill="none" /><path d="M18 8h4M20 6v4" stroke="#F87171" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </div>
      </div>
    ),
  },
  {
    titleKey: 'drone.role.step3.title',
    descriptionKey: 'drone.role.step3.description',
    imageComponent: (
      <div className="flex items-center gap-4">
        <IconTrophy size={32} animated />
        <IconStar size={32} animated />
        <IconCoin size={32} animated />
      </div>
    ),
  },
]

export const ROBOT_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    titleKey: 'robot.role.step1.title',
    descriptionKey: 'robot.role.step1.description',
    imageComponent: <RoleIcon role="robot_constructor" size={80} />,
  },
  {
    titleKey: 'robot.role.step2.title',
    descriptionKey: 'robot.role.step2.description',
    imageComponent: (
      <div className="flex gap-3">
        <div className="w-14 h-14 rounded-xl bg-emerald-900/50 border border-emerald-600/30 flex items-center justify-center">
          <IconGear size={28} animated />
        </div>
        <div className="w-14 h-14 rounded-xl bg-blue-900/50 border border-blue-600/30 flex items-center justify-center">
          <IconRobot size={28} animated />
        </div>
        <div className="w-14 h-14 rounded-xl bg-purple-900/50 border border-purple-600/30 flex items-center justify-center">
          <IconMagnifier size={28} />
        </div>
      </div>
    ),
  },
  {
    titleKey: 'robot.role.step3.title',
    descriptionKey: 'robot.role.step3.description',
    imageComponent: (
      <div className="flex items-center gap-4">
        <IconTarget size={32} />
        <IconStar size={32} animated />
        <IconCoin size={32} animated />
      </div>
    ),
  },
]

export const ENTREPRENEUR_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    titleKey: 'entrepreneur.role.step1.title',
    descriptionKey: 'entrepreneur.role.step1.description',
    imageComponent: <RoleIcon role="entrepreneur" size={80} />,
  },
  {
    titleKey: 'entrepreneur.role.step2.title',
    descriptionKey: 'entrepreneur.role.step2.description',
    imageComponent: (
      <div className="flex gap-3">
        <div className="w-14 h-14 rounded-xl bg-yellow-900/50 border border-yellow-600/30 flex items-center justify-center">
          <IconChart size={28} />
        </div>
        <div className="w-14 h-14 rounded-xl bg-orange-900/50 border border-orange-600/30 flex items-center justify-center">
          <IconHandshake size={28} />
        </div>
        <div className="w-14 h-14 rounded-xl bg-red-900/50 border border-red-600/30 flex items-center justify-center">
          <IconCoin size={28} animated />
        </div>
      </div>
    ),
  },
  {
    titleKey: 'entrepreneur.role.step3.title',
    descriptionKey: 'entrepreneur.role.step3.description',
    imageComponent: (
      <div className="flex items-center gap-4">
        <IconTarget size={32} />
        <IconChartUp size={32} />
        <IconTrophy size={32} animated />
      </div>
    ),
  },
]

// ---------------------------------------------------------------------------
// localStorage keys for per-role onboarding tracking
// ---------------------------------------------------------------------------

export const ONBOARDING_KEYS = {
  drone: 'robojunior_onboarded_drone',
  robot: 'robojunior_onboarded_robot',
  entrepreneur: 'robojunior_onboarded_entrepreneur',
} as const

/**
 * Check if role onboarding was already shown. Returns true if already completed.
 */
export function isRoleOnboarded(role: 'drone' | 'robot' | 'entrepreneur'): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEYS[role]) === 'true'
  } catch {
    return true // If localStorage unavailable, skip onboarding
  }
}

/**
 * Mark role onboarding as completed.
 */
export function markRoleOnboarded(role: 'drone' | 'robot' | 'entrepreneur'): void {
  try {
    localStorage.setItem(ONBOARDING_KEYS[role], 'true')
  } catch {
    // localStorage not available
  }
}

// ---------------------------------------------------------------------------
// Knowledge base content per role
// ---------------------------------------------------------------------------

export const DRONE_KNOWLEDGE_BASE: KBEntry[] = [
  { titleKey: 'drone_commands_title', contentKey: 'drone_commands_content', category: 'Programming' },
  { titleKey: 'drone_loops_title', contentKey: 'drone_loops_content', category: 'Programming' },
  { titleKey: 'drone_conditions_title', contentKey: 'drone_conditions_content', category: 'Programming' },
  { titleKey: 'drone_arrays_title', contentKey: 'drone_arrays_content', category: 'Programming' },
  { titleKey: 'drone_functions_title', contentKey: 'drone_functions_content', category: 'Programming' },
]

export const ROBOT_KNOWLEDGE_BASE: KBEntry[] = [
  { titleKey: 'robot_physics_title', contentKey: 'robot_physics_content', category: 'Engineering' },
  { titleKey: 'robot_materials_title', contentKey: 'robot_materials_content', category: 'Engineering' },
  { titleKey: 'robot_gears_title', contentKey: 'robot_gears_content', category: 'Engineering' },
  { titleKey: 'robot_energy_title', contentKey: 'robot_energy_content', category: 'Engineering' },
  { titleKey: 'robot_testing_title', contentKey: 'robot_testing_content', category: 'Engineering' },
]

export const ENTREPRENEUR_KNOWLEDGE_BASE: KBEntry[] = [
  { titleKey: 'entrepreneur_mvp_title', contentKey: 'entrepreneur_mvp_content', category: 'Business' },
  { titleKey: 'entrepreneur_unit_economics_title', contentKey: 'entrepreneur_unit_economics_content', category: 'Business' },
  { titleKey: 'entrepreneur_team_title', contentKey: 'entrepreneur_team_content', category: 'Business' },
  { titleKey: 'entrepreneur_pricing_title', contentKey: 'entrepreneur_pricing_content', category: 'Business' },
  { titleKey: 'entrepreneur_fundraising_title', contentKey: 'entrepreneur_fundraising_content', category: 'Business' },
]
