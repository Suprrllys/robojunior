'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  TouchSensor,
  useSensors,
  useSensor,
} from '@dnd-kit/core'
import { completeMissionV2 } from '@/lib/game/complete-mission-v2'
import { getHintsUsed } from '@/components/missions/common/MissionShell'
import { fireGameToast } from '@/components/game/GameToast'
import type { MissionResultV2 } from '@/types/game'

/* ─── NPC Data ─── */

interface NPCData {
  id: string
  name: string
  emoji: string
  color: string
  problem: string
  theme: 'transportation' | 'energy' | 'water' | 'communication'
  /** Position on street (percentage-based) */
  x: number
  y: number
}

const NPCS: NPCData[] = [
  // Transportation (4)
  { id: 'npc1', name: 'Ahmed', emoji: '\u{1F468}', color: '#3B82F6', problem: 'Traffic is terrible', theme: 'transportation', x: 8, y: 25 },
  { id: 'npc2', name: 'Sara', emoji: '\u{1F469}', color: '#60A5FA', problem: 'No public buses to new district', theme: 'transportation', x: 25, y: 55 },
  { id: 'npc3', name: 'Omar', emoji: '\u{1F468}\u200D\u{1F33E}', color: '#2563EB', problem: 'Delivery takes 3 days across city', theme: 'transportation', x: 55, y: 20 },
  { id: 'npc4', name: 'Fatima', emoji: '\u{1F469}\u200D\u{1F3EB}', color: '#1D4ED8', problem: 'Taxi prices are too high', theme: 'transportation', x: 75, y: 60 },
  // Energy (3)
  { id: 'npc5', name: 'Khalid', emoji: '\u{1F468}\u200D\u{1F527}', color: '#F59E0B', problem: 'Power outages every week', theme: 'energy', x: 40, y: 40 },
  { id: 'npc6', name: 'Noura', emoji: '\u{1F469}\u200D\u{1F52C}', color: '#D97706', problem: 'Solar panels too expensive', theme: 'energy', x: 65, y: 35 },
  { id: 'npc7', name: 'Youssef', emoji: '\u{1F474}', color: '#B45309', problem: 'No charging stations for EVs', theme: 'energy', x: 88, y: 50 },
  // Water (2)
  { id: 'npc8', name: 'Layla', emoji: '\u{1F467}', color: '#06B6D4', problem: 'Water pressure is low', theme: 'water', x: 15, y: 65 },
  { id: 'npc9', name: 'Hassan', emoji: '\u{1F468}\u200D\u{1F373}', color: '#0891B2', problem: 'Desalination plant is too far', theme: 'water', x: 48, y: 70 },
  // Communication (3)
  { id: 'npc10', name: 'Mona', emoji: '\u{1F469}\u200D\u{1F4BB}', color: '#8B5CF6', problem: 'Internet is slow in new areas', theme: 'communication', x: 30, y: 15 },
  { id: 'npc11', name: 'Ali', emoji: '\u{1F468}\u200D\u{1F393}', color: '#7C3AED', problem: 'No community app for residents', theme: 'communication', x: 82, y: 25 },
  { id: 'npc12', name: 'Reem', emoji: '\u{1F9D1}\u200D\u{1F4BC}', color: '#6D28D9', problem: "Can't find local services", theme: 'communication', x: 60, y: 75 },
]

const COLUMN_LABELS = ['Group A', 'Group B', 'Group C', 'Group D']
const COLUMN_LABELS_RU = ['Группа A', 'Группа B', 'Группа C', 'Группа D']
const COLUMN_LABELS_AR = ['المجموعة أ', 'المجموعة ب', 'المجموعة ج', 'المجموعة د']

const NPC_PROBLEMS_RU: Record<string, string> = {
  'Traffic is terrible': 'Ужасные пробки',
  'No public buses to new district': 'Нет автобусов до нового района',
  'Delivery takes 3 days across city': 'Доставка занимает 3 дня по городу',
  'Taxi prices are too high': 'Цены на такси слишком высокие',
  'Power outages every week': 'Отключения электричества каждую неделю',
  'Solar panels too expensive': 'Солнечные панели слишком дорогие',
  'No charging stations for EVs': 'Нет зарядных станций для электромобилей',
  'Water pressure is low': 'Слабый напор воды',
  'Desalination plant is too far': 'Опреснительная станция слишком далеко',
  'Internet is slow in new areas': 'Медленный интернет в новых районах',
  'No community app for residents': 'Нет приложения для жителей',
  "Can't find local services": 'Не могу найти местные сервисы',
}

const NPC_PROBLEMS_AR: Record<string, string> = {
  'Traffic is terrible': 'الازدحام المروري فظيع',
  'No public buses to new district': 'لا توجد حافلات عامة للحي الجديد',
  'Delivery takes 3 days across city': 'التوصيل يستغرق 3 أيام عبر المدينة',
  'Taxi prices are too high': 'أسعار التاكسي مرتفعة جداً',
  'Power outages every week': 'انقطاع الكهرباء كل أسبوع',
  'Solar panels too expensive': 'الألواح الشمسية غالية جداً',
  'No charging stations for EVs': 'لا توجد محطات شحن للسيارات الكهربائية',
  'Water pressure is low': 'ضغط المياه منخفض',
  'Desalination plant is too far': 'محطة التحلية بعيدة جداً',
  'Internet is slow in new areas': 'الإنترنت بطيء في المناطق الجديدة',
  'No community app for residents': 'لا يوجد تطبيق مجتمعي للسكان',
  "Can't find local services": 'لا أستطيع العثور على الخدمات المحلية',
}

/* ─── Sticky Note (Draggable) ─── */

function StickyNote({ id, problem, npcName, isDragging }: {
  id: string
  problem: string
  npcName: string
  isDragging?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id })

  const style: React.CSSProperties = {
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    opacity: isDragging ? 0.4 : 1,
    touchAction: 'none',
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className="bg-yellow-200 text-gray-800 p-2 rounded shadow-md cursor-grab active:cursor-grabbing text-xs font-medium mb-2 border border-yellow-300 select-none"
    >
      <span className="font-bold text-yellow-700">{npcName}:</span>{' '}
      {problem}
    </div>
  )
}

/* ─── Overlay Note (shown while dragging) ─── */

