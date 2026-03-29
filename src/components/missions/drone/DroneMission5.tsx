'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import clsx from 'clsx'
import SimpleCodeEditor from './SimpleCodeEditor'
import { parseSwarmCode, type APICall } from './code-runner'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GRID_SIZE = 8
const MAX_SCORE = 1000
const MOVE_DURATION = 350

// 3 drones start at bottom row
const DRONE_STARTS = [
  { x: 1, y: 7 },
  { x: 3, y: 7 },
  { x: 5, y: 7 },
]

// 3 target solar panel locations
const TARGETS = [
  { x: 1, y: 2 },
  { x: 4, y: 1 },
  { x: 6, y: 3 },
]

const DRONE_COLORS = ['#EF4444', '#3B82F6', '#22C55E']
const DRONE_TRAIL_COLORS = ['rgba(239,68,68,0.3)', 'rgba(59,130,246,0.3)', 'rgba(34,197,94,0.3)']

// Canvas — 2.5D isometric
const TILE_W = 42
const TILE_H = 21
const CANVAS_W = 500
const CANVAS_H = 440

const BG_COLOR = '#0F172A'
const TILE_LIGHT = '#1E293B'
const TILE_DARK = '#162032'
const TILE_BORDER = '#2A3A52'
const TILE_SIDE = '#111827'

// Optimal code length (characters)
const OPTIMAL_CODE_LENGTH = 90

// Star particle system for ambient effect
interface StarParticle {
  x: number; y: number; size: number; alpha: number; speed: number
}

function createStars(count: number): StarParticle[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * CANVAS_W,
    y: Math.random() * CANVAS_H,
    size: 0.5 + Math.random() * 1.5,
    alpha: 0.2 + Math.random() * 0.6,
    speed: 0.3 + Math.random() * 0.7,
  }))
}

function drawStars(ctx: CanvasRenderingContext2D, stars: StarParticle[], time: number) {
  for (const s of stars) {
    const twinkle = 0.5 + Math.sin(time * s.speed + s.x) * 0.5
    ctx.fillStyle = `rgba(200, 220, 255, ${s.alpha * twinkle})`
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
    ctx.fill()
  }
}

// Installation spark effect
interface SparkParticle {
  x: number; y: number; vx: number; vy: number
  size: number; alpha: number; color: string
}

function createSparks(cx: number, cy: number): SparkParticle[] {
  const colors = ['#22C55E', '#4ADE80', '#86EFAC', '#FFD700', '#FDE68A']
  return Array.from({ length: 30 }, () => {
    const angle = Math.random() * Math.PI * 2
    const speed = 0.5 + Math.random() * 3
    return {
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.5,
      size: 1 + Math.random() * 2,
      alpha: 1,
      color: colors[Math.floor(Math.random() * colors.length)],
    }
  })
}

function updateSparks(sparks: SparkParticle[]): SparkParticle[] {
  return sparks.map(s => ({
    ...s, x: s.x + s.vx, y: s.y + s.vy, vy: s.vy + 0.06,
    alpha: s.alpha - 0.02,
  })).filter(s => s.alpha > 0)
}

