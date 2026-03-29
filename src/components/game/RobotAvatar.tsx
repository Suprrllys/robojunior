'use client'

import type { Role } from '@/types/database'

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

function darken(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (num >> 16) - amount)
  const g = Math.max(0, ((num >> 8) & 0x00ff) - amount)
  const b = Math.max(0, (num & 0x0000ff) - amount)
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`
}

function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + amount)
  const g = Math.min(255, ((num >> 8) & 0x00ff) + amount)
  const b = Math.min(255, (num & 0x0000ff) + amount)
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`
}

// ---------------------------------------------------------------------------
// Accessory SVG overlays — enhanced for visibility at all sizes
// ---------------------------------------------------------------------------

function AccessoryAntenna() {
  return (
    <g>
      {/* Taller antenna pole */}
      <line x1="50" y1="16" x2="50" y2="2" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
      {/* Larger glowing ball */}
      <circle cx="50" cy="2" r="4" fill="#F59E0B" />
      <circle cx="50" cy="2" r="2.5" fill="#FBBF24">
        <animate attributeName="r" values="2;3.5;2" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="50" cy="2" r="1.5" fill="#FEF3C7" opacity="0.9">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="1.5s" repeatCount="indefinite" />
      </circle>
    </g>
  )
}

function AccessoryHat() {
  return (
    <g>
      {/* Hard hat brim */}
      <rect x="28" y="12" width="44" height="8" rx="3" fill="#F59E0B" stroke="#D97706" strokeWidth="1.2" />
      {/* Hard hat dome */}
      <path d="M34 14 Q34 4 50 2 Q66 4 66 14" fill="#F59E0B" stroke="#D97706" strokeWidth="1.2" />
      {/* Highlight stripe */}
      <path d="M38 10 Q50 6 62 10" fill="none" stroke="#FDE68A" strokeWidth="1.5" opacity="0.6" />
    </g>
  )
}

function AccessoryVisor() {
  return (
    <g>
      {/* Visor band across eyes */}
      <rect x="28" y="24" width="44" height="12" rx="6" fill="#3B82F6" opacity="0.75" stroke="#60A5FA" strokeWidth="1.5" />
      {/* Shiny reflection */}
      <rect x="32" y="25" width="18" height="4" rx="2" fill="#93C5FD" opacity="0.4" />
      {/* Glowing scan line */}
      <line x1="30" y1="30" x2="70" y2="30" stroke="#93C5FD" strokeWidth="0.8" opacity="0.6">
        <animate attributeName="opacity" values="0.2;0.8;0.2" dur="2s" repeatCount="indefinite" />
      </line>
    </g>
  )
}

function AccessoryJetpack() {
  return (
    <g>
      {/* Left thruster */}
      <rect x="16" y="46" width="10" height="20" rx="4" fill="#6366F1" stroke="#818CF8" strokeWidth="1.2" />
      <rect x="18" y="48" width="6" height="4" rx="1" fill="#818CF8" opacity="0.5" />
      {/* Right thruster */}
      <rect x="74" y="46" width="10" height="20" rx="4" fill="#6366F1" stroke="#818CF8" strokeWidth="1.2" />
      <rect x="76" y="48" width="6" height="4" rx="1" fill="#818CF8" opacity="0.5" />
      {/* Flames */}
      <ellipse cx="21" cy="70" rx="4" ry="6" fill="#F59E0B" opacity="0.85">
        <animate attributeName="ry" values="5;8;5" dur="0.25s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="21" cy="70" rx="2" ry="4" fill="#FEF3C7" opacity="0.7">
        <animate attributeName="ry" values="3;5;3" dur="0.25s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="79" cy="70" rx="4" ry="6" fill="#F59E0B" opacity="0.85">
        <animate attributeName="ry" values="5;8;5" dur="0.25s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="79" cy="70" rx="2" ry="4" fill="#FEF3C7" opacity="0.7">
        <animate attributeName="ry" values="3;5;3" dur="0.25s" repeatCount="indefinite" />
      </ellipse>
    </g>
  )
}

function AccessoryCape() {
  return (
    <g>
      <path
        d="M30 45 Q22 60 18 82 Q50 76 82 82 Q78 60 70 45"
        fill="#EF4444"
        opacity="0.75"
        stroke="#DC2626"
        strokeWidth="1.2"
      />
      {/* Cape folds */}
      <path d="M35 50 Q40 65 30 78" fill="none" stroke="#B91C1C" strokeWidth="0.8" opacity="0.4" />
      <path d="M65 50 Q60 65 70 78" fill="none" stroke="#B91C1C" strokeWidth="0.8" opacity="0.4" />
    </g>
  )
}

