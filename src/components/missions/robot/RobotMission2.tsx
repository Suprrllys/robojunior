'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import clsx from 'clsx'
import { useTranslations } from 'next-intl'
import type { ScoreBreakdownItem } from '@/components/missions/common/MissionShell'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChassisType = 'wheels' | 'tracks' | 'legs'
type Surface = 'sand' | 'rocks' | 'stairs'

interface ChassisOption {
  type: ChassisType
  speed: string
  terrain: string[]
  cost: number
  color: string
}

interface TestRecord {
  chassis: ChassisType
  surface: Surface
  passed: boolean
}

export interface RobotMission2Props {
  onComplete?: (score: number, breakdown: ScoreBreakdownItem[]) => void
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const CHASSIS_OPTIONS: ChassisOption[] = [
  { type: 'wheels', speed: 'fast', terrain: ['flat'], cost: 10, color: '#FBBF24' },
  { type: 'tracks', speed: 'medium', terrain: ['flat', 'sand', 'rocks'], cost: 25, color: '#F97316' },
  { type: 'legs', speed: 'slow', terrain: ['flat', 'sand', 'rocks', 'stairs'], cost: 40, color: '#8B5CF6' },
]

const SURFACES: Surface[] = ['sand', 'rocks', 'stairs']

function canTraverse(chassis: ChassisType, surface: Surface): boolean {
  const opt = CHASSIS_OPTIONS.find(c => c.type === chassis)!
  return opt.terrain.includes(surface)
}

// ---------------------------------------------------------------------------
// Helper: rounded rectangle
// ---------------------------------------------------------------------------

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

// ---------------------------------------------------------------------------
// Particle system for RobotMission2 animations
// ---------------------------------------------------------------------------

interface M2Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  type: 'dust' | 'confetti' | 'ambient' | 'fail'
  rotation?: number
  rotSpeed?: number
}

const M2_CONFETTI_COLORS = ['#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#A855F7', '#EC4899']

// Seeded random for consistent terrain rendering (avoids flicker)
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

// ---------------------------------------------------------------------------
// Test Animation Canvas
// ---------------------------------------------------------------------------

