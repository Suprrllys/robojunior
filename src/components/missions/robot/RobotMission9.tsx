'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import clsx from 'clsx'
import { useTranslations } from 'next-intl'
import type { ScoreBreakdownItem } from '@/components/missions/common/MissionShell'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type HeatsinkSize = 'none' | 'small' | 'medium' | 'large'
type IPRating = 'ip44' | 'ip65' | 'ip67'
type DamperType = 'none' | 'rubber' | 'hydraulic'
type TestChamber = 'heat' | 'dust' | 'vibration'

export interface RobotMission9Props {
  onComplete?: (score: number, breakdown: ScoreBreakdownItem[]) => void
}

// ---------------------------------------------------------------------------
// Data — engineering constants
// ---------------------------------------------------------------------------

const AMBIENT_TEMP = 55 // degrees C
const MOTOR_HEAT = 30 // watts
const ELECTRONICS_MAX_TEMP = 70 // degrees C
const BUDGET = 80

const HEATSINK_OPTIONS: Record<HeatsinkSize, { dissipation: number; cost: number }> = {
  none:   { dissipation: 5,  cost: 0 },
  small:  { dissipation: 15, cost: 10 },
  medium: { dissipation: 25, cost: 20 },
  large:  { dissipation: 35, cost: 35 },
}

const IP_OPTIONS: Record<IPRating, { dustProtection: number; cost: number; label: string }> = {
  ip44: { dustProtection: 0.3, cost: 5,  label: 'IP44' },
  ip65: { dustProtection: 0.8, cost: 15, label: 'IP65' },
  ip67: { dustProtection: 1.0, cost: 30, label: 'IP67' },
}

const DAMPER_OPTIONS: Record<DamperType, { vibrationReduction: number; cost: number }> = {
  none:      { vibrationReduction: 0.1, cost: 0 },
  rubber:    { vibrationReduction: 0.6, cost: 10 },
  hydraulic: { vibrationReduction: 0.95, cost: 25 },
}

// Heat test: steady-state temp = ambient + (motor_heat - dissipation) * thermal_resistance
// Simplified: temp = ambient + max(0, motor_heat - dissipation) * 1.0
function calculateSteadyTemp(heatsink: HeatsinkSize): number {
  const netHeat = Math.max(0, MOTOR_HEAT - HEATSINK_OPTIONS[heatsink].dissipation)
  return AMBIENT_TEMP + netHeat
}

// Dust test: pass if dustProtection >= 0.7
function dustTestPasses(ipRating: IPRating): boolean {
  return IP_OPTIONS[ipRating].dustProtection >= 0.7
}

// Vibration test: pass if vibrationReduction >= 0.5
function vibrationTestPasses(damper: DamperType): boolean {
  return DAMPER_OPTIONS[damper].vibrationReduction >= 0.5
}

// ---------------------------------------------------------------------------
// Particle types
// ---------------------------------------------------------------------------

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  alpha: number
}

function createParticles(cx: number, cy: number, count: number, color: string, spread: number, speed: number): Particle[] {
  const particles: Particle[] = []
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const s = Math.random() * speed
    particles.push({
      x: cx + (Math.random() - 0.5) * spread,
      y: cy + (Math.random() - 0.5) * spread,
      vx: Math.cos(angle) * s,
      vy: Math.sin(angle) * s,
      life: 1,
      maxLife: 0.5 + Math.random() * 0.5,
      size: 1 + Math.random() * 3,
      color,
      alpha: 0.6 + Math.random() * 0.4,
    })
  }
  return particles
}

// ---------------------------------------------------------------------------
// 2.5D Drawing helpers
// ---------------------------------------------------------------------------

const CW = 600
const CH = 300

// Isometric chamber floor
function drawIsoChamberFloor(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, color: string, sideColor: string) {
  const hw = w / 2
  const hh = h / 2
  const depth = 12

  // Top face (diamond)
  ctx.beginPath()
  ctx.moveTo(cx, cy - hh)
  ctx.lineTo(cx + hw, cy)
  ctx.lineTo(cx, cy + hh)
  ctx.lineTo(cx - hw, cy)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth = 1
  ctx.stroke()

  // Right side face
  ctx.beginPath()
  ctx.moveTo(cx + hw, cy)
  ctx.lineTo(cx, cy + hh)
  ctx.lineTo(cx, cy + hh + depth)
  ctx.lineTo(cx + hw, cy + depth)
  ctx.closePath()
  ctx.fillStyle = sideColor
  ctx.fill()

  // Left side face
  ctx.beginPath()
  ctx.moveTo(cx - hw, cy)
  ctx.lineTo(cx, cy + hh)
  ctx.lineTo(cx, cy + hh + depth)
  ctx.lineTo(cx - hw, cy + depth)
  ctx.closePath()
  const darkerSide = sideColor.replace('0.', '0.') // slightly darker
  ctx.fillStyle = darkerSide
  ctx.fill()
}

// Isometric walls
function drawIsoWalls(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, wallH: number, wallColor: string, wallSideColor: string) {
  const hw = w / 2
  const hh = h / 2

  // Back-left wall
  ctx.beginPath()
  ctx.moveTo(cx - hw, cy)
  ctx.lineTo(cx, cy - hh)
  ctx.lineTo(cx, cy - hh - wallH)
  ctx.lineTo(cx - hw, cy - wallH)
  ctx.closePath()
  ctx.fillStyle = wallColor
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'
  ctx.lineWidth = 0.5
  ctx.stroke()

  // Back-right wall
  ctx.beginPath()
  ctx.moveTo(cx + hw, cy)
  ctx.lineTo(cx, cy - hh)
  ctx.lineTo(cx, cy - hh - wallH)
  ctx.lineTo(cx + hw, cy - wallH)
  ctx.closePath()
  ctx.fillStyle = wallSideColor
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'
  ctx.lineWidth = 0.5
  ctx.stroke()
}