function AccessoryLaserEyes() {
  return (
    <g>
      {/* Left laser beam */}
      <line x1="40" y1="30" x2="15" y2="42" stroke="#EF4444" strokeWidth="2.5" opacity="0.8">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="0.7s" repeatCount="indefinite" />
      </line>
      <line x1="40" y1="30" x2="15" y2="42" stroke="#FCA5A5" strokeWidth="1" opacity="0.6">
        <animate attributeName="opacity" values="0.2;0.8;0.2" dur="0.7s" repeatCount="indefinite" />
      </line>
      {/* Right laser beam */}
      <line x1="60" y1="30" x2="85" y2="42" stroke="#EF4444" strokeWidth="2.5" opacity="0.8">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="0.7s" repeatCount="indefinite" />
      </line>
      <line x1="60" y1="30" x2="85" y2="42" stroke="#FCA5A5" strokeWidth="1" opacity="0.6">
        <animate attributeName="opacity" values="0.2;0.8;0.2" dur="0.7s" repeatCount="indefinite" />
      </line>
      {/* Glowing eyes */}
      <circle cx="40" cy="30" r="3" fill="#EF4444" />
      <circle cx="40" cy="30" r="1.5" fill="#FCA5A5" />
      <circle cx="60" cy="30" r="3" fill="#EF4444" />
      <circle cx="60" cy="30" r="1.5" fill="#FCA5A5" />
    </g>
  )
}

function AccessoryWings({ color }: { color: string }) {
  const wingColor = lighten(color, 40)
  return (
    <g>
      {/* Left wing — larger, more distinct */}
      <path d="M24 50 Q6 38 4 52 Q6 58 14 58 Q18 57 24 54" fill={wingColor} opacity="0.6" stroke={color} strokeWidth="1.2" />
      <path d="M24 52 Q12 44 10 52" fill="none" stroke={color} strokeWidth="0.6" opacity="0.4" />
      {/* Right wing */}
      <path d="M76 50 Q94 38 96 52 Q94 58 86 58 Q82 57 76 54" fill={wingColor} opacity="0.6" stroke={color} strokeWidth="1.2" />
      <path d="M76 52 Q88 44 90 52" fill="none" stroke={color} strokeWidth="0.6" opacity="0.4" />
    </g>
  )
}

function AccessoryCrown() {
  return (
    <g>
      {/* Crown base */}
      <rect x="30" y="12" width="40" height="6" rx="1" fill="#F59E0B" stroke="#D97706" strokeWidth="1" />
      {/* Crown points */}
      <polygon points="30,12 34,2 40,10 50,-2 60,10 66,2 70,12" fill="#F59E0B" stroke="#D97706" strokeWidth="1" />
      {/* Jewels */}
      <circle cx="34" cy="5" r="2" fill="#EF4444" stroke="#B91C1C" strokeWidth="0.5" />
      <circle cx="50" cy="0" r="2.5" fill="#3B82F6" stroke="#2563EB" strokeWidth="0.5" />
      <circle cx="66" cy="5" r="2" fill="#10B981" stroke="#059669" strokeWidth="0.5" />
      {/* Sparkle on center jewel */}
      <circle cx="50" cy="0" r="1" fill="white" opacity="0.6">
        <animate attributeName="opacity" values="0.3;0.9;0.3" dur="2s" repeatCount="indefinite" />
      </circle>
    </g>
  )
}

// Map of accessory keys to renderers
const BEHIND_ACCESSORIES: Record<string, (props: { color: string }) => JSX.Element> = {
  cape: () => <AccessoryCape />,
  jetpack: () => <AccessoryJetpack />,
  wings: ({ color }) => <AccessoryWings color={color} />,
}

const FRONT_ACCESSORIES: Record<string, () => JSX.Element> = {
  antenna: AccessoryAntenna,
  hat: AccessoryHat,
  visor: AccessoryVisor,
  laser_eyes: AccessoryLaserEyes,
  crown: AccessoryCrown,
}

// ---------------------------------------------------------------------------
// Role-specific body details
// ---------------------------------------------------------------------------

function DroneDetails({ color, darkColor }: { color: string; darkColor: string }) {
  return (
    <>
      <ellipse cx="25" cy="25" rx="6" ry="3" fill={darkColor} opacity="0.6" />
      <ellipse cx="75" cy="25" rx="6" ry="3" fill={darkColor} opacity="0.6" />
      <circle cx="50" cy="16" r="2" fill={color} />
    </>
  )
}

function RobotDetails({ darkColor }: { darkColor: string }) {
  return (
    <>
      <circle cx="33" cy="52" r="2" fill={darkColor} />
      <circle cx="67" cy="52" r="2" fill={darkColor} />
      <rect x="40" y="48" width="20" height="12" rx="3" fill={darkColor} opacity="0.4" />
    </>
  )
}