function TestAnimationCanvas({
  chassis,
  surface,
  isRunning,
  onAnimationEnd,
  t,
}: {
  chassis: ChassisType | null
  surface: Surface | null
  isRunning: boolean
  onAnimationEnd: (passed: boolean) => void
  t: (key: string) => string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const particlesRef = useRef<M2Particle[]>([])
  const confettiFiredRef = useRef(false)
  const [statusText, setStatusText] = useState('')
  const [statusColor, setStatusColor] = useState('')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width
    const H = canvas.height

    if (animRef.current) cancelAnimationFrame(animRef.current)
    setStatusText('')
    setStatusColor('')
    particlesRef.current = []
    confettiFiredRef.current = false

    if (!isRunning || !chassis || !surface) {
      // Draw idle state
      ctx.clearRect(0, 0, W, H)
      drawIdleScene(ctx, W, H)
      return
    }

    const passes = canTraverse(chassis, surface)
    const DURATION = 3000
    startTimeRef.current = performance.now()

    function animate(now: number) {
      if (!ctx || !canvas) return
      const elapsed = now - startTimeRef.current
      const progress = Math.min(elapsed / DURATION, 1)
      const time = elapsed / 1000

      ctx.clearRect(0, 0, W, H)
      drawTestScene(ctx, W, H, chassis!, surface!, passes, progress, time, particlesRef.current, { end: t('canvasEnd'), sand: t('canvasSand'), rocks: t('canvasRocks'), stairs: t('canvasStairs') })

      // Spawn dust behind robot while moving
      const groundY = H - 40
      const terrainStart = W * 0.25
      const terrainEnd = W * 0.75
      let robotX = 0
      const isMoving = passes ? progress < 0.9 : progress < 0.4
      if (passes) {
        robotX = 40 + progress * (W - 80)
      } else {
        const stuckPoint = terrainStart + (terrainEnd - terrainStart) * 0.3
        if (progress < 0.4) {
          robotX = 40 + (progress / 0.4) * (stuckPoint - 40)
        } else {
          robotX = stuckPoint
        }
      }

      if (isMoving && Math.random() < 0.35) {
        particlesRef.current.push({
          x: robotX - 15 + Math.random() * 10,
          y: groundY - 2 + Math.random() * 4,
          vx: -0.5 - Math.random() * 1.5,
          vy: -0.3 - Math.random() * 0.5,
          life: 1, maxLife: 25 + Math.random() * 15,
          size: 2 + Math.random() * 2.5,
          color: 'rgba(156, 163, 175, 0.5)',
          type: 'dust',
        })
      }

      // Ambient floating particles
      if (Math.random() < 0.06) {
        particlesRef.current.push({
          x: Math.random() * W,
          y: H - 30 - Math.random() * 20,
          vx: 0.2 + Math.random() * 0.3,
          vy: -0.1 - Math.random() * 0.15,
          life: 1, maxLife: 70 + Math.random() * 50,
          size: 1 + Math.random(),
          color: 'rgba(156, 163, 175, 0.25)',
          type: 'ambient',
        })
      }

      // Confetti on success
      if (passes && progress >= 0.75 && !confettiFiredRef.current) {
        confettiFiredRef.current = true
        const flagX = W - 40
        for (let i = 0; i < 40; i++) {
          const angle = Math.random() * Math.PI * 2
          const speed = 1.5 + Math.random() * 3.5
          particlesRef.current.push({
            x: flagX, y: groundY - 30,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2.5,
            life: 1, maxLife: 70 + Math.random() * 40,
            size: 3 + Math.random() * 3,
            color: M2_CONFETTI_COLORS[Math.floor(Math.random() * M2_CONFETTI_COLORS.length)],
            type: 'confetti',
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.2,
          })
        }
      }

      // Red flash particles on fail
      if (!passes && progress >= 0.5 && progress < 0.55 && particlesRef.current.filter(p => p.type === 'fail').length === 0) {
        for (let i = 0; i < 12; i++) {
          const angle = Math.random() * Math.PI * 2
          const speed = 1 + Math.random() * 2
          particlesRef.current.push({
            x: robotX, y: groundY - 40,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1,
            life: 1, maxLife: 25 + Math.random() * 15,
            size: 2 + Math.random() * 2,
            color: ['#EF4444', '#F97316', '#FCD34D'][Math.floor(Math.random() * 3)],
            type: 'fail',
          })
        }
      }

      // Update particles
      const alive: M2Particle[] = []
      particlesRef.current.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        if (p.type === 'confetti') {
          p.vy += 0.06
          p.rotation = (p.rotation ?? 0) + (p.rotSpeed ?? 0)
        }
        if (p.type === 'fail') p.vy += 0.05
        p.life -= 1 / p.maxLife
        if (p.life > 0) alive.push(p)
      })
      particlesRef.current = alive

      if (progress >= 0.75 && !statusText) {
        if (passes) {
          setStatusText(t('testPassed'))
          setStatusColor('bg-green-600/90')
        } else {
          setStatusText(t('testFailed'))
          setStatusColor('bg-red-600/90')
        }
      }

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        onAnimationEnd(passes)
      }
    }

    animRef.current = requestAnimationFrame(animate)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, chassis, surface])

  return (
    <div className="relative w-full rounded-xl border border-gray-800 overflow-hidden bg-gray-950">
      <canvas
        ref={canvasRef}
        width={600}
        height={280}
        className="w-full"
        style={{ minHeight: 200 }}
      />
      {statusText && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={clsx('px-6 py-3 rounded-xl text-lg font-black text-white', statusColor)}>
            {statusText}
          </div>
        </div>
      )}
      {!isRunning && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm pointer-events-none">
          {t('animIdle')}
        </div>
      )}
    </div>
  )
}

function drawIdleScene(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const groundY = H - 40

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H)
  bgGrad.addColorStop(0, '#0F172A')
  bgGrad.addColorStop(1, '#1E293B')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, W, H)

  // Isometric ground tiles
  drawIsoGround(ctx, W, H, groundY)
}