function drawSparks(ctx: CanvasRenderingContext2D, sparks: SparkParticle[]) {
  for (const s of sparks) {
    ctx.fillStyle = s.color
    ctx.globalAlpha = s.alpha
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

const STARTER_CODE_EN = `// MISSION: Install solar panels at 3 locations
// You control 3 drones: drones[0], drones[1], drones[2]
// Target locations: targets[0], targets[1], targets[2]
//
// Available commands:
//   drones[i].flyTo(targets[i])  - fly drone i to target i
//   drones[i].install("solar_panel") - install a panel
//
// HINT: Use a for-loop to send each drone to its target!
// Example: for (let i = 0; i < 3; i++) { ... }

// Write your code below:

`

const STARTER_CODE_RU = `// МИССИЯ: Установи солнечные панели в 3 точках
// Ты управляешь 3 дронами: drones[0], drones[1], drones[2]
// Целевые точки: targets[0], targets[1], targets[2]
//
// Доступные команды:
//   drones[i].flyTo(targets[i])  - направить дрон i к цели i
//   drones[i].install("solar_panel") - установить панель
//
// ПОДСКАЗКА: Используй цикл for для отправки каждого дрона к цели!
// Пример: for (let i = 0; i < 3; i++) { ... }

// Напиши свой код ниже:

`

const STARTER_CODE_AR = `// المهمة: تركيب ألواح شمسية في 3 مواقع
// أنت تتحكم بـ 3 طائرات: drones[0], drones[1], drones[2]
// المواقع المستهدفة: targets[0], targets[1], targets[2]
//
// الأوامر المتاحة:
//   drones[i].flyTo(targets[i])  - توجيه الطائرة i إلى الهدف i
//   drones[i].install("solar_panel") - تركيب لوح شمسي
//
// تلميح: استخدم حلقة for لإرسال كل طائرة إلى هدفها!
// مثال: for (let i = 0; i < 3; i++) { ... }

// اكتب الكود الخاص بك أدناه:

`

// ---------------------------------------------------------------------------
// Isometric helpers
// ---------------------------------------------------------------------------

function gridToIso(gx: number, gy: number): { x: number; y: number } {
  const isoX = (gx - gy) * (TILE_W / 2) + CANVAS_W / 2
  const isoY = (gx + gy) * (TILE_H / 2) + 50
  return { x: isoX, y: isoY }
}

// ---------------------------------------------------------------------------
// Canvas rendering — 2.5D isometric
// ---------------------------------------------------------------------------

interface DroneState {
  x: number; y: number; active: boolean
}

const TILE_DEPTH = 8 // side face height for 2.5D effect

function drawGrid(
  ctx: CanvasRenderingContext2D,
  installedPanels: Set<number>,
  time: number,
) {
  for (let gy = 0; gy < GRID_SIZE; gy++) {
    for (let gx = 0; gx < GRID_SIZE; gx++) {
      const { x, y } = gridToIso(gx, gy)
      const isEven = (gx + gy) % 2 === 0

      const targetIdx = TARGETS.findIndex(t => t.x === gx && t.y === gy)
      const isTarget = targetIdx !== -1
      const isInstalled = isTarget && installedPanels.has(targetIdx)

      // Draw tile side faces (2.5D depth)
      // Right side face
      ctx.beginPath()
      ctx.moveTo(x, y + TILE_H / 2)
      ctx.lineTo(x + TILE_W / 2, y)
      ctx.lineTo(x + TILE_W / 2, y + TILE_DEPTH)
      ctx.lineTo(x, y + TILE_H / 2 + TILE_DEPTH)
      ctx.closePath()
      ctx.fillStyle = isInstalled ? '#166534' : isTarget ? '#78350F' : TILE_SIDE
      ctx.fill()

      // Left side face
      ctx.beginPath()
      ctx.moveTo(x, y + TILE_H / 2)
      ctx.lineTo(x - TILE_W / 2, y)
      ctx.lineTo(x - TILE_W / 2, y + TILE_DEPTH)
      ctx.lineTo(x, y + TILE_H / 2 + TILE_DEPTH)
      ctx.closePath()
      ctx.fillStyle = isInstalled ? '#14532D' : isTarget ? '#713F12' : '#0D1117'
      ctx.fill()

      // Top face (diamond)
      ctx.beginPath()
      ctx.moveTo(x, y - TILE_H / 2)
      ctx.lineTo(x + TILE_W / 2, y)
      ctx.lineTo(x, y + TILE_H / 2)
      ctx.lineTo(x - TILE_W / 2, y)
      ctx.closePath()

      if (isInstalled) {
        ctx.fillStyle = '#22C55E33'
      } else if (isTarget) {
        // Pulsing target glow
        const pulse = 0.15 + Math.sin(time * 3 + targetIdx) * 0.1
        ctx.fillStyle = `rgba(245, 158, 11, ${pulse})`
      } else {
        ctx.fillStyle = isEven ? TILE_LIGHT : TILE_DARK
      }
      ctx.fill()

      ctx.strokeStyle = isTarget ? (isInstalled ? '#22C55E' : '#F59E0B') : TILE_BORDER
      ctx.lineWidth = isTarget ? 1.5 : 0.5
      ctx.stroke()

      // Solar panel — isometric 3D look
      if (isTarget) {
        if (isInstalled) {
          // Raised solar panel with 3D effect
          const panelH = 4
          // Panel top face (angled for solar)
          ctx.fillStyle = '#22C55E'
          ctx.beginPath()
          ctx.moveTo(x, y - TILE_H / 4 - panelH)
          ctx.lineTo(x + TILE_W / 4, y - panelH)
          ctx.lineTo(x, y + TILE_H / 4 - panelH)
          ctx.lineTo(x - TILE_W / 4, y - panelH)
          ctx.closePath()
          ctx.fill()
          ctx.strokeStyle = '#166534'
          ctx.lineWidth = 0.5
          ctx.stroke()
          // Grid lines on panel
          ctx.beginPath()
          ctx.moveTo(x, y - TILE_H / 4 - panelH)
          ctx.lineTo(x, y + TILE_H / 4 - panelH)
          ctx.moveTo(x - TILE_W / 4, y - panelH)
          ctx.lineTo(x + TILE_W / 4, y - panelH)
          ctx.stroke()
          // Panel glow
          ctx.fillStyle = 'rgba(34, 197, 94, 0.15)'
          ctx.beginPath()
          ctx.arc(x, y - panelH, TILE_W / 3, 0, Math.PI * 2)
          ctx.fill()
        } else {
          // Dashed target outline
          ctx.strokeStyle = '#F59E0B'
          ctx.lineWidth = 1
          ctx.setLineDash([3, 3])
          ctx.beginPath()
          ctx.moveTo(x, y - TILE_H / 4)
          ctx.lineTo(x + TILE_W / 4, y)
          ctx.lineTo(x, y + TILE_H / 4)
          ctx.lineTo(x - TILE_W / 4, y)
          ctx.closePath()
          ctx.stroke()
          ctx.setLineDash([])
        }
      }

      // Start position markers with glow
      const startIdx = DRONE_STARTS.findIndex(s => s.x === gx && s.y === gy)
      if (startIdx !== -1) {
        ctx.fillStyle = DRONE_COLORS[startIdx] + '33'
        ctx.beginPath()
        ctx.arc(x, y, 6, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = DRONE_COLORS[startIdx] + '66'
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }
  }
}

function drawTrails(
  ctx: CanvasRenderingContext2D,
  trails: Array<Array<{ x: number; y: number }>>,
) {
  for (let d = 0; d < trails.length; d++) {
    const trail = trails[d]
    if (trail.length < 2) continue

    // Glow trail
    ctx.strokeStyle = DRONE_TRAIL_COLORS[d]
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    const first = gridToIso(trail[0].x, trail[0].y)
    ctx.moveTo(first.x, first.y)
    for (let i = 1; i < trail.length; i++) {
      const pos = gridToIso(trail[i].x, trail[i].y)
      ctx.lineTo(pos.x, pos.y)
    }
    ctx.stroke()

    // Brighter inner trail
    ctx.strokeStyle = DRONE_COLORS[d] + '55'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(first.x, first.y)
    for (let i = 1; i < trail.length; i++) {
      const pos = gridToIso(trail[i].x, trail[i].y)
      ctx.lineTo(pos.x, pos.y)
    }
    ctx.stroke()
    ctx.lineCap = 'butt'
    ctx.lineJoin = 'miter'
  }
}

function drawDrones(
  ctx: CanvasRenderingContext2D,
  drones: DroneState[],
  time: number,
) {
  for (let d = 0; d < drones.length; d++) {
    const drone = drones[d]
    if (!drone.active) continue

    const { x, y } = gridToIso(drone.x, drone.y)
    const floatOffset = Math.sin(time * 3 + d * 2) * 3 - 14

    // Shadow on ground
    ctx.fillStyle = 'rgba(0,0,0,0.2)'
    ctx.beginPath()
    ctx.ellipse(x, y + 4, 14, 5, 0, 0, Math.PI * 2)
    ctx.fill()

    const dy = y + floatOffset
    const bodyW = 18
    const bodyH = 10

    // Drone body
    ctx.fillStyle = DRONE_COLORS[d]
    ctx.fillRect(x - bodyW / 2, dy - bodyH / 2, bodyW, bodyH)

    // Body highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.fillRect(x - bodyW / 2, dy - bodyH / 2, bodyW, bodyH / 3)

    // Propeller arms and spinning blades
    const propPositions = [
      { dx: -12, ddy: -7 }, { dx: 12, ddy: -7 },
      { dx: -12, ddy: 7 }, { dx: 12, ddy: 7 },
    ]
    for (const prop of propPositions) {
      const px = x + prop.dx
      const py = dy + prop.ddy

      // Propeller glow
      ctx.fillStyle = DRONE_COLORS[d] + '22'
      ctx.beginPath()
      ctx.arc(px, py, 7, 0, Math.PI * 2)
      ctx.fill()

      // Arm
      ctx.strokeStyle = DRONE_COLORS[d] + '88'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x + (prop.dx > 0 ? bodyW / 2 : -bodyW / 2), dy)
      ctx.lineTo(px, py)
      ctx.stroke()

      // Spinning blade
      ctx.strokeStyle = DRONE_COLORS[d]
      ctx.lineWidth = 2
      const propAngle = time * 15 + d * 2
      ctx.beginPath()
      ctx.moveTo(px + Math.cos(propAngle) * 6, py + Math.sin(propAngle) * 3)
      ctx.lineTo(px - Math.cos(propAngle) * 6, py - Math.sin(propAngle) * 3)
      ctx.stroke()
    }

    // Camera lens
    ctx.fillStyle = '#1E293B'
    ctx.beginPath()
    ctx.arc(x, dy, 2, 0, Math.PI * 2)
    ctx.fill()

    // Drone index label
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 7px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${d}`, x, dy - bodyH / 2 - 5)
  }
}

// ---------------------------------------------------------------------------
// Confetti
// ---------------------------------------------------------------------------

interface ConfettiParticle {
  x: number; y: number; vx: number; vy: number
  color: string; rotation: number; rotSpeed: number; alpha: number
}

function createConfetti(cx: number, cy: number): ConfettiParticle[] {
  const particles: ConfettiParticle[] = []
  for (let i = 0; i < 60; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 1 + Math.random() * 4
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2,
      color: DRONE_COLORS[Math.floor(Math.random() * DRONE_COLORS.length)],
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.3,
      alpha: 1,
    })
  }
  return particles
}

function updateConfetti(p: ConfettiParticle[]): ConfettiParticle[] {
  return p.map(x => ({
    ...x, x: x.x + x.vx, y: x.y + x.vy, vy: x.vy + 0.08,
    rotation: x.rotation + x.rotSpeed, alpha: x.alpha - 0.008,
  })).filter(x => x.alpha > 0)
}

function drawConfetti(ctx: CanvasRenderingContext2D, particles: ConfettiParticle[]) {
  for (const p of particles) {
    ctx.fillStyle = p.color
    ctx.globalAlpha = p.alpha
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(p.rotation)
    ctx.fillRect(-3, -2, 6, 4)
    ctx.restore()
  }
  ctx.globalAlpha = 1
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DroneMission5Props {
  onComplete: (score: number, breakdown: Array<{ label: string; value: number; max: number }>) => void
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function DroneMission5({ onComplete }: DroneMission5Props) {
  const t = useTranslations('game')
  const locale = useLocale()
  const starterCode = locale === 'ru' ? STARTER_CODE_RU : locale === 'ar' ? STARTER_CODE_AR : STARTER_CODE_EN
  const canvasLabelsRef = useRef({ panels: 'Panels' })
  canvasLabelsRef.current.panels = t('droneMission5.canvasPanels')

  const [running, setRunning] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [codeError, setCodeError] = useState('')

  // Refs for canvas state
  const dronesRef = useRef<DroneState[]>(DRONE_STARTS.map(s => ({ ...s, active: true })))
  const trailsRef = useRef<Array<Array<{ x: number; y: number }>>>(
    DRONE_STARTS.map(s => [{ x: s.x, y: s.y }])
  )
  const installedRef = useRef<Set<number>>(new Set())
  const confettiRef = useRef<ConfettiParticle[]>([])
  const sparksRef = useRef<SparkParticle[]>([])
  const starsRef = useRef<StarParticle[]>(createStars(40))
  const canvasCtxRef = useRef<CanvasRenderingContext2D | null>(null)
  const timeRef = useRef(0)
  const animFrameRef = useRef(0)

  // Render loop
  useEffect(() => {
    let active = true
    const loop = () => {
      if (!active) return
      const ctx = canvasCtxRef.current
      if (ctx) {
        timeRef.current += 0.016
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
        ctx.fillStyle = BG_COLOR
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

        // Ambient stars
        drawStars(ctx, starsRef.current, timeRef.current)

        drawGrid(ctx, installedRef.current, timeRef.current)
        drawTrails(ctx, trailsRef.current)
        drawDrones(ctx, dronesRef.current, timeRef.current)

        // Installation sparks
        if (sparksRef.current.length > 0) {
          sparksRef.current = updateSparks(sparksRef.current)
          drawSparks(ctx, sparksRef.current)
        }

        // Panel counter with icon
        const installed = installedRef.current.size
        ctx.fillStyle = installed === 3 ? '#22C55E' : '#F59E0B'
        ctx.font = 'bold 13px sans-serif'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.fillText(`\u2600 ${canvasLabelsRef.current.panels}: ${installed}/3`, 10, 10)

        if (confettiRef.current.length > 0) {
          confettiRef.current = updateConfetti(confettiRef.current)
          drawConfetti(ctx, confettiRef.current)
        }
      }
      animFrameRef.current = requestAnimationFrame(loop)
    }
    animFrameRef.current = requestAnimationFrame(loop)
    return () => { active = false; cancelAnimationFrame(animFrameRef.current) }
  }, [])

  const canvasReady = useCallback((canvas: HTMLCanvasElement | null) => {
    canvasCtxRef.current = null
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvasCtxRef.current = ctx
  }, [])

  // Animate one drone flying to a position
  const animateDroneTo = useCallback(async (droneIdx: number, toX: number, toY: number) => {
    const drone = dronesRef.current[droneIdx]
    const startX = drone.x
    const startY = drone.y
    const frames = Math.round(MOVE_DURATION / 16)

    for (let f = 0; f <= frames; f++) {
      const progress = f / frames
      const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2
      const newX = startX + (toX - startX) * ease
      const newY = startY + (toY - startY) * ease

      dronesRef.current = dronesRef.current.map((d, i) =>
        i === droneIdx ? { ...d, x: newX, y: newY } : d
      )
      await new Promise(r => setTimeout(r, 16))
    }

    // Update trail
    trailsRef.current = trailsRef.current.map((trail, i) =>
      i === droneIdx ? [...trail, { x: toX, y: toY }] : trail
    )
    dronesRef.current = dronesRef.current.map((d, i) =>
      i === droneIdx ? { ...d, x: toX, y: toY } : d
    )
  }, [])

  // Handle code execution
  const handleRun = useCallback(async (code: string) => {
    if (running) return
    setRunning(true)
    setCompleted(false)
    setStatusMessage('')
    setCodeError('')

    // Reset state
    dronesRef.current = DRONE_STARTS.map(s => ({ ...s, active: true }))
    trailsRef.current = DRONE_STARTS.map(s => [{ x: s.x, y: s.y }])
    installedRef.current = new Set()

    // Parse code
    const result = parseSwarmCode(code, 3)
    if (!result.success) {
      setCodeError(result.error ?? 'Unknown error')
      setRunning(false)
      return
    }

    // Execute API calls one by one
    for (const call of result.calls) {
      if (call.type === 'flyTo') {
        const droneIdx = call.droneIndex ?? 0
        let targetX: number
        let targetY: number

        // Resolve targets[N] reference
        if (call.args[0] === -1) {
          const targetIdx = call.args[1]
          if (targetIdx < 0 || targetIdx >= TARGETS.length) {
            setCodeError(`Invalid target index: ${targetIdx}`)
            setRunning(false)
            return
          }
          targetX = TARGETS[targetIdx].x
          targetY = TARGETS[targetIdx].y
        } else {
          targetX = call.args[0]
          targetY = call.args[1]
        }

        // Validate bounds
        if (targetX < 0 || targetX >= GRID_SIZE || targetY < 0 || targetY >= GRID_SIZE) {
          setCodeError(`Position (${targetX}, ${targetY}) is off grid`)
          setRunning(false)
          return
        }

        await animateDroneTo(droneIdx, targetX, targetY)
      } else if (call.type === 'install') {
        const droneIdx = call.droneIndex ?? 0
        const drone = dronesRef.current[droneIdx]

        // Check if drone is at a target
        const targetIdx = TARGETS.findIndex(
          tgt => Math.round(drone.x) === tgt.x && Math.round(drone.y) === tgt.y
        )

        if (targetIdx !== -1) {
          installedRef.current = new Set(installedRef.current).add(targetIdx)
          // Trigger sparks at installation point
          const isoPos = gridToIso(Math.round(drone.x), Math.round(drone.y))
          sparksRef.current = [...sparksRef.current, ...createSparks(isoPos.x, isoPos.y)]
          await new Promise(r => setTimeout(r, 400))
        }
      }
    }

    // Check success
    const panelsInstalled = installedRef.current.size
    const allInstalled = panelsInstalled === 3

    if (allInstalled) {
      const codeLength = code.replace(/\s+/g, ' ').trim().length
      const correctness = 500
      const efficiency = Math.round(Math.max(0, 1 - (codeLength / OPTIMAL_CODE_LENGTH - 1)) * 350)
      const style = result.usedLoop ? 150 : 0

      const totalScore = Math.min(MAX_SCORE, correctness + efficiency + style)

      confettiRef.current = createConfetti(CANVAS_W / 2, CANVAS_H / 2 - 30)

      setCompleted(true)
      setStatusMessage(t('droneMission5.success'))
      setRunning(false)

      await new Promise(r => setTimeout(r, 2000))

      onComplete(totalScore, [
        { label: t('droneMission5.scoreCorrectness'), value: correctness, max: 500 },
        { label: t('droneMission5.scoreEfficiency'), value: efficiency, max: 350 },
        { label: t('droneMission5.scoreStyle'), value: style, max: 150 },
      ])
    } else {
      setRunning(false)
      setStatusMessage(
        t('droneMission5.partialSuccess', { installed: panelsInstalled, total: 3 })
      )
    }
  }, [running, t, onComplete, animateDroneTo])

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left: Game Canvas */}
      <div className="flex-shrink-0">
        <p className="text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">
          {t('droneMission5.simulationGrid')}
        </p>
        <div className="bg-gray-900 rounded-xl border border-[var(--brand-border)] overflow-hidden">
          <canvas
            ref={canvasReady}
            width={CANVAS_W}
            height={CANVAS_H}
            className="block max-w-full"
          />
        </div>

        {statusMessage && (
          <p className={clsx(
            'text-sm mt-2 font-bold',
            completed ? 'text-green-400' : 'text-red-400',
          )}>
            {statusMessage}
          </p>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
          {DRONE_COLORS.map((color, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color + '80' }} />
              {t('droneMission5.legendDrone')} {i}
            </span>
          ))}
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-yellow-500/40 border border-yellow-500" />
            {t('droneMission5.legendTarget')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-green-500/40 border border-green-500" />
            {t('droneMission5.legendInstalled')}
          </span>
        </div>
      </div>

      {/* Right: Code Editor */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">
          {t('droneMission5.yourCode')}
        </p>
        <SimpleCodeEditor
          starterCode={starterCode}
          onRun={handleRun}
          disabled={completed}
          running={running}
          error={codeError}
          hint={t('droneMission5.tip')}
        />
      </div>
    </div>
  )
}
