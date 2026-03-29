'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import clsx from 'clsx'
import { useTranslations } from 'next-intl'
import type { ScoreBreakdownItem } from '@/components/missions/common/MissionShell'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Component {
  id: string
  name: string
  power: number // watts
  essential: boolean // must have for robot to function
}

type BatterySize = 'small' | 'medium' | 'large'

interface BatteryOption {
  size: BatterySize
  capacity: number // Wh
  cost: number
  color: string
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  type: 'energy' | 'star' | 'success'
}

export interface RobotMission6Props {
  onComplete?: (score: number, breakdown: ScoreBreakdownItem[]) => void
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const COMPONENTS: Component[] = [
  { id: 'motor',  name: 'motor',  power: 50,  essential: true },
  { id: 'sensor', name: 'sensor', power: 5,   essential: true },
  { id: 'arm',    name: 'arm',    power: 80,  essential: false },
  { id: 'lights', name: 'lights', power: 20,  essential: false },
  { id: 'radio',  name: 'radio',  power: 10,  essential: false },
  { id: 'camera', name: 'camera', power: 15,  essential: false },
]

const BATTERY_OPTIONS: BatteryOption[] = [
  { size: 'small',  capacity: 200,  cost: 10, color: '#60A5FA' },
  { size: 'medium', capacity: 500,  cost: 20, color: '#F59E0B' },
  { size: 'large',  capacity: 1000, cost: 35, color: '#A78BFA' },
]

const WORK_HOURS = 8
const DAYLIGHT_HOURS = 6 // 6am to 12pm
const SOLAR_RATE = 100   // Wh per hour of daylight

// ---------------------------------------------------------------------------
// Particle helpers
// ---------------------------------------------------------------------------

function createEnergyParticles(sx: number, sy: number, ex: number, ey: number, count: number): Particle[] {
  const particles: Particle[] = []
  for (let i = 0; i < count; i++) {
    const life = 0.5 + Math.random() * 0.8
    const t = Math.random()
    particles.push({
      x: sx + (ex - sx) * t + (Math.random() - 0.5) * 10,
      y: sy + (ey - sy) * t + (Math.random() - 0.5) * 10,
      vx: (ex - sx) * 0.02 + (Math.random() - 0.5) * 0.5,
      vy: (ey - sy) * 0.02 + (Math.random() - 0.5) * 0.5,
      life, maxLife: life,
      size: 1 + Math.random() * 2,
      color: Math.random() > 0.5 ? '#FCD34D' : '#FBBF24',
      type: 'energy',
    })
  }
  return particles
}

function createStarParticles(W: number, H: number, count: number): Particle[] {
  const particles: Particle[] = []
  for (let i = 0; i < count; i++) {
    const life = 2 + Math.random() * 4
    particles.push({
      x: Math.random() * W,
      y: Math.random() * (H * 0.4),
      vx: 0, vy: 0,
      life, maxLife: life,
      size: 0.5 + Math.random() * 1.5,
      color: '#FFFFFF',
      type: 'star',
    })
  }
  return particles
}

function createSuccessParticles(cx: number, cy: number, count: number): Particle[] {
  const colors = ['#22C55E', '#4ADE80', '#86EFAC', '#FCD34D', '#60A5FA']
  const particles: Particle[] = []
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 1.5 + Math.random() * 4
    const life = 1 + Math.random() * 1.5
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life, maxLife: life,
      size: 2 + Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      type: 'success',
    })
  }
  return particles
}

function updateParticles(particles: Particle[], dt: number): Particle[] {
  return particles
    .map(p => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy + (p.type === 'success' ? 0.05 : 0),
      vy: p.type === 'success' ? p.vy + 0.05 : p.vy,
      life: p.life - dt,
    }))
    .filter(p => p.life > 0)
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    const alpha = Math.max(0, p.life / p.maxLife)
    ctx.globalAlpha = alpha

    if (p.type === 'energy') {
      ctx.shadowColor = p.color
      ctx.shadowBlur = 4
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
    } else if (p.type === 'star') {
      const twinkle = 0.3 + Math.sin(p.life * 3) * 0.7
      ctx.globalAlpha = alpha * twinkle
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    } else if (p.type === 'success') {
      ctx.fillStyle = p.color
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.life * 4)
      ctx.fillRect(-p.size, -p.size / 2, p.size * 2, p.size)
      ctx.restore()
    }
  }
  ctx.globalAlpha = 1
  ctx.shadowBlur = 0
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
// Simulation Canvas
// ---------------------------------------------------------------------------

