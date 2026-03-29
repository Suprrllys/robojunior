'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
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

type SlotId = 'head' | 'body' | 'left-arm' | 'right-arm' | 'legs'

type MotorPower = 'low' | 'medium' | 'high'

interface RobotPart {
  id: string
  category: 'chassis' | 'arm' | 'wheels' | 'sensor' | 'motor' | 'battery'
  nameKey: string
  slot: SlotId | 'body-motor' | 'body-battery'
  cost: number
  weight: number
  stats: Record<string, string | number>
  color: string
}

interface ScoreBreakdown {
  design: number
  physics: number
  budget: number
  testing: number
  total: number
}

type TestResult = 'success' | 'fail' | 'tip-over' | null
type TestQuality = 'smooth' | 'jerky' | 'fail'

export interface RobotMission1Props {
  onComplete?: (score: number, breakdown: ScoreBreakdownItem[]) => void
}

// ---------------------------------------------------------------------------
// Part definitions per the spec
// ---------------------------------------------------------------------------

const ALL_PARTS: RobotPart[] = [
  // Chassis -> body slot
  { id: 'chassis_light',  category: 'chassis', nameKey: 'chassis_light',  slot: 'body', cost: 10, weight: 10, stats: { strength: 3 }, color: '#60A5FA' },
  { id: 'chassis_medium', category: 'chassis', nameKey: 'chassis_medium', slot: 'body', cost: 20, weight: 18, stats: { strength: 5 }, color: '#3B82F6' },
  { id: 'chassis_heavy',  category: 'chassis', nameKey: 'chassis_heavy',  slot: 'body', cost: 35, weight: 30, stats: { strength: 8 }, color: '#1D4ED8' },

  // Arms -> left-arm / right-arm slots
  { id: 'arm_basic',     category: 'arm', nameKey: 'gripper_basic',     slot: 'left-arm', cost: 5,  weight: 2, stats: { precision: 3, lift: '5kg' }, color: '#34D399' },
  { id: 'arm_power',     category: 'arm', nameKey: 'gripper_power',     slot: 'left-arm', cost: 15, weight: 4, stats: { precision: 2, lift: '15kg' }, color: '#059669' },
  { id: 'arm_precision', category: 'arm', nameKey: 'gripper_precision', slot: 'left-arm', cost: 12, weight: 3, stats: { precision: 5, lift: '8kg' }, color: '#10B981' },

  // Wheels -> legs slot
  { id: 'wheels_small',  category: 'wheels', nameKey: 'wheels_small',  slot: 'legs', cost: 5,  weight: 2, stats: { speed: 'fast', terrain: 'flat' }, color: '#FBBF24' },
  { id: 'wheels_medium', category: 'wheels', nameKey: 'wheels_medium', slot: 'legs', cost: 10, weight: 4, stats: { speed: 'medium', terrain: 'rough' }, color: '#F59E0B' },
  { id: 'wheels_tank',   category: 'wheels', nameKey: 'wheels_tank',   slot: 'legs', cost: 20, weight: 8, stats: { speed: 'slow', terrain: 'all' }, color: '#D97706' },

  // Sensor -> head slot
  { id: 'sensor_basic',    category: 'sensor', nameKey: 'sensor_basic',    slot: 'head', cost: 5,  weight: 1, stats: { range: '2m' }, color: '#A78BFA' },
  { id: 'sensor_advanced', category: 'sensor', nameKey: 'sensor_advanced', slot: 'head', cost: 12, weight: 2, stats: { range: '5m' }, color: '#8B5CF6' },
  { id: 'sensor_pro',      category: 'sensor', nameKey: 'sensor_pro',      slot: 'head', cost: 25, weight: 3, stats: { range: '10m' }, color: '#7C3AED' },

  // Motor -> body secondary
  { id: 'motor_basic',    category: 'motor', nameKey: 'motor_basic',    slot: 'body-motor', cost: 8,  weight: 3, stats: { power: 'low' }, color: '#FB923C' },
  { id: 'motor_standard', category: 'motor', nameKey: 'motor_standard', slot: 'body-motor', cost: 15, weight: 5, stats: { power: 'medium' }, color: '#F97316' },
  { id: 'motor_heavy',    category: 'motor', nameKey: 'motor_heavy',    slot: 'body-motor', cost: 25, weight: 8, stats: { power: 'high' }, color: '#EA580C' },

  // Battery -> body secondary
  { id: 'battery_small',  category: 'battery', nameKey: 'battery_small',  slot: 'body-battery', cost: 5,  weight: 2, stats: { runtime: '4h' }, color: '#4ADE80' },
  { id: 'battery_medium', category: 'battery', nameKey: 'battery_medium', slot: 'body-battery', cost: 10, weight: 4, stats: { runtime: '8h' }, color: '#22C55E' },
  { id: 'battery_large',  category: 'battery', nameKey: 'battery_large',  slot: 'body-battery', cost: 20, weight: 7, stats: { runtime: '12h' }, color: '#16A34A' },
]

const BUDGET = 80
const WEIGHT_LIMIT = 50

const ALL_SLOT_IDS = ['head', 'body', 'left-arm', 'right-arm', 'legs', 'body-motor', 'body-battery'] as const
type FullSlotId = typeof ALL_SLOT_IDS[number]

function canDropInSlot(part: RobotPart, slotId: FullSlotId): boolean {
  if (part.category === 'arm') {
    return slotId === 'left-arm' || slotId === 'right-arm'
  }
  return part.slot === slotId
}

// ---------------------------------------------------------------------------
// Draggable part card
// ---------------------------------------------------------------------------

