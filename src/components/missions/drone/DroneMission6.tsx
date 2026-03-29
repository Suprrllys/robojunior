'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import clsx from 'clsx'
import SimpleCodeEditor from './SimpleCodeEditor'
import { executeMazeCode, type MazeState } from './code-runner'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GRID_SIZE = 10
const START_POS = { x: 0, y: 0 }
const START_DIR: 'N' | 'E' | 'S' | 'W' = 'E'
const EXIT_POS = { x: 9, y: 9 }
const OPTIMAL_STEPS = 30
const MAX_SCORE = 1000
const MOVE_DURATION = 150

// Maze walls — blocked cells
const WALL_CELLS = [
  // Outer walls are implicit (grid boundary)
  // Internal maze walls
  '2,0', '2,1', '2,2',
  '4,1', '4,2', '4,3', '4,4',
  '1,4', '2,4',
  '6,0', '6,1', '6,2', '6,3',
  '8,1', '8,2',
  '0,6', '1,6', '2,6',
  '3,5', '3,6',
  '5,5', '5,6', '5,7',
  '7,4', '7,5', '7,6',
  '9,5', '9,6',
  '1,8', '2,8', '3,8',
  '5,9',
  '7,8', '7,9',
  '6,7',
  '8,7',
  '4,7',
  '9,3',
]

const WALLS = new Set(WALL_CELLS)

// Canvas
const CELL_SIZE = 36
const CANVAS_W = GRID_SIZE * CELL_SIZE + 20
const CANVAS_H = GRID_SIZE * CELL_SIZE + 20
const OFFSET_X = 10
const OFFSET_Y = 10

// Colors
const BG_COLOR = '#0A0E1A'
const FLOOR_COLOR = '#1A2030'
const WALL_COLOR = '#3A2040'
const WALL_SIDE_COLOR = '#2A1030'
const WALL_TOP_COLOR = '#5A3060'
const WALL_BORDER = '#6A3070'
const PATH_COLOR = 'rgba(59, 130, 246, 0.25)'
const DRONE_COLOR = '#3B82F6'
const EXIT_COLOR = '#22C55E'
const LASER_COLOR = '#EF4444'
const START_COLOR = '#60A5FA'
const WALL_HEIGHT = 6 // px of visible "side" for 3D walls

// ---------------------------------------------------------------------------
// Dust particles (ambient floating specks)
// ---------------------------------------------------------------------------

interface DustParticle {
  x: number; y: number; vx: number; vy: number; alpha: number; size: number
}

function createDustParticles(count: number): DustParticle[] {
  const particles: DustParticle[] = []
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * CANVAS_W,
      y: Math.random() * CANVAS_H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.2 - 0.1,
      alpha: 0.15 + Math.random() * 0.25,
      size: 0.8 + Math.random() * 1.2,
    })
  }
  return particles
}

function updateDustParticles(particles: DustParticle[]): void {
  for (const p of particles) {
    p.x += p.vx
    p.y += p.vy
    if (p.x < 0) p.x = CANVAS_W
    if (p.x > CANVAS_W) p.x = 0
    if (p.y < 0) p.y = CANVAS_H
    if (p.y > CANVAS_H) p.y = 0
  }
}

