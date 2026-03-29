'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import clsx from 'clsx'
import SimpleCodeEditor from './SimpleCodeEditor'
import { executeSearchRescueCode, type SearchRescueState } from './code-runner'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GRID_SIZE = 10
const SURVIVOR_COUNT = 8
const MIN_SURVIVORS = 5 // 60%+
const OPTIMAL_SCANS = 30
const MAX_SCORE = 1000
const MOVE_DURATION = 100

// Canvas
const CELL_SIZE = 40
const CANVAS_W = GRID_SIZE * CELL_SIZE + 20
const CANVAS_H = GRID_SIZE * CELL_SIZE + 20
const OFFSET_X = 10
const OFFSET_Y = 10

// Colors
const BG_COLOR = '#0A0E1A'
const FLOOR_COLOR = '#111827'
const DEBRIS_COLOR = '#4A3728'
const DEBRIS_BORDER = '#6B4F3A'
const DRONE_COLOR = '#3B82F6'
const MARKER_COLOR = '#EF4444'

// Generate random level data (stable per mount)
function generateLevel(seed: number) {
  // Simple seeded random
  let s = seed
  const rand = () => { s = (s * 16807 + 0) % 2147483647; return (s & 0x7fffffff) / 0x7fffffff }

  // Place debris (15-20 random cells, not on 0,0)
  const debris = new Set<string>()
  const debrisCount = 15 + Math.floor(rand() * 6)
  while (debris.size < debrisCount) {
    const x = Math.floor(rand() * GRID_SIZE)
    const y = Math.floor(rand() * GRID_SIZE)
    if (x === 0 && y === 0) continue
    debris.add(`${x},${y}`)
  }

  // Place survivors on non-debris cells
  const survivors: Array<{ x: number; y: number }> = []
  while (survivors.length < SURVIVOR_COUNT) {
    const x = Math.floor(rand() * GRID_SIZE)
    const y = Math.floor(rand() * GRID_SIZE)
    if (x === 0 && y === 0) continue
    if (debris.has(`${x},${y}`)) continue
    if (survivors.some(s => s.x === x && s.y === y)) continue
    survivors.push({ x, y })
  }

  return { debris, survivors }
}

const STARTER_CODE_EN = `// MISSION: Search & Rescue
// Find survivors using thermal scanning on a 10x10 grid.
// There are 8 hidden survivors and debris obstacles.
// You must find at least 5 survivors (60%).
//
// Available API:
//   drone.flyTo(x, y)       - fly to grid cell (x, y). Fails on debris.
//   drone.scanHeat()        - returns temperature at current cell:
//                             100 = survivor here
//                             50-80 = survivor nearby (adjacent cell)
//                             0-20 = no survivors nearby
//   drone.dropMarker("red") - mark current cell as survivor location
//   drone.sendReport(count) - submit how many survivors you found
//
// Grid is 10x10 (x: 0-9, y: 0-9). Drone starts at (0, 0).
// Debris blocks movement — use try/catch or plan your path.
//
// STRATEGY: Scan the grid systematically with nested loops.
// High heat readings mean a survivor is close!

// Write your search algorithm below:

`

const STARTER_CODE_RU = `// МИССИЯ: Поиск и спасение
// Найди выживших с помощью теплового сканирования на сетке 10x10.
// Спрятано 8 выживших и есть препятствия из обломков.
// Нужно найти минимум 5 выживших (60%).
//
// Доступный API:
//   drone.flyTo(x, y)       - лететь к клетке (x, y). Падает на обломках.
//   drone.scanHeat()        - возвращает температуру в текущей клетке:
//                             100 = выживший здесь
//                             50-80 = выживший рядом (соседняя клетка)
//                             0-20 = выживших поблизости нет
//   drone.dropMarker("red") - отметить текущую клетку как местоположение выжившего
//   drone.sendReport(count) - отправить отчёт сколько выживших найдено
//
// Сетка 10x10 (x: 0-9, y: 0-9). Дрон стартует в (0, 0).
// Обломки блокируют движение — используй try/catch или планируй маршрут.
//
// СТРАТЕГИЯ: Сканируй сетку систематически вложенными циклами.
// Высокие показания тепла значат что выживший рядом!

// Напиши свой алгоритм поиска ниже:

`

