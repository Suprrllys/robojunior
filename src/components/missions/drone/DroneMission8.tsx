'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import clsx from 'clsx'
import SimpleCodeEditor from './SimpleCodeEditor'
import { executeBlindNavCode, type BlindNavState } from './code-runner'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GRID_SIZE = 15
const MAX_SCORE = 1000
const MOVE_DURATION = 80

// Landmarks (towers) scattered on the grid
const LANDMARKS = [
  { id: 'tower_A', x: 3, y: 2 },
  { id: 'tower_B', x: 12, y: 3 },
  { id: 'tower_C', x: 1, y: 11 },
  { id: 'tower_D', x: 13, y: 12 },
  { id: 'tower_E', x: 7, y: 5 },
]

const TARGET = { x: 7, y: 7 }
const START = { x: 0, y: 0 }

// Canvas
const CELL_SIZE = 30
const CANVAS_W = GRID_SIZE * CELL_SIZE + 20
const CANVAS_H = GRID_SIZE * CELL_SIZE + 20
const OFFSET_X = 10
const OFFSET_Y = 10

// Colors
const BG_COLOR = '#0A0E1A'
const FOG_COLOR = 'rgba(20, 30, 50, 0.85)'
const FLOOR_COLOR = '#111827'
const DRONE_COLOR = '#3B82F6'
const TARGET_COLOR = '#22C55E'
const LANDMARK_COLOR = '#F59E0B'

// Optimal straight-line distance from (0,0) to (7,7)
const OPTIMAL_DIST = Math.sqrt(7 * 7 + 7 * 7)

const STARTER_CODE_EN = `// MISSION: Blind Navigation
// Navigate to the target at the center of a 15x15 grid.
// You have NO GPS! Use camera + landmarks to orient yourself.
//
// Available API:
//   drone.camera.scan()      - returns array of nearby landmarks
//                              (within 5 cells). Each landmark has:
//                              { id, distance, angle }
//   drone.angleTo(landmark)  - returns angle in degrees to a landmark
//   drone.rotate(angle)      - rotate drone by angle degrees
//   drone.forward(n)         - move forward n cells
//   drone.atDestination()    - returns true if at target (7, 7)
//   drone.getHeading()       - returns current heading in degrees
//   drone.distanceTo(landmark) - returns distance to a landmark
//
// Landmarks (towers): tower_A, tower_B, tower_C, tower_D, tower_E
// Target is at the center of the grid.
//
// STRATEGY: Scan for landmarks, calculate your position
// relative to them, then navigate toward the target.

// Write your navigation algorithm below:

`

const STARTER_CODE_RU = `// МИССИЯ: Слепая навигация
// Долети до цели в центре сетки 15x15.
// У тебя НЕТ GPS! Используй камеру и ориентиры для навигации.
//
// Доступный API:
//   drone.camera.scan()      - возвращает массив ближайших ориентиров
//                              (в радиусе 5 клеток). Каждый ориентир:
//                              { id, distance, angle }
//   drone.angleTo(landmark)  - возвращает угол в градусах до ориентира
//   drone.rotate(angle)      - повернуть дрон на angle градусов
//   drone.forward(n)         - двигаться вперёд на n клеток
//   drone.atDestination()    - возвращает true если на цели (7, 7)
//   drone.getHeading()       - возвращает текущий курс в градусах
//   drone.distanceTo(landmark) - возвращает расстояние до ориентира
//
// Ориентиры (башни): tower_A, tower_B, tower_C, tower_D, tower_E
// Цель находится в центре сетки.
//
// СТРАТЕГИЯ: Сканируй ориентиры, вычисли своё положение
// относительно них, затем двигайся к цели.

// Напиши свой алгоритм навигации ниже:

`

