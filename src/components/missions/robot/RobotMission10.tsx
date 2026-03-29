'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import clsx from 'clsx'
import { useTranslations } from 'next-intl'
import type { ScoreBreakdownItem } from '@/components/missions/common/MissionShell'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RobotType {
  id: string
  name: string
  cost: number
  pros: string
  cons: string
  color: string
}

interface Zone {
  id: number
  x: number
  y: number
  w: number
  h: number
  name: string
  color: string
}

interface ChargingStation {
  id: number
  x: number
  y: number
}

interface CityParticle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  alpha: number
}

export interface RobotMission10Props {
  onComplete?: (score: number, breakdown: ScoreBreakdownItem[]) => void
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const BUDGET = 500
const CHARGING_STATION_COST = 50
const CHARGING_RADIUS = 100 // pixels = 100m equivalent
const MAX_ROBOTS = 5

const ROBOT_CATALOG: RobotType[] = [
  { id: 'patrol',    name: 'patrol',    cost: 40, pros: 'proPatrol',    cons: 'conPatrol',    color: '#3B82F6' },
  { id: 'cargo',     name: 'cargo',     cost: 60, pros: 'proCargo',     cons: 'conCargo',     color: '#F59E0B' },
  { id: 'medical',   name: 'medical',   cost: 80, pros: 'proMedical',   cons: 'conMedical',   color: '#EF4444' },
  { id: 'cleaner',   name: 'cleaner',   cost: 30, pros: 'proCleaner',   cons: 'conCleaner',   color: '#22C55E' },
  { id: 'delivery',  name: 'delivery',  cost: 50, pros: 'proDelivery',  cons: 'conDelivery',  color: '#8B5CF6' },
  { id: 'builder',   name: 'builder',   cost: 70, pros: 'proBuilder',   cons: 'conBuilder',   color: '#EC4899' },
  { id: 'educator',  name: 'educator',  cost: 45, pros: 'proEducator',  cons: 'conEducator',  color: '#06B6D4' },
  { id: 'security',  name: 'security',  cost: 55, pros: 'proSecurity',  cons: 'conSecurity',  color: '#D97706' },
]

const CITY_ZONES: Zone[] = [
  { id: 1, x: 20,  y: 20,  w: 170, h: 160, name: 'residential', color: 'rgba(34, 197, 94, 0.15)' },
  { id: 2, x: 210, y: 20,  w: 170, h: 160, name: 'commercial',  color: 'rgba(59, 130, 246, 0.15)' },
  { id: 3, x: 400, y: 20,  w: 180, h: 160, name: 'industrial',  color: 'rgba(245, 158, 11, 0.15)' },
  { id: 4, x: 20,  y: 210, w: 170, h: 160, name: 'medical',     color: 'rgba(239, 68, 68, 0.15)' },
  { id: 5, x: 210, y: 210, w: 170, h: 160, name: 'education',   color: 'rgba(139, 92, 246, 0.15)' },
  { id: 6, x: 400, y: 210, w: 180, h: 160, name: 'park',        color: 'rgba(6, 182, 212, 0.15)' },
]

// Road segments for the city (connecting zones)
const ROADS = [
  // Horizontal roads
  { x1: 0, y1: 190, x2: 600, y2: 190 },   // middle horizontal
  { x1: 0, y1: 10, x2: 600, y2: 10 },      // top edge
  { x1: 0, y1: 380, x2: 600, y2: 380 },    // bottom edge
  // Vertical roads
  { x1: 200, y1: 0, x2: 200, y2: 400 },   // left vertical
  { x1: 390, y1: 0, x2: 390, y2: 400 },   // right vertical
]

function zoneCenter(zone: Zone): { x: number; y: number } {
  return { x: zone.x + zone.w / 2, y: zone.y + zone.h / 2 }
}

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

// ---------------------------------------------------------------------------
// 2.5D Drawing helpers
// ---------------------------------------------------------------------------

const CW = 600
const CH = 400

// Draw a 3D building block
function drawBuilding(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, buildingH: number, baseColor: string, roofColor: string, time: number, lit: boolean) {
  const depth = buildingH * 0.6

  // Right side face
  ctx.beginPath()
  ctx.moveTo(x + w, y)
  ctx.lineTo(x + w, y + h)
  ctx.lineTo(x + w + depth * 0.3, y + h - depth * 0.5)
  ctx.lineTo(x + w + depth * 0.3, y - depth * 0.5)
  ctx.closePath()
  // Darken the side
  const sideR = parseInt(baseColor.slice(1, 3), 16) * 0.6
  const sideG = parseInt(baseColor.slice(3, 5), 16) * 0.6
  const sideB = parseInt(baseColor.slice(5, 7), 16) * 0.6
  ctx.fillStyle = `rgb(${Math.round(sideR)},${Math.round(sideG)},${Math.round(sideB)})`
  ctx.fill()

  // Front face
  ctx.fillStyle = baseColor
  ctx.fillRect(x, y, w, h)

  // Top face (roof)
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + depth * 0.3, y - depth * 0.5)
  ctx.lineTo(x + w + depth * 0.3, y - depth * 0.5)
  ctx.lineTo(x + w, y)
  ctx.closePath()
  ctx.fillStyle = roofColor
  ctx.fill()

