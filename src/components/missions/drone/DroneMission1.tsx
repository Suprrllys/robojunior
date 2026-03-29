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
const START_POS: Coord = { x: 0, y: 4 }
const TARGET_POS: Coord = { x: 4, y: 0 }
const START_DIR: Direction = 'N'
const OPTIMAL_BLOCKS = 5 // takeoff, forward(4), turnRight, forward(4), land — minimal solution
const MAX_BLOCKS = 8
const MOVE_DURATION = 500 // ms per step
const TIME_LIMIT = 120    // seconds for speed scoring
const MAX_SCORE = 1000

// Tile dimensions for 2.5D isometric view
const TILE_W = 64
const TILE_H = 32
const CANVAS_W = 420
const CANVAS_H = 380

// Colors
const SAND_LIGHT = '#F5E6C8'
const SAND_DARK = '#E8D5A8'
const SAND_BORDER = '#D4C090'
const FLAG_RED = '#EF4444'
const DRONE_BLUE = '#3B82F6'
const SHADOW_COLOR = 'rgba(0,0,0,0.15)'

// ---------------------------------------------------------------------------
// Isometric coordinate helpers
// ---------------------------------------------------------------------------

function gridToIso(gx: number, gy: number): { x: number; y: number } {
  // Convert grid coords to isometric screen coords
  const isoX = (gx - gy) * (TILE_W / 2) + CANVAS_W / 2
  const isoY = (gx + gy) * (TILE_H / 2) + 60
  return { x: isoX, y: isoY }
}

// ---------------------------------------------------------------------------
// Canvas rendering functions
// ---------------------------------------------------------------------------