function drawDustParticles(ctx: CanvasRenderingContext2D, particles: DustParticle[]) {
  for (const p of particles) {
    ctx.globalAlpha = p.alpha
    ctx.fillStyle = '#8899BB'
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

const STARTER_CODE_EN = `// MISSION: Navigate the drone through the maze to EXIT
//
// Available commands:
//   drone.forward(1)        - move 1 cell forward
//   drone.turnLeft()        - turn left 90 degrees
//   drone.turnRight()       - turn right 90 degrees
//   drone.seeWall("front")  - returns true if wall ahead
//   drone.seeWall("right")  - returns true if wall on right
//   drone.seeWall("left")   - returns true if wall on left
//   drone.atExit()          - returns true if at the exit
//
// STRATEGY: Use the "right-hand rule"
// 1. If no wall on right -> turn right and go forward
// 2. If no wall ahead -> go forward
// 3. Otherwise -> turn left
//
// Use while (!drone.atExit()) { ... } to keep going
// Use if/else to check walls and decide direction

// Write your code below:
while (!drone.atExit()) {
  // Check walls and move - fill in the logic!
}
`

const STARTER_CODE_RU = `// МИССИЯ: Проведи дрон через лабиринт к ВЫХОДУ
//
// Доступные команды:
//   drone.forward(1)        - двигаться на 1 клетку вперёд
//   drone.turnLeft()        - повернуть налево на 90 градусов
//   drone.turnRight()       - повернуть направо на 90 градусов
//   drone.seeWall("front")  - возвращает true если стена впереди
//   drone.seeWall("right")  - возвращает true если стена справа
//   drone.seeWall("left")   - возвращает true если стена слева
//   drone.atExit()          - возвращает true если на выходе
//
// СТРАТЕГИЯ: Используй "правило правой руки"
// 1. Если справа нет стены -> поверни направо и иди вперёд
// 2. Если впереди нет стены -> иди вперёд
// 3. Иначе -> поверни налево
//
// Используй while (!drone.atExit()) { ... } для продолжения движения
// Используй if/else для проверки стен и выбора направления

// Напиши свой код ниже:
while (!drone.atExit()) {
  // Проверяй стены и двигайся — заполни логику!
}
`

const STARTER_CODE_AR = `// المهمة: قُد الطائرة عبر المتاهة إلى المخرج
//
// الأوامر المتاحة:
//   drone.forward(1)        - التحرك خلية واحدة للأمام
//   drone.turnLeft()        - الانعطاف يساراً 90 درجة
//   drone.turnRight()       - الانعطاف يميناً 90 درجة
//   drone.seeWall("front")  - ترجع true إذا كان هناك جدار أمامك
//   drone.seeWall("right")  - ترجع true إذا كان هناك جدار على اليمين
//   drone.seeWall("left")   - ترجع true إذا كان هناك جدار على اليسار
//   drone.atExit()          - ترجع true إذا كنت عند المخرج
//
// الاستراتيجية: استخدم "قاعدة اليد اليمنى"
// 1. إذا لا يوجد جدار على اليمين -> انعطف يميناً وتقدم
// 2. إذا لا يوجد جدار أمامك -> تقدم
// 3. وإلا -> انعطف يساراً
//
// استخدم while (!drone.atExit()) { ... } للاستمرار بالحركة
// استخدم if/else لفحص الجدران واختيار الاتجاه

// اكتب الكود الخاص بك أدناه:
while (!drone.atExit()) {
  // افحص الجدران وتحرك — أكمل المنطق!
}
`

// ---------------------------------------------------------------------------
// Canvas rendering
// ---------------------------------------------------------------------------

type Dir = 'N' | 'E' | 'S' | 'W'

function drawMaze(
  ctx: CanvasRenderingContext2D,
  path: Set<string>,
  droneX: number,
  droneY: number,
  droneDir: Dir,
  wallHits: Array<{ x: number; y: number; t?: number }>,
  time: number,
  dustParticles: DustParticle[],
) {
  // Background
  ctx.fillStyle = BG_COLOR
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // Draw cells — first pass: floors only
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const key = `${x},${y}`
      const px = OFFSET_X + x * CELL_SIZE
      const py = OFFSET_Y + y * CELL_SIZE

      const isWall = WALLS.has(key)
      const isPath = path.has(key)
      const isStart = x === START_POS.x && y === START_POS.y
      const isExit = x === EXIT_POS.x && y === EXIT_POS.y

      if (!isWall) {
        // Floor tile with subtle gradient
        const floorGrad = ctx.createLinearGradient(px, py, px + CELL_SIZE, py + CELL_SIZE)
        floorGrad.addColorStop(0, FLOOR_COLOR)
        floorGrad.addColorStop(1, '#161C2A')
        ctx.fillStyle = floorGrad
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE)

        // Subtle grid lines on floor
        ctx.strokeStyle = '#1E2840'
        ctx.lineWidth = 0.5
        ctx.strokeRect(px + 0.5, py + 0.5, CELL_SIZE - 1, CELL_SIZE - 1)

        // Small cross pattern in center of floor tile
        ctx.strokeStyle = '#1A2438'
        ctx.lineWidth = 0.3
        ctx.beginPath()
        const cx = px + CELL_SIZE / 2
        const cy = py + CELL_SIZE / 2
        ctx.moveTo(cx - 3, cy)
        ctx.lineTo(cx + 3, cy)
        ctx.moveTo(cx, cy - 3)
        ctx.lineTo(cx, cy + 3)
        ctx.stroke()

        // Path glow trail
        if (isPath) {
          ctx.fillStyle = PATH_COLOR
          ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE)
          // Extra glow ring in center of path cell
          const pathGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, CELL_SIZE / 2)
          pathGlow.addColorStop(0, 'rgba(59, 130, 246, 0.18)')
          pathGlow.addColorStop(1, 'rgba(59, 130, 246, 0)')
          ctx.fillStyle = pathGlow
          ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE)
        }
      }

      // Start marker
      if (isStart) {
        ctx.fillStyle = START_COLOR + '44'
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE)
        ctx.fillStyle = START_COLOR
        ctx.font = 'bold 10px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('S', px + CELL_SIZE / 2, py + CELL_SIZE / 2)
      }

      // Exit marker — enhanced pulsing glow ring
      if (isExit) {
        const pulse = 0.5 + Math.sin(time * 4) * 0.3
        const ringPulse = 0.6 + Math.sin(time * 3) * 0.4
        const ecx = px + CELL_SIZE / 2
        const ecy = py + CELL_SIZE / 2

        // Outer glow
        const exitGlow = ctx.createRadialGradient(ecx, ecy, CELL_SIZE * 0.2, ecx, ecy, CELL_SIZE * 0.8)
        exitGlow.addColorStop(0, `rgba(34, 197, 94, ${pulse * 0.35})`)
        exitGlow.addColorStop(1, 'rgba(34, 197, 94, 0)')
        ctx.fillStyle = exitGlow
        ctx.beginPath()
        ctx.arc(ecx, ecy, CELL_SIZE * 0.8, 0, Math.PI * 2)
        ctx.fill()

        // Background fill
        ctx.fillStyle = `rgba(34, 197, 94, ${pulse * 0.2})`
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE)

        // Pulsing ring
        ctx.strokeStyle = `rgba(34, 197, 94, ${ringPulse * 0.7})`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(ecx, ecy, CELL_SIZE / 2 - 2 + Math.sin(time * 5) * 2, 0, Math.PI * 2)
        ctx.stroke()

        // Second ring (offset phase)
        ctx.strokeStyle = `rgba(34, 197, 94, ${(1 - ringPulse) * 0.4})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(ecx, ecy, CELL_SIZE / 2 + 2 + Math.sin(time * 5 + 1.5) * 3, 0, Math.PI * 2)
        ctx.stroke()

        // Border
        ctx.strokeStyle = EXIT_COLOR
        ctx.lineWidth = 2
        ctx.strokeRect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4)

        // Text
        ctx.fillStyle = EXIT_COLOR
        ctx.font = 'bold 10px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(canvasLabelsRef.current.exit, ecx, ecy)
      }
    }
  }

  // Draw cells — second pass: 3D walls (drawn after floors so sides overlap correctly)
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const key = `${x},${y}`
      if (!WALLS.has(key)) continue

      const px = OFFSET_X + x * CELL_SIZE
      const py = OFFSET_Y + y * CELL_SIZE

      // Wall side face (bottom) — gives 3D depth
      ctx.fillStyle = WALL_SIDE_COLOR
      ctx.fillRect(px, py + CELL_SIZE, CELL_SIZE, WALL_HEIGHT)
      // Side face right edge
      ctx.fillStyle = '#251030'
      ctx.beginPath()
      ctx.moveTo(px + CELL_SIZE, py + CELL_SIZE)
      ctx.lineTo(px + CELL_SIZE + 3, py + CELL_SIZE + 3)
      ctx.lineTo(px + CELL_SIZE + 3, py + CELL_SIZE + WALL_HEIGHT + 3)
      ctx.lineTo(px + CELL_SIZE, py + CELL_SIZE + WALL_HEIGHT)
      ctx.closePath()
      ctx.fill()

      // Wall top face
      ctx.fillStyle = WALL_COLOR
      ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE)

      // Top highlight (slight lighter bar at the top edge)
      const topGrad = ctx.createLinearGradient(px, py, px, py + 8)
      topGrad.addColorStop(0, WALL_TOP_COLOR + 'AA')
      topGrad.addColorStop(1, WALL_COLOR)
      ctx.fillStyle = topGrad
      ctx.fillRect(px, py, CELL_SIZE, 8)

      // Wall border
      ctx.strokeStyle = WALL_BORDER
      ctx.lineWidth = 1
      ctx.strokeRect(px + 0.5, py + 0.5, CELL_SIZE - 1, CELL_SIZE - 1)

      // Brick-like pattern
      ctx.strokeStyle = WALL_BORDER + '44'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(px, py + CELL_SIZE / 2)
      ctx.lineTo(px + CELL_SIZE, py + CELL_SIZE / 2)
      ctx.moveTo(px + CELL_SIZE / 2, py)
      ctx.lineTo(px + CELL_SIZE / 2, py + CELL_SIZE / 3)
      ctx.moveTo(px + CELL_SIZE / 2, py + CELL_SIZE * 2 / 3)
      ctx.lineTo(px + CELL_SIZE / 2, py + CELL_SIZE)
      ctx.stroke()
    }
  }

  // Draw wall hit effects — red ripple/shockwave
  for (const hit of wallHits) {
    const px = OFFSET_X + hit.x * CELL_SIZE + CELL_SIZE / 2
    const py = OFFSET_Y + hit.y * CELL_SIZE + CELL_SIZE / 2
    const hitAge = hit.t !== undefined ? time - hit.t : 0
    const rippleProgress = Math.min(hitAge * 4, 1) // 0->1 over ~0.25s
    const rippleAlpha = Math.max(0, 1 - rippleProgress)

    // Expanding ripple ring 1
    ctx.strokeStyle = `rgba(239, 68, 68, ${rippleAlpha * 0.7})`
    ctx.lineWidth = 2.5 - rippleProgress * 2
    ctx.beginPath()
    ctx.arc(px, py, 4 + rippleProgress * CELL_SIZE * 0.6, 0, Math.PI * 2)
    ctx.stroke()

    // Expanding ripple ring 2 (delayed)
    const rp2 = Math.max(0, Math.min((hitAge - 0.06) * 4, 1))
    const ra2 = Math.max(0, 1 - rp2)
    if (rp2 > 0) {
      ctx.strokeStyle = `rgba(239, 68, 68, ${ra2 * 0.4})`
      ctx.lineWidth = 1.5 - rp2 * 1
      ctx.beginPath()
      ctx.arc(px, py, 2 + rp2 * CELL_SIZE * 0.7, 0, Math.PI * 2)
      ctx.stroke()
    }

    // Center flash glow
    const flashGrad = ctx.createRadialGradient(px, py, 0, px, py, CELL_SIZE * 0.3)
    flashGrad.addColorStop(0, `rgba(255, 100, 100, ${rippleAlpha * 0.5})`)
    flashGrad.addColorStop(1, 'rgba(239, 68, 68, 0)')
    ctx.fillStyle = flashGrad
    ctx.beginPath()
    ctx.arc(px, py, CELL_SIZE * 0.3, 0, Math.PI * 2)
    ctx.fill()

    // Red X (static)
    ctx.strokeStyle = `rgba(239, 68, 68, ${Math.max(rippleAlpha, 0.3)})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(px - 6, py - 6)
    ctx.lineTo(px + 6, py + 6)
    ctx.moveTo(px + 6, py - 6)
    ctx.lineTo(px - 6, py + 6)
    ctx.stroke()
  }

  // Draw drone
  const dpx = OFFSET_X + droneX * CELL_SIZE + CELL_SIZE / 2
  // Hover oscillation
  const hoverOffset = Math.sin(time * 5) * 1.5
  const dpy = OFFSET_Y + droneY * CELL_SIZE + CELL_SIZE / 2 + hoverOffset

  // Drone shadow on ground
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
  ctx.beginPath()
  ctx.ellipse(dpx + 1, OFFSET_Y + droneY * CELL_SIZE + CELL_SIZE / 2 + 3, 7, 3, 0, 0, Math.PI * 2)
  ctx.fill()

  // Drone glow
  const gradient = ctx.createRadialGradient(dpx, dpy, 2, dpx, dpy, CELL_SIZE / 2)
  gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)')
  gradient.addColorStop(1, 'rgba(59, 130, 246, 0)')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(dpx, dpy, CELL_SIZE / 2, 0, Math.PI * 2)
  ctx.fill()

  // Drone body — rectangular
  ctx.fillStyle = DRONE_COLOR
  ctx.save()
  const dirAngles: Record<Dir, number> = { N: -Math.PI / 2, E: 0, S: Math.PI / 2, W: Math.PI }
  const angle = dirAngles[droneDir]
  ctx.translate(dpx, dpy)
  ctx.rotate(angle)

  // Main body rectangle
  ctx.fillStyle = '#2563EB'
  ctx.fillRect(-5, -3, 10, 6)
  // Body highlight
  ctx.fillStyle = '#3B82F6'
  ctx.fillRect(-4, -3, 8, 2)
  // Body outline
  ctx.strokeStyle = '#60A5FA'
  ctx.lineWidth = 0.5
  ctx.strokeRect(-5, -3, 10, 6)

  // 4 propeller arms
  const propAngle = time * 20 // fast spin
  const armLen = 7
  const armPositions = [
    { ax: -4, ay: -3 }, // front-left
    { ax: 4, ay: -3 },  // front-right
    { ax: -4, ay: 3 },  // back-left
    { ax: 4, ay: 3 },   // back-right
  ]
  for (let i = 0; i < 4; i++) {
    const ap = armPositions[i]
    // Arm connection dot
    ctx.fillStyle = '#93C5FD'
    ctx.beginPath()
    ctx.arc(ap.ax, ap.ay, 1.2, 0, Math.PI * 2)
    ctx.fill()
    // Spinning propeller line
    const pAngle = propAngle + (i * Math.PI / 2)
    ctx.strokeStyle = 'rgba(147, 197, 253, 0.7)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(ap.ax + Math.cos(pAngle) * armLen, ap.ay + Math.sin(pAngle) * armLen)
    ctx.lineTo(ap.ax - Math.cos(pAngle) * armLen, ap.ay - Math.sin(pAngle) * armLen)
    ctx.stroke()
    // Second propeller blade (perpendicular)
    ctx.beginPath()
    ctx.moveTo(ap.ax + Math.cos(pAngle + Math.PI / 2) * armLen, ap.ay + Math.sin(pAngle + Math.PI / 2) * armLen)
    ctx.lineTo(ap.ax - Math.cos(pAngle + Math.PI / 2) * armLen, ap.ay - Math.sin(pAngle + Math.PI / 2) * armLen)
    ctx.stroke()
  }

  // Direction arrow (smaller, in drone-local space pointing "forward" = right)
  ctx.strokeStyle = '#F59E0B'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(5, 0)
  ctx.lineTo(9, 0)
  ctx.stroke()
  // Small arrowhead
  ctx.fillStyle = '#F59E0B'
  ctx.beginPath()
  ctx.moveTo(10, 0)
  ctx.lineTo(7, -2)
  ctx.lineTo(7, 2)
  ctx.closePath()
  ctx.fill()

  ctx.restore()

  // Sensor beams (front, left, right)
  drawSensorBeam(ctx, dpx, dpy, droneDir, 'front', droneX, droneY)
  drawSensorBeam(ctx, dpx, dpy, droneDir, 'left', droneX, droneY)
  drawSensorBeam(ctx, dpx, dpy, droneDir, 'right', droneX, droneY)

  // Draw dust particles
  updateDustParticles(dustParticles)
  drawDustParticles(ctx, dustParticles)
}