  // Windows
  if (h > 20) {
    const cols = Math.max(1, Math.floor(w / 14))
    const rows = Math.max(1, Math.floor(h / 16))
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const wx = x + 5 + col * (w - 10) / cols
        const wy = y + 5 + row * (h - 10) / rows
        const winLit = lit && Math.sin(time * 2 + col + row * 3) > -0.3
        ctx.fillStyle = winLit ? 'rgba(250, 204, 21, 0.7)' : 'rgba(100, 120, 140, 0.3)'
        ctx.fillRect(wx, wy, 6, 8)
      }
    }
  }
}

// Draw an isometric tree
function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  // Trunk
  ctx.fillStyle = '#6B4423'
  ctx.fillRect(x - 2, y - size * 0.4, 4, size * 0.5)

  // Canopy layers (3D-ish)
  const layers = 3
  for (let i = layers - 1; i >= 0; i--) {
    const ly = y - size * 0.4 - i * size * 0.25
    const lr = Math.max(1, size * 0.35 - i * 2)
    const shade = 100 + i * 30
    ctx.fillStyle = `rgb(${30 + i * 10}, ${shade}, ${30 + i * 5})`
    ctx.beginPath()
    ctx.ellipse(x, ly, lr, lr * 0.6, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)'
  ctx.beginPath()
  ctx.ellipse(x + 3, y + 2, size * 0.3, size * 0.12, 0.3, 0, Math.PI * 2)
  ctx.fill()
}

// Draw a street light with light cone
function drawStreetLight(ctx: CanvasRenderingContext2D, x: number, y: number, nightLevel: number) {
  // Pole
  ctx.strokeStyle = '#6B7280'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x, y - 25)
  ctx.stroke()

  // Lamp arm
  ctx.beginPath()
  ctx.moveTo(x, y - 25)
  ctx.lineTo(x + 8, y - 27)
  ctx.stroke()

  // Light bulb
  ctx.fillStyle = nightLevel > 0.3 ? '#FCD34D' : '#9CA3AF'
  ctx.beginPath()
  ctx.arc(x + 8, y - 27, 2.5, 0, Math.PI * 2)
  ctx.fill()

  // Light cone (only at night)
  if (nightLevel > 0.3) {
    const coneGrad = ctx.createRadialGradient(x + 8, y - 25, 0, x + 8, y - 5, 30)
    coneGrad.addColorStop(0, `rgba(252, 211, 77, ${nightLevel * 0.25})`)
    coneGrad.addColorStop(1, 'transparent')
    ctx.fillStyle = coneGrad
    ctx.beginPath()
    ctx.moveTo(x + 4, y - 25)
    ctx.lineTo(x - 12, y + 5)
    ctx.lineTo(x + 28, y + 5)
    ctx.closePath()
    ctx.fill()
  }
}

// Draw a car silhouette
function drawCar(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, facingRight: boolean) {
  ctx.fillStyle = color
  const dir = facingRight ? 1 : -1

  // Body
  ctx.beginPath()
  ctx.roundRect(x - 8 * dir, y - 3, 16, 6, 2)
  ctx.fill()

  // Cabin
  ctx.fillStyle = 'rgba(100,150,200,0.5)'
  ctx.beginPath()
  ctx.roundRect(x - 3 * dir, y - 6, 8, 4, 1)
  ctx.fill()

  // Wheels
  ctx.fillStyle = '#1F2937'
  ctx.beginPath()
  ctx.arc(x - 5 * dir, y + 3, 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x + 5 * dir, y + 3, 2, 0, Math.PI * 2)
  ctx.fill()
}