function EntrepreneurDetails({ color }: { color: string }) {
  return (
    <polygon points="50,44 46,56 50,60 54,56" fill={color} opacity="0.6" />
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface RobotAvatarProps {
  role?: Role
  color: string
  accessory?: string
  equippedAccessories?: string[]
  size?: number
  animated?: boolean
  className?: string
}

export default function RobotAvatar({
  role,
  color = '#1E90FF',
  accessory = 'none',
  equippedAccessories = [],
  size = 64,
  animated = false,
  className = '',
}: RobotAvatarProps) {
  const darkColor = darken(color, 40)
  const lightColor = lighten(color, 60)

  const activeAccessories = equippedAccessories.length > 0
    ? equippedAccessories
    : accessory !== 'none' ? [accessory] : []

  // Unique ID to scope the animation keyframes (avoids clashes with multiple instances)
  const animClass = animated ? 'robot-avatar-float' : ''

  return (
    <div
      className={`inline-block ${animClass} ${className}`}
      style={{ width: size, height: size }}
    >
      <style>{`
        .robot-avatar-float {
          animation: robotFloat 3s ease-in-out infinite;
        }
        @keyframes robotFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
      >
        {/* Subtle shadow below the robot */}
        <ellipse cx="50" cy="94" rx="20" ry="3" fill="black" opacity="0.2">
          {animated && (
            <animate attributeName="rx" values="20;18;20" dur="3s" repeatCount="indefinite" />
          )}
        </ellipse>

        {/* Behind-body accessories (cape, jetpack, wings) */}
        {activeAccessories.map(key => {
          const Renderer = BEHIND_ACCESSORIES[key]
          return Renderer ? <Renderer key={key} color={color} /> : null
        })}

        {/* Legs */}
        <rect x="36" y="72" width="10" height="16" rx="3" fill={darkColor} />
        <rect x="54" y="72" width="10" height="16" rx="3" fill={darkColor} />
        <rect x="33" y="85" width="14" height="6" rx="3" fill={darkColor} />
        <rect x="53" y="85" width="14" height="6" rx="3" fill={darkColor} />

        {/* Body */}
        <rect x="30" y="44" width="40" height="30" rx="6" fill={color} stroke={darkColor} strokeWidth="1.5" />
        {/* Body panel detail */}
        <rect x="38" y="50" width="24" height="4" rx="2" fill={lightColor} opacity="0.3" />
        <circle cx="50" cy="60" r="3" fill={lightColor} opacity="0.25" />

        {/* Arms */}
        <rect x="20" y="46" width="10" height="22" rx="4" fill={color} stroke={darkColor} strokeWidth="1" />
        <rect x="70" y="46" width="10" height="22" rx="4" fill={color} stroke={darkColor} strokeWidth="1" />
        <circle cx="25" cy="70" r="4" fill={lightColor} />
        <circle cx="75" cy="70" r="4" fill={lightColor} />

        {/* Head */}
        <rect x="30" y="16" width="40" height="30" rx="8" fill={color} stroke={darkColor} strokeWidth="1.5" />

        {/* Eye sockets (slight depth) */}
        <circle cx="40" cy="30" r="5.5" fill={darkColor} opacity="0.3" />
        <circle cx="60" cy="30" r="5.5" fill={darkColor} opacity="0.3" />

        {/* Eyes */}
        <circle cx="40" cy="30" r="4.5" fill="white" />
        <circle cx="60" cy="30" r="4.5" fill="white" />
        {/* Pupils with subtle look animation */}
        <circle cx="41" cy="30" r="2.2" fill="#1E293B">
          {animated && (
            <animate attributeName="cx" values="41;42;41;40;41" dur="4s" repeatCount="indefinite" />
          )}
        </circle>
        <circle cx="61" cy="30" r="2.2" fill="#1E293B">
          {animated && (
            <animate attributeName="cx" values="61;62;61;60;61" dur="4s" repeatCount="indefinite" />
          )}
        </circle>
        {/* Eye highlights */}
        <circle cx="38" cy="28" r="1.2" fill="white" opacity="0.7" />
        <circle cx="58" cy="28" r="1.2" fill="white" opacity="0.7" />

        {/* Mouth */}
        <rect x="42" y="37" width="16" height="3" rx="1.5" fill={darkColor} />

        {/* Role details */}
        {role === 'drone_programmer' && <DroneDetails color={color} darkColor={darkColor} />}
        {role === 'robot_constructor' && <RobotDetails darkColor={darkColor} />}
        {role === 'entrepreneur' && <EntrepreneurDetails color={color} />}

        {/* Front-layer accessories (antenna, hat, visor, laser_eyes, crown) */}
        {activeAccessories.map(key => {
          const Renderer = FRONT_ACCESSORIES[key]
          return Renderer ? <Renderer key={key} /> : null
        })}
      </svg>
    </div>
  )
}