function drawGrid(ctx: CanvasRenderingContext2D) {
  for (let gy = 0; gy < GRID_SIZE; gy++) {
    for (let gx = 0; gx < GRID_SIZE; gx++) {
      const { x, y } = gridToIso(gx, gy)
      const isTarget = gx === TARGET_POS.x && gy === TARGET_POS.y
      const isStart = gx === START_POS.x && gy === START_POS.y

      // Draw diamond-shaped tile
      ctx.beginPath()
      ctx.moveTo(x, y - TILE_H / 2)
      ctx.lineTo(x + TILE_W / 2, y)
      ctx.lineTo(x, y + TILE_H / 2)
      ctx.lineTo(x - TILE_W / 2, y)
      ctx.closePath()

      // Alternate tile colors for texture
      const isEven = (gx + gy) % 2 === 0
      ctx.fillStyle = isTarget ? '#A78BFA44' : isStart ? '#60A5FA22' : isEven ? SAND_LIGHT : SAND_DARK
      ctx.fill()
      ctx.strokeStyle = isTarget ? '#A78BFA' : SAND_BORDER
      ctx.lineWidth = isTarget ? 2 : 1
      ctx.stroke()

      // Draw flag on target
      if (isTarget) {
        drawFlag(ctx, x, y)
      }

      // Draw start marker
      if (isStart) {
        ctx.fillStyle = '#60A5FA88'
        ctx.beginPath()
        ctx.arc(x, y, 6, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
}

function drawFlag(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Flag pole
  ctx.strokeStyle = '#666'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x, y - 28)
  ctx.stroke()

  // Flag
  ctx.fillStyle = FLAG_RED
  ctx.beginPath()
  ctx.moveTo(x, y - 28)
  ctx.lineTo(x + 14, y - 22)
  ctx.lineTo(x, y - 16)
  ctx.closePath()
  ctx.fill()
}

function drawDrone(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  direction: Direction,
  time: number,
  airborne: boolean,
) {
  const floatOffset = airborne ? Math.sin(time * 3) * 3 - 15 : 0
  const dy = screenY + floatOffset

  // Shadow
  ctx.fillStyle = SHADOW_COLOR
  ctx.beginPath()
  ctx.ellipse(screenX, screenY + 4, 16, 6, 0, 0, Math.PI * 2)
  ctx.fill()

  // Drone body
  ctx.fillStyle = DRONE_BLUE
  const bodyW = 20
  const bodyH = 12
  ctx.fillRect(screenX - bodyW / 2, dy - bodyH / 2, bodyW, bodyH)

  // Direction indicator
  const dirAngles: Record<Direction, number> = { N: -Math.PI / 2, E: 0, S: Math.PI / 2, W: Math.PI }
  const angle = dirAngles[direction]
  ctx.fillStyle = '#F59E0B'
  ctx.beginPath()
  ctx.moveTo(screenX + Math.cos(angle) * 14, dy + Math.sin(angle) * 8)
  ctx.lineTo(screenX + Math.cos(angle - 0.5) * 8, dy + Math.sin(angle - 0.5) * 8)
  ctx.lineTo(screenX + Math.cos(angle + 0.5) * 8, dy + Math.sin(angle + 0.5) * 8)
  ctx.closePath()
  ctx.fill()

  // Propellers (spinning effect)
  const propPositions = [
    { dx: -12, dy: -8 }, { dx: 12, dy: -8 },
    { dx: -12, dy: 8 }, { dx: 12, dy: 8 },
  ]
  for (const prop of propPositions) {
    const px = screenX + prop.dx
    const py = dy + prop.dy
    ctx.strokeStyle = '#60A5FA'
    ctx.lineWidth = 2

    // Spinning propeller line
    const propAngle = time * 15
    ctx.beginPath()
    ctx.moveTo(px + Math.cos(propAngle) * 6, py + Math.sin(propAngle) * 3)
    ctx.lineTo(px - Math.cos(propAngle) * 6, py - Math.sin(propAngle) * 3)
    ctx.stroke()

    // Arm
    ctx.strokeStyle = '#60A5FA88'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(screenX + (prop.dx > 0 ? bodyW / 2 : -bodyW / 2), dy)
    ctx.lineTo(px, py)
    ctx.stroke()
  }

  // Camera eye
  ctx.fillStyle = '#1E293B'
  ctx.beginPath()
  ctx.arc(screenX, dy, 2, 0, Math.PI * 2)
  ctx.fill()
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
// Confetti particle system
// ---------------------------------------------------------------------------

interface ConfettiParticle {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  rotation: number
  rotSpeed: number
  alpha: number
}

const CONFETTI_COLORS = ['#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#A855F7', '#EC4899']

function createConfetti(centerX: number, centerY: number): ConfettiParticle[] {
  const particles: ConfettiParticle[] = []
  for (let i = 0; i < 60; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 1 + Math.random() * 4
    particles.push({
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
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
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      vy: p.vy + 0.08, // gravity
      rotation: p.rotation + p.rotSpeed,
      alpha: p.alpha - 0.008,
    }))
    .filter(p => p.alpha > 0)
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DroneMission1Props {
  onComplete: (score: number, breakdown: Array<{ label: string; value: number; max: number }>) => void
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function DroneMission1({ onComplete }: DroneMission1Props) {
  const t = useTranslations('game')

  // State
  const [running, setRunning] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [failed, setFailed] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const startTimeRef = useRef(Date.now())

  // Animation state stored in refs for canvas rendering
  const droneRef = useRef<{ x: number; y: number; dir: Direction; airborne: boolean }>({
    x: START_POS.x, y: START_POS.y, dir: START_DIR, airborne: false,
  })
  const confettiRef = useRef<ConfettiParticle[]>([])
  const canvasCtxRef = useRef<CanvasRenderingContext2D | null>(null)
  const timeRef = useRef(0)
  const animFrameRef = useRef(0)

  // Canvas ref
  const canvasElRef = useRef<HTMLCanvasElement | null>(null)

  // Persistent render loop — runs as long as component is mounted
  useEffect(() => {
    let active = true

    const loop = () => {
      if (!active) return
      const ctx = canvasCtxRef.current
      if (ctx) {
        timeRef.current += 0.016

        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
        ctx.fillStyle = '#1a1a2e'
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

        drawGrid(ctx)

        const drone = droneRef.current
        const isoPos = gridToIso(drone.x, drone.y)
        drawDrone(ctx, isoPos.x, isoPos.y, drone.dir, timeRef.current, drone.airborne)

        if (confettiRef.current.length > 0) {
          confettiRef.current = updateConfetti(confettiRef.current)
          drawConfetti(ctx, confettiRef.current)
        }
      }
      animFrameRef.current = requestAnimationFrame(loop)
    }

    animFrameRef.current = requestAnimationFrame(loop)

    return () => {
      active = false
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  // Canvas ref callback — just sets the context
  const canvasReady = useCallback((canvas: HTMLCanvasElement | null) => {
    canvasCtxRef.current = null
    canvasElRef.current = null

    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvasElRef.current = canvas
    canvasCtxRef.current = ctx
  }, [])

  // Animate drone through steps
  const animateSteps = useCallback(async (steps: DroneStep[]) => {
    for (let i = 1; i < steps.length; i++) {
      const step = steps[i]
      const prev = steps[i - 1]

      // Smooth interpolation for moves
      if (step.action === 'move') {
        const startX = prev.position.x
        const startY = prev.position.y
        const endX = step.position.x
        const endY = step.position.y
        const frames = Math.round(MOVE_DURATION / 16)

        for (let f = 0; f <= frames; f++) {
          const t = f / frames
          // Ease in-out
          const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
          droneRef.current = {
            x: startX + (endX - startX) * ease,
            y: startY + (endY - startY) * ease,
            dir: step.direction,
            airborne: true,
          }
          await new Promise(r => setTimeout(r, 16))
        }
      } else if (step.action === 'turn') {
        droneRef.current = {
          ...droneRef.current,
          dir: step.direction,
        }
        await new Promise(r => setTimeout(r, 200))
      } else if (step.action === 'takeoff') {
        droneRef.current = { ...droneRef.current, airborne: true }
        await new Promise(r => setTimeout(r, 300))
      } else if (step.action === 'land') {
        droneRef.current = { ...droneRef.current, airborne: false }
        await new Promise(r => setTimeout(r, 300))
      }
    }
  }, [])

  // Handle program execution
  const handleRun = useCallback(async (program: Command[]) => {
    if (running) return
    setRunning(true)
    setFailed(false)
    setCompleted(false)
    setStatusMessage('')

    // Reset drone position
    droneRef.current = { x: START_POS.x, y: START_POS.y, dir: START_DIR, airborne: false }

    // Execute program through engine
    const result = executeDroneProgram(program, GRID_SIZE, START_POS, START_DIR)

    if (!result.success) {
      // Animate up to the last valid step, then show error
      await animateSteps(result.steps)
      setRunning(false)
      setFailed(true)
      setStatusMessage(t('droneMission1.offGrid'))
      return
    }

    // Animate all steps
    await animateSteps(result.steps)

    // Check if drone reached target
    const reachedTarget =
      result.finalPosition.x === TARGET_POS.x &&
      result.finalPosition.y === TARGET_POS.y

    if (reachedTarget) {
      // Calculate score (no speed component — only correctness + efficiency + style)
      const blocksUsed = countBlocks(program)
      const redundant = hasRedundantBlocks(program)

      const correctness = 500 // reached target (50%)
      const efficiency = Math.round(Math.max(0, 1 - (blocksUsed / OPTIMAL_BLOCKS - 1)) * 350) // (35%)
      const style = redundant ? 0 : 150 // clean code bonus (15%)

      const totalScore = correctness + efficiency + style
      const finalScore = Math.min(MAX_SCORE, totalScore)

      // Trigger confetti
      const isoTarget = gridToIso(TARGET_POS.x, TARGET_POS.y)
      confettiRef.current = createConfetti(isoTarget.x, isoTarget.y - 20)

      setCompleted(true)
      setStatusMessage(t('droneMission1.success'))
      setRunning(false)

      // Wait 2 seconds so player can see confetti and final position
      await new Promise(r => setTimeout(r, 2000))

      // Notify parent with score breakdown
      onComplete(finalScore, [
        { label: t('droneMission1.scoreCorrectness'), value: correctness, max: 500 },
        { label: t('droneMission1.scoreEfficiency'), value: efficiency, max: 350 },
        { label: t('droneMission1.scoreStyle'), value: style, max: 150 },
      ])
    } else {
      setRunning(false)
      setFailed(true)
      setStatusMessage(t('droneMission1.didNotReach'))
    }
  }, [running, t, onComplete, animateSteps])

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left: Game Canvas */}
      <div className="flex-shrink-0">
        <p className="text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">
          {t('droneMission1.simulationGrid')}
        </p>
        <div className="bg-gray-900 rounded-xl border border-[var(--brand-border)] overflow-hidden">
          <canvas
            ref={canvasReady}
            width={CANVAS_W}
            height={CANVAS_H}
            className="block max-w-full"
          />
        </div>

        {/* Status message */}
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
            <span className="w-3 h-3 rounded-sm bg-blue-500/50" /> {t('droneMission1.legendDrone')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-red-500/50" /> {t('droneMission1.legendTarget')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-blue-300/30" /> {t('droneMission1.legendStart')}
          </span>
        </div>
      </div>

      {/* Right: Block Editor */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">
          {t('droneMission1.yourProgram')}
        </p>
        <BlockEditor
          maxBlocks={MAX_BLOCKS}
          onRun={handleRun}
          disabled={completed}
          running={running}
        />
        <p className="text-xs text-gray-500 mt-3">
          {t('droneMission1.tip')}
        </p>
      </div>
    </div>
  )
}