function drawIsoGround(ctx: CanvasRenderingContext2D, W: number, H: number, groundY: number) {
  const tileW = 55
  const tileH = 18
  const tileDepth = 10
  const tilesAcross = Math.ceil(W / (tileW / 2)) + 2

  for (let i = -1; i < tilesAcross; i++) {
    const tx = i * (tileW / 2) - 10
    const ty = groundY
    const isEven = i % 2 === 0

    // Top face
    ctx.beginPath()
    ctx.moveTo(tx, ty)
    ctx.lineTo(tx + tileW / 2, ty - tileH / 2)
    ctx.lineTo(tx + tileW, ty)
    ctx.lineTo(tx + tileW / 2, ty + tileH / 2)
    ctx.closePath()
    ctx.fillStyle = isEven ? '#2D3748' : '#334155'
    ctx.fill()
    ctx.strokeStyle = '#4A5568'
    ctx.lineWidth = 0.5
    ctx.stroke()

    // Front side
    ctx.beginPath()
    ctx.moveTo(tx, ty)
    ctx.lineTo(tx + tileW / 2, ty + tileH / 2)
    ctx.lineTo(tx + tileW / 2, ty + tileH / 2 + tileDepth)
    ctx.lineTo(tx, ty + tileDepth)
    ctx.closePath()
    ctx.fillStyle = isEven ? '#1A202C' : '#1E293B'
    ctx.fill()

    // Right side
    ctx.beginPath()
    ctx.moveTo(tx + tileW / 2, ty + tileH / 2)
    ctx.lineTo(tx + tileW, ty)
    ctx.lineTo(tx + tileW, ty + tileDepth)
    ctx.lineTo(tx + tileW / 2, ty + tileH / 2 + tileDepth)
    ctx.closePath()
    ctx.fillStyle = isEven ? '#171923' : '#1A202C'
    ctx.fill()
  }

  // Fill below
  ctx.fillStyle = '#0F172A'
  ctx.fillRect(0, groundY + tileH / 2 + tileDepth, W, H)
}

function drawTestScene(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  chassis: ChassisType,
  surface: Surface,
  passes: boolean,
  progress: number,
  time: number = 0,
  particles: M2Particle[] = [],
  labels: { end: string; sand: string; rocks: string; stairs: string } = { end: 'END', sand: 'SAND', rocks: 'ROCKS', stairs: 'STAIRS' },
) {
  const groundY = H - 40

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H)
  bgGrad.addColorStop(0, '#0F172A')
  bgGrad.addColorStop(1, '#1E293B')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, W, H)

  // Isometric ground tiles
  drawIsoGround(ctx, W, H, groundY)

  // Draw surface terrain in the middle section
  const terrainStart = W * 0.25
  const terrainEnd = W * 0.75
  drawSurface(ctx, surface, terrainStart, terrainEnd, groundY, labels)

  // Robot movement — stairs get special per-chassis behavior
  if (surface === 'stairs') {
    drawStairsAnimation(ctx, W, H, chassis, passes, progress, terrainStart, terrainEnd, groundY, time)
  } else {
    drawGenericAnimation(ctx, W, H, chassis, passes, progress, terrainStart, terrainEnd, groundY, time)
  }

  // Draw finish flag with glow
  const flagX = W - 50
  ctx.fillStyle = 'rgba(34, 197, 94, 0.15)'
  ctx.beginPath()
  ctx.arc(flagX + 10, groundY - 20, 25, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#22C55E'
  ctx.fillRect(flagX, groundY - 40, 4, 40)
  ctx.fillStyle = '#22C55E'
  ctx.fillRect(flagX + 4, groundY - 40, 20, 14)
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 9px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(labels.end, flagX + 14, groundY - 30)

  // Draw particles
  particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.life)
    ctx.fillStyle = p.color
    if (p.type === 'confetti') {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rotation ?? 0)
      ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6)
      ctx.restore()
    } else {
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
  })
  ctx.globalAlpha = 1

  // Red flash on fail
  if (!passes && progress >= 0.5 && progress < 0.6) {
    const flash = 1 - (progress - 0.5) / 0.1
    ctx.fillStyle = `rgba(239, 68, 68, ${flash * 0.12})`
    ctx.fillRect(0, 0, W, H)
  }
}

/**
 * Generic animation for non-stairs surfaces (sand, rocks).
 * Passing: robot crosses the whole scene.
 * Failing: robot gets stuck partway through terrain.
 */
function drawGenericAnimation(
  ctx: CanvasRenderingContext2D,
  W: number,
  _H: number,
  chassis: ChassisType,
  passes: boolean,
  progress: number,
  terrainStart: number,
  terrainEnd: number,
  groundY: number,
  time: number = 0,
) {
  let robotX: number
  let shake = 0

  if (passes) {
    // Ease in-out
    const t = progress
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
    robotX = 40 + ease * (W - 80)
  } else {
    const stuckPoint = terrainStart + (terrainEnd - terrainStart) * 0.3
    if (progress < 0.4) {
      robotX = 40 + (progress / 0.4) * (stuckPoint - 40)
    } else {
      robotX = stuckPoint
      const stuckProgress = (progress - 0.4) / 0.6
      shake = Math.sin(stuckProgress * 30) * 4 * Math.max(0, 1 - stuckProgress)
    }
  }

  drawRobot(ctx, robotX + shake, groundY, chassis, time)
}

