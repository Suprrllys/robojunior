'use client'

import { type AvatarConfig, DEFAULT_AVATAR } from '@/lib/game/shop-items'

interface AvatarPreviewProps {
  config: AvatarConfig
  size?: number
  className?: string
  /** Body color hex — defaults to #3B82F6 (blue) */
  bodyColor?: string
}

/**
 * Compute a darker shade for stroke/accent from body color.
 */
function darkenColor(hex: string): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 40)
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 40)
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 40)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * Compute a lighter shade for the head from body color.
 */
function lightenColor(hex: string): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + 40)
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + 40)
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + 40)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * Renders a robot character with visual customization.
 * All drawing is done via SVG for crisp rendering at any size.
 */
export default function AvatarPreview({ config, size = 120, className, bodyColor = '#3B82F6' }: AvatarPreviewProps) {
  const c = { ...DEFAULT_AVATAR, ...config }
  const strokeColor = darkenColor(bodyColor)
  const headColor = lightenColor(bodyColor)

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      style={{ overflow: 'visible' }}
    >
      {/* Effect layer (behind character) */}
      <EffectLayer effect={c.effect} />

      {/* Body */}
      <rect x="40" y="58" width="40" height="35" rx="6" fill={bodyColor} stroke={strokeColor} strokeWidth="1.5" />

      {/* Outfit overlay */}
      <OutfitLayer outfit={c.outfit} />

      {/* Arms */}
      <rect x="28" y="62" width="10" height="24" rx="5" fill={bodyColor} stroke={strokeColor} strokeWidth="1" />
      <rect x="82" y="62" width="10" height="24" rx="5" fill={bodyColor} stroke={strokeColor} strokeWidth="1" />

      {/* Held item (in right hand) */}
      <HeldItemLayer heldItem={c.heldItem} />

      {/* Legs */}
      <rect x="44" y="90" width="12" height="18" rx="4" fill={bodyColor} stroke={strokeColor} strokeWidth="1" />
      <rect x="64" y="90" width="12" height="18" rx="4" fill={bodyColor} stroke={strokeColor} strokeWidth="1" />

      {/* Feet */}
      <ellipse cx="50" cy="108" rx="8" ry="4" fill={strokeColor} />
      <ellipse cx="70" cy="108" rx="8" ry="4" fill={strokeColor} />

      {/* Head */}
      <HeadLayer headStyle={c.headStyle} headColor={headColor} strokeColor={bodyColor} />

      {/* Eyes */}
      <EyeLayer eyeStyle={c.eyeStyle} headStyle={c.headStyle} />

      {/* Mouth */}
      <line x1="54" y1="46" x2="66" y2="46" stroke="#1E3A5F" strokeWidth="2" strokeLinecap="round" />

      {/* Accessory (on top of head) */}
      <AccessoryLayer accessory={c.accessory} headStyle={c.headStyle} />
    </svg>
  )
}

function HeadLayer({ headStyle, headColor = '#60A5FA', strokeColor = '#3B82F6' }: { headStyle: string; headColor?: string; strokeColor?: string }) {
  switch (headStyle) {
    case 'square':
      return <rect x="35" y="18" width="50" height="40" rx="4" fill={headColor} stroke={strokeColor} strokeWidth="1.5" />
    case 'pointed':
      return (
        <g>
          <polygon points="60,12 35,52 85,52" fill={headColor} stroke={strokeColor} strokeWidth="1.5" strokeLinejoin="round" />
          <rect x="40" y="38" width="40" height="16" rx="3" fill={headColor} />
        </g>
      )
    case 'dome':
      return (
        <g>
          <ellipse cx="60" cy="38" rx="28" ry="24" fill={headColor} stroke={strokeColor} strokeWidth="1.5" />
        </g>
      )
    case 'horned':
      return (
        <g>
          <rect x="35" y="22" width="50" height="36" rx="8" fill={headColor} stroke={strokeColor} strokeWidth="1.5" />
          <polygon points="38,22 32,8 44,22" fill="#F59E0B" stroke="#D97706" strokeWidth="1" />
          <polygon points="82,22 88,8 76,22" fill="#F59E0B" stroke="#D97706" strokeWidth="1" />
        </g>
      )
    case 'cat':
      return (
        <g>
          <rect x="35" y="24" width="50" height="34" rx="8" fill={headColor} stroke={strokeColor} strokeWidth="1.5" />
          <polygon points="38,24 30,6 50,20" fill={headColor} stroke={strokeColor} strokeWidth="1.5" />
          <polygon points="82,24 90,6 70,20" fill={headColor} stroke={strokeColor} strokeWidth="1.5" />
          {/* Inner ear */}
          <polygon points="40,22 34,10 48,20" fill="#F9A8D4" />
          <polygon points="80,22 86,10 72,20" fill="#F9A8D4" />
        </g>
      )
    default: // round
      return <rect x="35" y="20" width="50" height="38" rx="14" fill={headColor} stroke={strokeColor} strokeWidth="1.5" />
  }
}

