'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import clsx from 'clsx'
import SimpleCodeEditor from './SimpleCodeEditor'
import { executeConvoyCode, type ConvoyState } from './code-runner'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GRID_SIZE = 12
const DRONE_COUNT = 5
const ORDER_COUNT = 10
const MIN_DELIVERED = 7 // 70%
const MAX_SCORE = 1000
const MOVE_DURATION = 120

// Canvas
const CELL_SIZE = 36
const CANVAS_W = GRID_SIZE * CELL_SIZE + 20
const CANVAS_H = GRID_SIZE * CELL_SIZE + 20
const OFFSET_X = 10
const OFFSET_Y = 10

const BG_COLOR = '#0A0E1A'
const FLOOR_COLOR = '#111420'
const ROAD_COLOR = '#1A2030'
const SIDEWALK_COLOR = '#181E30'
const SIDEWALK_SIDE = '#0E1220'
const SIDEWALK_HEIGHT = 3
const DRONE_COLORS = ['#3B82F6', '#22C55E', '#F59E0B', '#A855F7', '#EC4899']

// Ambient traffic dots
interface TrafficDot {
  x: number; y: number; vx: number; vy: number; alpha: number; size: number
}

const trafficDots: TrafficDot[] = Array.from({ length: 18 }, () => ({
  x: OFFSET_X + Math.random() * GRID_SIZE * CELL_SIZE,
  y: OFFSET_Y + Math.random() * GRID_SIZE * CELL_SIZE,
  vx: (Math.random() - 0.5) * 0.6,
  vy: (Math.random() - 0.5) * 0.6,
  alpha: 0.15 + Math.random() * 0.25,
  size: 1 + Math.random() * 1.5,
}))

// Delivery spark particles
interface DeliverySpark {
  x: number; y: number; vx: number; vy: number; alpha: number; color: string; life: number
}

let deliverySparks: DeliverySpark[] = []
const deliveredTimestamps: Map<number, number> = new Map()

function spawnDeliverySparks(cx: number, cy: number, color: string) {
  for (let i = 0; i < 14; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 0.8 + Math.random() * 2.5
    deliverySparks.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: 1,
      color,
      life: 30 + Math.random() * 20,
    })
  }
}

function isRoadTile(x: number, y: number): boolean {
  return (x + y) % 3 === 0
}

// Generate stable level data
function generateLevel() {
  // 5 drones at depots
  const drones = [
    { x: 0, y: 0 },
    { x: 11, y: 0 },
    { x: 0, y: 11 },
    { x: 11, y: 11 },
    { x: 6, y: 6 },
  ]

  // 10 delivery orders: pickup -> dropoff
  const orders = [
    { pickup: { x: 2, y: 1 }, dropoff: { x: 9, y: 3 } },
    { pickup: { x: 1, y: 4 }, dropoff: { x: 7, y: 8 } },
    { pickup: { x: 10, y: 2 }, dropoff: { x: 4, y: 10 } },
    { pickup: { x: 3, y: 7 }, dropoff: { x: 8, y: 1 } },
    { pickup: { x: 5, y: 3 }, dropoff: { x: 10, y: 9 } },
    { pickup: { x: 8, y: 5 }, dropoff: { x: 2, y: 11 } },
    { pickup: { x: 1, y: 9 }, dropoff: { x: 6, y: 2 } },
    { pickup: { x: 9, y: 10 }, dropoff: { x: 3, y: 4 } },
    { pickup: { x: 4, y: 6 }, dropoff: { x: 11, y: 7 } },
    { pickup: { x: 7, y: 0 }, dropoff: { x: 1, y: 6 } },
  ]

  return { drones, orders }
}

