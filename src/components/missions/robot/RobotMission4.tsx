'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import clsx from 'clsx'
import { useTranslations } from 'next-intl'
import type { ScoreBreakdownItem } from '@/components/missions/common/MissionShell'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MotorSize = 'small' | 'medium' | 'large'

interface MotorOption {
  size: MotorSize
  torque: number
  cost: number
  color: string
}

export interface RobotMission4Props {
  onComplete?: (score: number, breakdown: ScoreBreakdownItem[]) => void
}

// ---------------------------------------------------------------------------
// Data — physics constants
// ---------------------------------------------------------------------------

const REQUIRED_FORCE = 500 // Newtons to climb 30° slope with 50kg
const BASE_SPEED = 10     // m/s base motor speed
const OVERHEAT_SPEED_THRESHOLD = 1.5 // below this speed, motor overheats
const MIN_FORCE_RATIO = 1  // Force must be >= REQUIRED_FORCE

const MOTOR_OPTIONS: MotorOption[] = [
  { size: 'small',  torque: 50,  cost: 10, color: '#60A5FA' },
  { size: 'medium', torque: 100, cost: 20, color: '#F59E0B' },
  { size: 'large',  torque: 200, cost: 35, color: '#A78BFA' },
]

function calculateForce(torque: number, ratio: number): number {
  return torque * ratio
}

function calculateSpeed(ratio: number): number {
  return BASE_SPEED / ratio
}

type ClimbResult = 'success' | 'slides' | 'overheats'

