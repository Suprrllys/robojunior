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

const GRID_SIZE = 6
const START_POS: Coord = { x: 0, y: 5 }
const START_DIR: Direction = 'N'
const OPTIMAL_BLOCKS = 8
const MAX_BLOCKS = 14
const MOVE_DURATION = 400
const MAX_SCORE = 1000

// 5 photo points scattered in a zigzag pattern
const PHOTO_POINTS: Coord[] = [
  { x: 0, y: 3 },
  { x: 2, y: 1 },
  { x: 4, y: 3 },
  { x: 4, y: 1 },
  { x: 2, y: 5 },
]

// Tile dimensions for 2.5D isometric view
const TILE_W = 54
const TILE_H = 27
const CANVAS_W = 440
const CANVAS_H = 400

// Colors
const FOG_COLOR = '#2A2A3E'
const REVEALED_LIGHT = '#D4E8D0'
const REVEALED_DARK = '#C2D9BE'
const PHOTO_BLUE = '#3B82F6'
const PHOTO_DEVELOPED = '#22C55E'
const DRONE_BLUE = '#3B82F6'
const SHADOW_COLOR = 'rgba(0,0,0,0.15)'

// ---------------------------------------------------------------------------
// Isometric coordinate helpers
// ---------------------------------------------------------------------------

function gridToIso(gx: number, gy: number): { x: number; y: number } {
  const isoX = (gx - gy) * (TILE_W / 2) + CANVAS_W / 2
  const isoY = (gx + gy) * (TILE_H / 2) + 50
  return { x: isoX, y: isoY }
}

// ---------------------------------------------------------------------------
// Canvas rendering functions
// ---------------------------------------------------------------------------

