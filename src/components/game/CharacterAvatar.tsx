'use client'

import { useEffect, useRef, useCallback } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CharacterAvatarProps {
  bodyType: 'bot'
  bodyColor: string // hex color
  headStyle: string
  eyeStyle: string
  outfit: string
  accessory: string
  heldItem: string
  effect: string
  size?: number
  animated?: boolean
  className?: string
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const num = parseInt(hex.replace('#', ''), 16)
  return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff]
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(Math.max(0, r - amount), Math.max(0, g - amount), Math.max(0, b - amount))
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(Math.min(255, r + amount), Math.min(255, g + amount), Math.min(255, b + amount))
}

function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r},${g},${b},${alpha})`
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const BODY_COLORS = [
  { hex: '#1E90FF', name: 'Blue' },
  { hex: '#10B981', name: 'Green' },
  { hex: '#EF4444', name: 'Red' },
  { hex: '#FFD700', name: 'Yellow' },
  { hex: '#8B5CF6', name: 'Purple' },
  { hex: '#F97316', name: 'Orange' },
  { hex: '#EC4899', name: 'Pink' },
  { hex: '#06B6D4', name: 'Cyan' },
]

export const HEAD_STYLES = ['round', 'square', 'pointed', 'dome', 'horned', 'cat'] as const
export const EYE_STYLES = ['circle', 'visor', 'angry', 'happy', 'glasses'] as const
export const OUTFITS = ['none', 'tshirt', 'labcoat', 'hoodie', 'suit', 'armor', 'spacesuit', 'cape'] as const
export const ACCESSORIES = ['none', 'antenna', 'hardhat', 'crown', 'headphones', 'halo'] as const
export const HELD_ITEMS = ['none', 'wrench', 'laptop', 'briefcase', 'sword', 'shield'] as const
export const EFFECTS = ['none', 'sparkles', 'flames', 'electric', 'smoke'] as const

export type HeadStyle = typeof HEAD_STYLES[number]
export type EyeStyle = typeof EYE_STYLES[number]
export type Outfit = typeof OUTFITS[number]
export type Accessory = typeof ACCESSORIES[number]
export type HeldItem = typeof HELD_ITEMS[number]
export type Effect = typeof EFFECTS[number]

// localStorage key
const STORAGE_KEY = 'robojunior_avatar'

export function loadAvatarConfig(): Partial<CharacterAvatarProps> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveAvatarConfig(config: Partial<CharacterAvatarProps>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    // storage full or blocked
  }
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

// Rounded rect utility
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// ---------------------------------------------------------------------------
// Draw functions — each draws one part of the character
// All coordinates are in a 200x200 "design space", scaled by the canvas.
// The character is drawn at a slight 3/4 angle (leftward bias on shading).
// ---------------------------------------------------------------------------

function drawShadow(ctx: CanvasRenderingContext2D, time: number, animated: boolean) {
  const pulse = animated ? 1 + Math.sin(time * 2) * 0.05 : 1
  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.beginPath()
  ctx.ellipse(100, 188, 36 * pulse, 8 * pulse, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

// Back arm (drawn behind body)
function drawBackArm(
  ctx: CanvasRenderingContext2D,
  _bodyType: string,
  color: string,
  time: number,
  animated: boolean,
) {
  const dark = darken(color, 50)
  const swing = animated ? Math.sin(time * 1.5) * 3 : 0
  ctx.save()
  ctx.translate(145, 95 + swing)
  // Mechanical arm
  roundRect(ctx, 0, 0, 16, 40, 5)
  ctx.fillStyle = dark
  ctx.fill()
  ctx.strokeStyle = darken(color, 80)
  ctx.lineWidth = 1.5
  ctx.stroke()
  // Joint
  ctx.beginPath()
  ctx.arc(8, 20, 4, 0, Math.PI * 2)
  ctx.fillStyle = darken(color, 30)
  ctx.fill()
  ctx.strokeStyle = darken(color, 80)
  ctx.lineWidth = 1
  ctx.stroke()
  // Hand claw
  ctx.beginPath()
  ctx.arc(8, 42, 6, 0, Math.PI * 2)
  ctx.fillStyle = lighten(color, 30)
  ctx.fill()
  ctx.strokeStyle = darken(color, 60)
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()
}

// Front arm
function drawFrontArm(
  ctx: CanvasRenderingContext2D,
  _bodyType: string,
  color: string,
  time: number,
  animated: boolean,
) {
  const swing = animated ? Math.sin(time * 1.5 + Math.PI) * 3 : 0
  ctx.save()
  ctx.translate(39, 95 + swing)
  roundRect(ctx, 0, 0, 16, 40, 5)
  ctx.fillStyle = color
  ctx.fill()
  ctx.strokeStyle = darken(color, 60)
  ctx.lineWidth = 1.5
  ctx.stroke()
  // Joint
  ctx.beginPath()
  ctx.arc(8, 20, 4, 0, Math.PI * 2)
  ctx.fillStyle = lighten(color, 20)
  ctx.fill()
  ctx.strokeStyle = darken(color, 60)
  ctx.lineWidth = 1
  ctx.stroke()
  // Hand claw
  ctx.beginPath()
  ctx.arc(8, 42, 6, 0, Math.PI * 2)
  ctx.fillStyle = lighten(color, 40)
  ctx.fill()
  ctx.strokeStyle = darken(color, 50)
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()
}

function drawLegs(ctx: CanvasRenderingContext2D, _bodyType: string, color: string) {
  const dark = darken(color, 40)
  const stroke = darken(color, 70)

  // Left leg
  roundRect(ctx, 70, 145, 18, 28, 4)
  ctx.fillStyle = dark
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.lineWidth = 1.5
  ctx.stroke()
  // Left foot
  roundRect(ctx, 65, 170, 26, 10, 4)
  ctx.fillStyle = darken(color, 50)
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Right leg
  roundRect(ctx, 112, 145, 18, 28, 4)
  ctx.fillStyle = dark
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.lineWidth = 1.5
  ctx.stroke()
  // Right foot
  roundRect(ctx, 109, 170, 26, 10, 4)
  ctx.fillStyle = darken(color, 50)
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Joint circles
  ctx.beginPath()
  ctx.arc(79, 155, 3, 0, Math.PI * 2)
  ctx.fillStyle = lighten(color, 10)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(121, 155, 3, 0, Math.PI * 2)
  ctx.fillStyle = lighten(color, 10)
  ctx.fill()
}

function drawBody(ctx: CanvasRenderingContext2D, _bodyType: string, color: string) {
  const dark = darken(color, 40)
  const light = lighten(color, 50)
  const stroke = darken(color, 70)

  ctx.save()
  // Boxy torso with rounded corners
  roundRect(ctx, 58, 85, 84, 62, 10)
  ctx.fillStyle = color
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.lineWidth = 2
  ctx.stroke()

  // Chest panel highlight (3D shading — lighter top-left)
  const grad = ctx.createLinearGradient(58, 85, 142, 147)
  grad.addColorStop(0, withAlpha(light, 0.35))
  grad.addColorStop(1, withAlpha(dark, 0.2))
  roundRect(ctx, 58, 85, 84, 62, 10)
  ctx.fillStyle = grad
  ctx.fill()

  // Chest detail — panel lines
  roundRect(ctx, 72, 100, 56, 6, 3)
  ctx.fillStyle = withAlpha(light, 0.25)
  ctx.fill()
  // Center circle detail
  ctx.beginPath()
  ctx.arc(100, 118, 6, 0, Math.PI * 2)
  ctx.fillStyle = withAlpha(light, 0.2)
  ctx.fill()
  ctx.strokeStyle = withAlpha(light, 0.3)
  ctx.lineWidth = 1
  ctx.stroke()
  // Small bolts
  for (const bx of [66, 134]) {
    ctx.beginPath()
    ctx.arc(bx, 92, 2.5, 0, Math.PI * 2)
    ctx.fillStyle = darken(color, 30)
    ctx.fill()
    ctx.strokeStyle = stroke
    ctx.lineWidth = 0.8
    ctx.stroke()
  }
  ctx.restore()
}

function drawOutfit(ctx: CanvasRenderingContext2D, outfit: string, color: string) {
  if (outfit === 'none') return
  const outfitColor = darken(color, 20)
  const outfitLight = lighten(color, 30)
  const outfitDark = darken(color, 60)

  ctx.save()
  switch (outfit) {
    case 'tshirt': {
      roundRect(ctx, 60, 87, 80, 50, 8)
      ctx.fillStyle = outfitColor
      ctx.fill()
      ctx.strokeStyle = outfitDark
      ctx.lineWidth = 1.5
      ctx.stroke()
      // Collar
      ctx.beginPath()
      ctx.moveTo(85, 87)
      ctx.quadraticCurveTo(100, 95, 115, 87)
      ctx.strokeStyle = outfitDark
      ctx.lineWidth = 1.5
      ctx.stroke()
      break
    }
    case 'labcoat': {
      // White lab coat over body
      roundRect(ctx, 56, 86, 88, 64, 8)
      ctx.fillStyle = '#F0F0F0'
      ctx.fill()
      ctx.strokeStyle = '#CCCCCC'
      ctx.lineWidth = 1.5
      ctx.stroke()
      // Lapels
      ctx.beginPath()
      ctx.moveTo(88, 86)
      ctx.lineTo(95, 110)
      ctx.lineTo(100, 86)
      ctx.fillStyle = '#E0E0E0'
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(112, 86)
      ctx.lineTo(105, 110)
      ctx.lineTo(100, 86)
      ctx.fillStyle = '#E0E0E0'
      ctx.fill()
      // Pocket
      roundRect(ctx, 108, 118, 18, 14, 3)
      ctx.fillStyle = '#E8E8E8'
      ctx.fill()
      ctx.strokeStyle = '#CCC'
      ctx.lineWidth = 0.8
      ctx.stroke()
      // Pen in pocket
      ctx.beginPath()
      ctx.moveTo(114, 115)
      ctx.lineTo(114, 126)
      ctx.strokeStyle = '#3B82F6'
      ctx.lineWidth = 1.5
      ctx.stroke()
      break
    }
    case 'hoodie': {
      roundRect(ctx, 56, 86, 88, 58, 10)
      ctx.fillStyle = outfitColor
      ctx.fill()
      ctx.strokeStyle = outfitDark
      ctx.lineWidth = 1.5
      ctx.stroke()
      // Hood line around neck
      ctx.beginPath()
      ctx.arc(100, 84, 22, 0, Math.PI)
      ctx.fillStyle = darken(outfitColor, 15)
      ctx.fill()
      ctx.strokeStyle = outfitDark
      ctx.lineWidth = 1
      ctx.stroke()
      // Front pocket
      roundRect(ctx, 78, 120, 44, 18, 6)
      ctx.fillStyle = darken(outfitColor, 10)
      ctx.fill()
      ctx.strokeStyle = outfitDark
      ctx.lineWidth = 0.8
      ctx.stroke()
      // Drawstrings
      ctx.beginPath()
      ctx.moveTo(92, 84)
      ctx.lineTo(90, 102)
      ctx.moveTo(108, 84)
      ctx.lineTo(110, 102)
      ctx.strokeStyle = outfitLight
      ctx.lineWidth = 1
      ctx.stroke()
      break
    }
    case 'suit': {
      roundRect(ctx, 58, 86, 84, 60, 8)
      ctx.fillStyle = '#1E293B'
      ctx.fill()
      ctx.strokeStyle = '#0F172A'
      ctx.lineWidth = 1.5
      ctx.stroke()
      // Lapels
      ctx.beginPath()
      ctx.moveTo(82, 86)
      ctx.lineTo(92, 120)
      ctx.lineTo(100, 86)
      ctx.fillStyle = '#334155'
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(118, 86)
      ctx.lineTo(108, 120)
      ctx.lineTo(100, 86)
      ctx.fillStyle = '#334155'
      ctx.fill()
      // Tie
      ctx.beginPath()
      ctx.moveTo(100, 88)
      ctx.lineTo(96, 105)
      ctx.lineTo(100, 135)
      ctx.lineTo(104, 105)
      ctx.closePath()
      ctx.fillStyle = '#EF4444'
      ctx.fill()
      ctx.strokeStyle = '#DC2626'
      ctx.lineWidth = 0.8
      ctx.stroke()
      // Buttons
      for (const by of [108, 120, 132]) {
        ctx.beginPath()
        ctx.arc(100, by, 1.5, 0, Math.PI * 2)
        ctx.fillStyle = '#94A3B8'
        ctx.fill()
      }
      break
    }
    case 'armor': {
      // Chest plate
      ctx.beginPath()
      ctx.moveTo(62, 88)
      ctx.lineTo(60, 140)
      ctx.lineTo(100, 148)
      ctx.lineTo(140, 140)
      ctx.lineTo(138, 88)
      ctx.closePath()
      ctx.fillStyle = '#6B7280'
      ctx.fill()
      ctx.strokeStyle = '#4B5563'
      ctx.lineWidth = 2
      ctx.stroke()
      // Plate highlight
      const armorGrad = ctx.createLinearGradient(60, 88, 140, 148)
      armorGrad.addColorStop(0, 'rgba(255,255,255,0.2)')
      armorGrad.addColorStop(0.5, 'rgba(255,255,255,0.05)')
      armorGrad.addColorStop(1, 'rgba(0,0,0,0.1)')
      ctx.beginPath()
      ctx.moveTo(62, 88)
      ctx.lineTo(60, 140)
      ctx.lineTo(100, 148)
      ctx.lineTo(140, 140)
      ctx.lineTo(138, 88)
      ctx.closePath()
      ctx.fillStyle = armorGrad
      ctx.fill()
      // Center emblem
      ctx.beginPath()
      ctx.arc(100, 115, 10, 0, Math.PI * 2)
      ctx.fillStyle = outfitColor
      ctx.fill()
      ctx.strokeStyle = outfitDark
      ctx.lineWidth = 1.5
      ctx.stroke()
      // Shoulder pads
      for (const sx of [55, 130]) {
        roundRect(ctx, sx, 84, 18, 14, 4)
        ctx.fillStyle = '#9CA3AF'
        ctx.fill()
        ctx.strokeStyle = '#6B7280'
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
      break
    }
    case 'spacesuit': {
      roundRect(ctx, 54, 84, 92, 66, 12)
      ctx.fillStyle = '#E5E7EB'
      ctx.fill()
      ctx.strokeStyle = '#9CA3AF'
      ctx.lineWidth = 2
      ctx.stroke()
      // Orange stripe
      roundRect(ctx, 56, 108, 88, 8, 3)
      ctx.fillStyle = '#F97316'
      ctx.fill()
      // NASA-style patch
      ctx.beginPath()
      ctx.arc(80, 98, 8, 0, Math.PI * 2)
      ctx.fillStyle = '#3B82F6'
      ctx.fill()
      ctx.strokeStyle = '#1D4ED8'
      ctx.lineWidth = 1
      ctx.stroke()
      // Life support pack indicator
      roundRect(ctx, 90, 125, 20, 16, 4)
      ctx.fillStyle = '#D1D5DB'
      ctx.fill()
      ctx.strokeStyle = '#9CA3AF'
      ctx.lineWidth = 1
      ctx.stroke()
      // LED lights
      ctx.beginPath()
      ctx.arc(95, 131, 2, 0, Math.PI * 2)
      ctx.fillStyle = '#22C55E'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(105, 131, 2, 0, Math.PI * 2)
      ctx.fillStyle = '#EF4444'
      ctx.fill()
      break
    }
    case 'cape': {
      // Cape drawn behind shoulders and flowing down
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(65, 88)
      ctx.quadraticCurveTo(50, 120, 45, 165)
      ctx.quadraticCurveTo(100, 155, 155, 165)
      ctx.quadraticCurveTo(150, 120, 135, 88)
      ctx.closePath()
      ctx.fillStyle = '#EF4444'
      ctx.globalAlpha = 0.75
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.strokeStyle = '#DC2626'
      ctx.lineWidth = 1.5
      ctx.stroke()
      // Cape folds
      ctx.beginPath()
      ctx.moveTo(75, 95)
      ctx.quadraticCurveTo(70, 130, 60, 158)
      ctx.strokeStyle = 'rgba(185,28,28,0.4)'
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(125, 95)
      ctx.quadraticCurveTo(130, 130, 140, 158)
      ctx.strokeStyle = 'rgba(185,28,28,0.4)'
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.restore()
      break
    }
  }
  ctx.restore()
}

function drawHead(
  ctx: CanvasRenderingContext2D,
  headStyle: string,
  bodyType: string,
  color: string,
) {
  const dark = darken(color, 40)
  const light = lighten(color, 50)
  const stroke = darken(color, 70)

  ctx.save()

  // Neck
  roundRect(ctx, 90, 76, 20, 14, 5)
  ctx.fillStyle = dark
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.lineWidth = 1
  ctx.stroke()

  switch (headStyle) {
    case 'round':
    default: {
      ctx.beginPath()
      ctx.arc(100, 52, 30, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = stroke
      ctx.lineWidth = 2
      ctx.stroke()
      // 3D highlight
      ctx.beginPath()
      ctx.arc(90, 42, 16, 0, Math.PI * 2)
      ctx.fillStyle = withAlpha(light, 0.2)
      ctx.fill()
      break
    }
    case 'square': {
      roundRect(ctx, 68, 24, 64, 56, 8)
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = stroke
      ctx.lineWidth = 2
      ctx.stroke()
      // 3D highlight
      roundRect(ctx, 72, 28, 28, 20, 5)
      ctx.fillStyle = withAlpha(light, 0.18)
      ctx.fill()
      // Corner bolts for bot
      if (bodyType === 'bot') {
        for (const [bx, by] of [[74, 30], [126, 30], [74, 74], [126, 74]]) {
          ctx.beginPath()
          ctx.arc(bx, by, 2, 0, Math.PI * 2)
          ctx.fillStyle = darken(color, 30)
          ctx.fill()
        }
      }
      break
    }
    case 'pointed': {
      // Ninja-style pointed head
      ctx.beginPath()
      ctx.moveTo(100, 18)
      ctx.quadraticCurveTo(135, 30, 135, 60)
      ctx.quadraticCurveTo(135, 82, 100, 82)
      ctx.quadraticCurveTo(65, 82, 65, 60)
      ctx.quadraticCurveTo(65, 30, 100, 18)
      ctx.closePath()
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = stroke
      ctx.lineWidth = 2
      ctx.stroke()
      // Mask band
      roundRect(ctx, 66, 44, 68, 14, 4)
      ctx.fillStyle = darken(color, 50)
      ctx.fill()
      ctx.strokeStyle = stroke
      ctx.lineWidth = 1
      ctx.stroke()
      break
    }
    case 'dome': {
      // Astronaut dome / glass helmet
      ctx.beginPath()
      ctx.arc(100, 55, 32, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = stroke
      ctx.lineWidth = 2
      ctx.stroke()
      // Glass visor
      ctx.beginPath()
      ctx.arc(100, 52, 24, -Math.PI * 0.8, Math.PI * 0.8)
      ctx.closePath()
      ctx.fillStyle = 'rgba(147, 197, 253, 0.3)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(147, 197, 253, 0.5)'
      ctx.lineWidth = 1.5
      ctx.stroke()
      // Reflection
      ctx.beginPath()
      ctx.arc(90, 44, 8, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.2)'
      ctx.fill()
      break
    }
    case 'horned': {
      ctx.beginPath()
      ctx.arc(100, 55, 30, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = stroke
      ctx.lineWidth = 2
      ctx.stroke()
      // Horns
      ctx.beginPath()
      ctx.moveTo(75, 35)
      ctx.quadraticCurveTo(60, 10, 65, 5)
      ctx.quadraticCurveTo(70, 8, 80, 30)
      ctx.closePath()
      ctx.fillStyle = darken(color, 30)
      ctx.fill()
      ctx.strokeStyle = stroke
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(125, 35)
      ctx.quadraticCurveTo(140, 10, 135, 5)
      ctx.quadraticCurveTo(130, 8, 120, 30)
      ctx.closePath()
      ctx.fillStyle = darken(color, 30)
      ctx.fill()
      ctx.strokeStyle = stroke
      ctx.lineWidth = 1.5
      ctx.stroke()
      break
    }
    case 'cat': {
      ctx.beginPath()
      ctx.arc(100, 55, 28, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = stroke
      ctx.lineWidth = 2
      ctx.stroke()
      // Cat ears
      ctx.beginPath()
      ctx.moveTo(74, 38)
      ctx.lineTo(65, 12)
      ctx.lineTo(82, 30)
      ctx.closePath()
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = stroke
      ctx.lineWidth = 1.5
      ctx.stroke()
      // Inner ear
      ctx.beginPath()
      ctx.moveTo(74, 35)
      ctx.lineTo(68, 18)
      ctx.lineTo(79, 32)
      ctx.closePath()
      ctx.fillStyle = lighten(color, 60)
      ctx.fill()

      ctx.beginPath()
      ctx.moveTo(126, 38)
      ctx.lineTo(135, 12)
      ctx.lineTo(118, 30)
      ctx.closePath()
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = stroke
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(126, 35)
      ctx.lineTo(132, 18)
      ctx.lineTo(121, 32)
      ctx.closePath()
      ctx.fillStyle = lighten(color, 60)
      ctx.fill()

      // Whiskers
      ctx.strokeStyle = darken(color, 50)
      ctx.lineWidth = 0.8
      for (const [sx, dir] of [[78, -1], [122, 1]] as const) {
        ctx.beginPath()
        ctx.moveTo(sx, 60)
        ctx.lineTo(sx + dir * 20, 56)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(sx, 63)
        ctx.lineTo(sx + dir * 22, 63)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(sx, 66)
        ctx.lineTo(sx + dir * 20, 70)
        ctx.stroke()
      }
      break
    }
  }
  ctx.restore()
}

function drawEyes(
  ctx: CanvasRenderingContext2D,
  eyeStyle: string,
  time: number,
  animated: boolean,
) {
  // Blink every 3-5 seconds (using a deterministic pattern)
  const blinkCycle = animated ? (time % 4) : 10
  const isBlinking = blinkCycle > 3.85 && blinkCycle < 3.95

  ctx.save()
  switch (eyeStyle) {
    case 'circle':
    default: {
      if (isBlinking) {
        // Closed blink line
        for (const ex of [87, 113]) {
          ctx.beginPath()
          ctx.moveTo(ex - 7, 50)
          ctx.quadraticCurveTo(ex, 53, ex + 7, 50)
          ctx.strokeStyle = '#1E293B'
          ctx.lineWidth = 2
          ctx.stroke()
        }
      } else {
        for (const ex of [87, 113]) {
          // Eye socket shadow
          ctx.beginPath()
          ctx.arc(ex, 50, 9, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(0,0,0,0.15)'
          ctx.fill()
          // White
          ctx.beginPath()
          ctx.arc(ex, 50, 8, 0, Math.PI * 2)
          ctx.fillStyle = 'white'
          ctx.fill()
          ctx.strokeStyle = '#CBD5E1'
          ctx.lineWidth = 0.8
          ctx.stroke()
          // Pupil — slight movement
          const px = animated ? Math.sin(time * 0.7) * 2 : 0
          ctx.beginPath()
          ctx.arc(ex + 1 + px, 50, 3.5, 0, Math.PI * 2)
          ctx.fillStyle = '#1E293B'
          ctx.fill()
          // Highlight
          ctx.beginPath()
          ctx.arc(ex - 2, 47, 2, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(255,255,255,0.7)'
          ctx.fill()
        }
      }
      break
    }
    case 'visor': {
      // Single horizontal visor
      roundRect(ctx, 72, 44, 56, 14, 7)
      ctx.fillStyle = '#3B82F6'
      ctx.globalAlpha = 0.8
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.strokeStyle = '#60A5FA'
      ctx.lineWidth = 1.5
      ctx.stroke()
      // Scan line
      if (animated) {
        const scanX = 76 + ((time * 20) % 48)
        ctx.beginPath()
        ctx.moveTo(scanX, 46)
        ctx.lineTo(scanX, 56)
        ctx.strokeStyle = 'rgba(147, 197, 253, 0.6)'
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
      // Reflection
      roundRect(ctx, 76, 46, 20, 4, 2)
      ctx.fillStyle = 'rgba(147, 197, 253, 0.3)'
      ctx.fill()
      break
    }
    case 'angry': {
      for (const [ex, dir] of [[87, 1], [113, -1]] as const) {
        // Eye socket
        ctx.beginPath()
        ctx.arc(ex, 50, 8, 0, Math.PI * 2)
        ctx.fillStyle = 'white'
        ctx.fill()
        ctx.strokeStyle = '#CBD5E1'
        ctx.lineWidth = 0.8
        ctx.stroke()
        // Pupil
        ctx.beginPath()
        ctx.arc(ex, 51, 3.5, 0, Math.PI * 2)
        ctx.fillStyle = '#DC2626'
        ctx.fill()
        // Highlight
        ctx.beginPath()
        ctx.arc(ex - 1, 48, 1.5, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.6)'
        ctx.fill()
        // Angry eyebrow
        ctx.beginPath()
        ctx.moveTo(ex - 10, 42 + dir * 3)
        ctx.lineTo(ex + 10, 42 - dir * 3)
        ctx.strokeStyle = '#1E293B'
        ctx.lineWidth = 3
        ctx.lineCap = 'round'
        ctx.stroke()
      }
      ctx.lineCap = 'butt'
      break
    }
    case 'happy': {
      // Closed happy eyes (upside-down U shapes)
      for (const ex of [87, 113]) {
        ctx.beginPath()
        ctx.arc(ex, 50, 7, Math.PI, 0)
        ctx.strokeStyle = '#1E293B'
        ctx.lineWidth = 2.5
        ctx.lineCap = 'round'
        ctx.stroke()
      }
      ctx.lineCap = 'butt'
      break
    }
    case 'glasses': {
      for (const ex of [87, 113]) {
        // Glass frame circle
        ctx.beginPath()
        ctx.arc(ex, 50, 11, 0, Math.PI * 2)
        ctx.strokeStyle = '#1E293B'
        ctx.lineWidth = 2
        ctx.stroke()
        // Lens (slightly tinted)
        ctx.beginPath()
        ctx.arc(ex, 50, 10, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(147, 197, 253, 0.15)'
        ctx.fill()
        // Eye behind
        if (isBlinking) {
          ctx.beginPath()
          ctx.moveTo(ex - 5, 50)
          ctx.quadraticCurveTo(ex, 53, ex + 5, 50)
          ctx.strokeStyle = '#1E293B'
          ctx.lineWidth = 1.5
          ctx.stroke()
        } else {
          ctx.beginPath()
          ctx.arc(ex, 50, 5, 0, Math.PI * 2)
          ctx.fillStyle = 'white'
          ctx.fill()
          const px = animated ? Math.sin(time * 0.7) * 1.5 : 0
          ctx.beginPath()
          ctx.arc(ex + px, 50, 2.5, 0, Math.PI * 2)
          ctx.fillStyle = '#1E293B'
          ctx.fill()
          ctx.beginPath()
          ctx.arc(ex - 1.5, 48, 1.2, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(255,255,255,0.6)'
          ctx.fill()
        }
      }
      // Bridge between glasses
      ctx.beginPath()
      ctx.moveTo(98, 48)
      ctx.lineTo(102, 48)
      ctx.strokeStyle = '#1E293B'
      ctx.lineWidth = 2
      ctx.stroke()
      // Temple arms
      ctx.beginPath()
      ctx.moveTo(76, 48)
      ctx.lineTo(68, 47)
      ctx.strokeStyle = '#1E293B'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(124, 48)
      ctx.lineTo(132, 47)
      ctx.strokeStyle = '#1E293B'
      ctx.lineWidth = 1.5
      ctx.stroke()
      break
    }
  }

  // Mouth (unless visor covers it or we have specific style)
  if (eyeStyle === 'happy') {
    // Big smile
    ctx.beginPath()
    ctx.arc(100, 64, 10, 0.1, Math.PI - 0.1)
    ctx.strokeStyle = '#1E293B'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.lineCap = 'butt'
  } else if (eyeStyle === 'angry') {
    // Frown / gritting teeth
    roundRect(ctx, 90, 66, 20, 6, 3)
    ctx.fillStyle = '#1E293B'
    ctx.fill()
    // Teeth lines
    for (let tx = 93; tx < 108; tx += 5) {
      ctx.beginPath()
      ctx.moveTo(tx, 66)
      ctx.lineTo(tx, 72)
      ctx.strokeStyle = '#334155'
      ctx.lineWidth = 0.8
      ctx.stroke()
    }
  } else {
    // Default slight smile
    ctx.beginPath()
    ctx.arc(100, 63, 7, 0.2, Math.PI - 0.2)
    ctx.strokeStyle = '#1E293B'
    ctx.lineWidth = 1.8
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.lineCap = 'butt'
  }

  ctx.restore()
}

function drawAccessory(ctx: CanvasRenderingContext2D, accessory: string, time: number, animated: boolean) {
  if (accessory === 'none') return
  ctx.save()

  switch (accessory) {
    case 'antenna': {
      // Pole
      ctx.beginPath()
      ctx.moveTo(100, 24)
      ctx.lineTo(100, 6)
      ctx.strokeStyle = '#F59E0B'
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.stroke()
      ctx.lineCap = 'butt'
      // Glowing ball
      const glowR = animated ? 4 + Math.sin(time * 3) * 1.5 : 4
      ctx.beginPath()
      ctx.arc(100, 5, glowR, 0, Math.PI * 2)
      ctx.fillStyle = '#F59E0B'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(100, 5, glowR * 0.6, 0, Math.PI * 2)
      ctx.fillStyle = '#FEF3C7'
      ctx.fill()
      break
    }
    case 'hardhat': {
      // Brim
      roundRect(ctx, 65, 28, 70, 10, 4)
      ctx.fillStyle = '#F59E0B'
      ctx.fill()
      ctx.strokeStyle = '#D97706'
      ctx.lineWidth = 1.5
      ctx.stroke()
      // Dome
      ctx.beginPath()
      ctx.moveTo(72, 30)
      ctx.quadraticCurveTo(72, 12, 100, 8)
      ctx.quadraticCurveTo(128, 12, 128, 30)
      ctx.lineTo(72, 30)
      ctx.closePath()
      ctx.fillStyle = '#F59E0B'
      ctx.fill()
      ctx.strokeStyle = '#D97706'
      ctx.lineWidth = 1.5
      ctx.stroke()
      // Highlight
      ctx.beginPath()
      ctx.moveTo(80, 22)
      ctx.quadraticCurveTo(100, 16, 120, 22)
      ctx.strokeStyle = 'rgba(253, 230, 138, 0.5)'
      ctx.lineWidth = 2
      ctx.stroke()
      break
    }
    case 'crown': {
      // Crown base
      roundRect(ctx, 72, 22, 56, 10, 2)
      ctx.fillStyle = '#F59E0B'
      ctx.fill()
      ctx.strokeStyle = '#D97706'
      ctx.lineWidth = 1
      ctx.stroke()
      // Points
      ctx.beginPath()
      ctx.moveTo(72, 22)
      ctx.lineTo(78, 8)
      ctx.lineTo(86, 18)
      ctx.lineTo(100, 2)
      ctx.lineTo(114, 18)
      ctx.lineTo(122, 8)
      ctx.lineTo(128, 22)
      ctx.closePath()
      ctx.fillStyle = '#F59E0B'
      ctx.fill()
      ctx.strokeStyle = '#D97706'
      ctx.lineWidth = 1
      ctx.stroke()
      // Jewels
      ctx.beginPath()
      ctx.arc(78, 11, 2.5, 0, Math.PI * 2)
      ctx.fillStyle = '#EF4444'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(100, 5, 3, 0, Math.PI * 2)
      ctx.fillStyle = '#3B82F6'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(122, 11, 2.5, 0, Math.PI * 2)
      ctx.fillStyle = '#10B981'
      ctx.fill()
      // Sparkle on center jewel
      if (animated) {
        const sparkAlpha = 0.3 + Math.sin(time * 2) * 0.4
        ctx.beginPath()
        ctx.arc(100, 5, 1.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${sparkAlpha})`
        ctx.fill()
      }
      break
    }
    case 'headphones': {
      // Band
      ctx.beginPath()
      ctx.arc(100, 45, 34, Math.PI * 1.15, Math.PI * 1.85)
      ctx.strokeStyle = '#374151'
      ctx.lineWidth = 4
      ctx.stroke()
      // Left ear pad
      roundRect(ctx, 62, 42, 12, 18, 4)
      ctx.fillStyle = '#374151'
      ctx.fill()
      ctx.strokeStyle = '#1F2937'
      ctx.lineWidth = 1.5
      ctx.stroke()
      // Inner pad
      roundRect(ctx, 64, 45, 8, 12, 3)
      ctx.fillStyle = '#4B5563'
      ctx.fill()
      // Right ear pad
      roundRect(ctx, 126, 42, 12, 18, 4)
      ctx.fillStyle = '#374151'
      ctx.fill()
      ctx.strokeStyle = '#1F2937'
      ctx.lineWidth = 1.5
      ctx.stroke()
      roundRect(ctx, 128, 45, 8, 12, 3)
      ctx.fillStyle = '#4B5563'
      ctx.fill()
      break
    }
    case 'halo': {
      // Glowing ring above head
      const haloY = animated ? 14 + Math.sin(time * 1.5) * 2 : 14
      ctx.beginPath()
      ctx.ellipse(100, haloY, 22, 6, 0, 0, Math.PI * 2)
      ctx.strokeStyle = '#FDE68A'
      ctx.lineWidth = 3
      ctx.globalAlpha = 0.7 + (animated ? Math.sin(time * 2) * 0.2 : 0)
      ctx.stroke()
      ctx.globalAlpha = 1
      // Inner glow
      ctx.beginPath()
      ctx.ellipse(100, haloY, 20, 5, 0, 0, Math.PI * 2)
      ctx.strokeStyle = '#FEF3C7'
      ctx.lineWidth = 1
      ctx.globalAlpha = 0.5
      ctx.stroke()
      ctx.globalAlpha = 1
      break
    }
  }
  ctx.restore()
}