function EnergySimulationCanvas({
  totalConsumption,
  batteryCapacity,
  hasSolar,
  isRunning,
  onSimEnd,
  t,
}: {
  totalConsumption: number
  batteryCapacity: number
  hasSolar: boolean
  isRunning: boolean
  onSimEnd: (survived: boolean, hoursLasted: number) => void
  t: (key: string) => string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const [statusText, setStatusText] = useState('')
  const [statusColor, setStatusColor] = useState('')
  const particlesRef = useRef<Particle[]>([])
  const starsRef = useRef<Particle[]>([])
  const timeRef = useRef<number>(0)

  // Calculate energy at each hour
  const hourlyEnergy = useMemo(() => {
    const energyLevels: number[] = []
    let energy = batteryCapacity

    for (let h = 0; h <= WORK_HOURS; h++) {
      energyLevels.push(Math.max(0, energy))
      // Consume power for this hour
      energy -= totalConsumption
      // Add solar if daylight (hours 0-5 are 6am-12pm = daylight)
      if (hasSolar && h < DAYLIGHT_HOURS) {
        energy += SOLAR_RATE
      }
    }

    return energyLevels
  }, [batteryCapacity, totalConsumption, hasSolar])

  const hoursLasted = useMemo(() => {
    for (let h = 1; h <= WORK_HOURS; h++) {
      if (hourlyEnergy[h] <= 0) return h - 1
    }
    return WORK_HOURS
  }, [hourlyEnergy])

  const survived = hoursLasted >= WORK_HOURS

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
    timeRef.current = 0

    // Initialize star particles
    if (starsRef.current.length === 0) {
      starsRef.current = createStarParticles(W, H, 40)
    }

    if (!isRunning) {
      // Static render with ambient animation
      let active = true
      function staticLoop() {
        if (!active || !ctx) return
        timeRef.current += 0.016

        // Refresh stars
        starsRef.current = updateParticles(starsRef.current, 0.016)
        if (starsRef.current.length < 30) {
          starsRef.current = starsRef.current.concat(createStarParticles(W, H, 5))
        }

        ctx.clearRect(0, 0, W, H)
        drawEnergyChart(ctx, W, H, hourlyEnergy, batteryCapacity, WORK_HOURS, hasSolar, null, t, timeRef.current, [], starsRef.current)
        animRef.current = requestAnimationFrame(staticLoop)
      }
      animRef.current = requestAnimationFrame(staticLoop)

      return () => {
        active = false
        if (animRef.current) cancelAnimationFrame(animRef.current)
      }
    }

    const DURATION = 4000
    startTimeRef.current = performance.now()
    particlesRef.current = []

    function animate(now: number) {
      if (!ctx || !canvas) return
      const elapsed = now - startTimeRef.current
      const progress = Math.min(elapsed / DURATION, 1)
      timeRef.current += 0.016

      // Update particles
      particlesRef.current = updateParticles(particlesRef.current, 0.016)
      starsRef.current = updateParticles(starsRef.current, 0.016)
      if (starsRef.current.length < 25) {
        starsRef.current = starsRef.current.concat(createStarParticles(W, H, 3))
      }

      // Generate energy flow particles from solar panels to battery during daylight hours
      if (hasSolar) {
        const currentSimHour = progress * WORK_HOURS
        if (currentSimHour < DAYLIGHT_HOURS && Math.random() > 0.6) {
          // Solar panel location (top area) to battery location
          particlesRef.current = particlesRef.current.concat(
            createEnergyParticles(W - 80, 20, 50, 20, 2)
          )
        }
      }

      // Success particles
      if (progress >= 0.95 && survived && particlesRef.current.filter(p => p.type === 'success').length < 10) {
        particlesRef.current = particlesRef.current.concat(createSuccessParticles(W / 2, H / 2, 40))
      }

      if (progress >= 0.9 && !statusText) {
        if (survived) {
          setStatusText(t('simSuccess'))
          setStatusColor('bg-green-600/90')
        } else {
          setStatusText(t('simFailed'))
          setStatusColor('bg-red-600/90')
        }
      }

      ctx.clearRect(0, 0, W, H)
      drawEnergyChart(ctx, W, H, hourlyEnergy, batteryCapacity, WORK_HOURS, hasSolar, progress, t, timeRef.current, particlesRef.current, starsRef.current)

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        onSimEnd(survived, hoursLasted)
      }
    }

    animRef.current = requestAnimationFrame(animate)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, hourlyEnergy, batteryCapacity, hasSolar])

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
          <div className={clsx('px-6 py-3 rounded-xl text-lg font-black text-white', statusColor)}>
            {statusText}
          </div>
        </div>
      )}
      {!isRunning && (
        <div className="absolute bottom-2 right-2 text-gray-600 text-xs pointer-events-none">
          {t('chartHint')}
        </div>
      )}
    </div>
  )
}

