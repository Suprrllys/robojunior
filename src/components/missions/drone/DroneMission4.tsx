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

const GRID_SIZE = 7
const START_POS: Coord = { x: 0, y: 6 }
const TARGET_POS: Coord = { x: 6, y: 0 }
const START_DIR: Direction = 'N'
const OPTIMAL_BLOCKS = 10
const MAX_BLOCKS = 16
const MOVE_DURATION = 450
const MAX_SCORE = 1000

// Wind cycles through N, E, S, W every 4 moves
const WIND_CYCLE: Direction[] = ['N', 'E', 'S', 'W']
const WIND_DELTA: Record<Direction, Coord> = {
  N: { x: 0, y: -1 },
  E: { x: 1, y: 0 },
  S: { x: 0, y: 1 },
  W: { x: -1, y: 0 },
}

// Tile dimensions for 2.5D isometric view
const TILE_W = 46
const TILE_H = 23
const CANVAS_W = 480
const CANVAS_H = 430

// Colors
const SAND_LIGHT = '#D4C8A0'
const SAND_DARK = '#C4B890'
const SAND_BORDER = '#B4A870'
const STORM_BG = '#1A1510'
const DRONE_BLUE = '#3B82F6'
const SHADOW_COLOR = 'rgba(0,0,0,0.2)'
const TARGET_GREEN = '#22C55E'

// ---------------------------------------------------------------------------
// Sand particle system
// ---------------------------------------------------------------------------

interface SandParticle {
  x: number; y: number; vx: number; vy: number
  size: number; alpha: number
}

function createSandParticles(windDir: Direction, count: number = 80): SandParticle[] {
  const particles: SandParticle[] = []
  const delta = WIND_DELTA[windDir]
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * CANVAS_W,
      y: Math.random() * CANVAS_H,
      vx: delta.x * (2 + Math.random() * 3),
      vy: delta.y * (2 + Math.random() * 3),
      size: 1 + Math.random() * 2,
      alpha: 0.2 + Math.random() * 0.4,
    })
  }
  return particles
}

function updateSandParticles(particles: SandParticle[], windDir: Direction): SandParticle[] {
  const delta = WIND_DELTA[windDir]
  return particles.map(p => {
    let nx = p.x + p.vx
    let ny = p.y + p.vy
    // Wrap around screen
    if (nx < 0) nx = CANVAS_W
    if (nx > CANVAS_W) nx = 0
    if (ny < 0) ny = CANVAS_H
    if (ny > CANVAS_H) ny = 0
    return {
      ...p,
      x: nx, y: ny,
      vx: delta.x * (2 + Math.random() * 3),
      vy: delta.y * (2 + Math.random() * 3),
    }
  })
}

function drawSandParticles(ctx: CanvasRenderingContext2D, particles: SandParticle[]) {
  for (const p of particles) {
    ctx.fillStyle = `rgba(210, 190, 140, ${p.alpha})`
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fill()
  }
}

// ---------------------------------------------------------------------------
// Isometric helpers
// ---------------------------------------------------------------------------

function gridToIso(gx: number, gy: number): { x: number; y: number } {
  const isoX = (gx - gy) * (TILE_W / 2) + CANVAS_W / 2
  const isoY = (gx + gy) * (TILE_H / 2) + 50
  return { x: isoX, y: isoY }
}

// ---------------------------------------------------------------------------
// Canvas rendering
// ---------------------------------------------------------------------------

