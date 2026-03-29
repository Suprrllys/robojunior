'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import clsx from 'clsx'
import { useTranslations } from 'next-intl'
import type { ScoreBreakdownItem } from '@/components/missions/common/MissionShell'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StationType = 'cut' | 'bend' | 'weld' | 'inspect'

interface Station {
  type: StationType
  speed: number // 1-10
  baseTime: number // seconds at speed=1
  errorRateAtMaxSpeed: number // probability 0-1 at speed=10
}

export interface RobotMission8Props {
  onComplete?: (score: number, breakdown: ScoreBreakdownItem[]) => void
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const STATION_DEFAULTS: Record<StationType, { baseTime: number; errorRateAtMaxSpeed: number; color: string }> = {
  cut:     { baseTime: 60, errorRateAtMaxSpeed: 0.15, color: '#EF4444' },
  bend:    { baseTime: 45, errorRateAtMaxSpeed: 0.10, color: '#F59E0B' },
  weld:    { baseTime: 90, errorRateAtMaxSpeed: 0.25, color: '#3B82F6' },
  inspect: { baseTime: 30, errorRateAtMaxSpeed: 0.05, color: '#22C55E' },
}

const TARGET_PANELS_PER_HOUR = 5
const HOUR_SECONDS = 3600

function stationProcessTime(baseTime: number, speed: number): number {
  return baseTime / (1 + (speed - 1) * 0.22)
}

function stationErrorRate(maxRate: number, speed: number): number {
  return maxRate * ((speed - 1) / 9)
}

// ---------------------------------------------------------------------------
// Particle types
// ---------------------------------------------------------------------------

interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
}

interface SmokeWisp {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  alpha: number
}

interface ConveyorPart {
  x: number
  y: number
  targetX: number
  stationIdx: number
  defective: boolean
}

interface ConfettiPart {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  rotation: number
  rotSpeed: number
  alpha: number
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

function lerpColor(c1: string, c2: string, t: number): string {
  const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16)
  const r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16)
  const r = Math.round(r1 + (r2 - r1) * t)
  const g = Math.round(g1 + (g2 - g1) * t)
  const b = Math.round(b1 + (b2 - b1) * t)
  return `rgb(${r},${g},${b})`
}

function drawFactoryBackground(ctx: CanvasRenderingContext2D, W: number, H: number, time: number) {
  // Dark factory gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#0F172A')
  grad.addColorStop(0.5, '#0A1628')
  grad.addColorStop(1, '#0D1117')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // Subtle grid pattern on floor
  ctx.save()
  ctx.globalAlpha = 0.04
  ctx.strokeStyle = '#475569'
  ctx.lineWidth = 0.5
  for (let x = 0; x < W; x += 20) {
    ctx.beginPath()
    ctx.moveTo(x, H * 0.6)
    ctx.lineTo(x, H)
    ctx.stroke()
  }
  for (let y = Math.floor(H * 0.6); y < H; y += 15) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(W, y)
    ctx.stroke()
  }
  ctx.restore()

  // Ambient factory glow (ceiling lights)
  for (let i = 0; i < 3; i++) {
    const lx = W * (0.2 + i * 0.3)
    const ly = 10
    const flicker = 0.03 + Math.sin(time * 3 + i * 2) * 0.01
    const lightGrad = ctx.createRadialGradient(lx, ly, 0, lx, ly, 80)
    lightGrad.addColorStop(0, `rgba(251, 191, 36, ${flicker})`)
    lightGrad.addColorStop(1, 'rgba(251, 191, 36, 0)')
    ctx.fillStyle = lightGrad
    ctx.fillRect(lx - 80, ly - 10, 160, 90)
  }
}

function draw3DGanttBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  isBottleneck: boolean,
  time: number,
) {
  const depth = 6 // 3D depth offset
  const topH = 4  // Top face height

  // Side face (right)
  ctx.fillStyle = lerpColor(color, '#000000', 0.4)
  ctx.beginPath()
  ctx.moveTo(x + w, y)
  ctx.lineTo(x + w + depth, y - topH)
  ctx.lineTo(x + w + depth, y + h - topH)
  ctx.lineTo(x + w, y + h)
  ctx.closePath()
  ctx.fill()

  // Top face
  ctx.fillStyle = lerpColor(color, '#FFFFFF', 0.2)
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + depth, y - topH)
  ctx.lineTo(x + w + depth, y - topH)
  ctx.lineTo(x + w, y)
  ctx.closePath()
  ctx.fill()

  // Front face with gradient
  const barGrad = ctx.createLinearGradient(x, y, x, y + h)
  barGrad.addColorStop(0, lerpColor(color, '#FFFFFF', 0.1))
  barGrad.addColorStop(0.5, color)
  barGrad.addColorStop(1, lerpColor(color, '#000000', 0.2))
  ctx.fillStyle = barGrad
  ctx.fillRect(x, y, w, h)

  // Highlight stripe
  ctx.fillStyle = 'rgba(255,255,255,0.1)'
  ctx.fillRect(x, y, w, 2)

  // Bottleneck pulsing border
  if (isBottleneck) {
    const pulse = 0.5 + Math.sin(time * 4) * 0.3
    ctx.strokeStyle = `rgba(239, 68, 68, ${pulse})`
    ctx.lineWidth = 2
    ctx.strokeRect(x - 1, y - 1, w + 2, h + 2)
    ctx.shadowColor = '#EF4444'
    ctx.shadowBlur = 6
    ctx.strokeRect(x - 1, y - 1, w + 2, h + 2)
    ctx.shadowBlur = 0
  }
}