// Draw a 2.5D robot unit on roads
function drawRobotUnit(ctx: CanvasRenderingContext2D, x: number, y: number, robotType: string, color: string, time: number) {
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.beginPath()
  ctx.ellipse(x, y + 5, 7, 3, 0, 0, Math.PI * 2)
  ctx.fill()

  // Different shapes per robot type
  switch (robotType) {
    case 'patrol':
    case 'security': {
      // Hexagonal body
      ctx.fillStyle = color
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 6
        const px = x + Math.cos(angle) * 6
        const py = y + Math.sin(angle) * 5
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.fill()
      // Rotating scanner
      const scanAngle = time * 3
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.cos(scanAngle) * 8, y + Math.sin(scanAngle) * 5)
      ctx.stroke()
      break
    }
    case 'cargo':
    case 'builder': {
      // Box shape
      ctx.fillStyle = color
      ctx.fillRect(x - 7, y - 5, 14, 10)
      // Top face
      ctx.beginPath()
      ctx.moveTo(x - 7, y - 5)
      ctx.lineTo(x - 4, y - 8)
      ctx.lineTo(x + 10, y - 8)
      ctx.lineTo(x + 7, y - 5)
      ctx.closePath()
      const darkerColor = color.replace(/[0-9a-f]{2}$/i, '99')
      ctx.fillStyle = darkerColor
      ctx.fill()
      break
    }
    case 'medical': {
      // Rounded with cross
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(x, y, 7, 0, Math.PI * 2)
      ctx.fill()
      // Cross
      ctx.fillStyle = '#fff'
      ctx.fillRect(x - 1, y - 4, 2, 8)
      ctx.fillRect(x - 4, y - 1, 8, 2)
      break
    }
    case 'cleaner': {
      // Circular with spinning brush
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(x, y, 6, 0, Math.PI * 2)
      ctx.fill()
      // Spinning brush lines
      for (let i = 0; i < 4; i++) {
        const bAngle = time * 5 + (i / 4) * Math.PI * 2
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x + Math.cos(bAngle) * 3, y + Math.sin(bAngle) * 3)
        ctx.lineTo(x + Math.cos(bAngle) * 8, y + Math.sin(bAngle) * 6)
        ctx.stroke()
      }
      break
    }
    case 'delivery': {
      // Triangular / arrow shape
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(x + 8, y)
      ctx.lineTo(x - 6, y - 5)
      ctx.lineTo(x - 4, y)
      ctx.lineTo(x - 6, y + 5)
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'educator': {
      // Diamond shape
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(x, y - 7)
      ctx.lineTo(x + 7, y)
      ctx.lineTo(x, y + 7)
      ctx.lineTo(x - 7, y)
      ctx.closePath()
      ctx.fill()
      // Screen
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.fillRect(x - 3, y - 3, 6, 4)
      break
    }
    default: {
      // Default circle
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(x, y, 6, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Glow aura
  const glowGrad = ctx.createRadialGradient(x, y, 2, x, y, 12)
  glowGrad.addColorStop(0, color.replace(')', ', 0.2)').replace('rgb', 'rgba'))
  glowGrad.addColorStop(1, 'transparent')
  ctx.fillStyle = glowGrad
  ctx.beginPath()
  ctx.arc(x, y, 12, 0, Math.PI * 2)
  ctx.fill()
}

// Draw 3D charging station
function drawChargingStation3D(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, radius: number) {
  // Pulsing charge radius
  const pulseSize = radius + Math.sin(time * 2) * 5
  const radiusGrad = ctx.createRadialGradient(x, y, 0, x, y, pulseSize)
  radiusGrad.addColorStop(0, 'rgba(250, 204, 21, 0.08)')
  radiusGrad.addColorStop(0.7, 'rgba(250, 204, 21, 0.03)')
  radiusGrad.addColorStop(1, 'transparent')
  ctx.fillStyle = radiusGrad
  ctx.beginPath()
  ctx.arc(x, y, pulseSize, 0, Math.PI * 2)
  ctx.fill()

  // Radius border ring
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.15)'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])

  // Station base (3D box)
  const bw = 14
  const bh = 16
  const bd = 5

  // Right side
  ctx.fillStyle = '#B8860B'
  ctx.beginPath()
  ctx.moveTo(x + bw / 2, y - bh / 2)
  ctx.lineTo(x + bw / 2 + bd, y - bh / 2 - bd * 0.4)
  ctx.lineTo(x + bw / 2 + bd, y + bh / 2 - bd * 0.4)
  ctx.lineTo(x + bw / 2, y + bh / 2)
  ctx.closePath()
  ctx.fill()

  // Front face
  ctx.fillStyle = '#D4A017'
  ctx.fillRect(x - bw / 2, y - bh / 2, bw, bh)

  // Top face
  ctx.fillStyle = '#E8C547'
  ctx.beginPath()
  ctx.moveTo(x - bw / 2, y - bh / 2)
  ctx.lineTo(x - bw / 2 + bd, y - bh / 2 - bd * 0.4)
  ctx.lineTo(x + bw / 2 + bd, y - bh / 2 - bd * 0.4)
  ctx.lineTo(x + bw / 2, y - bh / 2)
  ctx.closePath()
  ctx.fill()

  // Lightning bolt icon
  ctx.fillStyle = '#000'
  ctx.font = 'bold 10px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('\u26A1', x, y)
  ctx.textBaseline = 'alphabetic'

  // Glow on top
  const stationGlow = ctx.createRadialGradient(x, y - bh / 2 - 3, 0, x, y - bh / 2 - 3, 10)
  stationGlow.addColorStop(0, `rgba(250, 204, 21, ${0.3 + Math.sin(time * 4) * 0.15})`)
  stationGlow.addColorStop(1, 'transparent')
  ctx.fillStyle = stationGlow
  ctx.beginPath()
  ctx.arc(x, y - bh / 2 - 3, 10, 0, Math.PI * 2)
  ctx.fill()
}

// Draw park bench
function drawBench(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#8B6914'
  // Seat
  ctx.fillRect(x - 8, y - 2, 16, 3)
  // Legs
  ctx.fillRect(x - 7, y + 1, 2, 4)
  ctx.fillRect(x + 5, y + 1, 2, 4)
  // Back
  ctx.fillRect(x - 8, y - 5, 16, 2)
}

// ---------------------------------------------------------------------------
// City Map Canvas
// ---------------------------------------------------------------------------

function CityMapCanvas({
  zones,
  chargingStations,
  selectedRobots,
  onClickMap,
  isRunning,
  simProgress,
  t,
}: {
  zones: Zone[]
  chargingStations: ChargingStation[]
  selectedRobots: string[]
  onClickMap: (x: number, y: number) => void
  isRunning: boolean
  simProgress: number | null
  t: (key: string) => string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const timeRef = useRef<number>(0)
  const particlesRef = useRef<CityParticle[]>([])

  const coverage = useMemo(() => {
    return zones.map(zone => {
      const center = zoneCenter(zone)
      const hasStation = chargingStations.some(
        s => distance(s.x, s.y, center.x, center.y) <= CHARGING_RADIUS
      )
      const hasRobot = selectedRobots.length > 0
      return { zoneId: zone.id, covered: hasStation && hasRobot }
    })
  }, [zones, chargingStations, selectedRobots])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width
    const H = canvas.height

    let active = true

    function render() {
      if (!active || !ctx) return
      timeRef.current += 0.016

      const time = timeRef.current
      const sp = simProgress ?? 0
      const isSimDone = simProgress !== null && simProgress >= 1

      // Day/night cycle during simulation
      // nightLevel: 0 = day, 1 = full night
      let nightLevel = 0
      if (simProgress !== null && simProgress > 0) {
        // Simulate 12 months: goes through 2 day/night cycles
        nightLevel = Math.max(0, Math.sin(sp * Math.PI * 4) * 0.6)
      }

      ctx.clearRect(0, 0, W, H)

      // Background - sky gradient based on day/night
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H)
      const dayR = 15, dayG = 23, dayB = 42
      const nightR = 5, nightG = 8, nightB = 20
      const r = Math.round(dayR + (nightR - dayR) * nightLevel)
      const g = Math.round(dayG + (nightG - dayG) * nightLevel)
      const b = Math.round(dayB + (nightB - dayB) * nightLevel)
      skyGrad.addColorStop(0, `rgb(${r},${g},${b})`)
      skyGrad.addColorStop(1, `rgb(${Math.max(0, r - 5)},${Math.max(0, g - 5)},${Math.max(0, b - 5)})`)
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, W, H)

      // Subtle grid
      ctx.strokeStyle = `rgba(255,255,255,${0.03 - nightLevel * 0.01})`
      ctx.lineWidth = 0.5
      for (let x = 0; x < W; x += 20) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, H)
        ctx.stroke()
      }
      for (let y = 0; y < H; y += 20) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(W, y)
        ctx.stroke()
      }

      // Roads with lane markings
      for (const road of ROADS) {
        const isHorizontal = road.y1 === road.y2
        if (isHorizontal) {
          // Road surface
          ctx.fillStyle = 'rgba(55, 65, 81, 0.8)'
          ctx.fillRect(road.x1, road.y1 - 8, road.x2 - road.x1, 16)

          // Lane markings (dashed center line)
          ctx.strokeStyle = 'rgba(250, 204, 21, 0.3)'
          ctx.lineWidth = 1
          ctx.setLineDash([8, 8])
          ctx.beginPath()
          ctx.moveTo(road.x1, road.y1)
          ctx.lineTo(road.x2, road.y1)
          ctx.stroke()
          ctx.setLineDash([])

          // Road edges
          ctx.strokeStyle = 'rgba(255,255,255,0.1)'
          ctx.lineWidth = 0.5
          ctx.beginPath()
          ctx.moveTo(road.x1, road.y1 - 8)
          ctx.lineTo(road.x2, road.y1 - 8)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(road.x1, road.y1 + 8)
          ctx.lineTo(road.x2, road.y1 + 8)
          ctx.stroke()
        } else {
          // Vertical road
          ctx.fillStyle = 'rgba(55, 65, 81, 0.8)'
          ctx.fillRect(road.x1 - 8, road.y1, 16, road.y2 - road.y1)

          ctx.strokeStyle = 'rgba(250, 204, 21, 0.3)'
          ctx.lineWidth = 1
          ctx.setLineDash([8, 8])
          ctx.beginPath()
          ctx.moveTo(road.x1, road.y1)
          ctx.lineTo(road.x1, road.y2)
          ctx.stroke()
          ctx.setLineDash([])

          ctx.strokeStyle = 'rgba(255,255,255,0.1)'
          ctx.lineWidth = 0.5
          ctx.beginPath()
          ctx.moveTo(road.x1 - 8, road.y1)
          ctx.lineTo(road.x1 - 8, road.y2)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(road.x1 + 8, road.y1)
          ctx.lineTo(road.x1 + 8, road.y2)
          ctx.stroke()
        }
      }

      // Zone fills and 3D borders
      for (const zone of zones) {
        const covData = coverage.find(c => c.zoneId === zone.id)
        const isCovered = covData?.covered ?? false

        // Zone fill with slight 3D border
        ctx.fillStyle = zone.color
        ctx.fillRect(zone.x, zone.y, zone.w, zone.h)

        // 3D border effect (raised edges)
        const borderColor = isCovered ? 'rgba(34, 197, 94, 0.5)' : 'rgba(55, 65, 81, 0.5)'
        const borderDepth = 3

        // Top edge highlight
        ctx.fillStyle = isCovered ? 'rgba(34, 197, 94, 0.2)' : 'rgba(80, 90, 100, 0.2)'
        ctx.beginPath()
        ctx.moveTo(zone.x, zone.y)
        ctx.lineTo(zone.x + zone.w, zone.y)
        ctx.lineTo(zone.x + zone.w - borderDepth, zone.y + borderDepth)
        ctx.lineTo(zone.x + borderDepth, zone.y + borderDepth)
        ctx.closePath()
        ctx.fill()

        // Right edge shadow
        ctx.fillStyle = isCovered ? 'rgba(20, 120, 60, 0.2)' : 'rgba(30, 40, 50, 0.3)'
        ctx.beginPath()
        ctx.moveTo(zone.x + zone.w, zone.y)
        ctx.lineTo(zone.x + zone.w, zone.y + zone.h)
        ctx.lineTo(zone.x + zone.w - borderDepth, zone.y + zone.h - borderDepth)
        ctx.lineTo(zone.x + zone.w - borderDepth, zone.y + borderDepth)
        ctx.closePath()
        ctx.fill()

        // Border stroke
        ctx.strokeStyle = borderColor
        ctx.lineWidth = isCovered ? 2 : 1
        ctx.strokeRect(zone.x, zone.y, zone.w, zone.h)

        // Coverage signal strength gradient (only if covered)
        if (isCovered) {
          const center = zoneCenter(zone)
          const nearestStation = chargingStations.reduce((best, s) => {
            const d = distance(s.x, s.y, center.x, center.y)
            return d < best.d ? { d, s } : best
          }, { d: Infinity, s: chargingStations[0] })

          if (nearestStation.s) {
            const sigGrad = ctx.createRadialGradient(
              nearestStation.s.x, nearestStation.s.y, 0,
              nearestStation.s.x, nearestStation.s.y, CHARGING_RADIUS
            )
            sigGrad.addColorStop(0, 'rgba(34, 197, 94, 0.08)')
            sigGrad.addColorStop(1, 'transparent')
            ctx.fillStyle = sigGrad

            // Clip to zone
            ctx.save()
            ctx.beginPath()
            ctx.rect(zone.x, zone.y, zone.w, zone.h)
            ctx.clip()
            ctx.fillRect(0, 0, W, H)
            ctx.restore()
          }
        }
      }

      // Buildings (3D blocks with side faces and rooftops)
      const buildingsData = [
        // Residential
        { x: 35, y: 50, w: 25, h: 35, bh: 12, base: '#4A6741', roof: '#5C8350' },
        { x: 75, y: 40, w: 30, h: 50, bh: 18, base: '#3D5C36', roof: '#4E7445' },
        { x: 130, y: 55, w: 20, h: 30, bh: 10, base: '#4A6741', roof: '#5C8350' },
        { x: 120, y: 100, w: 35, h: 40, bh: 15, base: '#3D5C36', roof: '#4E7445' },
        // Commercial
        { x: 225, y: 35, w: 35, h: 55, bh: 22, base: '#3B5998', roof: '#4A6BC4' },
        { x: 280, y: 45, w: 40, h: 45, bh: 20, base: '#2E4A7A', roof: '#3B5998' },
        { x: 330, y: 60, w: 25, h: 35, bh: 14, base: '#3B5998', roof: '#4A6BC4' },
        { x: 240, y: 110, w: 30, h: 30, bh: 12, base: '#2E4A7A', roof: '#3B5998' },
        // Industrial
        { x: 415, y: 35, w: 45, h: 40, bh: 16, base: '#8B6914', roof: '#A67C1A' },
        { x: 480, y: 45, w: 50, h: 50, bh: 20, base: '#7A5C10', roof: '#8B6914' },
        { x: 420, y: 100, w: 40, h: 35, bh: 14, base: '#8B6914', roof: '#A67C1A' },
        // Medical
        { x: 35, y: 230, w: 40, h: 45, bh: 18, base: '#8B3030', roof: '#A53838' },
        { x: 100, y: 240, w: 30, h: 35, bh: 14, base: '#7A2828', roof: '#8B3030' },
        { x: 60, y: 300, w: 35, h: 40, bh: 16, base: '#8B3030', roof: '#A53838' },
        // Education
        { x: 225, y: 230, w: 45, h: 50, bh: 20, base: '#5B3E8A', roof: '#6F4EA0' },
        { x: 290, y: 245, w: 35, h: 40, bh: 16, base: '#4A3275', roof: '#5B3E8A' },
        { x: 340, y: 260, w: 25, h: 30, bh: 12, base: '#5B3E8A', roof: '#6F4EA0' },
        // Park (fewer buildings, more trees)
        { x: 430, y: 280, w: 30, h: 25, bh: 10, base: '#2A7070', roof: '#338888' },
      ]

      // City warm glow if simulation done
      const cityLit = isSimDone || nightLevel > 0.2

      for (const b of buildingsData) {
        drawBuilding(ctx, b.x, b.y, b.w, b.h, b.bh, b.base, b.roof, time, cityLit)
      }

      // Trees (mostly in park zone, some elsewhere)
      const treePositions = [
        { x: 420, y: 240 }, { x: 450, y: 250 }, { x: 470, y: 235 },
        { x: 500, y: 260 }, { x: 520, y: 245 }, { x: 540, y: 270 },
        { x: 490, y: 310 }, { x: 510, y: 330 }, { x: 555, y: 300 },
        { x: 440, y: 355 }, { x: 475, y: 345 }, { x: 530, y: 355 },
        // Some trees in residential
        { x: 160, y: 75 }, { x: 50, y: 145 },
        // Near education
        { x: 360, y: 290 },
      ]
      for (const tp of treePositions) {
        drawTree(ctx, tp.x, tp.y, 14 + Math.sin(tp.x + tp.y) * 3)
      }

      // Park benches
      drawBench(ctx, 460, 300)
      drawBench(ctx, 520, 325)

      // Street lights along roads
      const streetLightPositions = [
        { x: 200, y: 50 }, { x: 200, y: 130 }, { x: 200, y: 250 }, { x: 200, y: 340 },
        { x: 390, y: 50 }, { x: 390, y: 130 }, { x: 390, y: 250 }, { x: 390, y: 340 },
        { x: 100, y: 190 }, { x: 300, y: 190 }, { x: 500, y: 190 },
      ]
      for (const sl of streetLightPositions) {
        drawStreetLight(ctx, sl.x, sl.y, nightLevel)
      }

      // Traffic (cars on roads) during simulation
      if (simProgress !== null && simProgress > 0.1) {
        const carColors = ['#6B7280', '#4B5563', '#374151', '#DC2626', '#2563EB']
        // Horizontal road cars
        for (let i = 0; i < 5; i++) {
          const carX = (time * 40 * (i + 1) + i * 120) % (W + 40) - 20
          const carY = 190 + (i % 2 === 0 ? -3 : 3)
          drawCar(ctx, carX, carY, carColors[i % carColors.length], i % 2 === 0)
        }
        // Vertical road cars (simplified as dots moving)
        for (let i = 0; i < 3; i++) {
          const carY = (time * 30 * (i + 1) + i * 140) % (H + 40) - 20
          const carX = i < 2 ? 200 + (i % 2 === 0 ? -3 : 3) : 390 + (i % 2 === 0 ? -3 : 3)
          // Rotated car for vertical road - just draw a dot/rectangle
          ctx.fillStyle = carColors[(i + 2) % carColors.length]
          ctx.fillRect(carX - 3, carY - 7, 6, 14)
          ctx.fillStyle = 'rgba(100,150,200,0.5)'
          ctx.fillRect(carX - 2, carY - 3, 4, 6)
          ctx.fillStyle = '#1F2937'
          ctx.beginPath()
          ctx.arc(carX - 3, carY - 5, 2, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(carX - 3, carY + 5, 2, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Charging stations (3D)
      for (const station of chargingStations) {
        drawChargingStation3D(ctx, station.x, station.y, time, CHARGING_RADIUS)
      }

      // Zone labels
      for (const zone of zones) {
        const center = zoneCenter(zone)
        const covData = coverage.find(c => c.zoneId === zone.id)
        const isCovered = covData?.covered ?? false

        ctx.fillStyle = 'rgba(0,0,0,0.4)'
        const labelText = t(`zones.${zone.name}`)
        const labelWidth = ctx.measureText(labelText).width + 12
        ctx.beginPath()
        ctx.roundRect(center.x - labelWidth / 2, center.y - 12, labelWidth, 16, 3)
        ctx.fill()

        ctx.fillStyle = '#E5E7EB'
        ctx.font = 'bold 10px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(labelText, center.x, center.y)

        // Coverage indicator below
        ctx.fillStyle = isCovered ? '#22C55E' : '#6B7280'
        ctx.font = '9px sans-serif'
        ctx.fillText(isCovered ? '\u2713 ' + t('covered') : '\u2717 ' + t('notCovered'), center.x, center.y + 14)
      }

      // Robot units during simulation - moving along roads with glowing patrol paths
      if (simProgress !== null && simProgress > 0) {
        for (let i = 0; i < selectedRobots.length; i++) {
          const robotId = selectedRobots[i]
          const robotData = ROBOT_CATALOG.find(r => r.id === robotId)
          if (!robotData) continue

          const zoneIdx = i % zones.length
          const center = zoneCenter(zones[zoneIdx])

          // Robot moves along an elliptical path around zone center, staying near roads
          const orbitSpeed = 1.5 + i * 0.3
          const angle = sp * Math.PI * 2 * orbitSpeed + i * (Math.PI * 2 / selectedRobots.length)
          const rx = center.x + Math.cos(angle) * 45
          const ry = center.y + Math.sin(angle) * 30

          // Glowing patrol path
          ctx.strokeStyle = robotData.color.replace(')', ', 0.15)').replace('#', 'rgba(').replace(/^rgba\(([0-9A-F]{6})/, (_m, hex) => {
            const rr = parseInt(hex.slice(0, 2), 16)
            const gg = parseInt(hex.slice(2, 4), 16)
            const bb = parseInt(hex.slice(4, 6), 16)
            return `rgba(${rr},${gg},${bb}`
          })
          // Simplified glow path
          ctx.globalAlpha = 0.15
          ctx.strokeStyle = robotData.color
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.ellipse(center.x, center.y, 45, 30, 0, 0, Math.PI * 2)
          ctx.stroke()
          ctx.globalAlpha = 1

          drawRobotUnit(ctx, rx, ry, robotId, robotData.color, time)
        }
      }

      // Update and draw particles
      particlesRef.current = particlesRef.current
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy - 0.02,
          life: p.life - (0.016 / p.maxLife),
          alpha: Math.max(0, p.alpha - 0.008),
        }))
        .filter(p => p.life > 0 && p.alpha > 0)

      // Celebration particles on success
      if (isSimDone) {
        if (Math.random() > 0.7) {
          const colors = ['#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#A855F7', '#EC4899']
          particlesRef.current.push({
            x: Math.random() * W,
            y: H + 5,
            vx: (Math.random() - 0.5) * 2,
            vy: -2 - Math.random() * 3,
            life: 1,
            maxLife: 1.5,
            size: 2 + Math.random() * 3,
            color: colors[Math.floor(Math.random() * colors.length)],
            alpha: 0.8,
          })
        }

        // Warm city glow overlay
        const warmGlow = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, 350)
        warmGlow.addColorStop(0, 'rgba(250, 204, 21, 0.06)')
        warmGlow.addColorStop(1, 'transparent')
        ctx.fillStyle = warmGlow
        ctx.fillRect(0, 0, W, H)
      }

      // Draw particles
      for (const p of particlesRef.current) {
        ctx.globalAlpha = p.alpha * Math.max(0, p.life)
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // Night overlay
      if (nightLevel > 0.1) {
        ctx.fillStyle = `rgba(0, 0, 20, ${nightLevel * 0.3})`
        ctx.fillRect(0, 0, W, H)
      }

      // Title at bottom
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.beginPath()
      ctx.roundRect(W / 2 - 50, H - 18, 100, 16, 4)
      ctx.fill()
      ctx.fillStyle = '#D4D4D8'
      ctx.font = 'bold 10px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(t('cityMap'), W / 2, H - 7)

      animRef.current = requestAnimationFrame(render)
    }

    animRef.current = requestAnimationFrame(render)

    return () => {
      active = false
      cancelAnimationFrame(animRef.current)
    }
  }, [zones, chargingStations, selectedRobots, coverage, simProgress, t])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isRunning) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    onClickMap(x, y)
  }, [isRunning, onClickMap])

  return (
    <div className="relative w-full rounded-xl border border-gray-800 overflow-hidden bg-gray-950">
      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        className="w-full cursor-crosshair"
        style={{ minHeight: 300 }}
        onClick={handleClick}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function RobotMission10({ onComplete }: RobotMission10Props) {
  const t = useTranslations('missions.robot.m10')

  const [selectedRobots, setSelectedRobots] = useState<string[]>([])
  const [chargingStations, setChargingStations] = useState<ChargingStation[]>([])
  const [isSimulating, setIsSimulating] = useState(false)
  const [simProgress, setSimProgress] = useState<number | null>(null)
  const [phase, setPhase] = useState<'configuring' | 'simulating' | 'done'>('configuring')
  const animRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)

  const robotsCost = useMemo(() => {
    return selectedRobots.reduce((sum, id) => {
      const robot = ROBOT_CATALOG.find(r => r.id === id)
      return sum + (robot?.cost ?? 0)
    }, 0)
  }, [selectedRobots])

  const stationsCost = chargingStations.length * CHARGING_STATION_COST
  const totalCost = robotsCost + stationsCost
  const budgetOk = totalCost <= BUDGET

  const coverage = useMemo(() => {
    return CITY_ZONES.map(zone => {
      const center = zoneCenter(zone)
      const hasStation = chargingStations.some(
        s => distance(s.x, s.y, center.x, center.y) <= CHARGING_RADIUS
      )
      const hasRobot = selectedRobots.length > 0
      return { zoneId: zone.id, covered: hasStation && hasRobot }
    })
  }, [chargingStations, selectedRobots])

  const coveredCount = coverage.filter(c => c.covered).length
  const coveragePercent = Math.round((coveredCount / CITY_ZONES.length) * 100)

  const toggleRobot = useCallback((id: string) => {
    setSelectedRobots(prev => {
      if (prev.includes(id)) {
        return prev.filter(r => r !== id)
      }
      if (prev.length >= MAX_ROBOTS) return prev
      return [...prev, id]
    })
  }, [])

  const handleClickMap = useCallback((x: number, y: number) => {
    // Add a charging station at click position
    setChargingStations(prev => {
      // Check if clicking near existing station — remove it
      const nearIndex = prev.findIndex(s => distance(s.x, s.y, x, y) < 15)
      if (nearIndex >= 0) {
        return prev.filter((_, i) => i !== nearIndex)
      }
      // Add new
      return [...prev, { id: Date.now(), x, y }]
    })
  }, [])

  const handleLaunch = useCallback(() => {
    setPhase('simulating')
    setIsSimulating(true)
    startTimeRef.current = performance.now()

    const DURATION = 5000

    function animate(now: number) {
      const elapsed = now - startTimeRef.current
      const progress = Math.min(elapsed / DURATION, 1)
      setSimProgress(progress)

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        setIsSimulating(false)
        setPhase('done')
        // Score is calculated in the effect below
      }
    }

    animRef.current = requestAnimationFrame(animate)
  }, [])

  // Calculate score when simulation ends
  useEffect(() => {
    if (phase !== 'done' || isSimulating) return

    // Coverage score (max 500)
    const coverageScore = Math.round((coveredCount / CITY_ZONES.length) * 500)

    // ROI / Cost efficiency score (max 350)
    // Better score for covering more zones with less money
    let roiScore: number
    if (coveredCount === 0) {
      roiScore = 0
    } else {
      const costPerZone = totalCost / coveredCount
      if (costPerZone <= 60) roiScore = 350
      else if (costPerZone <= 80) roiScore = 280
      else if (costPerZone <= 100) roiScore = 200
      else roiScore = 100
    }

    // Planning score (max 150): variety of robots, strategic placement
    let planningScore = 0
    const uniqueRobots = new Set(selectedRobots).size
    if (uniqueRobots >= 4) planningScore += 80
    else if (uniqueRobots >= 3) planningScore += 50
    else planningScore += 20
    // Efficient station placement: fewer stations covering more zones
    if (chargingStations.length > 0 && coveredCount > 0) {
      const efficiency = coveredCount / chargingStations.length
      if (efficiency >= 2) planningScore += 70
      else if (efficiency >= 1.5) planningScore += 50
      else planningScore += 20
    }

    const total = coverageScore + roiScore + planningScore

    const breakdownItems: ScoreBreakdownItem[] = [
      { label: t('scoreCoverage'), value: coverageScore, max: 500 },
      { label: t('scoreROI'), value: roiScore, max: 350 },
      { label: t('scorePlanning'), value: planningScore, max: 150 },
    ]

    onComplete?.(total, breakdownItems)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isSimulating])

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Story */}
      <div className="bg-gray-950 rounded-xl p-4 border border-gray-800">
        <p className="text-gray-300 text-sm">{t('story')}</p>
        <p className="text-yellow-400 text-sm font-bold mt-2">{t('requirement')}</p>
      </div>

      {/* Budget and coverage summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-950 rounded-xl p-3 border border-gray-800">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">{t('budgetLabel')}</span>
            <span className={clsx('font-bold', budgetOk ? 'text-green-400' : 'text-red-400')}>
              ${totalCost} / ${BUDGET}
            </span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className={clsx('h-2 rounded-full transition-all', budgetOk ? 'bg-green-500' : 'bg-red-500')}
              style={{ width: `${Math.min(100, (totalCost / BUDGET) * 100)}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {t('robotsLabel')}: ${robotsCost} | {t('stations')}: ${stationsCost}
          </div>
        </div>

        <div className="bg-gray-950 rounded-xl p-3 border border-gray-800">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">{t('coverageLabel')}</span>
            <span className={clsx('font-bold', coveragePercent === 100 ? 'text-green-400' : 'text-yellow-400')}>
              {coveragePercent}%
            </span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-green-500 transition-all"
              style={{ width: `${coveragePercent}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {coveredCount}/{CITY_ZONES.length} {t('zonesCovered')}
          </div>
        </div>
      </div>

      {/* Robot catalog */}
      <div>
        <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">
          {t('selectRobots')} ({selectedRobots.length}/{MAX_ROBOTS})
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {ROBOT_CATALOG.map(robot => {
            const isSelected = selectedRobots.includes(robot.id)
            return (
              <button
                key={robot.id}
                onClick={() => toggleRobot(robot.id)}
                disabled={isSimulating || (!isSelected && selectedRobots.length >= MAX_ROBOTS)}
                className={clsx(
                  'p-2 rounded-xl border-2 text-left text-xs transition-all',
                  isSelected
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-gray-700 bg-gray-900 hover:border-gray-500',
                  (isSimulating || (!isSelected && selectedRobots.length >= MAX_ROBOTS)) && 'opacity-50 cursor-not-allowed',
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: robot.color }} />
                  <span className="text-white font-bold">{t(`robots.${robot.name}`)}</span>
                </div>
                <div className="text-yellow-400 font-bold">${robot.cost}</div>
                <div className="text-green-400 text-[10px] mt-0.5">+ {t(`robotPros.${robot.pros}`)}</div>
                <div className="text-red-400 text-[10px]">- {t(`robotCons.${robot.cons}`)}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* City map */}
      <div>
        <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">
          {t('placeStations')}
          <span className="text-xs text-gray-500 ml-2 font-normal">{t('clickToPlace')}</span>
        </h3>
        <CityMapCanvas
          zones={CITY_ZONES}
          chargingStations={chargingStations}
          selectedRobots={selectedRobots}
          onClickMap={handleClickMap}
          isRunning={isSimulating}
          simProgress={simProgress}
          t={t}
        />
      </div>

      {/* Launch button */}
      {phase === 'configuring' && (
        <button
          onClick={handleLaunch}
          disabled={selectedRobots.length === 0 || chargingStations.length === 0}
          className={clsx(
            'w-full py-3 rounded-xl font-black text-lg uppercase tracking-wider transition-all',
            selectedRobots.length > 0 && chargingStations.length > 0
              ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/30'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed',
          )}
        >
          {t('launch')}
        </button>
      )}

      {/* Simulation status */}
      {phase === 'simulating' && (
        <div className="text-center p-4">
          <div className="text-white font-bold text-lg mb-2">{t('simRunning')}</div>
          <div className="text-gray-400 text-sm">
            {t('simMonth')} {Math.ceil((simProgress ?? 0) * 12)}/12
          </div>
          <div className="w-full bg-gray-800 rounded-full h-3 mt-2">
            <div
              className="h-3 rounded-full bg-blue-500 transition-all"
              style={{ width: `${(simProgress ?? 0) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
