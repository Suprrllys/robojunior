'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import clsx from 'clsx'
import { useTranslations } from 'next-intl'
import type { ScoreBreakdownItem } from '@/components/missions/common/MissionShell'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ZoneId = 'far-left' | 'left' | 'right' | 'far-right'

interface CargoItem {
  id: string
  name: string
  weight: number
  color: string
}

export interface RobotMission3Props {
  onComplete?: (score: number, breakdown: ScoreBreakdownItem[]) => void
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const CARGO_ITEMS: CargoItem[] = [
  { id: 'panelA', name: 'panelA', weight: 3, color: '#60A5FA' },
  { id: 'panelB', name: 'panelB', weight: 5, color: '#F59E0B' },
  { id: 'panelC', name: 'panelC', weight: 2, color: '#34D399' },
  { id: 'panelD', name: 'panelD', weight: 4, color: '#A78BFA' },
  { id: 'panelE', name: 'panelE', weight: 6, color: '#FB7185' },
]

const ZONES: { id: ZoneId; position: number }[] = [
  { id: 'far-left', position: -2 },
  { id: 'left', position: -1 },
  { id: 'right', position: 1 },
  { id: 'far-right', position: 2 },
]

function getZonePosition(zoneId: ZoneId): number {
  return ZONES.find(z => z.id === zoneId)!.position
}

// ---------------------------------------------------------------------------
// Helper: rounded rectangle
// ---------------------------------------------------------------------------

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

// ---------------------------------------------------------------------------
// Particle system for placement effects and ambient
// ---------------------------------------------------------------------------

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
  type: 'spark' | 'ambient' | 'splash' | 'confetti'
}

function createPlacementParticles(x: number, y: number, color: string): Particle[] {
  const particles: Particle[] = []
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 * i) / 12 + (Math.random() - 0.5) * 0.4
    const speed = 1.5 + Math.random() * 2.5
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      life: 1,
      maxLife: 0.6 + Math.random() * 0.4,
      color,
      size: 2 + Math.random() * 3,
      type: 'spark',
    })
  }
  return particles
}

function createSplashParticles(x: number, y: number): Particle[] {
  const particles: Particle[] = []
  const colors = ['#3B82F6', '#60A5FA', '#93C5FD', '#DBEAFE']
  for (let i = 0; i < 20; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8
    const speed = 2 + Math.random() * 4
    particles.push({
      x: x + (Math.random() - 0.5) * 20,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      maxLife: 0.8 + Math.random() * 0.4,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 2 + Math.random() * 4,
      type: 'splash',
    })
  }
  return particles
}

function createConfettiParticles(x: number, y: number): Particle[] {
  const particles: Particle[] = []
  const colors = ['#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#A855F7', '#EC4899']
  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 2 + Math.random() * 5
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      life: 1,
      maxLife: 1.2 + Math.random() * 0.8,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 3 + Math.random() * 4,
      type: 'confetti',
    })
  }
  return particles
}

function updateParticles(particles: Particle[], dt: number): Particle[] {
  return particles
    .map(p => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      vy: p.vy + (p.type === 'ambient' ? 0 : 0.12),
      life: p.life - dt / p.maxLife,
      size: p.type === 'spark' ? p.size * 0.96 : p.size,
    }))
    .filter(p => p.life > 0)
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.life)
    if (p.type === 'spark') {
      // Glowing spark
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2)
      gradient.addColorStop(0, p.color)
      gradient.addColorStop(1, 'transparent')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2)
      ctx.fill()
    } else if (p.type === 'confetti') {
      ctx.fillStyle = p.color
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.life * 10)
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
      ctx.restore()
    } else {
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
  })
  ctx.globalAlpha = 1
}

// ---------------------------------------------------------------------------
// 2.5D Balance Platform Canvas Visualization
// ---------------------------------------------------------------------------

function BalancePlatformCanvas({
  placements,
  balance,
  t,
}: {
  placements: Record<ZoneId, CargoItem[]>
  balance: number
  t: (key: string) => string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const timeRef = useRef<number>(0)
  const particlesRef = useRef<Particle[]>([])
  const prevPlacementsRef = useRef<string>('')
  const tiltRef = useRef<number>(0)
  const ambientTimerRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Check for new placements to trigger particles
    const placementKey = JSON.stringify(placements)
    if (prevPlacementsRef.current && placementKey !== prevPlacementsRef.current) {
      // Find which zone changed
      const prevPlacements = JSON.parse(prevPlacementsRef.current) as Record<ZoneId, CargoItem[]>
      ZONES.forEach(zone => {
        const prev = prevPlacements[zone.id] || []
        const curr = placements[zone.id] || []
        if (curr.length > prev.length) {
          // New item placed - spawn particles
          const zoneX = 300 + zone.position * 70
          const zoneY = 180
          const newItem = curr[curr.length - 1]
          particlesRef.current = [
            ...particlesRef.current,
            ...createPlacementParticles(zoneX, zoneY, newItem.color),
          ]
        }
      })
    }
    prevPlacementsRef.current = placementKey

    let lastTime = performance.now()

    function animate(now: number) {
      if (!ctx || !canvas) return
      const dt = (now - lastTime) / 1000
      lastTime = now
      timeRef.current = now / 1000

      // Smooth tilt interpolation (spring physics)
      const targetTilt = (balance / 8) * 12 // degrees
      tiltRef.current += (targetTilt - tiltRef.current) * 0.05

      // Ambient particles
      ambientTimerRef.current += dt
      if (ambientTimerRef.current > 0.3) {
        ambientTimerRef.current = 0
        particlesRef.current.push({
          x: Math.random() * 600,
          y: 300 + Math.random() * 20,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -0.3 - Math.random() * 0.5,
          life: 1,
          maxLife: 2 + Math.random() * 2,
          color: `rgba(96, 165, 250, ${0.1 + Math.random() * 0.2})`,
          size: 1 + Math.random() * 2,
          type: 'ambient',
        })
      }

      particlesRef.current = updateParticles(particlesRef.current, dt)

      const W = canvas.width
      const H = canvas.height
      ctx.clearRect(0, 0, W, H)

      drawPlatformScene(ctx, W, H, placements, tiltRef.current, timeRef.current, particlesRef.current, { balance: t('canvasBalance'), kg: t('canvasKg') })

      animRef.current = requestAnimationFrame(animate)
    }

    animRef.current = requestAnimationFrame(animate)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [placements, balance])

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={320}
      className="w-full rounded-xl"
      style={{ minHeight: 200 }}
    />
  )
}