function drawHeldItem(
  ctx: CanvasRenderingContext2D,
  item: string,
  time: number,
  animated: boolean,
) {
  if (item === 'none') return
  const swing = animated ? Math.sin(time * 1.5 + Math.PI) * 3 : 0

  ctx.save()
  // Position at front hand (left arm)
  ctx.translate(47, 135 + swing)

  switch (item) {
    case 'wrench': {
      ctx.translate(0, 2)
      ctx.rotate(-0.3)
      // Handle
      roundRect(ctx, -3, -20, 6, 22, 2)
      ctx.fillStyle = '#9CA3AF'
      ctx.fill()
      ctx.strokeStyle = '#6B7280'
      ctx.lineWidth = 1
      ctx.stroke()
      // Head
      ctx.beginPath()
      ctx.moveTo(-8, -22)
      ctx.lineTo(-3, -28)
      ctx.lineTo(3, -28)
      ctx.lineTo(8, -22)
      ctx.lineTo(4, -20)
      ctx.lineTo(2, -22)
      ctx.lineTo(-2, -22)
      ctx.lineTo(-4, -20)
      ctx.closePath()
      ctx.fillStyle = '#D1D5DB'
      ctx.fill()
      ctx.strokeStyle = '#9CA3AF'
      ctx.lineWidth = 1
      ctx.stroke()
      break
    }
    case 'laptop': {
      ctx.translate(-2, -8)
      // Base
      roundRect(ctx, -12, 0, 24, 14, 2)
      ctx.fillStyle = '#374151'
      ctx.fill()
      ctx.strokeStyle = '#1F2937'
      ctx.lineWidth = 1
      ctx.stroke()
      // Screen (angled)
      ctx.save()
      ctx.rotate(-0.4)
      roundRect(ctx, -12, -18, 24, 18, 2)
      ctx.fillStyle = '#1F2937'
      ctx.fill()
      ctx.strokeStyle = '#374151'
      ctx.lineWidth = 1
      ctx.stroke()
      // Screen glow
      roundRect(ctx, -10, -16, 20, 14, 1)
      ctx.fillStyle = '#3B82F6'
      ctx.globalAlpha = 0.4
      ctx.fill()
      ctx.globalAlpha = 1
      // Code lines
      for (let ly = -14; ly < -4; ly += 3) {
        const lw = 4 + Math.random() * 10
        ctx.beginPath()
        ctx.moveTo(-8, ly)
        ctx.lineTo(-8 + lw, ly)
        ctx.strokeStyle = 'rgba(147, 197, 253, 0.5)'
        ctx.lineWidth = 1
        ctx.stroke()
      }
      ctx.restore()
      break
    }
    case 'briefcase': {
      // Case body
      roundRect(ctx, -14, -6, 28, 20, 3)
      ctx.fillStyle = '#92400E'
      ctx.fill()
      ctx.strokeStyle = '#78350F'
      ctx.lineWidth = 1.5
      ctx.stroke()
      // Handle
      ctx.beginPath()
      ctx.arc(0, -6, 6, Math.PI, 0)
      ctx.strokeStyle = '#78350F'
      ctx.lineWidth = 2
      ctx.stroke()
      // Clasp
      roundRect(ctx, -3, -2, 6, 4, 1)
      ctx.fillStyle = '#F59E0B'
      ctx.fill()
      ctx.strokeStyle = '#D97706'
      ctx.lineWidth = 0.8
      ctx.stroke()
      break
    }
    case 'sword': {
      ctx.rotate(-0.5)
      // Blade
      ctx.beginPath()
      ctx.moveTo(0, -40)
      ctx.lineTo(-4, -5)
      ctx.lineTo(4, -5)
      ctx.closePath()
      ctx.fillStyle = '#D1D5DB'
      ctx.fill()
      ctx.strokeStyle = '#9CA3AF'
      ctx.lineWidth = 1
      ctx.stroke()
      // Edge highlight
      ctx.beginPath()
      ctx.moveTo(0, -38)
      ctx.lineTo(-1, -5)
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.lineWidth = 1.5
      ctx.stroke()
      // Guard
      roundRect(ctx, -10, -6, 20, 4, 2)
      ctx.fillStyle = '#F59E0B'
      ctx.fill()
      ctx.strokeStyle = '#D97706'
      ctx.lineWidth = 1
      ctx.stroke()
      // Grip
      roundRect(ctx, -3, -2, 6, 16, 2)
      ctx.fillStyle = '#78350F'
      ctx.fill()
      ctx.strokeStyle = '#451A03'
      ctx.lineWidth = 1
      ctx.stroke()
      // Pommel
      ctx.beginPath()
      ctx.arc(0, 16, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#F59E0B'
      ctx.fill()
      ctx.strokeStyle = '#D97706'
      ctx.lineWidth = 1
      ctx.stroke()
      break
    }
    case 'shield': {
      ctx.translate(-4, -10)
      // Shield shape
      ctx.beginPath()
      ctx.moveTo(0, -18)
      ctx.quadraticCurveTo(20, -16, 20, 0)
      ctx.quadraticCurveTo(18, 18, 0, 24)
      ctx.quadraticCurveTo(-18, 18, -20, 0)
      ctx.quadraticCurveTo(-20, -16, 0, -18)
      ctx.closePath()
      ctx.fillStyle = '#3B82F6'
      ctx.fill()
      ctx.strokeStyle = '#1D4ED8'
      ctx.lineWidth = 2
      ctx.stroke()
      // Cross emblem
      roundRect(ctx, -2, -12, 4, 28, 1)
      ctx.fillStyle = '#F59E0B'
      ctx.fill()
      roundRect(ctx, -10, -2, 20, 4, 1)
      ctx.fillStyle = '#F59E0B'
      ctx.fill()
      // Rim highlight
      ctx.beginPath()
      ctx.moveTo(-5, -17)
      ctx.quadraticCurveTo(-18, -14, -18, 0)
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'
      ctx.lineWidth = 2
      ctx.stroke()
      break
    }
  }
  ctx.restore()
}

function drawEffect(
  ctx: CanvasRenderingContext2D,
  effect: string,
  time: number,
  animated: boolean,
) {
  if (effect === 'none' || !animated) return
  ctx.save()

  switch (effect) {
    case 'sparkles': {
      // Gold sparkle particles
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + time * 0.5
        const dist = 50 + Math.sin(time * 2 + i) * 15
        const x = 100 + Math.cos(angle) * dist
        const y = 100 + Math.sin(angle) * dist * 0.6
        const alpha = 0.4 + Math.sin(time * 3 + i * 1.3) * 0.4
        const size = 2 + Math.sin(time * 2.5 + i) * 1.5

        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(time + i)
        ctx.globalAlpha = Math.max(0, alpha)
        // 4-pointed star
        ctx.beginPath()
        ctx.moveTo(0, -size)
        ctx.lineTo(size * 0.3, -size * 0.3)
        ctx.lineTo(size, 0)
        ctx.lineTo(size * 0.3, size * 0.3)
        ctx.lineTo(0, size)
        ctx.lineTo(-size * 0.3, size * 0.3)
        ctx.lineTo(-size, 0)
        ctx.lineTo(-size * 0.3, -size * 0.3)
        ctx.closePath()
        ctx.fillStyle = '#FFD700'
        ctx.fill()
        ctx.restore()
      }
      break
    }
    case 'flames': {
      // Fire at feet
      for (let i = 0; i < 6; i++) {
        const x = 75 + i * 10
        const flicker = Math.sin(time * 8 + i * 2) * 5
        const h = 12 + Math.sin(time * 5 + i * 1.7) * 8
        const alpha = 0.5 + Math.sin(time * 4 + i) * 0.3

        ctx.beginPath()
        ctx.moveTo(x - 5, 182)
        ctx.quadraticCurveTo(x + flicker, 182 - h, x + 5, 182)
        ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`
        ctx.fill()
        // Inner flame
        ctx.beginPath()
        ctx.moveTo(x - 3, 182)
        ctx.quadraticCurveTo(x + flicker * 0.5, 182 - h * 0.6, x + 3, 182)
        ctx.fillStyle = `rgba(249, 115, 22, ${alpha * 0.8})`
        ctx.fill()
        // Core
        ctx.beginPath()
        ctx.moveTo(x - 1, 182)
        ctx.quadraticCurveTo(x, 182 - h * 0.3, x + 1, 182)
        ctx.fillStyle = `rgba(254, 243, 199, ${alpha * 0.6})`
        ctx.fill()
      }
      break
    }
    case 'electric': {
      // Blue electric arcs
      for (let i = 0; i < 4; i++) {
        if (Math.sin(time * 7 + i * 3) < 0.3) continue // intermittent
        const startAngle = (i / 4) * Math.PI * 2 + time * 0.3
        const x1 = 100 + Math.cos(startAngle) * 35
        const y1 = 100 + Math.sin(startAngle) * 45
        const x2 = 100 + Math.cos(startAngle + 0.5) * 50
        const y2 = 100 + Math.sin(startAngle + 0.5) * 55

        ctx.beginPath()
        ctx.moveTo(x1, y1)
        // Zigzag
        const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * 15
        const my = (y1 + y2) / 2 + (Math.random() - 0.5) * 15
        ctx.lineTo(mx, my)
        ctx.lineTo(x2, y2)
        ctx.strokeStyle = 'rgba(96, 165, 250, 0.7)'
        ctx.lineWidth = 2
        ctx.stroke()
        // Glow
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(mx, my)
        ctx.lineTo(x2, y2)
        ctx.strokeStyle = 'rgba(191, 219, 254, 0.4)'
        ctx.lineWidth = 4
        ctx.stroke()
      }
      break
    }
    case 'smoke': {
      // Gray smoke wisps rising from feet
      for (let i = 0; i < 5; i++) {
        const phase = (time * 0.5 + i * 0.8) % 3
        const x = 80 + i * 10 + Math.sin(time + i) * 5
        const y = 182 - phase * 30
        const alpha = Math.max(0, 0.3 - phase * 0.1)
        const size = 4 + phase * 5

        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(156, 163, 175, ${alpha})`
        ctx.fill()
      }
      break
    }
  }
  ctx.restore()
}