function EyeLayer({ eyeStyle, headStyle }: { eyeStyle: string; headStyle: string }) {
  const eyeY = headStyle === 'pointed' ? 42 : headStyle === 'dome' ? 36 : 38

  switch (eyeStyle) {
    case 'visor':
      return <rect x="42" y={eyeY - 4} width="36" height="8" rx="4" fill="#1E3A5F" opacity="0.9" />
    case 'angry':
      return (
        <g>
          <circle cx="50" cy={eyeY} r="4" fill="white" />
          <circle cx="70" cy={eyeY} r="4" fill="white" />
          <circle cx="50" cy={eyeY} r="2" fill="#1E3A5F" />
          <circle cx="70" cy={eyeY} r="2" fill="#1E3A5F" />
          <line x1="46" y1={eyeY - 5} x2="54" y2={eyeY - 3} stroke="#1E3A5F" strokeWidth="2" strokeLinecap="round" />
          <line x1="74" y1={eyeY - 5} x2="66" y2={eyeY - 3} stroke="#1E3A5F" strokeWidth="2" strokeLinecap="round" />
        </g>
      )
    case 'happy':
      return (
        <g>
          <path d={`M46,${eyeY} Q50,${eyeY - 6} 54,${eyeY}`} fill="none" stroke="#1E3A5F" strokeWidth="2.5" strokeLinecap="round" />
          <path d={`M66,${eyeY} Q70,${eyeY - 6} 74,${eyeY}`} fill="none" stroke="#1E3A5F" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )
    case 'glasses':
      return (
        <g>
          <circle cx="50" cy={eyeY} r="7" fill="none" stroke="#1E3A5F" strokeWidth="1.5" />
          <circle cx="70" cy={eyeY} r="7" fill="none" stroke="#1E3A5F" strokeWidth="1.5" />
          <line x1="57" y1={eyeY} x2="63" y2={eyeY} stroke="#1E3A5F" strokeWidth="1.5" />
          <circle cx="50" cy={eyeY} r="3" fill="white" />
          <circle cx="70" cy={eyeY} r="3" fill="white" />
          <circle cx="50" cy={eyeY} r="1.5" fill="#1E3A5F" />
          <circle cx="70" cy={eyeY} r="1.5" fill="#1E3A5F" />
        </g>
      )
    default: // circle
      return (
        <g>
          <circle cx="50" cy={eyeY} r="5" fill="white" />
          <circle cx="70" cy={eyeY} r="5" fill="white" />
          <circle cx="50" cy={eyeY} r="2.5" fill="#1E3A5F" />
          <circle cx="70" cy={eyeY} r="2.5" fill="#1E3A5F" />
        </g>
      )
  }
}

