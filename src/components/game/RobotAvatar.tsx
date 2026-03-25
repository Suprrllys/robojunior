'use client'

import { type Role } from '@/types/database'

interface RobotAvatarProps {
  role: Role
  color?: string
  accessory?: string
  size?: number
  animated?: boolean
}

const ROLE_ICONS: Record<Role, string> = {
  drone_programmer: '🛸',
  robot_constructor: '🤖',
  entrepreneur: '💡',
}

const ACCESSORY_ICONS: Record<string, string> = {
  none: '',
  antenna: '📡',
  hat: '⛑️',
  visor: '🥽',
  wings: '🪶',
  crown: '👑',
}

export default function RobotAvatar({
  role,
  color = '#1E90FF',
  accessory = 'none',
  size = 64,
  animated = false,
}: RobotAvatarProps) {
  const icon = ROLE_ICONS[role]
  const accessoryIcon = ACCESSORY_ICONS[accessory] || ''

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-2xl border-2 ${animated ? 'float' : ''}`}
      style={{
        width: size,
        height: size,
        backgroundColor: `${color}22`,
        borderColor: color,
        fontSize: size * 0.45,
        boxShadow: `0 0 ${size * 0.2}px ${color}44`,
      }}
    >
      <span>{icon}</span>
      {accessoryIcon && (
        <span
          className="absolute -top-2 -right-2 text-xs"
          style={{ fontSize: size * 0.25 }}
        >
          {accessoryIcon}
        </span>
      )}
    </div>
  )
}