function OverlayStickyNote({ problem, npcName }: { problem: string; npcName: string }) {
  return (
    <div className="bg-yellow-200 text-gray-800 p-2 rounded shadow-xl text-xs font-medium border-2 border-yellow-400 max-w-[180px] pointer-events-none">
      <span className="font-bold text-yellow-700">{npcName}:</span>{' '}
      {problem}
    </div>
  )
}

/* ─── Droppable Column ─── */

function DroppableColumn({ columnId, label, notes, onRename, activeDragId, locale }: {
  columnId: string
  label: string
  notes: { id: string; problem: string; npcName: string }[]
  onRename: (newName: string) => void
  activeDragId: string | null
  locale: string
}) {
  const { isOver, setNodeRef } = useDroppable({ id: columnId })
  const [editing, setEditing] = useState(false)
  const [tempName, setTempName] = useState(label)

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[140px] bg-gray-800/60 rounded-lg p-2 border-2 transition-colors min-h-[120px] ${
        isOver ? 'border-yellow-400 bg-yellow-900/20' : 'border-gray-600'
      }`}
    >
      {editing ? (
        <input
          value={tempName}
          onChange={e => setTempName(e.target.value)}
          onBlur={() => { onRename(tempName); setEditing(false) }}
          onKeyDown={e => { if (e.key === 'Enter') { onRename(tempName); setEditing(false) } }}
          className="w-full bg-gray-700 text-white text-xs font-bold px-2 py-1 rounded mb-2 border border-gray-500 outline-none"
          autoFocus
          maxLength={20}
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="w-full text-left text-xs font-bold text-gray-300 mb-2 hover:text-white transition-colors px-1 truncate"
          title={locale === 'ru' ? 'Нажмите, чтобы переименовать' : locale === 'ar' ? 'اضغط لإعادة التسمية' : 'Click to rename'}
        >
          {label}
        </button>
      )}
      <div className="space-y-1">
        {notes.map(n => (
          <StickyNote
            key={n.id}
            id={n.id}
            problem={n.problem}
            npcName={n.npcName}
            isDragging={activeDragId === n.id}
          />
        ))}
      </div>
      {notes.length === 0 && (
        <p className="text-gray-500 text-xs italic text-center mt-4">
          {locale === 'ru' ? 'Перетащите заметки сюда' : locale === 'ar' ? 'اسحب الملاحظات هنا' : 'Drag notes here'}
        </p>
      )}
    </div>
  )
}

/* ─── Unsorted Notes Area (also droppable for returning notes) ─── */

function UnsortedArea({ notes, activeDragId, locale }: {
  notes: { id: string; problem: string; npcName: string }[]
  activeDragId: string | null
  locale: string
}) {
  const { isOver, setNodeRef } = useDroppable({ id: 'unsorted' })

  if (notes.length === 0) return null

  return (
    <div
      ref={setNodeRef}
      className={`bg-gray-800/40 rounded-lg p-2 border-2 transition-colors mb-3 ${
        isOver ? 'border-yellow-400' : 'border-gray-700 border-dashed'
      }`}
    >
      <p className="text-xs text-gray-400 font-bold mb-1">{locale === 'ru' ? 'Несортированные заметки' : locale === 'ar' ? 'ملاحظات غير مصنفة' : 'Unsorted Notes'}</p>
      <div className="flex flex-wrap gap-1">
        {notes.map(n => (
          <div key={n.id} className="w-[48%]">
            <StickyNote
              id={n.id}
              problem={n.problem}
              npcName={n.npcName}
              isDragging={activeDragId === n.id}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── NPC Character on Street ─── */

function NPCCharacter({ npc, onClick, isInterviewed, isActive, onHover, onLeave, locale }: {
  npc: NPCData
  onClick: () => void
  isInterviewed: boolean
  isActive: boolean
  onHover?: () => void
  onLeave?: () => void
  locale: string
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={`absolute transition-all duration-200 flex flex-col items-center group ${
        isInterviewed ? 'opacity-60' : 'hover:scale-110'
      }`}
      style={{ left: `${npc.x}%`, top: `${npc.y}%`, transform: 'translate(-50%, -50%)' }}
      title={isInterviewed
        ? (locale === 'ru' ? `${npc.name} (опрошен)` : locale === 'ar' ? `${npc.name} (تمت المقابلة)` : `${npc.name} (interviewed)`)
        : (locale === 'ru' ? `Поговорить с ${npc.name}` : locale === 'ar' ? `تحدث مع ${npc.name}` : `Talk to ${npc.name}`)
      }
    >
      {/* Avatar circle */}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-lg border-2 transition-colors ${
          isActive ? 'border-yellow-400 ring-2 ring-yellow-400/50' : isInterviewed ? 'border-green-500' : 'border-white/30 group-hover:border-white'
        }`}
        style={{ backgroundColor: npc.color }}
      >
        {npc.emoji}
      </div>
      {/* Name tag */}
      <span className={`text-[10px] font-bold mt-0.5 px-1 rounded ${
        isInterviewed ? 'text-green-400' : 'text-white'
      }`}>
        {npc.name}
      </span>
      {/* Checkmark for interviewed */}
      {isInterviewed && (
        <span className="absolute -top-1 -right-1 text-green-400 text-xs bg-gray-900 rounded-full w-4 h-4 flex items-center justify-center">
          {'\u2713'}
        </span>
      )}
    </button>
  )
}

/* ─── Speech Bubble ─── */

function SpeechBubble({ npc, onClose, locale }: { npc: NPCData; onClose: () => void; locale: string }) {
  const problemText = locale === 'ru' ? (NPC_PROBLEMS_RU[npc.problem] || npc.problem) : locale === 'ar' ? (NPC_PROBLEMS_AR[npc.problem] || npc.problem) : npc.problem
  return (
    <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/30 rounded-xl">
      <div className="bg-white text-gray-800 rounded-xl p-4 shadow-2xl max-w-[280px] relative animate-in fade-in zoom-in duration-200">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
            style={{ backgroundColor: npc.color }}
          >
            {npc.emoji}
          </div>
          <span className="font-bold text-sm">{npc.name}</span>
        </div>
        <p className="text-sm leading-relaxed mb-3">&ldquo;{problemText}&rdquo;</p>
        <button
          onClick={onClose}
          className="w-full bg-blue-500 text-white text-xs font-bold py-1.5 rounded-lg hover:bg-blue-600 transition-colors"
        >
          {locale === 'ru' ? 'Понятно!' : locale === 'ar' ? 'فهمت!' : 'Got it!'}
        </button>
      </div>
    </div>
  )
}

