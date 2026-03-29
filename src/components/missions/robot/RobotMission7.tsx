'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import clsx from 'clsx'
import { useTranslations } from 'next-intl'
import type { ScoreBreakdownItem } from '@/components/missions/common/MissionShell'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type HullShape = 'sphere' | 'cylinder' | 'torpedo'
type HullMaterial = 'steel' | 'titanium' | 'composite'
type SealQuality = 'basic' | 'standard' | 'pro'
type Tab = 'hull' | 'buoyancy' | 'thrusters' | 'seals'
type ThrusterSlot = 'top' | 'bottom' | 'left' | 'right'

export interface RobotMission7Props {
  onComplete?: (score: number, breakdown: ScoreBreakdownItem[]) => void
}

// ---------------------------------------------------------------------------
// Data — physics constants
// ---------------------------------------------------------------------------

const TARGET_DEPTH = 500 // meters
const WATER_DENSITY = 1000 // kg/m^3
const GRAVITY = 9.8
const TARGET_PRESSURE = TARGET_DEPTH * WATER_DENSITY * GRAVITY // 4,900,000 Pa

const HULL_SHAPES: Record<HullShape, { pressureFactor: number; volume: number; label: string }> = {
  sphere:   { pressureFactor: 1.3, volume: 0.5, label: 'sphere' },
  cylinder: { pressureFactor: 1.0, volume: 0.7, label: 'cylinder' },
  torpedo:  { pressureFactor: 1.1, volume: 0.6, label: 'torpedo' },
}

const HULL_MATERIALS: Record<HullMaterial, { strength: number; density: number; cost: number }> = {
  steel:     { strength: 3_000_000, density: 7800, cost: 20 },
  titanium:  { strength: 5_500_000, density: 4500, cost: 40 },
  composite: { strength: 7_000_000, density: 1600, cost: 60 },
}

const SEAL_OPTIONS: Record<SealQuality, { pressureRating: number; cost: number }> = {
  basic:    { pressureRating: 2_000_000, cost: 5 },
  standard: { pressureRating: 5_000_000, cost: 15 },
  pro:      { pressureRating: 8_000_000, cost: 30 },
}

const THRUSTER_COST = 15
const ROBOT_BASE_MASS = 200 // kg (electronics, frame, etc.)
const BUDGET = 150

function calculatePressureResistance(shape: HullShape, material: HullMaterial): number {
  return HULL_MATERIALS[material].strength * HULL_SHAPES[shape].pressureFactor
}

function calculateRobotMass(shape: HullShape, material: HullMaterial): number {
  const hullVolume = HULL_SHAPES[shape].volume * 0.05
  return ROBOT_BASE_MASS + HULL_MATERIALS[material].density * hullVolume
}

function calculateDisplacedWaterMass(buoyancyVolume: number): number {
  return buoyancyVolume * WATER_DENSITY
}

// ---------------------------------------------------------------------------
// Particle types for underwater scene
// ---------------------------------------------------------------------------

interface Bubble {
  x: number
  y: number
  r: number
  speed: number
  wobblePhase: number
  wobbleAmp: number
  alpha: number
}

interface Plankton {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
}

interface FishSilhouette {
  x: number
  y: number
  speed: number
  size: number
  flipX: boolean
  yOff: number
}

interface Debris {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  alpha: number
  rotation: number
  rotSpeed: number
}

interface LeakSpray {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
}

// ---------------------------------------------------------------------------
// Particle factories
// ---------------------------------------------------------------------------

function createBubbles(count: number, W: number, H: number): Bubble[] {
  const bubbles: Bubble[] = []
  for (let i = 0; i < count; i++) {
    bubbles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 1 + Math.random() * 4,
      speed: 0.3 + Math.random() * 0.8,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleAmp: 0.5 + Math.random() * 1.5,
      alpha: 0.2 + Math.random() * 0.4,
    })
  }
  return bubbles
}

function createPlankton(count: number, W: number, H: number): Plankton[] {
  const particles: Plankton[] = []
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.15,
      size: 1 + Math.random() * 2,
      alpha: 0.15 + Math.random() * 0.25,
    })
  }
  return particles
}

function createFish(count: number, W: number, H: number): FishSilhouette[] {
  const fish: FishSilhouette[] = []
  for (let i = 0; i < count; i++) {
    const goRight = Math.random() > 0.5
    fish.push({
      x: goRight ? -20 - Math.random() * 100 : W + 20 + Math.random() * 100,
      y: 40 + Math.random() * (H - 80),
      speed: (0.3 + Math.random() * 0.6) * (goRight ? 1 : -1),
      size: 4 + Math.random() * 6,
      flipX: !goRight,
      yOff: Math.random() * Math.PI * 2,
    })
  }
  return fish
}

function createDebris(cx: number, cy: number, count: number): Debris[] {
  const arr: Debris[] = []
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 1 + Math.random() * 3
    arr.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 1 + Math.random() * 3,
      alpha: 1,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.2,
    })
  }
  return arr
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

function drawWaterGradient(ctx: CanvasRenderingContext2D, W: number, H: number, depthRatio: number) {
  // Dynamic gradient that darkens as submarine descends
  const grad = ctx.createLinearGradient(0, 0, 0, H)
  const darkFactor = depthRatio * 0.4
  grad.addColorStop(0, lerpColor('#0E7490', '#021526', darkFactor))
  grad.addColorStop(0.3, lerpColor('#0C4A6E', '#041C32', darkFactor))
  grad.addColorStop(0.7, lerpColor('#082F49', '#02101E', darkFactor))
  grad.addColorStop(1, lerpColor('#042040', '#010C14', darkFactor))
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)
}

function lerpColor(c1: string, c2: string, t: number): string {
  const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16)
  const r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16)
  const r = Math.round(r1 + (r2 - r1) * t)
  const g = Math.round(g1 + (g2 - g1) * t)
  const b = Math.round(b1 + (b2 - b1) * t)
  return `rgb(${r},${g},${b})`
}