const STARTER_CODE_AR = `// المهمة: البحث والإنقاذ
// ابحث عن الناجين باستخدام المسح الحراري على شبكة 10x10.
// هناك 8 ناجين مختبئين وعوائق من الحطام.
// يجب أن تجد 5 ناجين على الأقل (60%).
//
// واجهة البرمجة المتاحة:
//   drone.flyTo(x, y)       - الطيران إلى الخلية (x, y). يفشل عند الحطام.
//   drone.scanHeat()        - ترجع درجة الحرارة في الخلية الحالية:
//                             100 = ناجٍ هنا
//                             50-80 = ناجٍ قريب (خلية مجاورة)
//                             0-20 = لا ناجين بالقرب
//   drone.dropMarker("red") - وضع علامة على الخلية الحالية كموقع ناجٍ
//   drone.sendReport(count) - إرسال تقرير بعدد الناجين الذين وجدتهم
//
// الشبكة 10x10 (x: 0-9, y: 0-9). الطائرة تبدأ من (0, 0).
// الحطام يمنع الحركة — استخدم try/catch أو خطط مسارك.
//
// الاستراتيجية: امسح الشبكة بشكل منهجي باستخدام حلقات متداخلة.
// قراءات الحرارة العالية تعني أن ناجياً قريب!

// اكتب خوارزمية البحث أدناه:

`

// ---------------------------------------------------------------------------
// Ambient dust / smoke particles
// ---------------------------------------------------------------------------

interface AmbientParticle {
  x: number; y: number; vx: number; vy: number
  size: number; alpha: number; maxAlpha: number; life: number; maxLife: number
}

function createAmbientParticles(count: number): AmbientParticle[] {
  const particles: AmbientParticle[] = []
  for (let i = 0; i < count; i++) {
    const maxAlpha = 0.08 + Math.random() * 0.15
    const maxLife = 300 + Math.random() * 400
    particles.push({
      x: Math.random() * CANVAS_W,
      y: Math.random() * CANVAS_H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -0.1 - Math.random() * 0.2,
      size: 1.5 + Math.random() * 3,
      alpha: maxAlpha * Math.random(),
      maxAlpha,
      life: Math.random() * maxLife,
      maxLife,
    })
  }
  return particles
}

function updateAmbientParticles(particles: AmbientParticle[]): void {
  for (const p of particles) {
    p.x += p.vx
    p.y += p.vy
    p.life += 1
    // Fade in then out
    const lifeRatio = p.life / p.maxLife
    if (lifeRatio < 0.2) p.alpha = p.maxAlpha * (lifeRatio / 0.2)
    else if (lifeRatio > 0.8) p.alpha = p.maxAlpha * (1 - (lifeRatio - 0.8) / 0.2)
    else p.alpha = p.maxAlpha
    // Respawn
    if (p.life >= p.maxLife || p.y < -5 || p.x < -5 || p.x > CANVAS_W + 5) {
      p.x = Math.random() * CANVAS_W
      p.y = CANVAS_H + Math.random() * 10
      p.life = 0
      p.vx = (Math.random() - 0.5) * 0.3
      p.vy = -0.1 - Math.random() * 0.2
    }
  }
}

function drawAmbientParticles(ctx: CanvasRenderingContext2D, particles: AmbientParticle[]) {
  for (const p of particles) {
    ctx.globalAlpha = p.alpha
    ctx.fillStyle = '#C8B89A'
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

// ---------------------------------------------------------------------------
// Survivor burst particles (green sparks when found)
// ---------------------------------------------------------------------------

interface BurstParticle {
  x: number; y: number; vx: number; vy: number
  alpha: number; size: number; color: string
}

let burstParticles: BurstParticle[] = []

function spawnSurvivorBurst(cx: number, cy: number) {
  for (let i = 0; i < 24; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 0.8 + Math.random() * 2.5
    burstParticles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: 1,
      size: 1.5 + Math.random() * 2,
      color: Math.random() > 0.5 ? '#22C55E' : '#4ADE80',
    })
  }
}

function updateBurstParticles() {
  burstParticles = burstParticles.map(p => ({
    ...p, x: p.x + p.vx, y: p.y + p.vy,
    vy: p.vy + 0.03, alpha: p.alpha - 0.015,
  })).filter(p => p.alpha > 0)
}