/* ─── 2.5D Isometric Street Canvas ─── */

const STREET_CANVAS_W = 600
const STREET_CANVAS_H = 200

// Isometric tile dimensions for street scene
const STREET_TILE_W = 48
const STREET_TILE_H = 24

interface StreetParticle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  type: 'leaf' | 'dust'
  rotation: number
  rotSpeed: number
}

interface StreetVehicle {
  x: number
  y: number
  speed: number
  color: string
  width: number
  height: number
}

function createStreetParticles(): StreetParticle[] {
  const particles: StreetParticle[] = []
  for (let i = 0; i < 15; i++) {
    particles.push({
      x: Math.random() * STREET_CANVAS_W,
      y: Math.random() * STREET_CANVAS_H,
      vx: (Math.random() - 0.3) * 0.4,
      vy: Math.random() * 0.3 + 0.1,
      size: Math.random() * 3 + 1,
      alpha: Math.random() * 0.5 + 0.2,
      type: Math.random() > 0.5 ? 'leaf' : 'dust',
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.03,
    })
  }
  return particles
}

function createStreetVehicles(): StreetVehicle[] {
  return [
    { x: -40, y: 0, speed: 0.6, color: '#EF4444', width: 28, height: 14 },
    { x: STREET_CANVAS_W + 20, y: 0, speed: -0.45, color: '#3B82F6', width: 24, height: 12 },
    { x: -100, y: 0, speed: 0.35, color: '#F59E0B', width: 32, height: 16 },
  ]
}

function drawIsoTile(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  tw: number,
  th: number,
  topColor: string,
  sideColor: string,
  depth: number,
) {
  // Top face (diamond)
  ctx.beginPath()
  ctx.moveTo(cx, cy - th / 2)
  ctx.lineTo(cx + tw / 2, cy)
  ctx.lineTo(cx, cy + th / 2)
  ctx.lineTo(cx - tw / 2, cy)
  ctx.closePath()
  ctx.fillStyle = topColor
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'
  ctx.lineWidth = 0.5
  ctx.stroke()

  if (depth > 0) {
    // Right side face
    ctx.beginPath()
    ctx.moveTo(cx + tw / 2, cy)
    ctx.lineTo(cx, cy + th / 2)
    ctx.lineTo(cx, cy + th / 2 + depth)
    ctx.lineTo(cx + tw / 2, cy + depth)
    ctx.closePath()
    ctx.fillStyle = sideColor
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'
    ctx.stroke()

    // Left side face
    ctx.beginPath()
    ctx.moveTo(cx - tw / 2, cy)
    ctx.lineTo(cx, cy + th / 2)
    ctx.lineTo(cx, cy + th / 2 + depth)
    ctx.lineTo(cx - tw / 2, cy + depth)
    ctx.closePath()
    ctx.fillStyle = sideColor
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.1)'
    ctx.stroke()
  }
}

function drawIsoBuilding(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  bw: number,
  bh: number,
  wallColor: string,
  roofColor: string,
  darkWallColor: string,
) {
  const halfW = bw / 2
  const isoHalfW = halfW * 0.7
  const isoHalfD = halfW * 0.35
  const topY = baseY - bh

  // Front wall
  ctx.beginPath()
  ctx.moveTo(cx - isoHalfW, baseY)
  ctx.lineTo(cx - isoHalfW, topY)
  ctx.lineTo(cx, topY - isoHalfD)
  ctx.lineTo(cx, baseY - isoHalfD)
  ctx.closePath()
  ctx.fillStyle = wallColor
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.2)'
  ctx.lineWidth = 0.5
  ctx.stroke()

  // Side wall
  ctx.beginPath()
  ctx.moveTo(cx, baseY - isoHalfD)
  ctx.lineTo(cx, topY - isoHalfD)
  ctx.lineTo(cx + isoHalfW, topY)
  ctx.lineTo(cx + isoHalfW, baseY)
  ctx.closePath()
  ctx.fillStyle = darkWallColor
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.2)'
  ctx.stroke()

  // Roof
  ctx.beginPath()
  ctx.moveTo(cx, topY - isoHalfD)
  ctx.lineTo(cx - isoHalfW, topY)
  ctx.lineTo(cx, topY + isoHalfD)
  ctx.lineTo(cx + isoHalfW, topY)
  ctx.closePath()
  ctx.fillStyle = roofColor
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'
  ctx.stroke()

  // Windows on front wall
  const windowRows = Math.floor(bh / 20)
  for (let r = 0; r < windowRows; r++) {
    const wy = topY + 8 + r * 18
    if (wy + 6 > baseY - 4) break
    for (let c = 0; c < 2; c++) {
      const wx = cx - isoHalfW + 6 + c * 14
      const windowy = wy - (cx - wx) * 0.25
      ctx.fillStyle = Math.random() > 0.4 ? 'rgba(107,142,192,0.6)' : 'rgba(107,142,192,0.25)'
      ctx.fillRect(wx, windowy, 5, 6)
    }
  }
}

function drawStreetNPC(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  color: string,
  emoji: string,
  time: number,
  bounceOffset: number,
) {
  const bounce = Math.sin(time * 2.5 + bounceOffset) * 2

  // Glow
  const gradient = ctx.createRadialGradient(cx, cy + bounce - 4, 0, cx, cy + bounce - 4, 18)
  gradient.addColorStop(0, color + '40')
  gradient.addColorStop(1, color + '00')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(cx, cy + bounce - 4, 18, 0, Math.PI * 2)
  ctx.fill()

  // Body (simple stick figure)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(cx, cy + bounce - 10, 5, 0, Math.PI * 2)
  ctx.fill()

  // Torso
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(cx, cy + bounce - 5)
  ctx.lineTo(cx, cy + bounce + 3)
  ctx.stroke()

  // Legs
  ctx.beginPath()
  ctx.moveTo(cx, cy + bounce + 3)
  ctx.lineTo(cx - 3, cy + bounce + 8)
  ctx.moveTo(cx, cy + bounce + 3)
  ctx.lineTo(cx + 3, cy + bounce + 8)
  ctx.stroke()

  // Arms
  ctx.beginPath()
  ctx.moveTo(cx - 4, cy + bounce - 2)
  ctx.lineTo(cx + 4, cy + bounce - 2)
  ctx.stroke()

  // Emoji head
  ctx.font = '8px serif'
  ctx.textAlign = 'center'
  ctx.fillText(emoji, cx, cy + bounce - 12)
}