function drawConveyorBelt(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, time: number) {
  const beltH = 10
  const segW = 12

  // Belt shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.fillRect(x - 2, y + 3, w + 4, beltH + 2)

  // Belt body (isometric-style)
  const beltGrad = ctx.createLinearGradient(x, y, x, y + beltH)
  beltGrad.addColorStop(0, '#475569')
  beltGrad.addColorStop(0.5, '#334155')
  beltGrad.addColorStop(1, '#1E293B')
  ctx.fillStyle = beltGrad
  ctx.fillRect(x, y, w, beltH)

  // Moving segments
  const offset = (time * 30) % segW
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, beltH)
  ctx.clip()

  ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)'
  ctx.lineWidth = 1
  for (let sx = x - segW + offset; sx < x + w + segW; sx += segW) {
    ctx.beginPath()
    ctx.moveTo(sx, y)
    ctx.lineTo(sx, y + beltH)
    ctx.stroke()
  }
  ctx.restore()

  // Belt edges (rollers)
  ctx.fillStyle = '#64748B'
  ctx.beginPath()
  ctx.arc(x, y + beltH / 2, beltH / 2 + 1, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x + w, y + beltH / 2, beltH / 2 + 1, 0, Math.PI * 2)
  ctx.fill()

  // Roller highlights
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.beginPath()
  ctx.arc(x - 1, y + beltH / 2 - 1, 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x + w - 1, y + beltH / 2 - 1, 2, 0, Math.PI * 2)
  ctx.fill()
}