// 2.5D Robot drawing
function draw25DRobot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  heatsink: HeatsinkSize,
  ipRating: IPRating,
  damper: DamperType,
  shake: number,
  glowColor: string | null,
  time: number,
) {
  const rx = x + shake
  const ry = y

  // Glow effect
  if (glowColor) {
    const gradient = ctx.createRadialGradient(rx, ry, 5, rx, ry, 40)
    gradient.addColorStop(0, glowColor)
    gradient.addColorStop(1, 'transparent')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(rx, ry, 40, 0, Math.PI * 2)
    ctx.fill()
  }

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.beginPath()
  ctx.ellipse(rx, ry + 22, 22, 7, 0, 0, Math.PI * 2)
  ctx.fill()

  // Damper springs (under body)
  if (damper !== 'none') {
    const springColor = damper === 'hydraulic' ? '#F59E0B' : '#9CA3AF'
    const springPositions = [-14, 14]
    for (const sx of springPositions) {
      ctx.strokeStyle = springColor
      ctx.lineWidth = 2
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const sy = ry + 14 + i * 2
        const offset = (i % 2 === 0 ? -3 : 3)
        ctx.lineTo(rx + sx + offset, sy)
      }
      ctx.stroke()
    }
  }

  // Body - main block (top face)
  const bw = 40
  const bh = 24
  const bd = 16 // depth

  // Top face
  ctx.beginPath()
  ctx.moveTo(rx, ry - bh / 2)
  ctx.lineTo(rx + bw / 2, ry - bh / 2 + bd / 4)
  ctx.lineTo(rx, ry - bh / 2 + bd / 2)
  ctx.lineTo(rx - bw / 2, ry - bh / 2 + bd / 4)
  ctx.closePath()
  ctx.fillStyle = '#3B82F6'
  ctx.fill()

  // Front-right face
  ctx.beginPath()
  ctx.moveTo(rx + bw / 2, ry - bh / 2 + bd / 4)
  ctx.lineTo(rx, ry - bh / 2 + bd / 2)
  ctx.lineTo(rx, ry + bh / 2)
  ctx.lineTo(rx + bw / 2, ry + bh / 2 - bd / 4)
  ctx.closePath()
  ctx.fillStyle = '#2563EB'
  ctx.fill()

  // Front-left face
  ctx.beginPath()
  ctx.moveTo(rx - bw / 2, ry - bh / 2 + bd / 4)
  ctx.lineTo(rx, ry - bh / 2 + bd / 2)
  ctx.lineTo(rx, ry + bh / 2)
  ctx.lineTo(rx - bw / 2, ry + bh / 2 - bd / 4)
  ctx.closePath()
  ctx.fillStyle = '#1D4ED8'
  ctx.fill()

  // Head / sensor dome (top)
  ctx.beginPath()
  ctx.moveTo(rx, ry - bh / 2 - 10)
  ctx.lineTo(rx + 10, ry - bh / 2)
  ctx.lineTo(rx, ry - bh / 2 + 4)
  ctx.lineTo(rx - 10, ry - bh / 2)
  ctx.closePath()
  ctx.fillStyle = '#1E40AF'
  ctx.fill()

  // Eyes / sensors
  ctx.fillStyle = '#60A5FA'
  ctx.beginPath()
  ctx.arc(rx - 4, ry - bh / 2, 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(rx + 4, ry - bh / 2, 2, 0, Math.PI * 2)
  ctx.fill()

  // Blinking sensor light
  const blink = Math.sin(time * 5) > 0.5
  if (blink) {
    ctx.fillStyle = '#22C55E'
    ctx.beginPath()
    ctx.arc(rx, ry - bh / 2 - 6, 1.5, 0, Math.PI * 2)
    ctx.fill()
  }

  // Heatsink fins on top
  if (heatsink !== 'none') {
    const finCount = heatsink === 'small' ? 3 : heatsink === 'medium' ? 5 : 8
    ctx.fillStyle = '#9CA3AF'
    for (let i = 0; i < finCount; i++) {
      const fx = rx - 12 + (i * 24 / finCount)
      ctx.fillRect(fx, ry - bh / 2 - 14, 1.5, 5)
    }
    // Heatsink base plate
    ctx.fillStyle = '#6B7280'
    ctx.fillRect(rx - 14, ry - bh / 2 - 10, 28, 2)
  }

  // IP seal indicator (ring around body)
  if (ipRating !== 'ip44') {
    ctx.strokeStyle = ipRating === 'ip67' ? '#22C55E' : '#F59E0B'
    ctx.lineWidth = 1.5
    ctx.setLineDash([3, 2])
    ctx.beginPath()
    ctx.ellipse(rx, ry, bw / 2 + 3, bh / 2 + 2, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
  }

  // Wheels / treads at bottom
  ctx.fillStyle = '#374151'
  ctx.fillRect(rx - bw / 2 - 2, ry + bh / 2 - 6, 8, 10)
  ctx.fillRect(rx + bw / 2 - 6, ry + bh / 2 - 6, 8, 10)
}

// 3D thermometer
function drawThermometer(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, temp: number, maxTemp: number, time: number) {
  const fillRatio = Math.min(1, temp / (maxTemp + 20))

  // Outer glass tube
  ctx.fillStyle = 'rgba(255,255,255,0.1)'
  ctx.beginPath()
  ctx.roundRect(x - 6, y, 12, h, 6)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(x - 6, y, 12, h, 6)
  ctx.stroke()

  // Mercury
  const mercuryH = fillRatio * (h - 16)
  const gradient = ctx.createLinearGradient(x, y + h - mercuryH - 8, x, y + h - 8)
  gradient.addColorStop(0, '#EF4444')
  gradient.addColorStop(1, '#DC2626')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.roundRect(x - 4, y + h - mercuryH - 8, 8, mercuryH, 3)
  ctx.fill()

  // Bulb at bottom
  ctx.beginPath()
  ctx.arc(x, y + h - 2, 8, 0, Math.PI * 2)
  ctx.fillStyle = fillRatio > 0.8 ? '#DC2626' : '#EF4444'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'
  ctx.stroke()

  // Glow if hot
  if (fillRatio > 0.7) {
    const glow = ctx.createRadialGradient(x, y + h - 2, 2, x, y + h - 2, 15 + Math.sin(time * 4) * 3)
    glow.addColorStop(0, 'rgba(239, 68, 68, 0.4)')
    glow.addColorStop(1, 'transparent')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(x, y + h - 2, 15, 0, Math.PI * 2)
    ctx.fill()
  }

  // Temperature label
  ctx.fillStyle = '#FBBF24'
  ctx.font = 'bold 11px monospace'
  ctx.textAlign = 'center'
  ctx.fillText(`${temp.toFixed(0)}\u00B0`, x, y - 6)

  // Threshold marker
  const thresholdY = y + h - 8 - (maxTemp / (maxTemp + 20)) * (h - 16)
  ctx.strokeStyle = '#22C55E'
  ctx.lineWidth = 1
  ctx.setLineDash([2, 2])
  ctx.beginPath()
  ctx.moveTo(x + 8, thresholdY)
  ctx.lineTo(x + 18, thresholdY)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = '#22C55E'
  ctx.font = '8px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(`${maxTemp}\u00B0`, x + 20, thresholdY + 3)
}

// Vibration meter / gauge
function drawGauge(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, value: number, label: string, color: string, time: number) {
  // Gauge background arc
  ctx.beginPath()
  ctx.arc(x, y, radius, Math.PI, 0)
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth = 6
  ctx.stroke()

  // Value arc
  const angle = Math.PI + value * Math.PI
  ctx.beginPath()
  ctx.arc(x, y, radius, Math.PI, angle)
  ctx.strokeStyle = color
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  ctx.stroke()
  ctx.lineCap = 'butt'

  // Needle
  const needleAngle = Math.PI + value * Math.PI
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + Math.cos(needleAngle) * (radius - 4), y + Math.sin(needleAngle) * (radius - 4))
  ctx.stroke()

  // Center dot
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(x, y, 3, 0, Math.PI * 2)
  ctx.fill()

  // Label
  ctx.fillStyle = color
  ctx.font = 'bold 9px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(label, x, y + radius + 12)
}

