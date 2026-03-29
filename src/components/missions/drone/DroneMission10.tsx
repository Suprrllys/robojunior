'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import clsx from 'clsx'
import SimpleCodeEditor from './SimpleCodeEditor'
import { executeSmartCityCode, type SmartCityState } from './code-runner'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GRID_SIZE = 14
const DRONE_COUNT = 8
const MAX_SCORE = 1000
const MOVE_DURATION = 100

// Canvas
const CELL_SIZE = 32
const DEPTH_X = 6   // 2.5D depth offset right
const DEPTH_Y = 6   // 2.5D depth offset down
const CANVAS_W = GRID_SIZE * CELL_SIZE + 20 + DEPTH_X
const CANVAS_H = GRID_SIZE * CELL_SIZE + 20 + DEPTH_Y
const OFFSET_X = 10
const OFFSET_Y = 10

const BG_COLOR = '#060A14'
const FLOOR_COLOR = '#0D1220'
const BUILDING_SIDE_R = '#10141F'
const BUILDING_SIDE_B = '#0C1018'
const BUILDING_ROOF = '#232940'
const ROAD_LINE_COLOR = '#1A2030'
const STREET_LIGHT_COLOR = '#FFE08A'

// Priority colors
const PRIORITY_COLORS: Record<string, string> = {
  emergency: '#EF4444',
  delivery: '#F59E0B',
  patrol: '#3B82F6',
}

// Drone individual colors for route trails
const DRONE_COLORS = [
  '#3B82F6', '#8B5CF6', '#06B6D4', '#10B981',
  '#F59E0B', '#EF4444', '#EC4899', '#6366F1',
]

// Ambient city lights (twinkle positions — fixed random seed)
const CITY_LIGHTS: Array<{ x: number; y: number; phase: number; speed: number }> = []
for (let i = 0; i < 40; i++) {
  CITY_LIGHTS.push({
    x: OFFSET_X + Math.floor((i * 7 + 3) % (GRID_SIZE * CELL_SIZE)),
    y: OFFSET_Y + Math.floor((i * 13 + 5) % (GRID_SIZE * CELL_SIZE)),
    phase: (i * 1.7) % (Math.PI * 2),
    speed: 1.5 + (i % 5) * 0.6,
  })
}

// Car lights along grid edges
interface CarLight {
  pos: number     // 0-1 progress along edge
  row: number     // grid row or col index
  horizontal: boolean
  speed: number
  color: string
  phase: number
}
const CAR_LIGHTS: CarLight[] = []
for (let i = 0; i < 10; i++) {
  CAR_LIGHTS.push({
    pos: 0,
    row: ((i * 3 + 1) % GRID_SIZE),
    horizontal: i % 2 === 0,
    speed: 0.3 + (i % 4) * 0.15,
    color: i % 3 === 0 ? '#FF6666' : '#FFDD88',
    phase: (i * 2.3) % 10,
  })
}

// Generate level data
function generateLevel() {
  const drones = [
    { x: 0, y: 0 }, { x: 13, y: 0 }, { x: 0, y: 13 }, { x: 13, y: 13 },
    { x: 7, y: 0 }, { x: 7, y: 13 }, { x: 0, y: 7 }, { x: 13, y: 7 },
  ]

  // Buildings (non-traversable, just for visuals)
  const buildings = new Set([
    '3,3', '4,3', '3,4', '4,4',
    '9,3', '10,3', '9,4', '10,4',
    '3,9', '4,9', '3,10', '4,10',
    '9,9', '10,9', '9,10', '10,10',
    '6,6', '7,6', '6,7', '7,7',
  ])

  // Events: mix of emergency, delivery, patrol
  const events = [
    { id: 0, type: 'emergency', location: { x: 2, y: 1 }, priority: 3 },
    { id: 1, type: 'emergency', location: { x: 11, y: 12 }, priority: 3 },
    { id: 2, type: 'emergency', location: { x: 5, y: 8 }, priority: 3 },
    { id: 3, type: 'delivery', location: { x: 8, y: 2 }, priority: 2 },
    { id: 4, type: 'delivery', location: { x: 1, y: 11 }, priority: 2 },
    { id: 5, type: 'delivery', location: { x: 12, y: 5 }, priority: 2 },
    { id: 6, type: 'delivery', location: { x: 6, y: 12 }, priority: 2 },
    { id: 7, type: 'patrol', location: { x: 2, y: 5 }, priority: 1 },
    { id: 8, type: 'patrol', location: { x: 11, y: 8 }, priority: 1 },
    { id: 9, type: 'patrol', location: { x: 8, y: 11 }, priority: 1 },
    { id: 10, type: 'patrol', location: { x: 5, y: 2 }, priority: 1 },
    { id: 11, type: 'emergency', location: { x: 12, y: 1 }, priority: 3 },
  ]

  return { drones, buildings, events }
}