function getClimbResult(torque: number, ratio: number): ClimbResult {
  const force = calculateForce(torque, ratio)
  const speed = calculateSpeed(ratio)

  if (force < REQUIRED_FORCE) return 'slides'
  if (speed < OVERHEAT_SPEED_THRESHOLD) return 'overheats'
  return 'success'
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
// Color helpers
// ---------------------------------------------------------------------------

function darkenColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`
}

function lightenColor(hex: string, factor: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) * factor)
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) * factor)
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) * factor)
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
}

// ---------------------------------------------------------------------------
// Particle system
// ---------------------------------------------------------------------------

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
  type: 'exhaust' | 'spark' | 'dust' | 'steam' | 'confetti' | 'ambient'
}

function createExhaustParticles(x: number, y: number, intensity: number): Particle[] {
  const particles: Particle[] = []
  const count = Math.floor(1 + intensity * 3)
  for (let i = 0; i < count; i++) {
    const gray = 100 + Math.random() * 80
    particles.push({
      x: x + (Math.random() - 0.5) * 6,
      y: y + (Math.random() - 0.5) * 4,
      vx: -1 - Math.random() * 2,
      vy: -0.5 - Math.random() * 1.5,
      life: 1,
      maxLife: 0.6 + Math.random() * 0.5,
      color: `rgba(${gray}, ${gray}, ${gray}, 0.6)`,
      size: 3 + Math.random() * 4 + intensity * 3,
      type: 'exhaust',
    })
  }
  return particles
}

function createWheelSparks(x: number, y: number): Particle[] {
  const particles: Particle[] = []
  for (let i = 0; i < 4; i++) {
    particles.push({
      x,
      y,
      vx: -2 - Math.random() * 3,
      vy: -1 - Math.random() * 2,
      life: 1,
      maxLife: 0.3 + Math.random() * 0.2,
      color: Math.random() > 0.5 ? '#FCD34D' : '#FB923C',
      size: 1 + Math.random() * 2,
      type: 'spark',
    })
  }
  return particles
}

function createDustParticles(x: number, y: number): Particle[] {
  const particles: Particle[] = []
  for (let i = 0; i < 3; i++) {
    const brown = 140 + Math.random() * 40
    particles.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y + Math.random() * 4,
      vx: -1.5 - Math.random() * 2,
      vy: -0.3 - Math.random() * 0.8,
      life: 1,
      maxLife: 0.8 + Math.random() * 0.5,
      color: `rgba(${brown}, ${brown - 30}, ${brown - 60}, 0.5)`,
      size: 4 + Math.random() * 6,
      type: 'dust',
    })
  }
  return particles
}

function createSteamParticles(x: number, y: number): Particle[] {
  const particles: Particle[] = []
  for (let i = 0; i < 5; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y - Math.random() * 10,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -1.5 - Math.random() * 2,
      life: 1,
      maxLife: 1 + Math.random() * 0.8,
      color: `rgba(200, 200, 220, 0.5)`,
      size: 5 + Math.random() * 8,
      type: 'steam',
    })
  }
  return particles
}

function createConfettiParticles(x: number, y: number): Particle[] {
  const particles: Particle[] = []
  const colors = ['#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#A855F7', '#EC4899']
  for (let i = 0; i < 50; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 2 + Math.random() * 5
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      life: 1,
      maxLife: 1.5 + Math.random() * 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 3 + Math.random() * 4,
      type: 'confetti',
    })
  }
  return particles
}

function updateParticles(particles: Particle[], dt: number): Particle[] {
  return particles
    .map(p => {
      const gravity = p.type === 'exhaust' || p.type === 'steam' ? -0.02 : p.type === 'ambient' ? 0 : 0.1
      return {
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        vy: p.vy + gravity,
        life: p.life - dt / p.maxLife,
        size: p.type === 'exhaust' || p.type === 'steam' || p.type === 'dust'
          ? p.size * 1.02
          : p.type === 'spark' ? p.size * 0.94 : p.size,
      }
    })
    .filter(p => p.life > 0)
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.life * (p.type === 'exhaust' || p.type === 'dust' || p.type === 'steam' ? 0.6 : 1))

    if (p.type === 'spark') {
      // Glowing spark
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2)
      glow.addColorStop(0, '#fff')
      glow.addColorStop(0.3, p.color)
      glow.addColorStop(1, 'transparent')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2)
      ctx.fill()
    } else if (p.type === 'confetti') {
      ctx.fillStyle = p.color
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.life * 12)
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
      ctx.restore()
    } else if (p.type === 'exhaust' || p.type === 'steam' || p.type === 'dust') {
      // Soft cloud particle
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size)
      grad.addColorStop(0, p.color)
      grad.addColorStop(1, 'transparent')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
  })
  ctx.globalAlpha = 1
}

// ---------------------------------------------------------------------------
// Climb Animation Canvas (2.5D upgraded)
// ---------------------------------------------------------------------------

function ClimbAnimationCanvas({
  motorTorque,
  gearRatio,
  isRunning,
  onAnimationEnd,
  t,
}: {
  motorTorque: number
  gearRatio: number
  isRunning: boolean
  onAnimationEnd: (result: ClimbResult) => void
  t: (key: string) => string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const particlesRef = useRef<Particle[]>([])
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

    if (!isRunning) {
      // Idle animation loop
      let idleAnim = 0
      const idleLoop = (now: number) => {
        if (!ctx || !canvas) return
        ctx.clearRect(0, 0, W, H)
        drawHillIdle25D(ctx, W, H, now / 1000, t('canvasTop'))
        idleAnim = requestAnimationFrame(idleLoop)
      }
      idleAnim = requestAnimationFrame(idleLoop)
      return () => cancelAnimationFrame(idleAnim)
    }

    const result = getClimbResult(motorTorque, gearRatio)
    const DURATION = result === 'overheats' ? 5000 : 3500
    startTimeRef.current = performance.now()
    let statusShown = false
    let sparkTimer = 0
    let dustTimer = 0
    let exhaustTimer = 0
    let steamTimer = 0
    let confettiSpawned = false

    function animate(now: number) {
      if (!ctx || !canvas) return
      const elapsed = now - startTimeRef.current
      const progress = Math.min(elapsed / DURATION, 1)
      const time = now / 1000

      particlesRef.current = updateParticles(particlesRef.current, 1 / 60)

      ctx.clearRect(0, 0, W, H)

      const groundY = H - 50
      const slopeStartX = W * 0.25
      const slopeEndX = W * 0.85
      const slopeTopY = H * 0.2

      // Calculate robot position for particle spawning
      let robotFraction = 0
      let isOnSlope = progress >= 0.15
      let isSliding = false
      let isOverheating = false

      if (result === 'success') {
        if (progress >= 0.15) robotFraction = (progress - 0.15) / 0.85
      } else if (result === 'slides') {
        if (progress >= 0.15 && progress < 0.5) {
          robotFraction = ((progress - 0.15) / 0.35) * 0.3
        } else if (progress >= 0.5) {
          robotFraction = 0.3 * (1 - (progress - 0.5) / 0.5)
          isSliding = true
        }
      } else {
        if (progress >= 0.15 && progress < 0.6) {
          robotFraction = ((progress - 0.15) / 0.45) * 0.4
        } else if (progress >= 0.6) {
          robotFraction = 0.4
          isOverheating = true
        }
      }

      // Calculate position on slope for particles
      if (isOnSlope) {
        const slopeAngle = Math.atan2(groundY - slopeTopY, slopeEndX - slopeStartX)
        const slopeLen = Math.sqrt((slopeEndX - slopeStartX) ** 2 + (groundY - slopeTopY) ** 2)
        const dist = robotFraction * slopeLen
        const robotX = slopeStartX + Math.cos(slopeAngle) * dist
        const robotY = groundY - Math.sin(slopeAngle) * dist

        // Spawn exhaust when climbing
        exhaustTimer += 1 / 60
        if (exhaustTimer > 0.08 && progress >= 0.15) {
          exhaustTimer = 0
          const intensity = isOverheating ? 1 : isSliding ? 0.3 : 0.5
          particlesRef.current = [
            ...particlesRef.current,
            ...createExhaustParticles(robotX - 20, robotY - 20, intensity),
          ]
        }

        // Dust behind wheels
        dustTimer += 1 / 60
        if (dustTimer > 0.12 && progress >= 0.15 && !isOverheating) {
          dustTimer = 0
          particlesRef.current = [
            ...particlesRef.current,
            ...createDustParticles(robotX - 15, robotY),
          ]
        }

        // Sparks when sliding
        sparkTimer += 1 / 60
        if (isSliding && sparkTimer > 0.06) {
          sparkTimer = 0
          particlesRef.current = [
            ...particlesRef.current,
            ...createWheelSparks(robotX - 10, robotY),
          ]
        }

        // Steam when overheating
        steamTimer += 1 / 60
        if (isOverheating && steamTimer > 0.1) {
          steamTimer = 0
          particlesRef.current = [
            ...particlesRef.current,
            ...createSteamParticles(robotX, robotY - 40),
          ]
        }
      }

      // Confetti on success
      if (result === 'success' && progress >= 0.85 && !confettiSpawned) {
        confettiSpawned = true
        particlesRef.current = [
          ...particlesRef.current,
          ...createConfettiParticles(slopeEndX + 20, slopeTopY - 20),
        ]
      }

      drawHillScene25D(ctx, W, H, result, progress, gearRatio, time, particlesRef.current, t('canvasTop'), t('canvasWeight'))

      if (progress >= 0.75 && !statusShown) {
        statusShown = true
        if (result === 'success') {
          setStatusText(t('climbSuccess'))
          setStatusColor('bg-green-600/90')
        } else if (result === 'slides') {
          setStatusText(t('climbSlides'))
          setStatusColor('bg-red-600/90')
        } else {
          setStatusText(t('climbOverheats'))
          setStatusColor('bg-orange-600/90')
        }
      }

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        onAnimationEnd(result)
      }
    }

    animRef.current = requestAnimationFrame(animate)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, motorTorque, gearRatio])

  return (
    <div className="relative w-full rounded-xl border border-gray-800 overflow-hidden bg-gray-950">
      <canvas
        ref={canvasRef}
        width={700}
        height={360}
        className="w-full"
        style={{ minHeight: 240 }}
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

// ---------------------------------------------------------------------------
// 2.5D Hill Drawing Functions
// ---------------------------------------------------------------------------

function drawSky25D(ctx: CanvasRenderingContext2D, W: number, H: number, time: number) {
  // Multi-layer sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H)
  skyGrad.addColorStop(0, '#0B1120')
  skyGrad.addColorStop(0.2, '#111B33')
  skyGrad.addColorStop(0.5, '#1A2744')
  skyGrad.addColorStop(0.8, '#2A3B5C')
  skyGrad.addColorStop(1, '#3D5478')
  ctx.fillStyle = skyGrad
  ctx.fillRect(0, 0, W, H)

  // Stars
  for (let i = 0; i < 35; i++) {
    const sx = ((i * 137 + 50) % W)
    const sy = ((i * 97 + 10) % (H * 0.35))
    const twinkle = Math.sin(time * 1.5 + i * 0.9) * 0.3 + 0.5
    ctx.fillStyle = `rgba(255,255,255,${twinkle})`
    ctx.beginPath()
    ctx.arc(sx, sy, 0.5 + (i % 3) * 0.3, 0, Math.PI * 2)
    ctx.fill()
  }

  // Floating clouds
  for (let i = 0; i < 3; i++) {
    const cx = ((time * 8 + i * 250) % (W + 200)) - 100
    const cy = 30 + i * 35
    const scale = 0.6 + i * 0.2
    ctx.globalAlpha = 0.12 + i * 0.03
    ctx.fillStyle = '#7B9CC0'

    // Cloud puffs
    ctx.beginPath()
    ctx.arc(cx, cy, 20 * scale, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(cx + 18 * scale, cy - 5, 15 * scale, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(cx - 15 * scale, cy + 3, 12 * scale, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(cx + 8 * scale, cy + 8, 14 * scale, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

function drawTerrain25D(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  time: number,
  slopeStartX: number,
  slopeEndX: number,
  groundY: number,
  slopeTopY: number,
) {
  const depth = 40 // Side face depth for 2.5D

  // Background hills (parallax)
  ctx.fillStyle = '#1E293B'
  ctx.beginPath()
  ctx.moveTo(0, H * 0.5)
  for (let x = 0; x <= W; x += 10) {
    ctx.lineTo(x, H * 0.45 + Math.sin(x * 0.008) * 25 + Math.sin(x * 0.015) * 15)
  }
  ctx.lineTo(W, H)
  ctx.lineTo(0, H)
  ctx.closePath()
  ctx.fill()

  // Main terrain shape - top surface
  const terrainGrad = ctx.createLinearGradient(0, slopeTopY, 0, groundY + 20)
  terrainGrad.addColorStop(0, '#4A7C59') // grass green at top
  terrainGrad.addColorStop(0.3, '#5C8A5E')
  terrainGrad.addColorStop(0.6, '#8B7355') // brown/dirt
  terrainGrad.addColorStop(1, '#6B5B45')
  ctx.fillStyle = terrainGrad

  ctx.beginPath()
  ctx.moveTo(0, groundY)
  ctx.lineTo(slopeStartX, groundY)
  ctx.lineTo(slopeEndX, slopeTopY)
  ctx.lineTo(W, slopeTopY)
  ctx.lineTo(W, H)
  ctx.lineTo(0, H)
  ctx.closePath()
  ctx.fill()

  // Front face (side depth for 2.5D)
  ctx.fillStyle = '#4A3C2E'
  ctx.beginPath()
  ctx.moveTo(0, groundY)
  ctx.lineTo(0, groundY + depth)
  ctx.lineTo(slopeStartX, groundY + depth)
  ctx.lineTo(slopeStartX, groundY)
  ctx.closePath()
  ctx.fill()

  // Slope front face
  ctx.fillStyle = '#3D3228'
  ctx.beginPath()
  ctx.moveTo(slopeStartX, groundY)
  ctx.lineTo(slopeStartX, groundY + depth)
  ctx.lineTo(slopeEndX, slopeTopY + depth)
  ctx.lineTo(slopeEndX, slopeTopY)
  ctx.closePath()
  ctx.fill()

  // Top plateau front face
  ctx.fillStyle = '#4A3C2E'
  ctx.beginPath()
  ctx.moveTo(slopeEndX, slopeTopY)
  ctx.lineTo(slopeEndX, slopeTopY + depth)
  ctx.lineTo(W, slopeTopY + depth)
  ctx.lineTo(W, slopeTopY)
  ctx.closePath()
  ctx.fill()

  // Dirt layers visible in front face
  ctx.strokeStyle = '#5C4B3A'
  ctx.lineWidth = 1
  for (let layer = 0; layer < 3; layer++) {
    const ly = groundY + depth * (0.3 + layer * 0.25)
    ctx.beginPath()
    ctx.moveTo(0, ly)
    for (let x = 0; x < slopeStartX; x += 5) {
      ctx.lineTo(x, ly + Math.sin(x * 0.1 + layer) * 1.5)
    }
    ctx.stroke()
  }

  // Surface line with highlights
  ctx.strokeStyle = '#6B8E5E'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(0, groundY)
  ctx.lineTo(slopeStartX, groundY)
  ctx.lineTo(slopeEndX, slopeTopY)
  ctx.lineTo(W, slopeTopY)
  ctx.stroke()

  // Grass tufts on flat ground
  ctx.strokeStyle = '#5C8A5E'
  ctx.lineWidth = 1.5
  for (let i = 0; i < 8; i++) {
    const gx = 20 + i * (slopeStartX - 20) / 8
    const gy = groundY
    const sway = Math.sin(time * 2 + i * 1.5) * 2
    for (let j = 0; j < 3; j++) {
      ctx.beginPath()
      ctx.moveTo(gx + j * 3 - 3, gy)
      ctx.quadraticCurveTo(gx + j * 3 - 3 + sway, gy - 8, gx + j * 3 - 1 + sway * 1.5, gy - 12)
      ctx.stroke()
    }
  }

  // Grass on slope
  const slopeAngle = Math.atan2(groundY - slopeTopY, slopeEndX - slopeStartX)
  const slopeLen = Math.sqrt((slopeEndX - slopeStartX) ** 2 + (groundY - slopeTopY) ** 2)
  for (let i = 0; i < 12; i++) {
    const frac = 0.05 + (i / 12) * 0.9
    const gx = slopeStartX + Math.cos(slopeAngle) * slopeLen * frac
    const gy = groundY - Math.sin(slopeAngle) * slopeLen * frac
    const sway = Math.sin(time * 1.8 + i * 1.2) * 1.5
    ctx.strokeStyle = `rgba(92, 138, 94, ${0.5 + Math.random() * 0.3})`
    ctx.lineWidth = 1
    for (let j = 0; j < 2; j++) {
      ctx.beginPath()
      ctx.moveTo(gx + j * 3 - 1.5, gy)
      ctx.quadraticCurveTo(gx + j * 3 - 1.5 + sway, gy - 6, gx + j * 3 + sway, gy - 10)
      ctx.stroke()
    }
  }

  // Grass on top plateau
  for (let i = 0; i < 6; i++) {
    const gx = slopeEndX + 15 + i * 18
    const gy = slopeTopY
    const sway = Math.sin(time * 2.2 + i * 1.8) * 2
    ctx.strokeStyle = '#5C8A5E'
    ctx.lineWidth = 1.5
    for (let j = 0; j < 3; j++) {
      ctx.beginPath()
      ctx.moveTo(gx + j * 3 - 3, gy)
      ctx.quadraticCurveTo(gx + j * 3 - 3 + sway, gy - 7, gx + j * 3 + sway, gy - 11)
      ctx.stroke()
    }
  }

  // Rocks on slope
  const rockPositions = [0.15, 0.4, 0.65, 0.85]
  rockPositions.forEach((frac, i) => {
    const rx = slopeStartX + Math.cos(slopeAngle) * slopeLen * frac + (i % 2 ? 5 : -5)
    const ry = groundY - Math.sin(slopeAngle) * slopeLen * frac + 3
    const size = 4 + (i % 3) * 2

    // Rock body
    ctx.fillStyle = '#78716C'
    ctx.beginPath()
    ctx.arc(rx, ry, size, 0, Math.PI * 2)
    ctx.fill()

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.beginPath()
    ctx.arc(rx - 1, ry - 1, size * 0.5, 0, Math.PI * 2)
    ctx.fill()
  })

  // Isometric grid lines on flat portion
  ctx.strokeStyle = 'rgba(100, 140, 100, 0.15)'
  ctx.lineWidth = 0.5
  const gridSpacing = 25
  for (let i = 0; i < Math.floor(slopeStartX / gridSpacing); i++) {
    const gx = i * gridSpacing
    ctx.beginPath()
    ctx.moveTo(gx, groundY)
    ctx.lineTo(gx + 10, groundY + depth)
    ctx.stroke()
  }
  for (let i = 0; i < 3; i++) {
    const gy = groundY + i * (depth / 3)
    ctx.beginPath()
    ctx.moveTo(0, gy)
    ctx.lineTo(slopeStartX, gy)
    ctx.stroke()
  }

  // Angle arc and label
  ctx.strokeStyle = '#E5E7EB'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(slopeStartX, groundY, 35, -slopeAngle, 0)
  ctx.stroke()

  ctx.fillStyle = '#E5E7EB'
  ctx.font = 'bold 13px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('30\u00B0', slopeStartX + 45, groundY - 8)
}

function drawFlag25D(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, topLabel: string = 'TOP') {
  // Pole shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)'
  ctx.beginPath()
  ctx.ellipse(x + 3, y + 2, 8, 3, 0, 0, Math.PI * 2)
  ctx.fill()

  // Pole
  ctx.strokeStyle = '#9CA3AF'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x, y - 50)
  ctx.stroke()

  // Pole highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.2)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x - 1, y)
  ctx.lineTo(x - 1, y - 50)
  ctx.stroke()

  // Waving flag
  const flagW = 28
  const flagH = 18
  ctx.fillStyle = '#22C55E'
  ctx.beginPath()
  ctx.moveTo(x, y - 50)
  for (let i = 0; i <= 10; i++) {
    const fx = x + (i / 10) * flagW
    const fy = y - 50 + Math.sin(time * 4 + i * 0.6) * 3 + (i / 10) * 2
    ctx.lineTo(fx, fy)
  }
  for (let i = 10; i >= 0; i--) {
    const fx = x + (i / 10) * flagW
    const fy = y - 50 + flagH + Math.sin(time * 4 + i * 0.6) * 2 + (i / 10) * 2
    ctx.lineTo(fx, fy)
  }
  ctx.closePath()
  ctx.fill()

  // "TOP" text
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 9px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(topLabel, x + flagW / 2, y - 38)

  // Pole ball
  ctx.fillStyle = '#FCD34D'
  ctx.beginPath()
  ctx.arc(x, y - 51, 3, 0, Math.PI * 2)
  ctx.fill()
}

function drawHillIdle25D(ctx: CanvasRenderingContext2D, W: number, H: number, time: number, topLabel: string = 'TOP') {
  const groundY = H - 50
  const slopeStartX = W * 0.25
  const slopeEndX = W * 0.85
  const slopeTopY = H * 0.2

  drawSky25D(ctx, W, H, time)
  drawTerrain25D(ctx, W, H, time, slopeStartX, slopeEndX, groundY, slopeTopY)
  drawFlag25D(ctx, slopeEndX + 15, slopeTopY, time, topLabel)
}

function drawHillScene25D(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  result: ClimbResult,
  progress: number,
  gearRatio: number,
  time: number,
  particles: Particle[],
  topLabel: string = 'TOP',
  weightLabel: string = '50kg',
) {
  const groundY = H - 50
  const slopeStartX = W * 0.25
  const slopeEndX = W * 0.85
  const slopeTopY = H * 0.2

  drawSky25D(ctx, W, H, time)
  drawTerrain25D(ctx, W, H, time, slopeStartX, slopeEndX, groundY, slopeTopY)
  drawFlag25D(ctx, slopeEndX + 15, slopeTopY, time, topLabel)

  // Robot position along slope
  let robotFraction = 0
  let shake = 0
  let overheatGlow = 0

  if (result === 'success') {
    if (progress < 0.15) {
      const approachX = 30 + (progress / 0.15) * (slopeStartX - 30)
      drawRobot25DFlat(ctx, approachX, groundY, gearRatio, time, progress, weightLabel)
      drawParticles(ctx, particles)
      return
    }
    robotFraction = (progress - 0.15) / 0.85
  } else if (result === 'slides') {
    if (progress < 0.15) {
      const approachX = 30 + (progress / 0.15) * (slopeStartX - 30)
      drawRobot25DFlat(ctx, approachX, groundY, gearRatio, time, progress, weightLabel)
      drawParticles(ctx, particles)
      return
    }
    if (progress < 0.5) {
      robotFraction = ((progress - 0.15) / 0.35) * 0.3
    } else {
      const slideProgress = (progress - 0.5) / 0.5
      robotFraction = 0.3 * (1 - slideProgress)
      shake = Math.sin(slideProgress * 20) * 3
    }
  } else {
    // Overheats
    if (progress < 0.15) {
      const approachX = 30 + (progress / 0.15) * (slopeStartX - 30)
      drawRobot25DFlat(ctx, approachX, groundY, gearRatio, time, progress, weightLabel)
      drawParticles(ctx, particles)
      return
    }
    if (progress < 0.6) {
      robotFraction = ((progress - 0.15) / 0.45) * 0.4
    } else {
      robotFraction = 0.4
      const heatProgress = (progress - 0.6) / 0.4
      overheatGlow = Math.sin(heatProgress * 15) * 0.5 + 0.5
      shake = Math.sin(heatProgress * 10) * 2
    }
  }

  // Calculate position on slope
  const slopeLen = Math.sqrt(
    (slopeEndX - slopeStartX) ** 2 + (groundY - slopeTopY) ** 2,
  )
  const slopeAngle = Math.atan2(groundY - slopeTopY, slopeEndX - slopeStartX)
  const dist = robotFraction * slopeLen
  const robotX = slopeStartX + Math.cos(slopeAngle) * dist + shake
  const robotY = groundY - Math.sin(slopeAngle) * dist

  // Draw 2.5D robot on slope
  drawRobot25DSlope(ctx, robotX, robotY, slopeAngle, gearRatio, time, progress, overheatGlow, result === 'slides' && progress >= 0.5, weightLabel)

  // Warning flash for failure states
  if (result === 'slides' && progress >= 0.5) {
    const flashAlpha = Math.sin(progress * 30) * 0.1
    if (flashAlpha > 0) {
      ctx.fillStyle = `rgba(239, 68, 68, ${flashAlpha})`
      ctx.fillRect(0, 0, W, H)
    }
  }

  if (result === 'overheats' && progress >= 0.6) {
    const flashAlpha = Math.sin(progress * 20) * 0.08
    if (flashAlpha > 0) {
      ctx.fillStyle = `rgba(251, 146, 60, ${flashAlpha})`
      ctx.fillRect(0, 0, W, H)
    }
  }

  // Draw particles on top of everything
  drawParticles(ctx, particles)
}

function drawRobot25DFlat(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  _gearRatio: number,
  time: number,
  progress: number,
  weightLabel: string = '50kg',
) {
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.beginPath()
  ctx.ellipse(x + 2, groundY + 3, 28, 7, 0, 0, Math.PI * 2)
  ctx.fill()

  // Wheels with spokes
  drawWheel(ctx, x - 22, groundY, 8, time, progress > 0)
  drawWheel(ctx, x + 22, groundY, 8, time, progress > 0)

  // Tracks
  ctx.fillStyle = '#92400E'
  roundRect(ctx, x - 28, groundY - 10, 24, 8, 3)
  ctx.fill()
  roundRect(ctx, x + 4, groundY - 10, 24, 8, 3)
  ctx.fill()
  // Track highlights
  ctx.fillStyle = 'rgba(255,255,255,0.1)'
  ctx.fillRect(x - 26, groundY - 9, 20, 2)
  ctx.fillRect(x + 6, groundY - 9, 20, 2)

  // Body right face
  ctx.fillStyle = '#1E40AF'
  ctx.beginPath()
  ctx.moveTo(x + 22, groundY - 40)
  ctx.lineTo(x + 28, groundY - 44)
  ctx.lineTo(x + 28, groundY - 12)
  ctx.lineTo(x + 22, groundY - 8)
  ctx.closePath()
  ctx.fill()

  // Body top face
  ctx.fillStyle = '#93C5FD'
  ctx.beginPath()
  ctx.moveTo(x - 22, groundY - 40)
  ctx.lineTo(x - 16, groundY - 44)
  ctx.lineTo(x + 28, groundY - 44)
  ctx.lineTo(x + 22, groundY - 40)
  ctx.closePath()
  ctx.fill()

  // Body front face
  const bodyGrad = ctx.createLinearGradient(x - 22, groundY - 40, x + 22, groundY - 8)
  bodyGrad.addColorStop(0, '#60A5FA')
  bodyGrad.addColorStop(0.5, '#3B82F6')
  bodyGrad.addColorStop(1, '#2563EB')
  ctx.fillStyle = bodyGrad
  roundRect(ctx, x - 22, groundY - 40, 44, 32, 5)
  ctx.fill()

  // Neon glow border
  ctx.strokeStyle = '#0FF'
  ctx.lineWidth = 1.5
  ctx.shadowColor = '#0FF'
  ctx.shadowBlur = 6
  roundRect(ctx, x - 22, groundY - 40, 44, 32, 5)
  ctx.stroke()
  ctx.shadowBlur = 0

  // Head
  ctx.fillStyle = '#7C3AED'
  ctx.beginPath()
  ctx.arc(x, groundY - 50, 10, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.beginPath()
  ctx.arc(x - 2, groundY - 52, 4, 0, Math.PI * 2)
  ctx.fill()

  // Eyes
  ctx.fillStyle = '#0FF'
  ctx.shadowColor = '#0FF'
  ctx.shadowBlur = 8
  ctx.beginPath()
  ctx.arc(x - 4, groundY - 52, 2.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x + 4, groundY - 52, 2.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0

  // Antenna
  ctx.strokeStyle = '#A78BFA'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x, groundY - 60)
  ctx.lineTo(x, groundY - 70)
  ctx.stroke()
  const antennaGlow = Math.sin(time * 4) * 0.3 + 0.7
  ctx.fillStyle = `rgba(167, 139, 250, ${antennaGlow})`
  ctx.shadowColor = '#A78BFA'
  ctx.shadowBlur = 5
  ctx.beginPath()
  ctx.arc(x, groundY - 71, 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0

  // Cargo box
  drawCargo25D(ctx, x, groundY - 62, weightLabel)
}

function drawRobot25DSlope(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  slopeAngle: number,
  _gearRatio: number,
  time: number,
  progress: number,
  overheatGlow: number,
  isSliding: boolean,
  weightLabel: string = '50kg',
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(-slopeAngle)

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)'
  ctx.beginPath()
  ctx.ellipse(0, 6, 26, 5, 0, 0, Math.PI * 2)
  ctx.fill()

  // Overheat glow aura
  if (overheatGlow > 0) {
    const heatGrad = ctx.createRadialGradient(0, -25, 5, 0, -25, 45)
    heatGrad.addColorStop(0, `rgba(239, 68, 68, ${overheatGlow * 0.4})`)
    heatGrad.addColorStop(0.5, `rgba(251, 146, 60, ${overheatGlow * 0.2})`)
    heatGrad.addColorStop(1, 'transparent')
    ctx.fillStyle = heatGrad
    ctx.beginPath()
    ctx.arc(0, -25, 45, 0, Math.PI * 2)
    ctx.fill()

    // Heat shimmer waves
    ctx.strokeStyle = `rgba(251, 146, 60, ${overheatGlow * 0.3})`
    ctx.lineWidth = 1
    for (let i = 0; i < 3; i++) {
      const shimmerY = -50 - i * 12 - Math.sin(time * 5) * 3
      ctx.beginPath()
      for (let sx = -20; sx <= 20; sx += 2) {
        const sy = shimmerY + Math.sin(sx * 0.3 + time * 8 + i * 2) * 3
        if (sx === -20) ctx.moveTo(sx, sy)
        else ctx.lineTo(sx, sy)
      }
      ctx.stroke()
    }
  }

  // Wheels
  const spinning = progress > 0.15 && !isSliding
  drawWheel(ctx, -22, 0, 8, time, spinning)
  drawWheel(ctx, 22, 0, 8, time, spinning)

  // Tracks
  const trackColor = overheatGlow > 0
    ? `rgb(${146 + overheatGlow * 80}, ${64 - overheatGlow * 30}, ${15})`
    : '#92400E'
  ctx.fillStyle = trackColor
  roundRect(ctx, -28, -10, 24, 8, 3)
  ctx.fill()
  roundRect(ctx, 4, -10, 24, 8, 3)
  ctx.fill()

  // Body right face
  const bodyDark = overheatGlow > 0
    ? `rgb(${30 + overheatGlow * 80}, ${64 - overheatGlow * 40}, ${175 - overheatGlow * 100})`
    : '#1E40AF'
  ctx.fillStyle = bodyDark
  ctx.beginPath()
  ctx.moveTo(22, -40)
  ctx.lineTo(28, -44)
  ctx.lineTo(28, -12)
  ctx.lineTo(22, -8)
  ctx.closePath()
  ctx.fill()

  // Body top face
  ctx.fillStyle = overheatGlow > 0 ? `rgb(${147 + overheatGlow * 60}, ${197 - overheatGlow * 80}, ${253 - overheatGlow * 120})` : '#93C5FD'
  ctx.beginPath()
  ctx.moveTo(-22, -40)
  ctx.lineTo(-16, -44)
  ctx.lineTo(28, -44)
  ctx.lineTo(22, -40)
  ctx.closePath()
  ctx.fill()

  // Body
  const bodyColor = overheatGlow > 0
    ? `rgb(${59 + overheatGlow * 120}, ${130 - overheatGlow * 60}, ${246 - overheatGlow * 150})`
    : '#3B82F6'
  ctx.fillStyle = bodyColor
  ctx.strokeStyle = overheatGlow > 0 ? `rgb(${255}, ${100 - overheatGlow * 50}, ${50})` : '#0FF'
  ctx.lineWidth = 1.5
  ctx.shadowColor = overheatGlow > 0 ? '#EF4444' : '#0FF'
  ctx.shadowBlur = overheatGlow > 0 ? 10 + overheatGlow * 8 : 6
  roundRect(ctx, -22, -40, 44, 32, 5)
  ctx.fill()
  ctx.stroke()
  ctx.shadowBlur = 0

  // Head
  ctx.fillStyle = '#7C3AED'
  ctx.beginPath()
  ctx.arc(0, -50, 10, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.beginPath()
  ctx.arc(-2, -52, 4, 0, Math.PI * 2)
  ctx.fill()

  // Eyes - change color based on state
  const eyeColor = overheatGlow > 0 ? '#EF4444' : isSliding ? '#F59E0B' : '#0FF'
  ctx.fillStyle = eyeColor
  ctx.shadowColor = eyeColor
  ctx.shadowBlur = 8
  ctx.beginPath()
  ctx.arc(-4, -52, 2.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(4, -52, 2.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0

  // Antenna
  ctx.strokeStyle = '#A78BFA'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(0, -60)
  ctx.lineTo(0, -70)
  ctx.stroke()
  const antennaGlow = overheatGlow > 0
    ? Math.sin(time * 8) * 0.5 + 0.5
    : Math.sin(time * 4) * 0.3 + 0.7
  const antennaColor = overheatGlow > 0 ? `rgba(239, 68, 68, ${antennaGlow})` : `rgba(167, 139, 250, ${antennaGlow})`
  ctx.fillStyle = antennaColor
  ctx.shadowColor = overheatGlow > 0 ? '#EF4444' : '#A78BFA'
  ctx.shadowBlur = 5
  ctx.beginPath()
  ctx.arc(0, -71, 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0

  // Cargo box
  drawCargo25D(ctx, 0, -62, weightLabel)

  // Sliding warning indicator
  if (isSliding) {
    ctx.fillStyle = '#EF4444'
    ctx.font = 'bold 10px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('!', 0, -80)
  }

  ctx.restore()
}

function drawWheel(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, time: number, spinning: boolean) {
  // Wheel shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)'
  ctx.beginPath()
  ctx.ellipse(x, y + 2, r + 1, 3, 0, 0, Math.PI * 2)
  ctx.fill()

  // Wheel body
  const wheelGrad = ctx.createRadialGradient(x, y, 0, x, y, r)
  wheelGrad.addColorStop(0, '#78350F')
  wheelGrad.addColorStop(0.5, '#D97706')
  wheelGrad.addColorStop(1, '#92400E')
  ctx.fillStyle = wheelGrad
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()

  // Rim
  ctx.strokeStyle = '#FCD34D'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Spokes
  const spokeAngle = spinning ? time * 12 : 0
  ctx.strokeStyle = '#78350F'
  ctx.lineWidth = 1.5
  for (let s = 0; s < 4; s++) {
    const a = spokeAngle + (s * Math.PI) / 2
    ctx.beginPath()
    ctx.moveTo(x + Math.cos(a) * 2, y + Math.sin(a) * 2)
    ctx.lineTo(x + Math.cos(a) * (r - 1), y + Math.sin(a) * (r - 1))
    ctx.stroke()
  }

  // Hub
  ctx.fillStyle = '#451A03'
  ctx.beginPath()
  ctx.arc(x, y, 2.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#FCD34D'
  ctx.beginPath()
  ctx.arc(x, y, 1, 0, Math.PI * 2)
  ctx.fill()
}

function drawCargo25D(ctx: CanvasRenderingContext2D, x: number, y: number, weightLabel: string = '50kg') {
  const w = 30
  const h = 12
  const d = 5

  // Right face
  ctx.fillStyle = '#5C3310'
  ctx.beginPath()
  ctx.moveTo(x + w / 2, y - h / 2)
  ctx.lineTo(x + w / 2 + d, y - h / 2 - d / 2)
  ctx.lineTo(x + w / 2 + d, y + h / 2 - d / 2)
  ctx.lineTo(x + w / 2, y + h / 2)
  ctx.closePath()
  ctx.fill()

  // Top face
  ctx.fillStyle = '#B45309'
  ctx.beginPath()
  ctx.moveTo(x - w / 2, y - h / 2)
  ctx.lineTo(x - w / 2 + d, y - h / 2 - d / 2)
  ctx.lineTo(x + w / 2 + d, y - h / 2 - d / 2)
  ctx.lineTo(x + w / 2, y - h / 2)
  ctx.closePath()
  ctx.fill()

  // Front face
  const crateGrad = ctx.createLinearGradient(x - w / 2, y - h / 2, x + w / 2, y + h / 2)
  crateGrad.addColorStop(0, '#D97706')
  crateGrad.addColorStop(0.5, '#92400E')
  crateGrad.addColorStop(1, '#78350F')
  ctx.fillStyle = crateGrad
  ctx.fillRect(x - w / 2, y - h / 2, w, h)

  // Crate straps
  ctx.strokeStyle = '#451A03'
  ctx.lineWidth = 1
  ctx.strokeRect(x - w / 2 + 2, y - h / 2 + 1, w - 4, h - 2)

  // Label
  ctx.fillStyle = '#FEF3C7'
  ctx.font = 'bold 7px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(weightLabel, x, y)
  ctx.textBaseline = 'alphabetic'
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function RobotMission4({ onComplete }: RobotMission4Props) {
  const t = useTranslations('missions.robot.m4')

  const [gearRatio, setGearRatio] = useState(1)
  const [selectedMotor, setSelectedMotor] = useState<MotorSize>('medium')
  const [isAnimating, setIsAnimating] = useState(false)
  const [phase, setPhase] = useState<'configuring' | 'done'>('configuring')
  const [lastResult, setLastResult] = useState<ClimbResult | null>(null)

  const motor = MOTOR_OPTIONS.find(m => m.size === selectedMotor)!
  const force = calculateForce(motor.torque, gearRatio)
  const speed = calculateSpeed(gearRatio)
  const forceOk = force >= REQUIRED_FORCE
  const speedOk = speed >= OVERHEAT_SPEED_THRESHOLD

  const handleTest = useCallback(() => {
    setIsAnimating(true)
  }, [])

  const handleAnimationEnd = useCallback((result: ClimbResult) => {
    setIsAnimating(false)
    setLastResult(result)

    if (result === 'success') {
      setPhase('done')

      let gearScore: number
      if (gearRatio >= 4 && gearRatio <= 6) {
        gearScore = 500
      } else if (gearRatio === 3 || gearRatio === 7) {
        gearScore = 350
      } else {
        gearScore = 200
      }

      let motorScore: number
      if (selectedMotor === 'medium') {
        motorScore = 350
      } else if (selectedMotor === 'small') {
        motorScore = 250
      } else {
        motorScore = 200
      }

      const budgetScore = selectedMotor === 'small' ? 150
        : selectedMotor === 'medium' ? 120
        : 80

      const total = gearScore + motorScore + budgetScore

      const breakdownItems: ScoreBreakdownItem[] = [
        { label: t('scoreGear'), value: gearScore, max: 500 },
        { label: t('scoreMotor'), value: motorScore, max: 350 },
        { label: t('scoreBudget'), value: budgetScore, max: 150 },
      ]

      onComplete?.(total, breakdownItems)
    }
  }, [gearRatio, selectedMotor, onComplete, t])

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Story */}
      <div className="bg-gray-950 rounded-xl p-4 border border-gray-800">
        <p className="text-gray-300 text-sm">{t('story')}</p>
        <p className="text-yellow-400 text-sm font-bold mt-2">{t('requirement')}</p>
      </div>

      {/* Motor selection */}
      <div>
        <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">{t('chooseMotor')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {MOTOR_OPTIONS.map(opt => (
            <button
              key={opt.size}
              onClick={() => { if (!isAnimating) setSelectedMotor(opt.size) }}
              disabled={isAnimating}
              className={clsx(
                'p-4 rounded-xl border-2 text-left transition-all',
                selectedMotor === opt.size
                  ? 'border-blue-500 bg-blue-900/20 scale-[1.02]'
                  : 'border-gray-700 bg-gray-900 hover:border-gray-500',
                isAnimating && 'opacity-50 cursor-not-allowed',
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-black text-white">{t(`motors.${opt.size}`)}</span>
                <span className="text-yellow-400 font-bold">${opt.cost}</span>
              </div>
              <p className="text-sm text-gray-400">
                {t('torqueLabel')}: <span className="text-blue-300">{opt.torque}Nm</span>
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Gear ratio slider */}
      <div>
        <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">{t('gearRatioLabel')}</h3>
        <div className="bg-gray-950 rounded-xl p-4 border border-gray-800 space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm w-10">1:1</span>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={gearRatio}
              onChange={e => setGearRatio(Number(e.target.value))}
              disabled={isAnimating}
              className="flex-1 accent-blue-500"
            />
            <span className="text-gray-400 text-sm w-12">1:10</span>
          </div>
          <div className="text-center">
            <span className="text-3xl font-black text-white">1:{gearRatio}</span>
          </div>

          {/* Real-time calculator */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className={clsx(
              'p-3 rounded-lg border',
              forceOk ? 'border-green-600/50 bg-green-900/10' : 'border-red-600/50 bg-red-900/10',
            )}>
              <div className="text-gray-400 text-xs mb-1">{t('forceOutput')}</div>
              <div className={clsx('text-xl font-black', forceOk ? 'text-green-400' : 'text-red-400')}>
                {force}N
              </div>
              <div className="text-gray-500 text-xs mt-1">
                {t('forceNeeded')}: {REQUIRED_FORCE}N {forceOk ? '\u2713' : '\u2717'}
              </div>
            </div>
            <div className={clsx(
              'p-3 rounded-lg border',
              speedOk ? 'border-green-600/50 bg-green-900/10' : 'border-orange-600/50 bg-orange-900/10',
            )}>
              <div className="text-gray-400 text-xs mb-1">{t('speedOutput')}</div>
              <div className={clsx('text-xl font-black', speedOk ? 'text-green-400' : 'text-orange-400')}>
                {speed.toFixed(1)} m/s
              </div>
              <div className="text-gray-500 text-xs mt-1">
                {t('speedMin')}: {OVERHEAT_SPEED_THRESHOLD} m/s {speedOk ? '\u2713' : '\u2717'}
              </div>
            </div>
          </div>

          {/* Formula display */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>{t('formulaForce')}: {motor.torque}Nm x {gearRatio} = {force}N</p>
            <p>{t('formulaSpeed')}: {BASE_SPEED} m/s / {gearRatio} = {speed.toFixed(1)} m/s</p>
          </div>
        </div>
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
          {t('testClimb')}
        </button>
      )}

      {/* Last result hint */}
      {lastResult && phase === 'configuring' && (
        <div className={clsx(
          'text-sm font-bold text-center p-2 rounded-lg',
          lastResult === 'slides' ? 'text-red-400 bg-red-900/20' :
          lastResult === 'overheats' ? 'text-orange-400 bg-orange-900/20' :
          'text-green-400 bg-green-900/20',
        )}>
          {lastResult === 'slides' && t('resultSlides')}
          {lastResult === 'overheats' && t('resultOverheats')}
        </div>
      )}

      {/* Animation canvas */}
      <ClimbAnimationCanvas
        motorTorque={motor.torque}
        gearRatio={gearRatio}
        isRunning={isAnimating}
        onAnimationEnd={handleAnimationEnd}
        t={t}
      />
    </div>
  )
}