function OutfitLayer({ outfit }: { outfit: string }) {
  switch (outfit) {
    case 'tshirt':
      return (
        <g>
          <rect x="40" y="58" width="40" height="20" rx="3" fill="#EF4444" opacity="0.9" />
          <line x1="60" y1="58" x2="60" y2="68" stroke="#DC2626" strokeWidth="1" />
        </g>
      )
    case 'hoodie':
      return (
        <g>
          <rect x="38" y="56" width="44" height="24" rx="5" fill="#6B7280" opacity="0.9" />
          <path d="M52,56 Q60,64 68,56" fill="#4B5563" />
          <rect x="48" y="68" width="24" height="10" rx="3" fill="#4B5563" />
        </g>
      )
    case 'labcoat':
      return (
        <g>
          <rect x="38" y="56" width="44" height="36" rx="3" fill="white" opacity="0.9" stroke="#E5E7EB" strokeWidth="1" />
          <line x1="60" y1="56" x2="60" y2="92" stroke="#E5E7EB" strokeWidth="1" />
          <circle cx="56" cy="68" r="2" fill="#D1D5DB" />
          <circle cx="56" cy="76" r="2" fill="#D1D5DB" />
        </g>
      )
    case 'suit':
      return (
        <g>
          <rect x="40" y="58" width="40" height="35" rx="3" fill="#1F2937" opacity="0.9" />
          <polygon points="52,58 60,70 68,58" fill="#374151" />
          <rect x="57" y="70" width="6" height="3" rx="1" fill="#EF4444" /> {/* tie */}
          <polygon points="60,73 56,82 64,82" fill="#EF4444" />
        </g>
      )
    case 'armor':
      return (
        <g>
          <rect x="38" y="56" width="44" height="36" rx="4" fill="#6B7280" opacity="0.95" stroke="#9CA3AF" strokeWidth="1.5" />
          <rect x="44" y="60" width="32" height="12" rx="2" fill="#9CA3AF" />
          <circle cx="60" cy="66" r="4" fill="#F59E0B" stroke="#D97706" strokeWidth="1" />
        </g>
      )
    case 'spacesuit':
      return (
        <g>
          <rect x="36" y="54" width="48" height="40" rx="8" fill="white" opacity="0.95" stroke="#D1D5DB" strokeWidth="1.5" />
          <rect x="44" y="62" width="12" height="8" rx="2" fill="#3B82F6" /> {/* patch */}
          <circle cx="72" cy="66" r="4" fill="#EF4444" /> {/* button */}
        </g>
      )
    case 'cape':
      return (
        <g>
          <path d="M42,58 L30,100 Q60,105 90,100 L78,58" fill="#7C3AED" opacity="0.7" />
          <rect x="42" y="56" width="36" height="6" rx="2" fill="#7C3AED" stroke="#6D28D9" strokeWidth="1" />
        </g>
      )
    default:
      return null
  }
}

function AccessoryLayer({ accessory, headStyle }: { accessory: string; headStyle: string }) {
  const topY = headStyle === 'dome' ? 14 : headStyle === 'pointed' ? 12 : 18

  switch (accessory) {
    case 'antenna':
      return (
        <g>
          <line x1="60" y1={topY} x2="60" y2={topY - 14} stroke="#9CA3AF" strokeWidth="2" />
          <circle cx="60" cy={topY - 16} r="3" fill="#EF4444" />
        </g>
      )
    case 'hardhat':
      return (
        <g>
          <ellipse cx="60" cy={topY + 2} rx="30" ry="6" fill="#F59E0B" />
          <rect x="42" y={topY - 8} width="36" height="12" rx="4" fill="#F59E0B" stroke="#D97706" strokeWidth="1" />
        </g>
      )
    case 'headphones':
      return (
        <g>
          <path d={`M36,${topY + 16} Q36,${topY - 4} 60,${topY - 4} Q84,${topY - 4} 84,${topY + 16}`}
            fill="none" stroke="#374151" strokeWidth="3" />
          <rect x="30" y={topY + 12} width="8" height="12" rx="3" fill="#374151" />
          <rect x="82" y={topY + 12} width="8" height="12" rx="3" fill="#374151" />
        </g>
      )
    case 'halo':
      return (
        <ellipse cx="60" cy={topY - 4} rx="20" ry="5" fill="none" stroke="#FDE68A" strokeWidth="2.5" opacity="0.8" />
      )
    case 'crown':
      return (
        <g>
          <polygon points={`42,${topY + 4} 42,${topY - 8} 50,${topY - 2} 60,${topY - 12} 70,${topY - 2} 78,${topY - 8} 78,${topY + 4}`}
            fill="#F59E0B" stroke="#D97706" strokeWidth="1" />
          <circle cx="50" cy={topY - 2} r="2" fill="#EF4444" />
          <circle cx="60" cy={topY - 6} r="2" fill="#3B82F6" />
          <circle cx="70" cy={topY - 2} r="2" fill="#22C55E" />
        </g>
      )
    default:
      return null
  }
}