const STARTER_CODE_EN = `// MISSION: Smart City System
// Handle 12 city events with 8 drones.
// Events have priorities: emergency (3), delivery (2), patrol (1).
// Emergencies should be handled FIRST!
//
// Available API:
//   events                  - array of events, each has:
//                             { id, type, location: {x,y}, priority, handled }
//                             type: "emergency" | "delivery" | "patrol"
//   fleet                   - array of 8 drones, each has:
//                             { id, x, y, busy }
//   findClosest(fleet, loc) - returns the closest free drone to location
//   distance(a, b)          - Manhattan distance between two points
//   drone.flyTo(x, y)       - fly drone to position
//   drone.handleEvent(id)   - handle the event at current location
//
// STRATEGY:
// 1. Sort events by priority (highest first)
// 2. For each event, find closest free drone
// 3. Send drone to event location and handle it

// Write your event handler below:

`

const STARTER_CODE_RU = `// МИССИЯ: Система умного города
// Обработай 12 городских событий с помощью 8 дронов.
// У событий есть приоритеты: экстренные (3), доставка (2), патруль (1).
// Экстренные события обрабатывай ПЕРВЫМИ!
//
// Доступный API:
//   events                  - массив событий, каждое имеет:
//                             { id, type, location: {x,y}, priority, handled }
//                             type: "emergency" | "delivery" | "patrol"
//   fleet                   - массив из 8 дронов, каждый имеет:
//                             { id, x, y, busy }
//   findClosest(fleet, loc) - возвращает ближайший свободный дрон к позиции
//   distance(a, b)          - манхэттенское расстояние между двумя точками
//   drone.flyTo(x, y)       - отправить дрон в позицию
//   drone.handleEvent(id)   - обработать событие в текущей позиции
//
// СТРАТЕГИЯ:
// 1. Отсортируй события по приоритету (сначала высший)
// 2. Для каждого события найди ближайший свободный дрон
// 3. Отправь дрон к месту события и обработай его

// Напиши свой обработчик событий ниже:

`

const STARTER_CODE_AR = `// المهمة: نظام المدينة الذكية
// عالج 12 حدثاً في المدينة باستخدام 8 طائرات.
// للأحداث أولويات: طوارئ (3)، توصيل (2)، دورية (1).
// عالج حالات الطوارئ أولاً!
//
// واجهة البرمجة المتاحة:
//   events                  - مصفوفة أحداث، كل منها يحتوي:
//                             { id, type, location: {x,y}, priority, handled }
//                             type: "emergency" | "delivery" | "patrol"
//   fleet                   - مصفوفة من 8 طائرات، كل منها يحتوي:
//                             { id, x, y, busy }
//   findClosest(fleet, loc) - ترجع أقرب طائرة متاحة للموقع
//   distance(a, b)          - مسافة مانهاتن بين نقطتين
//   drone.flyTo(x, y)       - إرسال الطائرة إلى موقع
//   drone.handleEvent(id)   - معالجة الحدث في الموقع الحالي
//
// الاستراتيجية:
// 1. رتب الأحداث حسب الأولوية (الأعلى أولاً)
// 2. لكل حدث، ابحث عن أقرب طائرة متاحة
// 3. أرسل الطائرة إلى موقع الحدث وعالجه

// اكتب معالج الأحداث أدناه:

`

// ---------------------------------------------------------------------------
// Canvas rendering
// ---------------------------------------------------------------------------