function drawEnergyChart(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  hourlyEnergy: number[],
  batteryCapacity: number,
  workHours: number,
  hasSolar: boolean,
  animProgress: number | null,
  t: (key: string) => string,
  time: number,
  activeParticles: Particle[],
  starParticles: Particle[],
) {
  const padding = { top: 40, right: 30, bottom: 50, left: 60 }
  const chartW = W - padding.left - padding.right
  const chartH = H - padding.top - padding.bottom

  // Max energy for scale
  const maxEnergy = Math.max(batteryCapacity, ...hourlyEnergy) * 1.1

  // Determine current simulated hour for day/night cycle
  const currentSimHour = animProgress !== null ? animProgress * workHours : workHours
  const isDaytime = currentSimHour < DAYLIGHT_HOURS
  const dayNightTransition = isDaytime ? 1.0 : Math.max(0, 1 - (currentSimHour - DAYLIGHT_HOURS) / 2)

  // Background - day/night gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H)
  if (animProgress !== null) {
    // Animated background transitioning from day to night
    const nightR = 7, nightG = 14, nightB = 26
    const dayR = 10, dayG = 25, dayB = 50
    const r = Math.round(nightR + (dayR - nightR) * dayNightTransition * 0.5)
    const g = Math.round(nightG + (dayG - nightG) * dayNightTransition * 0.5)
    const b = Math.round(nightB + (dayB - nightB) * dayNightTransition * 0.5)
    bgGrad.addColorStop(0, `rgb(${r}, ${g}, ${b})`)
    bgGrad.addColorStop(1, '#0A1628')
  } else {
    bgGrad.addColorStop(0, '#070E1A')
    bgGrad.addColorStop(1, '#0A1628')
  }
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, W, H)

  // Draw star particles (night sky effect)
  if (starParticles.length > 0) {
    drawParticles(ctx, starParticles)
  }

  // Sun/Moon cycle at top
  drawSunMoonCycle(ctx, W, padding.top - 5, currentSimHour, workHours, time)

  // Grid lines with subtle glow
  ctx.strokeStyle = 'rgba(30, 58, 95, 0.5)'
  ctx.lineWidth = 0.5

  // Horizontal grid lines
  const gridSteps = 5
  for (let i = 0; i <= gridSteps; i++) {
    const y = padding.top + (i / gridSteps) * chartH
    ctx.beginPath()
    ctx.moveTo(padding.left, y)
    ctx.lineTo(padding.left + chartW, y)
    ctx.stroke()

    // Y-axis label
    const val = Math.round(maxEnergy * (1 - i / gridSteps))
    ctx.fillStyle = '#6B7280'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`${val}Wh`, padding.left - 5, y + 3)
  }

  // Daylight zone background (first 6 hours)
  if (hasSolar) {
    const daylightEndX = padding.left + (DAYLIGHT_HOURS / workHours) * chartW
    const solarGrad = ctx.createLinearGradient(padding.left, padding.top, daylightEndX, padding.top)
    solarGrad.addColorStop(0, 'rgba(250, 204, 21, 0.03)')
    solarGrad.addColorStop(0.5, 'rgba(250, 204, 21, 0.07)')
    solarGrad.addColorStop(1, 'rgba(250, 204, 21, 0.02)')
    ctx.fillStyle = solarGrad
    ctx.fillRect(padding.left, padding.top, daylightEndX - padding.left, chartH)

    // Draw isometric solar panels
    drawSolarPanels(ctx, (padding.left + daylightEndX) / 2, padding.top + 20, time, isDaytime, t)
  }

  // Night zone with darker background after daylight
  const nightStartX = padding.left + (DAYLIGHT_HOURS / workHours) * chartW
  ctx.fillStyle = 'rgba(0, 0, 30, 0.15)'
  ctx.fillRect(nightStartX, padding.top, padding.left + chartW - nightStartX, chartH)

  // X-axis labels (hours)
  for (let h = 0; h <= workHours; h++) {
    const x = padding.left + (h / workHours) * chartW
    ctx.fillStyle = '#6B7280'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`${h + 6}:00`, x, H - padding.bottom + 18)

    // Vertical grid
    ctx.strokeStyle = 'rgba(30, 58, 95, 0.4)'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(x, padding.top)
    ctx.lineTo(x, padding.top + chartH)
    ctx.stroke()
  }

  // Axis labels
  ctx.fillStyle = '#9CA3AF'
  ctx.font = 'bold 11px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(t('chartTime'), padding.left + chartW / 2, H - 5)

  ctx.save()
  ctx.translate(12, padding.top + chartH / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText(t('chartEnergy'), 0, 0)
  ctx.restore()

  // Danger zone (low energy area) with red pulsing
  const dangerThreshold = maxEnergy * 0.15
  const dangerY = padding.top + chartH - (dangerThreshold / maxEnergy) * chartH
  const dangerAlpha = 0.03 + Math.sin(time * 2) * 0.02
  ctx.fillStyle = `rgba(239, 68, 68, ${dangerAlpha})`
  ctx.fillRect(padding.left, dangerY, chartW, padding.top + chartH - dangerY)

  // Danger line
  ctx.strokeStyle = `rgba(239, 68, 68, ${0.2 + Math.sin(time * 2) * 0.1})`
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  ctx.moveTo(padding.left, dangerY)
  ctx.lineTo(padding.left + chartW, dangerY)
  ctx.stroke()
  ctx.setLineDash([])

  // Danger label
  ctx.fillStyle = `rgba(239, 68, 68, ${0.4 + Math.sin(time * 2) * 0.2})`
  ctx.font = '8px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(t('canvasDangerZone'), padding.left + 4, dangerY - 3)

  // Determine how many bars to show based on animation progress
  const barsToShow = animProgress !== null
    ? Math.floor(animProgress * (workHours + 1))
    : workHours + 1

  // Energy bars with 3D isometric look
  const barWidth = (chartW / (workHours + 1)) * 0.55
  const isoOffset = 6 // Offset for 3D side faces

  for (let h = 0; h < Math.min(barsToShow, workHours + 1); h++) {
    const energy = hourlyEnergy[h]
    const barH = (energy / maxEnergy) * chartH
    const x = padding.left + (h / workHours) * chartW - barWidth / 2
    const y = padding.top + chartH - barH

    // Bar color based on energy level
    const ratio = energy / batteryCapacity
    let barColorMain: string
    let barColorDark: string
    let barColorLight: string
    let glowColor: string

    if (ratio > 0.5) {
      barColorMain = '#22C55E'
      barColorDark = '#166534'
      barColorLight = '#4ADE80'
      glowColor = 'rgba(34, 197, 94, 0.3)'
    } else if (ratio > 0.2) {
      barColorMain = '#F59E0B'
      barColorDark = '#92400E'
      barColorLight = '#FBBF24'
      glowColor = 'rgba(245, 158, 11, 0.3)'
    } else if (energy > 0) {
      barColorMain = '#EF4444'
      barColorDark = '#991B1B'
      barColorLight = '#F87171'
      glowColor = 'rgba(239, 68, 68, 0.3)'
    } else {
      barColorMain = '#374151'
      barColorDark = '#1F2937'
      barColorLight = '#4B5563'
      glowColor = 'rgba(55, 65, 81, 0.1)'
    }

    if (barH < 1) continue

    // Front face with gradient
    const frontGrad = ctx.createLinearGradient(x, y, x + barWidth, y)
    frontGrad.addColorStop(0, barColorMain)
    frontGrad.addColorStop(0.5, barColorLight)
    frontGrad.addColorStop(1, barColorMain)
    ctx.fillStyle = frontGrad
    ctx.fillRect(x, y, barWidth, barH)

    // Right side face (3D effect)
    ctx.fillStyle = barColorDark
    ctx.beginPath()
    ctx.moveTo(x + barWidth, y)
    ctx.lineTo(x + barWidth + isoOffset, y - isoOffset)
    ctx.lineTo(x + barWidth + isoOffset, y + barH - isoOffset)
    ctx.lineTo(x + barWidth, y + barH)
    ctx.closePath()
    ctx.fill()

    // Top face (3D effect)
    const topGrad = ctx.createLinearGradient(x, y - isoOffset, x + barWidth, y)
    topGrad.addColorStop(0, barColorLight)
    topGrad.addColorStop(1, barColorMain)
    ctx.fillStyle = topGrad
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + isoOffset, y - isoOffset)
    ctx.lineTo(x + barWidth + isoOffset, y - isoOffset)
    ctx.lineTo(x + barWidth, y)
    ctx.closePath()
    ctx.fill()

    // Glowing bar top line
    ctx.shadowColor = glowColor
    ctx.shadowBlur = 8
    ctx.strokeStyle = barColorLight
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + barWidth, y)
    ctx.stroke()
    ctx.shadowBlur = 0

    // Energy value on top of bar
    if (energy > 0) {
      ctx.fillStyle = '#E5E7EB'
      ctx.font = 'bold 9px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`${Math.round(energy)}`, x + barWidth / 2 + isoOffset / 2, y - isoOffset - 4)
    }
  }

  // Animated energy curve (smooth line connecting bar tops)
  if (barsToShow > 1) {
    ctx.beginPath()
    let firstPoint = true
    for (let h = 0; h < Math.min(barsToShow, workHours + 1); h++) {
      const energy = hourlyEnergy[h]
      const barH = (energy / maxEnergy) * chartH
      const x = padding.left + (h / workHours) * chartW
      const y = padding.top + chartH - barH

      if (firstPoint) {
        ctx.moveTo(x, y)
        firstPoint = false
      } else {
        // Smooth curve through points
        const prevH = h - 1
        const prevEnergy = hourlyEnergy[prevH]
        const prevBarH = (prevEnergy / maxEnergy) * chartH
        const prevX = padding.left + (prevH / workHours) * chartW
        const prevY = padding.top + chartH - prevBarH
        const cpx = (prevX + x) / 2
        ctx.bezierCurveTo(cpx, prevY, cpx, y, x, y)
      }
    }

    // Gradient fill under curve
    const lastH = Math.min(barsToShow - 1, workHours)
    const lastX = padding.left + (lastH / workHours) * chartW
    ctx.lineTo(lastX, padding.top + chartH)
    ctx.lineTo(padding.left, padding.top + chartH)
    ctx.closePath()

    const curveGrad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH)
    curveGrad.addColorStop(0, 'rgba(59, 130, 246, 0.15)')
    curveGrad.addColorStop(0.5, 'rgba(59, 130, 246, 0.05)')
    curveGrad.addColorStop(1, 'rgba(59, 130, 246, 0)')
    ctx.fillStyle = curveGrad
    ctx.fill()

    // Curve line with glow
    ctx.beginPath()
    firstPoint = true
    for (let h = 0; h < Math.min(barsToShow, workHours + 1); h++) {
      const energy = hourlyEnergy[h]
      const barH = (energy / maxEnergy) * chartH
      const x = padding.left + (h / workHours) * chartW
      const y = padding.top + chartH - barH

      if (firstPoint) {
        ctx.moveTo(x, y)
        firstPoint = false
      } else {
        const prevH = h - 1
        const prevEnergy = hourlyEnergy[prevH]
        const prevBarH = (prevEnergy / maxEnergy) * chartH
        const prevX = padding.left + (prevH / workHours) * chartW
        const prevY = padding.top + chartH - prevBarH
        const cpx = (prevX + x) / 2
        ctx.bezierCurveTo(cpx, prevY, cpx, y, x, y)
      }
    }

    ctx.shadowColor = '#3B82F6'
    ctx.shadowBlur = 6
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.shadowBlur = 0
  }

  // Battery indicator (3D icon)
  drawBattery3D(ctx, 15, padding.top + 5, batteryCapacity, hourlyEnergy, barsToShow, time)

  // Zero line (danger)
  ctx.strokeStyle = '#EF4444'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  ctx.moveTo(padding.left, padding.top + chartH)
  ctx.lineTo(padding.left + chartW, padding.top + chartH)
  ctx.stroke()
  ctx.setLineDash([])

  // Draw active particles (energy flow, success)
  if (activeParticles.length > 0) {
    drawParticles(ctx, activeParticles)
  }

  // Success glow overlay when energy lasted full 8 hours
  if (animProgress !== null && animProgress > 0.9 && hourlyEnergy[workHours] > 0) {
    const glowAlpha = (animProgress - 0.9) * 10 * 0.15 * (0.8 + Math.sin(time * 3) * 0.2)
    ctx.fillStyle = `rgba(34, 197, 94, ${glowAlpha})`
    ctx.fillRect(0, 0, W, H)
  }
}