function IsometricStreetCanvas({ npcs, interviewedIds, hoveredNpcId }: {
  npcs: NPCData[]
  interviewedIds: Set<string>
  hoveredNpcId: string | null
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const timeRef = useRef(0)
  const particlesRef = useRef<StreetParticle[]>(createStreetParticles())
  const vehiclesRef = useRef<StreetVehicle[]>(createStreetVehicles())
  const animFrameRef = useRef(0)
  // Store window randomness per frame to avoid flickering
  const windowSeedRef = useRef(Math.random())

  useEffect(() => {
    let active = true

    const loop = () => {
      if (!active) return
      const ctx = ctxRef.current
      if (!ctx) {
        animFrameRef.current = requestAnimationFrame(loop)
        return
      }

      timeRef.current += 0.016
      const t = timeRef.current

      // Refresh window seed every 2 seconds for subtle flicker
      if (Math.floor(t * 0.5) !== Math.floor((t - 0.016) * 0.5)) {
        windowSeedRef.current = Math.random()
      }

      // Clear
      ctx.clearRect(0, 0, STREET_CANVAS_W, STREET_CANVAS_H)

      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, STREET_CANVAS_H)
      skyGrad.addColorStop(0, '#1E3A5F')
      skyGrad.addColorStop(0.5, '#2D4A6F')
      skyGrad.addColorStop(1, '#3D5A5F')
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, STREET_CANVAS_W, STREET_CANVAS_H)

      // Sun with glow
      const sunGlow = ctx.createRadialGradient(520, 30, 0, 520, 30, 50)
      sunGlow.addColorStop(0, 'rgba(245,158,11,0.8)')
      sunGlow.addColorStop(0.5, 'rgba(245,158,11,0.2)')
      sunGlow.addColorStop(1, 'rgba(245,158,11,0)')
      ctx.fillStyle = sunGlow
      ctx.beginPath()
      ctx.arc(520, 30, 50, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#F59E0B'
      ctx.beginPath()
      ctx.arc(520, 30, 15, 0, Math.PI * 2)
      ctx.fill()

      // Draw isometric road tiles (center strip)
      const roadBaseY = 140
      const roadCenterX = STREET_CANVAS_W / 2
      for (let i = -8; i < 12; i++) {
        const tileX = roadCenterX + i * (STREET_TILE_W / 2) * 1.0
        const tileY = roadBaseY + i * (STREET_TILE_H / 2) * 0.3
        // Road tiles
        drawIsoTile(ctx, tileX, tileY, STREET_TILE_W, STREET_TILE_H, '#4B5563', '#374151', 4)
      }

      // Sidewalk tiles (top row)
      for (let i = -8; i < 12; i++) {
        const tileX = roadCenterX + i * (STREET_TILE_W / 2) - 20
        const tileY = roadBaseY - 20 + i * (STREET_TILE_H / 2) * 0.3
        drawIsoTile(ctx, tileX, tileY, STREET_TILE_W * 0.6, STREET_TILE_H * 0.6, '#9CA3AF', '#6B7280', 3)
      }

      // Sidewalk tiles (bottom row)
      for (let i = -8; i < 12; i++) {
        const tileX = roadCenterX + i * (STREET_TILE_W / 2) + 20
        const tileY = roadBaseY + 20 + i * (STREET_TILE_H / 2) * 0.3
        drawIsoTile(ctx, tileX, tileY, STREET_TILE_W * 0.6, STREET_TILE_H * 0.6, '#9CA3AF', '#6B7280', 3)
      }

      // Road lane markers
      ctx.setLineDash([8, 12])
      ctx.strokeStyle = 'rgba(250,250,250,0.3)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(0, roadBaseY + 2)
      ctx.lineTo(STREET_CANVAS_W, roadBaseY + 2)
      ctx.stroke()
      ctx.setLineDash([])

      // Buildings on top edge
      const buildingData = [
        { cx: 40, h: 60, w: 35, wall: '#334155', roof: '#4A6073', dark: '#2A3545' },
        { cx: 100, h: 80, w: 40, wall: '#3D4F63', roof: '#5A7089', dark: '#2E3D4F' },
        { cx: 160, h: 50, w: 30, wall: '#2E3D4F', roof: '#4A5A6F', dark: '#1E2D3F' },
        { cx: 230, h: 70, w: 38, wall: '#334155', roof: '#4A6073', dark: '#2A3545' },
        { cx: 310, h: 55, w: 32, wall: '#3D4F63', roof: '#5A7089', dark: '#2E3D4F' },
        { cx: 400, h: 65, w: 36, wall: '#2E3D4F', roof: '#4A5A6F', dark: '#1E2D3F' },
        { cx: 470, h: 75, w: 34, wall: '#334155', roof: '#4A6073', dark: '#2A3545' },
        { cx: 540, h: 45, w: 30, wall: '#3D4F63', roof: '#5A7089', dark: '#2E3D4F' },
      ]

      // Use a seeded random for windows
      const savedSeed = windowSeedRef.current
      for (const b of buildingData) {
        // Temporarily override Math.random for stable windows
        const origRandom = Math.random
        let seedCounter = 0
        Math.random = () => {
          seedCounter++
          return ((savedSeed * 1000 + seedCounter * 137.5) % 1) * 0.8 + 0.1
        }
        drawIsoBuilding(ctx, b.cx, roadBaseY - 30, b.w, b.h, b.wall, b.roof, b.dark)
        Math.random = origRandom
      }

      // Buildings on bottom edge (shorter, farther)
      const bottomBuildings = [
        { cx: 70, h: 35, w: 28, wall: '#3D4F63', roof: '#5A7089', dark: '#2E3D4F' },
        { cx: 200, h: 40, w: 30, wall: '#334155', roof: '#4A6073', dark: '#2A3545' },
        { cx: 350, h: 30, w: 25, wall: '#2E3D4F', roof: '#4A5A6F', dark: '#1E2D3F' },
        { cx: 500, h: 38, w: 28, wall: '#3D4F63', roof: '#5A7089', dark: '#2E3D4F' },
      ]
      for (const b of bottomBuildings) {
        const origRandom = Math.random
        let seedCounter = 100
        Math.random = () => {
          seedCounter++
          return ((savedSeed * 500 + seedCounter * 97.3) % 1) * 0.8 + 0.1
        }
        drawIsoBuilding(ctx, b.cx, roadBaseY + 55, b.w, b.h, b.wall, b.roof, b.dark)
        Math.random = origRandom
      }

      // Vehicles
      const vehicles = vehiclesRef.current
      for (const v of vehicles) {
        v.x += v.speed
        // Wrap around
        if (v.speed > 0 && v.x > STREET_CANVAS_W + 50) v.x = -50
        if (v.speed < 0 && v.x < -50) v.x = STREET_CANVAS_W + 50

        const vy = roadBaseY + (v.speed > 0 ? -5 : 8)

        // Vehicle shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)'
        ctx.beginPath()
        ctx.ellipse(v.x, vy + v.height / 2 + 2, v.width / 2, 3, 0, 0, Math.PI * 2)
        ctx.fill()

        // Vehicle body (isometric box)
        // Top
        ctx.fillStyle = v.color
        ctx.beginPath()
        ctx.moveTo(v.x, vy - v.height / 2 - 3)
        ctx.lineTo(v.x + v.width / 2, vy - v.height / 2)
        ctx.lineTo(v.x, vy - v.height / 2 + 3)
        ctx.lineTo(v.x - v.width / 2, vy - v.height / 2)
        ctx.closePath()
        ctx.fill()

        // Front
        ctx.fillStyle = v.color
        ctx.fillRect(v.x - v.width / 2, vy - v.height / 2, v.width, v.height)

        // Windshield
        ctx.fillStyle = 'rgba(107,142,192,0.5)'
        ctx.fillRect(v.x - v.width / 4, vy - v.height / 2 + 2, v.width / 2, v.height / 3)
      }

      // NPC characters on the street
      for (const npc of npcs) {
        const nx = (npc.x / 100) * STREET_CANVAS_W
        const ny = 60 + (npc.y / 100) * (STREET_CANVAS_H - 80)
        const isInterviewed = interviewedIds.has(npc.id)

        drawStreetNPC(ctx, nx, ny, npc.color, npc.emoji, t, npc.x + npc.y)

        // Interviewed checkmark
        if (isInterviewed) {
          ctx.fillStyle = '#22C55E'
          ctx.font = 'bold 8px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText('\u2713', nx + 7, ny - 14 + Math.sin(t * 2.5 + npc.x + npc.y) * 2)
        }

        // Name tag
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        const nameWidth = ctx.measureText(npc.name).width
        ctx.fillRect(nx - nameWidth / 2 - 2, ny + 10 + Math.sin(t * 2.5 + npc.x + npc.y) * 2, nameWidth + 4, 10)
        ctx.fillStyle = '#ffffff'
        ctx.font = '7px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(npc.name, nx, ny + 18 + Math.sin(t * 2.5 + npc.x + npc.y) * 2)
      }

      // Connection line from hovered NPC to bottom edge (where sticky notes would be)
      if (hoveredNpcId) {
        const hNpc = npcs.find(n => n.id === hoveredNpcId)
        if (hNpc) {
          const hx = (hNpc.x / 100) * STREET_CANVAS_W
          const hy = 60 + (hNpc.y / 100) * (STREET_CANVAS_H - 80)

          ctx.strokeStyle = hNpc.color + '60'
          ctx.lineWidth = 1.5
          ctx.setLineDash([4, 4])
          ctx.beginPath()
          ctx.moveTo(hx, hy + 10)
          ctx.lineTo(hx, STREET_CANVAS_H)
          ctx.stroke()
          ctx.setLineDash([])

          // Small dot at bottom
          ctx.fillStyle = hNpc.color + '80'
          ctx.beginPath()
          ctx.arc(hx, STREET_CANVAS_H - 3, 3, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Ambient particles
      const particles = particlesRef.current
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        p.rotation += p.rotSpeed

        // Wrap
        if (p.y > STREET_CANVAS_H + 5) { p.y = -5; p.x = Math.random() * STREET_CANVAS_W }
        if (p.x > STREET_CANVAS_W + 5) p.x = -5
        if (p.x < -5) p.x = STREET_CANVAS_W + 5

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.globalAlpha = p.alpha

        if (p.type === 'leaf') {
          ctx.fillStyle = '#4ADE80'
          ctx.beginPath()
          ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.fillStyle = '#D4C090'
          ctx.beginPath()
          ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.restore()
        ctx.globalAlpha = 1
      }

      animFrameRef.current = requestAnimationFrame(loop)
    }

    animFrameRef.current = requestAnimationFrame(loop)

    return () => {
      active = false
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [npcs, interviewedIds, hoveredNpcId])

  const canvasReady = useCallback((canvas: HTMLCanvasElement | null) => {
    ctxRef.current = null
    canvasRef.current = null
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvasRef.current = canvas
    ctxRef.current = ctx
  }, [])

  return (
    <div className="bg-gray-900 rounded-t-xl border-b border-gray-700 overflow-hidden">
      <canvas
        ref={canvasReady}
        width={STREET_CANVAS_W}
        height={STREET_CANVAS_H}
        className="block w-full"
        style={{ maxHeight: '200px' }}
      />
    </div>
  )
}

/* ─── City Street SVG Background ─── */

function CityStreetBackground() {
  return (
    <svg
      viewBox="0 0 500 300"
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Sky gradient */}
      <defs>
        <linearGradient id="sky-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1E3A5F" />
          <stop offset="60%" stopColor="#2D4A6F" />
          <stop offset="100%" stopColor="#4A6741" />
        </linearGradient>
      </defs>
      <rect width="500" height="300" fill="url(#sky-grad)" />

      {/* Sun */}
      <circle cx="420" cy="45" r="25" fill="#F59E0B" opacity="0.7" />

      {/* Background buildings */}
      <rect x="10" y="80" width="40" height="120" fill="#334155" rx="2" />
      <rect x="15" y="90" width="10" height="12" fill="#6B8EC0" opacity="0.5" />
      <rect x="30" y="90" width="10" height="12" fill="#6B8EC0" opacity="0.5" />
      <rect x="15" y="110" width="10" height="12" fill="#6B8EC0" opacity="0.3" />

      <rect x="60" y="60" width="50" height="140" fill="#3D4F63" rx="2" />
      <rect x="70" y="70" width="10" height="10" fill="#6B8EC0" opacity="0.4" />
      <rect x="85" y="70" width="10" height="10" fill="#6B8EC0" opacity="0.6" />
      <rect x="70" y="90" width="10" height="10" fill="#6B8EC0" opacity="0.3" />
      <rect x="85" y="90" width="10" height="10" fill="#6B8EC0" opacity="0.5" />

      <rect x="120" y="100" width="35" height="100" fill="#2E3D4F" rx="2" />

      <rect x="170" y="50" width="30" height="150" fill="#3D4F63" rx="2" />
      <rect x="175" y="60" width="8" height="10" fill="#6B8EC0" opacity="0.4" />
      <rect x="187" y="60" width="8" height="10" fill="#6B8EC0" opacity="0.6" />

      <rect x="210" y="90" width="45" height="110" fill="#334155" rx="2" />

      <rect x="270" y="70" width="35" height="130" fill="#3D4F63" rx="2" />

      <rect x="320" y="55" width="25" height="145" fill="#2E3D4F" rx="2" />

      <rect x="360" y="85" width="50" height="115" fill="#334155" rx="2" />

      <rect x="420" y="100" width="40" height="100" fill="#3D4F63" rx="2" />

      <rect x="470" y="75" width="30" height="125" fill="#2E3D4F" rx="2" />

      {/* Road */}
      <rect x="0" y="200" width="500" height="100" fill="#374151" />
      <line x1="0" y1="248" x2="500" y2="248" stroke="#9CA3AF" strokeWidth="2" strokeDasharray="20,15" />

      {/* Sidewalk */}
      <rect x="0" y="195" width="500" height="10" fill="#6B7280" />

      {/* Trees */}
      <circle cx="50" cy="175" r="15" fill="#2D5A27" opacity="0.8" />
      <rect x="48" y="185" width="4" height="15" fill="#5C4033" />
      <circle cx="160" cy="180" r="12" fill="#2D5A27" opacity="0.7" />
      <rect x="158" y="188" width="4" height="12" fill="#5C4033" />
      <circle cx="350" cy="178" r="14" fill="#2D5A27" opacity="0.8" />
      <rect x="348" y="188" width="4" height="12" fill="#5C4033" />
      <circle cx="450" cy="176" r="13" fill="#2D5A27" opacity="0.7" />
      <rect x="448" y="186" width="4" height="14" fill="#5C4033" />
    </svg>
  )
}

/* ─── Main Component ─── */

export interface ScoreBreakdownItem {
  label: string
  value: number
  max: number
}

interface EntrepreneurMission1Props {
  userId: string
  onComplete?: (score: number, breakdown: ScoreBreakdownItem[]) => void
}

export default function EntrepreneurMission1({ userId, onComplete }: EntrepreneurMission1Props) {
  const t = useTranslations('game')
  const locale = useLocale()

  // State: which NPCs have been talked to
  const [interviewedIds, setInterviewedIds] = useState<Set<string>>(new Set())
  // State: which NPC is currently showing speech bubble
  const [activeNpcId, setActiveNpcId] = useState<string | null>(null)
  // State: sticky notes collected (array of npc IDs)
  const [collectedNotes, setCollectedNotes] = useState<string[]>([])
  // State: column assignments — maps npc ID to column index (0-3) or null (unsorted)
  const [noteColumns, setNoteColumns] = useState<Record<string, number | null>>({})
  // State: column labels
  const localizedColumnLabels = locale === 'ru' ? COLUMN_LABELS_RU : locale === 'ar' ? COLUMN_LABELS_AR : COLUMN_LABELS
  const [columnLabels, setColumnLabels] = useState<string[]>([...localizedColumnLabels])
  // State: which column player selected as their startup idea
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null)
  // State: game phase
  const [phase, setPhase] = useState<'explore' | 'submit' | 'done'>('explore')
  // State: scoring / results
  const [score, setScore] = useState(0)
  const [saving, setSaving] = useState(false)
  const [missionResult, setMissionResult] = useState<MissionResultV2 | null>(null)
  // Start time (kept for completeMissionV2 timeMinutes)
  const startTimeRef = useRef(Date.now())
  // Active drag
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  // Hovered NPC (for canvas connection line)
  const [hoveredNpcId, setHoveredNpcId] = useState<string | null>(null)

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  // Click on NPC
  const handleNpcClick = useCallback((npcId: string) => {
    setActiveNpcId(npcId)
  }, [])

  // Close speech bubble and collect note
  const handleCloseBubble = useCallback(() => {
    if (activeNpcId && !interviewedIds.has(activeNpcId)) {
      setInterviewedIds(prev => new Set(prev).add(activeNpcId))
      setCollectedNotes(prev => [...prev, activeNpcId])
      setNoteColumns(prev => ({ ...prev, [activeNpcId]: null }))
    }
    setActiveNpcId(null)
  }, [activeNpcId, interviewedIds])

  // Drag handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id))
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragId(null)
    const { active, over } = event
    if (!over) return
    const noteId = String(active.id)
    const targetId = String(over.id)

    if (targetId === 'unsorted') {
      setNoteColumns(prev => ({ ...prev, [noteId]: null }))
    } else if (targetId.startsWith('column-')) {
      const colIdx = parseInt(targetId.replace('column-', ''), 10)
      setNoteColumns(prev => ({ ...prev, [noteId]: colIdx }))
    }
  }, [])

  // Rename column
  const handleRenameColumn = useCallback((colIdx: number, newName: string) => {
    setColumnLabels(prev => {
      const next = [...prev]
      const defaults = locale === 'ru' ? COLUMN_LABELS_RU : locale === 'ar' ? COLUMN_LABELS_AR : COLUMN_LABELS
      next[colIdx] = newName || defaults[colIdx]
      return next
    })
  }, [locale])

  // Get notes for a column
  const getColumnNotes = useCallback((colIdx: number) => {
    return collectedNotes
      .filter(id => noteColumns[id] === colIdx)
      .map(id => {
        const npc = NPCS.find(n => n.id === id)!
        const problem = locale === 'ru' ? (NPC_PROBLEMS_RU[npc.problem] || npc.problem) : locale === 'ar' ? (NPC_PROBLEMS_AR[npc.problem] || npc.problem) : npc.problem
        return { id, problem, npcName: npc.name }
      })
  }, [collectedNotes, noteColumns, locale])

  // Get unsorted notes
  const unsortedNotes = useMemo(() => {
    return collectedNotes
      .filter(id => noteColumns[id] === null || noteColumns[id] === undefined)
      .map(id => {
        const npc = NPCS.find(n => n.id === id)!
        const problem = locale === 'ru' ? (NPC_PROBLEMS_RU[npc.problem] || npc.problem) : locale === 'ar' ? (NPC_PROBLEMS_AR[npc.problem] || npc.problem) : npc.problem
        return { id, problem, npcName: npc.name }
      })
  }, [collectedNotes, noteColumns, locale])

  // Get dragged note info for overlay
  const draggedNote = useMemo(() => {
    if (!activeDragId) return null
    const npc = NPCS.find(n => n.id === activeDragId)
    if (!npc) return null
    const problem = locale === 'ru' ? (NPC_PROBLEMS_RU[npc.problem] || npc.problem) : locale === 'ar' ? (NPC_PROBLEMS_AR[npc.problem] || npc.problem) : npc.problem
    return { problem, npcName: npc.name }
  }, [activeDragId, locale])

  // Calculate the correct grouping per column
  // A column is "correct" for a theme if all notes in that column share the same theme
  // and it contains ALL notes of that theme
  const calculateGroupingScore = useCallback(() => {
    let correctCount = 0
    const totalPlaced = collectedNotes.filter(id => noteColumns[id] !== null && noteColumns[id] !== undefined).length

    if (totalPlaced === 0) return 0

    // For each placed note, check if all notes in its column share the same theme
    for (const noteId of collectedNotes) {
      const colIdx = noteColumns[noteId]
      if (colIdx === null || colIdx === undefined) continue

      const npc = NPCS.find(n => n.id === noteId)!
      const notesInCol = collectedNotes.filter(id => noteColumns[id] === colIdx)
      const themesInCol = notesInCol.map(id => NPCS.find(n => n.id === id)!.theme)

      // Note is correctly placed if all notes in the column share the same theme
      const allSameTheme = themesInCol.every(t => t === npc.theme)
      if (allSameTheme) correctCount++
    }

    return correctCount / Math.max(totalPlaced, 1)
  }, [collectedNotes, noteColumns])

  // Count notes per column
  const getColumnCount = useCallback((colIdx: number) => {
    return collectedNotes.filter(id => noteColumns[id] === colIdx).length
  }, [collectedNotes, noteColumns])

  // Submit idea
  const handleSubmit = useCallback(async () => {
    if (selectedColumn === null) return
    setSaving(true)

    const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000)
    const surveyed = interviewedIds.size

    // Scoring: max 1000
    // 1. decisions: correct grouping = 400 * (correct / total_placed)
    const groupingRatio = calculateGroupingScore()
    const decisionsScore = Math.round(400 * groupingRatio)

    // 2. financials (survey completeness) — max 350
    let financialsScore = 0
    if (surveyed >= 10) financialsScore = 350
    else if (surveyed >= 8) financialsScore = 230
    else if (surveyed >= 6) financialsScore = 120

    // 3. team: flat 250
    const teamScore = 250

    const totalScore = decisionsScore + financialsScore + teamScore

    // Check if successful: selected column must have the most NPCs = Transportation (4)
    const selectedColNotes = collectedNotes.filter(id => noteColumns[id] === selectedColumn)
    const selectedThemes = selectedColNotes.map(id => NPCS.find(n => n.id === id)!.theme)
    const dominantTheme = selectedThemes.reduce<Record<string, number>>((acc, t) => {
      acc[t] = (acc[t] || 0) + 1
      return acc
    }, {})
    const maxTheme = Object.entries(dominantTheme).sort((a, b) => b[1] - a[1])[0]
    // Success if the column primarily contains transportation problems
    const isSuccess = maxTheme && maxTheme[0] === 'transportation' && maxTheme[1] >= 4

    setScore(totalScore)

    try {
      const result = await completeMissionV2({
        role: 'entrepreneur',
        missionNumber: 1,
        correctDecisions: Math.round(groupingRatio * collectedNotes.length),
        totalDecisions: collectedNotes.length,
        npcsSurveyed: surveyed,
        totalNpcs: 12,
        timeMinutes: elapsedSeconds / 60,
      }, getHintsUsed())
      setScore(result.score)
      setMissionResult(result)
      fireGameToast({ xp: result.xpEarned, score: result.score, badge: result.newBadges?.[0] })
    } catch {
      fireGameToast({ xp: 0, score: totalScore })
    }

    setSaving(false)
    setPhase('done')
    onComplete?.(totalScore, [
      { label: locale === 'ru' ? 'Точность группировки' : locale === 'ar' ? 'دقة التصنيف' : 'Grouping accuracy', value: decisionsScore, max: 400 },
      { label: locale === 'ru' ? `Опрошено NPC (${surveyed}/12)` : locale === 'ar' ? `تمت مقابلة NPC (${surveyed}/12)` : `NPCs surveyed (${surveyed}/12)`, value: financialsScore, max: 350 },
      { label: locale === 'ru' ? 'Командный бонус' : locale === 'ar' ? 'مكافأة الفريق' : 'Team bonus', value: teamScore, max: 250 },
    ])
  }, [
    selectedColumn, interviewedIds, collectedNotes, noteColumns,
    calculateGroupingScore, onComplete,
  ])

  // Active NPC data
  const activeNpc = activeNpcId ? NPCS.find(n => n.id === activeNpcId) : null

  /* ─── Render: Saving ─── */
  if (saving) {
    return (
      <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl p-8 text-center">
        <div className="text-4xl mb-4 animate-pulse">{'\u{1F4BC}'}</div>
        <p className="text-gray-400">{locale === 'ru' ? 'Сохраняем результаты...' : locale === 'ar' ? 'جاري حفظ النتائج...' : 'Saving your results...'}</p>
      </div>
    )
  }

  /* ─── Render: Done — ResultScreen is handled by MissionShell wrapper ─── */
  if (phase === 'done') {
    return (
      <div className="bg-[var(--brand-panel)] border border-green-500/40 rounded-2xl p-8 text-center">
        <div className="text-6xl mb-4">&#x1F4BC;</div>
        <p className="text-lg font-bold text-green-400">{locale === 'ru' ? 'Идея отправлена!' : locale === 'ar' ? 'تم تقديم الفكرة!' : 'Idea submitted!'}</p>
        <p className="text-gray-400 text-sm mt-2">{locale === 'ru' ? 'Счёт' : locale === 'ar' ? 'النتيجة' : 'Score'}: {score} / 1000</p>
      </div>
    )
  }

  /* ─── Render: Submit Phase (pick which column is startup idea) ─── */
  if (phase === 'submit') {
    return (
      <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl p-6">
        <h2 className="text-xl font-black text-white mb-2">{locale === 'ru' ? 'Выберите идею для стартапа' : locale === 'ar' ? 'اختر فكرة مشروعك' : 'Choose Your Startup Idea'}</h2>
        <p className="text-gray-400 text-sm mb-6">
          {locale === 'ru'
            ? 'Вокруг какой группы проблем вы хотите построить стартап? Выберите колонку с наибольшей рыночной возможностью.'
            : locale === 'ar'
            ? 'حول أي مجموعة مشاكل تريد بناء مشروعك؟ اختر العمود الذي يحتوي على أكبر فرصة سوقية.'
            : 'Which problem group do you want to build a startup around? Pick the column with the biggest market opportunity.'}
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {columnLabels.map((label, idx) => {
            const count = getColumnCount(idx)
            const isSelected = selectedColumn === idx
            return (
              <button
                key={idx}
                onClick={() => setSelectedColumn(idx)}
                className={`p-4 rounded-xl border-2 transition-all text-center ${
                  isSelected
                    ? 'border-yellow-400 bg-yellow-900/30 scale-105'
                    : 'border-gray-600 bg-gray-800/50 hover:border-gray-400'
                }`}
              >
                <p className="font-bold text-white text-sm mb-1">{label}</p>
                <p className="text-gray-400 text-xs">{count} {locale === 'ru' ? 'заметок' : locale === 'ar' ? 'ملاحظات' : 'notes'}</p>
              </button>
            )
          })}
        </div>

        <div className="flex justify-between items-center">
          <button
            onClick={() => setPhase('explore')}
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            {'\u2190'} {locale === 'ru' ? 'Назад к группировке' : locale === 'ar' ? 'العودة للتصنيف' : 'Back to grouping'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={selectedColumn === null}
            className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
          >
            {locale === 'ru' ? 'Отправить идею' : locale === 'ar' ? 'تقديم الفكرة' : 'Submit Idea'} {'\u2192'}
          </button>
        </div>
      </div>
    )
  }

  /* ─── Render: Explore Phase (main game) ─── */
  const hasEnoughNotes = collectedNotes.length >= 3

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl overflow-hidden">
        {/* 2.5D Isometric Street Canvas Header */}
        <IsometricStreetCanvas
          npcs={NPCS}
          interviewedIds={interviewedIds}
          hoveredNpcId={hoveredNpcId}
        />

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700">
          <span className="text-xs text-gray-400 font-bold">
            {locale === 'ru' ? 'Миссия 1: Идея' : locale === 'ar' ? 'المهمة 1: الفكرة' : 'Mission 1: The Idea'}
          </span>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400">
              {locale === 'ru' ? 'Опрошено' : locale === 'ar' ? 'تمت مقابلتهم' : 'Surveyed'}: <span className="text-white font-bold">{interviewedIds.size}</span>/12
            </span>
          </div>
        </div>

        {/* Split layout */}
        <div className="flex flex-col lg:flex-row">
          {/* Left: City street */}
          <div className="lg:w-1/2 relative" style={{ minHeight: '350px' }}>
            <CityStreetBackground />
            {/* NPC characters */}
            <div className="absolute inset-0">
              {NPCS.map(npc => (
                <NPCCharacter
                  key={npc.id}
                  npc={npc}
                  onClick={() => handleNpcClick(npc.id)}
                  isInterviewed={interviewedIds.has(npc.id)}
                  isActive={activeNpcId === npc.id}
                  onHover={() => setHoveredNpcId(npc.id)}
                  onLeave={() => setHoveredNpcId(null)}
                  locale={locale}
                />
              ))}
            </div>
            {/* Speech bubble overlay */}
            {activeNpc && (
              <SpeechBubble npc={activeNpc} onClose={handleCloseBubble} locale={locale} />
            )}
            {/* Instruction hint */}
            {interviewedIds.size === 0 && !activeNpc && (
              <div className="absolute bottom-3 left-3 right-3 bg-black/70 rounded-lg p-2 text-center">
                <p className="text-white text-xs">{locale === 'ru' ? 'Нажимайте на людей, чтобы узнать об их проблемах' : locale === 'ar' ? 'اضغط على الأشخاص لمعرفة مشاكلهم' : 'Click on people to learn about their problems'}</p>
              </div>
            )}
          </div>

          {/* Right: Sticky-note board */}
          <div className="lg:w-1/2 p-3 bg-gray-900/50 border-t lg:border-t-0 lg:border-l border-gray-700 flex flex-col" style={{ minHeight: '350px' }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-white">{locale === 'ru' ? 'Доска проблем' : locale === 'ar' ? 'لوحة المشاكل' : 'Problem Board'}</h3>
              {hasEnoughNotes && (
                <button
                  onClick={() => setPhase('submit')}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  {locale === 'ru' ? 'Отправить идею' : locale === 'ar' ? 'تقديم الفكرة' : 'Submit Idea'} {'\u2192'}
                </button>
              )}
            </div>

            {/* Unsorted notes */}
            <UnsortedArea
              notes={unsortedNotes}
              activeDragId={activeDragId}
              locale={locale}
            />

            {/* 4 columns */}
            <div className="flex gap-2 flex-1 overflow-x-auto">
              {columnLabels.map((label, idx) => (
                <DroppableColumn
                  key={idx}
                  columnId={`column-${idx}`}
                  label={label}
                  notes={getColumnNotes(idx)}
                  onRename={(name) => handleRenameColumn(idx, name)}
                  activeDragId={activeDragId}
                  locale={locale}
                />
              ))}
            </div>

            {collectedNotes.length === 0 && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-500 text-sm italic text-center">
                  {locale === 'ru' ? 'Поговорите с людьми на улице, чтобы собрать заметки о проблемах' : locale === 'ar' ? 'تحدث مع الناس في الشارع لجمع ملاحظات عن المشاكل' : 'Talk to people on the street to collect problem notes'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {draggedNote && (
          <OverlayStickyNote problem={draggedNote.problem} npcName={draggedNote.npcName} />
        )}
      </DragOverlay>
    </DndContext>
  )
}