function drawSmartCity(
  ctx: CanvasRenderingContext2D,
  buildings: Set<string>,
  dronePositions: Array<{ x: number; y: number }>,
  events: Array<{ id: number; type: string; location: { x: number; y: number }; handled: boolean }>,
  routes: Array<Array<{ x: number; y: number }>>,
  time: number,
  eventsLabel = 'Events',
) {
  ctx.fillStyle = BG_COLOR
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // ---- CITY FLOOR ----
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const key = `${x},${y}`
      const px = OFFSET_X + x * CELL_SIZE
      const py = OFFSET_Y + y * CELL_SIZE

      if (!buildings.has(key)) {
        ctx.fillStyle = FLOOR_COLOR
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE)
        ctx.strokeStyle = '#151A28'
        ctx.lineWidth = 0.3
        ctx.strokeRect(px + 0.5, py + 0.5, CELL_SIZE - 1, CELL_SIZE - 1)
      }
    }
  }

  // Road grid lines (dashed center lines on roads)
  ctx.save()
  ctx.strokeStyle = ROAD_LINE_COLOR
  ctx.lineWidth = 0.6
  ctx.setLineDash([4, 6])
  for (let i = 0; i <= GRID_SIZE; i++) {
    const p = OFFSET_Y + i * CELL_SIZE
    ctx.beginPath()
    ctx.moveTo(OFFSET_X, p)
    ctx.lineTo(OFFSET_X + GRID_SIZE * CELL_SIZE, p)
    ctx.stroke()
    const p2 = OFFSET_X + i * CELL_SIZE
    ctx.beginPath()
    ctx.moveTo(p2, OFFSET_Y)
    ctx.lineTo(p2, OFFSET_Y + GRID_SIZE * CELL_SIZE)
    ctx.stroke()
  }
  ctx.setLineDash([])
  ctx.restore()

  // Street lights at intersections
  for (let y = 0; y <= GRID_SIZE; y += 2) {
    for (let x = 0; x <= GRID_SIZE; x += 2) {
      const lx = OFFSET_X + x * CELL_SIZE
      const ly = OFFSET_Y + y * CELL_SIZE
      const flicker = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(time * 3 + x * 1.3 + y * 2.1))
      ctx.globalAlpha = flicker * 0.7
      ctx.fillStyle = STREET_LIGHT_COLOR
      ctx.beginPath()
      ctx.arc(lx, ly, 1.5, 0, Math.PI * 2)
      ctx.fill()
      // glow
      const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, 6)
      glow.addColorStop(0, 'rgba(255,224,138,0.25)')
      glow.addColorStop(1, 'rgba(255,224,138,0)')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(lx, ly, 6, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1

  // ---- BUILDINGS (3D) ----
  // Draw building shadows first
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (!buildings.has(`${x},${y}`)) continue
      const px = OFFSET_X + x * CELL_SIZE
      const py = OFFSET_Y + y * CELL_SIZE
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      ctx.fillRect(px + DEPTH_X, py + DEPTH_Y, CELL_SIZE, CELL_SIZE)
    }
  }

  // Draw buildings with depth
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (!buildings.has(`${x},${y}`)) continue
      const px = OFFSET_X + x * CELL_SIZE
      const py = OFFSET_Y + y * CELL_SIZE

      // Right side face
      ctx.fillStyle = BUILDING_SIDE_R
      ctx.beginPath()
      ctx.moveTo(px + CELL_SIZE, py)
      ctx.lineTo(px + CELL_SIZE + DEPTH_X, py + DEPTH_Y)
      ctx.lineTo(px + CELL_SIZE + DEPTH_X, py + CELL_SIZE + DEPTH_Y)
      ctx.lineTo(px + CELL_SIZE, py + CELL_SIZE)
      ctx.closePath()
      ctx.fill()

      // Bottom side face
      ctx.fillStyle = BUILDING_SIDE_B
      ctx.beginPath()
      ctx.moveTo(px, py + CELL_SIZE)
      ctx.lineTo(px + DEPTH_X, py + CELL_SIZE + DEPTH_Y)
      ctx.lineTo(px + CELL_SIZE + DEPTH_X, py + CELL_SIZE + DEPTH_Y)
      ctx.lineTo(px + CELL_SIZE, py + CELL_SIZE)
      ctx.closePath()
      ctx.fill()

      // Roof (top face)
      ctx.fillStyle = BUILDING_ROOF
      ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE)
      ctx.strokeStyle = '#2E3550'
      ctx.lineWidth = 0.5
      ctx.strokeRect(px + 0.5, py + 0.5, CELL_SIZE - 1, CELL_SIZE - 1)

      // Roof highlight line
      ctx.strokeStyle = 'rgba(100,120,180,0.25)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(px + 2, py + 2)
      ctx.lineTo(px + CELL_SIZE - 2, py + 2)
      ctx.stroke()

      // Windows with warm glow & flicker
      const windowPositions = [
        [px + 5, py + 5],
        [px + CELL_SIZE - 10, py + 5],
        [px + 5, py + CELL_SIZE - 10],
        [px + CELL_SIZE - 10, py + CELL_SIZE - 10],
      ]
      for (let wi = 0; wi < windowPositions.length; wi++) {
        const [wx, wy] = windowPositions[wi]
        const flicker = 0.6 + 0.4 * Math.sin(time * 2.5 + x * 3 + y * 5 + wi * 1.7)
        // Window glow halo
        ctx.globalAlpha = flicker * 0.3
        ctx.fillStyle = '#FFD080'
        ctx.fillRect(wx - 1, wy - 1, 7, 7)
        // Window pane
        ctx.globalAlpha = flicker
        ctx.fillStyle = '#FFD080'
        ctx.fillRect(wx, wy, 5, 5)
        // Window frame
        ctx.strokeStyle = 'rgba(255,220,140,0.4)'
        ctx.lineWidth = 0.3
        ctx.strokeRect(wx, wy, 5, 5)
        // Cross-bar
        ctx.beginPath()
        ctx.moveTo(wx + 2.5, wy)
        ctx.lineTo(wx + 2.5, wy + 5)
        ctx.moveTo(wx, wy + 2.5)
        ctx.lineTo(wx + 5, wy + 2.5)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }
  }

  // ---- CAR LIGHTS ----
  for (const car of CAR_LIGHTS) {
    const progress = ((time * car.speed + car.phase) % 12) / 12
    if (car.horizontal) {
      const cx = OFFSET_X + progress * (GRID_SIZE * CELL_SIZE)
      const cy = OFFSET_Y + car.row * CELL_SIZE + CELL_SIZE / 2
      ctx.fillStyle = car.color
      ctx.globalAlpha = 0.7
      ctx.beginPath()
      ctx.arc(cx, cy, 1.5, 0, Math.PI * 2)
      ctx.fill()
      // Tail trail
      const grad = ctx.createLinearGradient(cx - 8, cy, cx, cy)
      grad.addColorStop(0, 'rgba(0,0,0,0)')
      grad.addColorStop(1, car.color)
      ctx.strokeStyle = grad
      ctx.lineWidth = 1
      ctx.globalAlpha = 0.3
      ctx.beginPath()
      ctx.moveTo(cx - 8, cy)
      ctx.lineTo(cx, cy)
      ctx.stroke()
    } else {
      const cx = OFFSET_X + car.row * CELL_SIZE + CELL_SIZE / 2
      const cy = OFFSET_Y + progress * (GRID_SIZE * CELL_SIZE)
      ctx.fillStyle = car.color
      ctx.globalAlpha = 0.7
      ctx.beginPath()
      ctx.arc(cx, cy, 1.5, 0, Math.PI * 2)
      ctx.fill()
      const grad = ctx.createLinearGradient(cx, cy - 8, cx, cy)
      grad.addColorStop(0, 'rgba(0,0,0,0)')
      grad.addColorStop(1, car.color)
      ctx.strokeStyle = grad
      ctx.lineWidth = 1
      ctx.globalAlpha = 0.3
      ctx.beginPath()
      ctx.moveTo(cx, cy - 8)
      ctx.lineTo(cx, cy)
      ctx.stroke()
    }
  }
  ctx.globalAlpha = 1

  // ---- AMBIENT CITY LIGHTS (twinkling) ----
  for (const light of CITY_LIGHTS) {
    // Skip if inside a building cell
    const gx = Math.floor((light.x - OFFSET_X) / CELL_SIZE)
    const gy = Math.floor((light.y - OFFSET_Y) / CELL_SIZE)
    if (buildings.has(`${gx},${gy}`)) continue
    const brightness = 0.15 + 0.35 * (0.5 + 0.5 * Math.sin(time * light.speed + light.phase))
    ctx.globalAlpha = brightness
    ctx.fillStyle = '#99BBFF'
    ctx.beginPath()
    ctx.arc(light.x, light.y, 0.8, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  // ---- GLOWING ROUTE LINES ----
  for (let di = 0; di < routes.length; di++) {
    const route = routes[di]
    if (route.length < 2) continue
    const dColor = DRONE_COLORS[di % DRONE_COLORS.length]

    // Outer glow
    ctx.strokeStyle = dColor + '18'
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    for (let i = 0; i < route.length; i++) {
      const px = OFFSET_X + route[i].x * CELL_SIZE + CELL_SIZE / 2
      const py = OFFSET_Y + route[i].y * CELL_SIZE + CELL_SIZE / 2
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.stroke()

    // Core line with gradient fade (brighter near end)
    ctx.lineWidth = 1.5
    for (let i = 1; i < route.length; i++) {
      const px0 = OFFSET_X + route[i - 1].x * CELL_SIZE + CELL_SIZE / 2
      const py0 = OFFSET_Y + route[i - 1].y * CELL_SIZE + CELL_SIZE / 2
      const px1 = OFFSET_X + route[i].x * CELL_SIZE + CELL_SIZE / 2
      const py1 = OFFSET_Y + route[i].y * CELL_SIZE + CELL_SIZE / 2
      const alpha = Math.max(0.1, (i / route.length) * 0.6)
      ctx.strokeStyle = dColor + Math.round(alpha * 255).toString(16).padStart(2, '0')
      ctx.beginPath()
      ctx.moveTo(px0, py0)
      ctx.lineTo(px1, py1)
      ctx.stroke()
    }
  }
  ctx.lineCap = 'butt'
  ctx.lineJoin = 'miter'

  // ---- EVENTS (enhanced markers) ----
  for (const evt of events) {
    const epx = OFFSET_X + evt.location.x * CELL_SIZE + CELL_SIZE / 2
    const epy = OFFSET_Y + evt.location.y * CELL_SIZE + CELL_SIZE / 2
    const color = PRIORITY_COLORS[evt.type] ?? '#888'

    if (evt.handled) {
      // Green checkmark with sparkle burst
      ctx.fillStyle = '#22C55E33'
      ctx.beginPath()
      ctx.arc(epx, epy, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#22C55E'
      ctx.font = 'bold 10px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('\u2713', epx, epy)

      // Sparkle particles (brief burst using time)
      const sparkleAge = (time * 3 + evt.id * 2) % 6
      if (sparkleAge < 1.5) {
        const sparkCount = 6
        for (let si = 0; si < sparkCount; si++) {
          const angle = (si / sparkCount) * Math.PI * 2 + time
          const dist = sparkleAge * 8
          const sx = epx + Math.cos(angle) * dist
          const sy = epy + Math.sin(angle) * dist
          ctx.globalAlpha = Math.max(0, 1 - sparkleAge / 1.5) * 0.7
          ctx.fillStyle = '#22C55E'
          ctx.beginPath()
          ctx.arc(sx, sy, 1, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1
      }
    } else if (evt.type === 'emergency') {
      // Red pulsing 3D beacon with shockwave rings
      const pulse = 0.5 + Math.sin(time * 5 + evt.id) * 0.4

      // Shockwave rings
      for (let ring = 0; ring < 3; ring++) {
        const ringPhase = ((time * 2 + evt.id + ring * 0.7) % 2) / 2
        const ringRadius = 6 + ringPhase * 14
        const ringAlpha = (1 - ringPhase) * 0.35
        ctx.strokeStyle = color
        ctx.lineWidth = 1.2
        ctx.globalAlpha = ringAlpha
        ctx.beginPath()
        ctx.arc(epx, epy, ringRadius, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.globalAlpha = 1

      // 3D beacon base (bottom ellipse shadow)
      ctx.fillStyle = 'rgba(239,68,68,0.15)'
      ctx.beginPath()
      ctx.ellipse(epx, epy + 3, 9, 4, 0, 0, Math.PI * 2)
      ctx.fill()

      // Beacon body
      const beaconGrad = ctx.createRadialGradient(epx, epy - 2, 1, epx, epy, 10)
      beaconGrad.addColorStop(0, '#FF8888')
      beaconGrad.addColorStop(0.5, color)
      beaconGrad.addColorStop(1, '#991111')
      ctx.fillStyle = beaconGrad
      ctx.globalAlpha = 0.6 + pulse * 0.4
      ctx.beginPath()
      ctx.arc(epx, epy, 10, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1

      // Label
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 7px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('SOS', epx, epy)

    } else if (evt.type === 'delivery') {
      // 3D package box
      const pulse = 0.5 + Math.sin(time * 3 + evt.id) * 0.2
      const bx = epx - 6
      const by = epy - 5

      // Shadow
      ctx.fillStyle = 'rgba(245,158,11,0.12)'
      ctx.fillRect(bx + 2, by + 13, 12, 3)

      // Box bottom face
      ctx.fillStyle = '#B8760A'
      ctx.beginPath()
      ctx.moveTo(bx, by + 10)
      ctx.lineTo(bx + 3, by + 13)
      ctx.lineTo(bx + 15, by + 13)
      ctx.lineTo(bx + 12, by + 10)
      ctx.closePath()
      ctx.fill()

      // Box right face
      ctx.fillStyle = '#D4890C'
      ctx.beginPath()
      ctx.moveTo(bx + 12, by)
      ctx.lineTo(bx + 15, by + 3)
      ctx.lineTo(bx + 15, by + 13)
      ctx.lineTo(bx + 12, by + 10)
      ctx.closePath()
      ctx.fill()

      // Box front face
      ctx.fillStyle = color
      ctx.globalAlpha = 0.7 + pulse * 0.3
      ctx.fillRect(bx, by, 12, 10)
      ctx.globalAlpha = 1

      // Cross tape on box
      ctx.strokeStyle = '#FFE080'
      ctx.lineWidth = 0.8
      ctx.beginPath()
      ctx.moveTo(bx + 6, by)
      ctx.lineTo(bx + 6, by + 10)
      ctx.moveTo(bx, by + 5)
      ctx.lineTo(bx + 12, by + 5)
      ctx.stroke()

      // Label
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 6px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('PKG', epx, epy + 1)

    } else if (evt.type === 'patrol') {
      // Blue rotating scanner/radar
      const pulse = 0.5 + Math.sin(time * 3 + evt.id) * 0.2
      const scanAngle = (time * 2.5 + evt.id * 1.5) % (Math.PI * 2)

      // Radar circle
      ctx.strokeStyle = color + '44'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.arc(epx, epy, 9, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(epx, epy, 5, 0, Math.PI * 2)
      ctx.stroke()

      // Scanning sweep (pie slice)
      ctx.fillStyle = color + '30'
      ctx.beginPath()
      ctx.moveTo(epx, epy)
      ctx.arc(epx, epy, 10, scanAngle - 0.6, scanAngle, false)
      ctx.closePath()
      ctx.fill()

      // Scanner line
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.globalAlpha = 0.8
      ctx.beginPath()
      ctx.moveTo(epx, epy)
      ctx.lineTo(epx + Math.cos(scanAngle) * 9, epy + Math.sin(scanAngle) * 9)
      ctx.stroke()
      ctx.globalAlpha = 1

      // Center dot
      ctx.fillStyle = color
      ctx.globalAlpha = 0.6 + pulse * 0.4
      ctx.beginPath()
      ctx.arc(epx, epy, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1

      // Label
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 6px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('PTL', epx, epy + 13)
    }
  }

  // ---- DRONES (with propellers, shadow, hover) ----
  for (let di = 0; di < dronePositions.length; di++) {
    const d = dronePositions[di]
    const dpx = OFFSET_X + d.x * CELL_SIZE + CELL_SIZE / 2
    // Hover float effect
    const hover = Math.sin(time * 4 + di * 1.3) * 2
    const dpy = OFFSET_Y + d.y * CELL_SIZE + CELL_SIZE / 2 + hover
    const dColor = DRONE_COLORS[di % DRONE_COLORS.length]

    // Shadow on ground (no hover offset)
    const shadowY = OFFSET_Y + d.y * CELL_SIZE + CELL_SIZE / 2 + 4
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.beginPath()
    ctx.ellipse(dpx + 2, shadowY, 5, 2.5, 0, 0, Math.PI * 2)
    ctx.fill()

    // Engine glow
    const gradient = ctx.createRadialGradient(dpx, dpy, 2, dpx, dpy, CELL_SIZE / 2)
    gradient.addColorStop(0, dColor + '44')
    gradient.addColorStop(1, dColor + '00')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(dpx, dpy, CELL_SIZE / 2, 0, Math.PI * 2)
    ctx.fill()

    // Drone body (rounded rectangle)
    const bw = 10
    const bh = 6
    ctx.fillStyle = dColor
    ctx.beginPath()
    ctx.roundRect(dpx - bw / 2, dpy - bh / 2, bw, bh, 2)
    ctx.fill()
    ctx.strokeStyle = '#ffffff33'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.roundRect(dpx - bw / 2, dpy - bh / 2, bw, bh, 2)
    ctx.stroke()

    // 4 propellers (spinning lines)
    const propPositions = [
      { x: dpx - 7, y: dpy - 5 },
      { x: dpx + 7, y: dpy - 5 },
      { x: dpx - 7, y: dpy + 5 },
      { x: dpx + 7, y: dpy + 5 },
    ]
    const propAngle = (time * 15 + di * 2) % (Math.PI * 2)
    for (let pi = 0; pi < propPositions.length; pi++) {
      const pp = propPositions[pi]
      const a = propAngle + pi * (Math.PI / 4)
      const pLen = 4
      ctx.strokeStyle = '#ffffffAA'
      ctx.lineWidth = 0.8
      ctx.beginPath()
      ctx.moveTo(pp.x + Math.cos(a) * pLen, pp.y + Math.sin(a) * pLen)
      ctx.lineTo(pp.x - Math.cos(a) * pLen, pp.y - Math.sin(a) * pLen)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(pp.x + Math.cos(a + Math.PI / 2) * pLen, pp.y + Math.sin(a + Math.PI / 2) * pLen)
      ctx.lineTo(pp.x - Math.cos(a + Math.PI / 2) * pLen, pp.y - Math.sin(a + Math.PI / 2) * pLen)
      ctx.stroke()
      // Propeller hub dot
      ctx.fillStyle = '#ffffff66'
      ctx.beginPath()
      ctx.arc(pp.x, pp.y, 1, 0, Math.PI * 2)
      ctx.fill()
    }

    // Arms connecting body to propellers
    ctx.strokeStyle = '#ffffff22'
    ctx.lineWidth = 0.6
    for (const pp of propPositions) {
      ctx.beginPath()
      ctx.moveTo(dpx, dpy)
      ctx.lineTo(pp.x, pp.y)
      ctx.stroke()
    }

    // Drone index label
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 6px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${di}`, dpx, dpy)
  }

  // ---- HUD ----
  const handled = events.filter(e => e.handled).length
  const emergencies = events.filter(e => e.type === 'emergency')
  const emergencyHandled = emergencies.filter(e => e.handled).length
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 11px sans-serif'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'top'
  ctx.fillText(`${eventsLabel}: ${handled}/${events.length}`, CANVAS_W - 10, 6)
  ctx.fillStyle = PRIORITY_COLORS.emergency
  ctx.fillText(`SOS: ${emergencyHandled}/${emergencies.length}`, CANVAS_W - 10, 20)
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

interface DroneMission10Props {
  onComplete: (score: number, breakdown: Array<{ label: string; value: number; max: number }>) => void
}

export default function DroneMission10({ onComplete }: DroneMission10Props) {
  const t = useTranslations('game')
  const locale = useLocale()
  const starterCode = locale === 'ru' ? STARTER_CODE_RU : locale === 'ar' ? STARTER_CODE_AR : STARTER_CODE_EN
  const canvasLabelsRef = useRef({ events: 'Events' })
  canvasLabelsRef.current.events = t('droneMission10.canvasEvents')

  const [running, setRunning] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [codeError, setCodeError] = useState('')

  const levelRef = useRef(generateLevel())
  const dronePositionsRef = useRef(levelRef.current.drones.map(d => ({ ...d })))
  const eventsDisplayRef = useRef(levelRef.current.events.map(e => ({ ...e, handled: false })))
  const routesRef = useRef<Array<Array<{ x: number; y: number }>>>(levelRef.current.drones.map(d => [{ ...d }]))
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
        drawSmartCity(
          ctx, levelRef.current.buildings,
          dronePositionsRef.current,
          eventsDisplayRef.current,
          routesRef.current,
          timeRef.current,
          canvasLabelsRef.current.events,
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

  const animatePath = useCallback(async (state: SmartCityState) => {
    for (const step of state.actions) {
      if (step.type === 'flyTo') {
        const di = step.droneIndex
        const startX = dronePositionsRef.current[di].x
        const startY = dronePositionsRef.current[di].y
        const frames = Math.round(MOVE_DURATION / 16)
        for (let f = 0; f <= frames; f++) {
          const p = f / frames
          const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
          const newPositions = [...dronePositionsRef.current]
          newPositions[di] = {
            x: startX + (step.x - startX) * ease,
            y: startY + (step.y - startY) * ease,
          }
          dronePositionsRef.current = newPositions
          await new Promise(r => setTimeout(r, 16))
        }
        const newPositions = [...dronePositionsRef.current]
        newPositions[di] = { x: step.x, y: step.y }
        dronePositionsRef.current = newPositions

        const newRoutes = [...routesRef.current]
        newRoutes[di] = [...newRoutes[di], { x: step.x, y: step.y }]
        routesRef.current = newRoutes
      } else if (step.type === 'handleEvent') {
        const newEvents = [...eventsDisplayRef.current]
        const idx = newEvents.findIndex(e => e.id === step.eventId)
        if (idx >= 0) {
          newEvents[idx] = { ...newEvents[idx], handled: true }
          eventsDisplayRef.current = newEvents
        }
        await new Promise(r => setTimeout(r, 150))
      }
    }
  }, [])

  const handleRun = useCallback(async (code: string) => {
    if (running) return
    setRunning(true)
    setCompleted(false)
    setStatusMessage('')
    setCodeError('')

    const level = levelRef.current
    dronePositionsRef.current = level.drones.map(d => ({ ...d }))
    eventsDisplayRef.current = level.events.map(e => ({ ...e, handled: false }))
    routesRef.current = level.drones.map(d => [{ ...d }])

    const result = executeSmartCityCode(
      code, level.drones, level.events, GRID_SIZE,
    )

    if (!result.success) {
      await animatePath(result.state)
      setCodeError(result.error ?? 'Execution error')
      setRunning(false)
      return
    }

    await animatePath(result.state)

    const { state } = result
    const handled = state.eventsHandled
    const total = level.events.length
    const emergencies = level.events.filter(e => e.type === 'emergency')
    const emergencyHandled = state.emergencyHandledFirst

    if (handled >= Math.ceil(total * 0.6)) {
      const correctness = Math.round(500 * (handled / total))
      // Drone utilization: how many unique drones were used
      const dronesUsed = state.dronesUsed
      const utilizationRatio = Math.min(1, dronesUsed / DRONE_COUNT)
      const efficiency = Math.round(350 * utilizationRatio)
      // Style: did they handle emergencies first?
      const style = emergencyHandled ? 150 : (state.usedSort ? 75 : 0)
      const totalScore = Math.min(MAX_SCORE, correctness + efficiency + style)

      confettiRef.current = createConfetti(CANVAS_W / 2, CANVAS_H / 2)
      setCompleted(true)
      setStatusMessage(t('droneMission10.success', { handled, total }))
      setRunning(false)

      await new Promise(r => setTimeout(r, 2000))

      onComplete(totalScore, [
        { label: t('droneMission10.scoreCorrectness'), value: correctness, max: 500 },
        { label: t('droneMission10.scoreEfficiency'), value: efficiency, max: 350 },
        { label: t('droneMission10.scoreStyle'), value: style, max: 150 },
      ])
    } else {
      setRunning(false)
      setStatusMessage(t('droneMission10.notEnough', { handled, needed: Math.ceil(total * 0.6) }))
    }
  }, [running, t, onComplete, animatePath])

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-shrink-0">
        <p className="text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">
          {t('droneMission10.simulationGrid')}
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
            <span className="w-3 h-3 rounded-sm bg-blue-500/50" /> {t('droneMission10.legendDrones')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PRIORITY_COLORS.emergency }} /> {t('droneMission10.legendEmergency')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PRIORITY_COLORS.delivery }} /> {t('droneMission10.legendDelivery')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PRIORITY_COLORS.patrol }} /> {t('droneMission10.legendPatrol')}
          </span>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">
          {t('droneMission10.yourCode')}
        </p>
        <SimpleCodeEditor
          starterCode={starterCode}
          onRun={handleRun}
          disabled={completed}
          running={running}
          error={codeError}
          hint={t('droneMission10.tip')}
        />
      </div>
    </div>
  )
}