// ---------------------------------------------------------------------------
// Main render function
// ---------------------------------------------------------------------------

function renderCharacter(
  ctx: CanvasRenderingContext2D,
  props: CharacterAvatarProps,
  time: number,
  canvasSize: number,
) {
  const { bodyType, bodyColor, headStyle, eyeStyle, outfit, accessory, heldItem, effect, animated = true } = props

  ctx.clearRect(0, 0, canvasSize, canvasSize)

  // Scale to design space (200x200)
  const scale = canvasSize / 200
  ctx.save()
  ctx.scale(scale, scale)

  // Bobbing animation
  const bobOffset = animated ? Math.sin(time * 2) * 3 : 0
  ctx.save()
  ctx.translate(0, bobOffset)

  // Draw order: back to front for depth

  // 1. Shadow — drawn BEFORE the 3/4 skew so it stays flat on the ground
  ctx.save()
  ctx.translate(0, -bobOffset) // shadow stays on ground
  drawShadow(ctx, time, animated)
  ctx.restore()

  // Character faces straight forward (no skew)
  ctx.save()

  // 2. Effects (behind)
  drawEffect(ctx, effect, time, animated)
  // 3. Cape (if outfit is cape, draw behind body)
  if (outfit === 'cape') {
    drawOutfit(ctx, 'cape', bodyColor)
  }
  // 4. Back arm
  drawBackArm(ctx, bodyType, bodyColor, time, animated)
  // 5. Legs
  drawLegs(ctx, bodyType, bodyColor)
  // 6. Body
  drawBody(ctx, bodyType, bodyColor)
  // 7. Outfit (except cape, already drawn)
  if (outfit !== 'cape') {
    drawOutfit(ctx, outfit, bodyColor)
  }
  // 8. Head
  drawHead(ctx, headStyle, bodyType, bodyColor)
  // 9. Eyes & mouth
  drawEyes(ctx, eyeStyle, time, animated)
  // 10. Accessory (on head)
  drawAccessory(ctx, accessory, time, animated)
  // 11. Front arm
  drawFrontArm(ctx, bodyType, bodyColor, time, animated)
  // 12. Held item
  drawHeldItem(ctx, heldItem, time, animated)

  ctx.restore() // character group

  ctx.restore() // bobbing
  ctx.restore() // scale
}