function drawSensorBeam(
  ctx: CanvasRenderingContext2D,
  dpx: number, dpy: number,
  dir: Dir, sensor: 'front' | 'left' | 'right',
  gx: number, gy: number,
) {
  const turnLeft: Record<Dir, Dir> = { N: 'W', W: 'S', S: 'E', E: 'N' }
  const turnRight: Record<Dir, Dir> = { N: 'E', E: 'S', S: 'W', W: 'N' }
  const dirAngles: Record<Dir, number> = { N: -Math.PI / 2, E: 0, S: Math.PI / 2, W: Math.PI }
  const delta: Record<Dir, { dx: number; dy: number }> = {
    N: { dx: 0, dy: -1 }, E: { dx: 1, dy: 0 }, S: { dx: 0, dy: 1 }, W: { dx: -1, dy: 0 },
  }

  let sensorDir = dir
  if (sensor === 'left') sensorDir = turnLeft[dir]
  if (sensor === 'right') sensorDir = turnRight[dir]

  const d = delta[sensorDir]
  const nx = gx + d.dx
  const ny = gy + d.dy
  const hasWall = nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE || WALLS.has(`${nx},${ny}`)

  const beamLen = CELL_SIZE * 0.7
  const angle = dirAngles[sensorDir]
  const endX = dpx + Math.cos(angle) * beamLen
  const endY = dpy + Math.sin(angle) * beamLen

  // Glow behind the beam
  ctx.strokeStyle = hasWall ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.08)'
  ctx.lineWidth = 4
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.moveTo(dpx, dpy)
  ctx.lineTo(endX, endY)
  ctx.stroke()

  // Main beam line
  ctx.strokeStyle = hasWall ? 'rgba(239, 68, 68, 0.5)' : 'rgba(34, 197, 94, 0.25)'
  ctx.lineWidth = 1
  ctx.setLineDash([3, 3])
  ctx.beginPath()
  ctx.moveTo(dpx, dpy)
  ctx.lineTo(endX, endY)
  ctx.stroke()
  ctx.setLineDash([])

  // Dot at end of beam
  const dotColor = hasWall ? 'rgba(239, 68, 68, 0.7)' : 'rgba(34, 197, 94, 0.4)'
  // Glow around dot
  const dotGlow = ctx.createRadialGradient(endX, endY, 0, endX, endY, 5)
  dotGlow.addColorStop(0, dotColor)
  dotGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = dotGlow
  ctx.beginPath()
  ctx.arc(endX, endY, 5, 0, Math.PI * 2)
  ctx.fill()
  // Solid dot center
  ctx.fillStyle = dotColor
  ctx.beginPath()
  ctx.arc(endX, endY, 2, 0, Math.PI * 2)
  ctx.fill()
}

