'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import clsx from 'clsx'
import BlockEditor from '@/components/missions/common/BlockEditor'
import {
  executeDroneProgram,
  countBlocks,
  hasRedundantBlocks,
  type Command,
  type DroneStep,
  type Direction,
  type Coord,
} from './drone-engine'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GRID_SIZE = 5
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE // 25
const COVERAGE_THRESHOLD = 0.8 // 80% = 20 cells
const START_POS: Coord = { x: 0, y: 0 }
const START_DIR: Direction = 'S'
const OPTIMAL_BLOCKS = 7
const MAX_BLOCKS = 12
const PATROL_CYCLES = 3 // simulate 3 full patrol cycles
const MOVE_DURATION = 300
const MAX_SCORE = 1000

// Tile dimensions for 2.5D isometric view
const TILE_W = 64
const TILE_H = 32
const CANVAS_W = 420
const CANVAS_H = 400

// Night theme colors
const NIGHT_BG = '#0A0A1A'
const TILE_DARK = '#141428'
const TILE_VISITED_DIM = '#1E2A3A'
const TILE_VISITED_BRIGHT = '#253548'
const FLASHLIGHT_COLOR = '#FFE08844'
const DRONE_BLUE = '#3B82F6'
const SHADOW_COLOR = 'rgba(0,0,0,0.3)'

// ---------------------------------------------------------------------------
// Isometric coordinate helpers
// ---------------------------------------------------------------------------

function gridToIso(gx: number, gy: number): { x: number; y: number } {
  const isoX = (gx - gy) * (TILE_W / 2) + CANVAS_W / 2
  const isoY = (gx + gy) * (TILE_H / 2) + 60
  return { x: isoX, y: isoY }
}

// ---------------------------------------------------------------------------
// Canvas rendering
// ---------------------------------------------------------------------------

