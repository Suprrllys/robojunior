import type { Role } from '@/types/database'

interface RoleIconProps {
  role: Role
  /** Icon size in pixels (width & height of the SVG) */
  size?: number
  className?: string
}

/** SVG-based role icons matching the role selection page illustrations. */
export default function RoleIcon({ role, size = 80, className }: RoleIconProps) {
  switch (role) {
    case 'drone_programmer':
      return <DroneIcon size={size} className={className} />
    case 'robot_constructor':
      return <RobotIcon size={size} className={className} />
    case 'entrepreneur':
      return <EntrepreneurIcon size={size} className={className} />
  }
}

function DroneIcon({ size, className }: { size: number; className?: string }) {
  // Unique gradient IDs to avoid collisions when multiple icons render
  const gradId = 'drone-icon-bg'
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" className={className}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E3A5F" />
          <stop offset="1" stopColor="#0F172A" />
        </linearGradient>
      </defs>
      <rect width="80" height="80" rx="16" fill={`url(#${gradId})`} />
      {/* Drone body */}
      <rect x="30" y="36" width="20" height="10" rx="3" fill="#60A5FA" stroke="#3B82F6" strokeWidth="1" />
      {/* Camera */}
      <circle cx="40" cy="48" r="3" fill="#1E3A5F" stroke="#60A5FA" strokeWidth="0.5" />
      {/* Arms */}
      <line x1="30" y1="38" x2="16" y2="30" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="38" x2="64" y2="30" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
      <line x1="30" y1="44" x2="16" y2="52" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="44" x2="64" y2="52" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
      {/* Propellers */}
      <ellipse cx="16" cy="30" rx="8" ry="2" fill="#3B82F6" opacity="0.6">
        <animateTransform attributeName="transform" type="rotate" from="0 16 30" to="360 16 30" dur="0.5s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="64" cy="30" rx="8" ry="2" fill="#3B82F6" opacity="0.6">
        <animateTransform attributeName="transform" type="rotate" from="0 64 30" to="360 64 30" dur="0.5s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="16" cy="52" rx="8" ry="2" fill="#3B82F6" opacity="0.6">
        <animateTransform attributeName="transform" type="rotate" from="0 16 52" to="360 16 52" dur="0.5s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="64" cy="52" rx="8" ry="2" fill="#3B82F6" opacity="0.6">
        <animateTransform attributeName="transform" type="rotate" from="0 64 52" to="360 64 52" dur="0.5s" repeatCount="indefinite" />
      </ellipse>
      {/* LED lights */}
      <circle cx="34" cy="39" r="1.5" fill="#22C55E">
        <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="46" cy="39" r="1.5" fill="#EF4444">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

function RobotIcon({ size, className }: { size: number; className?: string }) {
  const gradId = 'robot-icon-bg'
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" className={className}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor="#064E3B" />
          <stop offset="1" stopColor="#0F172A" />
        </linearGradient>
      </defs>
      <rect width="80" height="80" rx="16" fill={`url(#${gradId})`} />
      {/* Main gear */}
      <circle cx="40" cy="36" r="14" fill="none" stroke="#34D399" strokeWidth="2.5" />
      <circle cx="40" cy="36" r="6" fill="#10B981" />
      {/* Gear teeth */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
        <rect
          key={angle}
          x="38" y="20" width="4" height="6" rx="1" fill="#34D399"
          transform={`rotate(${angle} 40 36)`}
        />
      ))}
      {/* Wrench */}
      <g transform="translate(52,50) rotate(-30)">
        <rect x="0" y="0" width="3" height="16" rx="1" fill="#9CA3AF" />
        <circle cx="1.5" cy="0" r="4" fill="none" stroke="#9CA3AF" strokeWidth="2" />
      </g>
      {/* Small gear */}
      <circle cx="26" cy="56" r="7" fill="none" stroke="#6EE7B7" strokeWidth="1.5" />
      <circle cx="26" cy="56" r="3" fill="#34D399" />
      {[0, 60, 120, 180, 240, 300].map(angle => (
        <rect
          key={`s${angle}`}
          x="25" y="48" width="2" height="3" rx="0.5" fill="#6EE7B7"
          transform={`rotate(${angle} 26 56)`}
        />
      ))}
      {/* Sparks */}
      <circle cx="58" cy="28" r="1" fill="#FDE68A">
        <animate attributeName="opacity" values="1;0;1" dur="0.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="62" cy="32" r="0.8" fill="#FDE68A">
        <animate attributeName="opacity" values="0;1;0" dur="1s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

function EntrepreneurIcon({ size, className }: { size: number; className?: string }) {
  const gradId = 'entre-icon-bg'
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" className={className}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor="#78350F" />
          <stop offset="1" stopColor="#0F172A" />
        </linearGradient>
      </defs>
      <rect width="80" height="80" rx="16" fill={`url(#${gradId})`} />
      {/* Chart bars */}
      <rect x="14" y="50" width="8" height="16" rx="2" fill="#F59E0B" opacity="0.6" />
      <rect x="26" y="40" width="8" height="26" rx="2" fill="#F59E0B" opacity="0.75" />
      <rect x="38" y="30" width="8" height="36" rx="2" fill="#F59E0B" opacity="0.9" />
      <rect x="50" y="22" width="8" height="44" rx="2" fill="#FFD700" />
      {/* Trend arrow */}
      <polyline points="18,48 30,38 42,28 54,20" fill="none" stroke="#FDE68A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points="54,16 58,22 50,22" fill="#FDE68A" />
      {/* Briefcase icon */}
      <rect x="58" y="52" width="14" height="10" rx="2" fill="#92400E" stroke="#B45309" strokeWidth="1" />
      <rect x="62" y="50" width="6" height="4" rx="1" fill="none" stroke="#B45309" strokeWidth="1" />
      <circle cx="65" cy="57" r="1.5" fill="#F59E0B" />
      {/* Stars */}
      <text x="62" y="38" fontSize="8" fill="#FDE68A" opacity="0.8">&#x2B50;</text>
    </svg>
  )
}