// ---------------------------------------------------------------------------
// Test Chamber Canvas
// ---------------------------------------------------------------------------

function TestChamberCanvas({
  chamber,
  testResult,
  isRunning,
  onTestEnd,
  heatsink,
  ipRating,
  damper,
  t,
}: {
  chamber: TestChamber
  testResult: boolean
  isRunning: boolean
  onTestEnd: () => void
  heatsink: HeatsinkSize
  ipRating: IPRating
  damper: DamperType
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
      // Draw idle state with continuous animation
      let idleFrame = 0
      const idleTime = { current: 0 }
      function drawIdle() {
        if (!ctx) return
        idleTime.current += 0.016
        ctx.clearRect(0, 0, W, H)
        drawChamberScene(ctx, W, H, chamber, 0, true, heatsink, ipRating, damper, idleTime.current, [], t)
        idleFrame = requestAnimationFrame(drawIdle)
      }
      idleFrame = requestAnimationFrame(drawIdle)
      return () => cancelAnimationFrame(idleFrame)
    }

    const DURATION = 3500
    startTimeRef.current = performance.now()
    let statusShown = false

    function animate(now: number) {
      if (!ctx || !canvas) return
      const elapsed = now - startTimeRef.current
      const progress = Math.min(elapsed / DURATION, 1)
      const time = elapsed / 1000

      // Update particles
      particlesRef.current = particlesRef.current
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.02,
          life: p.life - (0.016 / p.maxLife),
          alpha: Math.max(0, p.alpha - 0.005),
        }))
        .filter(p => p.life > 0 && p.alpha > 0)

      // Add chamber-specific particles during test
      if (chamber === 'heat' && progress > 0.2) {
        // Rising heat particles
        for (let i = 0; i < 2; i++) {
          particlesRef.current.push({
            x: W / 2 + (Math.random() - 0.5) * 80,
            y: H - 40,
            vx: (Math.random() - 0.5) * 0.5,
            vy: -1 - Math.random() * 2,
            life: 1,
            maxLife: 2,
            size: 2 + Math.random() * 3,
            color: Math.random() > 0.5 ? '#EF4444' : '#F97316',
            alpha: 0.3 + Math.random() * 0.3,
          })
        }
      }

      if (chamber === 'dust' && progress > 0.1) {
        // Dust cloud particles
        for (let i = 0; i < 3; i++) {
          const layer = Math.floor(Math.random() * 3) // 3 layers
          particlesRef.current.push({
            x: 50 + Math.random() * 60,
            y: 60 + Math.random() * (H - 100),
            vx: 1.5 + Math.random() * 2 + layer * 0.5,
            vy: (Math.random() - 0.5) * 0.8,
            life: 1,
            maxLife: 1.5 + layer * 0.3,
            size: 2 + Math.random() * 4 + layer * 2,
            color: layer === 0 ? '#D9B378' : layer === 1 ? '#C4A265' : '#B8945A',
            alpha: 0.15 + layer * 0.1 + Math.random() * 0.15,
          })
        }
      }

      if (chamber === 'vibration' && progress > 0.15) {
        // Spark/stress particles
        if (Math.random() > 0.7) {
          particlesRef.current.push({
            x: W / 2 + (Math.random() - 0.5) * 60,
            y: H / 2 + 20 + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 3,
            vy: -1 - Math.random() * 2,
            life: 1,
            maxLife: 0.5,
            size: 1 + Math.random() * 2,
            color: '#A78BFA',
            alpha: 0.5 + Math.random() * 0.5,
          })
        }
      }

      // Success sparkles
      if (testResult && progress > 0.8) {
        if (Math.random() > 0.6) {
          const angle = Math.random() * Math.PI * 2
          particlesRef.current.push({
            x: W / 2 + Math.cos(angle) * 30,
            y: H / 2 + Math.sin(angle) * 20,
            vx: Math.cos(angle) * 1.5,
            vy: Math.sin(angle) * 1.5 - 1,
            life: 1,
            maxLife: 0.8,
            size: 1.5 + Math.random() * 2,
            color: Math.random() > 0.5 ? '#22C55E' : '#4ADE80',
            alpha: 0.8,
          })
        }
      }

      // Failure effects
      if (!testResult && progress > 0.6) {
        if (chamber === 'heat' && Math.random() > 0.5) {
          // Smoke
          particlesRef.current.push({
            x: W / 2 + (Math.random() - 0.5) * 30,
            y: H / 2 - 20,
            vx: (Math.random() - 0.5) * 0.8,
            vy: -0.8 - Math.random(),
            life: 1,
            maxLife: 1.5,
            size: 4 + Math.random() * 6,
            color: '#6B7280',
            alpha: 0.3 + Math.random() * 0.2,
          })
        }
        if (chamber === 'vibration' && Math.random() > 0.7) {
          // Parts shaking loose
          particlesRef.current.push({
            x: W / 2 + (Math.random() - 0.5) * 40,
            y: H / 2 + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 4,
            vy: -2 - Math.random() * 2,
            life: 1,
            maxLife: 1,
            size: 2 + Math.random() * 3,
            color: '#9CA3AF',
            alpha: 0.8,
          })
        }
      }

      ctx.clearRect(0, 0, W, H)
      drawChamberScene(ctx, W, H, chamber, progress, false, heatsink, ipRating, damper, time, particlesRef.current, t, testResult)

      // Show status near end
      if (progress >= 0.85 && !statusShown) {
        statusShown = true
        if (testResult) {
          setStatusText(t('testPass'))
          setStatusColor('bg-green-600/90')
        } else {
          setStatusText(t('testFail'))
          setStatusColor('bg-red-600/90')
        }
      }

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        onTestEnd()
      }
    }

    animRef.current = requestAnimationFrame(animate)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, chamber, testResult])

  return (
    <div className="relative w-full rounded-xl border border-gray-800 overflow-hidden bg-gray-950">
      <canvas
        ref={canvasRef}
        width={600}
        height={300}
        className="w-full"
        style={{ minHeight: 200 }}
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
// Main scene renderer
// ---------------------------------------------------------------------------

function drawChamberScene(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  chamber: TestChamber,
  progress: number,
  isIdle: boolean,
  heatsink: HeatsinkSize,
  ipRating: IPRating,
  damper: DamperType,
  time: number,
  particles: Particle[],
  t: (k: string) => string,
  testResult?: boolean,
) {
  // Background gradient based on chamber type
  if (chamber === 'heat') {
    const gradient = ctx.createLinearGradient(0, 0, 0, H)
    const intensity = isIdle ? 0.1 : progress
    gradient.addColorStop(0, `rgba(${Math.round(30 + intensity * 120)}, ${Math.round(10 + intensity * 20)}, ${Math.round(20 - intensity * 15)}, 1)`)
    gradient.addColorStop(1, `rgba(${Math.round(15 + intensity * 80)}, ${Math.round(8)}, ${Math.round(10)}, 1)`)
    ctx.fillStyle = gradient
  } else if (chamber === 'dust') {
    const gradient = ctx.createLinearGradient(0, 0, 0, H)
    const intensity = isIdle ? 0.05 : progress
    gradient.addColorStop(0, `rgba(${Math.round(30 + intensity * 50)}, ${Math.round(25 + intensity * 35)}, ${Math.round(15 + intensity * 20)}, 1)`)
    gradient.addColorStop(1, `rgba(${Math.round(20 + intensity * 30)}, ${Math.round(18 + intensity * 20)}, ${Math.round(12 + intensity * 10)}, 1)`)
    ctx.fillStyle = gradient
  } else {
    ctx.fillStyle = '#0F172A'
  }
  ctx.fillRect(0, 0, W, H)

  // Draw isometric chamber room
  const chamberCX = W / 2
  const chamberCY = H / 2 + 15
  const chamberW = 360
  const chamberH = 180

  // Walls
  const wallColor = chamber === 'heat' ? 'rgba(120, 40, 30, 0.6)' :
                    chamber === 'dust' ? 'rgba(100, 80, 50, 0.5)' :
                    'rgba(60, 40, 100, 0.5)'
  const wallSideColor = chamber === 'heat' ? 'rgba(100, 30, 20, 0.6)' :
                         chamber === 'dust' ? 'rgba(80, 60, 40, 0.5)' :
                         'rgba(50, 30, 80, 0.5)'
  drawIsoWalls(ctx, chamberCX, chamberCY, chamberW, chamberH, 80, wallColor, wallSideColor)

  // Floor
  const floorColor = chamber === 'heat' ? 'rgba(50, 20, 15, 0.8)' :
                     chamber === 'dust' ? 'rgba(60, 50, 35, 0.7)' :
                     'rgba(25, 20, 50, 0.8)'
  const floorSide = chamber === 'heat' ? 'rgba(40, 15, 10, 0.8)' :
                    chamber === 'dust' ? 'rgba(50, 40, 25, 0.7)' :
                    'rgba(20, 15, 40, 0.8)'

  // Vibration: shake floor tiles
  if (chamber === 'vibration' && !isIdle) {
    const tiles = 6
    const tileW = chamberW / tiles
    const tileH = chamberH / tiles
    for (let tx = 0; tx < tiles; tx++) {
      for (let ty = 0; ty < tiles; ty++) {
        const shakeOffset = Math.sin(time * 20 + tx * 2 + ty * 3) * progress * 2
        const tileCX = chamberCX + (tx - tiles / 2 + 0.5) * (tileW / 2) - (ty - tiles / 2 + 0.5) * (tileW / 2)
        const tileCY = chamberCY + (tx - tiles / 2 + 0.5) * (tileH / 4) + (ty - tiles / 2 + 0.5) * (tileH / 4)

        ctx.beginPath()
        ctx.moveTo(tileCX, tileCY - tileH / 4 + shakeOffset)
        ctx.lineTo(tileCX + tileW / 4, tileCY + shakeOffset)
        ctx.lineTo(tileCX, tileCY + tileH / 4 + shakeOffset)
        ctx.lineTo(tileCX - tileW / 4, tileCY + shakeOffset)
        ctx.closePath()

        const bright = (tx + ty) % 2 === 0 ? 0.7 : 0.9
        ctx.fillStyle = `rgba(40, 30, 80, ${bright})`
        ctx.fill()
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.2)'
        ctx.lineWidth = 0.5
        ctx.stroke()
      }
    }
  } else {
    drawIsoChamberFloor(ctx, chamberCX, chamberCY, chamberW, chamberH, floorColor, floorSide)
  }

  // Chamber-specific elements
  if (chamber === 'heat') {
    // Heat waves rising
    if (!isIdle) {
      const waveCount = 6
      for (let i = 0; i < waveCount; i++) {
        const baseX = chamberCX - 100 + i * 40
        const waveAlpha = 0.1 + progress * 0.3
        ctx.strokeStyle = `rgba(239, 68, 68, ${waveAlpha})`
        ctx.lineWidth = 1.5
        ctx.beginPath()
        for (let yOff = 0; yOff < 60; yOff += 2) {
          const wy = chamberCY + 50 - yOff - progress * 30
          const wx = baseX + Math.sin((yOff + time * 100) * 0.08) * 8
          if (yOff === 0) ctx.moveTo(wx, wy)
          else ctx.lineTo(wx, wy)
        }
        ctx.stroke()
      }
    }

    // Thermometer on the right
    const temp = isIdle ? AMBIENT_TEMP : AMBIENT_TEMP + progress * Math.max(0, MOTOR_HEAT - HEATSINK_OPTIONS[heatsink].dissipation)
    drawThermometer(ctx, W - 50, 30, 120, temp, ELECTRONICS_MAX_TEMP, time)

    // Orange/red gradient intensity overlay
    if (!isIdle && progress > 0.3) {
      const overlay = ctx.createRadialGradient(chamberCX, chamberCY, 20, chamberCX, chamberCY, 200)
      overlay.addColorStop(0, `rgba(239, 68, 68, ${progress * 0.1})`)
      overlay.addColorStop(1, 'transparent')
      ctx.fillStyle = overlay
      ctx.fillRect(0, 0, W, H)
    }
  }

  if (chamber === 'dust') {
    // Wind direction arrows
    if (!isIdle) {
      const arrowCount = 4
      for (let i = 0; i < arrowCount; i++) {
        const ay = chamberCY - 40 + i * 25
        const ax = 80 + Math.sin(time * 2 + i) * 20
        const arrowAlpha = 0.2 + progress * 0.3
        ctx.strokeStyle = `rgba(245, 158, 11, ${arrowAlpha})`
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(ax, ay)
        ctx.lineTo(ax + 30, ay)
        ctx.lineTo(ax + 24, ay - 4)
        ctx.moveTo(ax + 30, ay)
        ctx.lineTo(ax + 24, ay + 4)
        ctx.stroke()
      }
    }

    // Dust gauge on the right
    const dustLevel = isIdle ? 0.1 : progress * (1 - IP_OPTIONS[ipRating].dustProtection * 0.8)
    drawGauge(ctx, W - 55, H - 50, 30, dustLevel, t('gaugeDust'), '#F59E0B', time)

    // Volumetric dust coating on robot if failing
    if (!isIdle && !dustTestPasses(ipRating) && progress > 0.5) {
      const coatAlpha = (progress - 0.5) * 0.6
      ctx.fillStyle = `rgba(180, 150, 100, ${coatAlpha})`
      ctx.beginPath()
      ctx.ellipse(chamberCX, chamberCY - 10, 30, 20, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  if (chamber === 'vibration') {
    // Oscillating wave pattern on walls
    if (!isIdle) {
      ctx.strokeStyle = `rgba(139, 92, 246, ${0.2 + progress * 0.4})`
      ctx.lineWidth = 1
      // Sine wave across bottom
      for (let row = 0; row < 3; row++) {
        const wy = chamberCY + 50 + row * 12
        ctx.beginPath()
        for (let x = chamberCX - 140; x < chamberCX + 140; x += 3) {
          const amp = (testResult ? 4 : 10) * progress
          const yVal = wy + Math.sin((x + time * 300) * 0.05 + row) * amp
          if (x === chamberCX - 140) ctx.moveTo(x, yVal)
          else ctx.lineTo(x, yVal)
        }
        ctx.stroke()
      }

      // Displacement indicators (small arrows)
      if (progress > 0.3) {
        const dispCount = 4
        for (let i = 0; i < dispCount; i++) {
          const dx = chamberCX - 80 + i * 50
          const dy = chamberCY + 40
          const disp = Math.sin(time * 15 + i * 2) * (testResult ? 2 : 6) * progress
          ctx.strokeStyle = `rgba(167, 139, 250, ${0.4 + progress * 0.3})`
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(dx, dy)
          ctx.lineTo(dx + disp, dy)
          ctx.lineTo(dx + disp - (disp > 0 ? 3 : -3), dy - 2)
          ctx.moveTo(dx + disp, dy)
          ctx.lineTo(dx + disp - (disp > 0 ? 3 : -3), dy + 2)
          ctx.stroke()
        }
      }
    }

    // Vibration gauge
    const vibLevel = isIdle ? 0.05 : progress * (1 - DAMPER_OPTIONS[damper].vibrationReduction * 0.7)
    drawGauge(ctx, W - 55, H - 50, 30, vibLevel, t('gaugeVib'), '#8B5CF6', time)
  }

  // Draw robot
  const shake = (chamber === 'vibration' && !isIdle)
    ? Math.sin(time * 40) * (testResult ? 2 : 8) * progress
    : 0

  const robotGlow = (!isIdle && testResult && progress > 0.8)
    ? 'rgba(34, 197, 94, 0.3)'
    : (!isIdle && !testResult && progress > 0.6)
      ? 'rgba(239, 68, 68, 0.2)'
      : null

  draw25DRobot(ctx, chamberCX, chamberCY - 10, heatsink, ipRating, damper, shake, robotGlow, time)

  // Draw particles on top
  for (const p of particles) {
    ctx.globalAlpha = p.alpha * Math.max(0, p.life)
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  // Success green shield glow
  if (!isIdle && testResult && progress > 0.8) {
    const shieldAlpha = (progress - 0.8) * 3
    ctx.strokeStyle = `rgba(34, 197, 94, ${shieldAlpha * 0.6})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(chamberCX, chamberCY - 10, 50 + Math.sin(time * 3) * 3, 35 + Math.sin(time * 3) * 2, 0, 0, Math.PI * 2)
    ctx.stroke()

    // Inner glow
    const innerGlow = ctx.createRadialGradient(chamberCX, chamberCY - 10, 10, chamberCX, chamberCY - 10, 50)
    innerGlow.addColorStop(0, `rgba(34, 197, 94, ${shieldAlpha * 0.15})`)
    innerGlow.addColorStop(1, 'transparent')
    ctx.fillStyle = innerGlow
    ctx.beginPath()
    ctx.arc(chamberCX, chamberCY - 10, 50, 0, Math.PI * 2)
    ctx.fill()
  }

  // Chamber label at top
  ctx.fillStyle = '#D4D4D8'
  ctx.font = 'bold 13px sans-serif'
  ctx.textAlign = 'center'
  const labelBg = chamber === 'heat' ? 'rgba(239, 68, 68, 0.2)' :
                  chamber === 'dust' ? 'rgba(245, 158, 11, 0.2)' :
                  'rgba(139, 92, 246, 0.2)'
  const labelText = t(`chamber.${chamber}`)
  const labelW = ctx.measureText(labelText).width + 20
  ctx.fillStyle = labelBg
  ctx.beginPath()
  ctx.roundRect(W / 2 - labelW / 2, 6, labelW, 20, 4)
  ctx.fill()
  ctx.fillStyle = '#D4D4D8'
  ctx.fillText(labelText, W / 2, 20)

  // Progress bar at bottom
  if (!isIdle) {
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    ctx.fillRect(20, H - 14, W - 40, 6)
    const barColor = chamber === 'heat' ? '#EF4444' : chamber === 'dust' ? '#F59E0B' : '#8B5CF6'
    ctx.fillStyle = barColor
    ctx.beginPath()
    ctx.roundRect(20, H - 14, (W - 40) * progress, 6, 3)
    ctx.fill()

    // Glow on progress bar tip
    if (progress > 0.05) {
      const tipX = 20 + (W - 40) * progress
      const tipGlow = ctx.createRadialGradient(tipX, H - 11, 0, tipX, H - 11, 10)
      tipGlow.addColorStop(0, barColor)
      tipGlow.addColorStop(1, 'transparent')
      ctx.fillStyle = tipGlow
      ctx.beginPath()
      ctx.arc(tipX, H - 11, 10, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function RobotMission9({ onComplete }: RobotMission9Props) {
  const t = useTranslations('missions.robot.m9')

  const [heatsink, setHeatsink] = useState<HeatsinkSize>('none')
  const [ipRating, setIpRating] = useState<IPRating>('ip44')
  const [damper, setDamper] = useState<DamperType>('none')
  const [activeTest, setActiveTest] = useState<TestChamber | null>(null)
  const [completedTests, setCompletedTests] = useState<Record<TestChamber, boolean | null>>({
    heat: null, dust: null, vibration: null,
  })
  const [phase, setPhase] = useState<'configuring' | 'testing' | 'done'>('configuring')

  const steadyTemp = calculateSteadyTemp(heatsink)
  const heatPasses = steadyTemp <= ELECTRONICS_MAX_TEMP
  const dustPasses = dustTestPasses(ipRating)
  const vibrationPasses = vibrationTestPasses(damper)

  const totalCost = HEATSINK_OPTIONS[heatsink].cost + IP_OPTIONS[ipRating].cost + DAMPER_OPTIONS[damper].cost
  const budgetOk = totalCost <= BUDGET

  const allTestsDone = completedTests.heat !== null && completedTests.dust !== null && completedTests.vibration !== null

  const handleRunTest = useCallback((chamber: TestChamber) => {
    setActiveTest(chamber)
    setPhase('testing')
  }, [])

  const handleTestEnd = useCallback(() => {
    if (!activeTest) return

    const result = activeTest === 'heat' ? heatPasses
      : activeTest === 'dust' ? dustPasses
      : vibrationPasses

    setCompletedTests(prev => ({ ...prev, [activeTest]: result }))
    setActiveTest(null)
    setPhase('configuring')
  }, [activeTest, heatPasses, dustPasses, vibrationPasses])

  // After all tests are done, calculate score
  useEffect(() => {
    if (!allTestsDone || phase === 'done') return
    setPhase('done')

    const passCount = [completedTests.heat, completedTests.dust, completedTests.vibration].filter(Boolean).length

    // Tests passed score (max 500): ~167 per test
    const testScore = Math.round(passCount * 167)

    // Protection quality (max 350)
    let qualityScore = 0
    // Heat: how close to threshold (just under 70 is best engineering)
    if (heatPasses) {
      const margin = ELECTRONICS_MAX_TEMP - steadyTemp
      if (margin <= 5) qualityScore += 120 // tight engineering
      else if (margin <= 15) qualityScore += 100
      else qualityScore += 70 // over-engineered
    }
    // Dust: higher IP is better quality
    if (dustPasses) {
      qualityScore += IP_OPTIONS[ipRating].dustProtection >= 0.95 ? 120 : 100
    }
    // Vibration: higher reduction is better
    if (vibrationPasses) {
      qualityScore += DAMPER_OPTIONS[damper].vibrationReduction >= 0.9 ? 110 : 90
    }

    // Budget score (max 150)
    const budgetScore = totalCost <= 40 ? 150
      : totalCost <= 55 ? 120
      : totalCost <= BUDGET ? 80
      : 30

    const total = testScore + qualityScore + budgetScore

    const breakdownItems: ScoreBreakdownItem[] = [
      { label: t('scoreTests'), value: testScore, max: 500 },
      { label: t('scoreProtection'), value: qualityScore, max: 350 },
      { label: t('scoreBudget'), value: budgetScore, max: 150 },
    ]

    onComplete?.(total, breakdownItems)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTestsDone])

  const chambers: { id: TestChamber; label: string; icon: string }[] = [
    { id: 'heat', label: t('chamber.heat'), icon: '\u{1F525}' },
    { id: 'dust', label: t('chamber.dust'), icon: '\u{1F32A}' },
    { id: 'vibration', label: t('chamber.vibration'), icon: '\u{1F4A5}' },
  ]

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Story */}
      <div className="bg-gray-950 rounded-xl p-4 border border-gray-800">
        <p className="text-gray-300 text-sm">{t('story')}</p>
        <p className="text-yellow-400 text-sm font-bold mt-2">{t('requirement')}</p>
      </div>

      {/* Budget */}
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

      {/* Configuration — 3 sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Heat protection */}
        <div className="bg-gray-950 rounded-xl p-4 border border-gray-800 space-y-3">
          <h3 className="text-sm font-bold text-red-400 uppercase flex items-center gap-2">
            {'\u{1F525}'} {t('heatSection')}
          </h3>
          <p className="text-xs text-gray-500">{t('heatHint')}</p>

          {(Object.keys(HEATSINK_OPTIONS) as HeatsinkSize[]).map(size => (
            <button
              key={size}
              onClick={() => setHeatsink(size)}
              disabled={phase === 'testing'}
              className={clsx(
                'w-full p-2 rounded-lg border text-left text-sm transition-all',
                heatsink === size
                  ? 'border-blue-500 bg-blue-900/20'
                  : 'border-gray-700 bg-gray-900 hover:border-gray-500',
              )}
            >
              <div className="flex justify-between">
                <span className="text-white font-bold">{t(`heatsinks.${size}`)}</span>
                {HEATSINK_OPTIONS[size].cost > 0 && (
                  <span className="text-yellow-400 font-bold">${HEATSINK_OPTIONS[size].cost}</span>
                )}
              </div>
              <div className="text-xs text-gray-500">{HEATSINK_OPTIONS[size].dissipation}W {t('dissipation')}</div>
            </button>
          ))}

          <div className={clsx(
            'p-2 rounded-lg border text-xs text-center',
            heatPasses ? 'border-green-600/50 text-green-400' : 'border-red-600/50 text-red-400',
          )}>
            {t('tempEstimate')}: {steadyTemp}°C / {ELECTRONICS_MAX_TEMP}°C {heatPasses ? '\u2713' : '\u2717'}
          </div>
        </div>

        {/* Dust protection */}
        <div className="bg-gray-950 rounded-xl p-4 border border-gray-800 space-y-3">
          <h3 className="text-sm font-bold text-yellow-400 uppercase flex items-center gap-2">
            {'\u{1F32A}'} {t('dustSection')}
          </h3>
          <p className="text-xs text-gray-500">{t('dustHint')}</p>

          {(Object.keys(IP_OPTIONS) as IPRating[]).map(rating => (
            <button
              key={rating}
              onClick={() => setIpRating(rating)}
              disabled={phase === 'testing'}
              className={clsx(
                'w-full p-2 rounded-lg border text-left text-sm transition-all',
                ipRating === rating
                  ? 'border-blue-500 bg-blue-900/20'
                  : 'border-gray-700 bg-gray-900 hover:border-gray-500',
              )}
            >
              <div className="flex justify-between">
                <span className="text-white font-bold">{IP_OPTIONS[rating].label}</span>
                <span className="text-yellow-400 font-bold">${IP_OPTIONS[rating].cost}</span>
              </div>
              <div className="text-xs text-gray-500">{Math.round(IP_OPTIONS[rating].dustProtection * 100)}% {t('protection')}</div>
            </button>
          ))}

          <div className={clsx(
            'p-2 rounded-lg border text-xs text-center',
            dustPasses ? 'border-green-600/50 text-green-400' : 'border-red-600/50 text-red-400',
          )}>
            {t('dustCheck')}: {IP_OPTIONS[ipRating].label} {dustPasses ? '\u2713' : '\u2717'}
          </div>
        </div>

        {/* Vibration protection */}
        <div className="bg-gray-950 rounded-xl p-4 border border-gray-800 space-y-3">
          <h3 className="text-sm font-bold text-purple-400 uppercase flex items-center gap-2">
            {'\u{1F4A5}'} {t('vibrationSection')}
          </h3>
          <p className="text-xs text-gray-500">{t('vibrationHint')}</p>

          {(Object.keys(DAMPER_OPTIONS) as DamperType[]).map(type => (
            <button
              key={type}
              onClick={() => setDamper(type)}
              disabled={phase === 'testing'}
              className={clsx(
                'w-full p-2 rounded-lg border text-left text-sm transition-all',
                damper === type
                  ? 'border-blue-500 bg-blue-900/20'
                  : 'border-gray-700 bg-gray-900 hover:border-gray-500',
              )}
            >
              <div className="flex justify-between">
                <span className="text-white font-bold">{t(`dampers.${type}`)}</span>
                {DAMPER_OPTIONS[type].cost > 0 && (
                  <span className="text-yellow-400 font-bold">${DAMPER_OPTIONS[type].cost}</span>
                )}
              </div>
              <div className="text-xs text-gray-500">{Math.round(DAMPER_OPTIONS[type].vibrationReduction * 100)}% {t('reduction')}</div>
            </button>
          ))}

          <div className={clsx(
            'p-2 rounded-lg border text-xs text-center',
            vibrationPasses ? 'border-green-600/50 text-green-400' : 'border-red-600/50 text-red-400',
          )}>
            {t('vibrationCheck')}: {Math.round(DAMPER_OPTIONS[damper].vibrationReduction * 100)}% {vibrationPasses ? '\u2713' : '\u2717'}
          </div>
        </div>
      </div>

      {/* Test chambers */}
      <div>
        <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">{t('runTests')}</h3>
        <div className="grid grid-cols-3 gap-3">
          {chambers.map(ch => {
            const result = completedTests[ch.id]
            const isActive = activeTest === ch.id

            return (
              <button
                key={ch.id}
                onClick={() => handleRunTest(ch.id)}
                disabled={phase === 'testing' || result !== null}
                className={clsx(
                  'p-3 rounded-xl border-2 text-center transition-all',
                  result === true ? 'border-green-500 bg-green-900/20' :
                  result === false ? 'border-red-500 bg-red-900/20' :
                  isActive ? 'border-blue-500 bg-blue-900/20' :
                  'border-gray-700 bg-gray-900 hover:border-gray-500',
                  (phase === 'testing' || result !== null) && 'cursor-not-allowed',
                )}
              >
                <div className="text-2xl mb-1">{ch.icon}</div>
                <div className="text-white font-bold text-sm">{ch.label}</div>
                {result !== null && (
                  <div className={clsx('text-xs font-bold mt-1', result ? 'text-green-400' : 'text-red-400')}>
                    {result ? t('passed') : t('failed')}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Test animation */}
      {activeTest && (
        <TestChamberCanvas
          chamber={activeTest}
          testResult={
            activeTest === 'heat' ? heatPasses :
            activeTest === 'dust' ? dustPasses :
            vibrationPasses
          }
          isRunning={phase === 'testing'}
          onTestEnd={handleTestEnd}
          heatsink={heatsink}
          ipRating={ipRating}
          damper={damper}
          t={t}
        />
      )}
    </div>
  )
}