function drawBurstParticles(ctx: CanvasRenderingContext2D) {
  for (const p of burstParticles) {
    ctx.globalAlpha = p.alpha
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fill()
    // Glow
    ctx.globalAlpha = p.alpha * 0.3
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

// ---------------------------------------------------------------------------
// Canvas rendering (2.5D enhanced)
// ---------------------------------------------------------------------------

const DEPTH_OFFSET = 6 // Height of 3D side faces

function drawGrid(
  ctx: CanvasRenderingContext2D,
  debris: Set<string>,
  survivors: Array<{ x: number; y: number }>,
  droneX: number,
  droneY: number,
  scannedCells: Map<string, number>,
  markers: Set<string>,
  foundSurvivors: Set<string>,
  time: number,
  ambientParticles: AmbientParticle[],
  startLabel: string,
) {
  ctx.fillStyle = BG_COLOR
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // ---- Floor with row-tint depth effect ----
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const key = `${x},${y}`
      const px = OFFSET_X + x * CELL_SIZE
      const py = OFFSET_Y + y * CELL_SIZE

      if (debris.has(key)) continue // drawn later on top

      // Base floor — rows get slightly lighter toward bottom for depth
      const rowTint = Math.floor(y * 1.5)
      const heat = scannedCells.get(key)
      if (heat !== undefined) {
        // Enhanced heat-map: vivid gradient with glow
        const r = Math.min(255, Math.floor(heat * 2.55))
        const g = Math.min(80, Math.floor(heat * 0.4))
        const b = Math.max(0, 255 - Math.floor(heat * 2.55))
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.55)`
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE)
        // Glow for hot cells
        if (heat >= 50) {
          const glowAlpha = 0.15 + 0.1 * Math.sin(time * 3 + x + y)
          const grd = ctx.createRadialGradient(
            px + CELL_SIZE / 2, py + CELL_SIZE / 2, 2,
            px + CELL_SIZE / 2, py + CELL_SIZE / 2, CELL_SIZE * 0.7,
          )
          grd.addColorStop(0, `rgba(${r}, ${g + 50}, 20, ${glowAlpha})`)
          grd.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
          ctx.fillStyle = grd
          ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE)
        }
        // Heat shimmer/waves for very hot cells
        if (heat >= 80) {
          const shimmerY = Math.sin(time * 5 + x * 2) * 2
          ctx.strokeStyle = `rgba(255, 120, 30, ${0.25 + 0.15 * Math.sin(time * 4 + y)})`
          ctx.lineWidth = 0.8
          ctx.beginPath()
          ctx.moveTo(px + 6, py + CELL_SIZE / 2 + shimmerY)
          ctx.quadraticCurveTo(px + CELL_SIZE / 2, py + CELL_SIZE / 2 - 3 + shimmerY, px + CELL_SIZE - 6, py + CELL_SIZE / 2 + shimmerY)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(px + 8, py + CELL_SIZE / 2 + 5 + shimmerY * 0.7)
          ctx.quadraticCurveTo(px + CELL_SIZE / 2, py + CELL_SIZE / 2 + 2 + shimmerY * 0.7, px + CELL_SIZE - 8, py + CELL_SIZE / 2 + 5 + shimmerY * 0.7)
          ctx.stroke()
        }
        // Subtle blue tint for cold cells
        if (heat < 25) {
          ctx.fillStyle = `rgba(40, 80, 180, 0.12)`
          ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE)
        }
      } else {
        const base = 17 + rowTint
        ctx.fillStyle = `rgb(${base}, ${base + 7}, ${base + 22})`
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE)
      }
      // Grid lines — subtle
      ctx.strokeStyle = `rgba(30, 50, 80, 0.5)`
      ctx.lineWidth = 0.5
      ctx.strokeRect(px + 0.5, py + 0.5, CELL_SIZE - 1, CELL_SIZE - 1)
      // Subtle inner dots for floor texture
      ctx.fillStyle = 'rgba(255,255,255,0.03)'
      ctx.fillRect(px + CELL_SIZE / 2 - 0.5, py + CELL_SIZE / 2 - 0.5, 1, 1)
    }
  }

  // ---- Debris blocks (3D raised rubble) ----
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const key = `${x},${y}`
      if (!debris.has(key)) continue
      const px = OFFSET_X + x * CELL_SIZE
      const py = OFFSET_Y + y * CELL_SIZE
      const d = DEPTH_OFFSET

      // Shadow beneath block
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      ctx.fillRect(px + 2, py + 2, CELL_SIZE, CELL_SIZE)

      // Bottom face (right side)
      ctx.fillStyle = '#33251A'
      ctx.beginPath()
      ctx.moveTo(px + CELL_SIZE, py)
      ctx.lineTo(px + CELL_SIZE + d * 0.4, py + d)
      ctx.lineTo(px + CELL_SIZE + d * 0.4, py + CELL_SIZE + d)
      ctx.lineTo(px + CELL_SIZE, py + CELL_SIZE)
      ctx.closePath()
      ctx.fill()

      // Bottom face (bottom side)
      ctx.fillStyle = '#2A1E14'
      ctx.beginPath()
      ctx.moveTo(px, py + CELL_SIZE)
      ctx.lineTo(px + d * 0.4, py + CELL_SIZE + d)
      ctx.lineTo(px + CELL_SIZE + d * 0.4, py + CELL_SIZE + d)
      ctx.lineTo(px + CELL_SIZE, py + CELL_SIZE)
      ctx.closePath()
      ctx.fill()

      // Top face
      ctx.fillStyle = DEBRIS_COLOR
      ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE)

      // Highlight top edge
      ctx.strokeStyle = DEBRIS_BORDER
      ctx.lineWidth = 1
      ctx.strokeRect(px + 0.5, py + 0.5, CELL_SIZE - 1, CELL_SIZE - 1)

      // Crack pattern (cross + extra lines)
      ctx.strokeStyle = '#6B4F3A88'
      ctx.lineWidth = 0.7
      ctx.beginPath()
      // Main cross
      ctx.moveTo(px + 5, py + 5)
      ctx.lineTo(px + CELL_SIZE - 5, py + CELL_SIZE - 5)
      ctx.moveTo(px + CELL_SIZE - 5, py + 5)
      ctx.lineTo(px + 5, py + CELL_SIZE - 5)
      // Extra cracks
      ctx.moveTo(px + CELL_SIZE / 2, py + 3)
      ctx.lineTo(px + CELL_SIZE / 2 + 4, py + CELL_SIZE / 2)
      ctx.moveTo(px + 3, py + CELL_SIZE / 2)
      ctx.lineTo(px + CELL_SIZE / 2 - 2, py + CELL_SIZE / 2 + 6)
      ctx.stroke()

      // Small rubble dots
      ctx.fillStyle = '#8B6B50'
      ctx.fillRect(px + 8, py + 12, 2, 2)
      ctx.fillRect(px + 25, py + 8, 3, 2)
      ctx.fillRect(px + 15, py + 28, 2, 3)
    }
  }

  // ---- Red markers (3D raised) ----
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const key = `${x},${y}`
      if (!markers.has(key)) continue
      const px = OFFSET_X + x * CELL_SIZE
      const py = OFFSET_Y + y * CELL_SIZE
      const m = 4 // margin
      const md = 3 // marker depth

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.fillRect(px + m + 1, py + m + 1, CELL_SIZE - m * 2, CELL_SIZE - m * 2)

      // Side face (right)
      ctx.fillStyle = '#A01818'
      ctx.beginPath()
      ctx.moveTo(px + CELL_SIZE - m, py + m)
      ctx.lineTo(px + CELL_SIZE - m + md * 0.3, py + m + md)
      ctx.lineTo(px + CELL_SIZE - m + md * 0.3, py + CELL_SIZE - m + md)
      ctx.lineTo(px + CELL_SIZE - m, py + CELL_SIZE - m)
      ctx.closePath()
      ctx.fill()

      // Side face (bottom)
      ctx.fillStyle = '#8B1515'
      ctx.beginPath()
      ctx.moveTo(px + m, py + CELL_SIZE - m)
      ctx.lineTo(px + m + md * 0.3, py + CELL_SIZE - m + md)
      ctx.lineTo(px + CELL_SIZE - m + md * 0.3, py + CELL_SIZE - m + md)
      ctx.lineTo(px + CELL_SIZE - m, py + CELL_SIZE - m)
      ctx.closePath()
      ctx.fill()

      // Top face
      ctx.fillStyle = MARKER_COLOR + '66'
      ctx.fillRect(px + m, py + m, CELL_SIZE - m * 2, CELL_SIZE - m * 2)
      ctx.strokeStyle = MARKER_COLOR
      ctx.lineWidth = 2
      ctx.strokeRect(px + m + 1, py + m + 1, CELL_SIZE - m * 2 - 2, CELL_SIZE - m * 2 - 2)
    }
  }

  // ---- Found survivor icon with burst ----
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const key = `${x},${y}`
      if (!foundSurvivors.has(key)) continue
      const px = OFFSET_X + x * CELL_SIZE
      const py = OFFSET_Y + y * CELL_SIZE
      const cx = px + CELL_SIZE / 2
      const cy = py + CELL_SIZE / 2

      // Green glow under heart
      const pulse = 0.5 + Math.sin(time * 4) * 0.3
      const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, CELL_SIZE * 0.5)
      glow.addColorStop(0, `rgba(34, 197, 94, ${0.3 * pulse})`)
      glow.addColorStop(1, 'rgba(34, 197, 94, 0)')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(cx, cy, CELL_SIZE * 0.5, 0, Math.PI * 2)
      ctx.fill()

      // Heart icon
      ctx.fillStyle = `rgba(34, 197, 94, ${0.7 + pulse * 0.3})`
      ctx.font = 'bold 16px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('\u2665', cx, cy)
    }
  }

  // ---- Start marker ----
  const spx = OFFSET_X + CELL_SIZE / 2
  const spy = OFFSET_Y + CELL_SIZE / 2
  ctx.fillStyle = '#60A5FA44'
  ctx.fillRect(OFFSET_X, OFFSET_Y, CELL_SIZE, CELL_SIZE)
  ctx.fillStyle = '#60A5FA'
  ctx.font = 'bold 9px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(startLabel, spx, spy)

  // ---- Draw drone (2.5D mini-drone) ----
  const dpx = OFFSET_X + droneX * CELL_SIZE + CELL_SIZE / 2
  const hoverOffset = Math.sin(time * 3) * 2
  const dpy = OFFSET_Y + droneY * CELL_SIZE + CELL_SIZE / 2 + hoverOffset

  // Drone shadow on ground
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
  ctx.beginPath()
  ctx.ellipse(dpx + 1, OFFSET_Y + droneY * CELL_SIZE + CELL_SIZE / 2 + 5, 9, 4, 0, 0, Math.PI * 2)
  ctx.fill()

  // Scanning double-ring animation
  const scanPulse = (Math.sin(time * 6) + 1) / 2
  const scanPulse2 = (Math.sin(time * 6 + 1.5) + 1) / 2
  // Outer ring
  ctx.strokeStyle = `rgba(59, 130, 246, ${0.2 * scanPulse})`
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(dpx, dpy, 16 + scanPulse * 6, 0, Math.PI * 2)
  ctx.stroke()
  // Inner ring
  ctx.strokeStyle = `rgba(100, 180, 255, ${0.35 * scanPulse2})`
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(dpx, dpy, 10 + scanPulse2 * 5, 0, Math.PI * 2)
  ctx.stroke()

  // Drone glow under body
  const droneGlow = ctx.createRadialGradient(dpx, dpy, 1, dpx, dpy, 14)
  droneGlow.addColorStop(0, 'rgba(59, 130, 246, 0.35)')
  droneGlow.addColorStop(1, 'rgba(59, 130, 246, 0)')
  ctx.fillStyle = droneGlow
  ctx.beginPath()
  ctx.arc(dpx, dpy, 14, 0, Math.PI * 2)
  ctx.fill()

  // Drone body (rectangular)
  ctx.fillStyle = '#2563EB'
  ctx.fillRect(dpx - 5, dpy - 3, 10, 6)
  // Body highlight
  ctx.fillStyle = '#3B82F6'
  ctx.fillRect(dpx - 4, dpy - 2, 8, 3)
  // Center dot (camera)
  ctx.fillStyle = '#60A5FA'
  ctx.beginPath()
  ctx.arc(dpx, dpy, 1.5, 0, Math.PI * 2)
  ctx.fill()

  // 4 propeller arms + spinning lines
  const armLength = 8
  const propLength = 5
  const rotAngle = time * 15 // fast spin
  const armAngles = [
    -Math.PI / 4,        // top-right
    -3 * Math.PI / 4,    // top-left
    Math.PI / 4,         // bottom-right
    3 * Math.PI / 4,     // bottom-left
  ]
  for (const baseAngle of armAngles) {
    const ax = dpx + Math.cos(baseAngle) * armLength
    const ay = dpy + Math.sin(baseAngle) * armLength
    // Arm line
    ctx.strokeStyle = '#1E40AF'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(dpx + Math.cos(baseAngle) * 4, dpy + Math.sin(baseAngle) * 3)
    ctx.lineTo(ax, ay)
    ctx.stroke()
    // Spinning propeller (line rotating around arm tip)
    ctx.strokeStyle = 'rgba(147, 197, 253, 0.7)'
    ctx.lineWidth = 1.2
    const pAngle = rotAngle + baseAngle * 3
    ctx.beginPath()
    ctx.moveTo(ax + Math.cos(pAngle) * propLength, ay + Math.sin(pAngle) * propLength * 0.5)
    ctx.lineTo(ax - Math.cos(pAngle) * propLength, ay - Math.sin(pAngle) * propLength * 0.5)
    ctx.stroke()
    // Second blade (perpendicular)
    ctx.beginPath()
    ctx.moveTo(ax + Math.cos(pAngle + Math.PI / 2) * propLength, ay + Math.sin(pAngle + Math.PI / 2) * propLength * 0.5)
    ctx.lineTo(ax - Math.cos(pAngle + Math.PI / 2) * propLength, ay - Math.sin(pAngle + Math.PI / 2) * propLength * 0.5)
    ctx.stroke()
  }

  // ---- Ambient dust/smoke particles ----
  updateAmbientParticles(ambientParticles)
  drawAmbientParticles(ctx, ambientParticles)

  // ---- Survivor burst particles ----
  updateBurstParticles()
  drawBurstParticles(ctx)
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

interface DroneMission7Props {
  onComplete: (score: number, breakdown: Array<{ label: string; value: number; max: number }>) => void
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function DroneMission7({ onComplete }: DroneMission7Props) {
  const t = useTranslations('game')
  const locale = useLocale()
  const starterCode = locale === 'ru' ? STARTER_CODE_RU : locale === 'ar' ? STARTER_CODE_AR : STARTER_CODE_EN
  const canvasLabelsRef = useRef({ start: 'START', scanned: 'Scanned', found: 'Found' })
  canvasLabelsRef.current.start = t('droneMission7.canvasStart')
  canvasLabelsRef.current.scanned = t('droneMission7.canvasScanned')
  canvasLabelsRef.current.found = t('droneMission7.canvasFound')

  const [running, setRunning] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [codeError, setCodeError] = useState('')

  // Level data (stable per mount)
  const levelRef = useRef(generateLevel(42))

  // Canvas state refs
  const droneRef = useRef({ x: 0, y: 0 })
  const scannedCellsRef = useRef<Map<string, number>>(new Map())
  const markersRef = useRef<Set<string>>(new Set())
  const foundSurvivorsRef = useRef<Set<string>>(new Set())
  const confettiRef = useRef<ConfettiParticle[]>([])
  const canvasCtxRef = useRef<CanvasRenderingContext2D | null>(null)
  const timeRef = useRef(0)
  const animFrameRef = useRef(0)
  const hudRef = useRef({ scanned: 0, found: 0 })
  const ambientRef = useRef<AmbientParticle[]>(createAmbientParticles(25))

  // Render loop
  useEffect(() => {
    let active = true
    const loop = () => {
      if (!active) return
      const ctx = canvasCtxRef.current
      if (ctx) {
        timeRef.current += 0.016
        const level = levelRef.current
        drawGrid(
          ctx, level.debris, level.survivors,
          droneRef.current.x, droneRef.current.y,
          scannedCellsRef.current, markersRef.current,
          foundSurvivorsRef.current, timeRef.current,
          ambientRef.current, canvasLabelsRef.current.start,
        )

        // HUD
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 11px sans-serif'
        ctx.textAlign = 'right'
        ctx.textBaseline = 'top'
        ctx.fillText(`${canvasLabelsRef.current.scanned}: ${hudRef.current.scanned}`, CANVAS_W - 10, 6)
        ctx.fillText(`${canvasLabelsRef.current.found}: ${hudRef.current.found}/${SURVIVOR_COUNT}`, CANVAS_W - 10, 20)

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

  // Animate the search path step by step
  const animatePath = useCallback(async (state: SearchRescueState) => {
    for (const step of state.actions) {
      if (step.type === 'flyTo') {
        // Smooth move
        const startX = droneRef.current.x
        const startY = droneRef.current.y
        const frames = Math.round(MOVE_DURATION / 16)
        for (let f = 0; f <= frames; f++) {
          const progress = f / frames
          const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2
          droneRef.current = {
            x: startX + (step.x - startX) * ease,
            y: startY + (step.y - startY) * ease,
          }
          await new Promise(r => setTimeout(r, 16))
        }
        droneRef.current = { x: step.x, y: step.y }
      } else if (step.type === 'scan') {
        scannedCellsRef.current = new Map(scannedCellsRef.current).set(`${step.x},${step.y}`, step.heat)
        hudRef.current = { ...hudRef.current, scanned: hudRef.current.scanned + 1 }
        await new Promise(r => setTimeout(r, 60))
      } else if (step.type === 'marker') {
        markersRef.current = new Set(markersRef.current).add(`${step.x},${step.y}`)
        await new Promise(r => setTimeout(r, 40))
      } else if (step.type === 'found') {
        foundSurvivorsRef.current = new Set(foundSurvivorsRef.current).add(`${step.x},${step.y}`)
        hudRef.current = { ...hudRef.current, found: hudRef.current.found + 1 }
        // Spawn green burst particles at the found cell
        const burstCx = OFFSET_X + step.x * CELL_SIZE + CELL_SIZE / 2
        const burstCy = OFFSET_Y + step.y * CELL_SIZE + CELL_SIZE / 2
        spawnSurvivorBurst(burstCx, burstCy)
        await new Promise(r => setTimeout(r, 200))
      }
    }
  }, [])

  const handleRun = useCallback(async (code: string) => {
    if (running) return
    setRunning(true)
    setCompleted(false)
    setStatusMessage('')
    setCodeError('')

    // Reset
    droneRef.current = { x: 0, y: 0 }
    scannedCellsRef.current = new Map()
    markersRef.current = new Set()
    foundSurvivorsRef.current = new Set()
    hudRef.current = { scanned: 0, found: 0 }

    const level = levelRef.current
    const result = executeSearchRescueCode(
      code, level.debris, level.survivors, GRID_SIZE,
    )

    if (!result.success) {
      await animatePath(result.state)
      setCodeError(result.error ?? 'Execution error')
      setRunning(false)
      return
    }

    await animatePath(result.state)

    const { state } = result
    const found = state.survivorsFound
    const scanned = state.cellsScanned

    if (found >= MIN_SURVIVORS) {
      const correctness = Math.round(500 * (found / SURVIVOR_COUNT))
      const effRatio = scanned > OPTIMAL_SCANS ? Math.max(0, 1 - (scanned / OPTIMAL_SCANS - 1)) : 1
      const efficiency = Math.round(350 * effRatio)
      const style = state.usedNestedLoops ? 150 : (state.usedLoop ? 75 : 0)

      const totalScore = Math.min(MAX_SCORE, correctness + efficiency + style)

      confettiRef.current = createConfetti(CANVAS_W / 2, CANVAS_H / 2)
      setCompleted(true)
      setStatusMessage(t('droneMission7.success', { found, total: SURVIVOR_COUNT }))
      setRunning(false)

      await new Promise(r => setTimeout(r, 2000))

      onComplete(totalScore, [
        { label: t('droneMission7.scoreCorrectness'), value: correctness, max: 500 },
        { label: t('droneMission7.scoreEfficiency'), value: efficiency, max: 350 },
        { label: t('droneMission7.scoreStyle'), value: style, max: 150 },
      ])
    } else {
      setRunning(false)
      setStatusMessage(t('droneMission7.notEnough', { found, needed: MIN_SURVIVORS }))
    }
  }, [running, t, onComplete, animatePath])

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-shrink-0">
        <p className="text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">
          {t('droneMission7.simulationGrid')}
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
            <span className="w-3 h-3 rounded-sm bg-blue-500/50" /> {t('droneMission7.legendDrone')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: DEBRIS_COLOR }} /> {t('droneMission7.legendDebris')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-red-500/50 border border-red-500" /> {t('droneMission7.legendMarker')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-green-500/50" /> {t('droneMission7.legendSurvivor')}
          </span>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">
          {t('droneMission7.yourCode')}
        </p>
        <SimpleCodeEditor
          starterCode={starterCode}
          onRun={handleRun}
          disabled={completed}
          running={running}
          error={codeError}
          hint={t('droneMission7.tip')}
        />
      </div>
    </div>
  )
}