function drawGrid(ctx: CanvasRenderingContext2D) {
  for (let gy = 0; gy < GRID_SIZE; gy++) {
    for (let gx = 0; gx < GRID_SIZE; gx++) {
      const { x, y } = gridToIso(gx, gy)
      const isTarget = gx === TARGET_POS.x && gy === TARGET_POS.y
      const isStart = gx === START_POS.x && gy === START_POS.y
      const isEven = (gx + gy) % 2 === 0

      ctx.beginPath()
      ctx.moveTo(x, y - TILE_H / 2)
      ctx.lineTo(x + TILE_W / 2, y)
      ctx.lineTo(x, y + TILE_H / 2)
      ctx.lineTo(x - TILE_W / 2, y)
      ctx.closePath()

      ctx.fillStyle = isTarget
        ? `${TARGET_GREEN}33`
        : isStart
        ? '#60A5FA22'
        : isEven ? SAND_LIGHT : SAND_DARK
      ctx.fill()
      ctx.strokeStyle = isTarget ? TARGET_GREEN : SAND_BORDER
      ctx.lineWidth = isTarget ? 2 : 1
      ctx.stroke()

      // Medicine package icon on target
      if (isTarget) {
        ctx.fillStyle = TARGET_GREEN
        ctx.font = 'bold 14px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('+', x, y - 2)
        // Cross for medicine
        ctx.strokeStyle = TARGET_GREEN
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x - 5, y)
        ctx.lineTo(x + 5, y)
        ctx.moveTo(x, y - 5)
        ctx.lineTo(x, y + 5)
        ctx.stroke()
      }

      if (isStart) {
        ctx.fillStyle = '#60A5FA88'
        ctx.beginPath()
        ctx.arc(x, y, 5, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
}

function drawWindIndicator(ctx: CanvasRenderingContext2D, windDir: Direction, windLabel = 'WIND') {
  const cx = CANVAS_W - 45
  const cy = 40
  const r = 22

  // Background circle
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.beginPath()
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#D4B870'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()

  // Wind direction arrow
  const angles: Record<Direction, number> = {
    N: -Math.PI / 2, E: 0, S: Math.PI / 2, W: Math.PI,
  }
  const angle = angles[windDir]
  const arrowLen = 16

  ctx.strokeStyle = '#F59E0B'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx + Math.cos(angle) * arrowLen, cy + Math.sin(angle) * arrowLen)
  ctx.stroke()

  // Arrowhead
  ctx.fillStyle = '#F59E0B'
  ctx.beginPath()
  const tipX = cx + Math.cos(angle) * arrowLen
  const tipY = cy + Math.sin(angle) * arrowLen
  ctx.moveTo(tipX, tipY)
  ctx.lineTo(tipX + Math.cos(angle + 2.5) * 7, tipY + Math.sin(angle + 2.5) * 7)
  ctx.lineTo(tipX + Math.cos(angle - 2.5) * 7, tipY + Math.sin(angle - 2.5) * 7)
  ctx.closePath()
  ctx.fill()

  // Label
  ctx.fillStyle = '#D4B870'
  ctx.font = 'bold 10px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(windLabel, cx, cy + r + 6)
  ctx.fillText(windDir, cx, cy - 6)
}

function drawDrone(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  direction: Direction,
  time: number,
  airborne: boolean,
  hasPackage: boolean,
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

  // Medicine package hanging below drone
  if (hasPackage) {
    ctx.fillStyle = '#EF4444'
    ctx.fillRect(screenX - 4, dy + bodyH / 2, 8, 6)
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(screenX - 2, dy + bodyH / 2 + 1)
    ctx.lineTo(screenX + 2, dy + bodyH / 2 + 1)
    ctx.moveTo(screenX, dy + bodyH / 2)
    ctx.lineTo(screenX, dy + bodyH / 2 + 4)
    ctx.stroke()
  }

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
// Code preview: convert blocks to JavaScript
// ---------------------------------------------------------------------------

function blocksToCode(commands: Command[]): string {
  const lines: string[] = []
  for (const cmd of commands) {
    switch (cmd.type) {
      case 'takeoff': lines.push('drone.takeoff();'); break
      case 'land': lines.push('drone.land();'); break
      case 'forward': lines.push(`drone.forward(${cmd.value ?? 1});`); break
      case 'turnLeft': lines.push('drone.turnLeft();'); break
      case 'turnRight': lines.push('drone.turnRight();'); break
      case 'repeat':
        lines.push(`for (let i = 0; i < ${cmd.value ?? 2}; i++) {`)
        if (cmd.children) {
          for (const child of cmd.children) {
            const childLine = blocksToCode([child])
            lines.push('  ' + childLine.trim())
          }
        }
        lines.push('}')
        break
    }
  }
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DroneMission4Props {
  onComplete: (score: number, breakdown: Array<{ label: string; value: number; max: number }>) => void
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function DroneMission4({ onComplete }: DroneMission4Props) {
  const t = useTranslations('game')
  const canvasLabelsRef = useRef({ wind: 'WIND', move: 'Move' })
  canvasLabelsRef.current.wind = t('droneMission4.canvasWind')
  canvasLabelsRef.current.move = t('droneMission4.canvasMove')

  const [running, setRunning] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [failed, setFailed] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [codePreview, setCodePreview] = useState('')
  const [currentProgram, setCurrentProgram] = useState<Command[]>([])

  // Animation state in refs
  const droneRef = useRef<{ x: number; y: number; dir: Direction; airborne: boolean }>({
    x: START_POS.x, y: START_POS.y, dir: START_DIR, airborne: false,
  })
  const windDirRef = useRef<Direction>('N')
  const moveCountRef = useRef(0)
  const sandParticlesRef = useRef<SandParticle[]>(createSandParticles('N'))
  const confettiRef = useRef<ConfettiParticle[]>([])
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
        ctx.fillStyle = STORM_BG
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

        drawGrid(ctx)

        const drone = droneRef.current
        const isoPos = gridToIso(drone.x, drone.y)
        const hasPackage = !(
          Math.round(drone.x) === TARGET_POS.x &&
          Math.round(drone.y) === TARGET_POS.y
        )
        drawDrone(ctx, isoPos.x, isoPos.y, drone.dir, timeRef.current, drone.airborne, hasPackage)

        // Sand particles
        sandParticlesRef.current = updateSandParticles(sandParticlesRef.current, windDirRef.current)
        drawSandParticles(ctx, sandParticlesRef.current)

        // Wind indicator
        drawWindIndicator(ctx, windDirRef.current, canvasLabelsRef.current.wind)

        // Move counter
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 12px sans-serif'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.fillText(`${canvasLabelsRef.current.move}: ${moveCountRef.current}`, 10, 10)

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

  // Execute program with wind simulation
  // Wind pushes the drone 1 cell after each move command
  const handleRun = useCallback(async (program: Command[]) => {
    if (running) return
    setRunning(true)
    setFailed(false)
    setCompleted(false)
    setStatusMessage('')
    setCurrentProgram(program)
    setCodePreview(blocksToCode(program))

    // Reset
    droneRef.current = { x: START_POS.x, y: START_POS.y, dir: START_DIR, airborne: false }
    moveCountRef.current = 0
    windDirRef.current = WIND_CYCLE[0]
    sandParticlesRef.current = createSandParticles(WIND_CYCLE[0])

    // Get execution steps from engine
    const result = executeDroneProgram(program, GRID_SIZE, START_POS, START_DIR)

    // Simulate with wind applied after each move
    let posX = START_POS.x
    let posY = START_POS.y
    let dir: Direction = START_DIR
    let airborne = false
    let moveIndex = 0

    for (let i = 1; i < result.steps.length; i++) {
      const step = result.steps[i]

      if (step.action === 'takeoff') {
        airborne = true
        droneRef.current = { x: posX, y: posY, dir, airborne: true }
        await new Promise(r => setTimeout(r, 300))
        continue
      }

      if (step.action === 'land') {
        airborne = false
        droneRef.current = { x: posX, y: posY, dir, airborne: false }
        await new Promise(r => setTimeout(r, 300))
        continue
      }

      if (step.action === 'turn') {
        dir = step.direction
        droneRef.current = { x: posX, y: posY, dir, airborne }
        await new Promise(r => setTimeout(r, 200))
        continue
      }

      if (step.action === 'move') {
        // Animate move to intended position
        const targetX = step.position.x
        const targetY = step.position.y

        // Check bounds before moving
        if (targetX < 0 || targetX >= GRID_SIZE || targetY < 0 || targetY >= GRID_SIZE) {
          setRunning(false)
          setFailed(true)
          setStatusMessage(t('droneMission4.offGrid'))
          return
        }

        // Smooth animation to target
        const startX = posX
        const startY = posY
        const frames = Math.round(MOVE_DURATION / 16)
        for (let f = 0; f <= frames; f++) {
          const progress = f / frames
          const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2
          droneRef.current = {
            x: startX + (targetX - startX) * ease,
            y: startY + (targetY - startY) * ease,
            dir: step.direction,
            airborne: true,
          }
          await new Promise(r => setTimeout(r, 16))
        }
        posX = targetX
        posY = targetY
        dir = step.direction

        // Apply wind push
        if (airborne) {
          const windDir = WIND_CYCLE[moveIndex % WIND_CYCLE.length]
          windDirRef.current = windDir
          sandParticlesRef.current = createSandParticles(windDir)

          const windDelta = WIND_DELTA[windDir]
          const windX = posX + windDelta.x
          const windY = posY + windDelta.y

          // Check if wind pushes off grid
          if (windX < 0 || windX >= GRID_SIZE || windY < 0 || windY >= GRID_SIZE) {
            setRunning(false)
            setFailed(true)
            setStatusMessage(t('droneMission4.blownOffGrid'))
            return
          }

          // Animate wind push
          const ws = posX
          const we = windX
          const wsy = posY
          const wey = windY
          const windFrames = Math.round(200 / 16)
          for (let f = 0; f <= windFrames; f++) {
            const progress = f / windFrames
            const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2
            droneRef.current = {
              x: ws + (we - ws) * ease,
              y: wsy + (wey - wsy) * ease,
              dir,
              airborne: true,
            }
            await new Promise(r => setTimeout(r, 16))
          }
          posX = windX
          posY = windY
          moveIndex++
          moveCountRef.current = moveIndex

          // Update wind for next move
          windDirRef.current = WIND_CYCLE[moveIndex % WIND_CYCLE.length]
          sandParticlesRef.current = createSandParticles(WIND_CYCLE[moveIndex % WIND_CYCLE.length])
        }
      }
    }

    // Check if reached target
    const reached = Math.round(posX) === TARGET_POS.x && Math.round(posY) === TARGET_POS.y

    if (reached) {
      const blocksUsed = countBlocks(program)
      const correctness = 500
      const efficiency = Math.round(Math.max(0, 1 - (blocksUsed / OPTIMAL_BLOCKS - 1)) * 350)
      const style = hasRedundantBlocks(program) ? 0 : 150

      const totalScore = Math.min(MAX_SCORE, correctness + efficiency + style)

      const isoTarget = gridToIso(TARGET_POS.x, TARGET_POS.y)
      confettiRef.current = createConfetti(isoTarget.x, isoTarget.y - 20)

      setCompleted(true)
      setStatusMessage(t('droneMission4.success'))
      setRunning(false)

      await new Promise(r => setTimeout(r, 2000))

      onComplete(totalScore, [
        { label: t('droneMission4.scoreCorrectness'), value: correctness, max: 500 },
        { label: t('droneMission4.scoreEfficiency'), value: efficiency, max: 350 },
        { label: t('droneMission4.scoreStyle'), value: style, max: 150 },
      ])
    } else {
      setRunning(false)
      setFailed(true)
      setStatusMessage(t('droneMission4.didNotReach'))
    }
  }, [running, t, onComplete])

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left: Game Canvas */}
      <div className="flex-shrink-0">
        <p className="text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">
          {t('droneMission4.simulationGrid')}
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
            <span className="w-3 h-3 rounded-sm bg-blue-500/50" /> {t('droneMission4.legendDrone')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-green-500/40" /> {t('droneMission4.legendTarget')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-yellow-500/40" /> {t('droneMission4.legendWind')}
          </span>
        </div>

        {/* Code preview */}
        {codePreview && (
          <div className="mt-4">
            <p className="text-xs text-gray-400 mb-1 uppercase font-bold tracking-wider">
              {t('droneMission4.codePreview')}
            </p>
            <pre className="bg-gray-950 border border-gray-700 rounded-lg p-3 text-xs text-green-400 font-mono overflow-x-auto max-h-[200px]">
              {codePreview}
            </pre>
          </div>
        )}
      </div>

      {/* Right: Block Editor */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">
          {t('droneMission4.yourProgram')}
        </p>
        <BlockEditor
          maxBlocks={MAX_BLOCKS}
          onRun={handleRun}
          disabled={completed}
          running={running}
        />
        <p className="text-xs text-gray-500 mt-3">
          {t('droneMission4.tip')}
        </p>
      </div>
    </div>
  )
}