const STARTER_CODE_AR = `// المهمة: الملاحة العمياء
// انتقل إلى الهدف في وسط شبكة 15x15.
// ليس لديك GPS! استخدم الكاميرا والمعالم للتوجيه.
//
// واجهة البرمجة المتاحة:
//   drone.camera.scan()      - ترجع مصفوفة بالمعالم القريبة
//                              (ضمن 5 خلايا). كل معلم يحتوي:
//                              { id, distance, angle }
//   drone.angleTo(landmark)  - ترجع الزاوية بالدرجات نحو المعلم
//   drone.rotate(angle)      - تدوير الطائرة بزاوية angle درجة
//   drone.forward(n)         - التحرك للأمام n خلايا
//   drone.atDestination()    - ترجع true إذا وصلت للهدف (7, 7)
//   drone.getHeading()       - ترجع الاتجاه الحالي بالدرجات
//   drone.distanceTo(landmark) - ترجع المسافة إلى المعلم
//
// المعالم (الأبراج): tower_A, tower_B, tower_C, tower_D, tower_E
// الهدف في وسط الشبكة.
//
// الاستراتيجية: امسح المعالم، احسب موقعك
// بالنسبة لها، ثم تحرك نحو الهدف.

// اكتب خوارزمية الملاحة أدناه:

`

// ---------------------------------------------------------------------------
// Fog particles (ambient floating motes)
// ---------------------------------------------------------------------------

interface FogParticle {
  x: number; y: number; r: number; speed: number; alpha: number; drift: number
}

const fogParticles: FogParticle[] = Array.from({ length: 40 }, () => ({
  x: Math.random() * CANVAS_W,
  y: Math.random() * CANVAS_H,
  r: 1.5 + Math.random() * 3,
  speed: 0.15 + Math.random() * 0.35,
  alpha: 0.08 + Math.random() * 0.15,
  drift: Math.random() * Math.PI * 2,
}))