/**
 * Stairs animation with per-chassis behavior:
 * - Wheels: hits first step, wobbles, stops (FAIL)
 * - Tracks: climbs first 2 steps then gets stuck (FAIL)
 * - Legs: walks up each step (SUCCESS)
 */
function drawStairsAnimation(
  ctx: CanvasRenderingContext2D,
  W: number,
  _H: number,
  chassis: ChassisType,
  passes: boolean,
  progress: number,
  terrainStart: number,
  terrainEnd: number,
  groundY: number,
  time: number = 0,
) {
  const stairWidth = (terrainEnd - terrainStart) / 6
  const stepHeight = 8

  if (chassis === 'legs') {
    if (progress < 0.15) {
      const robotX = 40 + (progress / 0.15) * (terrainStart - 40)
      drawRobot(ctx, robotX, groundY, chassis, time)
    } else if (progress < 0.7) {
      const climbProgress = (progress - 0.15) / 0.55
      const currentStep = Math.min(5, Math.floor(climbProgress * 6))
      const stepFraction = (climbProgress * 6) - currentStep

      const robotX = terrainStart + currentStep * stairWidth + stepFraction * stairWidth
      const currentStepH = (currentStep + 1) * stepHeight
      const nextStepH = Math.min((currentStep + 2) * stepHeight, 6 * stepHeight)
      const verticalOffset = stepFraction < 0.3
        ? currentStepH + (nextStepH - currentStepH) * (stepFraction / 0.3)
        : nextStepH
      const robotY = groundY - (stepFraction < 0.3 ? verticalOffset : currentStepH + (nextStepH - currentStepH) * Math.min(1, stepFraction / 0.3))

      const bobble = Math.sin(progress * 40) * 2

      drawRobot(ctx, robotX, robotY + bobble, chassis, time)
    } else {
      const endProgress = (progress - 0.7) / 0.3
      const topOfStairs = terrainEnd
      const robotX = topOfStairs + endProgress * (W - 80 - topOfStairs)
      const heightAtEnd = 6 * stepHeight
      const robotY = groundY - heightAtEnd * Math.max(0, 1 - endProgress * 2)
      drawRobot(ctx, robotX, robotY, chassis, time)
    }
  } else if (chassis === 'tracks') {
    const stuckX = terrainStart + 2 * stairWidth
    const stuckY = groundY - 2 * stepHeight

    if (progress < 0.2) {
      const robotX = 40 + (progress / 0.2) * (terrainStart - 40)
      drawRobot(ctx, robotX, groundY, chassis, time)
    } else if (progress < 0.45) {
      const climbProgress = (progress - 0.2) / 0.25
      const robotX = terrainStart + climbProgress * 2 * stairWidth
      const robotY = groundY - climbProgress * 2 * stepHeight
      const tilt = Math.sin(climbProgress * Math.PI) * 3
      drawRobot(ctx, robotX + tilt, robotY, chassis, time)
    } else {
      const stuckProgress = (progress - 0.45) / 0.55
      const wobble = Math.sin(stuckProgress * 25) * 5 * Math.max(0, 1 - stuckProgress * 0.8)
      const pushForward = Math.sin(stuckProgress * 8) * 6 * Math.max(0, 1 - stuckProgress)
      drawRobot(ctx, stuckX + pushForward, stuckY + wobble, chassis, time)
    }
  } else {
    const hitPoint = terrainStart + stairWidth * 0.2

    if (progress < 0.3) {
      const robotX = 40 + (progress / 0.3) * (hitPoint - 40)
      drawRobot(ctx, robotX, groundY, chassis, time)
    } else {
      const stuckProgress = (progress - 0.3) / 0.7
      const wobbleX = Math.sin(stuckProgress * 20) * 4 * Math.max(0, 1 - stuckProgress * 0.7)
      const bounceY = Math.abs(Math.sin(stuckProgress * 15)) * 3 * Math.max(0, 1 - stuckProgress)
      drawRobot(ctx, hitPoint + wobbleX, groundY - bounceY, chassis, time)
    }
  }
}