// ---------------------------------------------------------------------------
// React Component
// ---------------------------------------------------------------------------

export default function CharacterAvatar({
  bodyType = 'bot',
  bodyColor = '#1E90FF',
  headStyle = 'round',
  eyeStyle = 'circle',
  outfit = 'none',
  accessory = 'none',
  heldItem = 'none',
  effect = 'none',
  size = 200,
  animated = true,
  className = '',
}: CharacterAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const frameRef = useRef(0)
  const timeRef = useRef(0)

  // Store current props in ref for animation loop
  const propsRef = useRef<CharacterAvatarProps>({
    bodyType, bodyColor, headStyle, eyeStyle, outfit, accessory, heldItem, effect, size, animated,
  })
  propsRef.current = { bodyType, bodyColor, headStyle, eyeStyle, outfit, accessory, heldItem, effect, size, animated }

  const setupCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    canvasRef.current = canvas
    ctxRef.current = null
    if (!canvas) return

    // High-DPI support
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctxRef.current = ctx
  }, [size])

  useEffect(() => {
    let active = true

    const loop = () => {
      if (!active) return
      const ctx = ctxRef.current
      if (ctx) {
        timeRef.current += 0.016
        const dpr = window.devicePixelRatio || 1
        // Reset transform before rendering
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        renderCharacter(ctx, propsRef.current, timeRef.current, propsRef.current.size || 200)
      }
      frameRef.current = requestAnimationFrame(loop)
    }

    if (animated) {
      frameRef.current = requestAnimationFrame(loop)
    } else {
      // Single render
      const renderOnce = () => {
        const ctx = ctxRef.current
        if (ctx) {
          const dpr = window.devicePixelRatio || 1
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
          renderCharacter(ctx, propsRef.current, 0, propsRef.current.size || 200)
        }
      }
      // Small delay to ensure canvas is ready
      const timer = setTimeout(renderOnce, 50)
      return () => clearTimeout(timer)
    }

    return () => {
      active = false
      cancelAnimationFrame(frameRef.current)
    }
  }, [animated, bodyType, bodyColor, headStyle, eyeStyle, outfit, accessory, heldItem, effect, size])

  return (
    <canvas
      ref={setupCanvas}
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size }}
    />
  )
}