// ---------------------------------------------------------------------------
// Confetti
// ---------------------------------------------------------------------------

interface ConfettiParticle {
  x: number; y: number; vx: number; vy: number
  color: string; rotation: number; rotSpeed: number; alpha: number
}

function createConfetti(cx: number, cy: number): ConfettiParticle[] {
  const colors = ['#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#A855F7', '#EC4899']
  const particles: ConfettiParticle[] = []
  for (let i = 0; i < 60; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 1 + Math.random() * 4
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.3, alpha: 1,
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

interface DroneMission6Props {
  onComplete: (score: number, breakdown: Array<{ label: string; value: number; max: number }>) => void
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function DroneMission6({ onComplete }: DroneMission6Props) {
  const t = useTranslations('game')
  const locale = useLocale()
  const starterCode = locale === 'ru' ? STARTER_CODE_RU : locale === 'ar' ? STARTER_CODE_AR : STARTER_CODE_EN
  const canvasLabelsRef = useRef({ exit: 'EXIT', steps: 'Steps', wallHits: 'Wall hits' })
  canvasLabelsRef.current.exit = t('droneMission6.canvasExit')
  canvasLabelsRef.current.steps = t('droneMission6.canvasSteps')
  canvasLabelsRef.current.wallHits = t('droneMission6.canvasWallHits')

  const [running, setRunning] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [codeError, setCodeError] = useState('')

  // Canvas state refs
  const droneRef = useRef<{ x: number; y: number; dir: Dir }>({
    x: START_POS.x, y: START_POS.y, dir: START_DIR,
  })
  const pathRef = useRef<Set<string>>(new Set([`${START_POS.x},${START_POS.y}`]))
  const wallHitsRef = useRef<Array<{ x: number; y: number; t?: number }>>([])
  const confettiRef = useRef<ConfettiParticle[]>([])
  const dustRef = useRef<DustParticle[]>(createDustParticles(15))
  const canvasCtxRef = useRef<CanvasRenderingContext2D | null>(null)
  const timeRef = useRef(0)
  const animFrameRef = useRef(0)
  const stepsDisplayRef = useRef(0)
  const wallHitCountRef = useRef(0)

  // Render loop
  useEffect(() => {
    let active = true
    const loop = () => {
      if (!active) return
      const ctx = canvasCtxRef.current
      if (ctx) {
        timeRef.current += 0.016
        const drone = droneRef.current
        drawMaze(ctx, pathRef.current, drone.x, drone.y, drone.dir, wallHitsRef.current, timeRef.current, dustRef.current)

        // HUD
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 12px sans-serif'
        ctx.textAlign = 'right'
        ctx.textBaseline = 'top'
        ctx.fillText(`${canvasLabelsRef.current.steps}: ${stepsDisplayRef.current}`, CANVAS_W - 10, 10)
        ctx.fillText(`${canvasLabelsRef.current.wallHits}: ${wallHitCountRef.current}`, CANVAS_W - 10, 26)

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

  // Animate the maze state path step by step
  const animatePath = useCallback(async (state: MazeState) => {
    for (let i = 1; i < state.path.length; i++) {
      const step = state.path[i]
      const prev = state.path[i - 1]

      if (step.action === 'move') {
        // Smooth interpolation
        const frames = Math.round(MOVE_DURATION / 16)
        for (let f = 0; f <= frames; f++) {
          const progress = f / frames
          const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2
          droneRef.current = {
            x: prev.x + (step.x - prev.x) * ease,
            y: prev.y + (step.y - prev.y) * ease,
            dir: step.dir,
          }
          await new Promise(r => setTimeout(r, 16))
        }
        pathRef.current = new Set(pathRef.current).add(`${step.x},${step.y}`)
        stepsDisplayRef.current = i
      } else if (step.action === 'turn') {
        droneRef.current = { x: step.x, y: step.y, dir: step.dir }
        await new Promise(r => setTimeout(r, 80))
      } else if (step.action === 'wall_hit') {
        wallHitsRef.current = [...wallHitsRef.current, { x: step.x, y: step.y, t: timeRef.current }]
        wallHitCountRef.current++
        // Flash effect
        await new Promise(r => setTimeout(r, 200))
        // Remove flash after a moment
        setTimeout(() => {
          wallHitsRef.current = wallHitsRef.current.slice(1)
        }, 500)
      }
    }
  }, [])

  // Handle code execution
  const handleRun = useCallback(async (code: string) => {
    if (running) return
    setRunning(true)
    setCompleted(false)
    setStatusMessage('')
    setCodeError('')

    // Reset
    droneRef.current = { x: START_POS.x, y: START_POS.y, dir: START_DIR }
    pathRef.current = new Set([`${START_POS.x},${START_POS.y}`])
    wallHitsRef.current = []
    stepsDisplayRef.current = 0
    wallHitCountRef.current = 0

    // Execute code through sandboxed runner
    const result = executeMazeCode(
      code, WALLS, GRID_SIZE,
      START_POS.x, START_POS.y, START_DIR,
      EXIT_POS.x, EXIT_POS.y,
    )

    if (!result.success) {
      // Still animate what we got
      await animatePath(result.state)
      setCodeError(result.error ?? 'Execution error')
      setRunning(false)
      return
    }

    // Animate the path
    await animatePath(result.state)

    const { state } = result
    const reachedExit = state.atExit
    const wallHits = state.wallHits
    const totalSteps = state.steps

    if (reachedExit && wallHits <= 2) {
      const correctness = 500
      const efficiency = Math.round(Math.max(0, 1 - (totalSteps / OPTIMAL_STEPS - 1)) * 350)
      const style = wallHits === 0 ? 150 : 0

      const totalScore = Math.min(MAX_SCORE, correctness + efficiency + style)

      const exitPx = OFFSET_X + EXIT_POS.x * CELL_SIZE + CELL_SIZE / 2
      const exitPy = OFFSET_Y + EXIT_POS.y * CELL_SIZE + CELL_SIZE / 2
      confettiRef.current = createConfetti(exitPx, exitPy)

      setCompleted(true)
      setStatusMessage(t('droneMission6.success', { steps: totalSteps, wallHits }))
      setRunning(false)

      await new Promise(r => setTimeout(r, 2000))

      onComplete(totalScore, [
        { label: t('droneMission6.scoreCorrectness'), value: correctness, max: 500 },
        { label: t('droneMission6.scoreEfficiency'), value: efficiency, max: 350 },
        { label: t('droneMission6.scoreStyle'), value: style, max: 150 },
      ])
    } else if (reachedExit) {
      setRunning(false)
      setStatusMessage(t('droneMission6.tooManyHits', { wallHits }))
    } else {
      setRunning(false)
      setStatusMessage(t('droneMission6.didNotReach'))
    }
  }, [running, t, onComplete, animatePath])

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left: Maze Canvas */}
      <div className="flex-shrink-0">
        <p className="text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">
          {t('droneMission6.simulationGrid')}
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
            <span className="w-3 h-3 rounded-sm bg-blue-500/50" /> {t('droneMission6.legendDrone')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: WALL_COLOR }} /> {t('droneMission6.legendWall')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-green-500/40 border border-green-500" /> {t('droneMission6.legendExit')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-blue-500/20" /> {t('droneMission6.legendPath')}
          </span>
        </div>
      </div>

      {/* Right: Code Editor */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">
          {t('droneMission6.yourCode')}
        </p>
        <SimpleCodeEditor
          starterCode={starterCode}
          onRun={handleRun}
          disabled={completed}
          running={running}
          error={codeError}
          hint={t('droneMission6.tip')}
        />
      </div>
    </div>
  )
}