function drawSurface(
  ctx: CanvasRenderingContext2D,
  surface: Surface,
  startX: number,
  endX: number,
  groundY: number,
  labels: { sand: string; rocks: string; stairs: string } = { sand: 'SAND', rocks: 'ROCKS', stairs: 'STAIRS' },
) {
  const w = endX - startX

  if (surface === 'sand') {
    // Sand with gradient and consistent dots
    const sandGrad = ctx.createLinearGradient(startX, groundY - 6, startX, groundY + 30)
    sandGrad.addColorStop(0, '#E8C88A')
    sandGrad.addColorStop(1, '#C4956A')
    ctx.fillStyle = sandGrad
    ctx.fillRect(startX, groundY - 6, w, 36)
    // Consistent sand dots (seeded)
    ctx.fillStyle = '#B8864E'
    for (let i = 0; i < 25; i++) {
      const sx = startX + seededRandom(i * 7 + 1) * w
      const sy = groundY - 3 + seededRandom(i * 13 + 5) * 10
      ctx.beginPath()
      ctx.arc(sx, sy, 1.5 + seededRandom(i * 3) * 1.5, 0, Math.PI * 2)
      ctx.fill()
    }
    // Wavy sand line
    ctx.strokeStyle = '#D4A574'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(startX, groundY - 2)
    for (let px = startX; px <= endX; px += 5) {
      ctx.lineTo(px, groundY - 2 + Math.sin(px * 0.04) * 3)
    }
    ctx.stroke()
    ctx.fillStyle = '#92400E'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(labels.sand, startX + w / 2, groundY + 20)
  } else if (surface === 'rocks') {
    ctx.fillStyle = '#4B5563'
    ctx.fillRect(startX, groundY - 4, w, 34)
    // 3D rock shapes with highlights
    for (let i = 0; i < 8; i++) {
      const rx = startX + 15 + i * (w / 8)
      const rh = 10 + seededRandom(i * 17 + 3) * 12
      const rw = 16 + seededRandom(i * 11 + 7) * 6
      // Rock body
      ctx.fillStyle = '#374151'
      roundRect(ctx, rx, groundY - rh, rw, rh, 3)
      ctx.fill()
      // Rock highlight
      ctx.fillStyle = '#6B7280'
      roundRect(ctx, rx + 2, groundY - rh + 2, rw - 6, rh * 0.4, 2)
      ctx.fill()
      // Rock shadow
      ctx.fillStyle = '#1F2937'
      ctx.fillRect(rx + 2, groundY - 3, rw - 4, 3)
    }
    ctx.fillStyle = '#9CA3AF'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(labels.rocks, startX + w / 2, groundY + 20)
  } else {
    // Stairs with 3D side faces
    const steps = 6
    const stepW = w / steps
    for (let i = 0; i < steps; i++) {
      const stepH = (i + 1) * 8
      const sx = startX + i * stepW
      const sy = groundY - stepH
      const depth = 4

      // Step top
      ctx.fillStyle = '#78716C'
      ctx.fillRect(sx, sy, stepW, stepH)
      ctx.strokeStyle = '#57534E'
      ctx.lineWidth = 1
      ctx.strokeRect(sx, sy, stepW, stepH)

      // Step top highlight
      ctx.fillStyle = '#A8A29E'
      ctx.fillRect(sx, sy, stepW, 3)

      // Step front shadow
      ctx.fillStyle = '#44403C'
      ctx.fillRect(sx, sy + stepH - depth, stepW, depth)
    }
    ctx.fillStyle = '#A8A29E'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(labels.stairs, startX + w / 2, groundY + 20)
  }
}