function updateFogParticles(time: number) {
  for (const p of fogParticles) {
    p.x += Math.cos(p.drift + time * 0.3) * p.speed
    p.y += Math.sin(p.drift + time * 0.2) * p.speed * 0.6 + 0.1
    if (p.x < -10) p.x = CANVAS_W + 10
    if (p.x > CANVAS_W + 10) p.x = -10
    if (p.y > CANVAS_H + 10) { p.y = -10; p.x = Math.random() * CANVAS_W }
  }
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

/** Draw a 3D tower landmark */
function drawTower(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  isVisible: boolean, time: number, label: string,
) {
  const h = CELL_SIZE * 0.75       // tower height
  const baseW = CELL_SIZE * 0.52   // base half-width
  const topW = CELL_SIZE * 0.18    // top half-width
  const baseY = cy + h * 0.35
  const topY = cy - h * 0.45

  // Glow aura when visible
  if (isVisible) {
    const glow = 0.45 + Math.sin(time * 3) * 0.25
    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, CELL_SIZE * 0.95)
    grad.addColorStop(0, `rgba(245, 158, 11, ${glow * 0.35})`)
    grad.addColorStop(1, 'rgba(245, 158, 11, 0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, cy, CELL_SIZE * 0.95, 0, Math.PI * 2)
    ctx.fill()
  }

  const bodyColor = isVisible ? '#B45309' : '#2A2A2A'
  const sideColor = isVisible ? '#92400E' : '#1F1F1F'
  const topColor  = isVisible ? '#D97706' : '#333333'

  // Shadow on ground
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.beginPath()
  ctx.ellipse(cx + 3, baseY + 2, baseW * 0.7, 3, 0, 0, Math.PI * 2)
  ctx.fill()

  // Front face (trapezoid)
  ctx.fillStyle = bodyColor
  ctx.beginPath()
  ctx.moveTo(cx - baseW, baseY)
  ctx.lineTo(cx - topW, topY)
  ctx.lineTo(cx + topW, topY)
  ctx.lineTo(cx + baseW, baseY)
  ctx.closePath()
  ctx.fill()

  // Right side face (gives 3D depth)
  const depthX = 4
  const depthY = -2
  ctx.fillStyle = sideColor
  ctx.beginPath()
  ctx.moveTo(cx + baseW, baseY)
  ctx.lineTo(cx + topW, topY)
  ctx.lineTo(cx + topW + depthX, topY + depthY)
  ctx.lineTo(cx + baseW + depthX, baseY + depthY)
  ctx.closePath()
  ctx.fill()

  // Top face
  ctx.fillStyle = topColor
  ctx.beginPath()
  ctx.moveTo(cx - topW, topY)
  ctx.lineTo(cx + topW, topY)
  ctx.lineTo(cx + topW + depthX, topY + depthY)
  ctx.lineTo(cx - topW + depthX, topY + depthY)
  ctx.closePath()
  ctx.fill()

  // Blinking beacon light
  if (isVisible) {
    const blink = Math.sin(time * 6) > 0 ? 1.0 : 0.3
    const beaconGrad = ctx.createRadialGradient(cx, topY - 3, 0, cx, topY - 3, 6)
    beaconGrad.addColorStop(0, `rgba(255, 200, 50, ${blink})`)
    beaconGrad.addColorStop(1, `rgba(255, 200, 50, 0)`)
    ctx.fillStyle = beaconGrad
    ctx.beginPath()
    ctx.arc(cx, topY - 3, 6, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = `rgba(255, 220, 100, ${blink})`
    ctx.beginPath()
    ctx.arc(cx, topY - 3, 2, 0, Math.PI * 2)
    ctx.fill()
  }

  // Label
  ctx.fillStyle = isVisible ? '#FDE68A' : '#555'
  ctx.font = 'bold 8px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(label, cx, baseY + 3)
}

/** Draw 3D target platform with beacon */
function drawTarget3D(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  visible: boolean, time: number,
  tgtLabel = 'TGT',
) {
  if (!visible) return

  const pulse = 0.5 + Math.sin(time * 4) * 0.3

  // Raised platform — draw sides first
  const platH = 5
  const platW = CELL_SIZE * 0.42
  const platD = 3

  // Platform shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.beginPath()
  ctx.ellipse(cx + 2, cy + platH + 3, platW * 0.8, 4, 0, 0, Math.PI * 2)
  ctx.fill()

  // Side face
  ctx.fillStyle = '#166534'
  ctx.fillRect(cx - platW, cy, platW * 2, platH)

  // Right depth face
  ctx.fillStyle = '#14532D'
  ctx.beginPath()
  ctx.moveTo(cx + platW, cy)
  ctx.lineTo(cx + platW + platD, cy - 2)
  ctx.lineTo(cx + platW + platD, cy - 2 + platH)
  ctx.lineTo(cx + platW, cy + platH)
  ctx.closePath()
  ctx.fill()

  // Top face
  ctx.fillStyle = '#22C55E'
  ctx.beginPath()
  ctx.moveTo(cx - platW, cy)
  ctx.lineTo(cx - platW + platD, cy - 2)
  ctx.lineTo(cx + platW + platD, cy - 2)
  ctx.lineTo(cx + platW, cy)
  ctx.closePath()
  ctx.fill()

  // Concentric target rings on top face
  ctx.strokeStyle = `rgba(34, 197, 94, ${0.4 + pulse * 0.3})`
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(cx, cy - 1, CELL_SIZE * 0.32, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cx, cy - 1, CELL_SIZE * 0.18, 0, Math.PI * 2)
  ctx.stroke()

  // Beacon light pulsing upward
  const beaconH = 18 + Math.sin(time * 5) * 4
  const beaconGrad = ctx.createLinearGradient(cx, cy - 1, cx, cy - 1 - beaconH)
  beaconGrad.addColorStop(0, `rgba(34, 197, 94, ${pulse * 0.6})`)
  beaconGrad.addColorStop(1, 'rgba(34, 197, 94, 0)')
  ctx.fillStyle = beaconGrad
  ctx.beginPath()
  ctx.moveTo(cx - 3, cy - 1)
  ctx.lineTo(cx - 1, cy - 1 - beaconH)
  ctx.lineTo(cx + 1, cy - 1 - beaconH)
  ctx.lineTo(cx + 3, cy - 1)
  ctx.closePath()
  ctx.fill()

  // TGT label
  ctx.fillStyle = TARGET_COLOR
  ctx.font = 'bold 8px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(tgtLabel, cx, cy + platH + 10)
}

/** Draw drone with body, propellers, shadow, hover */
function drawDrone2D5(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  headingRad: number, time: number,
) {
  // Hover offset
  const hoverOff = Math.sin(time * 4) * 1.8

  // Shadow on ground
  ctx.fillStyle = 'rgba(0,0,0,0.22)'
  ctx.beginPath()
  ctx.ellipse(cx + 2, cy + 8, 7, 3, 0, 0, Math.PI * 2)
  ctx.fill()

  const dy = cy + hoverOff

  // Glow under drone
  const glowGrad = ctx.createRadialGradient(cx, dy, 2, cx, dy, CELL_SIZE * 0.55)
  glowGrad.addColorStop(0, 'rgba(59, 130, 246, 0.35)')
  glowGrad.addColorStop(1, 'rgba(59, 130, 246, 0)')
  ctx.fillStyle = glowGrad
  ctx.beginPath()
  ctx.arc(cx, dy, CELL_SIZE * 0.55, 0, Math.PI * 2)
  ctx.fill()

  ctx.save()
  ctx.translate(cx, dy)
  ctx.rotate(headingRad)

  // Rectangular body
  ctx.fillStyle = '#2563EB'
  ctx.fillRect(-5, -3, 10, 6)
  ctx.fillStyle = '#1D4ED8'
  ctx.fillRect(-4, -2, 8, 4)

  // 4 propeller arms + spinning propellers
  const armLen = 9
  const propAngle = time * 25 // spinning speed
  const arms = [
    { ax: -armLen, ay: -armLen },
    { ax: armLen,  ay: -armLen },
    { ax: -armLen, ay: armLen },
    { ax: armLen,  ay: armLen },
  ]

  for (const arm of arms) {
    // Arm line
    ctx.strokeStyle = '#93C5FD'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(arm.ax * 0.3, arm.ay * 0.3)
    ctx.lineTo(arm.ax, arm.ay)
    ctx.stroke()

    // Spinning propeller
    ctx.strokeStyle = 'rgba(191, 219, 254, 0.7)'
    ctx.lineWidth = 1.5
    const pLen = 4.5
    ctx.beginPath()
    ctx.moveTo(arm.ax + Math.cos(propAngle) * pLen, arm.ay + Math.sin(propAngle) * pLen)
    ctx.lineTo(arm.ax - Math.cos(propAngle) * pLen, arm.ay - Math.sin(propAngle) * pLen)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(arm.ax + Math.cos(propAngle + Math.PI / 2) * pLen, arm.ay + Math.sin(propAngle + Math.PI / 2) * pLen)
    ctx.lineTo(arm.ax - Math.cos(propAngle + Math.PI / 2) * pLen, arm.ay - Math.sin(propAngle + Math.PI / 2) * pLen)
    ctx.stroke()
  }

  // Direction arrow (nose pointer)
  ctx.strokeStyle = '#F59E0B'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(12, 0)
  ctx.stroke()
  // Arrow head
  ctx.fillStyle = '#F59E0B'
  ctx.beginPath()
  ctx.moveTo(12, 0)
  ctx.lineTo(9, -2.5)
  ctx.lineTo(9, 2.5)
  ctx.closePath()
  ctx.fill()

  ctx.restore()
}

// ---------------------------------------------------------------------------
// Canvas rendering
// ---------------------------------------------------------------------------

function drawBlindNav(
  ctx: CanvasRenderingContext2D,
  droneX: number,
  droneY: number,
  droneAngle: number,
  visibleLandmarks: Set<string>,
  visitedCells: Set<string>,
  reached: boolean,
  time: number,
  canvasLabels: { tgt: string; heading: string } = { tgt: 'TGT', heading: 'Heading' },
) {
  ctx.fillStyle = BG_COLOR
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // Draw cells — floor tiles
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const px = OFFSET_X + x * CELL_SIZE
      const py = OFFSET_Y + y * CELL_SIZE

      ctx.fillStyle = FLOOR_COLOR
      ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE)
    }
  }

  // Visited cell breadcrumb trail
  visitedCells.forEach((key) => {
    const [vx, vy] = key.split(',').map(Number)
    const px = OFFSET_X + vx * CELL_SIZE
    const py = OFFSET_Y + vy * CELL_SIZE

    // Faint blue tint
    ctx.fillStyle = 'rgba(59, 130, 246, 0.07)'
    ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE)

    // Small breadcrumb dot
    const dotCx = px + CELL_SIZE / 2
    const dotCy = py + CELL_SIZE / 2
    const dotGrad = ctx.createRadialGradient(dotCx, dotCy, 0, dotCx, dotCy, 2.5)
    dotGrad.addColorStop(0, 'rgba(96, 165, 250, 0.35)')
    dotGrad.addColorStop(1, 'rgba(96, 165, 250, 0)')
    ctx.fillStyle = dotGrad
    ctx.beginPath()
    ctx.arc(dotCx, dotCy, 2.5, 0, Math.PI * 2)
    ctx.fill()
  })

  // Enhanced fog overlay — gradient transition instead of hard cutoff
  const FOG_INNER = 2.2     // fully clear within this radius
  const FOG_OUTER = 5.0     // fully fogged beyond this radius
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const px = OFFSET_X + x * CELL_SIZE
      const py = OFFSET_Y + y * CELL_SIZE
      const dist = Math.sqrt((x - droneX) ** 2 + (y - droneY) ** 2)

      if (dist > FOG_INNER) {
        // Smooth gradient from FOG_INNER to FOG_OUTER
        let fogAlpha: number
        if (dist >= FOG_OUTER) {
          fogAlpha = 0.88
        } else {
          fogAlpha = ((dist - FOG_INNER) / (FOG_OUTER - FOG_INNER)) * 0.88
        }

        // Subtle fog movement using sin
        const fogShift = Math.sin(time * 0.8 + x * 0.5 + y * 0.4) * 0.04
        fogAlpha = Math.min(0.92, Math.max(0, fogAlpha + fogShift))

        ctx.fillStyle = `rgba(20, 30, 50, ${fogAlpha})`
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE)
      }
    }
  }

  // Draw landmarks (3D towers)
  for (const lm of LANDMARKS) {
    const px = OFFSET_X + lm.x * CELL_SIZE + CELL_SIZE / 2
    const py = OFFSET_Y + lm.y * CELL_SIZE + CELL_SIZE / 2
    const dist = Math.sqrt((lm.x - droneX) ** 2 + (lm.y - droneY) ** 2)
    const isVisible = dist <= 5
    drawTower(ctx, px, py, isVisible, time, lm.id.replace('tower_', ''))
  }

  // Draw target (3D platform with beacon)
  const tpx = OFFSET_X + TARGET.x * CELL_SIZE + CELL_SIZE / 2
  const tpy = OFFSET_Y + TARGET.y * CELL_SIZE + CELL_SIZE / 2
  const targetDist = Math.sqrt((TARGET.x - droneX) ** 2 + (TARGET.y - droneY) ** 2)
  drawTarget3D(ctx, tpx, tpy, targetDist <= 4 || reached, time, canvasLabels.tgt)

  // Draw drone vision cone with gradient + scan lines
  const dpx = OFFSET_X + droneX * CELL_SIZE + CELL_SIZE / 2
  const dpy = OFFSET_Y + droneY * CELL_SIZE + CELL_SIZE / 2
  const headingRad = (droneAngle - 90) * Math.PI / 180
  const coneLen = CELL_SIZE * 3.5
  const coneAngle = Math.PI / 4

  // Vision cone gradient: brighter near drone, fading out
  const coneGrad = ctx.createRadialGradient(dpx, dpy, 0, dpx, dpy, coneLen)
  coneGrad.addColorStop(0, 'rgba(59, 130, 246, 0.14)')
  coneGrad.addColorStop(0.5, 'rgba(59, 130, 246, 0.07)')
  coneGrad.addColorStop(1, 'rgba(59, 130, 246, 0)')

  ctx.fillStyle = coneGrad
  ctx.beginPath()
  ctx.moveTo(dpx, dpy)
  ctx.arc(dpx, dpy, coneLen, headingRad - coneAngle, headingRad + coneAngle)
  ctx.closePath()
  ctx.fill()

  // Scan lines within vision cone
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(dpx, dpy)
  ctx.arc(dpx, dpy, coneLen, headingRad - coneAngle, headingRad + coneAngle)
  ctx.closePath()
  ctx.clip()

  const scanOffset = (time * 30) % 12
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.04)'
  ctx.lineWidth = 1
  for (let r = scanOffset; r < coneLen; r += 12) {
    ctx.beginPath()
    ctx.arc(dpx, dpy, r, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()

  // Draw drone (2.5D with propellers, shadow, hover)
  drawDrone2D5(ctx, dpx, dpy, headingRad, time)

  // Ambient floating fog particles
  updateFogParticles(time)
  for (const p of fogParticles) {
    const distToDrone = Math.sqrt((p.x - dpx) ** 2 + (p.y - dpy) ** 2)
    // Fade particles near drone so they don't clutter the view
    const fadeNear = distToDrone < 40 ? distToDrone / 40 : 1
    ctx.fillStyle = `rgba(100, 130, 180, ${p.alpha * fadeNear})`
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    ctx.fill()
  }

  // HUD
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 11px sans-serif'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'top'
  ctx.fillText(`${canvasLabels.heading}: ${Math.round(droneAngle)}\u00B0`, CANVAS_W - 10, 6)
}

// ---------------------------------------------------------------------------
// Confetti (reused)
// ---------------------------------------------------------------------------

interface ConfettiParticle {
  x: number; y: number; vx: number; vy: number
  color: string; rotation: number; rotSpeed: number; alpha: number
}

function createConfetti(cx: number, cy: number): ConfettiParticle[] {
  const colors = ['#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#A855F7', '#EC4899']
  return Array.from({ length: 60 }, () => {
    const angle = Math.random() * Math.PI * 2
    const speed = 1 + Math.random() * 4
    return {
      x: cx, y: cy,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.3, alpha: 1,
    }
  })
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
// Props & Component
// ---------------------------------------------------------------------------

interface DroneMission8Props {
  onComplete: (score: number, breakdown: Array<{ label: string; value: number; max: number }>) => void
}

export default function DroneMission8({ onComplete }: DroneMission8Props) {
  const t = useTranslations('game')
  const locale = useLocale()
  const starterCode = locale === 'ru' ? STARTER_CODE_RU : locale === 'ar' ? STARTER_CODE_AR : STARTER_CODE_EN
  const canvasLabelsRef = useRef({ tgt: 'TGT', heading: 'Heading' })
  canvasLabelsRef.current.tgt = t('droneMission8.canvasTgt')
  canvasLabelsRef.current.heading = t('droneMission8.canvasHeading')

  const [running, setRunning] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [codeError, setCodeError] = useState('')

  const droneRef = useRef({ x: START.x, y: START.y, angle: 0 })
  const visibleLandmarksRef = useRef<Set<string>>(new Set())
  const visitedCellsRef = useRef<Set<string>>(new Set(['0,0']))
  const reachedRef = useRef(false)
  const confettiRef = useRef<ConfettiParticle[]>([])
  const canvasCtxRef = useRef<CanvasRenderingContext2D | null>(null)
  const timeRef = useRef(0)
  const animFrameRef = useRef(0)

  useEffect(() => {
    let active = true
    const loop = () => {
      if (!active) return
      const ctx = canvasCtxRef.current
      if (ctx) {
        timeRef.current += 0.016
        const d = droneRef.current
        drawBlindNav(
          ctx, d.x, d.y, d.angle,
          visibleLandmarksRef.current, visitedCellsRef.current,
          reachedRef.current, timeRef.current,
          canvasLabelsRef.current,
        )
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
    canvasCtxRef.current = canvas.getContext('2d')
  }, [])

  const animatePath = useCallback(async (state: BlindNavState) => {
    for (const step of state.actions) {
      if (step.type === 'move') {
        const startX = droneRef.current.x
        const startY = droneRef.current.y
        const frames = Math.round(MOVE_DURATION / 16)
        for (let f = 0; f <= frames; f++) {
          const p = f / frames
          const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
          droneRef.current = {
            ...droneRef.current,
            x: startX + (step.x - startX) * ease,
            y: startY + (step.y - startY) * ease,
          }
          await new Promise(r => setTimeout(r, 16))
        }
        droneRef.current = { ...droneRef.current, x: step.x, y: step.y }
        visitedCellsRef.current = new Set(visitedCellsRef.current).add(`${step.x},${step.y}`)
      } else if (step.type === 'rotate') {
        droneRef.current = { ...droneRef.current, angle: step.angle }
        await new Promise(r => setTimeout(r, 50))
      } else if (step.type === 'scan') {
        visibleLandmarksRef.current = new Set(step.landmarks)
        await new Promise(r => setTimeout(r, 80))
      }
    }
  }, [])

  const handleRun = useCallback(async (code: string) => {
    if (running) return
    setRunning(true)
    setCompleted(false)
    setStatusMessage('')
    setCodeError('')

    droneRef.current = { x: START.x, y: START.y, angle: 0 }
    visibleLandmarksRef.current = new Set()
    visitedCellsRef.current = new Set(['0,0'])
    reachedRef.current = false

    const result = executeBlindNavCode(
      code, LANDMARKS, TARGET, START, GRID_SIZE,
    )

    if (!result.success) {
      await animatePath(result.state)
      setCodeError(result.error ?? 'Execution error')
      setRunning(false)
      return
    }

    await animatePath(result.state)

    const { state } = result
    if (state.reachedTarget) {
      reachedRef.current = true
      const correctness = 500
      const distRatio = state.totalDist > 0 ? Math.max(0, 1 - (state.totalDist / OPTIMAL_DIST - 1)) : 1
      const efficiency = Math.round(350 * distRatio)
      const style = state.usedFunctions ? 150 : (state.usedLoop ? 75 : 0)
      const totalScore = Math.min(MAX_SCORE, correctness + efficiency + style)

      confettiRef.current = createConfetti(CANVAS_W / 2, CANVAS_H / 2)
      setCompleted(true)
      setStatusMessage(t('droneMission8.success'))
      setRunning(false)

      await new Promise(r => setTimeout(r, 2000))

      onComplete(totalScore, [
        { label: t('droneMission8.scoreCorrectness'), value: correctness, max: 500 },
        { label: t('droneMission8.scoreEfficiency'), value: efficiency, max: 350 },
        { label: t('droneMission8.scoreStyle'), value: style, max: 150 },
      ])
    } else {
      setRunning(false)
      setStatusMessage(t('droneMission8.didNotReach'))
    }
  }, [running, t, onComplete, animatePath])

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-shrink-0">
        <p className="text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">
          {t('droneMission8.simulationGrid')}
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

        <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-blue-500/50" /> {t('droneMission8.legendDrone')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-yellow-500/50" /> {t('droneMission8.legendLandmark')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-green-500/50 border border-green-500" /> {t('droneMission8.legendTarget')}
          </span>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">
          {t('droneMission8.yourCode')}
        </p>
        <SimpleCodeEditor
          starterCode={starterCode}
          onRun={handleRun}
          disabled={completed}
          running={running}
          error={codeError}
          hint={t('droneMission8.tip')}
        />
      </div>
    </div>
  )
}
