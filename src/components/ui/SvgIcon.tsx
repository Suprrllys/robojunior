'use client'

/**
 * Shared colored SVG icon library for the entire app.
 * Each icon is a clean, colored SVG with optional animation.
 */

interface IconProps {
  size?: number
  className?: string
  animated?: boolean
}

// ─── NAV ICONS (colored) ────────────────────────────────────────────────────

export function IconRoles({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" fill="#3B82F6" opacity="0.9" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" fill="#22C55E" opacity="0.9" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" fill="#F59E0B" opacity="0.9" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" fill="#8B5CF6" opacity="0.9" />
    </svg>
  )
}

export function IconCoop({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="8" cy="7" r="3" fill="#3B82F6" />
      <path d="M2 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1" fill="#3B82F6" opacity="0.4" />
      <circle cx="16" cy="7" r="3" fill="#22C55E" />
      <path d="M14 20v-1a5 5 0 0 1 5-5h1a5 5 0 0 1 2 .4" fill="#22C55E" opacity="0.4" />
      <path d="M11 16l1.5 1.5 3-3" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconDashboard({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="14" width="4" height="7" rx="1" fill="#3B82F6" />
      <rect x="10" y="9" width="4" height="12" rx="1" fill="#22C55E" />
      <rect x="17" y="4" width="4" height="17" rx="1" fill="#F59E0B" />
    </svg>
  )
}

export function IconLeaderboard({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="14" width="5" height="7" rx="1" fill="#CD7F32" />
      <rect x="9.5" y="6" width="5" height="15" rx="1" fill="#FFD700" />
      <rect x="16" y="10" width="5" height="11" rx="1" fill="#C0C0C0" />
      <circle cx="12" cy="3.5" r="2" fill="#FFD700" stroke="#D97706" strokeWidth="0.5" />
    </svg>
  )
}

export function IconShop({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M3 3h2l.4 2M7 13h10l4-8H5.4" stroke="#8B5CF6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="19" r="2" fill="#8B5CF6" />
      <circle cx="17" cy="19" r="2" fill="#8B5CF6" />
      <path d="M10 8h4M12 6v4" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function IconProfile({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="8" r="4" fill="#3B82F6" />
      <path d="M4 21v-1a6 6 0 0 1 12 0v1" fill="#3B82F6" opacity="0.35" />
      <circle cx="18" cy="6" r="2.5" fill="#22C55E" opacity="0.8" />
      <path d="M17 6l1 1 2-2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── COOP ICONS ─────────────────────────────────────────────────────────────

export function IconTrophy({ size = 28, className, animated }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <path d="M10 6h12v10c0 3.3-2.7 6-6 6s-6-2.7-6-6V6z" fill="#FFD700" stroke="#D97706" strokeWidth="1.2" />
      <path d="M10 10H6c0 4 2 6 4 7" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M22 10h4c0 4-2 6-4 7" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="13" y="22" width="6" height="3" rx="1" fill="#D97706" />
      <rect x="10" y="25" width="12" height="2" rx="1" fill="#B45309" />
      {animated && (
        <circle cx="16" cy="13" r="2" fill="#FEF3C7">
          <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  )
}

export function IconHandshake({ size = 28, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <path d="M4 14l6-4h4l3 3" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28 14l-6-4h-4l-3 3" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 17l2 2 4-2 3 3" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 22l3 3 3-1" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 22l-3 3-3-1" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconTarget({ size = 28, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="16" cy="16" r="12" stroke="#8B5CF6" strokeWidth="2" opacity="0.3" />
      <circle cx="16" cy="16" r="8" stroke="#8B5CF6" strokeWidth="2" opacity="0.6" />
      <circle cx="16" cy="16" r="4" fill="#8B5CF6" />
      <circle cx="16" cy="16" r="1.5" fill="white" />
    </svg>
  )
}

export function IconGlobe({ size = 28, className, animated }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="16" cy="16" r="12" fill="#22C55E" opacity="0.15" stroke="#22C55E" strokeWidth="1.5" />
      <ellipse cx="16" cy="16" rx="6" ry="12" stroke="#22C55E" strokeWidth="1.2" />
      <line x1="4" y1="12" x2="28" y2="12" stroke="#22C55E" strokeWidth="1" opacity="0.5" />
      <line x1="4" y1="20" x2="28" y2="20" stroke="#22C55E" strokeWidth="1" opacity="0.5" />
      {animated && (
        <circle cx="22" cy="8" r="3" fill="#3B82F6" opacity="0.7">
          <animate attributeName="opacity" values="0.7;0.3;0.7" dur="3s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  )
}

export function IconCity({ size = 36, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      <rect x="5" y="16" width="8" height="20" rx="1" fill="#3B82F6" opacity="0.8" />
      <rect x="16" y="8" width="8" height="28" rx="1" fill="#60A5FA" />
      <rect x="27" y="12" width="8" height="24" rx="1" fill="#3B82F6" opacity="0.8" />
      <rect x="7" y="19" width="2" height="2" rx="0.5" fill="#FDE68A" />
      <rect x="7" y="24" width="2" height="2" rx="0.5" fill="#FDE68A" />
      <rect x="18" y="11" width="2" height="2" rx="0.5" fill="#FDE68A" />
      <rect x="18" y="16" width="2" height="2" rx="0.5" fill="#FDE68A" />
      <rect x="18" y="21" width="2" height="2" rx="0.5" fill="#FDE68A" />
      <rect x="29" y="15" width="2" height="2" rx="0.5" fill="#FDE68A" />
      <rect x="29" y="20" width="2" height="2" rx="0.5" fill="#FDE68A" />
      <rect x="22" y="11" width="2" height="2" rx="0.5" fill="#FDE68A" />
      <rect x="22" y="16" width="2" height="2" rx="0.5" fill="#FDE68A" />
      <line x1="0" y1="36" x2="40" y2="36" stroke="#475569" strokeWidth="1" />
    </svg>
  )
}

export function IconFarm({ size = 36, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      <path d="M8 36V20l8-6 8 6v16" fill="#22C55E" opacity="0.2" stroke="#22C55E" strokeWidth="1.2" />
      <rect x="13" y="24" width="6" height="12" rx="1" fill="#15803D" />
      <line x1="28" y1="10" x2="28" y2="36" stroke="#92400E" strokeWidth="2" />
      <path d="M28 10c3 0 8 3 8 8" stroke="#22C55E" strokeWidth="2" fill="none" />
      <path d="M28 14c-3 0-7 2-7 6" stroke="#22C55E" strokeWidth="2" fill="none" />
      <path d="M28 10c-2-2-1-6 0-8 1 2 2 6 0 8z" fill="#22C55E" />
      <line x1="4" y1="36" x2="22" y2="36" stroke="#92400E" strokeWidth="1" opacity="0.4" />
    </svg>
  )
}

export function IconRocket({ size = 36, className, animated }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      <path d="M20 4c-4 6-6 14-6 22h12c0-8-2-16-6-22z" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="1" />
      <path d="M14 26c-4-2-6 0-6 4h6" fill="#3B82F6" />
      <path d="M26 26c4-2 6 0 6 4h-6" fill="#3B82F6" />
      <circle cx="20" cy="16" r="3" fill="#EF4444" stroke="#DC2626" strokeWidth="0.5" />
      <path d="M17 30h6" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
      {animated && (
        <g>
          <path d="M18 34l-1 4" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round">
            <animate attributeName="opacity" values="1;0.3;1" dur="0.5s" repeatCount="indefinite" />
          </path>
          <path d="M20 34v5" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="0.4s" repeatCount="indefinite" />
          </path>
          <path d="M22 34l1 4" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round">
            <animate attributeName="opacity" values="1;0.3;1" dur="0.6s" repeatCount="indefinite" />
          </path>
        </g>
      )}
    </svg>
  )
}

// ─── DASHBOARD STAT ICONS (animated) ────────────────────────────────────────

export function IconStar({ size = 28, className, animated }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <polygon
        points="16,3 20,11 29,12 22.5,18.5 24,28 16,23.5 8,28 9.5,18.5 3,12 12,11"
        fill="#FFD700"
        stroke="#D97706"
        strokeWidth="1"
      />
      {animated && (
        <polygon
          points="16,3 20,11 29,12 22.5,18.5 24,28 16,23.5 8,28 9.5,18.5 3,12 12,11"
          fill="white"
          opacity="0"
        >
          <animate attributeName="opacity" values="0;0.4;0" dur="2.5s" repeatCount="indefinite" />
        </polygon>
      )}
    </svg>
  )
}

export function IconMissions({ size = 28, className, animated }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="16" cy="16" r="12" stroke="#EF4444" strokeWidth="2.5" opacity="0.25" />
      <circle cx="16" cy="16" r="8" stroke="#EF4444" strokeWidth="2" opacity="0.5" />
      <circle cx="16" cy="16" r="4" fill="#EF4444" />
      {animated && (
        <>
          <line x1="16" y1="2" x2="16" y2="6" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round">
            <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
          </line>
          <circle cx="16" cy="16" r="4" fill="white" opacity="0">
            <animate attributeName="opacity" values="0;0.5;0" dur="2s" repeatCount="indefinite" />
          </circle>
        </>
      )}
    </svg>
  )
}

export function IconRolesExplored({ size = 28, className, animated }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="10" cy="13" r="6" fill="#3B82F6" opacity="0.3" />
      <circle cx="22" cy="13" r="6" fill="#22C55E" opacity="0.3" />
      <circle cx="16" cy="22" r="6" fill="#F59E0B" opacity="0.3" />
      <circle cx="10" cy="13" r="3" fill="#3B82F6" />
      <circle cx="22" cy="13" r="3" fill="#22C55E" />
      <circle cx="16" cy="22" r="3" fill="#F59E0B" />
      {animated && (
        <g>
          <circle cx="10" cy="13" r="6" stroke="#3B82F6" strokeWidth="1" fill="none" opacity="0">
            <animate attributeName="opacity" values="0;0.6;0" dur="3s" repeatCount="indefinite" />
            <animate attributeName="r" values="6;8;6" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx="22" cy="13" r="6" stroke="#22C55E" strokeWidth="1" fill="none" opacity="0">
            <animate attributeName="opacity" values="0;0.6;0" dur="3s" begin="1s" repeatCount="indefinite" />
            <animate attributeName="r" values="6;8;6" dur="3s" begin="1s" repeatCount="indefinite" />
          </circle>
          <circle cx="16" cy="22" r="6" stroke="#F59E0B" strokeWidth="1" fill="none" opacity="0">
            <animate attributeName="opacity" values="0;0.6;0" dur="3s" begin="2s" repeatCount="indefinite" />
            <animate attributeName="r" values="6;8;6" dur="3s" begin="2s" repeatCount="indefinite" />
          </circle>
        </g>
      )}
    </svg>
  )
}

// ─── CAREER / PROFESSION ICONS (animated) ───────────────────────────────────

export function IconDrone({ size = 36, className, animated }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      <g>
        {animated && <animateTransform attributeName="transform" type="translate" values="0,0;0,-1;0,0" dur="2s" repeatCount="indefinite" />}
        <line x1="10" y1="16" x2="30" y2="16" stroke="#3B82F6" strokeWidth="2" />
        <rect x="16" y="14" width="8" height="8" rx="2" fill="#3B82F6" />
        <circle cx="6" cy="16" r="4" stroke="#60A5FA" strokeWidth="1.5" fill="#3B82F6" opacity="0.5" />
        <circle cx="34" cy="16" r="4" stroke="#60A5FA" strokeWidth="1.5" fill="#3B82F6" opacity="0.5" />
        <line x1="20" y1="22" x2="20" y2="28" stroke="#60A5FA" strokeWidth="1.5" />
        <circle cx="20" cy="30" r="2" fill="#EF4444" />
      </g>
    </svg>
  )
}

export function IconLaptop({ size = 36, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      <rect x="8" y="8" width="24" height="16" rx="2" fill="#374151" stroke="#6B7280" strokeWidth="1" />
      <rect x="10" y="10" width="20" height="12" rx="1" fill="#3B82F6" opacity="0.3" />
      <path d="M12 16h6M12 19h10" stroke="#60A5FA" strokeWidth="1" strokeLinecap="round" />
      <path d="M4 28h32l-2-4H6z" fill="#4B5563" />
    </svg>
  )
}

export function IconBrain({ size = 36, className, animated }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      <path d="M20 36V20" stroke="#8B5CF6" strokeWidth="1.5" />
      <path d="M12 12c0-5 3-8 8-8s8 3 8 8" stroke="#A78BFA" strokeWidth="2" fill="none" />
      <path d="M8 18c-2 0-4-2-4-5s2-5 4-5c0-2 2-4 4-4" stroke="#8B5CF6" strokeWidth="1.5" fill="none" />
      <path d="M32 18c2 0 4-2 4-5s-2-5-4-5c0-2-2-4-4-4" stroke="#8B5CF6" strokeWidth="1.5" fill="none" />
      <path d="M8 18c0 4 5 6 12 6s12-2 12-6" stroke="#A78BFA" strokeWidth="2" fill="#8B5CF6" opacity="0.15" />
      {animated && (
        <g>
          <circle cx="14" cy="14" r="1.5" fill="#A78BFA">
            <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="26" cy="14" r="1.5" fill="#A78BFA">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="20" cy="10" r="1.5" fill="#C4B5FD">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
          </circle>
        </g>
      )}
    </svg>
  )
}

export function IconChart({ size = 36, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      <rect x="6" y="22" width="6" height="12" rx="1" fill="#3B82F6" />
      <rect x="14" y="16" width="6" height="18" rx="1" fill="#22C55E" />
      <rect x="22" y="10" width="6" height="24" rx="1" fill="#F59E0B" />
      <rect x="30" y="6" width="6" height="28" rx="1" fill="#EF4444" />
      <line x1="4" y1="34" x2="38" y2="34" stroke="#6B7280" strokeWidth="1" />
    </svg>
  )
}

export function IconRobot({ size = 36, className, animated }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      <rect x="12" y="14" width="16" height="14" rx="3" fill="#6B7280" stroke="#9CA3AF" strokeWidth="1" />
      <circle cx="17" cy="20" r="2.5" fill="#3B82F6" />
      <circle cx="23" cy="20" r="2.5" fill="#3B82F6" />
      <line x1="20" y1="8" x2="20" y2="14" stroke="#9CA3AF" strokeWidth="2" />
      <circle cx="20" cy="6" r="2.5" fill="#EF4444" />
      <rect x="8" y="18" width="3" height="8" rx="1.5" fill="#6B7280" />
      <rect x="29" y="18" width="3" height="8" rx="1.5" fill="#6B7280" />
      <rect x="14" y="30" width="4" height="5" rx="1" fill="#6B7280" />
      <rect x="22" y="30" width="4" height="5" rx="1" fill="#6B7280" />
      {animated && (
        <g>
          <circle cx="17" cy="20" r="2.5" fill="white" opacity="0">
            <animate attributeName="opacity" values="0;0.6;0" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="23" cy="20" r="2.5" fill="white" opacity="0">
            <animate attributeName="opacity" values="0;0.6;0" dur="2s" begin="0.3s" repeatCount="indefinite" />
          </circle>
        </g>
      )}
    </svg>
  )
}

export function IconGear({ size = 36, className, animated }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      <g>
        {animated && <animateTransform attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="8s" repeatCount="indefinite" />}
        <path d="M20 6l2 4h4l2-4h0l-1 4 3 2 3-3v0l-3 3 1 3 4 1v0l-4 1-1 3 3 3v0l-3-3-3 1-1 4h0l-2-4h-4l-2 4h0l1-4-3-2-3 3v0l3-3-1-3-4-1v0l4-1 1-3-3-3v0l3 3 3-1z" fill="#F59E0B" stroke="#D97706" strokeWidth="0.8" />
        <circle cx="20" cy="20" r="5" fill="#FEF3C7" stroke="#D97706" strokeWidth="1" />
      </g>
    </svg>
  )
}

export function IconSatellite({ size = 36, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      <rect x="16" y="16" width="8" height="8" rx="1" fill="#06B6D4" transform="rotate(45 20 20)" />
      <line x1="14" y1="14" x2="6" y2="6" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" />
      <line x1="26" y1="26" x2="34" y2="34" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" />
      <rect x="4" y="4" width="4" height="6" rx="1" fill="#0891B2" transform="rotate(-45 6 7)" />
      <rect x="32" y="32" width="4" height="6" rx="1" fill="#0891B2" transform="rotate(-45 34 35)" />
      <path d="M10 24a14 14 0 0 0 6 6" stroke="#06B6D4" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <path d="M6 28a18 18 0 0 0 6 6" stroke="#06B6D4" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
    </svg>
  )
}

export function IconMagnifier({ size = 36, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      <circle cx="17" cy="17" r="10" stroke="#8B5CF6" strokeWidth="2.5" fill="#8B5CF6" opacity="0.1" />
      <line x1="24" y1="24" x2="34" y2="34" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round" />
      <path d="M13 17h8M17 13v8" stroke="#A78BFA" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function IconClipboard({ size = 36, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      <rect x="8" y="6" width="24" height="30" rx="3" fill="#374151" stroke="#6B7280" strokeWidth="1" />
      <rect x="14" y="3" width="12" height="6" rx="2" fill="#6B7280" />
      <line x1="13" y1="16" x2="27" y2="16" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="13" y1="21" x2="24" y2="21" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="13" y1="26" x2="20" y2="26" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M23 25l2 2 4-4" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconChartUp({ size = 36, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      <polyline points="4,30 12,22 20,26 28,14 36,8" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <polygon points="4,30 12,22 20,26 28,14 36,8 36,34 4,34" fill="#22C55E" opacity="0.15" />
      <circle cx="36" cy="8" r="3" fill="#22C55E" />
      <line x1="31" y1="8" x2="36" y2="8" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="36" y1="8" x2="36" y2="13" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function IconPalette({ size = 36, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      <path d="M20 4C10 4 4 12 4 20c0 6 4 10 8 10 2 0 3-1 3-3 0-1-0.5-2-0.5-3 0-2 1.5-3 3.5-3h3c7 0 14-3 14-10 0-5-6-7-15-7z" fill="#EC4899" opacity="0.15" stroke="#EC4899" strokeWidth="1.5" />
      <circle cx="14" cy="14" r="3" fill="#EF4444" />
      <circle cx="22" cy="11" r="3" fill="#F59E0B" />
      <circle cx="28" cy="16" r="3" fill="#22C55E" />
      <circle cx="26" cy="24" r="3" fill="#3B82F6" />
    </svg>
  )
}

export function IconMarketing({ size = 36, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      <circle cx="20" cy="20" r="14" stroke="#EF4444" strokeWidth="2" opacity="0.2" />
      <circle cx="20" cy="20" r="9" stroke="#EF4444" strokeWidth="2" opacity="0.4" />
      <circle cx="20" cy="20" r="4" fill="#EF4444" />
      <line x1="30" y1="6" x2="22" y2="16" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
      <polygon points="30,3 34,6 30,9 31,6" fill="#F59E0B" />
    </svg>
  )
}

// ─── ACHIEVEMENT ICONS ──────────────────────────────────────────────────────

export function IconAchDrone({ size = 28, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <line x1="6" y1="12" x2="26" y2="12" stroke="#3B82F6" strokeWidth="2" />
      <rect x="12" y="10" width="8" height="6" rx="2" fill="#3B82F6" />
      <circle cx="4" cy="12" r="3" fill="#60A5FA" opacity="0.6" />
      <circle cx="28" cy="12" r="3" fill="#60A5FA" opacity="0.6" />
      <line x1="16" y1="16" x2="16" y2="22" stroke="#60A5FA" strokeWidth="1.5" />
      <circle cx="16" cy="24" r="2" fill="#EF4444" />
    </svg>
  )
}

export function IconAchRobot({ size = 28, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <rect x="10" y="12" width="12" height="10" rx="2" fill="#6B7280" stroke="#9CA3AF" strokeWidth="1" />
      <circle cx="14" cy="16" r="2" fill="#22C55E" />
      <circle cx="18" cy="16" r="2" fill="#22C55E" />
      <line x1="16" y1="6" x2="16" y2="12" stroke="#9CA3AF" strokeWidth="1.5" />
      <circle cx="16" cy="4.5" r="2" fill="#EF4444" />
      <rect x="7" y="14" width="2" height="6" rx="1" fill="#6B7280" />
      <rect x="23" y="14" width="2" height="6" rx="1" fill="#6B7280" />
      <rect x="11" y="23" width="3" height="4" rx="1" fill="#6B7280" />
      <rect x="18" y="23" width="3" height="4" rx="1" fill="#6B7280" />
    </svg>
  )
}

export function IconAchBusiness({ size = 28, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <rect x="6" y="12" width="20" height="14" rx="2" fill="#F59E0B" stroke="#D97706" strokeWidth="1" />
      <rect x="12" y="8" width="8" height="6" rx="1" fill="none" stroke="#D97706" strokeWidth="1.5" />
      <line x1="6" y1="18" x2="26" y2="18" stroke="#D97706" strokeWidth="1" />
      <rect x="14" y="16" width="4" height="4" rx="1" fill="#FEF3C7" />
    </svg>
  )
}

export function IconAchGlobal({ size = 28, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="16" cy="16" r="12" fill="#22C55E" opacity="0.15" stroke="#22C55E" strokeWidth="1.5" />
      <ellipse cx="16" cy="16" rx="5" ry="12" stroke="#22C55E" strokeWidth="1" />
      <line x1="4" y1="12" x2="28" y2="12" stroke="#22C55E" strokeWidth="0.8" opacity="0.5" />
      <line x1="4" y1="20" x2="28" y2="20" stroke="#22C55E" strokeWidth="0.8" opacity="0.5" />
      <circle cx="22" cy="8" r="4" fill="#FFD700" stroke="#D97706" strokeWidth="0.8" />
      <polygon points="22,5.5 23,7.5 25,7.5 23.5,9 24,11 22,9.8 20,11 20.5,9 19,7.5 21,7.5" fill="#FEF3C7" />
    </svg>
  )
}

// ─── CAREER-SPECIFIC PROFESSION MAP ─────────────────────────────────────────

const PROFESSION_ICON_MAP: Record<string, (props: IconProps) => JSX.Element> = {
  'Drone Systems Programmer': IconDrone,
  'Software Developer': IconLaptop,
  'AI / Machine Learning Engineer': IconBrain,
  'Data Scientist': IconChart,
  'Robotics Engineer': IconRobot,
  'Mechanical Engineer': IconGear,
  'IoT / Embedded Systems Engineer': IconSatellite,
  'Quality Assurance Engineer': IconMagnifier,
  'Tech Entrepreneur / Startup Founder': IconRocket,
  'Product Manager': IconClipboard,
  'Business Analyst': IconChartUp,
  'Marketing Strategist': IconMarketing,
  'UX Designer': IconPalette,
}

export function ProfessionIcon({ title, size = 36, animated = true }: { title: string; size?: number; animated?: boolean }) {
  const IconComponent = PROFESSION_ICON_MAP[title]
  if (!IconComponent) return <IconRobot size={size} animated={animated} />
  return <IconComponent size={size} animated={animated} />
}

// ─── ACHIEVEMENT ICON BY ID ─────────────────────────────────────────────────

export function AchievementIcon({ id, size = 28 }: { id: string; size?: number }) {
  if (id.startsWith('drone')) return <IconAchDrone size={size} />
  if (id.startsWith('robot')) return <IconAchRobot size={size} />
  if (id.startsWith('entrepreneur')) return <IconAchBusiness size={size} />
  if (id === 'brics_founder_skin') return <IconAchGlobal size={size} />
  return <IconStar size={size} />
}

// ─── GOLD COIN ICON (replaces moneybag emoji) ──────────────────────────────

export function IconCoin({ size = 24, className, animated }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" fill="#FFD700" stroke="#D97706" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="7" fill="none" stroke="#D97706" strokeWidth="0.8" opacity="0.5" />
      <circle cx="12" cy="12" r="3" fill="#FEF3C7" opacity="0.6" />
      {animated && (
        <circle cx="12" cy="12" r="10" fill="white" opacity="0">
          <animate attributeName="opacity" values="0;0.3;0" dur="2s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  )
}

// ─── LEADERBOARD MEDAL ICONS ────────────────────────────────────────────────

export function IconMedalGold({ size = 28, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <path d="M12 4h8l2 8h-12z" fill="#3B82F6" opacity="0.8" />
      <path d="M14 4h4l1 8h-6z" fill="#60A5FA" opacity="0.6" />
      <circle cx="16" cy="20" r="9" fill="#FFD700" stroke="#D97706" strokeWidth="1.5" />
      <circle cx="16" cy="20" r="6" fill="none" stroke="#D97706" strokeWidth="0.8" opacity="0.5" />
      <polygon points="16,14 17.8,18 22,18.5 18.8,21.2 19.6,25.5 16,23.2 12.4,25.5 13.2,21.2 10,18.5 14.2,18" fill="#FEF3C7" />
    </svg>
  )
}

export function IconMedalSilver({ size = 28, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <path d="M12 4h8l2 8h-12z" fill="#3B82F6" opacity="0.8" />
      <path d="M14 4h4l1 8h-6z" fill="#60A5FA" opacity="0.6" />
      <circle cx="16" cy="20" r="9" fill="#C0C0C0" stroke="#9CA3AF" strokeWidth="1.5" />
      <circle cx="16" cy="20" r="6" fill="none" stroke="#9CA3AF" strokeWidth="0.8" opacity="0.5" />
      <text x="16" y="23" textAnchor="middle" fill="#6B7280" fontSize="10" fontWeight="bold">2</text>
    </svg>
  )
}

export function IconMedalBronze({ size = 28, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <path d="M12 4h8l2 8h-12z" fill="#3B82F6" opacity="0.8" />
      <path d="M14 4h4l1 8h-6z" fill="#60A5FA" opacity="0.6" />
      <circle cx="16" cy="20" r="9" fill="#CD7F32" stroke="#92400E" strokeWidth="1.5" />
      <circle cx="16" cy="20" r="6" fill="none" stroke="#92400E" strokeWidth="0.8" opacity="0.5" />
      <text x="16" y="23" textAnchor="middle" fill="#78350F" fontSize="10" fontWeight="bold">3</text>
    </svg>
  )
}

// ─── ROLE ICONS FOR DASHBOARD PROGRESS ──────────────────────────────────────

export function IconDroneMini({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <line x1="4" y1="9" x2="20" y2="9" stroke="#3B82F6" strokeWidth="1.5" />
      <rect x="9" y="7" width="6" height="5" rx="1.5" fill="#3B82F6" />
      <circle cx="3" cy="9" r="2.5" fill="#60A5FA" opacity="0.6" />
      <circle cx="21" cy="9" r="2.5" fill="#60A5FA" opacity="0.6" />
      <line x1="12" y1="12" x2="12" y2="16" stroke="#60A5FA" strokeWidth="1" />
      <circle cx="12" cy="18" r="1.5" fill="#EF4444" />
    </svg>
  )
}

export function IconRobotMini({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="7" y="8" width="10" height="8" rx="2" fill="#22C55E" stroke="#16A34A" strokeWidth="0.8" />
      <circle cx="10" cy="11" r="1.5" fill="white" />
      <circle cx="14" cy="11" r="1.5" fill="white" />
      <line x1="12" y1="4" x2="12" y2="8" stroke="#16A34A" strokeWidth="1.5" />
      <circle cx="12" cy="3" r="1.5" fill="#EF4444" />
      <rect x="5" y="10" width="1.5" height="4" rx="0.75" fill="#22C55E" />
      <rect x="17.5" y="10" width="1.5" height="4" rx="0.75" fill="#22C55E" />
      <rect x="8.5" y="17" width="2.5" height="3" rx="0.8" fill="#22C55E" />
      <rect x="13" y="17" width="2.5" height="3" rx="0.8" fill="#22C55E" />
    </svg>
  )
}

export function IconLightbulb({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 3C8.7 3 6 5.7 6 9c0 2.2 1.2 4.1 3 5.2V16a1 1 0 001 1h4a1 1 0 001-1v-1.8c1.8-1.1 3-3 3-5.2 0-3.3-2.7-6-6-6z" fill="#F59E0B" stroke="#D97706" strokeWidth="1" />
      <rect x="9" y="18" width="6" height="1.5" rx="0.75" fill="#D97706" />
      <rect x="10" y="20.5" width="4" height="1.5" rx="0.75" fill="#D97706" />
      <path d="M10 9h4M12 7v4" stroke="#FEF3C7" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
    </svg>
  )
}

// ─── SHOP CATEGORY ICONS ────────────────────────────────────────────────────

export function IconCatHead({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="8" fill="#3B82F6" opacity="0.2" stroke="#3B82F6" strokeWidth="1.5" />
      <circle cx="9" cy="11" r="1.5" fill="white" /><circle cx="9" cy="11" r="0.8" fill="#1E3A5F" />
      <circle cx="15" cy="11" r="1.5" fill="white" /><circle cx="15" cy="11" r="0.8" fill="#1E3A5F" />
      <line x1="10" y1="15" x2="14" y2="15" stroke="#3B82F6" strokeWidth="1" strokeLinecap="round" />
    </svg>
  )
}

export function IconCatEyes({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="8" cy="12" r="4" fill="white" stroke="#8B5CF6" strokeWidth="1" />
      <circle cx="16" cy="12" r="4" fill="white" stroke="#8B5CF6" strokeWidth="1" />
      <circle cx="8" cy="12" r="2" fill="#8B5CF6" />
      <circle cx="16" cy="12" r="2" fill="#8B5CF6" />
      <circle cx="9" cy="11" r="0.8" fill="white" />
      <circle cx="17" cy="11" r="0.8" fill="white" />
    </svg>
  )
}

export function IconCatOutfit({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M7 6L5 10l2 0v10h10V10l2 0-2-4-3 2h-4z" fill="#EF4444" stroke="#DC2626" strokeWidth="1" />
      <line x1="12" y1="8" x2="12" y2="14" stroke="#DC2626" strokeWidth="0.8" opacity="0.6" />
    </svg>
  )
}

export function IconCatAccessory({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <ellipse cx="12" cy="14" rx="9" ry="3" fill="#F59E0B" stroke="#D97706" strokeWidth="0.8" />
      <path d="M6 14V8a6 6 0 0112 0v6" fill="#F59E0B" stroke="#D97706" strokeWidth="1" />
      <rect x="10" y="5" width="4" height="3" rx="1" fill="#FEF3C7" opacity="0.5" />
    </svg>
  )
}

export function IconCatItem({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M15 4l5 5-10 10H5v-5z" fill="#EF4444" opacity="0.2" stroke="#EF4444" strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="13" y1="6" x2="18" y2="11" stroke="#EF4444" strokeWidth="1" />
    </svg>
  )
}

export function IconCatEffect({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <polygon points="12,2 13.5,8 20,9 14.5,13 16,20 12,16 8,20 9.5,13 4,9 10.5,8" fill="#EC4899" stroke="#DB2777" strokeWidth="0.8" />
      <polygon points="12,2 13.5,8 20,9 14.5,13 16,20 12,16 8,20 9.5,13 4,9 10.5,8" fill="white" opacity="0.3" />
    </svg>
  )
}

// ─── PROFILE EDITOR SECTION TAB ICONS ───────────────────────────────────────

export function IconTabPalette({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="7" cy="7" r="3" fill="#EF4444" />
      <circle cx="17" cy="7" r="3" fill="#F59E0B" />
      <circle cx="7" cy="17" r="3" fill="#3B82F6" />
      <circle cx="17" cy="17" r="3" fill="#22C55E" />
      <circle cx="12" cy="12" r="2" fill="#8B5CF6" />
    </svg>
  )
}

export function IconTabHead({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="10" r="7" fill="#60A5FA" stroke="#3B82F6" strokeWidth="1.2" />
      <circle cx="9" cy="9" r="1.5" fill="white" /><circle cx="9" cy="9" r="0.7" fill="#1E3A5F" />
      <circle cx="15" cy="9" r="1.5" fill="white" /><circle cx="15" cy="9" r="0.7" fill="#1E3A5F" />
      <line x1="10" y1="13" x2="14" y2="13" stroke="#3B82F6" strokeWidth="1" strokeLinecap="round" />
    </svg>
  )
}

export function IconTabOutfit({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M7 5L5 9l2 0v11h10V9l2 0-2-4-3 2h-4z" fill="#EF4444" stroke="#DC2626" strokeWidth="1" />
    </svg>
  )
}

export function IconTabItems({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="5" y="8" width="14" height="12" rx="2" fill="#92400E" stroke="#78350F" strokeWidth="1" />
      <rect x="8" y="5" width="8" height="5" rx="1" fill="none" stroke="#78350F" strokeWidth="1.5" />
      <circle cx="12" cy="14" r="1.5" fill="#F59E0B" />
    </svg>
  )
}

export function IconTabEffects({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <polygon points="12,2 14,8 20,9 15,13 16.5,20 12,16.5 7.5,20 9,13 4,9 10,8" fill="#FFD700" stroke="#D97706" strokeWidth="0.5" />
      <circle cx="5" cy="5" r="1.2" fill="#FDE68A" />
      <circle cx="19" cy="4" r="0.8" fill="#FDE68A" />
    </svg>
  )
}

export function IconTabSettings({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="3.5" fill="#9CA3AF" stroke="#6B7280" strokeWidth="1" />
      <path d="M12 2l1.5 3h-3zM12 22l-1.5-3h3zM2 12l3-1.5v3zM22 12l-3 1.5v-3zM4.9 4.9l2.8 1.2-1.2 1.2zM19.1 19.1l-2.8-1.2 1.2-1.2zM19.1 4.9l-1.2 2.8-1.2-1.2zM4.9 19.1l1.2-2.8 1.2 1.2z" fill="#6B7280" />
    </svg>
  )
}

// ─── ANIMATED GLOBE FOR COOP ────────────────────────────────────────────────

export function IconGlobeAnimated({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      <circle cx="20" cy="20" r="16" fill="#22C55E" opacity="0.15" stroke="#22C55E" strokeWidth="2" />
      <ellipse cx="20" cy="20" rx="8" ry="16" stroke="#22C55E" strokeWidth="1.5" />
      <line x1="4" y1="14" x2="36" y2="14" stroke="#22C55E" strokeWidth="1" opacity="0.5" />
      <line x1="4" y1="26" x2="36" y2="26" stroke="#22C55E" strokeWidth="1" opacity="0.5" />
      <circle cx="28" cy="10" r="4" fill="#3B82F6" opacity="0.7">
        <animate attributeName="opacity" values="0.7;0.3;0.7" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="12" cy="28" r="3" fill="#F59E0B" opacity="0.6">
        <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}