function drawGrid(
  ctx: CanvasRenderingContext2D,
  revealed: Set<string>,
  visitedPhotos: Set<string>,
) {
  for (let gy = 0; gy < GRID_SIZE; gy++) {
    for (let gx = 0; gx < GRID_SIZE; gx++) {
      const { x, y } = gridToIso(gx, gy)
      const key = `${gx},${gy}`
      const isRevealed = revealed.has(key)
      const isPhoto = PHOTO_POINTS.some(p => p.x === gx && p.y === gy)
      const isPhotoVisited = visitedPhotos.has(key)

      // Draw diamond-shaped tile
      ctx.beginPath()
      ctx.moveTo(x, y - TILE_H / 2)
      ctx.lineTo(x + TILE_W / 2, y)
      ctx.lineTo(x, y + TILE_H / 2)
      ctx.lineTo(x - TILE_W / 2, y)
      ctx.closePath()

      if (!isRevealed) {
        // Fog of war
        ctx.fillStyle = FOG_COLOR
      } else if (isPhoto && isPhotoVisited) {
        // Developed photo — green
        ctx.fillStyle = PHOTO_DEVELOPED + '44'
      } else if (isPhoto) {
        // Photo point — blue
        ctx.fillStyle = PHOTO_BLUE + '33'
      } else {
        const isEven = (gx + gy) % 2 === 0
        ctx.fillStyle = isEven ? REVEALED_LIGHT : REVEALED_DARK
      }
      ctx.fill()

      // Border
      if (isPhoto && !isPhotoVisited) {
        ctx.strokeStyle = PHOTO_BLUE
        ctx.lineWidth = 2
      } else if (isPhoto && isPhotoVisited) {
        ctx.strokeStyle = PHOTO_DEVELOPED
        ctx.lineWidth = 2
      } else {
        ctx.strokeStyle = isRevealed ? '#A8C4A0' : '#3A3A52'
        ctx.lineWidth = 1
      }
      ctx.stroke()

      // Photo icon on unvisited photo points (camera emoji substitute)
      if (isPhoto && isRevealed && !isPhotoVisited) {
        ctx.fillStyle = PHOTO_BLUE
        ctx.beginPath()
        ctx.arc(x, y, 6, 0, Math.PI * 2)
        ctx.fill()
        // Small camera icon
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 8px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('\u{1F4F7}', x, y)
      }

      // Checkmark on visited photo points
      if (isPhoto && isPhotoVisited) {
        ctx.fillStyle = PHOTO_DEVELOPED
        ctx.beginPath()
        ctx.arc(x, y, 7, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 10px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('\u2713', x, y)
      }
    }
  }
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

  // Propellers
  const propPositions = [
    { dx: -12, dy: -8 }, { dx: 12, dy: -8 },
    { dx: -12, dy: 8 }, { dx: 12, dy: 8 },
  ]
  for (const prop of propPositions) {
    const px = screenX + prop.dx
    const py = dy + prop.dy
    ctx.strokeStyle = '#60A5FA'
    ctx.lineWidth = 2
    const propAngle = time * 15
    ctx.beginPath()
    ctx.moveTo(px + Math.cos(propAngle) * 6, py + Math.sin(propAngle) * 3)
    ctx.lineTo(px - Math.cos(propAngle) * 6, py - Math.sin(propAngle) * 3)
    ctx.stroke()

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

interface DroneMission2Props {
  onComplete: (score: number, breakdown: Array<{ label: string; value: number; max: number }>) => void
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function DroneMission2({ onComplete }: DroneMission2Props) {
  const t = useTranslations('game')
  const canvasLabelsRef = useRef({ photos: 'Photos' })
  canvasLabelsRef.current.photos = t('droneMission2.canvasPhotos')

  const [running, setRunning] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [failed, setFailed] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  // Track which cells have been revealed (fog of war) and which photos visited
  const revealedRef = useRef<Set<string>>(new Set([`${START_POS.x},${START_POS.y}`]))
  const visitedPhotosRef = useRef<Set<string>>(new Set())

  // Animation state stored in refs for canvas rendering
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
        ctx.fillStyle = '#1a1a2e'
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

        drawGrid(ctx, revealedRef.current, visitedPhotosRef.current)

        const drone = droneRef.current
        const isoPos = gridToIso(drone.x, drone.y)
        drawDrone(ctx, isoPos.x, isoPos.y, drone.dir, timeRef.current, drone.airborne)

        // Draw photo counter
        const visited = visitedPhotosRef.current.size
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 14px sans-serif'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.fillText(`${canvasLabelsRef.current.photos}: ${visited}/${PHOTO_POINTS.length}`, 10, 10)

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

  // Canvas ref callback
  const canvasReady = useCallback((canvas: HTMLCanvasElement | null) => {
    canvasCtxRef.current = null
    canvasElRef.current = null
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvasElRef.current = canvas
    canvasCtxRef.current = ctx
  }, [])

  // Animate drone through steps, revealing cells and checking photo points
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

        // Reveal cell and check photo point
        const key = `${endX},${endY}`
        revealedRef.current = new Set(revealedRef.current).add(key)
        if (PHOTO_POINTS.some(p => p.x === endX && p.y === endY)) {
          visitedPhotosRef.current = new Set(visitedPhotosRef.current).add(key)
        }
      } else if (step.action === 'turn') {
        droneRef.current = { ...droneRef.current, dir: step.direction }
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

    // Reset state
    droneRef.current = { x: START_POS.x, y: START_POS.y, dir: START_DIR, airborne: false }
    revealedRef.current = new Set([`${START_POS.x},${START_POS.y}`])
    visitedPhotosRef.current = new Set()

    const result = executeDroneProgram(program, GRID_SIZE, START_POS, START_DIR)

    if (!result.success) {
      await animateSteps(result.steps)
      setRunning(false)
      setFailed(true)
      setStatusMessage(t('droneMission2.offGrid'))
      return
    }

    await animateSteps(result.steps)

    // Check how many photo points were visited
    const pointsVisited = visitedPhotosRef.current.size
    const allVisited = pointsVisited === PHOTO_POINTS.length

    if (allVisited) {
      const blocksUsed = countBlocks(program)
      const redundant = hasRedundantBlocks(program)

      const correctness = 500 // all points visited
      const efficiency = Math.round(Math.max(0, 1 - (blocksUsed / OPTIMAL_BLOCKS - 1)) * 350)
      const style = redundant ? 0 : 150

      const totalScore = Math.min(MAX_SCORE, correctness + efficiency + style)

      // Confetti at center of canvas
      confettiRef.current = createConfetti(CANVAS_W / 2, CANVAS_H / 2 - 30)

      setCompleted(true)
      setStatusMessage(t('droneMission2.success'))
      setRunning(false)

      await new Promise(r => setTimeout(r, 2000))

      onComplete(totalScore, [
        { label: t('droneMission2.scoreCorrectness'), value: correctness, max: 500 },
        { label: t('droneMission2.scoreEfficiency'), value: efficiency, max: 350 },
        { label: t('droneMission2.scoreStyle'), value: style, max: 150 },
      ])
    } else {
      // Partial success — score based on how many points visited
      const correctness = Math.round(500 * (pointsVisited / PHOTO_POINTS.length))

      setRunning(false)
      setFailed(true)
      setStatusMessage(
        t('droneMission2.partialSuccess', { visited: pointsVisited, total: PHOTO_POINTS.length })
      )
    }
  }, [running, t, onComplete, animateSteps])

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left: Game Canvas */}
      <div className="flex-shrink-0">
        <p className="text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">
          {t('droneMission2.simulationGrid')}
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
            <span className="w-3 h-3 rounded-sm bg-blue-500/50" /> {t('droneMission2.legendDrone')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-blue-500/30 border border-blue-500" /> {t('droneMission2.legendPhoto')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-green-500/40 border border-green-500" /> {t('droneMission2.legendDeveloped')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: FOG_COLOR }} /> {t('droneMission2.legendFog')}
          </span>
        </div>
      </div>

      {/* Right: Block Editor */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">
          {t('droneMission2.yourProgram')}
        </p>
        <BlockEditor
          maxBlocks={MAX_BLOCKS}
          onRun={handleRun}
          disabled={completed}
          running={running}
        />
        <p className="text-xs text-gray-500 mt-3">
          {t('droneMission2.tip')}
        </p>
      </div>
    </div>
  )
}