function HeldItemLayer({ heldItem }: { heldItem: string }) {
  switch (heldItem) {
    case 'wrench':
      return (
        <g transform="translate(88,72) rotate(30)">
          <rect x="0" y="0" width="4" height="18" rx="1" fill="#9CA3AF" />
          <circle cx="2" cy="0" r="5" fill="none" stroke="#9CA3AF" strokeWidth="2.5" />
        </g>
      )
    case 'laptop':
      return (
        <g>
          <rect x="88" y="74" width="16" height="11" rx="2" fill="#374151" stroke="#4B5563" strokeWidth="1" />
          <rect x="89" y="75" width="14" height="8" rx="1" fill="#60A5FA" />
          <rect x="86" y="85" width="20" height="3" rx="1" fill="#4B5563" />
        </g>
      )
    case 'briefcase':
      return (
        <g>
          <rect x="88" y="78" width="14" height="10" rx="2" fill="#92400E" stroke="#78350F" strokeWidth="1" />
          <rect x="92" y="76" width="6" height="4" rx="1" fill="none" stroke="#78350F" strokeWidth="1.5" />
          <circle cx="95" cy="83" r="1.5" fill="#F59E0B" />
        </g>
      )
    case 'sword':
      return (
        <g transform="translate(90,60) rotate(20)">
          <rect x="-1.5" y="-20" width="3" height="22" rx="0.5" fill="#D1D5DB" stroke="#9CA3AF" strokeWidth="0.5" />
          <rect x="-6" y="0" width="12" height="3" rx="1" fill="#F59E0B" />
          <rect x="-1" y="3" width="2" height="8" rx="1" fill="#78350F" />
        </g>
      )
    case 'shield':
      return (
        <g>
          <path d="M18,68 L18,82 Q18,94 33,96 Q48,94 48,82 L48,68 Z" fill="#3B82F6" stroke="#2563EB" strokeWidth="1.5" />
          <path d="M24,72 L24,80 Q24,88 33,90 Q42,88 42,80 L42,72 Z" fill="#60A5FA" />
          <polygon points="33,74 30,82 36,82" fill="#F59E0B" />
        </g>
      )
    default:
      return null
  }
}

function EffectLayer({ effect }: { effect: string }) {
  switch (effect) {
    case 'sparkles':
      return (
        <g opacity="0.8">
          <text x="20" y="20" fontSize="10">&#x2728;</text>
          <text x="95" y="30" fontSize="8">&#x2728;</text>
          <text x="15" y="80" fontSize="7">&#x2728;</text>
          <text x="100" y="90" fontSize="9">&#x2728;</text>
          <text x="55" y="10" fontSize="6">&#x2728;</text>
          {/* Animated sparkle dots */}
          <circle cx="25" cy="25" r="1.5" fill="#FDE68A">
            <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="95" cy="45" r="1" fill="#FDE68A">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite" />
          </circle>
          <circle cx="20" cy="95" r="1.5" fill="#FDE68A">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="1.8s" repeatCount="indefinite" />
          </circle>
        </g>
      )
    case 'flames':
      return (
        <g opacity="0.7">
          <ellipse cx="45" cy="108" rx="6" ry="10" fill="#EF4444">
            <animate attributeName="ry" values="10;14;10" dur="0.6s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="60" cy="108" rx="8" ry="12" fill="#F59E0B">
            <animate attributeName="ry" values="12;16;12" dur="0.5s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="75" cy="108" rx="6" ry="10" fill="#EF4444">
            <animate attributeName="ry" values="10;14;10" dur="0.7s" repeatCount="indefinite" />
          </ellipse>
        </g>
      )
    case 'electric':
      return (
        <g opacity="0.8">
          <polyline points="20,30 28,40 22,42 32,55" fill="none" stroke="#60A5FA" strokeWidth="2">
            <animate attributeName="opacity" values="1;0.2;1;0.5;1" dur="0.8s" repeatCount="indefinite" />
          </polyline>
          <polyline points="95,20 87,35 93,37 85,50" fill="none" stroke="#93C5FD" strokeWidth="1.5">
            <animate attributeName="opacity" values="0.5;1;0.3;1;0.5" dur="0.6s" repeatCount="indefinite" />
          </polyline>
          <polyline points="100,70 92,78 98,80 90,90" fill="none" stroke="#60A5FA" strokeWidth="1.5">
            <animate attributeName="opacity" values="0.3;1;0.5;0.2;1" dur="1s" repeatCount="indefinite" />
          </polyline>
        </g>
      )
    case 'smoke':
      return (
        <g opacity="0.4">
          <circle cx="40" cy="105" r="8" fill="#9CA3AF">
            <animate attributeName="cy" values="105;85;65" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0.2;0" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx="60" cy="108" r="10" fill="#6B7280">
            <animate attributeName="cy" values="108;88;60" dur="3.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0.15;0" dur="3.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="78" cy="106" r="7" fill="#9CA3AF">
            <animate attributeName="cy" values="106;80;55" dur="2.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0.15;0" dur="2.8s" repeatCount="indefinite" />
          </circle>
        </g>
      )
    default:
      return null
  }
}