function drawNightGrid(
  ctx: CanvasRenderingContext2D,
  visited: Set<string>,
  droneGx: number,
  droneGy: number,
) {
  for (let gy = 0; gy < GRID_SIZE; gy++) {
    for (let gx = 0; gx < GRID_SIZE; gx++) {
      const { x, y } = gridToIso(gx, gy)
      const key = `${gx},${gy}`
      const isVisited = visited.has(key)

      // Check if near drone (flashlight range: 1 tile)
      const distToDrone = Math.abs(gx - Math.round(droneGx)) + Math.abs(gy - Math.round(droneGy))
      const isIlluminated = distToDrone <= 1

      ctx.beginPath()
      ctx.moveTo(x, y - TILE_H / 2)
      ctx.lineTo(x + TILE_W / 2, y)
      ctx.lineTo(x, y + TILE_H / 2)
      ctx.lineTo(x - TILE_W / 2, y)
      ctx.closePath()

      if (isIlluminated) {
        // Brightly lit by flashlight
        ctx.fillStyle = '#2A3A52'
      } else if (isVisited) {
        const isEven = (gx + gy) % 2 === 0
        ctx.fillStyle = isEven ? TILE_VISITED_DIM : TILE_VISITED_BRIGHT
      } else {
        ctx.fillStyle = TILE_DARK
      }
      ctx.fill()

      ctx.strokeStyle = isIlluminated ? '#4A6A8A' : isVisited ? '#2A3A4A' : '#1A1A30'
      ctx.lineWidth = 1
      ctx.stroke()

      // Small dot on visited cells
      if (isVisited && !isIlluminated) {
        ctx.fillStyle = '#3B82F633'
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
}

function drawFlashlight(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
) {
  // Radial gradient for flashlight cone effect
  const gradient = ctx.createRadialGradient(screenX, screenY - 10, 5, screenX, screenY - 10, 60)
  gradient.addColorStop(0, 'rgba(255, 224, 136, 0.3)')
  gradient.addColorStop(0.5, 'rgba(255, 224, 136, 0.1)')
  gradient.addColorStop(1, 'rgba(255, 224, 136, 0)')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(screenX, screenY - 10, 60, 0, Math.PI * 2)
  ctx.fill()
}

function drawNightDrone(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  direction: Direction,
  time: number,
  airborne: boolean,
) {
  const floatOffset = airborne ? Math.sin(time * 3) * 3 - 15 : 0
  const dy = screenY + floatOffset

  // Shadow (dimmer for night)
  ctx.fillStyle = SHADOW_COLOR
  ctx.beginPath()
  ctx.ellipse(screenX, screenY + 4, 14, 5, 0, 0, Math.PI * 2)
  ctx.fill()

  // Drone body
  ctx.fillStyle = DRONE_BLUE
  const bodyW = 18
  const bodyH = 10
  ctx.fillRect(screenX - bodyW / 2, dy - bodyH / 2, bodyW, bodyH)

  // Direction indicator
  const dirAngles: Record<Direction, number> = { N: -Math.PI / 2, E: 0, S: Math.PI / 2, W: Math.PI }
  const angle = dirAngles[direction]
  ctx.fillStyle = '#F59E0B'
  ctx.beginPath()
  ctx.moveTo(screenX + Math.cos(angle) * 12, dy + Math.sin(angle) * 7)
  ctx.lineTo(screenX + Math.cos(angle - 0.5) * 7, dy + Math.sin(angle - 0.5) * 7)
  ctx.lineTo(screenX + Math.cos(angle + 0.5) * 7, dy + Math.sin(angle + 0.5) * 7)
  ctx.closePath()
  ctx.fill()

  // Propellers with glow effect
  const propPositions = [
    { dx: -10, dy: -7 }, { dx: 10, dy: -7 },
    { dx: -10, dy: 7 }, { dx: 10, dy: 7 },
  ]
  for (const prop of propPositions) {
    const px = screenX + prop.dx
    const py = dy + prop.dy

    // Propeller glow
    ctx.fillStyle = 'rgba(96, 165, 250, 0.2)'
    ctx.beginPath()
    ctx.arc(px, py, 8, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = '#60A5FA'
    ctx.lineWidth = 2
    const propAngle = time * 15
    ctx.beginPath()
    ctx.moveTo(px + Math.cos(propAngle) * 6, py + Math.sin(propAngle) * 3)
    ctx.lineTo(px - Math.cos(propAngle) * 6, py - Math.sin(propAngle) * 3)
    ctx.stroke()

    ctx.strokeStyle = '#60A5FA66'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(screenX + (prop.dx > 0 ? bodyW / 2 : -bodyW / 2), dy)
    ctx.lineTo(px, py)
    ctx.stroke()
  }

  // Flashlight LED
  ctx.fillStyle = '#FFE088'
  ctx.beginPath()
  ctx.arc(screenX, dy + bodyH / 2 + 2, 2, 0, Math.PI * 2)
  ctx.fill()
}

// ---------------------------------------------------------------------------
// Confetti
// ---------------------------------------------------------------------------

interface ConfettiParticle {
  x: number; y: number; vx: number; vy: number
  color: string; rotation: number; rotSpeed: number; alpha: number
}

const CONFETTI_COLORS = ['#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#A855F7', '#EC4899']

function createConfetti(cx: number, cy: number): ConfettiParticle[] {
  const particles: ConfettiParticle[] = []
  for (let i = 0; i < 60; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 1 + Math.random() * 4
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.3,
      alpha: 1,
    })
  }
  return particles
}

function updateConfetti(particles: ConfettiParticle[]): ConfettiParticle[] {
  return particles
    .map(p => ({
      ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.08,
      rotation: p.rotation + p.rotSpeed, alpha: p.alpha - 0.008,
    }))
    .filter(p => p.alpha > 0)
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

interface DroneMission3Props {
  onComplete: (score: number, breakdown: Array<{ label: string; value: number; max: number }>) => void
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function DroneMission3({ onComplete }: DroneMission3Props) {
  const t = useTranslations('game')
  const canvasLabelsRef = useRef({ coverage: 'Coverage' })
  canvasLabelsRef.current.coverage = t('droneMission3.canvasCoverage')

  const [running, setRunning] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [failed, setFailed] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  // Track visited cells for coverage
  const visitedRef = useRef<Set<string>>(new Set([`${START_POS.x},${START_POS.y}`]))
  const coverageRef = useRef(0)

  // Animation state in refs
  const droneRef = useRef<{ x: number; y: number; dir: Direction; airborne: boolean }>({
    x: START_POS.x, y: START_POS.y, dir: START_DIR, airborne: false,
  })
  const confettiRef = useRef<ConfettiParticle[]>([])
  const canvasCtxRef = useRef<CanvasRenderingContext2D | null>(null)
  const timeRef = useRef(0)
  const animFrameRef = useRef(0)
  const canvasElRef = useRef<HTMLCanvasElement | null>(null)

  // Persistent render loop
  useEffect(() => {
    let active = true
    const loop = () => {
      if (!active) return
      const ctx = canvasCtxRef.current
      if (ctx) {
        timeRef.current += 0.016
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
        ctx.fillStyle = NIGHT_BG
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

        const drone = droneRef.current
        drawNightGrid(ctx, visitedRef.current, drone.x, drone.y)

        const isoPos = gridToIso(drone.x, drone.y)
        if (drone.airborne) {
          drawFlashlight(ctx, isoPos.x, isoPos.y)
        }
        drawNightDrone(ctx, isoPos.x, isoPos.y, drone.dir, timeRef.current, drone.airborne)

        // Coverage display
        const coverage = coverageRef.current
        const coveragePct = Math.round(coverage * 100)
        ctx.fillStyle = coverage >= COVERAGE_THRESHOLD ? '#22C55E' : '#F59E0B'
        ctx.font = 'bold 14px sans-serif'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.fillText(`${canvasLabelsRef.current.coverage}: ${coveragePct}%`, 10, 10)

        // Coverage bar
        ctx.fillStyle = '#1A1A30'
        ctx.fillRect(10, 28, 120, 8)
        ctx.fillStyle = coverage >= COVERAGE_THRESHOLD ? '#22C55E' : '#F59E0B'
        ctx.fillRect(10, 28, 120 * Math.min(1, coverage), 8)
        // Threshold marker
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(10 + 120 * COVERAGE_THRESHOLD, 26)
        ctx.lineTo(10 + 120 * COVERAGE_THRESHOLD, 38)
        ctx.stroke()

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
    canvasElRef.current = null
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvasElRef.current = canvas
    canvasCtxRef.current = ctx
  }, [])

  // Animate drone through steps, tracking visited cells
  const animateSteps = useCallback(async (steps: DroneStep[]) => {
    for (let i = 1; i < steps.length; i++) {
      const step = steps[i]
      const prev = steps[i - 1]

      if (step.action === 'move') {
        const startX = prev.position.x
        const startY = prev.position.y
        const endX = step.position.x
        const endY = step.position.y
        const frames = Math.round(MOVE_DURATION / 16)

        for (let f = 0; f <= frames; f++) {
          const t = f / frames
          const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
          droneRef.current = {
            x: startX + (endX - startX) * ease,
            y: startY + (endY - startY) * ease,
            dir: step.direction,
            airborne: true,
          }
          await new Promise(r => setTimeout(r, 16))
        }

        // Mark cell as visited
        const key = `${endX},${endY}`
        visitedRef.current = new Set(visitedRef.current).add(key)
        coverageRef.current = visitedRef.current.size / TOTAL_CELLS
      } else if (step.action === 'turn') {
        droneRef.current = { ...droneRef.current, dir: step.direction }
        await new Promise(r => setTimeout(r, 150))
      } else if (step.action === 'takeoff') {
        droneRef.current = { ...droneRef.current, airborne: true }
        await new Promise(r => setTimeout(r, 300))
      } else if (step.action === 'land') {
        droneRef.current = { ...droneRef.current, airborne: false }
        await new Promise(r => setTimeout(r, 300))
      }
    }
  }, [])

  // To simulate patrol loop: run the program multiple cycles
  const handleRun = useCallback(async (program: Command[]) => {
    if (running) return
    setRunning(true)
    setFailed(false)
    setCompleted(false)
    setStatusMessage('')

    // Reset
    droneRef.current = { x: START_POS.x, y: START_POS.y, dir: START_DIR, airborne: false }
    visitedRef.current = new Set([`${START_POS.x},${START_POS.y}`])
    coverageRef.current = 1 / TOTAL_CELLS

    // Track if the first pass had any overlapping cells (for style scoring)
    let firstPassVisited = new Set<string>([`${START_POS.x},${START_POS.y}`])
    let hadOverlapInFirstPass = false

    // Run the program for PATROL_CYCLES cycles
    for (let cycle = 0; cycle < PATROL_CYCLES; cycle++) {
      const result = executeDroneProgram(
        program,
        GRID_SIZE,
        cycle === 0
          ? START_POS
          : { x: Math.round(droneRef.current.x), y: Math.round(droneRef.current.y) },
        cycle === 0 ? START_DIR : droneRef.current.dir,
      )

      if (!result.success) {
        await animateSteps(result.steps)
        setRunning(false)
        setFailed(true)
        setStatusMessage(t('droneMission3.offGrid'))
        return
      }

      // For first cycle, track overlaps
      if (cycle === 0) {
        for (const step of result.steps) {
          if (step.action === 'move') {
            const key = `${step.position.x},${step.position.y}`
            if (firstPassVisited.has(key)) {
              hadOverlapInFirstPass = true
            }
            firstPassVisited.add(key)
          }
        }
      }

      await animateSteps(result.steps)

      // If we already hit 100% coverage, no need for more cycles
      if (coverageRef.current >= 1) break
    }

    const coverage = coverageRef.current
    const coverageMet = coverage >= COVERAGE_THRESHOLD

    if (coverageMet) {
      const blocksUsed = countBlocks(program)
      const redundant = hasRedundantBlocks(program)

      const correctness = Math.round(500 * Math.min(1, coverage / COVERAGE_THRESHOLD))
      const efficiency = Math.round(Math.max(0, 1 - (blocksUsed / OPTIMAL_BLOCKS - 1)) * 350)
      const style = !hadOverlapInFirstPass ? 150 : 0

      const totalScore = Math.min(MAX_SCORE, correctness + efficiency + style)

      confettiRef.current = createConfetti(CANVAS_W / 2, CANVAS_H / 2 - 30)

      setCompleted(true)
      setStatusMessage(t('droneMission3.success', { coverage: Math.round(coverage * 100) }))
      setRunning(false)

      await new Promise(r => setTimeout(r, 2000))

      onComplete(totalScore, [
        { label: t('droneMission3.scoreCorrectness'), value: correctness, max: 500 },
        { label: t('droneMission3.scoreEfficiency'), value: efficiency, max: 350 },
        { label: t('droneMission3.scoreStyle'), value: style, max: 150 },
      ])
    } else {
      setRunning(false)
      setFailed(true)
      setStatusMessage(
        t('droneMission3.insufficientCoverage', { coverage: Math.round(coverage * 100) })
      )
    }
  }, [running, t, onComplete, animateSteps])

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left: Game Canvas */}
      <div className="flex-shrink-0">
        <p className="text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">
          {t('droneMission3.simulationGrid')}
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
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-blue-500/50" /> {t('droneMission3.legendDrone')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: TILE_VISITED_BRIGHT }} /> {t('droneMission3.legendVisited')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: TILE_DARK }} /> {t('droneMission3.legendUnvisited')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-yellow-400/40" /> {t('droneMission3.legendFlashlight')}
          </span>
        </div>
      </div>

      {/* Right: Block Editor */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">
          {t('droneMission3.yourProgram')}
        </p>
        <BlockEditor
          maxBlocks={MAX_BLOCKS}
          onRun={handleRun}
          disabled={completed}
          running={running}
        />
        <p className="text-xs text-gray-500 mt-3">
          {t('droneMission3.tip')}
        </p>
      </div>
    </div>
  )
}