// ---------------------------------------------------------------------------
// Sun/Moon cycle visualization
// ---------------------------------------------------------------------------

function drawSunMoonCycle(
  ctx: CanvasRenderingContext2D,
  W: number,
  y: number,
  currentHour: number,
  totalHours: number,
  time: number,
) {
  const centerX = W / 2
  const arcRadius = W * 0.35
  const progress = currentHour / totalHours

  // Arc path for sun/moon to travel
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.15)'
  ctx.lineWidth = 1
  ctx.setLineDash([2, 4])
  ctx.beginPath()
  ctx.arc(centerX, y + 15, arcRadius, Math.PI, 0, false)
  ctx.stroke()
  ctx.setLineDash([])

  // Sun position (first 6/8 of arc = daylight)
  const sunAngle = Math.PI - progress * Math.PI
  const sunX = centerX + Math.cos(sunAngle) * arcRadius
  const sunY = y + 15 + Math.sin(sunAngle) * arcRadius

  const isDaytime = currentHour < DAYLIGHT_HOURS

  if (isDaytime) {
    // Sun with glow
    const sunSize = 8
    const glowSize = sunSize + 4 + Math.sin(time * 2) * 2
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, glowSize)
    sunGrad.addColorStop(0, 'rgba(255, 220, 50, 1)')
    sunGrad.addColorStop(0.3, 'rgba(255, 180, 0, 0.8)')
    sunGrad.addColorStop(0.6, 'rgba(255, 140, 0, 0.3)')
    sunGrad.addColorStop(1, 'rgba(255, 140, 0, 0)')
    ctx.fillStyle = sunGrad
    ctx.beginPath()
    ctx.arc(sunX, sunY, glowSize, 0, Math.PI * 2)
    ctx.fill()

    // Sun body
    ctx.fillStyle = '#FCD34D'
    ctx.beginPath()
    ctx.arc(sunX, sunY, sunSize, 0, Math.PI * 2)
    ctx.fill()

    // Sun rays
    ctx.strokeStyle = 'rgba(252, 211, 77, 0.4)'
    ctx.lineWidth = 1.5
    for (let i = 0; i < 8; i++) {
      const rayAngle = (i / 8) * Math.PI * 2 + time * 0.5
      ctx.beginPath()
      ctx.moveTo(sunX + Math.cos(rayAngle) * (sunSize + 2), sunY + Math.sin(rayAngle) * (sunSize + 2))
      ctx.lineTo(sunX + Math.cos(rayAngle) * (sunSize + 6), sunY + Math.sin(rayAngle) * (sunSize + 6))
      ctx.stroke()
    }
  } else {
    // Moon
    const moonAngle = Math.PI - progress * Math.PI
    const moonX = centerX + Math.cos(moonAngle) * arcRadius
    const moonY = y + 15 + Math.sin(moonAngle) * arcRadius

    // Moon glow
    const moonGrad = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 15)
    moonGrad.addColorStop(0, 'rgba(200, 210, 230, 0.6)')
    moonGrad.addColorStop(0.5, 'rgba(150, 170, 200, 0.2)')
    moonGrad.addColorStop(1, 'rgba(100, 120, 160, 0)')
    ctx.fillStyle = moonGrad
    ctx.beginPath()
    ctx.arc(moonX, moonY, 15, 0, Math.PI * 2)
    ctx.fill()

    // Moon body (crescent)
    ctx.fillStyle = '#CBD5E1'
    ctx.beginPath()
    ctx.arc(moonX, moonY, 6, 0, Math.PI * 2)
    ctx.fill()

    // Crescent shadow
    ctx.fillStyle = '#0F172A'
    ctx.beginPath()
    ctx.arc(moonX + 3, moonY - 1, 5, 0, Math.PI * 2)
    ctx.fill()
  }
}