function drawRobot(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  chassis: ChassisType,
  time: number = 0,
) {
  const opt = CHASSIS_OPTIONS.find(c => c.type === chassis)!
  const bodyW = 50
  const bodyH = 35
  const bodyTop = groundY - bodyH - 20

  // Shadow under robot
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
  ctx.beginPath()
  ctx.ellipse(x, groundY + 2, 25, 5, 0, 0, Math.PI * 2)
  ctx.fill()

  // Locomotion
  if (chassis === 'wheels') {
    const wheelR = 8
    // Left wheel
    ctx.fillStyle = opt.color
    ctx.beginPath()
    ctx.arc(x - 15, groundY - wheelR, wheelR, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = opt.color
    ctx.lineWidth = 1
    ctx.stroke()
    // Spinning spokes
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 1.5
    for (let s = 0; s < 4; s++) {
      const a = time * 6 + (s * Math.PI) / 2
      ctx.beginPath()
      ctx.moveTo(x - 15, groundY - wheelR)
      ctx.lineTo(x - 15 + Math.cos(a) * wheelR * 0.65, groundY - wheelR + Math.sin(a) * wheelR * 0.65)
      ctx.stroke()
    }
    // Hub
    ctx.fillStyle = '#333'
    ctx.beginPath()
    ctx.arc(x - 15, groundY - wheelR, 2.5, 0, Math.PI * 2)
    ctx.fill()
    // Right wheel
    ctx.fillStyle = opt.color
    ctx.beginPath()
    ctx.arc(x + 15, groundY - wheelR, wheelR, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = opt.color
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 1.5
    for (let s = 0; s < 4; s++) {
      const a = time * 6 + (s * Math.PI) / 2
      ctx.beginPath()
      ctx.moveTo(x + 15, groundY - wheelR)
      ctx.lineTo(x + 15 + Math.cos(a) * wheelR * 0.65, groundY - wheelR + Math.sin(a) * wheelR * 0.65)
      ctx.stroke()
    }
    ctx.fillStyle = '#333'
    ctx.beginPath()
    ctx.arc(x + 15, groundY - wheelR, 2.5, 0, Math.PI * 2)
    ctx.fill()
  } else if (chassis === 'tracks') {
    ctx.fillStyle = opt.color
    roundRect(ctx, x - 25, groundY - 18, 22, 14, 4)
    ctx.fill()
    roundRect(ctx, x + 3, groundY - 18, 22, 14, 4)
    ctx.fill()
    // Animated track treads
    ctx.strokeStyle = '#555'
    ctx.lineWidth = 1
    const offset = (time * 20) % 8
    for (let i = 0; i < 4; i++) {
      const lx = x - 24 + ((i * 8 + offset) % 22)
      ctx.beginPath(); ctx.moveTo(lx, groundY - 17); ctx.lineTo(lx, groundY - 5); ctx.stroke()
      const rx = x + 4 + ((i * 8 + offset) % 22)
      ctx.beginPath(); ctx.moveTo(rx, groundY - 17); ctx.lineTo(rx, groundY - 5); ctx.stroke()
    }
  } else {
    // Legs with walking animation
    const walk = Math.sin(time * 8) * 3
    ctx.strokeStyle = opt.color
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    // Left leg
    ctx.beginPath()
    ctx.moveTo(x - 12, groundY - 20)
    ctx.lineTo(x - 16 + walk, groundY - 10)
    ctx.lineTo(x - 12, groundY - 2)
    ctx.stroke()
    // Right leg
    ctx.beginPath()
    ctx.moveTo(x + 12, groundY - 20)
    ctx.lineTo(x + 16 - walk, groundY - 10)
    ctx.lineTo(x + 12, groundY - 2)
    ctx.stroke()
    // Feet
    ctx.fillStyle = opt.color
    ctx.fillRect(x - 18, groundY - 4, 10, 4)
    ctx.fillRect(x + 8, groundY - 4, 10, 4)
  }

  // Body with glow
  ctx.fillStyle = '#3B82F6'
  ctx.strokeStyle = '#0FF'
  ctx.lineWidth = 1.5
  roundRect(ctx, x - bodyW / 2, bodyTop, bodyW, bodyH, 6)
  ctx.fill()
  ctx.stroke()
  // Body glow
  ctx.shadowColor = '#0FF'
  ctx.shadowBlur = 6
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)'
  ctx.lineWidth = 2
  roundRect(ctx, x - bodyW / 2 - 2, bodyTop - 2, bodyW + 4, bodyH + 4, 8)
  ctx.stroke()
  ctx.shadowBlur = 0

  // Head
  ctx.fillStyle = '#8B5CF6'
  ctx.beginPath()
  ctx.arc(x, bodyTop - 10, 12, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#0FF'
  ctx.lineWidth = 1
  ctx.stroke()
  // Eyes
  ctx.fillStyle = '#0FF'
  ctx.beginPath()
  ctx.arc(x - 4, bodyTop - 12, 2.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x + 4, bodyTop - 12, 2.5, 0, Math.PI * 2)
  ctx.fill()
  // Antenna with blinking tip
  ctx.strokeStyle = '#0FF'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x, bodyTop - 22)
  ctx.lineTo(x, bodyTop - 32)
  ctx.stroke()
  const blink = Math.sin(time * 5) > 0.3 ? 1 : 0.3
  ctx.fillStyle = `rgba(0, 255, 255, ${blink})`
  ctx.beginPath()
  ctx.arc(x, bodyTop - 34, 2.5, 0, Math.PI * 2)
  ctx.fill()
  // Antenna glow
  ctx.fillStyle = `rgba(0, 255, 255, ${blink * 0.25})`
  ctx.beginPath()
  ctx.arc(x, bodyTop - 34, 5, 0, Math.PI * 2)
  ctx.fill()
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function RobotMission2({ onComplete }: RobotMission2Props) {
  const t = useTranslations('missions.robot.m2')

  const [selectedChassis, setSelectedChassis] = useState<ChassisType | null>(null)
  const [testSurface, setTestSurface] = useState<Surface | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [testRecords, setTestRecords] = useState<TestRecord[]>([])
  const [finalChoice, setFinalChoice] = useState<ChassisType | null>(null)
  const [phase, setPhase] = useState<'testing' | 'choosing' | 'done'>('testing')

  // Track which surfaces each chassis has been tested on
  const getTestedSurfaces = useCallback((chassis: ChassisType): Set<Surface> => {
    const set = new Set<Surface>()
    for (const rec of testRecords) {
      if (rec.chassis === chassis) set.add(rec.surface)
    }
    return set
  }, [testRecords])

  // Count unique surfaces tested with the selected chassis
  const surfacesTestedWithSelected = selectedChassis ? getTestedSurfaces(selectedChassis).size : 0

  // Count total unique chassis-surface combos tested
  const totalUniqueTests = new Set(testRecords.map(r => `${r.chassis}-${r.surface}`)).size

  const handleRunTest = useCallback(() => {
    if (!selectedChassis || !testSurface) return
    setIsAnimating(true)
  }, [selectedChassis, testSurface])

  const handleAnimationEnd = useCallback((passed: boolean) => {
    setIsAnimating(false)
    if (selectedChassis && testSurface) {
      setTestRecords(prev => {
        // Avoid duplicates
        const key = `${selectedChassis}-${testSurface}`
        if (prev.some(r => `${r.chassis}-${r.surface}` === key)) return prev
        return [...prev, { chassis: selectedChassis, surface: testSurface, passed }]
      })
    }
  }, [selectedChassis, testSurface])

  const handleConfirmChoice = useCallback(() => {
    if (!selectedChassis) return
    setFinalChoice(selectedChassis)
    setPhase('done')

    // Calculate score
    // Choice quality: Legs=500, Tracks=300, Wheels=100
    const choiceScore = selectedChassis === 'legs' ? 500 : selectedChassis === 'tracks' ? 300 : 100

    // Testing thoroughness: how many unique surfaces were tested (across ALL chassis types)
    const uniqueSurfacesTested = new Set(testRecords.map(r => r.surface)).size
    const thoroughness = uniqueSurfacesTested >= 3 ? 350 : uniqueSurfacesTested >= 2 ? 200 : 100

    // Budget awareness: always awarded
    const budgetScore = 150

    const total = choiceScore + thoroughness + budgetScore

    const breakdownItems: ScoreBreakdownItem[] = [
      { label: t('scoreChoice'), value: choiceScore, max: 500 },
      { label: t('scoreTesting'), value: thoroughness, max: 350 },
      { label: t('scoreBudget'), value: budgetScore, max: 150 },
    ]

    onComplete?.(total, breakdownItems)
  }, [selectedChassis, testRecords, onComplete, t])

  const getTestResult = useCallback((chassis: ChassisType, surface: Surface): boolean | null => {
    const rec = testRecords.find(r => r.chassis === chassis && r.surface === surface)
    return rec ? rec.passed : null
  }, [testRecords])

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Story/task description */}
      <div className="bg-gray-950 rounded-xl p-4 border border-gray-800">
        <p className="text-gray-300 text-sm">{t('story')}</p>
        <p className="text-yellow-400 text-sm font-bold mt-2">{t('requirement')}</p>
      </div>

      {/* Chassis selection */}
      <div>
        <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">{t('chooseChassis')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {CHASSIS_OPTIONS.map(opt => (
            <button
              key={opt.type}
              onClick={() => { if (!isAnimating) setSelectedChassis(opt.type) }}
              disabled={isAnimating}
              className={clsx(
                'p-4 rounded-xl border-2 text-left transition-all',
                selectedChassis === opt.type
                  ? 'border-blue-500 bg-blue-900/20 scale-[1.02]'
                  : 'border-gray-700 bg-gray-900 hover:border-gray-500',
                isAnimating && 'opacity-50 cursor-not-allowed',
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl font-black text-white">{t(`chassis.${opt.type}`)}</span>
                <span className="text-yellow-400 font-bold">${opt.cost}</span>
              </div>
              <div className="space-y-1 text-sm text-gray-400">
                <p>{t('speed')}: <span className="text-blue-300">{t(`speeds.${opt.speed}`)}</span></p>
                <p>{t('terrainLabel')}: <span className="text-blue-300">{opt.terrain.map(te => t(`surfaces.${te}`)).join(', ')}</span></p>
              </div>
              {/* Show test results for this chassis */}
              {SURFACES.some(s => getTestResult(opt.type, s) !== null) && (
                <div className="mt-2 flex gap-2">
                  {SURFACES.map(s => {
                    const result = getTestResult(opt.type, s)
                    if (result === null) return null
                    return (
                      <span key={s} className={clsx(
                        'text-xs px-2 py-0.5 rounded font-bold',
                        result ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400',
                      )}>
                        {t(`surfaces.${s}`)}: {result ? '\u2713' : '\u2717'}
                      </span>
                    )
                  })}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Surface selection + Test button */}
      {selectedChassis && (
        <div>
          <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">{t('chooseSurface')}</h3>
          <div className="flex flex-wrap gap-3 items-center">
            {SURFACES.map(s => (
              <button
                key={s}
                onClick={() => { if (!isAnimating) setTestSurface(s) }}
                disabled={isAnimating}
                className={clsx(
                  'px-4 py-2 rounded-lg border-2 font-bold transition-all',
                  testSurface === s
                    ? 'border-blue-500 bg-blue-900/20 text-white'
                    : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500',
                  isAnimating && 'opacity-50 cursor-not-allowed',
                )}
              >
                {t(`surfaces.${s}`)}
              </button>
            ))}

            <button
              onClick={handleRunTest}
              disabled={!selectedChassis || !testSurface || isAnimating}
              className={clsx(
                'px-6 py-2 rounded-lg font-black uppercase tracking-wider transition-all ml-auto',
                selectedChassis && testSurface && !isAnimating
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed',
              )}
            >
              {t('testButton')}
            </button>
          </div>
        </div>
      )}

      {/* Animation canvas */}
      <TestAnimationCanvas
        chassis={selectedChassis}
        surface={testSurface}
        isRunning={isAnimating}
        onAnimationEnd={handleAnimationEnd}
        t={t}
      />

      {/* Test results summary */}
      {testRecords.length > 0 && (
        <div className="bg-gray-950 rounded-xl p-4 border border-gray-800">
          <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">{t('testResults')}</h3>
          <div className="grid grid-cols-4 gap-1 text-xs">
            {/* Header */}
            <div className="font-bold text-gray-500" />
            {SURFACES.map(s => (
              <div key={s} className="font-bold text-gray-400 text-center">{t(`surfaces.${s}`)}</div>
            ))}
            {/* Rows per chassis */}
            {CHASSIS_OPTIONS.map(opt => (
              <div key={opt.type} className="contents">
                <div className="font-bold text-white py-1">{t(`chassis.${opt.type}`)}</div>
                {SURFACES.map(s => {
                  const result = getTestResult(opt.type, s)
                  return (
                    <div key={s} className="text-center py-1">
                      {result === null ? (
                        <span className="text-gray-600">--</span>
                      ) : result ? (
                        <span className="text-green-400 font-bold">{'\u2713'}</span>
                      ) : (
                        <span className="text-red-400 font-bold">{'\u2717'}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm choice button */}
      {phase === 'testing' && selectedChassis && (
        <button
          onClick={handleConfirmChoice}
          disabled={isAnimating}
          className={clsx(
            'w-full py-3 rounded-xl font-black text-lg uppercase tracking-wider transition-all',
            !isAnimating
              ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/30'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed',
          )}
        >
          {t('confirmChoice', { chassis: t(`chassis.${selectedChassis}`) })}
        </button>
      )}
    </div>
  )
}