function drawLightRays(ctx: CanvasRenderingContext2D, W: number, H: number, time: number, depthRatio: number) {
  // Light rays filtering from surface, fade with depth
  const rayAlpha = Math.max(0, 0.12 - depthRatio * 0.1)
  if (rayAlpha <= 0) return

  ctx.save()
  for (let i = 0; i < 5; i++) {
    const baseX = W * (0.15 + i * 0.18)
    const wobble = Math.sin(time * 0.5 + i * 1.3) * 15
    const rayW = 30 + Math.sin(time * 0.3 + i) * 10

    const grad = ctx.createLinearGradient(baseX + wobble, 0, baseX + wobble + rayW, H * 0.7)
    grad.addColorStop(0, `rgba(56, 189, 248, ${rayAlpha})`)
    grad.addColorStop(1, 'rgba(56, 189, 248, 0)')

    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(baseX + wobble - rayW / 2, 0)
    ctx.lineTo(baseX + wobble + rayW / 2, 0)
    ctx.lineTo(baseX + wobble + rayW * 1.5, H * 0.7)
    ctx.lineTo(baseX + wobble - rayW, H * 0.7)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

function drawCaustics(ctx: CanvasRenderingContext2D, W: number, _H: number, time: number) {
  // Rippling light patterns near the surface
  ctx.save()
  ctx.globalAlpha = 0.08
  for (let i = 0; i < 8; i++) {
    const cx = (i * W / 7) + Math.sin(time * 0.7 + i * 2) * 20
    const cy = 10 + Math.sin(time * 0.5 + i * 1.5) * 5
    const r = 15 + Math.sin(time + i) * 5

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    grad.addColorStop(0, '#7DD3FC')
    grad.addColorStop(1, 'rgba(125, 211, 252, 0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.ellipse(cx, cy, r * 1.5, r * 0.6, Math.sin(time * 0.3 + i) * 0.3, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function drawSurfaceLine(ctx: CanvasRenderingContext2D, W: number, time: number) {
  // Animated wavy surface line
  ctx.save()
  ctx.strokeStyle = '#38BDF8'
  ctx.lineWidth = 2.5
  ctx.shadowColor = '#38BDF8'
  ctx.shadowBlur = 8

  ctx.beginPath()
  for (let x = 0; x <= W; x += 3) {
    const y = 15 + Math.sin(x * 0.03 + time * 1.5) * 2 + Math.sin(x * 0.05 + time * 0.8) * 1.5
    if (x === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.restore()
}

function drawDepthMarkers3D(ctx: CanvasRenderingContext2D, W: number, H: number) {
  // 3D ruler-style depth markers
  ctx.save()
  for (let d = 0; d <= 500; d += 100) {
    const y = 20 + (d / 500) * (H - 40)

    // Embossed ruler tick
    ctx.fillStyle = '#1E3A5F'
    ctx.fillRect(W - 55, y - 1, 20, 3)
    ctx.fillStyle = '#0F2744'
    ctx.fillRect(W - 55, y + 1, 20, 1)

    // 3D embossed number
    ctx.font = 'bold 11px monospace'
    ctx.textAlign = 'right'
    // Shadow
    ctx.fillStyle = '#0A1929'
    ctx.fillText(`${d}m`, W - 8, y + 5)
    // Highlight
    ctx.fillStyle = '#38BDF8'
    ctx.fillText(`${d}m`, W - 9, y + 4)

    // Dashed guide line
    ctx.strokeStyle = 'rgba(30, 58, 95, 0.4)'
    ctx.lineWidth = 0.5
    ctx.setLineDash([3, 5])
    ctx.beginPath()
    ctx.moveTo(20, y)
    ctx.lineTo(W - 60, y)
    ctx.stroke()
    ctx.setLineDash([])
  }
  ctx.restore()
}

function drawPipeline(ctx: CanvasRenderingContext2D, W: number, H: number, t: (k: string) => string) {
  // 3D pipeline at bottom
  ctx.save()
  const pipeY = H - 30
  const pipeH = 14

  // Pipe shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.fillRect(48, pipeY + 4, W - 96, pipeH)

  // Pipe body with gradient
  const pipeGrad = ctx.createLinearGradient(0, pipeY, 0, pipeY + pipeH)
  pipeGrad.addColorStop(0, '#A8A29E')
  pipeGrad.addColorStop(0.3, '#78716C')
  pipeGrad.addColorStop(0.7, '#57534E')
  pipeGrad.addColorStop(1, '#44403C')
  ctx.fillStyle = pipeGrad
  ctx.fillRect(50, pipeY, W - 100, pipeH)

  // Pipe highlight
  ctx.fillStyle = 'rgba(255,255,255,0.1)'
  ctx.fillRect(50, pipeY, W - 100, 3)

  // Rivets on pipe
  for (let i = 0; i < 8; i++) {
    const rx = 70 + i * (W - 140) / 7
    ctx.fillStyle = '#57534E'
    ctx.beginPath()
    ctx.arc(rx, pipeY + pipeH / 2, 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.beginPath()
    ctx.arc(rx - 0.5, pipeY + pipeH / 2 - 0.5, 1, 0, Math.PI * 2)
    ctx.fill()
  }

  // Label
  ctx.fillStyle = '#A8A29E'
  ctx.font = 'bold 10px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(t('pipeline'), W / 2, H - 8)
  ctx.restore()
}

function drawBubbles(ctx: CanvasRenderingContext2D, bubbles: Bubble[], time: number, W: number) {
  ctx.save()
  for (const b of bubbles) {
    const wobbleX = Math.sin(time * 2 + b.wobblePhase) * b.wobbleAmp
    const x = ((b.x + wobbleX) % W + W) % W
    const y = b.y

    // Bubble glow
    ctx.globalAlpha = b.alpha * 0.3
    ctx.fillStyle = '#38BDF8'
    ctx.beginPath()
    ctx.arc(x, y, b.r + 2, 0, Math.PI * 2)
    ctx.fill()

    // Bubble body
    ctx.globalAlpha = b.alpha
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(x, y, b.r, 0, Math.PI * 2)
    ctx.stroke()

    // Bubble highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.beginPath()
    ctx.arc(x - b.r * 0.3, y - b.r * 0.3, b.r * 0.3, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  ctx.restore()
}

function drawPlankton(ctx: CanvasRenderingContext2D, particles: Plankton[]) {
  ctx.save()
  for (const p of particles) {
    ctx.globalAlpha = p.alpha
    ctx.fillStyle = '#7DD3FC'
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  ctx.restore()
}

function drawFishSilhouettes(ctx: CanvasRenderingContext2D, fish: FishSilhouette[], time: number) {
  ctx.save()
  for (const f of fish) {
    const yWobble = Math.sin(time * 1.5 + f.yOff) * 3
    ctx.globalAlpha = 0.15
    ctx.fillStyle = '#0C4A6E'

    ctx.save()
    ctx.translate(f.x, f.y + yWobble)
    if (f.flipX) ctx.scale(-1, 1)

    // Simple fish shape
    ctx.beginPath()
    ctx.moveTo(f.size * 2, 0)
    ctx.quadraticCurveTo(f.size, -f.size, 0, 0)
    ctx.quadraticCurveTo(f.size, f.size, f.size * 2, 0)
    // Tail
    ctx.moveTo(0, 0)
    ctx.lineTo(-f.size * 0.8, -f.size * 0.6)
    ctx.lineTo(-f.size * 0.8, f.size * 0.6)
    ctx.closePath()
    ctx.fill()

    ctx.restore()
  }
  ctx.globalAlpha = 1
  ctx.restore()
}

function drawSubmarine(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  isCrushed: boolean,
  crushProgress: number,
  isLeaking: boolean,
  depthRatio: number,
) {
  ctx.save()
  ctx.translate(x, y)

  // Ambient light around submarine
  const glowGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 60)
  glowGrad.addColorStop(0, 'rgba(56, 189, 248, 0.08)')
  glowGrad.addColorStop(1, 'rgba(56, 189, 248, 0)')
  ctx.fillStyle = glowGrad
  ctx.beginPath()
  ctx.arc(0, 0, 60, 0, Math.PI * 2)
  ctx.fill()

  // Hull shape (2.5D with perspective)
  const hullW = 34
  const hullH = 18
  let scaleX = 1
  let scaleY = 1

  if (isCrushed) {
    // Hull compression animation
    scaleX = 1 - crushProgress * 0.35
    scaleY = 1 + crushProgress * 0.2
    ctx.scale(scaleX, scaleY)
  }

  // Hull shadow (3D depth)
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.beginPath()
  ctx.ellipse(2, 3, hullW, hullH, 0, 0, Math.PI * 2)
  ctx.fill()

  // Main hull body
  const hullGrad = ctx.createLinearGradient(0, -hullH, 0, hullH)
  hullGrad.addColorStop(0, '#60A5FA')
  hullGrad.addColorStop(0.4, '#3B82F6')
  hullGrad.addColorStop(1, '#1D4ED8')
  ctx.fillStyle = hullGrad
  ctx.beginPath()
  ctx.ellipse(0, 0, hullW, hullH, 0, 0, Math.PI * 2)
  ctx.fill()

  // Hull outline with glow
  ctx.strokeStyle = '#93C5FD'
  ctx.lineWidth = 1.5
  ctx.shadowColor = '#60A5FA'
  ctx.shadowBlur = 4
  ctx.beginPath()
  ctx.ellipse(0, 0, hullW, hullH, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.shadowBlur = 0

  // Hull highlight (top specular)
  ctx.fillStyle = 'rgba(147, 197, 253, 0.25)'
  ctx.beginPath()
  ctx.ellipse(0, -hullH * 0.35, hullW * 0.7, hullH * 0.3, 0, 0, Math.PI * 2)
  ctx.fill()

  // Rivets along hull
  for (let i = 0; i < 6; i++) {
    const angle = -Math.PI * 0.6 + (i / 5) * Math.PI * 1.2
    const rx = Math.cos(angle) * (hullW - 3)
    const ry = Math.sin(angle) * (hullH - 2)
    ctx.fillStyle = '#1D4ED8'
    ctx.beginPath()
    ctx.arc(rx, ry, 1.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(147, 197, 253, 0.3)'
    ctx.beginPath()
    ctx.arc(rx - 0.3, ry - 0.3, 0.8, 0, Math.PI * 2)
    ctx.fill()
  }

  // Viewport window with inner glow
  const vpX = 14
  const vpY = -2
  const vpR = 7

  // Window rim
  ctx.strokeStyle = '#475569'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.arc(vpX, vpY, vpR + 1, 0, Math.PI * 2)
  ctx.stroke()

  // Window glass
  const vpGrad = ctx.createRadialGradient(vpX - 1, vpY - 1, 0, vpX, vpY, vpR)
  vpGrad.addColorStop(0, '#67E8F9')
  vpGrad.addColorStop(0.6, '#06B6D4')
  vpGrad.addColorStop(1, '#0E7490')
  ctx.fillStyle = vpGrad
  ctx.beginPath()
  ctx.arc(vpX, vpY, vpR, 0, Math.PI * 2)
  ctx.fill()

  // Inner glow animation
  ctx.save()
  ctx.globalAlpha = 0.3 + Math.sin(time * 2) * 0.15
  const innerGlow = ctx.createRadialGradient(vpX, vpY, 0, vpX, vpY, vpR * 0.8)
  innerGlow.addColorStop(0, '#A5F3FC')
  innerGlow.addColorStop(1, 'rgba(165, 243, 252, 0)')
  ctx.fillStyle = innerGlow
  ctx.beginPath()
  ctx.arc(vpX, vpY, vpR * 0.8, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Window highlight
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.beginPath()
  ctx.arc(vpX - 2, vpY - 2, 2, 0, Math.PI * 2)
  ctx.fill()

  // Propeller at the back — spinning blades
  const propX = -hullW - 4
  const propAngle = time * 12

  // Propeller shaft
  ctx.fillStyle = '#475569'
  ctx.fillRect(-hullW, -2.5, 6, 5)

  // Spinning blades (3 blade propeller)
  ctx.save()
  ctx.translate(propX, 0)
  for (let blade = 0; blade < 3; blade++) {
    const bladeAngle = propAngle + (blade * Math.PI * 2) / 3
    ctx.save()
    ctx.rotate(bladeAngle)
    ctx.fillStyle = '#F59E0B'
    ctx.beginPath()
    ctx.ellipse(0, -5, 2, 5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#FBBF24'
    ctx.beginPath()
    ctx.ellipse(-0.5, -4, 1, 3, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  // Propeller center hub
  ctx.fillStyle = '#78716C'
  ctx.beginPath()
  ctx.arc(0, 0, 2.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Pressure stress lines (appear at depth)
  if (depthRatio > 0.4) {
    const stressAlpha = Math.min(1, (depthRatio - 0.4) * 2)
    ctx.save()
    ctx.globalAlpha = stressAlpha * 0.3
    ctx.strokeStyle = '#EF4444'
    ctx.lineWidth = 1
    ctx.shadowColor = '#EF4444'
    ctx.shadowBlur = 3

    // Stress cracks
    const crackCount = Math.floor(stressAlpha * 4)
    for (let i = 0; i < crackCount; i++) {
      const cx = -hullW * 0.5 + i * hullW * 0.35
      const cy = hullH * 0.3 * (i % 2 === 0 ? 1 : -1)
      ctx.beginPath()
      ctx.moveTo(cx - 3, cy - 2)
      ctx.lineTo(cx + 2, cy + 1)
      ctx.lineTo(cx + 4, cy - 1)
      ctx.stroke()
    }
    ctx.shadowBlur = 0
    ctx.restore()
  }

  // Crush damage overlay
  if (isCrushed && crushProgress > 0) {
    ctx.globalAlpha = crushProgress * 0.5
    ctx.fillStyle = '#EF4444'
    ctx.beginPath()
    ctx.ellipse(0, 0, hullW, hullH, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  ctx.restore()
}

function drawDepthGauge(ctx: CanvasRenderingContext2D, depth: number, H: number, t: (k: string) => string) {
  // 3D depth gauge in bottom-left corner
  ctx.save()
  const gx = 15
  const gy = H - 65
  const gw = 50
  const gh = 55

  // Panel with 3D effect
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'
  ctx.fillRect(gx, gy, gw, gh)
  // Side face
  ctx.fillStyle = 'rgba(10, 15, 30, 0.9)'
  ctx.fillRect(gx + gw, gy + 3, 4, gh)
  // Bottom face
  ctx.fillStyle = 'rgba(10, 15, 30, 0.7)'
  ctx.fillRect(gx, gy + gh, gw + 4, 3)
  // Border glow
  ctx.strokeStyle = '#1E3A5F'
  ctx.lineWidth = 1
  ctx.strokeRect(gx, gy, gw, gh)

  // Label
  ctx.fillStyle = '#64748B'
  ctx.font = 'bold 8px monospace'
  ctx.textAlign = 'center'
  ctx.fillText(t('depth').toUpperCase(), gx + gw / 2, gy + 12)

  // Depth value
  ctx.fillStyle = '#38BDF8'
  ctx.shadowColor = '#38BDF8'
  ctx.shadowBlur = 6
  ctx.font = 'bold 16px monospace'
  ctx.fillText(`${depth}`, gx + gw / 2, gy + 32)
  ctx.shadowBlur = 0

  // Unit
  ctx.fillStyle = '#64748B'
  ctx.font = '9px monospace'
  ctx.fillText('m', gx + gw / 2, gy + 44)

  // Needle (mini analog gauge)
  const needleAngle = -Math.PI * 0.7 + (depth / 500) * Math.PI * 1.4
  const needleCX = gx + gw / 2
  const needleCY = gy + gh - 6
  const needleLen = 8

  ctx.strokeStyle = '#EF4444'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(needleCX, needleCY)
  ctx.lineTo(
    needleCX + Math.cos(needleAngle) * needleLen,
    needleCY + Math.sin(needleAngle) * needleLen,
  )
  ctx.stroke()

  // Gauge center dot
  ctx.fillStyle = '#EF4444'
  ctx.beginPath()
  ctx.arc(needleCX, needleCY, 2, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

function drawSuccessGlow(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  // Green glow pulsing around submarine
  ctx.save()
  const pulseR = 50 + Math.sin(time * 3) * 10
  const grad = ctx.createRadialGradient(x, y, 10, x, y, pulseR)
  grad.addColorStop(0, 'rgba(34, 197, 94, 0.2)')
  grad.addColorStop(0.5, 'rgba(34, 197, 94, 0.1)')
  grad.addColorStop(1, 'rgba(34, 197, 94, 0)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(x, y, pulseR, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawLeakSpray(ctx: CanvasRenderingContext2D, sprays: LeakSpray[]) {
  ctx.save()
  for (const s of sprays) {
    const lifeRatio = s.life / s.maxLife
    ctx.globalAlpha = lifeRatio * 0.7
    ctx.fillStyle = '#38BDF8'
    ctx.beginPath()
    ctx.arc(s.x, s.y, 1.5 * lifeRatio, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  ctx.restore()
}

function drawDebrisParticles(ctx: CanvasRenderingContext2D, debris: Debris[]) {
  ctx.save()
  for (const d of debris) {
    ctx.globalAlpha = d.alpha
    ctx.save()
    ctx.translate(d.x, d.y)
    ctx.rotate(d.rotation)
    ctx.fillStyle = '#78716C'
    ctx.fillRect(-d.r, -d.r * 0.5, d.r * 2, d.r)
    ctx.restore()
  }
  ctx.globalAlpha = 1
  ctx.restore()
}

function drawCelebrationBubbles(ctx: CanvasRenderingContext2D, bubbles: Bubble[], time: number) {
  ctx.save()
  for (const b of bubbles) {
    const wobbleX = Math.sin(time * 3 + b.wobblePhase) * b.wobbleAmp * 2
    ctx.globalAlpha = b.alpha
    // Green-tinted celebration bubbles
    const grad = ctx.createRadialGradient(b.x + wobbleX, b.y, 0, b.x + wobbleX, b.y, b.r)
    grad.addColorStop(0, 'rgba(34, 197, 94, 0.4)')
    grad.addColorStop(1, 'rgba(34, 197, 94, 0.1)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(b.x + wobbleX, b.y, b.r, 0, Math.PI * 2)
    ctx.fill()
    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.beginPath()
    ctx.arc(b.x + wobbleX - b.r * 0.25, b.y - b.r * 0.25, b.r * 0.25, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  ctx.restore()
}

// ---------------------------------------------------------------------------
// Dive Test Canvas (enhanced 2.5D)
// ---------------------------------------------------------------------------

type DiveResult = 'success' | 'crushed' | 'sinks' | 'floats' | 'leaks'

function DiveTestCanvas({
  result,
  isRunning,
  onAnimEnd,
  t,
}: {
  result: DiveResult
  isRunning: boolean
  onAnimEnd: () => void
  t: (key: string) => string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const [statusText, setStatusText] = useState('')
  const [statusColor, setStatusColor] = useState('')

  // Persistent particle state
  const bubblesRef = useRef<Bubble[]>([])
  const planktonRef = useRef<Plankton[]>([])
  const fishRef = useRef<FishSilhouette[]>([])
  const debrisRef = useRef<Debris[]>([])
  const leakSpraysRef = useRef<LeakSpray[]>([])
  const celebBubblesRef = useRef<Bubble[]>([])
  const globalTimeRef = useRef<number>(0)

  // Idle animation loop (always running)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width
    const H = canvas.height

    // Initialize particles
    bubblesRef.current = createBubbles(15, W, H)
    planktonRef.current = createPlankton(20, W, H)
    fishRef.current = createFish(3, W, H)

    let active = true

    function idleLoop() {
      if (!active) return
      const gTime = globalTimeRef.current
      globalTimeRef.current += 0.016

      // Update ambient particles
      for (const b of bubblesRef.current) {
        b.y -= b.speed
        if (b.y < -10) {
          b.y = H + 10
          b.x = Math.random() * W
        }
      }
      for (const p of planktonRef.current) {
        p.x += p.vx + Math.sin(gTime + p.y * 0.01) * 0.1
        p.y += p.vy
        if (p.x < -5) p.x = W + 5
        if (p.x > W + 5) p.x = -5
        if (p.y < -5) p.y = H + 5
        if (p.y > H + 5) p.y = -5
      }
      for (const f of fishRef.current) {
        f.x += f.speed
        if (f.speed > 0 && f.x > W + 30) { f.x = -25; f.y = 40 + Math.random() * (H - 80) }
        if (f.speed < 0 && f.x < -30) { f.x = W + 25; f.y = 40 + Math.random() * (H - 80) }
      }

      // Only draw idle scene if animation is not running
      if (!isRunning) {
        ctx.clearRect(0, 0, W, H)
        drawWaterGradient(ctx, W, H, 0)
        drawCaustics(ctx, W, H, gTime)
        drawLightRays(ctx, W, H, gTime, 0)
        drawSurfaceLine(ctx, W, gTime)
        drawDepthMarkers3D(ctx, W, H)
        drawFishSilhouettes(ctx, fishRef.current, gTime)
        drawPlankton(ctx, planktonRef.current)
        drawBubbles(ctx, bubblesRef.current, gTime, W)
        drawPipeline(ctx, W, H, t)
      }

      animRef.current = requestAnimationFrame(idleLoop)
    }

    animRef.current = requestAnimationFrame(idleLoop)

    return () => {
      active = false
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width
    const H = canvas.height

    setStatusText('')
    setStatusColor('')

    if (!isRunning) return

    debrisRef.current = []
    leakSpraysRef.current = []
    celebBubblesRef.current = []

    const DURATION = result === 'success' ? 4500 : 3500
    startTimeRef.current = performance.now()
    let diveAnimId = 0

    function animate(now: number) {
      if (!ctx || !canvas) return
      const elapsed = now - startTimeRef.current
      const progress = Math.min(elapsed / DURATION, 1)
      const gTime = globalTimeRef.current

      ctx.clearRect(0, 0, W, H)

      // Calculate submarine position
      let robotY: number
      const robotX = W / 2
      const maxY = H - 50

      if (result === 'success') {
        robotY = 30 + progress * (maxY - 30)
      } else if (result === 'floats') {
        if (progress < 0.4) {
          robotY = 30 + (progress / 0.4) * (maxY * 0.3)
        } else {
          const backProgress = (progress - 0.4) / 0.6
          robotY = 30 + maxY * 0.3 * (1 - backProgress)
        }
      } else if (result === 'sinks') {
        robotY = 30 + Math.min(progress * 1.5, 1) * (maxY - 30)
      } else if (result === 'crushed') {
        if (progress < 0.6) {
          robotY = 30 + (progress / 0.6) * (maxY * 0.7)
        } else {
          robotY = 30 + maxY * 0.7
        }
      } else {
        if (progress < 0.5) {
          robotY = 30 + (progress / 0.5) * (maxY * 0.6)
        } else {
          robotY = 30 + maxY * 0.6
        }
      }

      const depthRatio = Math.max(0, (robotY - 30) / (maxY - 30))

      // Background with dynamic depth
      drawWaterGradient(ctx, W, H, depthRatio)
      drawCaustics(ctx, W, H, gTime)
      drawLightRays(ctx, W, H, gTime, depthRatio)
      drawSurfaceLine(ctx, W, gTime)
      drawDepthMarkers3D(ctx, W, H)
      drawFishSilhouettes(ctx, fishRef.current, gTime)
      drawPlankton(ctx, planktonRef.current)
      drawBubbles(ctx, bubblesRef.current, gTime, W)
      drawPipeline(ctx, W, H, t)

      // Shake effect for crush
      const shake = (result === 'crushed' && progress > 0.6) ? Math.sin(progress * 40) * 4 : 0
      const isCrushed = result === 'crushed' && progress > 0.6
      const crushProg = isCrushed ? (progress - 0.6) / 0.4 : 0

      // Debris for crush
      if (isCrushed && debrisRef.current.length === 0) {
        debrisRef.current = createDebris(robotX, robotY, 20)
      }
      if (debrisRef.current.length > 0) {
        for (const d of debrisRef.current) {
          d.x += d.vx
          d.y += d.vy
          d.vy += 0.05
          d.vx *= 0.99
          d.rotation += d.rotSpeed
          d.alpha = Math.max(0, d.alpha - 0.008)
        }
        debrisRef.current = debrisRef.current.filter(d => d.alpha > 0)
        drawDebrisParticles(ctx, debrisRef.current)
      }

      // Leak spray
      if (result === 'leaks' && progress > 0.35) {
        // Spawn new spray particles
        const spawnRate = Math.min(3, Math.floor((progress - 0.35) * 10))
        for (let i = 0; i < spawnRate; i++) {
          const angle = Math.random() * Math.PI * 2
          leakSpraysRef.current.push({
            x: robotX + Math.cos(angle) * 25,
            y: robotY + Math.sin(angle) * 12,
            vx: Math.cos(angle) * (1 + Math.random() * 2),
            vy: Math.sin(angle) * (1 + Math.random()) - 1,
            life: 1,
            maxLife: 1,
          })
        }
        // Update sprays
        for (const s of leakSpraysRef.current) {
          s.x += s.vx
          s.y += s.vy
          s.vy += 0.02
          s.life -= 0.02
        }
        leakSpraysRef.current = leakSpraysRef.current.filter(s => s.life > 0)
        drawLeakSpray(ctx, leakSpraysRef.current)
      }

      // Success glow and celebration bubbles
      if (result === 'success' && progress > 0.85) {
        drawSuccessGlow(ctx, robotX, robotY, gTime)
        if (celebBubblesRef.current.length === 0) {
          const cbs: Bubble[] = []
          for (let i = 0; i < 12; i++) {
            cbs.push({
              x: robotX + (Math.random() - 0.5) * 60,
              y: robotY + Math.random() * 20,
              r: 2 + Math.random() * 5,
              speed: 0.5 + Math.random() * 1.5,
              wobblePhase: Math.random() * Math.PI * 2,
              wobbleAmp: 1 + Math.random() * 2,
              alpha: 0.6 + Math.random() * 0.4,
            })
          }
          celebBubblesRef.current = cbs
        }
        // Update celebration bubbles
        for (const cb of celebBubblesRef.current) {
          cb.y -= cb.speed
          if (cb.y < robotY - 80) {
            cb.y = robotY + 10
            cb.x = robotX + (Math.random() - 0.5) * 60
          }
        }
        drawCelebrationBubbles(ctx, celebBubblesRef.current, gTime)
      }

      // Draw submarine
      drawSubmarine(ctx, robotX + shake, robotY, gTime, isCrushed, crushProg, result === 'leaks', depthRatio)

      // Depth gauge
      const currentDepth = result === 'success'
        ? Math.round(progress * 500)
        : result === 'floats'
        ? Math.round(Math.max(0, (robotY - 30) / (maxY - 30)) * 500)
        : Math.round(Math.min(500, Math.max(0, (robotY - 30) / (maxY - 30)) * 500))

      drawDepthGauge(ctx, currentDepth, H, t)

      // Status text trigger
      if (progress >= 0.8 && !statusText) {
        if (result === 'success') {
          setStatusText(t('diveSuccess'))
          setStatusColor('bg-green-600/90')
        } else if (result === 'crushed') {
          setStatusText(t('diveCrushed'))
          setStatusColor('bg-red-600/90')
        } else if (result === 'sinks') {
          setStatusText(t('diveSinks'))
          setStatusColor('bg-orange-600/90')
        } else if (result === 'floats') {
          setStatusText(t('diveFloats'))
          setStatusColor('bg-yellow-600/90')
        } else {
          setStatusText(t('diveLeaks'))
          setStatusColor('bg-red-600/90')
        }
      }

      if (progress < 1) {
        diveAnimId = requestAnimationFrame(animate)
      } else {
        onAnimEnd()
      }
    }

    diveAnimId = requestAnimationFrame(animate)

    return () => {
      if (diveAnimId) cancelAnimationFrame(diveAnimId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, result])

  return (
    <div className="relative w-full rounded-xl border border-gray-800 overflow-hidden bg-gray-950">
      <canvas
        ref={canvasRef}
        width={600}
        height={300}
        className="w-full"
        style={{ minHeight: 220 }}
      />
      {statusText && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={clsx('px-6 py-3 rounded-xl text-lg font-black text-white shadow-lg', statusColor)}>
            {statusText}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function RobotMission7({ onComplete }: RobotMission7Props) {
  const t = useTranslations('missions.robot.m7')

  const [activeTab, setActiveTab] = useState<Tab>('hull')
  const [hullShape, setHullShape] = useState<HullShape>('cylinder')
  const [hullMaterial, setHullMaterial] = useState<HullMaterial>('steel')
  const [buoyancyVolume, setBuoyancyVolume] = useState(0.3) // m^3
  const [thrusters, setThrusters] = useState<Set<ThrusterSlot>>(new Set())
  const [sealQuality, setSealQuality] = useState<SealQuality>('basic')
  const [isAnimating, setIsAnimating] = useState(false)
  const [phase, setPhase] = useState<'configuring' | 'done'>('configuring')

  const pressureResistance = calculatePressureResistance(hullShape, hullMaterial)
  const robotMass = calculateRobotMass(hullShape, hullMaterial)
  const displacedMass = calculateDisplacedWaterMass(buoyancyVolume)
  const buoyancyRatio = displacedMass / robotMass // ~1.0 = neutral

  const hullCost = HULL_MATERIALS[hullMaterial].cost
  const thrusterCost = thrusters.size * THRUSTER_COST
  const sealCost = SEAL_OPTIONS[sealQuality].cost
  const totalCost = hullCost + thrusterCost + sealCost

  const hullOk = pressureResistance >= TARGET_PRESSURE
  const buoyancyOk = buoyancyRatio >= 0.9 && buoyancyRatio <= 1.1
  const thrustersOk = thrusters.size >= 4
  const sealsOk = SEAL_OPTIONS[sealQuality].pressureRating >= TARGET_PRESSURE
  const budgetOk = totalCost <= BUDGET

  const diveResult = useMemo((): DiveResult => {
    if (!hullOk) return 'crushed'
    if (!sealsOk) return 'leaks'
    if (buoyancyRatio < 0.9) return 'sinks'
    if (buoyancyRatio > 1.1) return 'floats'
    return 'success'
  }, [hullOk, sealsOk, buoyancyRatio])

  const handleTest = useCallback(() => {
    setIsAnimating(true)
  }, [])

  const handleAnimEnd = useCallback(() => {
    setIsAnimating(false)

    if (diveResult === 'success') {
      setPhase('done')

      // Design score (max 500): all 4 systems correct
      let designScore = 0
      if (hullOk) designScore += 125
      if (buoyancyOk) designScore += 125
      if (thrustersOk) designScore += 125
      if (sealsOk) designScore += 125

      // Physics score (max 350): how close to optimal
      let physicsScore = 0
      // Buoyancy precision: closer to 1.0 = better
      const buoyancyPrecision = 1 - Math.abs(buoyancyRatio - 1.0)
      physicsScore += Math.round(buoyancyPrecision * 200)
      // Pressure margin: just enough is best
      const pressureMargin = pressureResistance / TARGET_PRESSURE
      if (pressureMargin >= 1 && pressureMargin <= 1.3) physicsScore += 150
      else if (pressureMargin >= 1 && pressureMargin <= 1.6) physicsScore += 100
      else if (pressureMargin >= 1) physicsScore += 50

      // Budget score (max 150)
      const budgetScore = totalCost <= 100 ? 150
        : totalCost <= 120 ? 120
        : totalCost <= BUDGET ? 80
        : 30

      const total = designScore + physicsScore + budgetScore

      const breakdownItems: ScoreBreakdownItem[] = [
        { label: t('scoreDesign'), value: designScore, max: 500 },
        { label: t('scorePhysics'), value: physicsScore, max: 350 },
        { label: t('scoreBudget'), value: budgetScore, max: 150 },
      ]

      onComplete?.(total, breakdownItems)
    }
  }, [diveResult, hullOk, buoyancyOk, thrustersOk, sealsOk, buoyancyRatio, pressureResistance, totalCost, onComplete, t])

  const toggleThruster = useCallback((slot: ThrusterSlot) => {
    setThrusters(prev => {
      const next = new Set(prev)
      if (next.has(slot)) next.delete(slot)
      else next.add(slot)
      return next
    })
  }, [])

  const tabs: { id: Tab; label: string; ok: boolean }[] = [
    { id: 'hull', label: t('tabHull'), ok: hullOk },
    { id: 'buoyancy', label: t('tabBuoyancy'), ok: buoyancyOk },
    { id: 'thrusters', label: t('tabThrusters'), ok: thrustersOk },
    { id: 'seals', label: t('tabSeals'), ok: sealsOk },
  ]

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Story */}
      <div className="bg-gray-950 rounded-xl p-4 border border-gray-800">
        <p className="text-gray-300 text-sm">{t('story')}</p>
        <p className="text-yellow-400 text-sm font-bold mt-2">{t('requirement')}</p>
      </div>

      {/* Budget bar */}
      <div className="bg-gray-950 rounded-xl p-3 border border-gray-800">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-400">{t('budgetLabel')}</span>
          <span className={clsx('font-bold', budgetOk ? 'text-green-400' : 'text-red-400')}>
            ${totalCost} / ${BUDGET}
          </span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div
            className={clsx('h-2 rounded-full transition-all', budgetOk ? 'bg-green-500' : 'bg-red-500')}
            style={{ width: `${Math.min(100, (totalCost / BUDGET) * 100)}%` }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            disabled={isAnimating}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2',
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700',
              isAnimating && 'opacity-50 cursor-not-allowed',
            )}
          >
            <span className={clsx('w-2 h-2 rounded-full', tab.ok ? 'bg-green-400' : 'bg-red-400')} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-gray-950 rounded-xl p-4 border border-gray-800 min-h-[200px]">
        {activeTab === 'hull' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase">{t('hullShape')}</h3>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(HULL_SHAPES) as HullShape[]).map(shape => (
                <button
                  key={shape}
                  onClick={() => setHullShape(shape)}
                  disabled={isAnimating}
                  className={clsx(
                    'p-3 rounded-xl border-2 text-center transition-all',
                    hullShape === shape
                      ? 'border-blue-500 bg-blue-900/20'
                      : 'border-gray-700 bg-gray-900 hover:border-gray-500',
                  )}
                >
                  <div className="text-3xl mb-1">
                    {shape === 'sphere' ? '\u2B24' : shape === 'cylinder' ? '\u2B1C' : '\u25C6'}
                  </div>
                  <div className="text-white font-bold text-sm">{t(`shapes.${shape}`)}</div>
                  <div className="text-xs text-gray-500">{t('pressureMult')}: x{HULL_SHAPES[shape].pressureFactor}</div>
                </button>
              ))}
            </div>

            <h3 className="text-sm font-bold text-gray-400 uppercase mt-4">{t('hullMaterial')}</h3>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(HULL_MATERIALS) as HullMaterial[]).map(mat => (
                <button
                  key={mat}
                  onClick={() => setHullMaterial(mat)}
                  disabled={isAnimating}
                  className={clsx(
                    'p-3 rounded-xl border-2 text-left transition-all',
                    hullMaterial === mat
                      ? 'border-blue-500 bg-blue-900/20'
                      : 'border-gray-700 bg-gray-900 hover:border-gray-500',
                  )}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-white font-bold text-sm">{t(`materials.${mat}`)}</span>
                    <span className="text-yellow-400 font-bold text-sm">${HULL_MATERIALS[mat].cost}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {t('strength')}: {(HULL_MATERIALS[mat].strength / 1_000_000).toFixed(1)} MPa
                  </div>
                </button>
              ))}
            </div>

            {/* Pressure check */}
            <div className={clsx(
              'p-3 rounded-lg border text-sm',
              hullOk ? 'border-green-600/50 bg-green-900/10' : 'border-red-600/50 bg-red-900/10',
            )}>
              <div className="text-gray-400 text-xs mb-1">{t('pressureResistance')}</div>
              <div className={clsx('text-lg font-black', hullOk ? 'text-green-400' : 'text-red-400')}>
                {(pressureResistance / 1_000_000).toFixed(1)} MPa
              </div>
              <div className="text-gray-500 text-xs mt-1">
                {t('pressureNeeded')}: {(TARGET_PRESSURE / 1_000_000).toFixed(1)} MPa {hullOk ? '\u2713' : '\u2717'}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'buoyancy' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase">{t('buoyancyTitle')}</h3>
            <p className="text-xs text-gray-500">{t('archimedesHint')}</p>

            <div className="flex items-center gap-4">
              <span className="text-gray-400 text-sm w-16">0.1 m\u00B3</span>
              <input
                type="range"
                min={0.1}
                max={0.8}
                step={0.01}
                value={buoyancyVolume}
                onChange={e => setBuoyancyVolume(Number(e.target.value))}
                disabled={isAnimating}
                className="flex-1 accent-blue-500"
              />
              <span className="text-gray-400 text-sm w-16">0.8 m\u00B3</span>
            </div>
            <div className="text-center text-2xl font-black text-white">
              {buoyancyVolume.toFixed(2)} m\u00B3
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded-lg border border-gray-700 bg-gray-900/50">
                <div className="text-gray-400 text-xs mb-1">{t('robotMass')}</div>
                <div className="text-white font-black text-lg">{robotMass.toFixed(0)} kg</div>
              </div>
              <div className="p-3 rounded-lg border border-gray-700 bg-gray-900/50">
                <div className="text-gray-400 text-xs mb-1">{t('displacedWater')}</div>
                <div className="text-white font-black text-lg">{displacedMass.toFixed(0)} kg</div>
              </div>
            </div>

            <div className={clsx(
              'p-3 rounded-lg border text-sm',
              buoyancyOk ? 'border-green-600/50 bg-green-900/10' : 'border-orange-600/50 bg-orange-900/10',
            )}>
              <div className="text-gray-400 text-xs mb-1">{t('buoyancyRatio')}</div>
              <div className={clsx('text-lg font-black', buoyancyOk ? 'text-green-400' : 'text-orange-400')}>
                {buoyancyRatio.toFixed(2)}
              </div>
              <div className="text-gray-500 text-xs mt-1">
                {buoyancyRatio < 0.9 ? t('tooHeavy') : buoyancyRatio > 1.1 ? t('tooLight') : t('neutralOk')}
              </div>
              <div className="text-gray-600 text-xs mt-1">
                F = {'\u03C1'} \u00D7 V \u00D7 g = {WATER_DENSITY} \u00D7 {buoyancyVolume.toFixed(2)} \u00D7 {GRAVITY} = {(displacedMass * GRAVITY).toFixed(0)}N
              </div>
            </div>
          </div>
        )}

        {activeTab === 'thrusters' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase">{t('thrustersTitle')}</h3>
            <p className="text-xs text-gray-500">{t('thrustersHint')}</p>

            <div className="relative w-48 h-48 mx-auto">
              {/* Robot body center */}
              <div className="absolute inset-12 bg-blue-900/50 border-2 border-blue-500 rounded-full flex items-center justify-center">
                <span className="text-blue-300 text-xs font-bold">{t('robot')}</span>
              </div>

              {/* Thruster slots */}
              {([
                { slot: 'top' as ThrusterSlot, style: 'top-0 left-1/2 -translate-x-1/2' },
                { slot: 'bottom' as ThrusterSlot, style: 'bottom-0 left-1/2 -translate-x-1/2' },
                { slot: 'left' as ThrusterSlot, style: 'left-0 top-1/2 -translate-y-1/2' },
                { slot: 'right' as ThrusterSlot, style: 'right-0 top-1/2 -translate-y-1/2' },
              ]).map(({ slot, style }) => (
                <button
                  key={slot}
                  onClick={() => toggleThruster(slot)}
                  disabled={isAnimating}
                  className={clsx(
                    'absolute w-10 h-10 rounded-lg border-2 flex items-center justify-center text-xs font-bold transition-all',
                    style,
                    thrusters.has(slot)
                      ? 'border-green-500 bg-green-900/50 text-green-300'
                      : 'border-gray-600 bg-gray-800 text-gray-500 hover:border-gray-400',
                  )}
                >
                  {thrusters.has(slot) ? '\u2713' : '+'}
                </button>
              ))}
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-400">{t('thrusterCount')}: {thrusters.size}/4</span>
              <span className="text-yellow-400 font-bold">${thrusterCost}</span>
            </div>
            {!thrustersOk && (
              <p className="text-xs text-red-400">{t('needAllThrusters')}</p>
            )}
          </div>
        )}

        {activeTab === 'seals' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase">{t('sealsTitle')}</h3>
            <p className="text-xs text-gray-500">{t('sealsHint')}</p>

            <div className="space-y-3">
              {(Object.keys(SEAL_OPTIONS) as SealQuality[]).map(quality => (
                <button
                  key={quality}
                  onClick={() => setSealQuality(quality)}
                  disabled={isAnimating}
                  className={clsx(
                    'w-full p-3 rounded-xl border-2 text-left transition-all',
                    sealQuality === quality
                      ? 'border-blue-500 bg-blue-900/20'
                      : 'border-gray-700 bg-gray-900 hover:border-gray-500',
                  )}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold">{t(`seals.${quality}`)}</span>
                    <span className="text-yellow-400 font-bold">${SEAL_OPTIONS[quality].cost}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {t('ratedTo')}: {(SEAL_OPTIONS[quality].pressureRating / 1_000_000).toFixed(1)} MPa
                  </div>
                </button>
              ))}
            </div>

            <div className={clsx(
              'p-3 rounded-lg border text-sm',
              sealsOk ? 'border-green-600/50 bg-green-900/10' : 'border-red-600/50 bg-red-900/10',
            )}>
              <div className="text-gray-500 text-xs">
                {t('sealCheck')}: {(SEAL_OPTIONS[sealQuality].pressureRating / 1_000_000).toFixed(1)} MPa
                {' vs '}{(TARGET_PRESSURE / 1_000_000).toFixed(1)} MPa {sealsOk ? '\u2713' : '\u2717'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* System status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {tabs.map(tab => (
          <div key={tab.id} className={clsx(
            'p-2 rounded-lg border text-center text-xs font-bold',
            tab.ok ? 'border-green-600/50 bg-green-900/10 text-green-400' : 'border-red-600/50 bg-red-900/10 text-red-400',
          )}>
            {tab.label}: {tab.ok ? '\u2713' : '\u2717'}
          </div>
        ))}
      </div>

      {/* Test button */}
      {phase === 'configuring' && (
        <button
          onClick={handleTest}
          disabled={isAnimating}
          className={clsx(
            'w-full py-3 rounded-xl font-black text-lg uppercase tracking-wider transition-all',
            !isAnimating
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed',
          )}
        >
          {t('testDive')}
        </button>
      )}

      {/* Dive animation */}
      <DiveTestCanvas
        result={diveResult}
        isRunning={isAnimating}
        onAnimEnd={handleAnimEnd}
        t={t}
      />
    </div>
  )
}