function drawPlatformScene(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  placements: Record<ZoneId, CargoItem[]>,
  tiltDeg: number,
  time: number,
  particles: Particle[],
  labels: { balance: string; kg: string } = { balance: 'BALANCE:', kg: 'kg' },
) {
  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H)
  bgGrad.addColorStop(0, '#0C1222')
  bgGrad.addColorStop(0.6, '#111827')
  bgGrad.addColorStop(1, '#1A2332')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, W, H)

  // Starfield
  const seed = 42
  for (let i = 0; i < 30; i++) {
    const sx = ((seed * (i + 1) * 7) % W)
    const sy = ((seed * (i + 1) * 13) % (H * 0.5))
    const twinkle = Math.sin(time * 2 + i) * 0.3 + 0.7
    ctx.fillStyle = `rgba(255,255,255,${twinkle * 0.4})`
    ctx.beginPath()
    ctx.arc(sx, sy, 0.5 + Math.random() * 0.5, 0, Math.PI * 2)
    ctx.fill()
  }

  // Isometric ground tiles
  drawIsoGround(ctx, W, H, time)

  const pivotX = W / 2
  const pivotY = 200
  const tiltRad = (tiltDeg * Math.PI) / 180

  // Support pillar (3D cylinder)
  drawSupportPillar(ctx, pivotX, pivotY, H, time)

  // Platform (tilted beam)
  ctx.save()
  ctx.translate(pivotX, pivotY)
  ctx.rotate(tiltRad)

  // Platform shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)'
  ctx.beginPath()
  ctx.ellipse(0, 12, 220, 10, 0, 0, Math.PI * 2)
  ctx.fill()

  // Platform beam - top face (isometric)
  const beamHalfW = 210
  const beamH = 12
  const beamDepth = 8

  // Side face (dark)
  ctx.fillStyle = '#4A5568'
  ctx.beginPath()
  ctx.moveTo(-beamHalfW, 0)
  ctx.lineTo(-beamHalfW, beamDepth)
  ctx.lineTo(beamHalfW, beamDepth)
  ctx.lineTo(beamHalfW, 0)
  ctx.closePath()
  ctx.fill()

  // Top face
  const topGrad = ctx.createLinearGradient(-beamHalfW, -beamH / 2, beamHalfW, -beamH / 2)
  topGrad.addColorStop(0, '#718096')
  topGrad.addColorStop(0.3, '#A0AEC0')
  topGrad.addColorStop(0.5, '#CBD5E0')
  topGrad.addColorStop(0.7, '#A0AEC0')
  topGrad.addColorStop(1, '#718096')
  ctx.fillStyle = topGrad
  roundRect(ctx, -beamHalfW, -beamH / 2, beamHalfW * 2, beamH, 3)
  ctx.fill()

  // Metal texture lines on beam
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth = 0.5
  for (let i = -beamHalfW + 20; i < beamHalfW; i += 20) {
    ctx.beginPath()
    ctx.moveTo(i, -beamH / 2 + 2)
    ctx.lineTo(i, beamH / 2 - 2)
    ctx.stroke()
  }

  // Glow at pivot point
  const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 20)
  glowGrad.addColorStop(0, 'rgba(251, 191, 36, 0.4)')
  glowGrad.addColorStop(1, 'transparent')
  ctx.fillStyle = glowGrad
  ctx.beginPath()
  ctx.arc(0, 0, 20, 0, Math.PI * 2)
  ctx.fill()

  // Pivot circle
  ctx.fillStyle = '#F59E0B'
  ctx.beginPath()
  ctx.arc(0, 0, 6, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#FCD34D'
  ctx.lineWidth = 2
  ctx.stroke()

  // Zone markers on beam
  ZONES.forEach(zone => {
    const zx = zone.position * 70
    // Zone divider
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(zx, -beamH / 2)
    ctx.lineTo(zx, beamH / 2)
    ctx.stroke()
    ctx.setLineDash([])

    // Zone label glow
    const items = placements[zone.id]
    if (items.length > 0) {
      const labelGlow = ctx.createRadialGradient(zx, -beamH / 2 - 5, 0, zx, -beamH / 2 - 5, 15)
      labelGlow.addColorStop(0, 'rgba(34, 197, 94, 0.3)')
      labelGlow.addColorStop(1, 'transparent')
      ctx.fillStyle = labelGlow
      ctx.beginPath()
      ctx.arc(zx, -beamH / 2 - 5, 15, 0, Math.PI * 2)
      ctx.fill()
    }
  })

  // Draw cargo items in 3D isometric boxes
  ZONES.forEach(zone => {
    const items = placements[zone.id]
    const zx = zone.position * 70
    items.forEach((item, idx) => {
      const boxY = -beamH / 2 - 18 - idx * 22
      drawIsoCargo(ctx, zx, boxY, item, time, labels.kg)
    })
  })

  ctx.restore()

  // Draw particles on top
  drawParticles(ctx, particles)

  // Balance readout at bottom
  const absBalance = Math.abs(tiltDeg / 12 * 8)
  const balColor = absBalance <= 3 ? '#22C55E' : absBalance <= 5 ? '#F59E0B' : '#EF4444'
  ctx.fillStyle = balColor
  ctx.globalAlpha = 0.8
  ctx.font = 'bold 14px monospace'
  ctx.textAlign = 'center'
  ctx.fillText(`${labels.balance} ${tiltDeg > 0 ? '+' : ''}${(tiltDeg / 12 * 8).toFixed(1)}`, W / 2, H - 15)
  ctx.globalAlpha = 1
}