const STARTER_CODE_EN = `// MISSION: Air Convoy
// Manage 5 delivery drones to fulfill 10 orders.
// Must deliver at least 7 orders (70%).
//
// Available API:
//   fleet                   - array of 5 drones, each has:
//                             { id, x, y, carrying, busy }
//   orders                  - array of 10 orders, each has:
//                             { id, pickup: {x,y}, dropoff: {x,y}, delivered }
//   distance(a, b)          - Manhattan distance between two points
//   fleet.filter(fn)        - filter available drones
//   fleet.sort(fn)          - sort drones by criteria
//
//   drone.flyTo(x, y)       - fly a drone to position
//   drone.grab()            - pick up package at current location
//   drone.drop()            - deliver package at current location
//
// EXAMPLE for ONE order:
//   let d = fleet[0];
//   d.flyTo(orders[0].pickup.x, orders[0].pickup.y);
//   d.grab();
//   d.flyTo(orders[0].dropoff.x, orders[0].dropoff.y);
//   d.drop();
//
// STRATEGY: Loop through orders, find closest free drone,
// send it to pickup then dropoff.

// Write your routing algorithm below:

`

const STARTER_CODE_RU = `// МИССИЯ: Воздушный конвой
// Управляй 5 дронами для выполнения 10 заказов.
// Нужно доставить минимум 7 заказов (70%).
//
// Доступный API:
//   fleet                   - массив из 5 дронов, каждый имеет:
//                             { id, x, y, carrying, busy }
//   orders                  - массив из 10 заказов, каждый имеет:
//                             { id, pickup: {x,y}, dropoff: {x,y}, delivered }
//   distance(a, b)          - манхэттенское расстояние между двумя точками
//   fleet.filter(fn)        - отфильтровать доступных дронов
//   fleet.sort(fn)          - отсортировать дронов по критерию
//
//   drone.flyTo(x, y)       - отправить дрон в позицию
//   drone.grab()            - подобрать груз в текущей позиции
//   drone.drop()            - доставить груз в текущей позиции
//
// ПРИМЕР для ОДНОГО заказа:
//   let d = fleet[0];
//   d.flyTo(orders[0].pickup.x, orders[0].pickup.y);
//   d.grab();
//   d.flyTo(orders[0].dropoff.x, orders[0].dropoff.y);
//   d.drop();
//
// СТРАТЕГИЯ: Пройдись по заказам, найди ближайший свободный дрон,
// отправь его на погрузку, затем на доставку.

// Напиши свой алгоритм маршрутизации ниже:

`

const STARTER_CODE_AR = `// المهمة: القافلة الجوية
// أدِر 5 طائرات لتنفيذ 10 طلبات توصيل.
// يجب توصيل 7 طلبات على الأقل (70%).
//
// واجهة البرمجة المتاحة:
//   fleet                   - مصفوفة من 5 طائرات، كل منها يحتوي:
//                             { id, x, y, carrying, busy }
//   orders                  - مصفوفة من 10 طلبات، كل منها يحتوي:
//                             { id, pickup: {x,y}, dropoff: {x,y}, delivered }
//   distance(a, b)          - مسافة مانهاتن بين نقطتين
//   fleet.filter(fn)        - تصفية الطائرات المتاحة
//   fleet.sort(fn)          - ترتيب الطائرات حسب معيار
//
//   drone.flyTo(x, y)       - إرسال الطائرة إلى موقع
//   drone.grab()            - التقاط الطرد في الموقع الحالي
//   drone.drop()            - تسليم الطرد في الموقع الحالي
//
// مثال لطلب واحد:
//   let d = fleet[0];
//   d.flyTo(orders[0].pickup.x, orders[0].pickup.y);
//   d.grab();
//   d.flyTo(orders[0].dropoff.x, orders[0].dropoff.y);
//   d.drop();
//
// الاستراتيجية: كرر على الطلبات، ابحث عن أقرب طائرة متاحة،
// أرسلها للاستلام ثم للتسليم.

// اكتب خوارزمية التوجيه أدناه:

`

// ---------------------------------------------------------------------------
// Canvas rendering
// ---------------------------------------------------------------------------