// ---------------------------------------------------------------------------
// Isometric solar panels
// ---------------------------------------------------------------------------

function drawSolarPanels(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  time: number,
  isDaytime: boolean,
  t: (key: string) => string,
) {
  // Draw small isometric solar panel array
  const panelW = 18
  const panelH = 10
  const panels = [
    { dx: -20, dy: 0 },
    { dx: 0, dy: 0 },
    { dx: 20, dy: 0 },
  ]

  for (const p of panels) {
    const px = cx + p.dx
    const py = cy + p.dy

    // Panel face (isometric diamond)
    ctx.beginPath()
    ctx.moveTo(px, py - panelH / 2)
    ctx.lineTo(px + panelW / 2, py)
    ctx.lineTo(px, py + panelH / 2)
    ctx.lineTo(px - panelW / 2, py)
    ctx.closePath()

    if (isDaytime) {
      const panelGrad = ctx.createLinearGradient(px - panelW / 2, py, px + panelW / 2, py)
      panelGrad.addColorStop(0, '#1E40AF')
      panelGrad.addColorStop(0.5, '#3B82F6')
      panelGrad.addColorStop(1, '#1E40AF')
      ctx.fillStyle = panelGrad
    } else {
      ctx.fillStyle = '#1E293B'
    }
    ctx.fill()
    ctx.strokeStyle = isDaytime ? '#60A5FA' : '#334155'
    ctx.lineWidth = 0.5
    ctx.stroke()

    // Glow effect when active (daytime)
    if (isDaytime) {
      const glowAlpha = 0.15 + Math.sin(time * 3 + p.dx) * 0.1
      ctx.shadowColor = '#60A5FA'
      ctx.shadowBlur = 6
      ctx.strokeStyle = `rgba(96, 165, 250, ${glowAlpha})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(px, py - panelH / 2)
      ctx.lineTo(px + panelW / 2, py)
      ctx.lineTo(px, py + panelH / 2)
      ctx.lineTo(px - panelW / 2, py)
      ctx.closePath()
      ctx.stroke()
      ctx.shadowBlur = 0
    }

    // Grid lines on panel
    ctx.strokeStyle = isDaytime ? 'rgba(96, 165, 250, 0.3)' : 'rgba(51, 65, 85, 0.3)'
    ctx.lineWidth = 0.3
    ctx.beginPath()
    ctx.moveTo(px, py - panelH / 2)
    ctx.lineTo(px, py + panelH / 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(px - panelW / 2, py)
    ctx.lineTo(px + panelW / 2, py)
    ctx.stroke()
  }

  // "Solar" label
  if (isDaytime) {
    ctx.fillStyle = 'rgba(252, 211, 77, 0.5)'
  } else {
    ctx.fillStyle = 'rgba(100, 116, 139, 0.3)'
  }
  ctx.font = '7px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(t('canvasSolar'), cx, cy + panelH + 6)
}

// ---------------------------------------------------------------------------
// 3D Battery indicator
// ---------------------------------------------------------------------------

function drawBattery3D(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  capacity: number,
  hourlyEnergy: number[],
  barsShown: number,
  time: number,
) {
  const battW = 28
  const battH = 50
  const tipH = 5
  const tipW = 14

  // Current energy level
  const currentEnergy = barsShown > 0 && barsShown <= hourlyEnergy.length
    ? hourlyEnergy[Math.min(barsShown - 1, hourlyEnergy.length - 1)]
    : hourlyEnergy[0]
  const fillRatio = Math.max(0, currentEnergy / capacity)

  // Battery tip
  ctx.fillStyle = '#4B5563'
  roundRect(ctx, x + (battW - tipW) / 2, y, tipW, tipH, 2)
  ctx.fill()

  // Battery body outline
  const bodyY = y + tipH
  ctx.fillStyle = '#1F2937'
  roundRect(ctx, x, bodyY, battW, battH, 4)
  ctx.fill()
  ctx.strokeStyle = '#4B5563'
  ctx.lineWidth = 1.5
  roundRect(ctx, x, bodyY, battW, battH, 4)
  ctx.stroke()

  // Battery fill level with animated gradient
  const fillH = fillRatio * (battH - 6)
  if (fillH > 0) {
    let fillColor1: string, fillColor2: string
    if (fillRatio > 0.5) {
      fillColor1 = '#22C55E'
      fillColor2 = '#16A34A'
    } else if (fillRatio > 0.2) {
      fillColor1 = '#F59E0B'
      fillColor2 = '#D97706'
    } else {
      fillColor1 = '#EF4444'
      fillColor2 = '#DC2626'
    }

    const fillGrad = ctx.createLinearGradient(x + 3, bodyY + battH - 3, x + battW - 3, bodyY + battH - 3)
    fillGrad.addColorStop(0, fillColor2)
    fillGrad.addColorStop(0.5, fillColor1)
    fillGrad.addColorStop(1, fillColor2)
    ctx.fillStyle = fillGrad
    roundRect(ctx, x + 3, bodyY + battH - 3 - fillH, battW - 6, fillH, 2)
    ctx.fill()

    // Animated shimmer
    const shimmerY = bodyY + battH - 3 - fillH + Math.abs(Math.sin(time * 2)) * fillH
    ctx.fillStyle = 'rgba(255,255,255,0.1)'
    ctx.fillRect(x + 3, shimmerY, battW - 6, 3)
  }

  // Percentage text
  ctx.fillStyle = '#E5E7EB'
  ctx.font = 'bold 8px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`${Math.round(fillRatio * 100)}%`, x + battW / 2, bodyY + battH + 12)

  // Glow when charging (daytime + has solar = implied by energy particles)
  if (fillRatio > 0.5) {
    const glowAlpha = 0.1 + Math.sin(time * 3) * 0.05
    ctx.shadowColor = '#22C55E'
    ctx.shadowBlur = 8
    ctx.strokeStyle = `rgba(34, 197, 94, ${glowAlpha})`
    ctx.lineWidth = 1
    roundRect(ctx, x - 1, bodyY - 1, battW + 2, battH + 2, 5)
    ctx.stroke()
    ctx.shadowBlur = 0
  }
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function RobotMission6({ onComplete }: RobotMission6Props) {
  const t = useTranslations('missions.robot.m6')

  // All components ON by default — robot needs everything to work on solar farm
  const [enabledComponents, setEnabledComponents] = useState<Set<string>>(
    new Set(COMPONENTS.map(c => c.id))
  )
  const [selectedBattery, setSelectedBattery] = useState<BatterySize>('small')
  const [hasSolar, setHasSolar] = useState(false)
  const [isSimulating, setIsSimulating] = useState(false)
  const [phase, setPhase] = useState<'configuring' | 'done'>('configuring')

  const battery = BATTERY_OPTIONS.find(b => b.size === selectedBattery)!
  const solarCost = 15

  const totalConsumption = useMemo(() => {
    let total = 0
    COMPONENTS.forEach(comp => {
      if (enabledComponents.has(comp.id)) total += comp.power
    })
    return total
  }, [enabledComponents])

  const totalEnergyNeeded = totalConsumption * WORK_HOURS
  const solarGeneration = hasSolar ? SOLAR_RATE * DAYLIGHT_HOURS : 0
  const netEnergyNeeded = totalEnergyNeeded - solarGeneration
  const energySufficient = battery.capacity >= netEnergyNeeded

  const totalCost = battery.cost + (hasSolar ? solarCost : 0)

  const toggleComponent = useCallback((id: string) => {
    const comp = COMPONENTS.find(c => c.id === id)
    if (!comp || comp.essential) return // can't disable essential components

    setEnabledComponents(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleSimulate = useCallback(() => {
    setIsSimulating(true)
  }, [])

  const handleSimEnd = useCallback((survived: boolean, hoursLasted: number) => {
    setIsSimulating(false)
    setPhase('done')

    // Scoring
    // Robot runs full 8h (max 500)
    const runtimeScore = survived ? 500 : Math.round((hoursLasted / WORK_HOURS) * 300)

    // Efficiency — not oversized battery (max 350)
    // Best: battery is just enough (capacity close to net energy needed)
    // Worst: battery is way too big or too small
    let efficiencyScore: number
    if (!survived) {
      efficiencyScore = 50
    } else {
      const excess = battery.capacity - netEnergyNeeded
      const excessRatio = excess / battery.capacity
      if (excessRatio <= 0.2) efficiencyScore = 350  // tight fit
      else if (excessRatio <= 0.4) efficiencyScore = 280
      else if (excessRatio <= 0.6) efficiencyScore = 200
      else efficiencyScore = 120 // way oversized
    }

    // Budget (max 150)
    const budgetScore = totalCost <= 20 ? 150
      : totalCost <= 30 ? 120
      : totalCost <= 40 ? 80
      : 50

    const total = runtimeScore + efficiencyScore + budgetScore

    const breakdownItems: ScoreBreakdownItem[] = [
      { label: t('scoreRuntime'), value: runtimeScore, max: 500 },
      { label: t('scoreEfficiency'), value: efficiencyScore, max: 350 },
      { label: t('scoreBudget'), value: budgetScore, max: 150 },
    ]

    onComplete?.(total, breakdownItems)
  }, [battery, netEnergyNeeded, totalCost, onComplete, t])

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Story */}
      <div className="bg-gray-950 rounded-xl p-4 border border-gray-800">
        <p className="text-gray-300 text-sm">{t('story')}</p>
        <p className="text-yellow-400 text-sm font-bold mt-2">{t('requirement')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
        {/* Components toggle list */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-400 uppercase">{t('components')}</h3>
          <div className="space-y-2">
            {COMPONENTS.map(comp => {
              const isOn = enabledComponents.has(comp.id)
              return (
                <button
                  key={comp.id}
                  onClick={() => toggleComponent(comp.id)}
                  disabled={isSimulating || comp.essential}
                  className={clsx(
                    'w-full p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3',
                    isOn
                      ? 'border-green-600/50 bg-green-900/10'
                      : 'border-gray-700 bg-gray-900/50',
                    comp.essential && 'cursor-not-allowed opacity-80',
                    isSimulating && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <div className={clsx(
                    'w-5 h-5 rounded border-2 flex items-center justify-center text-xs font-bold',
                    isOn ? 'border-green-500 bg-green-600 text-white' : 'border-gray-600',
                  )}>
                    {isOn && '\u2713'}
                  </div>
                  <span className="text-white font-bold text-sm flex-1">{t(`comp.${comp.name}`)}</span>
                  <span className="text-yellow-400 text-sm font-bold">{comp.power}W</span>
                  {comp.essential && (
                    <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">{t('required')}</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Total consumption */}
          <div className="bg-gray-950 rounded-xl p-3 border border-gray-800">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">{t('totalPower')}:</span>
              <span className="text-white font-bold">{totalConsumption}W</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-400">{t('energyNeeded')} (8h):</span>
              <span className="text-white font-bold">{totalEnergyNeeded}Wh</span>
            </div>
            {hasSolar && (
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-400">{t('solarGen')}:</span>
                <span className="text-green-400 font-bold">+{solarGeneration}Wh</span>
              </div>
            )}
            <div className="flex justify-between text-sm mt-1 border-t border-gray-800 pt-1">
              <span className="text-gray-400">{t('netNeeded')}:</span>
              <span className={clsx('font-bold', energySufficient ? 'text-green-400' : 'text-red-400')}>
                {netEnergyNeeded}Wh {energySufficient ? '\u2713' : '\u2717'}
              </span>
            </div>
          </div>
        </div>

        {/* Battery & Solar selection */}
        <div className="space-y-4 lg:w-64">
          <h3 className="text-sm font-bold text-gray-400 uppercase">{t('battery')}</h3>
          <div className="space-y-2">
            {BATTERY_OPTIONS.map(opt => (
              <button
                key={opt.size}
                onClick={() => { if (!isSimulating) setSelectedBattery(opt.size) }}
                disabled={isSimulating}
                className={clsx(
                  'w-full p-3 rounded-xl border-2 text-left transition-all',
                  selectedBattery === opt.size
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-gray-700 bg-gray-900 hover:border-gray-500',
                  isSimulating && 'opacity-50 cursor-not-allowed',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold">{t(`batteries.${opt.size}`)}</span>
                  <span className="text-yellow-400 font-bold">${opt.cost}</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">{opt.capacity}Wh</p>
              </button>
            ))}
          </div>

          {/* Solar panel toggle */}
          <button
            onClick={() => { if (!isSimulating) setHasSolar(!hasSolar) }}
            disabled={isSimulating}
            className={clsx(
              'w-full p-3 rounded-xl border-2 text-left transition-all',
              hasSolar
                ? 'border-yellow-500 bg-yellow-900/20'
                : 'border-gray-700 bg-gray-900 hover:border-gray-500',
              isSimulating && 'opacity-50 cursor-not-allowed',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-white font-bold">{t('solarPanel')}</span>
              <span className="text-yellow-400 font-bold">${solarCost}</span>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              +{SOLAR_RATE}Wh/h ({DAYLIGHT_HOURS}h {t('daylight')})
            </p>
          </button>

          {/* Total cost */}
          <div className="bg-gray-950 rounded-xl p-3 border border-gray-800">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">{t('totalCost')}:</span>
              <span className="text-yellow-400 font-bold">${totalCost}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Energy simulation chart */}
      <EnergySimulationCanvas
        totalConsumption={totalConsumption}
        batteryCapacity={battery.capacity}
        hasSolar={hasSolar}
        isRunning={isSimulating}
        onSimEnd={handleSimEnd}
        t={t}
      />

      {/* Run Simulation button */}
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