function drawIsoGround(ctx: CanvasRenderingContext2D, W: number, H: number, time: number) {
  // Draw isometric grid at the bottom
  const tileW = 48
  const tileH = 24
  const baseY = H - 30
  const cols = Math.ceil(W / tileW) + 2
  const rows = 3

  for (let row = 0; row < rows; row++) {
    for (let col = -1; col < cols; col++) {
      const x = col * tileW + (row % 2) * (tileW / 2) - tileW / 2
      const y = baseY + row * (tileH / 2)

      const isEven = (col + row) % 2 === 0

      // Top face
      ctx.fillStyle = isEven ? '#1E293B' : '#1A2332'
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + tileW / 2, y - tileH / 2)
      ctx.lineTo(x + tileW, y)
      ctx.lineTo(x + tileW / 2, y + tileH / 2)
      ctx.closePath()
      ctx.fill()

      // Border
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.2)'
      ctx.lineWidth = 0.5
      ctx.stroke()
    }
  }
}

function drawSupportPillar(ctx: CanvasRenderingContext2D, x: number, topY: number, H: number, time: number) {
  const bottomY = H - 50
  const pillarW = 20
  const depth = 8

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.beginPath()
  ctx.ellipse(x + 4, bottomY + 5, pillarW + 5, 6, 0, 0, Math.PI * 2)
  ctx.fill()

  // Right face (darker)
  ctx.fillStyle = '#374151'
  ctx.beginPath()
  ctx.moveTo(x + pillarW / 2, topY)
  ctx.lineTo(x + pillarW / 2 + depth, topY + depth / 2)
  ctx.lineTo(x + pillarW / 2 + depth, bottomY + depth / 2)
  ctx.lineTo(x + pillarW / 2, bottomY)
  ctx.closePath()
  ctx.fill()

  // Front face
  const pillarGrad = ctx.createLinearGradient(x - pillarW / 2, 0, x + pillarW / 2, 0)
  pillarGrad.addColorStop(0, '#4B5563')
  pillarGrad.addColorStop(0.4, '#6B7280')
  pillarGrad.addColorStop(0.7, '#9CA3AF')
  pillarGrad.addColorStop(1, '#6B7280')
  ctx.fillStyle = pillarGrad
  ctx.fillRect(x - pillarW / 2, topY, pillarW, bottomY - topY)

  // Highlight stripe
  ctx.fillStyle = 'rgba(255,255,255,0.1)'
  ctx.fillRect(x - pillarW / 2 + 3, topY, 4, bottomY - topY)

  // Base plate (isometric)
  const baseW = 40
  const baseH = 10
  ctx.fillStyle = '#4B5563'
  ctx.beginPath()
  ctx.moveTo(x, bottomY - baseH / 2)
  ctx.lineTo(x + baseW / 2, bottomY)
  ctx.lineTo(x, bottomY + baseH / 2)
  ctx.lineTo(x - baseW / 2, bottomY)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#6B7280'
  ctx.lineWidth = 1
  ctx.stroke()
}

function drawIsoCargo(ctx: CanvasRenderingContext2D, x: number, y: number, item: CargoItem, time: number, kgUnit: string = 'kg') {
  const w = 28
  const h = 18
  const depth = 8

  // Float animation
  const floatY = y + Math.sin(time * 2 + x * 0.1) * 1.5

  // Shadow beneath cargo
  ctx.fillStyle = 'rgba(0,0,0,0.2)'
  ctx.beginPath()
  ctx.ellipse(x, floatY + h / 2 + 3, w / 2 + 2, 4, 0, 0, Math.PI * 2)
  ctx.fill()

  // Parse color to create lighter/darker variants
  const baseColor = item.color

  // Right face (darker)
  ctx.fillStyle = darkenColor(baseColor, 0.6)
  ctx.beginPath()
  ctx.moveTo(x + w / 2, floatY - h / 2)
  ctx.lineTo(x + w / 2 + depth, floatY - h / 2 + depth / 2)
  ctx.lineTo(x + w / 2 + depth, floatY + h / 2 + depth / 2)
  ctx.lineTo(x + w / 2, floatY + h / 2)
  ctx.closePath()
  ctx.fill()

  // Bottom face (darker)
  ctx.fillStyle = darkenColor(baseColor, 0.5)
  ctx.beginPath()
  ctx.moveTo(x - w / 2, floatY + h / 2)
  ctx.lineTo(x - w / 2 + depth, floatY + h / 2 + depth / 2)
  ctx.lineTo(x + w / 2 + depth, floatY + h / 2 + depth / 2)
  ctx.lineTo(x + w / 2, floatY + h / 2)
  ctx.closePath()
  ctx.fill()

  // Front face
  const faceGrad = ctx.createLinearGradient(x - w / 2, floatY - h / 2, x + w / 2, floatY + h / 2)
  faceGrad.addColorStop(0, lightenColor(baseColor, 1.2))
  faceGrad.addColorStop(0.5, baseColor)
  faceGrad.addColorStop(1, darkenColor(baseColor, 0.8))
  ctx.fillStyle = faceGrad
  ctx.fillRect(x - w / 2, floatY - h / 2, w, h)

  // Top highlight
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.fillRect(x - w / 2, floatY - h / 2, w, 3)

  // Glow effect
  const glow = ctx.createRadialGradient(x, floatY, 0, x, floatY, w)
  glow.addColorStop(0, `${baseColor}33`)
  glow.addColorStop(1, 'transparent')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(x, floatY, w, 0, Math.PI * 2)
  ctx.fill()

  // Weight label
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 9px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${item.weight}${kgUnit}`, x, floatY)
  ctx.textBaseline = 'alphabetic'

  // Border
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'
  ctx.lineWidth = 0.5
  ctx.strokeRect(x - w / 2, floatY - h / 2, w, h)
}

function darkenColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`
}