function drawConvoyGrid(
  ctx: CanvasRenderingContext2D,
  dronePositions: Array<{ x: number; y: number }>,
  orders: Array<{ pickup: { x: number; y: number }; dropoff: { x: number; y: number }; delivered: boolean; pickedUp: boolean }>,
  routes: Array<Array<{ x: number; y: number }>>,
  time: number,
) {
  ctx.fillStyle = BG_COLOR
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // ── 1. Draw grid with 2.5D depth ──
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const px = OFFSET_X + x * CELL_SIZE
      const py = OFFSET_Y + y * CELL_SIZE
      const road = isRoadTile(x, y)

      if (road) {
        // Road surface
        ctx.fillStyle = ROAD_COLOR
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE)

        // Lane markings — subtle dashed center lines
        ctx.strokeStyle = '#2A3A4A'
        ctx.lineWidth = 0.7
        ctx.setLineDash([3, 5])
        // Horizontal lane
        ctx.beginPath()
        ctx.moveTo(px, py + CELL_SIZE / 2)
        ctx.lineTo(px + CELL_SIZE, py + CELL_SIZE / 2)
        ctx.stroke()
        // Vertical lane
        ctx.beginPath()
        ctx.moveTo(px + CELL_SIZE / 2, py)
        ctx.lineTo(px + CELL_SIZE / 2, py + CELL_SIZE)
        ctx.stroke()
        ctx.setLineDash([])
      } else {
        // Sidewalk — raised tile with side faces
        // Side face (bottom edge) for depth
        ctx.fillStyle = SIDEWALK_SIDE
        ctx.fillRect(px, py + CELL_SIZE - SIDEWALK_HEIGHT, CELL_SIZE, SIDEWALK_HEIGHT)
        // Side face (right edge)
        ctx.fillRect(px + CELL_SIZE - SIDEWALK_HEIGHT, py, SIDEWALK_HEIGHT, CELL_SIZE)
        // Top surface (slightly lighter, raised)
        ctx.fillStyle = SIDEWALK_COLOR
        ctx.fillRect(px, py, CELL_SIZE - SIDEWALK_HEIGHT, CELL_SIZE - SIDEWALK_HEIGHT)

        // Subtle highlight on top-left edge
        ctx.strokeStyle = '#222840'
        ctx.lineWidth = 0.5
        ctx.beginPath()
        ctx.moveTo(px, py + CELL_SIZE - SIDEWALK_HEIGHT)
        ctx.lineTo(px, py)
        ctx.lineTo(px + CELL_SIZE - SIDEWALK_HEIGHT, py)
        ctx.stroke()
      }

      // Subtle shadow/border between tiles
      ctx.strokeStyle = '#0A0E1A'
      ctx.lineWidth = 0.4
      ctx.strokeRect(px + 0.5, py + 0.5, CELL_SIZE - 1, CELL_SIZE - 1)
    }
  }

  // ── 2. Ambient traffic dots ──
  for (const dot of trafficDots) {
    dot.x += dot.vx
    dot.y += dot.vy
    // Wrap around
    const minX = OFFSET_X, maxX = OFFSET_X + GRID_SIZE * CELL_SIZE
    const minY = OFFSET_Y, maxY = OFFSET_Y + GRID_SIZE * CELL_SIZE
    if (dot.x < minX) dot.x = maxX
    if (dot.x > maxX) dot.x = minX
    if (dot.y < minY) dot.y = maxY
    if (dot.y > maxY) dot.y = minY

    ctx.fillStyle = `rgba(100, 140, 180, ${dot.alpha * (0.6 + 0.4 * Math.sin(time * 2 + dot.x))})`
    ctx.beginPath()
    ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2)
    ctx.fill()
  }

  // ── 3. Route lines with gradient opacity and arrows ──
  for (let di = 0; di < routes.length; di++) {
    const route = routes[di]
    if (route.length < 2) continue
    const color = DRONE_COLORS[di % DRONE_COLORS.length]
    const totalPts = route.length

    for (let i = 1; i < totalPts; i++) {
      const fromX = OFFSET_X + route[i - 1].x * CELL_SIZE + CELL_SIZE / 2
      const fromY = OFFSET_Y + route[i - 1].y * CELL_SIZE + CELL_SIZE / 2
      const toX = OFFSET_X + route[i].x * CELL_SIZE + CELL_SIZE / 2
      const toY = OFFSET_Y + route[i].y * CELL_SIZE + CELL_SIZE / 2

      // Opacity: brighter near the end (drone), fading for older segments
      const segProgress = i / totalPts
      const alpha = Math.max(0.08, segProgress * 0.6)

      ctx.strokeStyle = color
      ctx.globalAlpha = alpha
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(fromX, fromY)
      ctx.lineTo(toX, toY)
      ctx.stroke()

      // Direction arrow every 3rd segment
      if (i % 3 === 0) {
        const midX = (fromX + toX) / 2
        const midY = (fromY + toY) / 2
        const angle = Math.atan2(toY - fromY, toX - fromX)
        ctx.fillStyle = color
        ctx.globalAlpha = alpha * 0.9
        ctx.save()
        ctx.translate(midX, midY)
        ctx.rotate(angle)
        ctx.beginPath()
        ctx.moveTo(4, 0)
        ctx.lineTo(-3, -2.5)
        ctx.lineTo(-3, 2.5)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      }
    }
    ctx.globalAlpha = 1
  }

  // ── 4. Order markers: pickup warehouses, dropoff targets, delivered checks ──
  for (let oi = 0; oi < orders.length; oi++) {
    const order = orders[oi]

    // Pickup marker — 3D warehouse icon
    if (!order.pickedUp && !order.delivered) {
      const ppx = OFFSET_X + order.pickup.x * CELL_SIZE + CELL_SIZE / 2
      const ppy = OFFSET_Y + order.pickup.y * CELL_SIZE + CELL_SIZE / 2
      const bw = 12, bh = 10, bd = 4

      // Front face
      ctx.fillStyle = '#B8860B'
      ctx.fillRect(ppx - bw / 2, ppy - bh / 2, bw, bh)
      // Top face (lighter)
      ctx.fillStyle = '#DAA520'
      ctx.beginPath()
      ctx.moveTo(ppx - bw / 2, ppy - bh / 2)
      ctx.lineTo(ppx - bw / 2 + bd, ppy - bh / 2 - bd)
      ctx.lineTo(ppx + bw / 2 + bd, ppy - bh / 2 - bd)
      ctx.lineTo(ppx + bw / 2, ppy - bh / 2)
      ctx.closePath()
      ctx.fill()
      // Right face (darker)
      ctx.fillStyle = '#8B6914'
      ctx.beginPath()
      ctx.moveTo(ppx + bw / 2, ppy - bh / 2)
      ctx.lineTo(ppx + bw / 2 + bd, ppy - bh / 2 - bd)
      ctx.lineTo(ppx + bw / 2 + bd, ppy + bh / 2 - bd)
      ctx.lineTo(ppx + bw / 2, ppy + bh / 2)
      ctx.closePath()
      ctx.fill()

      // Label
      ctx.fillStyle = '#FFF'
      ctx.font = 'bold 7px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`P${oi}`, ppx, ppy)
    }

    // Dropoff marker — target circle with pulsing glow
    if (!order.delivered) {
      const dpx = OFFSET_X + order.dropoff.x * CELL_SIZE + CELL_SIZE / 2
      const dpy = OFFSET_Y + order.dropoff.y * CELL_SIZE + CELL_SIZE / 2
      const pulse = 0.5 + Math.sin(time * 3 + oi) * 0.3
      const markerColor = order.pickedUp ? '#22C55E' : '#EF4444'

      // Pulsing glow ring
      const glow = ctx.createRadialGradient(dpx, dpy, 4, dpx, dpy, 14)
      glow.addColorStop(0, markerColor + '44')
      glow.addColorStop(1, markerColor + '00')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(dpx, dpy, 14 * pulse + 4, 0, Math.PI * 2)
      ctx.fill()

      // Outer ring
      ctx.strokeStyle = markerColor
      ctx.globalAlpha = pulse
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(dpx, dpy, 9, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1

      // Inner ring
      ctx.strokeStyle = markerColor
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(dpx, dpy, 5, 0, Math.PI * 2)
      ctx.stroke()

      // Center dot
      ctx.fillStyle = markerColor
      ctx.beginPath()
      ctx.arc(dpx, dpy, 2, 0, Math.PI * 2)
      ctx.fill()

      // Label
      ctx.fillStyle = markerColor
      ctx.font = 'bold 6px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText(`D${oi}`, dpx, dpy - 10)
    } else {
      // Delivered — green checkmark with sparkle
      const dpx = OFFSET_X + order.dropoff.x * CELL_SIZE + CELL_SIZE / 2
      const dpy = OFFSET_Y + order.dropoff.y * CELL_SIZE + CELL_SIZE / 2

      // Spawn sparks once per delivery
      if (!deliveredTimestamps.has(oi)) {
        deliveredTimestamps.set(oi, time)
        spawnDeliverySparks(dpx, dpy, '#22C55E')
      }
      const dt = time - (deliveredTimestamps.get(oi) ?? time)
      const sparkle = dt < 1.0 ? 0.5 + Math.sin(dt * 20) * 0.5 : 0

      // Glow behind check
      if (sparkle > 0) {
        const sg = ctx.createRadialGradient(dpx, dpy, 2, dpx, dpy, 14)
        sg.addColorStop(0, `rgba(34, 197, 94, ${sparkle * 0.5})`)
        sg.addColorStop(1, 'rgba(34, 197, 94, 0)')
        ctx.fillStyle = sg
        ctx.beginPath()
        ctx.arc(dpx, dpy, 14, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.fillStyle = '#22C55E55'
      ctx.beginPath()
      ctx.arc(dpx, dpy, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#22C55E'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(dpx, dpy, 8, 0, Math.PI * 2)
      ctx.stroke()

      // Checkmark
      ctx.strokeStyle = '#22C55E'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(dpx - 4, dpy)
      ctx.lineTo(dpx - 1, dpy + 3)
      ctx.lineTo(dpx + 4, dpy - 3)
      ctx.stroke()
      ctx.lineCap = 'butt'
    }
  }

  // ── 5. Delivery spark particles ──
  deliverySparks = deliverySparks.filter(s => {
    s.x += s.vx
    s.y += s.vy
    s.vy += 0.05
    s.alpha -= 1 / s.life
    if (s.alpha <= 0) return false
    ctx.fillStyle = s.color
    ctx.globalAlpha = s.alpha
    ctx.beginPath()
    ctx.arc(s.x, s.y, 1.5, 0, Math.PI * 2)
    ctx.fill()
    return true
  })
  ctx.globalAlpha = 1

  // ── 6. Drones with propellers, shadow, hover, package ──
  for (let di = 0; di < dronePositions.length; di++) {
    const d = dronePositions[di]
    const cx = OFFSET_X + d.x * CELL_SIZE + CELL_SIZE / 2
    const cy = OFFSET_Y + d.y * CELL_SIZE + CELL_SIZE / 2
    const color = DRONE_COLORS[di % DRONE_COLORS.length]

    // Hover animation
    const hover = Math.sin(time * 4 + di * 1.3) * 2

    // Shadow on ground
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.beginPath()
    ctx.ellipse(cx, cy + 3, 7, 3, 0, 0, Math.PI * 2)
    ctx.fill()

    const dy = cy + hover

    // Check if this drone is carrying a package
    const isCarrying = orders.some(o => o.pickedUp && !o.delivered &&
      Math.abs(d.x - Math.round(d.x)) < 0.1 && Math.abs(d.y - Math.round(d.y)) < 0.1)

    // Package indicator (small box hanging below)
    if (isCarrying) {
      // String
      ctx.strokeStyle = '#888'
      ctx.lineWidth = 0.7
      ctx.beginPath()
      ctx.moveTo(cx, dy + 5)
      ctx.lineTo(cx, dy + 12)
      ctx.stroke()
      // Box
      ctx.fillStyle = '#C8A04A'
      ctx.fillRect(cx - 3, dy + 10, 6, 5)
      ctx.fillStyle = '#A07830'
      ctx.fillRect(cx + 3, dy + 10, 2, 5)
    }

    // Drone body — colored rectangle
    ctx.fillStyle = color
    const bw = 10, bh = 6
    const br = 2
    const bx = cx - bw / 2, by = dy - bh / 2
    ctx.beginPath()
    ctx.moveTo(bx + br, by)
    ctx.lineTo(bx + bw - br, by)
    ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + br)
    ctx.lineTo(bx + bw, by + bh - br)
    ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - br, by + bh)
    ctx.lineTo(bx + br, by + bh)
    ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - br)
    ctx.lineTo(bx, by + br)
    ctx.quadraticCurveTo(bx, by, bx + br, by)
    ctx.closePath()
    ctx.fill()
    // Body highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.fillRect(cx - bw / 2 + 1, dy - bh / 2 + 1, bw - 2, 2)

    // 4 propeller arms + spinning lines
    const armLen = 8
    const propAngle = time * 12 + di * Math.PI / 2
    const arms = [
      { ax: cx - 6, ay: dy - 4 },
      { ax: cx + 6, ay: dy - 4 },
      { ax: cx - 6, ay: dy + 4 },
      { ax: cx + 6, ay: dy + 4 },
    ]
    for (let ai = 0; ai < arms.length; ai++) {
      const arm = arms[ai]
      // Arm line from body
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(ai < 2 ? cx - (ai === 0 ? bw / 2 : -bw / 2) : cx - (ai === 2 ? bw / 2 : -bw / 2),
                 ai < 2 ? dy - bh / 2 : dy + bh / 2)
      ctx.lineTo(arm.ax, arm.ay)
      ctx.stroke()

      // Spinning propeller
      const pAngle = propAngle + ai * (Math.PI / 4)
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(arm.ax + Math.cos(pAngle) * armLen / 2, arm.ay + Math.sin(pAngle) * armLen / 2)
      ctx.lineTo(arm.ax - Math.cos(pAngle) * armLen / 2, arm.ay - Math.sin(pAngle) * armLen / 2)
      ctx.stroke()
      // Second blade perpendicular
      ctx.beginPath()
      ctx.moveTo(arm.ax + Math.cos(pAngle + Math.PI / 2) * armLen / 2, arm.ay + Math.sin(pAngle + Math.PI / 2) * armLen / 2)
      ctx.lineTo(arm.ax - Math.cos(pAngle + Math.PI / 2) * armLen / 2, arm.ay - Math.sin(pAngle + Math.PI / 2) * armLen / 2)
      ctx.stroke()

      // Propeller center dot
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(arm.ax, arm.ay, 1, 0, Math.PI * 2)
      ctx.fill()
    }

    // Drone ID label
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 6px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${di}`, cx, dy)

    // Glow under drone
    const glow = ctx.createRadialGradient(cx, cy + 2, 1, cx, cy + 2, 12)
    glow.addColorStop(0, color + '22')
    glow.addColorStop(1, color + '00')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(cx, cy + 2, 12, 0, Math.PI * 2)
    ctx.fill()
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

interface DroneMission9Props {
  onComplete: (score: number, breakdown: Array<{ label: string; value: number; max: number }>) => void
}

export default function DroneMission9({ onComplete }: DroneMission9Props) {
  const t = useTranslations('game')
  const locale = useLocale()
  const starterCode = locale === 'ru' ? STARTER_CODE_RU : locale === 'ar' ? STARTER_CODE_AR : STARTER_CODE_EN
  const canvasLabelsRef = useRef({ delivered: 'Delivered' })
  canvasLabelsRef.current.delivered = t('droneMission9.canvasDelivered')

  const [running, setRunning] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [codeError, setCodeError] = useState('')

  const levelRef = useRef(generateLevel())
  const dronePositionsRef = useRef(levelRef.current.drones.map(d => ({ ...d })))
  const ordersDisplayRef = useRef(levelRef.current.orders.map(o => ({ ...o, delivered: false, pickedUp: false })))
  const routesRef = useRef<Array<Array<{ x: number; y: number }>>>(levelRef.current.drones.map(d => [{ ...d }]))
  const confettiRef = useRef<ConfettiParticle[]>([])
  const canvasCtxRef = useRef<CanvasRenderingContext2D | null>(null)
  const timeRef = useRef(0)
  const animFrameRef = useRef(0)
  const hudRef = useRef({ delivered: 0 })

  useEffect(() => {
    let active = true
    const loop = () => {
      if (!active) return
      const ctx = canvasCtxRef.current
      if (ctx) {
        timeRef.current += 0.016
        drawConvoyGrid(
          ctx,
          dronePositionsRef.current,
          ordersDisplayRef.current,
          routesRef.current,
          timeRef.current,
        )

        ctx.fillStyle = '#fff'
        ctx.font = 'bold 11px sans-serif'
        ctx.textAlign = 'right'
        ctx.textBaseline = 'top'
        ctx.fillText(`${canvasLabelsRef.current.delivered}: ${hudRef.current.delivered}/${ORDER_COUNT}`, CANVAS_W - 10, 6)

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

  const animatePath = useCallback(async (state: ConvoyState) => {
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

        // Add to route
        const newRoutes = [...routesRef.current]
        newRoutes[di] = [...newRoutes[di], { x: step.x, y: step.y }]
        routesRef.current = newRoutes
      } else if (step.type === 'grab') {
        const newOrders = [...ordersDisplayRef.current]
        if (step.orderIndex >= 0 && step.orderIndex < newOrders.length) {
          newOrders[step.orderIndex] = { ...newOrders[step.orderIndex], pickedUp: true }
          ordersDisplayRef.current = newOrders
        }
        await new Promise(r => setTimeout(r, 100))
      } else if (step.type === 'drop') {
        const newOrders = [...ordersDisplayRef.current]
        if (step.orderIndex >= 0 && step.orderIndex < newOrders.length) {
          newOrders[step.orderIndex] = { ...newOrders[step.orderIndex], delivered: true }
          ordersDisplayRef.current = newOrders
          hudRef.current = { delivered: hudRef.current.delivered + 1 }
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

    // Reset state
    const level = levelRef.current
    dronePositionsRef.current = level.drones.map(d => ({ ...d }))
    ordersDisplayRef.current = level.orders.map(o => ({ ...o, delivered: false, pickedUp: false }))
    routesRef.current = level.drones.map(d => [{ ...d }])
    hudRef.current = { delivered: 0 }
    deliveredTimestamps.clear()
    deliverySparks = []

    const result = executeConvoyCode(
      code, level.drones, level.orders, GRID_SIZE,
    )

    if (!result.success) {
      await animatePath(result.state)
      setCodeError(result.error ?? 'Execution error')
      setRunning(false)
      return
    }

    await animatePath(result.state)

    const { state } = result
    const delivered = state.deliveredCount

    if (delivered >= MIN_DELIVERED) {
      const correctness = Math.round(500 * (delivered / ORDER_COUNT))
      const optimalDist = state.totalDistance
      const maxDist = GRID_SIZE * 2 * ORDER_COUNT // worst-case estimate
      const effRatio = Math.max(0, 1 - (optimalDist / maxDist))
      const efficiency = Math.round(350 * effRatio)
      const style = state.usedSort ? 150 : (state.usedFilter ? 75 : 0)
      const totalScore = Math.min(MAX_SCORE, correctness + efficiency + style)

      confettiRef.current = createConfetti(CANVAS_W / 2, CANVAS_H / 2)
      setCompleted(true)
      setStatusMessage(t('droneMission9.success', { delivered, total: ORDER_COUNT }))
      setRunning(false)

      await new Promise(r => setTimeout(r, 2000))

      onComplete(totalScore, [
        { label: t('droneMission9.scoreCorrectness'), value: correctness, max: 500 },
        { label: t('droneMission9.scoreEfficiency'), value: efficiency, max: 350 },
        { label: t('droneMission9.scoreStyle'), value: style, max: 150 },
      ])
    } else {
      setRunning(false)
      setStatusMessage(t('droneMission9.notEnough', { delivered, needed: MIN_DELIVERED }))
    }
  }, [running, t, onComplete, animatePath])

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-shrink-0">
        <p className="text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">
          {t('droneMission9.simulationGrid')}
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
          {DRONE_COLORS.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} /> {t('droneMission9.legendDroneLabel')} {i}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-yellow-500/50" /> {t('droneMission9.legendPickup')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-red-500/50" /> {t('droneMission9.legendDropoff')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-green-500/50" /> {t('droneMission9.legendDeliveredLabel')}
          </span>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">
          {t('droneMission9.yourCode')}
        </p>
        <SimpleCodeEditor
          starterCode={starterCode}
          onRun={handleRun}
          disabled={completed}
          running={running}
          error={codeError}
          hint={t('droneMission9.tip')}
        />
      </div>
    </div>
  )
}