function DraggablePart({ part, isEquipped, t }: { part: RobotPart; isEquipped: boolean; t: (key: string, values?: Record<string, string | number>) => string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: part.id,
    data: { part },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={clsx(
        'p-3 rounded-xl border cursor-grab active:cursor-grabbing transition-all select-none',
        isDragging && 'opacity-40 scale-95',
        isEquipped
          ? 'border-emerald-500/50 bg-emerald-900/20'
          : 'border-gray-700 bg-gray-900 hover:border-gray-500',
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-white text-sm">{t(`parts.${part.nameKey}`)}</span>
        <span className="text-yellow-400 text-xs font-bold">${part.cost}</span>
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-gray-400">
        <span className="text-gray-500">{part.weight}kg</span>
        {Object.entries(part.stats).map(([key, val]) => (
          <span key={key} className="text-blue-300">
            {t(`stats.${key}`)}: {val}
          </span>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Droppable slot
// ---------------------------------------------------------------------------

function DroppableSlot({
  slotId,
  equipped,
  onRemove,
  t,
}: {
  slotId: FullSlotId
  equipped: RobotPart | undefined
  onRemove: () => void
  t: (key: string, values?: Record<string, string | number>) => string
}) {
  const { isOver, setNodeRef } = useDroppable({ id: slotId })

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'rounded-lg border-2 border-dashed p-2 text-center transition-all min-h-[56px] flex flex-col items-center justify-center relative',
        isOver
          ? 'border-blue-400 bg-blue-900/30'
          : equipped
          ? 'border-emerald-500/50 bg-emerald-900/10'
          : 'border-gray-600 bg-gray-900/30',
      )}
    >
      <span className="text-[10px] text-gray-500 uppercase font-bold">
        {t(`slots.${slotId}`)}
      </span>
      {equipped && (
        <>
          <span className="text-xs text-white font-medium mt-0.5">{t(`parts.${equipped.nameKey}`)}</span>
          <button
            onClick={onRemove}
            className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] leading-none flex items-center justify-center hover:bg-red-500"
          >
            x
          </button>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Robot Canvas Preview — reflects chosen parts visually (Fix 2)
// Uses HTML5 Canvas with continuous animation loop
// ---------------------------------------------------------------------------

// Sparkle particle for RobotPreview ambient effect
interface PreviewSparkle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
}

function RobotPreview({ slots }: { slots: Partial<Record<FullSlotId, RobotPart>> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const sparklesRef = useRef<PreviewSparkle[]>([])
  const slotsRef = useRef(slots)
  slotsRef.current = slots

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width
    const H = canvas.height

    function spawnSparkle(cx: number, cy: number, range: number) {
      const angle = Math.random() * Math.PI * 2
      const dist = Math.random() * range
      sparklesRef.current.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.2 - Math.random() * 0.4,
        life: 1,
        maxLife: 60 + Math.random() * 60,
        size: 1 + Math.random() * 2,
        color: ['#0FF', '#60A5FA', '#A78BFA', '#34D399'][Math.floor(Math.random() * 4)],
      })
    }

    let frameCount = 0

    function render() {
      if (!ctx) return
      frameCount++
      const time = frameCount / 60
      const currentSlots = slotsRef.current

      ctx.clearRect(0, 0, W, H)

      const cx = W / 2

      // Breathing / idle animation: subtle scale oscillation
      const breathe = 1 + Math.sin(time * 1.5) * 0.008
      ctx.save()
      ctx.translate(cx, H * 0.55)
      ctx.scale(breathe, breathe)
      ctx.translate(-cx, -H * 0.55)

      // --- Isometric pedestal / platform ---
      const platCx = cx
      const platCy = H - 30
      const platW = 110
      const platH = 30
      const platDepth = 14

      // Platform top (diamond)
      ctx.beginPath()
      ctx.moveTo(platCx, platCy - platH / 2)
      ctx.lineTo(platCx + platW / 2, platCy)
      ctx.lineTo(platCx, platCy + platH / 2)
      ctx.lineTo(platCx - platW / 2, platCy)
      ctx.closePath()
      ctx.fillStyle = '#2D3748'
      ctx.fill()
      ctx.strokeStyle = '#4A5568'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Platform right side face
      ctx.beginPath()
      ctx.moveTo(platCx, platCy + platH / 2)
      ctx.lineTo(platCx + platW / 2, platCy)
      ctx.lineTo(platCx + platW / 2, platCy + platDepth)
      ctx.lineTo(platCx, platCy + platH / 2 + platDepth)
      ctx.closePath()
      ctx.fillStyle = '#1A202C'
      ctx.fill()
      ctx.strokeStyle = '#2D3748'
      ctx.stroke()

      // Platform left side face
      ctx.beginPath()
      ctx.moveTo(platCx, platCy + platH / 2)
      ctx.lineTo(platCx - platW / 2, platCy)
      ctx.lineTo(platCx - platW / 2, platCy + platDepth)
      ctx.lineTo(platCx, platCy + platH / 2 + platDepth)
      ctx.closePath()
      ctx.fillStyle = '#1A202C'
      ctx.fill()
      ctx.strokeStyle = '#2D3748'
      ctx.stroke()

      // --- Shadow under robot ---
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
      ctx.beginPath()
      ctx.ellipse(cx, platCy - 2, 60, 8, 0, 0, Math.PI * 2)
      ctx.fill()

      const headPart = currentSlots.head
      const bodyPart = currentSlots.body
      const leftArm = currentSlots['left-arm']
      const rightArm = currentSlots['right-arm']
      const legsPart = currentSlots.legs
      const motorPart = currentSlots['body-motor']
      const batteryPart = currentSlots['body-battery']

      const equippedCount = Object.values(currentSlots).filter(Boolean).length

      // --- Wheels / Tracks (legs slot) ---
      const legsY = H - 55
      const legsColor = legsPart?.color ?? '#444'
      if (legsPart?.id === 'wheels_tank') {
        ctx.fillStyle = legsColor
        ctx.strokeStyle = '#888'
        ctx.lineWidth = 1
        roundRect(ctx, cx - 75, legsY, 50, 28, 6)
        ctx.fill()
        ctx.stroke()
        ctx.strokeStyle = '#555'
        ctx.lineWidth = 1
        for (let i = 0; i < 5; i++) {
          ctx.beginPath()
          ctx.moveTo(cx - 70 + i * 10, legsY + 2)
          ctx.lineTo(cx - 70 + i * 10, legsY + 26)
          ctx.stroke()
        }
        ctx.fillStyle = legsColor
        ctx.strokeStyle = '#888'
        ctx.lineWidth = 1
        roundRect(ctx, cx + 25, legsY, 50, 28, 6)
        ctx.fill()
        ctx.stroke()
        for (let i = 0; i < 5; i++) {
          ctx.beginPath()
          ctx.moveTo(cx + 30 + i * 10, legsY + 2)
          ctx.lineTo(cx + 30 + i * 10, legsY + 26)
          ctx.stroke()
        }
      } else {
        const wheelR = legsPart?.id === 'wheels_small' ? 10 : 16
        ctx.fillStyle = legsColor
        ctx.strokeStyle = legsPart ? '#0FF' : '#555'
        ctx.lineWidth = legsPart ? 2 : 1
        // Left wheel
        ctx.beginPath()
        ctx.arc(cx - 45, legsY + 14, wheelR, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        // Spokes (rotating)
        ctx.strokeStyle = '#333'
        ctx.lineWidth = 2
        for (let s = 0; s < 4; s++) {
          const a = time * 2 + (s * Math.PI) / 2
          ctx.beginPath()
          ctx.moveTo(cx - 45, legsY + 14)
          ctx.lineTo(cx - 45 + Math.cos(a) * wheelR * 0.7, legsY + 14 + Math.sin(a) * wheelR * 0.7)
          ctx.stroke()
        }
        // Hub
        ctx.fillStyle = '#333'
        ctx.beginPath()
        ctx.arc(cx - 45, legsY + 14, wheelR * 0.3, 0, Math.PI * 2)
        ctx.fill()
        // Right wheel
        ctx.fillStyle = legsColor
        ctx.strokeStyle = legsPart ? '#0FF' : '#555'
        ctx.lineWidth = legsPart ? 2 : 1
        ctx.beginPath()
        ctx.arc(cx + 45, legsY + 14, wheelR, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.strokeStyle = '#333'
        ctx.lineWidth = 2
        for (let s = 0; s < 4; s++) {
          const a = time * 2 + (s * Math.PI) / 2
          ctx.beginPath()
          ctx.moveTo(cx + 45, legsY + 14)
          ctx.lineTo(cx + 45 + Math.cos(a) * wheelR * 0.7, legsY + 14 + Math.sin(a) * wheelR * 0.7)
          ctx.stroke()
        }
        ctx.fillStyle = '#333'
        ctx.beginPath()
        ctx.arc(cx + 45, legsY + 14, wheelR * 0.3, 0, Math.PI * 2)
        ctx.fill()
      }

      // --- Chassis / Body ---
      const bodyColor = bodyPart?.color ?? '#333'
      let bodyW = 80, bodyH = 70
      if (bodyPart?.id === 'chassis_light') { bodyW = 64; bodyH = 55 }
      else if (bodyPart?.id === 'chassis_heavy') { bodyW = 96; bodyH = 80 }

      const bodyTop = legsY - bodyH - 5
      ctx.fillStyle = bodyColor
      ctx.strokeStyle = bodyPart ? '#0FF' : '#555'
      ctx.lineWidth = bodyPart ? 2 : 1
      roundRect(ctx, cx - bodyW / 2, bodyTop, bodyW, bodyH, 10)
      ctx.fill()
      ctx.stroke()

      // Ambient glow around body when parts are equipped
      if (equippedCount > 0) {
        const glowAlpha = 0.06 + Math.sin(time * 2) * 0.03
        ctx.shadowColor = '#0FF'
        ctx.shadowBlur = 15 + Math.sin(time * 2) * 5
        ctx.strokeStyle = `rgba(0, 255, 255, ${glowAlpha})`
        ctx.lineWidth = 3
        roundRect(ctx, cx - bodyW / 2 - 4, bodyTop - 4, bodyW + 8, bodyH + 8, 12)
        ctx.stroke()
        ctx.shadowBlur = 0
      }

      // Panel detail on body
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      roundRect(ctx, cx - bodyW / 2 + 8, bodyTop + 10, bodyW - 16, 22, 4)
      ctx.fill()

      // --- Motor indicator (exhaust on back) ---
      const motorGlow = motorPart?.id === 'motor_heavy' ? 1.0
        : motorPart?.id === 'motor_standard' ? 0.6
        : motorPart?.id === 'motor_basic' ? 0.3 : 0
      if (motorGlow > 0) {
        const pulse = 0.8 + Math.sin(time * 4) * 0.2
        ctx.fillStyle = `rgba(255, 140, 0, ${motorGlow * pulse})`
        ctx.beginPath()
        ctx.arc(cx - bodyW / 2 - 6, bodyTop + bodyH / 2, 6, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = `rgba(255, 200, 50, ${motorGlow * 0.4 * pulse})`
        ctx.beginPath()
        ctx.arc(cx - bodyW / 2 - 6, bodyTop + bodyH / 2, 12, 0, Math.PI * 2)
        ctx.fill()
      }

      // --- Battery indicator ---
      if (batteryPart) {
        const batX = cx + bodyW / 2 + 4
        const batY = bodyTop + bodyH / 2 - 12
        const batBars = batteryPart.id === 'battery_large' ? 3
          : batteryPart.id === 'battery_medium' ? 2 : 1
        ctx.strokeStyle = '#4ADE80'
        ctx.lineWidth = 1
        ctx.strokeRect(batX, batY, 12, 24)
        ctx.fillStyle = '#333'
        ctx.fillRect(batX + 3, batY - 3, 6, 3)
        // Battery bars with pulse
        const batPulse = 0.7 + Math.sin(time * 3) * 0.3
        ctx.fillStyle = `rgba(74, 222, 128, ${batPulse})`
        for (let i = 0; i < batBars; i++) {
          ctx.fillRect(batX + 2, batY + 20 - i * 7, 8, 5)
        }
      }

      // --- Arms ---
      drawArm(ctx, cx - bodyW / 2, bodyTop + 12, leftArm, 'left')
      drawArm(ctx, cx + bodyW / 2, bodyTop + 12, rightArm, 'right')

      // --- Head / Sensor ---
      const headColor = headPart?.color ?? '#444'
      const headY = bodyTop - 8

      // Antenna blink cycle
      const antennaBlink = Math.sin(time * 3) > 0.3 ? 1 : 0.3

      if (headPart?.id === 'sensor_pro') {
        ctx.fillStyle = headColor
        ctx.strokeStyle = '#0FF'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(cx, headY - 22, 22, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#0FF'
        ctx.beginPath()
        ctx.arc(cx - 8, headY - 24, 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(cx + 8, headY - 24, 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#0FF'
        ctx.lineWidth = 2
        for (const dx of [-10, 0, 10]) {
          ctx.beginPath()
          ctx.moveTo(cx + dx, headY - 44)
          ctx.lineTo(cx + dx, headY - 54)
          ctx.stroke()
          // Pulsing antenna tips
          ctx.fillStyle = `rgba(0, 255, 255, ${antennaBlink})`
          ctx.beginPath()
          ctx.arc(cx + dx, headY - 56, 3 + Math.sin(time * 4 + dx) * 1, 0, Math.PI * 2)
          ctx.fill()
          // Glow on antenna tip
          ctx.fillStyle = `rgba(0, 255, 255, ${antennaBlink * 0.3})`
          ctx.beginPath()
          ctx.arc(cx + dx, headY - 56, 6, 0, Math.PI * 2)
          ctx.fill()
        }
      } else if (headPart?.id === 'sensor_advanced') {
        ctx.fillStyle = headColor
        ctx.strokeStyle = '#0FF'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(cx, headY - 18, 18, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#0FF'
        ctx.beginPath()
        ctx.arc(cx - 6, headY - 20, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(cx + 6, headY - 20, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#0FF'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(cx, headY - 36)
        ctx.lineTo(cx, headY - 50)
        ctx.stroke()
        ctx.fillStyle = `rgba(0, 255, 255, ${antennaBlink})`
        ctx.beginPath()
        ctx.arc(cx, headY - 52, 3 + Math.sin(time * 4) * 1, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = `rgba(0, 255, 255, ${antennaBlink * 0.3})`
        ctx.beginPath()
        ctx.arc(cx, headY - 52, 6, 0, Math.PI * 2)
        ctx.fill()
      } else {
        const r = headPart ? 12 : 10
        ctx.fillStyle = headColor
        ctx.strokeStyle = headPart ? '#0FF' : '#555'
        ctx.lineWidth = headPart ? 2 : 1
        ctx.beginPath()
        ctx.arc(cx, headY - r, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        if (headPart) {
          ctx.fillStyle = '#0FF'
          ctx.beginPath()
          ctx.arc(cx - 4, headY - r - 2, 2, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(cx + 4, headY - r - 2, 2, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      ctx.restore() // end breathing transform

      // --- Floating sparkles around equipped parts ---
      if (equippedCount > 0 && frameCount % 8 === 0) {
        spawnSparkle(cx, H * 0.45, 70)
      }

      // Update and draw sparkles
      const alive: PreviewSparkle[] = []
      sparklesRef.current.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.life -= 1 / p.maxLife
        if (p.life > 0) {
          ctx.globalAlpha = p.life * 0.7
          ctx.fillStyle = p.color
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fill()
          alive.push(p)
        }
      })
      ctx.globalAlpha = 1
      sparklesRef.current = alive

      animRef.current = requestAnimationFrame(render)
    }

    animRef.current = requestAnimationFrame(render)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, []) // continuous loop — reads slots from ref

  return (
    <canvas
      ref={canvasRef}
      width={240}
      height={320}
      className="w-full max-w-[240px] mx-auto"
      style={{ imageRendering: 'auto' }}
    />
  )
}

// Helper: draw a rounded rectangle path
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

// Helper: draw arm based on part type
function drawArm(
  ctx: CanvasRenderingContext2D,
  attachX: number,
  attachY: number,
  armPart: RobotPart | undefined,
  side: 'left' | 'right',
) {
  const dir = side === 'left' ? -1 : 1
  const armColor = armPart?.color ?? '#444'
  const armLen = 50
  const endX = attachX + dir * 30
  const endY = attachY + armLen

  if (armPart?.id === 'arm_power') {
    // Thick lines with big clamp
    ctx.strokeStyle = armColor
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(attachX, attachY)
    ctx.lineTo(endX, endY)
    ctx.stroke()
    // Big clamp
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(endX - dir * 8, endY)
    ctx.lineTo(endX - dir * 12, endY + 14)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(endX + dir * 4, endY)
    ctx.lineTo(endX + dir * 8, endY + 14)
    ctx.stroke()
    // Clamp tips
    ctx.fillStyle = armColor
    ctx.beginPath()
    ctx.arc(endX - dir * 12, endY + 14, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(endX + dir * 8, endY + 14, 4, 0, Math.PI * 2)
    ctx.fill()
  } else if (armPart?.id === 'arm_precision') {
    // Thin lines with delicate pointed tip
    ctx.strokeStyle = armColor
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(attachX, attachY)
    ctx.lineTo(endX, endY)
    ctx.stroke()
    // Delicate tip (3 thin fingers)
    ctx.lineWidth = 1.5
    for (const angle of [-0.4, 0, 0.4]) {
      ctx.beginPath()
      ctx.moveTo(endX, endY)
      ctx.lineTo(endX + Math.sin(angle) * 12 * dir, endY + Math.cos(angle) * 12)
      ctx.stroke()
    }
    // Small dot at tip center
    ctx.fillStyle = armColor
    ctx.beginPath()
    ctx.arc(endX, endY + 12, 2, 0, Math.PI * 2)
    ctx.fill()
  } else {
    // Basic gripper or empty = thin line with small clamp
    ctx.strokeStyle = armColor
    ctx.lineWidth = armPart ? 3 : 2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(attachX, attachY)
    ctx.lineTo(endX, endY)
    ctx.stroke()
    if (armPart) {
      // Small clamp
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(endX - dir * 4, endY)
      ctx.lineTo(endX - dir * 6, endY + 8)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(endX + dir * 2, endY)
      ctx.lineTo(endX + dir * 4, endY + 8)
      ctx.stroke()
    }
  }

  // Highlight arm connection
  if (armPart) {
    ctx.strokeStyle = '#0FF'
    ctx.lineWidth = 1
  }
}

// ---------------------------------------------------------------------------
// Particle systems for TestAnimationCanvas
// ---------------------------------------------------------------------------

interface SceneParticle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  type: 'dust' | 'exhaust' | 'confetti' | 'crash' | 'ambient'
  rotation?: number
  rotSpeed?: number
}

const CONFETTI_COLORS = ['#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#A855F7', '#EC4899']

function createConfettiParticles(cx: number, cy: number): SceneParticle[] {
  const particles: SceneParticle[] = []
  for (let i = 0; i < 50; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 1.5 + Math.random() * 4
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      life: 1, maxLife: 80 + Math.random() * 40,
      size: 3 + Math.random() * 3,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      type: 'confetti',
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.2,
    })
  }
  return particles
}

function createCrashParticles(cx: number, cy: number): SceneParticle[] {
  const particles: SceneParticle[] = []
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 1 + Math.random() * 3
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      life: 1, maxLife: 40 + Math.random() * 20,
      size: 2 + Math.random() * 3,
      color: ['#F97316', '#EF4444', '#FCD34D', '#666'][Math.floor(Math.random() * 4)],
      type: 'crash',
    })
  }
  return particles
}

// ---------------------------------------------------------------------------
// Test Animation Canvas (Fix 1) — robot walks to box, then lift/fail
// Uses HTML5 Canvas for smooth animation with particle effects
// ---------------------------------------------------------------------------

function TestAnimationCanvas({
  testResult,
  testQuality,
  slots,
  onAnimationEnd,
  t,
}: {
  testResult: TestResult
  testQuality: TestQuality
  slots: Partial<Record<FullSlotId, RobotPart>>
  onAnimationEnd: () => void
  t: (key: string, values?: Record<string, string | number>) => string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const particlesRef = useRef<SceneParticle[]>([])
  const confettiFiredRef = useRef(false)
  const crashFiredRef = useRef(false)
  const [statusText, setStatusText] = useState<string>('')
  const [statusColor, setStatusColor] = useState<string>('')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width
    const H = canvas.height

    // Cancel any prior animation
    if (animRef.current) cancelAnimationFrame(animRef.current)
    setStatusText('')
    setStatusColor('')
    particlesRef.current = []
    confettiFiredRef.current = false
    crashFiredRef.current = false

    if (!testResult) {
      // Draw idle state with ambient particles
      ctx.clearRect(0, 0, W, H)
      drawScene(ctx, W, H, 0, slots, null, 0, 0, 0, 0, 0, 0, [], 0, t('canvasWeight'))
      return
    }

    // Animation phases:
    // 0..1500ms — robot walks from left to box
    // 1500..2500ms — lift attempt
    // 2500..3500ms — result (hold)
    // 3500ms — done
    startTimeRef.current = performance.now()

    function animate(now: number) {
      if (!ctx || !canvas) return
      const elapsed = now - startTimeRef.current
      const progress = Math.min(elapsed / 3500, 1)
      const time = elapsed / 1000

      ctx.clearRect(0, 0, W, H)

      let robotX = 0
      let armRaise = 0
      let boxLift = 0
      let robotTilt = 0
      let robotShake = 0
      let wheelSpin = elapsed / 200
      const isMoving = elapsed < 1500

      if (elapsed < 1500) {
        // Phase 1: walking toward box
        // Ease-out for smooth deceleration
        const t = elapsed / 1500
        const ease = 1 - Math.pow(1 - t, 3)
        robotX = ease * 0.52

        // Spawn dust particles behind wheels while moving
        if (Math.random() < 0.4) {
          const rCenterX = 60 + robotX * (W - 120)
          particlesRef.current.push({
            x: rCenterX - 20 + Math.random() * 10,
            y: H - 50 + Math.random() * 5,
            vx: -0.5 - Math.random() * 1.5,
            vy: -0.3 - Math.random() * 0.5,
            life: 1, maxLife: 30 + Math.random() * 20,
            size: 2 + Math.random() * 3,
            color: 'rgba(156, 163, 175, 0.6)',
            type: 'dust',
          })
        }

        // Motor exhaust sparks
        const motorPart = slots['body-motor']
        if (motorPart && Math.random() < 0.3) {
          const rCenterX = 60 + robotX * (W - 120)
          particlesRef.current.push({
            x: rCenterX - 25,
            y: H - 80 + Math.random() * 10,
            vx: -1 - Math.random() * 2,
            vy: -0.5 + Math.random(),
            life: 1, maxLife: 15 + Math.random() * 10,
            size: 1.5 + Math.random() * 2,
            color: ['#F97316', '#FCD34D', '#EF4444'][Math.floor(Math.random() * 3)],
            type: 'exhaust',
          })
        }
      } else if (elapsed < 2500) {
        // Phase 2: attempting lift
        robotX = 0.52
        const liftProgress = (elapsed - 1500) / 1000
        armRaise = liftProgress

        if (testResult === 'success') {
          boxLift = liftProgress * 40
        } else if (testResult === 'fail') {
          boxLift = Math.sin(liftProgress * Math.PI) * 5
          robotShake = Math.sin(liftProgress * 20) * 3
        } else if (testResult === 'tip-over') {
          robotTilt = liftProgress * 45
          boxLift = 0
          // Spawn crash particles at tip-over moment
          if (liftProgress > 0.6 && !crashFiredRef.current) {
            crashFiredRef.current = true
            const rCenterX = 60 + robotX * (W - 120)
            particlesRef.current.push(...createCrashParticles(rCenterX, H - 60))
          }
        }
      } else {
        // Phase 3: result hold
        robotX = 0.52
        armRaise = 1

        if (testResult === 'success') {
          boxLift = 40
          if (!statusText) {
            setStatusText(t('animSuccess'))
            setStatusColor('bg-green-600/90')
          }
          // Fire confetti once
          if (!confettiFiredRef.current) {
            confettiFiredRef.current = true
            const boxBaseX = W * 0.6
            particlesRef.current.push(...createConfettiParticles(boxBaseX, H - 100))
          }
        } else if (testResult === 'fail') {
          boxLift = 0
          robotShake = Math.sin(elapsed * 0.03) * 2
          if (!statusText) {
            setStatusText(t('animFail'))
            setStatusColor('bg-red-600/90')
          }
        } else if (testResult === 'tip-over') {
          robotTilt = 45
          if (!statusText) {
            setStatusText(t('animTipOver'))
            setStatusColor('bg-red-600/90')
          }
        }
      }

      // Jerky quality = add vibration during lift phase
      if (testQuality === 'jerky' && elapsed >= 1500 && elapsed < 2500) {
        robotShake += Math.sin(elapsed * 0.05) * 2
      }

      // Ambient floating dust
      if (Math.random() < 0.08) {
        particlesRef.current.push({
          x: Math.random() * W,
          y: H - 40 - Math.random() * 20,
          vx: 0.2 + Math.random() * 0.3,
          vy: -0.1 - Math.random() * 0.2,
          life: 1, maxLife: 80 + Math.random() * 60,
          size: 1 + Math.random() * 1.5,
          color: 'rgba(156, 163, 175, 0.3)',
          type: 'ambient',
        })
      }

      // Update particles
      const aliveParticles: SceneParticle[] = []
      particlesRef.current.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        if (p.type === 'confetti') {
          p.vy += 0.06 // gravity
          p.rotation = (p.rotation ?? 0) + (p.rotSpeed ?? 0)
        }
        if (p.type === 'crash') {
          p.vy += 0.08
        }
        p.life -= 1 / p.maxLife
        if (p.life > 0) aliveParticles.push(p)
      })
      particlesRef.current = aliveParticles

      // Red flash overlay on fail/tip-over in phase 3
      let redFlash = 0
      if ((testResult === 'fail' || testResult === 'tip-over') && elapsed >= 2500 && elapsed < 2800) {
        redFlash = 1 - (elapsed - 2500) / 300
      }

      drawScene(ctx, W, H, robotX, slots, testResult, armRaise, boxLift, robotTilt, robotShake, wheelSpin, time, particlesRef.current, redFlash, t('canvasWeight'))

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        onAnimationEnd()
      }
    }

    animRef.current = requestAnimationFrame(animate)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  // We intentionally only re-run when testResult changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testResult])

  return (
    <div className="relative w-full rounded-xl border border-gray-800 overflow-hidden bg-gray-950">
      <canvas
        ref={canvasRef}
        width={600}
        height={320}
        className="w-full"
        style={{ minHeight: 200 }}
      />
      {/* Status text overlay */}
      {statusText && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={clsx('px-6 py-3 rounded-xl text-lg font-black text-white', statusColor)}>
            {statusText}
          </div>
        </div>
      )}
      {!testResult && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm pointer-events-none">
          {t('animIdle')}
        </div>
      )}
    </div>
  )
}

// Draw the full test scene on canvas
function drawScene(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  robotX: number, // 0..1 across the scene
  slots: Partial<Record<FullSlotId, RobotPart>>,
  testResult: TestResult,
  armRaise: number,  // 0..1
  boxLift: number,
  robotTilt: number = 0,
  robotShake: number = 0,
  wheelSpin: number = 0,
  time: number = 0,
  particles: SceneParticle[] = [],
  redFlash: number = 0,
  weightLabel: string = '10kg',
) {
  const groundY = H - 40

  // --- Background gradient ---
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H)
  bgGrad.addColorStop(0, '#0F172A')
  bgGrad.addColorStop(1, '#1E293B')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, W, H)

  // --- 2.5D Isometric ground tiles ---
  const tileW = 60
  const tileH = 20
  const tileDepth = 10
  const tilesAcross = Math.ceil(W / (tileW / 2)) + 2

  for (let i = -1; i < tilesAcross; i++) {
    const tx = i * (tileW / 2) - 10
    const ty = groundY
    const isEven = i % 2 === 0

    // Tile top face (diamond)
    ctx.beginPath()
    ctx.moveTo(tx, ty)
    ctx.lineTo(tx + tileW / 2, ty - tileH / 2)
    ctx.lineTo(tx + tileW, ty)
    ctx.lineTo(tx + tileW / 2, ty + tileH / 2)
    ctx.closePath()
    ctx.fillStyle = isEven ? '#2D3748' : '#334155'
    ctx.fill()
    ctx.strokeStyle = '#4A5568'
    ctx.lineWidth = 0.5
    ctx.stroke()

    // Tile front side face (depth)
    ctx.beginPath()
    ctx.moveTo(tx, ty)
    ctx.lineTo(tx + tileW / 2, ty + tileH / 2)
    ctx.lineTo(tx + tileW / 2, ty + tileH / 2 + tileDepth)
    ctx.lineTo(tx, ty + tileDepth)
    ctx.closePath()
    ctx.fillStyle = isEven ? '#1A202C' : '#1E293B'
    ctx.fill()
    ctx.strokeStyle = '#2D3748'
    ctx.lineWidth = 0.5
    ctx.stroke()

    // Tile right side face
    ctx.beginPath()
    ctx.moveTo(tx + tileW / 2, ty + tileH / 2)
    ctx.lineTo(tx + tileW, ty)
    ctx.lineTo(tx + tileW, ty + tileDepth)
    ctx.lineTo(tx + tileW / 2, ty + tileH / 2 + tileDepth)
    ctx.closePath()
    ctx.fillStyle = isEven ? '#171923' : '#1A202C'
    ctx.fill()
    ctx.strokeStyle = '#2D3748'
    ctx.lineWidth = 0.5
    ctx.stroke()
  }

  // Fill below tiles
  ctx.fillStyle = '#0F172A'
  ctx.fillRect(0, groundY + tileH / 2 + tileDepth, W, H)

  // --- 3D Box (at fixed position) ---
  const boxBaseX = W * 0.6
  const boxW = 50
  const boxH = 50
  const boxY = groundY - boxH - boxLift
  const boxDepthX = 12
  const boxDepthY = 8

  // Box shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
  ctx.beginPath()
  ctx.ellipse(boxBaseX, groundY + 2, boxW * 0.5, 6, 0, 0, Math.PI * 2)
  ctx.fill()

  // Box top face
  ctx.fillStyle = '#B45309'
  ctx.beginPath()
  ctx.moveTo(boxBaseX - boxW / 2, boxY)
  ctx.lineTo(boxBaseX - boxW / 2 + boxDepthX, boxY - boxDepthY)
  ctx.lineTo(boxBaseX + boxW / 2 + boxDepthX, boxY - boxDepthY)
  ctx.lineTo(boxBaseX + boxW / 2, boxY)
  ctx.closePath()
  ctx.fill()

  // Box front face
  ctx.fillStyle = '#92400E'
  ctx.strokeStyle = '#D97706'
  ctx.lineWidth = 1.5
  roundRect(ctx, boxBaseX - boxW / 2, boxY, boxW, boxH, 2)
  ctx.fill()
  ctx.stroke()

  // Box right side face
  ctx.fillStyle = '#78350F'
  ctx.beginPath()
  ctx.moveTo(boxBaseX + boxW / 2, boxY)
  ctx.lineTo(boxBaseX + boxW / 2 + boxDepthX, boxY - boxDepthY)
  ctx.lineTo(boxBaseX + boxW / 2 + boxDepthX, boxY + boxH - boxDepthY)
  ctx.lineTo(boxBaseX + boxW / 2, boxY + boxH)
  ctx.closePath()
  ctx.fill()

  // Box label
  ctx.fillStyle = '#FCD34D'
  ctx.font = 'bold 14px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(weightLabel, boxBaseX, boxY + boxH / 2 + 5)

  // --- Robot shadow ---
  const robotCenterX = 60 + robotX * (W - 120) + robotShake
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
  ctx.beginPath()
  ctx.ellipse(robotCenterX, groundY + 2, 30, 6, 0, 0, Math.PI * 2)
  ctx.fill()

  // --- Robot ---
  const robotBaseY = groundY

  ctx.save()
  if (robotTilt !== 0) {
    ctx.translate(robotCenterX, robotBaseY)
    ctx.rotate((robotTilt * Math.PI) / 180)
    ctx.translate(-robotCenterX, -robotBaseY)
  }

  const bodyPart = slots.body
  const legsPart = slots.legs
  const headPart = slots.head
  const leftArm = slots['left-arm']
  const rightArm = slots['right-arm']

  // Robot dimensions based on chassis
  let rBodyW = 50, rBodyH = 40
  if (bodyPart?.id === 'chassis_light') { rBodyW = 40; rBodyH = 32 }
  else if (bodyPart?.id === 'chassis_heavy') { rBodyW = 60; rBodyH = 48 }
  const bodyColor = bodyPart?.color ?? '#3B82F6'

  // Wheels with spinning spokes
  const wheelY = robotBaseY
  const legsColor = legsPart?.color ?? '#F59E0B'
  if (legsPart?.id === 'wheels_tank') {
    ctx.fillStyle = legsColor
    roundRect(ctx, robotCenterX - rBodyW / 2 - 5, wheelY - 16, rBodyW / 2 + 2, 16, 3)
    ctx.fill()
    roundRect(ctx, robotCenterX + 3, wheelY - 16, rBodyW / 2 + 2, 16, 3)
    ctx.fill()
    ctx.strokeStyle = '#555'
    ctx.lineWidth = 1
    for (let i = 0; i < 4; i++) {
      const offset = (wheelSpin * 3) % 8
      const lx = robotCenterX - rBodyW / 2 - 3 + ((i * 8 + offset) % 32)
      ctx.beginPath(); ctx.moveTo(lx, wheelY - 15); ctx.lineTo(lx, wheelY - 2); ctx.stroke()
      const rx = robotCenterX + 5 + ((i * 8 + offset) % 32)
      ctx.beginPath(); ctx.moveTo(rx, wheelY - 15); ctx.lineTo(rx, wheelY - 2); ctx.stroke()
    }
  } else {
    const wheelR = legsPart?.id === 'wheels_small' ? 8 : 12
    // Left wheel
    ctx.fillStyle = legsColor
    ctx.strokeStyle = legsPart ? '#0FF' : '#555'
    ctx.lineWidth = legsPart ? 1.5 : 1
    ctx.beginPath()
    ctx.arc(robotCenterX - rBodyW / 2 + 5, wheelY - wheelR, wheelR, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    // 4 spokes
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 2
    for (let s = 0; s < 4; s++) {
      const a = wheelSpin + (s * Math.PI) / 2
      ctx.beginPath()
      ctx.moveTo(robotCenterX - rBodyW / 2 + 5, wheelY - wheelR)
      ctx.lineTo(
        robotCenterX - rBodyW / 2 + 5 + Math.cos(a) * wheelR * 0.7,
        wheelY - wheelR + Math.sin(a) * wheelR * 0.7,
      )
      ctx.stroke()
    }
    // Hub
    ctx.fillStyle = '#333'
    ctx.beginPath()
    ctx.arc(robotCenterX - rBodyW / 2 + 5, wheelY - wheelR, wheelR * 0.25, 0, Math.PI * 2)
    ctx.fill()
    // Right wheel
    ctx.fillStyle = legsColor
    ctx.strokeStyle = legsPart ? '#0FF' : '#555'
    ctx.lineWidth = legsPart ? 1.5 : 1
    ctx.beginPath()
    ctx.arc(robotCenterX + rBodyW / 2 - 5, wheelY - wheelR, wheelR, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 2
    for (let s = 0; s < 4; s++) {
      const a = wheelSpin + (s * Math.PI) / 2
      ctx.beginPath()
      ctx.moveTo(robotCenterX + rBodyW / 2 - 5, wheelY - wheelR)
      ctx.lineTo(
        robotCenterX + rBodyW / 2 - 5 + Math.cos(a) * wheelR * 0.7,
        wheelY - wheelR + Math.sin(a) * wheelR * 0.7,
      )
      ctx.stroke()
    }
    ctx.fillStyle = '#333'
    ctx.beginPath()
    ctx.arc(robotCenterX + rBodyW / 2 - 5, wheelY - wheelR, wheelR * 0.25, 0, Math.PI * 2)
    ctx.fill()
  }

  // Body
  const rBodyTop = wheelY - 18 - rBodyH
  ctx.fillStyle = bodyColor
  ctx.strokeStyle = '#0FF'
  ctx.lineWidth = 1
  roundRect(ctx, robotCenterX - rBodyW / 2, rBodyTop, rBodyW, rBodyH, 6)
  ctx.fill()
  ctx.stroke()

  // Body glow effect
  ctx.shadowColor = '#0FF'
  ctx.shadowBlur = 8
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.15)'
  ctx.lineWidth = 2
  roundRect(ctx, robotCenterX - rBodyW / 2 - 2, rBodyTop - 2, rBodyW + 4, rBodyH + 4, 8)
  ctx.stroke()
  ctx.shadowBlur = 0

  // Arms (raise during lift phase)
  const armColor = leftArm?.color ?? '#10B981'
  const rArmColor = rightArm?.color ?? '#10B981'
  const armBaseY = rBodyTop + 8
  const armEndYBase = rBodyTop + rBodyH - 5
  const armAngle = -armRaise * 1.2
  drawAnimArm(ctx, robotCenterX - rBodyW / 2, armBaseY, armEndYBase, armAngle, armColor, leftArm, -1)
  drawAnimArm(ctx, robotCenterX + rBodyW / 2, armBaseY, armEndYBase, armAngle, rArmColor, rightArm, 1)

  // Head
  const headColor = headPart?.color ?? '#8B5CF6'
  const headY = rBodyTop - 4
  const headR = headPart?.id === 'sensor_pro' ? 14 : headPart?.id === 'sensor_advanced' ? 12 : 10
  ctx.fillStyle = headColor
  ctx.beginPath()
  ctx.arc(robotCenterX, headY - headR, headR, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#0FF'
  ctx.lineWidth = 1
  ctx.stroke()
  // Eyes
  ctx.fillStyle = '#0FF'
  ctx.beginPath()
  ctx.arc(robotCenterX - headR * 0.35, headY - headR - 2, 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(robotCenterX + headR * 0.35, headY - headR - 2, 2, 0, Math.PI * 2)
  ctx.fill()
  // Antenna(s) with blinking tips
  const antBlink = Math.sin(time * 5) > 0.3 ? 1 : 0.3
  if (headPart?.id === 'sensor_pro') {
    ctx.strokeStyle = '#0FF'
    ctx.lineWidth = 1.5
    for (const dx of [-6, 0, 6]) {
      ctx.beginPath()
      ctx.moveTo(robotCenterX + dx, headY - headR * 2)
      ctx.lineTo(robotCenterX + dx, headY - headR * 2 - 10)
      ctx.stroke()
      ctx.fillStyle = `rgba(0, 255, 255, ${antBlink})`
      ctx.beginPath()
      ctx.arc(robotCenterX + dx, headY - headR * 2 - 12, 2 + Math.sin(time * 4 + dx) * 0.5, 0, Math.PI * 2)
      ctx.fill()
      // Glow
      ctx.fillStyle = `rgba(0, 255, 255, ${antBlink * 0.25})`
      ctx.beginPath()
      ctx.arc(robotCenterX + dx, headY - headR * 2 - 12, 5, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (headPart?.id === 'sensor_advanced') {
    ctx.strokeStyle = '#0FF'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(robotCenterX, headY - headR * 2)
    ctx.lineTo(robotCenterX, headY - headR * 2 - 10)
    ctx.stroke()
    ctx.fillStyle = `rgba(0, 255, 255, ${antBlink})`
    ctx.beginPath()
    ctx.arc(robotCenterX, headY - headR * 2 - 12, 2 + Math.sin(time * 4) * 0.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = `rgba(0, 255, 255, ${antBlink * 0.25})`
    ctx.beginPath()
    ctx.arc(robotCenterX, headY - headR * 2 - 12, 5, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()

  // --- Draw particles ---
  particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.life)
    ctx.fillStyle = p.color

    if (p.type === 'confetti') {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rotation ?? 0)
      ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6)
      ctx.restore()
    } else if (p.type === 'crash') {
      // Star/spark shape
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
      // Small glow
      ctx.fillStyle = p.color
      ctx.globalAlpha = p.life * 0.3
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
  })
  ctx.globalAlpha = 1

  // --- Red flash overlay on fail ---
  if (redFlash > 0) {
    ctx.fillStyle = `rgba(239, 68, 68, ${redFlash * 0.15})`
    ctx.fillRect(0, 0, W, H)
  }
}

function drawAnimArm(
  ctx: CanvasRenderingContext2D,
  attachX: number,
  attachY: number,
  endY: number,
  angle: number,
  color: string,
  armPart: RobotPart | undefined,
  dir: number,
) {
  const armLen = endY - attachY
  // Calculate end position with rotation
  const endX = attachX + dir * 20 + Math.sin(angle) * armLen * dir
  const finalY = attachY + Math.cos(angle) * armLen

  const thick = armPart?.id === 'arm_power' ? 5 : armPart?.id === 'arm_precision' ? 2 : 3
  ctx.strokeStyle = color
  ctx.lineWidth = thick
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(attachX, attachY)
  ctx.lineTo(endX, finalY)
  ctx.stroke()

  // Clamp at end
  if (armPart?.id === 'arm_power') {
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(endX - dir * 5, finalY)
    ctx.lineTo(endX - dir * 8, finalY + 8)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(endX + dir * 3, finalY)
    ctx.lineTo(endX + dir * 6, finalY + 8)
    ctx.stroke()
  } else if (armPart?.id === 'arm_precision') {
    ctx.lineWidth = 1
    for (const a of [-0.3, 0, 0.3]) {
      ctx.beginPath()
      ctx.moveTo(endX, finalY)
      ctx.lineTo(endX + Math.sin(a) * 8 * dir, finalY + Math.cos(a) * 8)
      ctx.stroke()
    }
  } else if (armPart) {
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(endX - dir * 3, finalY)
    ctx.lineTo(endX - dir * 4, finalY + 6)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(endX + dir * 1, finalY)
    ctx.lineTo(endX + dir * 2, finalY + 6)
    ctx.stroke()
  }
}

// ---------------------------------------------------------------------------
// Main RobotMission1 component
// ---------------------------------------------------------------------------

export default function RobotMission1({ onComplete }: RobotMission1Props) {
  const t = useTranslations('missions.robot.m1')
  const [slots, setSlots] = useState<Partial<Record<FullSlotId, RobotPart>>>({})
  const [activeId, setActiveId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<TestResult>(null)
  const [testQuality, setTestQuality] = useState<TestQuality>('fail')

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  const sensors = useSensors(pointerSensor, touchSensor)

  // Compute totals
  const equippedParts = Object.values(slots).filter(Boolean) as RobotPart[]
  const totalCost = equippedParts.reduce((s, p) => s + p.cost, 0)
  const totalWeight = equippedParts.reduce((s, p) => s + p.weight, 0)
  const overBudget = totalCost > BUDGET
  const overWeight = totalWeight > WEIGHT_LIMIT

  // Check if main 5 slots are filled
  const mainSlots: SlotId[] = ['head', 'body', 'left-arm', 'right-arm', 'legs']
  const mainSlotsFilled = mainSlots.every((s) => slots[s])
  const allSlotsFilled = mainSlotsFilled && !!slots['body-motor'] && !!slots['body-battery']

  // Get strength from chassis
  const chassisStrength = (slots.body?.stats?.strength as number) ?? 0
  // Get motor power
  const motorPower: MotorPower = (slots['body-motor']?.stats?.power as MotorPower) ?? 'low'
  const motorPowerLevel = motorPower === 'high' ? 3 : motorPower === 'medium' ? 2 : 1

  // Test conditions
  const canPassTest = chassisStrength >= 5 && motorPowerLevel >= 2 && mainSlotsFilled

  const determineTestQuality = useCallback((): TestQuality => {
    if (!canPassTest) return 'fail'
    if (allSlotsFilled && !overBudget && !overWeight) return 'smooth'
    return 'jerky'
  }, [canPassTest, allSlotsFilled, overBudget, overWeight])

  const determineTestResult = useCallback((): TestResult => {
    if (!mainSlotsFilled) return 'fail'
    if (!canPassTest && chassisStrength < 3) return 'tip-over'
    if (!canPassTest) return 'fail'
    return 'success'
  }, [mainSlotsFilled, canPassTest, chassisStrength])

  const calculateScore = useCallback((): ScoreBreakdown => {
    const filledMainCount = mainSlots.filter((s) => slots[s]).length
    const design = filledMainCount === 5 ? 350 : Math.round((filledMainCount / 5) * 350)
    const physics = canPassTest && mainSlotsFilled ? 300 : 0
    const budgetScore = Math.max(0, Math.round((1 - totalCost / BUDGET) * 200))
    const quality = determineTestQuality()
    const testing = quality === 'smooth' ? 150 : quality === 'jerky' ? 75 : 0

    return {
      design,
      physics,
      budget: budgetScore,
      testing,
      total: design + physics + budgetScore + testing,
    }
  }, [slots, canPassTest, mainSlotsFilled, totalCost, determineTestQuality])

  const handleTestRobot = useCallback(() => {
    const result = determineTestResult()
    const quality = determineTestQuality()
    setTestResult(result)
    setTestQuality(quality)
  }, [determineTestResult, determineTestQuality])

  const handleAnimationEnd = useCallback(() => {
    const breakdown = calculateScore()
    // Convert to ScoreBreakdownItem[] format for MissionShell
    const breakdownItems: ScoreBreakdownItem[] = [
      { label: t('scoreDesign'), value: breakdown.design, max: 350 },
      { label: t('scorePhysics'), value: breakdown.physics, max: 300 },
      { label: t('scoreBudget'), value: breakdown.budget, max: 200 },
      { label: t('scoreTesting'), value: breakdown.testing, max: 150 },
    ]
    onComplete?.(breakdown.total, breakdownItems)
  }, [calculateScore, onComplete, t])

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(e.active.id as string)
  }, [])

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = e
    if (!over) return

    const part = active.data.current?.part as RobotPart | undefined
    if (!part) return

    const targetSlot = over.id as FullSlotId
    if (!ALL_SLOT_IDS.includes(targetSlot)) return
    if (!canDropInSlot(part, targetSlot)) return

    // Reset test when parts change
    setTestResult(null)
    setSlots((prev) => ({ ...prev, [targetSlot]: part }))
  }, [])

  const removeFromSlot = useCallback((slotId: FullSlotId) => {
    setSlots((prev) => {
      const next = { ...prev }
      delete next[slotId]
      return next
    })
    setTestResult(null)
  }, [])

  const activeModule = activeId ? ALL_PARTS.find((p) => p.id === activeId) : null

  // Group parts by category for the catalog
  const categories = useMemo(() => {
    const cats: Record<string, RobotPart[]> = {}
    for (const part of ALL_PARTS) {
      if (!cats[part.category]) cats[part.category] = []
      cats[part.category].push(part)
    }
    return cats
  }, [])

  const equippedIds = new Set(equippedParts.map((p) => p.id))

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="p-4 md:p-6 space-y-6">
        {/* Budget + Weight counters */}
        <div className="grid grid-cols-2 gap-4">
          {/* Budget */}
          <div className="bg-gray-950 rounded-xl p-3 border border-gray-800">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">{t('budget')}</span>
              <span
                className={clsx(
                  'font-bold',
                  overBudget ? 'text-red-400' : 'text-yellow-400',
                )}
              >
                ${totalCost} / ${BUDGET}
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, (totalCost / BUDGET) * 100)}%`,
                  backgroundColor: overBudget ? '#EF4444' : '#FBBF24',
                }}
              />
            </div>
            {overBudget && (
              <p className="text-red-400 text-xs mt-1">{t('overBudget')}</p>
            )}
          </div>

          {/* Weight */}
          <div className="bg-gray-950 rounded-xl p-3 border border-gray-800">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">{t('weight')}</span>
              <span
                className={clsx(
                  'font-bold',
                  overWeight ? 'text-red-400' : 'text-blue-400',
                )}
              >
                {totalWeight}kg / {WEIGHT_LIMIT}kg
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, (totalWeight / WEIGHT_LIMIT) * 100)}%`,
                  backgroundColor: overWeight ? '#EF4444' : '#60A5FA',
                }}
              />
            </div>
            {overWeight && (
              <p className="text-red-400 text-xs mt-1">{t('overWeight')}</p>
            )}
          </div>
        </div>

        {/* Main layout: left = blueprint, right = parts catalog */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
          {/* Left: Robot blueprint */}
          <div className="space-y-4">
            {/* Robot Canvas preview — updates in real-time */}
            <div className="bg-gray-950 rounded-2xl p-4 border border-gray-800">
              <RobotPreview slots={slots} />
            </div>

            {/* Drop slots for main 5 */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-3 flex justify-center">
                <div className="w-1/3">
                  <DroppableSlot
                    slotId="head"
                    equipped={slots.head}
                    onRemove={() => removeFromSlot('head')}
                    t={t}
                  />
                </div>
              </div>
              <DroppableSlot
                slotId="left-arm"
                equipped={slots['left-arm']}
                onRemove={() => removeFromSlot('left-arm')}
                t={t}
              />
              <DroppableSlot
                slotId="body"
                equipped={slots.body}
                onRemove={() => removeFromSlot('body')}
                t={t}
              />
              <DroppableSlot
                slotId="right-arm"
                equipped={slots['right-arm']}
                onRemove={() => removeFromSlot('right-arm')}
                t={t}
              />
              <div className="col-span-3 flex justify-center">
                <div className="w-1/3">
                  <DroppableSlot
                    slotId="legs"
                    equipped={slots.legs}
                    onRemove={() => removeFromSlot('legs')}
                    t={t}
                  />
                </div>
              </div>
            </div>

            {/* Secondary body slots: Motor + Battery */}
            <div className="grid grid-cols-2 gap-2">
              <DroppableSlot
                slotId="body-motor"
                equipped={slots['body-motor']}
                onRemove={() => removeFromSlot('body-motor')}
                t={t}
              />
              <DroppableSlot
                slotId="body-battery"
                equipped={slots['body-battery']}
                onRemove={() => removeFromSlot('body-battery')}
                t={t}
              />
            </div>

            {/* Requirements summary */}
            <div className="bg-gray-950 rounded-xl p-3 border border-gray-800 text-xs space-y-1">
              <p className="text-gray-400 font-bold uppercase mb-2">{t('requirements')}</p>
              <div className="flex items-center gap-2">
                <span className={clsx('w-4 h-4 rounded-full flex items-center justify-center text-[10px]', chassisStrength >= 5 ? 'bg-green-600' : 'bg-gray-700')}>
                  {chassisStrength >= 5 ? '\u2713' : ''}
                </span>
                <span className={clsx(chassisStrength >= 5 ? 'text-green-400' : 'text-gray-400')}>
                  {t('reqStrength', { value: chassisStrength })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={clsx('w-4 h-4 rounded-full flex items-center justify-center text-[10px]', motorPowerLevel >= 2 ? 'bg-green-600' : 'bg-gray-700')}>
                  {motorPowerLevel >= 2 ? '\u2713' : ''}
                </span>
                <span className={clsx(motorPowerLevel >= 2 ? 'text-green-400' : 'text-gray-400')}>
                  {t('reqMotor', { value: motorPower })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={clsx('w-4 h-4 rounded-full flex items-center justify-center text-[10px]', mainSlotsFilled ? 'bg-green-600' : 'bg-gray-700')}>
                  {mainSlotsFilled ? '\u2713' : ''}
                </span>
                <span className={clsx(mainSlotsFilled ? 'text-green-400' : 'text-gray-400')}>
                  {t('reqSlots', { filled: mainSlots.filter((s) => slots[s]).length })}
                </span>
              </div>
            </div>

            {/* Test Robot button */}
            <button
              onClick={handleTestRobot}
              disabled={!mainSlotsFilled || overBudget || overWeight}
              className={clsx(
                'w-full py-3 rounded-xl font-black text-lg uppercase tracking-wider transition-all',
                mainSlotsFilled && !overBudget && !overWeight
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed',
              )}
            >
              {t('testRobot')}
            </button>
          </div>

          {/* Right: Parts catalog */}
          <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
            <h3 className="text-sm font-bold text-gray-400 uppercase">
              {t('partsCatalog')}
            </h3>
            <p className="text-xs text-gray-500">
              {t('partsCatalogHint')}
            </p>

            {Object.entries(categories).map(([cat, parts]) => (
              <div key={cat}>
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">
                  {t(`categories.${cat}`)}
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {parts.map((part) => (
                    <DraggablePart
                      key={part.id}
                      part={part}
                      isEquipped={equippedIds.has(part.id)}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Test animation area — 400x300 min */}
        <TestAnimationCanvas
          testResult={testResult}
          testQuality={testQuality}
          slots={slots}
          onAnimationEnd={handleAnimationEnd}
          t={t}
        />
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeModule ? (
          <div className="p-3 rounded-xl border border-blue-400 bg-gray-800 shadow-xl shadow-blue-500/20 opacity-90 pointer-events-none">
            <span className="font-bold text-white text-sm">{t(`parts.${activeModule.nameKey}`)}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