function lightenColor(hex: string, factor: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) * factor)
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) * factor)
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) * factor)
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
}

// ---------------------------------------------------------------------------
// Draggable cargo card
// ---------------------------------------------------------------------------

function DraggableCargo({
  item,
  isPlaced,
  t,
}: {
  item: CargoItem
  isPlaced: boolean
  t: (key: string, values?: Record<string, string | number>) => string
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: { item },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={clsx(
        'p-3 rounded-xl border cursor-grab active:cursor-grabbing transition-all select-none',
        isDragging && 'opacity-40 scale-95',
        isPlaced
          ? 'border-emerald-500/50 bg-emerald-900/20'
          : 'border-gray-700 bg-gray-900 hover:border-gray-500',
      )}
    >
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }} />
        <span className="font-bold text-white text-sm">{t(`cargo.${item.name}`)}</span>
        <span className="text-yellow-400 text-xs font-bold ml-auto">{item.weight}kg</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Droppable zone
// ---------------------------------------------------------------------------

function DroppableZone({
  zoneId,
  items,
  onRemove,
  t,
}: {
  zoneId: ZoneId
  items: CargoItem[]
  onRemove: (itemId: string) => void
  t: (key: string) => string
}) {
  const { isOver, setNodeRef } = useDroppable({ id: zoneId })

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'rounded-lg border-2 border-dashed p-2 text-center transition-all min-h-[80px] flex flex-col items-center justify-start gap-1',
        isOver
          ? 'border-blue-400 bg-blue-900/30'
          : items.length > 0
          ? 'border-emerald-500/50 bg-emerald-900/10'
          : 'border-gray-600 bg-gray-900/30',
      )}
    >
      <span className="text-[10px] text-gray-500 uppercase font-bold">
        {t(`zones.${zoneId}`)}
      </span>
      {items.map(item => (
        <div key={item.id} className="flex items-center gap-1 w-full">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
          <span className="text-xs text-white font-medium">{t(`cargo.${item.name}`)}</span>
          <span className="text-xs text-gray-500">{item.weight}kg</span>
          <button
            onClick={() => onRemove(item.id)}
            className="ml-auto w-4 h-4 rounded-full bg-red-600 text-white text-[10px] leading-none flex items-center justify-center hover:bg-red-500"
          >
            x
          </button>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Balance indicator (spirit level)
// ---------------------------------------------------------------------------

function BalanceIndicator({ balance }: { balance: number }) {
  const clampedBalance = Math.max(-5, Math.min(5, balance))
  const position = 50 + (clampedBalance / 5) * 50

  const isGood = Math.abs(balance) <= 3
  const isDanger = Math.abs(balance) > 5

  return (
    <div className="space-y-1">
      <div className="h-6 rounded-full bg-gray-800 border border-gray-700 relative overflow-hidden">
        {/* Green zone in center */}
        <div className="absolute top-0 bottom-0 left-[20%] right-[20%] bg-green-900/30" />
        {/* Center line */}
        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-gray-600" />
        {/* Indicator ball */}
        <div
          className={clsx(
            'absolute top-1 w-4 h-4 rounded-full transition-all duration-300 -translate-x-1/2',
            isGood ? 'bg-green-400 shadow-lg shadow-green-400/50'
              : isDanger ? 'bg-red-400 shadow-lg shadow-red-400/50 animate-pulse'
              : 'bg-yellow-400 shadow-lg shadow-yellow-400/50',
          )}
          style={{ left: `${position}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-500">
        <span>-5</span>
        <span className={clsx('font-bold', isGood ? 'text-green-400' : isDanger ? 'text-red-400' : 'text-yellow-400')}>
          {balance > 0 ? '+' : ''}{balance}
        </span>
        <span>+5</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Bridge crossing animation (2.5D upgraded)
// ---------------------------------------------------------------------------

function BridgeCrossingCanvas({
  isRunning,
  balance,
  onAnimationEnd,
  t,
}: {
  isRunning: boolean
  balance: number
  onAnimationEnd: (crossed: boolean) => void
  t: (key: string) => string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const particlesRef = useRef<Particle[]>([])
  const [statusText, setStatusText] = useState('')
  const [statusColor, setStatusColor] = useState('')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width
    const H = canvas.height

    if (animRef.current) cancelAnimationFrame(animRef.current)
    setStatusText('')
    setStatusColor('')
    particlesRef.current = []

    if (!isRunning) {
      ctx.clearRect(0, 0, W, H)
      drawBridgeIdle25D(ctx, W, H, performance.now() / 1000, { start: t('canvasStart'), end: t('canvasEnd') })

      // Idle animation loop for water
      let idleAnim = 0
      const idleLoop = (now: number) => {
        if (!ctx || !canvas) return
        ctx.clearRect(0, 0, W, H)
        drawBridgeIdle25D(ctx, W, H, now / 1000, { start: t('canvasStart'), end: t('canvasEnd') })
        idleAnim = requestAnimationFrame(idleLoop)
      }
      idleAnim = requestAnimationFrame(idleLoop)
      return () => cancelAnimationFrame(idleAnim)
    }

    const falls = Math.abs(balance) > 5
    const DURATION = falls ? 2500 : 4000
    startTimeRef.current = performance.now()
    let statusShown = false

    function animate(now: number) {
      if (!ctx || !canvas) return
      const elapsed = now - startTimeRef.current
      const progress = Math.min(elapsed / DURATION, 1)
      const time = now / 1000

      particlesRef.current = updateParticles(particlesRef.current, 1 / 60)

      ctx.clearRect(0, 0, W, H)
      drawBridgeScene25D(ctx, W, H, balance, progress, falls, time, particlesRef.current, { start: t('canvasStart'), end: t('canvasEnd') })

      // Spawn splash when falling into water
      if (falls && progress >= 0.55 && progress < 0.6 && particlesRef.current.length < 30) {
        const bridgeY = H - 100
        particlesRef.current = [
          ...particlesRef.current,
          ...createSplashParticles(W * 0.45, bridgeY + 20),
        ]
      }

      // Confetti on success
      if (!falls && progress >= 0.85 && progress < 0.88 && particlesRef.current.length < 50) {
        particlesRef.current = [
          ...particlesRef.current,
          ...createConfettiParticles(W * 0.85, H - 140),
        ]
      }

      if (falls && progress >= 0.6 && !statusShown) {
        statusShown = true
        setStatusText(t('robotFell'))
        setStatusColor('bg-red-600/90')
      } else if (!falls && progress >= 0.9 && !statusShown) {
        statusShown = true
        setStatusText(t('bridgeCrossed'))
        setStatusColor('bg-green-600/90')
      }

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        onAnimationEnd(!falls)
      }
    }

    animRef.current = requestAnimationFrame(animate)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning])

  return (
    <div className="relative w-full rounded-xl border border-gray-800 overflow-hidden bg-gray-950">
      <canvas
        ref={canvasRef}
        width={700}
        height={320}
        className="w-full"
        style={{ minHeight: 200 }}
      />
      {statusText && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={clsx('px-6 py-3 rounded-xl text-lg font-black text-white', statusColor)}>
            {statusText}
          </div>
        </div>
      )}
      {!isRunning && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm pointer-events-none">
          {t('animIdle')}
        </div>
      )}
    </div>
  )
}

function drawBridgeIdle25D(ctx: CanvasRenderingContext2D, W: number, H: number, time: number, labels: { start: string; end: string } = { start: 'START', end: 'END' }) {
  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H)
  skyGrad.addColorStop(0, '#0C1222')
  skyGrad.addColorStop(0.5, '#111827')
  skyGrad.addColorStop(1, '#1E3A5F')
  ctx.fillStyle = skyGrad
  ctx.fillRect(0, 0, W, H)

  // Stars
  for (let i = 0; i < 25; i++) {
    const sx = ((i * 137 + 50) % W)
    const sy = ((i * 97 + 20) % (H * 0.4))
    const twinkle = Math.sin(time * 1.5 + i * 0.7) * 0.3 + 0.5
    ctx.fillStyle = `rgba(255,255,255,${twinkle})`
    ctx.beginPath()
    ctx.arc(sx, sy, 0.8, 0, Math.PI * 2)
    ctx.fill()
  }

  const bridgeY = H - 100

  // Left platform (3D isometric)
  drawIsoPlatform(ctx, 0, bridgeY, W * 0.22, H - bridgeY, '#4B5563', '#374151', '#2D3748')

  // Right platform
  drawIsoPlatform(ctx, W * 0.78, bridgeY, W * 0.22, H - bridgeY, '#4B5563', '#374151', '#2D3748')

  // Bridge with 3D depth
  drawIsoBridge(ctx, W * 0.22, bridgeY, W * 0.56, time)

  // Water with depth and waves
  drawWater25D(ctx, W * 0.22, bridgeY + 10, W * 0.56, H - bridgeY - 10, time)

  // Labels
  ctx.fillStyle = '#9CA3AF'
  ctx.font = 'bold 12px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(labels.start, W * 0.11, bridgeY - 15)
  ctx.fillText(labels.end, W * 0.89, bridgeY - 15)
}

function drawIsoPlatform(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  topColor: string,
  frontColor: string,
  sideColor: string,
) {
  const depth = 12

  // Front face
  ctx.fillStyle = frontColor
  ctx.fillRect(x, y, w, h)

  // Top face (isometric slant)
  ctx.fillStyle = topColor
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + depth, y - depth)
  ctx.lineTo(x + w + depth, y - depth)
  ctx.lineTo(x + w, y)
  ctx.closePath()
  ctx.fill()

  // Right side face
  ctx.fillStyle = sideColor
  ctx.beginPath()
  ctx.moveTo(x + w, y)
  ctx.lineTo(x + w + depth, y - depth)
  ctx.lineTo(x + w + depth, y + h - depth)
  ctx.lineTo(x + w, y + h)
  ctx.closePath()
  ctx.fill()

  // Edge highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + w, y)
  ctx.stroke()
}

function drawIsoBridge(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, time: number) {
  const plankH = 10
  const depth = 6

  // Bridge planks with 3D depth
  const plankW = w / 14
  for (let i = 0; i < 14; i++) {
    const px = x + i * plankW
    const wobble = Math.sin(time * 0.5 + i * 0.3) * 0.5

    // Side face
    ctx.fillStyle = '#78350F'
    ctx.fillRect(px + 1, y + wobble, plankW - 2, depth)

    // Top face
    const plankGrad = ctx.createLinearGradient(px, y + wobble - plankH, px, y + wobble)
    plankGrad.addColorStop(0, '#D97706')
    plankGrad.addColorStop(0.5, '#B45309')
    plankGrad.addColorStop(1, '#92400E')
    ctx.fillStyle = plankGrad
    ctx.fillRect(px + 1, y - plankH + wobble, plankW - 2, plankH)

    // Wood grain
    ctx.strokeStyle = 'rgba(120, 53, 15, 0.4)'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(px + 3, y - plankH / 2 + wobble)
    ctx.lineTo(px + plankW - 3, y - plankH / 2 + wobble)
    ctx.stroke()
  }

  // Rope railings
  ctx.strokeStyle = '#92400E'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x, y - 25)
  for (let i = 0; i <= 20; i++) {
    const rx = x + (i / 20) * w
    const ry = y - 25 + Math.sin(time * 0.3 + i * 0.5) * 2 + Math.sin(i * 0.5) * 3
    ctx.lineTo(rx, ry)
  }
  ctx.stroke()
}

function drawWater25D(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, time: number) {
  // Water depth gradient
  const waterGrad = ctx.createLinearGradient(0, y, 0, y + h)
  waterGrad.addColorStop(0, '#1E3A5F')
  waterGrad.addColorStop(0.3, '#1E40AF')
  waterGrad.addColorStop(1, '#0F172A')
  ctx.fillStyle = waterGrad
  ctx.fillRect(x, y, w, h)

  // Animated waves
  ctx.strokeStyle = '#3B82F6'
  ctx.lineWidth = 1.5
  for (let i = 0; i < 5; i++) {
    const wy = y + 10 + i * (h / 6)
    ctx.globalAlpha = 0.4 - i * 0.06
    ctx.beginPath()
    for (let wx = x; wx < x + w; wx += 3) {
      const waveY = wy + Math.sin((wx - x) * 0.04 + time * 2 + i * 1.5) * 3
        + Math.sin((wx - x) * 0.08 + time * 1.2) * 1.5
      if (wx === x) ctx.moveTo(wx, waveY)
      else ctx.lineTo(wx, waveY)
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  // Light reflections on water
  for (let i = 0; i < 6; i++) {
    const rx = x + 20 + ((i * 73) % (w - 40))
    const ry = y + 5 + ((i * 37) % (h - 10))
    const shimmer = Math.sin(time * 3 + i * 2) * 0.3 + 0.3
    ctx.fillStyle = `rgba(147, 197, 253, ${shimmer})`
    ctx.beginPath()
    ctx.ellipse(rx, ry, 8, 2, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawBridgeScene25D(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  balance: number,
  progress: number,
  falls: boolean,
  time: number,
  particles: Particle[],
  labels: { start: string; end: string } = { start: 'START', end: 'END' },
) {
  // Sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H)
  skyGrad.addColorStop(0, '#0C1222')
  skyGrad.addColorStop(0.5, '#111827')
  skyGrad.addColorStop(1, '#1E3A5F')
  ctx.fillStyle = skyGrad
  ctx.fillRect(0, 0, W, H)

  // Stars
  for (let i = 0; i < 20; i++) {
    const sx = ((i * 137 + 50) % W)
    const sy = ((i * 97 + 20) % (H * 0.3))
    const twinkle = Math.sin(time * 1.5 + i * 0.7) * 0.3 + 0.5
    ctx.fillStyle = `rgba(255,255,255,${twinkle})`
    ctx.beginPath()
    ctx.arc(sx, sy, 0.8, 0, Math.PI * 2)
    ctx.fill()
  }

  const bridgeY = H - 100

  // Platforms
  drawIsoPlatform(ctx, 0, bridgeY, W * 0.22, H - bridgeY, '#4B5563', '#374151', '#2D3748')
  drawIsoPlatform(ctx, W * 0.78, bridgeY, W * 0.22, H - bridgeY, '#4B5563', '#374151', '#2D3748')

  // Bridge
  drawIsoBridge(ctx, W * 0.22, bridgeY, W * 0.56, time)

  // Water
  drawWater25D(ctx, W * 0.22, bridgeY + 10, W * 0.56, H - bridgeY - 10, time)

  // Labels
  ctx.fillStyle = '#9CA3AF'
  ctx.font = 'bold 12px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(labels.start, W * 0.11, bridgeY - 15)
  ctx.fillText(labels.end, W * 0.89, bridgeY - 15)

  // Robot position
  const bridgeStart = W * 0.22 + 30
  const bridgeEnd = W * 0.78 - 30
  let robotX: number
  let robotY = bridgeY - 12
  let tilt = 0

  if (falls) {
    const fallPoint = 0.4
    if (progress < fallPoint) {
      robotX = bridgeStart + (progress / fallPoint) * (bridgeEnd - bridgeStart) * 0.4
      tilt = (balance / 5) * 15 * (progress / fallPoint)
    } else {
      const fallProgress = (progress - fallPoint) / (1 - fallPoint)
      robotX = bridgeStart + (bridgeEnd - bridgeStart) * 0.4
      tilt = (balance / 5) * 15 + fallProgress * 60 * Math.sign(balance)
      robotY = bridgeY - 12 + fallProgress * 140
    }
  } else {
    robotX = bridgeStart + progress * (bridgeEnd - bridgeStart)
    const wobbleAmount = Math.abs(balance) * 2
    tilt = Math.sin(progress * 20) * wobbleAmount
  }

  // Draw 2.5D robot
  drawRobot25D(ctx, robotX, robotY, tilt, time, progress)

  // Particles
  drawParticles(ctx, particles)

  // Flag at end
  if (!falls) {
    const flagWave = Math.sin(time * 3) * 3
    ctx.fillStyle = '#22C55E'
    ctx.fillRect(W * 0.78 - 15, bridgeY - 55, 3, 45)
    ctx.fillStyle = '#22C55E'
    ctx.beginPath()
    ctx.moveTo(W * 0.78 - 12, bridgeY - 55)
    ctx.lineTo(W * 0.78 + 8, bridgeY - 48 + flagWave)
    ctx.lineTo(W * 0.78 - 12, bridgeY - 40)
    ctx.closePath()
    ctx.fill()
  }
}

function drawRobot25D(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tiltDeg: number,
  time: number,
  progress: number,
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate((tiltDeg * Math.PI) / 180)

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.beginPath()
  ctx.ellipse(0, 8, 24, 6, 0, 0, Math.PI * 2)
  ctx.fill()

  const rw = 44
  const rh = 32
  const depth = 8

  // Wheels with spokes
  const wheelR = 8
  const wheelPositions = [-rw / 2 - 2, rw / 2 + 2]
  wheelPositions.forEach(wx => {
    // Wheel shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)'
    ctx.beginPath()
    ctx.ellipse(wx, 4, wheelR + 1, 3, 0, 0, Math.PI * 2)
    ctx.fill()

    // Wheel body
    ctx.fillStyle = '#D97706'
    ctx.beginPath()
    ctx.arc(wx, 0, wheelR, 0, Math.PI * 2)
    ctx.fill()

    // Wheel rim
    ctx.strokeStyle = '#F59E0B'
    ctx.lineWidth = 2
    ctx.stroke()

    // Spokes (spinning)
    const spokeAngle = time * 8 * (progress > 0 ? 1 : 0)
    ctx.strokeStyle = '#92400E'
    ctx.lineWidth = 1.5
    for (let s = 0; s < 4; s++) {
      const a = spokeAngle + (s * Math.PI) / 2
      ctx.beginPath()
      ctx.moveTo(wx + Math.cos(a) * 2, Math.sin(a) * 2)
      ctx.lineTo(wx + Math.cos(a) * (wheelR - 1), Math.sin(a) * (wheelR - 1))
      ctx.stroke()
    }

    // Hub
    ctx.fillStyle = '#78350F'
    ctx.beginPath()
    ctx.arc(wx, 0, 2.5, 0, Math.PI * 2)
    ctx.fill()
  })

  // Body right face (darker for 3D)
  ctx.fillStyle = '#1E40AF'
  ctx.beginPath()
  ctx.moveTo(rw / 2, -rh)
  ctx.lineTo(rw / 2 + depth, -rh + depth / 2)
  ctx.lineTo(rw / 2 + depth, depth / 2)
  ctx.lineTo(rw / 2, 0)
  ctx.closePath()
  ctx.fill()

  // Body front face
  const bodyGrad = ctx.createLinearGradient(-rw / 2, -rh, rw / 2, 0)
  bodyGrad.addColorStop(0, '#60A5FA')
  bodyGrad.addColorStop(0.5, '#3B82F6')
  bodyGrad.addColorStop(1, '#2563EB')
  ctx.fillStyle = bodyGrad
  roundRect(ctx, -rw / 2, -rh, rw, rh, 5)
  ctx.fill()

  // Body top face
  ctx.fillStyle = '#93C5FD'
  ctx.beginPath()
  ctx.moveTo(-rw / 2, -rh)
  ctx.lineTo(-rw / 2 + depth, -rh - depth / 2)
  ctx.lineTo(rw / 2 + depth, -rh - depth / 2)
  ctx.lineTo(rw / 2, -rh)
  ctx.closePath()
  ctx.fill()

  // Neon border glow
  ctx.strokeStyle = '#0FF'
  ctx.lineWidth = 1.5
  ctx.shadowColor = '#0FF'
  ctx.shadowBlur = 6
  roundRect(ctx, -rw / 2, -rh, rw, rh, 5)
  ctx.stroke()
  ctx.shadowBlur = 0

  // Head
  ctx.fillStyle = '#7C3AED'
  ctx.beginPath()
  ctx.arc(0, -rh - 10, 10, 0, Math.PI * 2)
  ctx.fill()

  // Head highlight
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.beginPath()
  ctx.arc(-2, -rh - 12, 4, 0, Math.PI * 2)
  ctx.fill()

  // Eyes with glow
  ctx.fillStyle = '#0FF'
  ctx.shadowColor = '#0FF'
  ctx.shadowBlur = 8
  ctx.beginPath()
  ctx.arc(-4, -rh - 12, 2.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(4, -rh - 12, 2.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0

  // Antenna
  ctx.strokeStyle = '#A78BFA'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(0, -rh - 20)
  ctx.lineTo(0, -rh - 30)
  ctx.stroke()

  // Antenna tip glow
  const antennaGlow = Math.sin(time * 4) * 0.3 + 0.7
  ctx.fillStyle = `rgba(167, 139, 250, ${antennaGlow})`
  ctx.shadowColor = '#A78BFA'
  ctx.shadowBlur = 6
  ctx.beginPath()
  ctx.arc(0, -rh - 31, 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0

  // Cargo boxes on top (3D)
  const cargoColors = ['#22C55E', '#F59E0B', '#60A5FA']
  cargoColors.forEach((color, i) => {
    const cx = -14 + i * 10
    const cy = -rh - 6
    const cw = 8
    const ch = 5
    // Side
    ctx.fillStyle = darkenColor(color, 0.6)
    ctx.fillRect(cx + cw, cy, 3, ch)
    // Top
    ctx.fillStyle = lightenColor(color, 1.2)
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + 3, cy - 2)
    ctx.lineTo(cx + cw + 3, cy - 2)
    ctx.lineTo(cx + cw, cy)
    ctx.closePath()
    ctx.fill()
    // Front
    ctx.fillStyle = color
    ctx.fillRect(cx, cy, cw, ch)
  })

  ctx.restore()
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function RobotMission3({ onComplete }: RobotMission3Props) {
  const t = useTranslations('missions.robot.m3')

  const [placements, setPlacements] = useState<Record<ZoneId, CargoItem[]>>({
    'far-left': [],
    'left': [],
    'right': [],
    'far-right': [],
  })
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [phase, setPhase] = useState<'placing' | 'done'>('placing')

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  const sensors = useSensors(pointerSensor, touchSensor)

  // Calculate balance: sum(weight * position)
  const balance = useMemo(() => {
    let total = 0
    for (const zone of ZONES) {
      const items = placements[zone.id]
      for (const item of items) {
        total += item.weight * zone.position
      }
    }
    return total
  }, [placements])

  // Count placed items
  const placedIds = useMemo(() => {
    const ids = new Set<string>()
    for (const items of Object.values(placements)) {
      for (const item of items) ids.add(item.id)
    }
    return ids
  }, [placements])

  const allPlaced = placedIds.size === CARGO_ITEMS.length

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(e.active.id as string)
  }, [])

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = e
    if (!over) return

    const item = active.data.current?.item as CargoItem | undefined
    if (!item) return

    const targetZone = over.id as ZoneId
    if (!ZONES.some(z => z.id === targetZone)) return

    setPlacements(prev => {
      const next = { ...prev }
      // Remove from any existing zone
      for (const zoneId of Object.keys(next) as ZoneId[]) {
        next[zoneId] = next[zoneId].filter(i => i.id !== item.id)
      }
      // Add to target zone
      next[targetZone] = [...next[targetZone], item]
      return next
    })
  }, [])

  const handleRemoveItem = useCallback((itemId: string) => {
    setPlacements(prev => {
      const next = { ...prev }
      for (const zoneId of Object.keys(next) as ZoneId[]) {
        next[zoneId] = next[zoneId].filter(i => i.id !== itemId)
      }
      return next
    })
  }, [])

  const handleCrossBridge = useCallback(() => {
    setIsAnimating(true)
  }, [])

  const handleAnimationEnd = useCallback((crossed: boolean) => {
    setIsAnimating(false)
    setPhase('done')

    // Scoring
    const balanceScore = Math.round(500 * Math.max(0, 1 - Math.abs(balance) / 5))
    const placedCount = placedIds.size
    const cargoScore = placedCount === 5 ? 350 : Math.round((placedCount / 5) * 350)
    const crossingScore = crossed ? 150 : 0
    const total = balanceScore + cargoScore + crossingScore

    const breakdownItems: ScoreBreakdownItem[] = [
      { label: t('scoreBalance'), value: balanceScore, max: 500 },
      { label: t('scoreCargo'), value: cargoScore, max: 350 },
      { label: t('scoreCrossing'), value: crossingScore, max: 150 },
    ]

    onComplete?.(total, breakdownItems)
  }, [balance, placedIds, onComplete, t])

  const activeItem = activeId ? CARGO_ITEMS.find(c => c.id === activeId) : null

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="p-4 md:p-6 space-y-6">
        {/* Story */}
        <div className="bg-gray-950 rounded-xl p-4 border border-gray-800">
          <p className="text-gray-300 text-sm">{t('story')}</p>
          <p className="text-yellow-400 text-sm font-bold mt-2">{t('requirement')}</p>
        </div>

        {/* 2.5D Balance Platform Visualization */}
        <div className="bg-gray-950 rounded-xl border border-gray-800 overflow-hidden">
          <BalancePlatformCanvas placements={placements} balance={balance} t={t} />
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
          {/* Placement zones */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase">{t('placementZones')}</h3>
            <div className="grid grid-cols-4 gap-2">
              {ZONES.map(zone => (
                <DroppableZone
                  key={zone.id}
                  zoneId={zone.id}
                  items={placements[zone.id]}
                  onRemove={handleRemoveItem}
                  t={t}
                />
              ))}
            </div>

            {/* Balance indicator */}
            <div className="bg-gray-950 rounded-xl p-4 border border-gray-800">
              <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">{t('balanceLabel')}</h4>
              <BalanceIndicator balance={balance} />
              <p className={clsx(
                'text-xs mt-2 font-bold',
                Math.abs(balance) <= 3 ? 'text-green-400' : Math.abs(balance) <= 5 ? 'text-yellow-400' : 'text-red-400',
              )}>
                {Math.abs(balance) <= 3
                  ? t('balanceGood')
                  : Math.abs(balance) <= 5
                  ? t('balanceOk')
                  : t('balanceDanger')}
              </p>
            </div>

            {/* Cross bridge button */}
            {phase === 'placing' && (
              <button
                onClick={handleCrossBridge}
                disabled={isAnimating || placedIds.size === 0}
                className={clsx(
                  'w-full py-3 rounded-xl font-black text-lg uppercase tracking-wider transition-all',
                  !isAnimating && placedIds.size > 0
                    ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/30'
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed',
                )}
              >
                {t('crossBridge')}
              </button>
            )}
          </div>

          {/* Cargo list */}
          <div className="space-y-3 lg:w-56">
            <h3 className="text-sm font-bold text-gray-400 uppercase">{t('cargoList')}</h3>
            <p className="text-xs text-gray-500">{t('cargoHint')}</p>
            {CARGO_ITEMS.map(item => (
              <DraggableCargo
                key={item.id}
                item={item}
                isPlaced={placedIds.has(item.id)}
                t={t}
              />
            ))}
            <div className="text-xs text-gray-500 mt-2">
              {t('placedCount', { count: placedIds.size, total: CARGO_ITEMS.length })}
            </div>
          </div>
        </div>

        {/* Bridge crossing animation */}
        <BridgeCrossingCanvas
          isRunning={isAnimating}
          balance={balance}
          onAnimationEnd={handleAnimationEnd}
          t={t}
        />
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeItem ? (
          <div className="p-3 rounded-xl border border-blue-400 bg-gray-800 shadow-xl shadow-blue-500/20 opacity-90 pointer-events-none">
            <span className="font-bold text-white text-sm">{t(`cargo.${activeItem.name}`)}</span>
            <span className="text-yellow-400 text-xs font-bold ml-2">{activeItem.weight}kg</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