function drawStationIcon(
  ctx: CanvasRenderingContext2D,
  type: StationType,
  x: number,
  y: number,
  time: number,
  isActive: boolean,
) {
  const iconSize = 16

  // Station platform (3D box)
  ctx.fillStyle = '#1E293B'
  ctx.fillRect(x - iconSize, y - iconSize, iconSize * 2, iconSize * 2)
  // Top face
  ctx.fillStyle = '#334155'
  ctx.beginPath()
  ctx.moveTo(x - iconSize, y - iconSize)
  ctx.lineTo(x - iconSize + 4, y - iconSize - 3)
  ctx.lineTo(x + iconSize + 4, y - iconSize - 3)
  ctx.lineTo(x + iconSize, y - iconSize)
  ctx.closePath()
  ctx.fill()
  // Right face
  ctx.fillStyle = '#0F172A'
  ctx.beginPath()
  ctx.moveTo(x + iconSize, y - iconSize)
  ctx.lineTo(x + iconSize + 4, y - iconSize - 3)
  ctx.lineTo(x + iconSize + 4, y + iconSize - 3)
  ctx.lineTo(x + iconSize, y + iconSize)
  ctx.closePath()
  ctx.fill()

  // Station-specific icon
  ctx.save()
  ctx.translate(x, y)

  if (type === 'cut') {
    // Laser cutter icon
    ctx.strokeStyle = isActive ? '#EF4444' : '#9CA3AF'
    ctx.lineWidth = 2
    // Laser beam effect when active
    if (isActive) {
      ctx.save()
      ctx.globalAlpha = 0.5 + Math.sin(time * 10) * 0.3
      ctx.strokeStyle = '#EF4444'
      ctx.shadowColor = '#EF4444'
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.moveTo(0, -10)
      ctx.lineTo(0, 10)
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.restore()
    }
    // Blade
    ctx.beginPath()
    ctx.moveTo(-6, -8)
    ctx.lineTo(6, 8)
    ctx.moveTo(6, -8)
    ctx.lineTo(-6, 8)
    ctx.stroke()
  } else if (type === 'bend') {
    // Bending press icon
    ctx.strokeStyle = isActive ? '#F59E0B' : '#9CA3AF'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(-8, 6)
    ctx.lineTo(-2, -6)
    ctx.lineTo(4, 6)
    ctx.lineTo(8, -2)
    ctx.stroke()
    // Press arm
    if (isActive) {
      const pressY = Math.sin(time * 5) * 3
      ctx.fillStyle = '#F59E0B'
      ctx.fillRect(-4, -10 + pressY, 8, 4)
    }
  } else if (type === 'weld') {
    // Welding torch icon
    ctx.strokeStyle = isActive ? '#3B82F6' : '#9CA3AF'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(-3, -8)
    ctx.lineTo(0, 8)
    ctx.lineTo(3, -8)
    ctx.stroke()
    // Weld glow
    if (isActive) {
      const glowR = 6 + Math.sin(time * 8) * 2
      const grad = ctx.createRadialGradient(0, 8, 0, 0, 8, glowR)
      grad.addColorStop(0, 'rgba(251, 191, 36, 0.6)')
      grad.addColorStop(0.5, 'rgba(59, 130, 246, 0.3)')
      grad.addColorStop(1, 'rgba(59, 130, 246, 0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(0, 8, glowR, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (type === 'inspect') {
    // Scanner icon
    ctx.strokeStyle = isActive ? '#22C55E' : '#9CA3AF'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(0, 0, 7, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(5, 5)
    ctx.lineTo(10, 10)
    ctx.stroke()
    // Scanner glow sweep
    if (isActive) {
      const scanAngle = (time * 3) % (Math.PI * 2)
      ctx.save()
      ctx.globalAlpha = 0.3
      ctx.fillStyle = '#22C55E'
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, 10, scanAngle, scanAngle + 0.8)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }
  }

  ctx.restore()
}

function drawConveyorParts(
  ctx: CanvasRenderingContext2D,
  parts: ConveyorPart[],
  time: number,
) {
  for (const p of parts) {
    ctx.save()
    ctx.translate(p.x, p.y)

    if (p.defective) {
      // Red flash for defective parts
      const flash = Math.sin(time * 8) * 0.5 + 0.5
      ctx.fillStyle = `rgba(239, 68, 68, ${0.3 + flash * 0.4})`
      ctx.fillRect(-6, -6, 12, 12)
    }

    // Small isometric robot part (L-shape)
    ctx.fillStyle = p.defective ? '#EF4444' : '#94A3B8'
    ctx.fillRect(-4, -4, 8, 5)
    ctx.fillRect(-4, 1, 4, 4)

    // 3D top face
    ctx.fillStyle = p.defective ? '#FCA5A5' : '#CBD5E1'
    ctx.beginPath()
    ctx.moveTo(-4, -4)
    ctx.lineTo(-2, -6)
    ctx.lineTo(6, -6)
    ctx.lineTo(4, -4)
    ctx.closePath()
    ctx.fill()

    // Side face
    ctx.fillStyle = p.defective ? '#B91C1C' : '#64748B'
    ctx.beginPath()
    ctx.moveTo(4, -4)
    ctx.lineTo(6, -6)
    ctx.lineTo(6, -1)
    ctx.lineTo(4, 1)
    ctx.closePath()
    ctx.fill()

    ctx.restore()
  }
}

function drawSparks(ctx: CanvasRenderingContext2D, sparks: Spark[]) {
  ctx.save()
  for (const s of sparks) {
    const lifeRatio = s.life / s.maxLife
    ctx.globalAlpha = lifeRatio
    ctx.fillStyle = s.color
    ctx.shadowColor = s.color
    ctx.shadowBlur = 3
    ctx.beginPath()
    ctx.arc(s.x, s.y, 1.5 * lifeRatio, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.shadowBlur = 0
  ctx.globalAlpha = 1
  ctx.restore()
}

function drawSmoke(ctx: CanvasRenderingContext2D, wisps: SmokeWisp[]) {
  ctx.save()
  for (const w of wisps) {
    ctx.globalAlpha = w.alpha
    ctx.fillStyle = '#475569'
    ctx.beginPath()
    ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  ctx.restore()
}

function draw3DTimelineRuler(
  ctx: CanvasRenderingContext2D,
  padding: { top: number; right: number; bottom: number; left: number },
  chartW: number,
  chartH: number,
  maxTime: number,
  t: (k: string) => string,
  W: number,
  H: number,
) {
  const baseY = padding.top + chartH

  // 3D ruler bar
  ctx.fillStyle = '#1E293B'
  ctx.fillRect(padding.left, baseY, chartW, 8)
  // Top bevel
  ctx.fillStyle = '#334155'
  ctx.fillRect(padding.left, baseY, chartW, 2)
  // Bottom shadow
  ctx.fillStyle = '#0F172A'
  ctx.fillRect(padding.left, baseY + 6, chartW, 2)

  // Time ticks and labels
  const timeSteps = 5
  for (let i = 0; i <= timeSteps; i++) {
    const x = padding.left + (i / timeSteps) * chartW
    const timeVal = Math.round((i / timeSteps) * maxTime)

    // Tick mark
    ctx.fillStyle = '#475569'
    ctx.fillRect(x - 0.5, baseY, 1, 10)

    // Embossed number
    ctx.font = 'bold 10px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#0F172A'
    ctx.fillText(`${timeVal}s`, x + 1, baseY + 22)
    ctx.fillStyle = '#94A3B8'
    ctx.fillText(`${timeVal}s`, x, baseY + 21)
  }

  // Axis label
  ctx.fillStyle = '#64748B'
  ctx.font = 'bold 10px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(t('timeAxis'), padding.left + chartW / 2, H - 5)
}

function draw3DStatsBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  cycleData: {
    panelsPerHour: number
    defectRate: number
    idlePercent: number
    cycleTime: number
  },
  t: (k: string) => string,
  time: number,
) {
  const depth = 5

  // Side face
  ctx.fillStyle = '#0A0F1A'
  ctx.beginPath()
  ctx.moveTo(x + w, y)
  ctx.lineTo(x + w + depth, y - depth / 2)
  ctx.lineTo(x + w + depth, y + h - depth / 2)
  ctx.lineTo(x + w, y + h)
  ctx.closePath()
  ctx.fill()

  // Bottom face
  ctx.fillStyle = '#070B12'
  ctx.beginPath()
  ctx.moveTo(x, y + h)
  ctx.lineTo(x + depth, y + h - depth / 2)
  ctx.lineTo(x + w + depth, y + h - depth / 2)
  ctx.lineTo(x + w, y + h)
  ctx.closePath()
  ctx.fill()

  // Main panel
  ctx.fillStyle = 'rgba(15, 23, 42, 0.95)'
  ctx.fillRect(x, y, w, h)

  // Glow border
  const glowAlpha = 0.3 + Math.sin(time * 2) * 0.1
  ctx.strokeStyle = `rgba(56, 189, 248, ${glowAlpha})`
  ctx.lineWidth = 1.5
  ctx.shadowColor = '#38BDF8'
  ctx.shadowBlur = 6
  ctx.strokeRect(x, y, w, h)
  ctx.shadowBlur = 0

  // Panel highlight
  ctx.fillStyle = 'rgba(56, 189, 248, 0.05)'
  ctx.fillRect(x, y, w, 2)

  // Stats text
  const lineH = 16
  ctx.font = 'bold 10px monospace'
  ctx.textAlign = 'left'

  const stats = [
    { label: t('throughput'), value: `${cycleData.panelsPerHour}/h`, color: cycleData.panelsPerHour >= TARGET_PANELS_PER_HOUR ? '#22C55E' : '#EF4444' },
    { label: t('defectRate'), value: `${cycleData.defectRate.toFixed(1)}%`, color: cycleData.defectRate <= 10 ? '#22C55E' : '#F59E0B' },
    { label: t('idleTime'), value: `${cycleData.idlePercent.toFixed(0)}%`, color: cycleData.idlePercent <= 25 ? '#22C55E' : '#F59E0B' },
    { label: t('cycleTime'), value: `${cycleData.cycleTime.toFixed(1)}s`, color: '#94A3B8' },
  ]

  for (let i = 0; i < stats.length; i++) {
    const sy = y + 14 + i * lineH
    ctx.fillStyle = '#64748B'
    ctx.fillText(stats[i].label + ':', x + 8, sy)
    ctx.fillStyle = stats[i].color
    ctx.fillText(stats[i].value, x + w - 50, sy)
  }
}

function drawBottleneckWarning(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const pulse = 0.5 + Math.sin(time * 4) * 0.3
  ctx.save()
  ctx.globalAlpha = pulse

  // Warning triangle
  ctx.fillStyle = '#EF4444'
  ctx.shadowColor = '#EF4444'
  ctx.shadowBlur = 8
  ctx.beginPath()
  ctx.moveTo(x, y - 8)
  ctx.lineTo(x + 7, y + 4)
  ctx.lineTo(x - 7, y + 4)
  ctx.closePath()
  ctx.fill()
  ctx.shadowBlur = 0

  // Exclamation mark
  ctx.fillStyle = '#FFFFFF'
  ctx.font = 'bold 8px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('!', x, y + 2)

  ctx.restore()
}

function drawConfetti(ctx: CanvasRenderingContext2D, particles: ConfettiPart[]) {
  ctx.save()
  for (const p of particles) {
    ctx.globalAlpha = p.alpha
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(p.rotation)
    ctx.fillStyle = p.color
    ctx.fillRect(-3, -2, 6, 4)
    ctx.restore()
  }
  ctx.globalAlpha = 1
  ctx.restore()
}

function drawSuccessCheckmark(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  ctx.save()
  const pulse = 1 + Math.sin(time * 3) * 0.1

  // Green glow circle
  const grad = ctx.createRadialGradient(x, y, 0, x, y, 25 * pulse)
  grad.addColorStop(0, 'rgba(34, 197, 94, 0.3)')
  grad.addColorStop(1, 'rgba(34, 197, 94, 0)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(x, y, 25 * pulse, 0, Math.PI * 2)
  ctx.fill()

  // Circle background
  ctx.fillStyle = 'rgba(34, 197, 94, 0.2)'
  ctx.beginPath()
  ctx.arc(x, y, 15, 0, Math.PI * 2)
  ctx.fill()

  // Checkmark
  ctx.strokeStyle = '#22C55E'
  ctx.lineWidth = 3
  ctx.shadowColor = '#22C55E'
  ctx.shadowBlur = 6
  ctx.beginPath()
  ctx.moveTo(x - 7, y)
  ctx.lineTo(x - 2, y + 6)
  ctx.lineTo(x + 8, y - 5)
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.restore()
}

// ---------------------------------------------------------------------------
// Gantt Chart Canvas (enhanced 2.5D)
// ---------------------------------------------------------------------------

function GanttCanvas({
  stations,
  isRunning,
  onSimEnd,
  t,
}: {
  stations: Station[]
  isRunning: boolean
  onSimEnd: (panelsProduced: number, defectRate: number, idlePercent: number) => void
  t: (key: string) => string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const globalTimeRef = useRef<number>(0)
  const sparksRef = useRef<Spark[]>([])
  const smokeRef = useRef<SmokeWisp[]>([])
  const conveyorPartsRef = useRef<ConveyorPart[]>([])
  const confettiRef = useRef<ConfettiPart[]>([])

  // Calculate cycle time and throughput
  const cycleData = useMemo(() => {
    const times = stations.map(s => stationProcessTime(s.baseTime, s.speed))
    const bottleneck = Math.max(...times)
    const bottleneckIndex = times.indexOf(bottleneck)
    const cycleTime = bottleneck
    const panelsPerHour = Math.floor(HOUR_SECONDS / cycleTime)
    const totalTime = times.reduce((a, b) => a + b, 0)
    const idleTime = times.reduce((sum, t) => sum + (bottleneck - t), 0)
    const idlePercent = (idleTime / (bottleneck * stations.length)) * 100
    const combinedGoodRate = stations.reduce((rate, s) => {
      return rate * (1 - stationErrorRate(s.errorRateAtMaxSpeed, s.speed))
    }, 1)
    const defectRate = (1 - combinedGoodRate) * 100
    return { times, bottleneck, bottleneckIndex, cycleTime, panelsPerHour, totalTime, idlePercent, defectRate }
  }, [stations])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width
    const H = canvas.height

    if (animRef.current) cancelAnimationFrame(animRef.current)

    if (!isRunning) {
      // Draw idle state with ambient animation
      let idleActive = true

      function idleLoop() {
        if (!idleActive || !ctx) return
        globalTimeRef.current += 0.016
        const gTime = globalTimeRef.current

        // Update ambient particles
        // Smoke wisps
        if (Math.random() < 0.05) {
          smokeRef.current.push({
            x: 50 + Math.random() * (W - 100),
            y: H * 0.4 + Math.random() * 30,
            vx: (Math.random() - 0.5) * 0.3,
            vy: -0.2 - Math.random() * 0.3,
            r: 2 + Math.random() * 4,
            alpha: 0.15,
          })
        }
        for (const w of smokeRef.current) {
          w.x += w.vx
          w.y += w.vy
          w.r += 0.02
          w.alpha -= 0.001
        }
        smokeRef.current = smokeRef.current.filter(w => w.alpha > 0)

        ctx.clearRect(0, 0, W, H)
        drawFactoryBackground(ctx, W, H, gTime)
        drawSmoke(ctx, smokeRef.current)
        drawGanttScene(ctx, W, H, stations, cycleData, null, t, gTime, sparksRef.current, conveyorPartsRef.current, confettiRef.current)

        animRef.current = requestAnimationFrame(idleLoop)
      }

      animRef.current = requestAnimationFrame(idleLoop)

      return () => {
        idleActive = false
        if (animRef.current) cancelAnimationFrame(animRef.current)
      }
    }

    const DURATION = 4000
    startTimeRef.current = performance.now()
    sparksRef.current = []
    conveyorPartsRef.current = []
    confettiRef.current = []

    function animate(now: number) {
      if (!ctx || !canvas) return
      const elapsed = now - startTimeRef.current
      const progress = Math.min(elapsed / DURATION, 1)
      globalTimeRef.current += 0.016
      const gTime = globalTimeRef.current

      // Spawn sparks at weld station during animation
      const weldIdx = stations.findIndex(s => s.type === 'weld')
      if (weldIdx >= 0 && progress > 0.1 && progress < 0.85) {
        const padding = { top: 50, right: 30, bottom: 55, left: 100 }
        const chartH = H - padding.top - padding.bottom
        const rowH = chartH / stations.length
        const sparkY = padding.top + weldIdx * rowH + rowH / 2
        const sparkX = padding.left + 20

        for (let i = 0; i < 2; i++) {
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI
          const speed = 1 + Math.random() * 3
          sparksRef.current.push({
            x: sparkX,
            y: sparkY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            maxLife: 1,
            color: Math.random() > 0.5 ? '#FBBF24' : '#F97316',
          })
        }
      }

      // Spawn sparks at cut station (metal sparks)
      const cutIdx = stations.findIndex(s => s.type === 'cut')
      if (cutIdx >= 0 && progress > 0.1 && progress < 0.85) {
        const padding = { top: 50, right: 30, bottom: 55, left: 100 }
        const chartH = H - padding.top - padding.bottom
        const rowH = chartH / stations.length
        const sparkY = padding.top + cutIdx * rowH + rowH / 2
        const sparkX = padding.left + 15

        if (Math.random() < 0.3) {
          const angle = Math.random() * Math.PI * 2
          const speed = 0.5 + Math.random() * 2
          sparksRef.current.push({
            x: sparkX,
            y: sparkY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            maxLife: 1,
            color: '#EF4444',
          })
        }
      }

      // Update sparks
      for (const s of sparksRef.current) {
        s.x += s.vx
        s.y += s.vy
        s.vy += 0.05
        s.life -= 0.02
      }
      sparksRef.current = sparksRef.current.filter(s => s.life > 0)

      // Spawn conveyor parts
      if (progress > 0.05 && progress < 0.9 && Math.random() < 0.02) {
        const padding = { top: 50, right: 30, bottom: 55, left: 100 }
        const chartH = H - padding.top - padding.bottom
        const stationIdx = Math.floor(Math.random() * stations.length)
        const rowH = chartH / stations.length
        const partY = padding.top + stationIdx * rowH + rowH / 2

        conveyorPartsRef.current.push({
          x: padding.left - 20,
          y: partY,
          targetX: padding.left + 60,
          stationIdx,
          defective: Math.random() < cycleData.defectRate / 100,
        })
      }

      // Update conveyor parts
      for (const p of conveyorPartsRef.current) {
        if (p.x < p.targetX) {
          p.x += 0.8
        }
      }
      conveyorPartsRef.current = conveyorPartsRef.current.filter(p => p.x < p.targetX + 50)

      // Update smoke
      if (Math.random() < 0.04) {
        smokeRef.current.push({
          x: 50 + Math.random() * (W - 100),
          y: H * 0.35 + Math.random() * 30,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -0.2 - Math.random() * 0.3,
          r: 2 + Math.random() * 4,
          alpha: 0.12,
        })
      }
      for (const w of smokeRef.current) {
        w.x += w.vx
        w.y += w.vy
        w.r += 0.02
        w.alpha -= 0.001
      }
      smokeRef.current = smokeRef.current.filter(w => w.alpha > 0)

      // Success confetti
      if (progress >= 0.95 && cycleData.panelsPerHour >= TARGET_PANELS_PER_HOUR && confettiRef.current.length === 0) {
        const colors = ['#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#A855F7', '#EC4899']
        for (let i = 0; i < 40; i++) {
          const angle = Math.random() * Math.PI * 2
          const speed = 1 + Math.random() * 4
          confettiRef.current.push({
            x: W / 2,
            y: H / 2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.3,
            alpha: 1,
          })
        }
      }

      // Update confetti
      for (const c of confettiRef.current) {
        c.x += c.vx
        c.y += c.vy
        c.vy += 0.06
        c.rotation += c.rotSpeed
        c.alpha -= 0.006
      }
      confettiRef.current = confettiRef.current.filter(c => c.alpha > 0)

      ctx.clearRect(0, 0, W, H)
      drawFactoryBackground(ctx, W, H, gTime)
      drawSmoke(ctx, smokeRef.current)
      drawGanttScene(ctx, W, H, stations, cycleData, progress, t, gTime, sparksRef.current, conveyorPartsRef.current, confettiRef.current)

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        onSimEnd(cycleData.panelsPerHour, cycleData.defectRate, cycleData.idlePercent)
      }
    }

    animRef.current = requestAnimationFrame(animate)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, stations, cycleData])

  return (
    <div className="relative w-full rounded-xl border border-gray-800 overflow-hidden bg-gray-950">
      <canvas
        ref={canvasRef}
        width={600}
        height={320}
        className="w-full"
        style={{ minHeight: 240 }}
      />
    </div>
  )
}

function drawGanttScene(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  stations: Station[],
  cycleData: {
    times: number[]
    bottleneck: number
    bottleneckIndex: number
    cycleTime: number
    panelsPerHour: number
    idlePercent: number
    defectRate: number
  },
  animProgress: number | null,
  t: (key: string) => string,
  time: number,
  sparks: Spark[],
  conveyorParts: ConveyorPart[],
  confetti: ConfettiPart[],
) {
  const padding = { top: 50, right: 30, bottom: 55, left: 100 }
  const chartW = W - padding.left - padding.right
  const chartH = H - padding.top - padding.bottom

  // Title with 3D shadow
  ctx.save()
  ctx.font = 'bold 14px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#0F172A'
  ctx.fillText(t('ganttTitle'), W / 2 + 1, 25)
  ctx.fillStyle = '#E2E8F0'
  ctx.fillText(t('ganttTitle'), W / 2, 24)
  ctx.restore()

  // Conveyor belt subtitle area
  const conveyorY = padding.top - 12
  drawConveyorBelt(ctx, padding.left, conveyorY, chartW, time)

  // Time axis (3D ruler)
  const maxTime = cycleData.bottleneck * 1.2
  draw3DTimelineRuler(ctx, padding, chartW, chartH, maxTime, t, W, H)

  // Station rows
  const rowH = chartH / stations.length
  const barH = rowH * 0.55

  for (let i = 0; i < stations.length; i++) {
    const station = stations[i]
    const stationTime = cycleData.times[i]
    const y = padding.top + i * rowH + (rowH - barH) / 2

    // Station label with icon
    const labelX = padding.left - 12
    const labelY = y + barH / 2

    // Draw 3D station icon
    drawStationIcon(ctx, station.type, padding.left - 55, labelY, time, animProgress !== null && animProgress > 0.1)

    // Station name
    ctx.fillStyle = '#E2E8F0'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(t(`stations.${station.type}`), labelX, labelY + 4)

    // Bar width proportional to time
    const barProgress = animProgress !== null ? Math.min(animProgress * 1.5, 1) : 1
    const barW = (stationTime / maxTime) * chartW * barProgress

    // Determine colors
    const isBottleneck = i === cycleData.bottleneckIndex
    const color = isBottleneck ? '#EF4444' : STATION_DEFAULTS[station.type].color

    // 3D Gantt bar
    if (barW > 2) {
      draw3DGanttBar(ctx, padding.left, y, barW, barH, color, isBottleneck, time)
    }

    // Error rate overlay on bar
    const errorRate = stationErrorRate(station.errorRateAtMaxSpeed, station.speed)
    if (errorRate > 0.05 && barW > 5) {
      ctx.save()
      ctx.globalAlpha = 0.25 + Math.sin(time * 3) * 0.1
      const errorBarW = barW * errorRate
      const errGrad = ctx.createLinearGradient(padding.left + barW - errorBarW, y, padding.left + barW, y)
      errGrad.addColorStop(0, 'rgba(239, 68, 68, 0)')
      errGrad.addColorStop(1, 'rgba(239, 68, 68, 0.5)')
      ctx.fillStyle = errGrad
      ctx.fillRect(padding.left + barW - errorBarW, y, errorBarW, barH)
      ctx.restore()
    }

    // Time label on bar
    if (barProgress >= 0.8) {
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 10px monospace'
      ctx.textAlign = 'left'
      ctx.fillText(`${stationTime.toFixed(1)}s`, padding.left + barW + 6, y + barH / 2 + 4)
    }

    // Bottleneck warning indicator
    if (isBottleneck && barProgress >= 1) {
      drawBottleneckWarning(ctx, padding.left + barW + 50, y + barH / 2, time)
      ctx.fillStyle = '#EF4444'
      ctx.font = 'bold 9px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(t('bottleneck'), padding.left + barW + 60, y + barH / 2 + 4)
    }

    // Idle time visualization (dashed area after bar)
    if (barProgress >= 1) {
      const idleW = ((cycleData.bottleneck - stationTime) / maxTime) * chartW
      if (idleW > 3) {
        ctx.save()
        ctx.globalAlpha = 0.15
        ctx.setLineDash([3, 3])
        ctx.strokeStyle = '#475569'
        ctx.strokeRect(padding.left + barW, y, idleW, barH)
        ctx.setLineDash([])
        ctx.restore()
      }
    }
  }

  // Draw conveyor parts
  drawConveyorParts(ctx, conveyorParts, time)

  // Draw sparks
  drawSparks(ctx, sparks)

  // Stats box (3D panel)
  if (animProgress === null || animProgress >= 0.7) {
    draw3DStatsBox(ctx, W - 175, padding.top + 8, 160, 72, cycleData, t, time)
  }

  // Success checkmark and confetti
  if (animProgress !== null && animProgress >= 0.95 && cycleData.panelsPerHour >= TARGET_PANELS_PER_HOUR) {
    drawSuccessCheckmark(ctx, W / 2, H / 2, time)
  }

  drawConfetti(ctx, confetti)
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function RobotMission8({ onComplete }: RobotMission8Props) {
  const t = useTranslations('missions.robot.m8')

  const [stationOrder, setStationOrder] = useState<StationType[]>(['cut', 'bend', 'weld', 'inspect'])
  const [speeds, setSpeeds] = useState<Record<StationType, number>>({
    cut: 5, bend: 5, weld: 5, inspect: 5,
  })
  const [isSimulating, setIsSimulating] = useState(false)
  const [phase, setPhase] = useState<'configuring' | 'done'>('configuring')
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const stations: Station[] = useMemo(() => {
    return stationOrder.map(type => ({
      type,
      speed: speeds[type],
      baseTime: STATION_DEFAULTS[type].baseTime,
      errorRateAtMaxSpeed: STATION_DEFAULTS[type].errorRateAtMaxSpeed,
    }))
  }, [stationOrder, speeds])

  // Calculate preview stats
  const previewStats = useMemo(() => {
    const times = stations.map(s => stationProcessTime(s.baseTime, s.speed))
    const bottleneck = Math.max(...times)
    const panelsPerHour = Math.floor(HOUR_SECONDS / bottleneck)
    const combinedGoodRate = stations.reduce((rate, s) => {
      return rate * (1 - stationErrorRate(s.errorRateAtMaxSpeed, s.speed))
    }, 1)
    const defectRate = (1 - combinedGoodRate) * 100
    const idleTime = times.reduce((sum, t) => sum + (bottleneck - t), 0)
    const idlePercent = (idleTime / (bottleneck * stations.length)) * 100
    return { panelsPerHour, defectRate, idlePercent }
  }, [stations])

  const handleSpeedChange = useCallback((type: StationType, speed: number) => {
    setSpeeds(prev => ({ ...prev, [type]: speed }))
  }, [])

  const moveStation = useCallback((fromIndex: number, toIndex: number) => {
    setStationOrder(prev => {
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }, [])

  const handleSimulate = useCallback(() => {
    setIsSimulating(true)
  }, [])

  const handleSimEnd = useCallback((panelsProduced: number, defectRate: number, idlePercent: number) => {
    setIsSimulating(false)
    setPhase('done')

    // Throughput score (max 500)
    let throughputScore: number
    if (panelsProduced >= TARGET_PANELS_PER_HOUR) {
      throughputScore = 500
    } else if (panelsProduced >= 4) {
      throughputScore = 400
    } else if (panelsProduced >= 3) {
      throughputScore = 250
    } else {
      throughputScore = 100
    }

    // Quality score (max 350): lower defect rate = better
    let qualityScore: number
    if (defectRate <= 5) {
      qualityScore = 350
    } else if (defectRate <= 10) {
      qualityScore = 280
    } else if (defectRate <= 20) {
      qualityScore = 180
    } else {
      qualityScore = 80
    }

    // Efficiency score (max 150): less idle time = better
    let efficiencyScore: number
    if (idlePercent <= 10) {
      efficiencyScore = 150
    } else if (idlePercent <= 25) {
      efficiencyScore = 100
    } else if (idlePercent <= 40) {
      efficiencyScore = 60
    } else {
      efficiencyScore = 30
    }

    const total = throughputScore + qualityScore + efficiencyScore

    const breakdownItems: ScoreBreakdownItem[] = [
      { label: t('scoreThroughput'), value: throughputScore, max: 500 },
      { label: t('scoreQuality'), value: qualityScore, max: 350 },
      { label: t('scoreEfficiency'), value: efficiencyScore, max: 150 },
    ]

    onComplete?.(total, breakdownItems)
  }, [onComplete, t])

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Story */}
      <div className="bg-gray-950 rounded-xl p-4 border border-gray-800">
        <p className="text-gray-300 text-sm">{t('story')}</p>
        <p className="text-yellow-400 text-sm font-bold mt-2">{t('requirement')}</p>
      </div>

      {/* Station order -- drag to reorder */}
      <div>
        <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">{t('stationOrder')}</h3>
        <p className="text-xs text-gray-500 mb-2">{t('dragHint')}</p>
        <div className="space-y-2">
          {stationOrder.map((type, index) => {
            const defaults = STATION_DEFAULTS[type]
            const speed = speeds[type]
            const processTime = stationProcessTime(defaults.baseTime, speed)
            const errorRate = stationErrorRate(defaults.errorRateAtMaxSpeed, speed) * 100

            return (
              <div
                key={type}
                draggable={!isSimulating}
                onDragStart={() => setDragIndex(index)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex !== null && dragIndex !== index) {
                    moveStation(dragIndex, index)
                  }
                  setDragIndex(null)
                }}
                className={clsx(
                  'bg-gray-900 rounded-xl border-2 p-3 transition-all cursor-grab active:cursor-grabbing',
                  dragIndex === index ? 'border-blue-500 opacity-50' : 'border-gray-700',
                  isSimulating && 'cursor-not-allowed opacity-60',
                )}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-gray-500 text-lg cursor-grab">{'\u2630'}</div>
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: defaults.color }}
                  />
                  <span className="text-white font-bold text-sm flex-1">{t(`stations.${type}`)}</span>
                  <span className="text-gray-400 text-xs">
                    {processTime.toFixed(1)}s
                  </span>
                  {errorRate > 5 && (
                    <span className="text-red-400 text-xs font-bold">{errorRate.toFixed(0)}% {t('errorLabel')}</span>
                  )}
                </div>

                {/* Speed slider */}
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 text-xs w-12">{t('speed')}</span>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={speed}
                    onChange={e => handleSpeedChange(type, Number(e.target.value))}
                    disabled={isSimulating}
                    className="flex-1 accent-blue-500"
                  />
                  <span className="text-white font-bold text-xs w-8 text-right">{speed}/10</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Preview stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className={clsx(
          'p-3 rounded-lg border text-center',
          previewStats.panelsPerHour >= TARGET_PANELS_PER_HOUR
            ? 'border-green-600/50 bg-green-900/10'
            : 'border-red-600/50 bg-red-900/10',
        )}>
          <div className="text-gray-400 text-xs mb-1">{t('throughput')}</div>
          <div className={clsx(
            'text-xl font-black',
            previewStats.panelsPerHour >= TARGET_PANELS_PER_HOUR ? 'text-green-400' : 'text-red-400',
          )}>
            {previewStats.panelsPerHour}/h
          </div>
          <div className="text-gray-500 text-xs">{t('target')}: {TARGET_PANELS_PER_HOUR}+/h</div>
        </div>

        <div className={clsx(
          'p-3 rounded-lg border text-center',
          previewStats.defectRate <= 10
            ? 'border-green-600/50 bg-green-900/10'
            : 'border-orange-600/50 bg-orange-900/10',
        )}>
          <div className="text-gray-400 text-xs mb-1">{t('defectRate')}</div>
          <div className={clsx(
            'text-xl font-black',
            previewStats.defectRate <= 10 ? 'text-green-400' : 'text-orange-400',
          )}>
            {previewStats.defectRate.toFixed(1)}%
          </div>
          <div className="text-gray-500 text-xs">{t('lowerBetter')}</div>
        </div>

        <div className={clsx(
          'p-3 rounded-lg border text-center',
          previewStats.idlePercent <= 25
            ? 'border-green-600/50 bg-green-900/10'
            : 'border-yellow-600/50 bg-yellow-900/10',
        )}>
          <div className="text-gray-400 text-xs mb-1">{t('idleTime')}</div>
          <div className={clsx(
            'text-xl font-black',
            previewStats.idlePercent <= 25 ? 'text-green-400' : 'text-yellow-400',
          )}>
            {previewStats.idlePercent.toFixed(0)}%
          </div>
          <div className="text-gray-500 text-xs">{t('lowerBetter')}</div>
        </div>
      </div>

      {/* Gantt chart */}
      <GanttCanvas
        stations={stations}
        isRunning={isSimulating}
        onSimEnd={handleSimEnd}
        t={t}
      />

      {/* Run button */}
      {phase === 'configuring' && (
        <button
          onClick={handleSimulate}
          disabled={isSimulating}
          className={clsx(
            'w-full py-3 rounded-xl font-black text-lg uppercase tracking-wider transition-all',
            !isSimulating
              ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/30'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed',
          )}
        >
          {t('runSimulation')}
        </button>
      )}
    </div>
  )
}
