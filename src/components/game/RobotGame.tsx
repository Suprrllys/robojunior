'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import clsx from 'clsx'
import { completeMission } from '@/lib/game/scoring'
import { getMissionConfig } from '@/lib/game/missions'
import { fireGameToast } from '@/components/game/GameToast'
import { Link } from '@/i18n/navigation'
import { useRouter } from 'next/navigation'
import type { Difficulty, MissionResult } from '@/types/game'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SlotId = 'head' | 'body' | 'left-arm' | 'right-arm' | 'legs'

interface RobotModule {
  id: string
  type: 'motor' | 'servo' | 'frame' | 'sensor' | 'battery' | 'armor'
  tier: number
  nameKey: string
  cost: number
  strength: number
  precision: number
  speed: number
  slots: SlotId[]
  color: string
  hidden?: boolean
}

interface RobotGameProps {
  userId: string
  missionNumber: number
  difficulty: Difficulty
  isCompleted: boolean
  onComplete?: (score: number) => void
}

// ---------------------------------------------------------------------------
// Module definitions
// ---------------------------------------------------------------------------

const ALL_MODULES: RobotModule[] = [
  // Frames -> body
  { id: 'frame_t1', type: 'frame', tier: 1, nameKey: 'game.robot.mod_frame_t1', cost: 15, strength: 3, precision: 0, speed: 0, slots: ['body'], color: '#4A90D9' },
  { id: 'frame_t2', type: 'frame', tier: 2, nameKey: 'game.robot.mod_frame_t2', cost: 30, strength: 5, precision: 1, speed: 0, slots: ['body'], color: '#2563EB' },
  { id: 'frame_t3', type: 'frame', tier: 3, nameKey: 'game.robot.mod_frame_t3', cost: 50, strength: 8, precision: 1, speed: -1, slots: ['body'], color: '#1D4ED8' },
  // Motors -> legs
  { id: 'motor_t1', type: 'motor', tier: 1, nameKey: 'game.robot.mod_motor_t1', cost: 10, strength: 0, precision: 0, speed: 2, slots: ['legs'], color: '#F59E0B' },
  { id: 'motor_t2', type: 'motor', tier: 2, nameKey: 'game.robot.mod_motor_t2', cost: 25, strength: 0, precision: 1, speed: 4, slots: ['legs'], color: '#D97706' },
  { id: 'motor_t3', type: 'motor', tier: 3, nameKey: 'game.robot.mod_motor_t3', cost: 45, strength: 1, precision: 0, speed: 7, slots: ['legs'], color: '#B45309' },
  // Servos -> left-arm, right-arm
  { id: 'servo_t1', type: 'servo', tier: 1, nameKey: 'game.robot.mod_servo_t1', cost: 12, strength: 1, precision: 2, speed: 0, slots: ['left-arm', 'right-arm'], color: '#10B981' },
  { id: 'servo_t2', type: 'servo', tier: 2, nameKey: 'game.robot.mod_servo_t2', cost: 28, strength: 1, precision: 4, speed: 1, slots: ['left-arm', 'right-arm'], color: '#059669' },
  { id: 'servo_t3', type: 'servo', tier: 3, nameKey: 'game.robot.mod_servo_t3', cost: 48, strength: 2, precision: 7, speed: 1, slots: ['left-arm', 'right-arm'], color: '#047857' },
  // Sensors -> head
  { id: 'sensor_t1', type: 'sensor', tier: 1, nameKey: 'game.robot.mod_sensor_t1', cost: 8, strength: 0, precision: 2, speed: 1, slots: ['head'], color: '#8B5CF6' },
  { id: 'sensor_t2', type: 'sensor', tier: 2, nameKey: 'game.robot.mod_sensor_t2', cost: 22, strength: 0, precision: 5, speed: 1, slots: ['head'], color: '#7C3AED' },
  { id: 'sensor_t3', type: 'sensor', tier: 3, nameKey: 'game.robot.mod_sensor_t3', cost: 40, strength: 0, precision: 7, speed: 2, slots: ['head'], color: '#6D28D9' },
  // Batteries -> body, head
  { id: 'battery_t1', type: 'battery', tier: 1, nameKey: 'game.robot.mod_battery_t1', cost: 10, strength: 0, precision: 0, speed: 3, slots: ['body', 'head'], color: '#EAB308' },
  { id: 'battery_t2', type: 'battery', tier: 2, nameKey: 'game.robot.mod_battery_t2', cost: 22, strength: 0, precision: 1, speed: 5, slots: ['body', 'head'], color: '#CA8A04' },
  { id: 'battery_t3', type: 'battery', tier: 3, nameKey: 'game.robot.mod_battery_t3', cost: 42, strength: 0, precision: 1, speed: 8, slots: ['body', 'head'], color: '#A16207' },
  // Armor -> legs
  { id: 'armor_t1', type: 'armor', tier: 1, nameKey: 'game.robot.mod_armor_t1', cost: 12, strength: 3, precision: 0, speed: -1, slots: ['legs'], color: '#6B7280' },
  { id: 'armor_t2', type: 'armor', tier: 2, nameKey: 'game.robot.mod_armor_t2', cost: 28, strength: 5, precision: 0, speed: -1, slots: ['legs'], color: '#4B5563' },
  { id: 'armor_t3', type: 'armor', tier: 3, nameKey: 'game.robot.mod_armor_t3', cost: 50, strength: 8, precision: 0, speed: -2, slots: ['legs'], color: '#374151' },
]

function getModulesForDifficulty(difficulty: Difficulty): RobotModule[] {
  if (difficulty === 'hard') {
    return ALL_MODULES.map(m => m.tier === 3 ? { ...m, hidden: true } : m)
  }
  if (difficulty === 'easy') {
    return ALL_MODULES.filter(m => m.tier <= 2)
  }
  return ALL_MODULES
}

const SLOT_LABELS: Record<SlotId, string> = {
  head: 'game.robot.slot_head',
  body: 'game.robot.slot_body',
  'left-arm': 'game.robot.slot_left_arm',
  'right-arm': 'game.robot.slot_right_arm',
  legs: 'game.robot.slot_legs',
}

const ALL_SLOTS: SlotId[] = ['head', 'body', 'left-arm', 'right-arm', 'legs']
const MODULE_TYPES = ['frame', 'motor', 'servo', 'sensor', 'battery', 'armor'] as const
const TYPE_LABEL_KEYS: Record<string, string> = {
  frame: 'game.robot.type_frame',
  motor: 'game.robot.type_motor',
  servo: 'game.robot.type_servo',
  sensor: 'game.robot.type_sensor',
  battery: 'game.robot.type_battery',
  armor: 'game.robot.type_armor',
}

// ---------------------------------------------------------------------------
// Draggable module card
// ---------------------------------------------------------------------------

function DraggableModule({ mod, isHidden, isEquipped, t }: {
  mod: RobotModule; isHidden: boolean; isEquipped: boolean; t: ReturnType<typeof useTranslations>
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: mod.id, data: { module: mod },
  })
  return (
    <div
      ref={setNodeRef} {...listeners} {...attributes}
      className={clsx(
        'p-3 rounded-xl border cursor-grab active:cursor-grabbing transition-all select-none',
        isDragging && 'opacity-40',
        isEquipped ? 'border-[var(--brand-blue)] bg-blue-900/20' : 'border-[var(--brand-border)] bg-[var(--brand-dark)] hover:border-gray-500',
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-white text-sm">{t(mod.nameKey)}</span>
        <span className="text-[var(--brand-gold)] text-xs font-bold">{mod.cost} {t('game.robot.coins_unit')}</span>
      </div>
      {isHidden ? (
        <p className="text-gray-500 text-xs italic">{t('game.robot.hidden_stats')}</p>
      ) : (
        <div className="flex gap-2 text-xs text-gray-400">
          {mod.strength !== 0 && <span className={mod.strength > 0 ? 'text-red-400' : 'text-red-700'}>{t('game.robot.stat_str')} {mod.strength > 0 ? '+' : ''}{mod.strength}</span>}
          {mod.precision !== 0 && <span className={mod.precision > 0 ? 'text-blue-400' : 'text-blue-700'}>{t('game.robot.stat_pre')} {mod.precision > 0 ? '+' : ''}{mod.precision}</span>}
          {mod.speed !== 0 && <span className={mod.speed > 0 ? 'text-yellow-400' : 'text-yellow-700'}>{t('game.robot.stat_spd')} {mod.speed > 0 ? '+' : ''}{mod.speed}</span>}
        </div>
      )}
      <div className="flex gap-1 mt-1">
        {mod.slots.map(s => (
          <span key={s} className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">{t(SLOT_LABELS[s])}</span>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Droppable robot slot
// ---------------------------------------------------------------------------

function DroppableSlot({ slotId, equipped, t }: {
  slotId: SlotId; equipped: RobotModule | undefined; t: ReturnType<typeof useTranslations>
}) {
  const { isOver, setNodeRef } = useDroppable({ id: slotId })
  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'rounded-lg border-2 border-dashed p-2 text-center transition-all min-h-[48px] flex flex-col items-center justify-center',
        isOver ? 'border-[var(--brand-blue)] bg-blue-900/30' : equipped ? 'border-green-500/50 bg-green-900/10' : 'border-gray-600 bg-gray-900/30',
      )}
    >
      <span className="text-[10px] text-gray-500 uppercase font-bold">{t(SLOT_LABELS[slotId])}</span>
      {equipped && <span className="text-xs text-white font-medium mt-0.5">{t(equipped.nameKey)}</span>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SVG Robot Preview
// ---------------------------------------------------------------------------

function RobotSVG({ slots }: { slots: Partial<Record<SlotId, RobotModule>> }) {
  const hc = slots.head?.color ?? '#333'
  const bc = slots.body?.color ?? '#333'
  const lac = slots['left-arm']?.color ?? '#333'
  const rac = slots['right-arm']?.color ?? '#333'
  const lc = slots.legs?.color ?? '#333'
  const tr = (prop: string) => ({ transition: `${prop} 200ms ease` })
  const trFill = { transition: 'fill 200ms ease, stroke 200ms ease' }
  const glow = (active: boolean) => active ? { ...trFill, filter: 'url(#glow)' } : trFill

  return (
    <svg viewBox="0 0 200 320" className="w-full max-w-[200px] mx-auto">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Head */}
      <circle cx="100" cy="45" r="30" fill={hc} stroke={slots.head ? '#0FF' : '#555'} strokeWidth={slots.head ? 2 : 1} style={glow(!!slots.head)} />
      <circle cx="88" cy="40" r="5" fill={slots.head ? '#0FF' : '#666'} style={tr('fill')} />
      <circle cx="112" cy="40" r="5" fill={slots.head ? '#0FF' : '#666'} style={tr('fill')} />
      <line x1="100" y1="15" x2="100" y2="5" stroke={slots.head ? '#0FF' : '#555'} strokeWidth="2" style={tr('stroke')} />
      <circle cx="100" cy="4" r="3" fill={slots.head ? '#0FF' : '#555'} style={tr('fill')} />
      {/* Neck */}
      <rect x="92" y="75" width="16" height="10" rx="3" fill="#444" />
      {/* Body */}
      <rect x="55" y="85" width="90" height="100" rx="12" fill={bc} stroke={slots.body ? '#0FF' : '#555'} strokeWidth={slots.body ? 2 : 1} style={glow(!!slots.body)} />
      <rect x="70" y="100" width="60" height="30" rx="6" fill="rgba(0,0,0,0.3)" />
      <rect x="78" y="108" width="12" height="4" rx="2" fill={slots.body ? '#0F0' : '#555'} style={tr('fill')} />
      <rect x="94" y="108" width="12" height="4" rx="2" fill={slots.body ? '#0FF' : '#555'} style={tr('fill')} />
      <rect x="110" y="108" width="12" height="4" rx="2" fill={slots.body ? '#FF0' : '#555'} style={tr('fill')} />
      {/* Left arm */}
      <rect x="15" y="90" width="30" height="80" rx="8" fill={lac} stroke={slots['left-arm'] ? '#0FF' : '#555'} strokeWidth={slots['left-arm'] ? 2 : 1} style={glow(!!slots['left-arm'])} />
      <circle cx="30" cy="178" r="10" fill={lac} stroke={slots['left-arm'] ? '#0FF' : '#555'} strokeWidth="1" style={tr('fill')} />
      {/* Right arm */}
      <rect x="155" y="90" width="30" height="80" rx="8" fill={rac} stroke={slots['right-arm'] ? '#0FF' : '#555'} strokeWidth={slots['right-arm'] ? 2 : 1} style={glow(!!slots['right-arm'])} />
      <circle cx="170" cy="178" r="10" fill={rac} stroke={slots['right-arm'] ? '#0FF' : '#555'} strokeWidth="1" style={tr('fill')} />
      {/* Pelvis */}
      <rect x="65" y="185" width="70" height="20" rx="8" fill="#444" />
      {/* Left leg */}
      <rect x="65" y="205" width="28" height="80" rx="8" fill={lc} stroke={slots.legs ? '#0FF' : '#555'} strokeWidth={slots.legs ? 2 : 1} style={glow(!!slots.legs)} />
      <rect x="58" y="285" width="40" height="14" rx="7" fill={lc} stroke={slots.legs ? '#0FF' : '#555'} strokeWidth="1" style={tr('fill')} />
      {/* Right leg */}
      <rect x="107" y="205" width="28" height="80" rx="8" fill={lc} stroke={slots.legs ? '#0FF' : '#555'} strokeWidth={slots.legs ? 2 : 1} style={glow(!!slots.legs)} />
      <rect x="102" y="285" width="40" height="14" rx="7" fill={lc} stroke={slots.legs ? '#0FF' : '#555'} strokeWidth="1" style={tr('fill')} />
      {/* Ground shadow */}
      <ellipse cx="100" cy="308" rx="60" ry="6" fill="rgba(0,255,255,0.08)" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Stat bar
// ---------------------------------------------------------------------------

function StatBar({ label, value, required, color }: { label: string; value: number; required: number; color: string }) {
  const met = value >= required
  const pct = required > 0 ? Math.min(100, (value / required) * 100) : 100
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className={met ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>{value} / {required}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: met ? '#22C55E' : color, opacity: met ? 1 : 0.7 }} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function RobotGame({ userId, missionNumber, difficulty, isCompleted, onComplete }: RobotGameProps) {
  const t = useTranslations()
  const router = useRouter()
  const mission = getMissionConfig('robot_constructor', missionNumber, difficulty)

  const budget = mission?.budget ?? 100
  const reqStrength = mission?.reqStrength ?? 3
  const reqPrecision = mission?.reqPrecision ?? 2
  const reqSpeed = mission?.reqSpeed ?? 1

  const modules = useMemo(() => getModulesForDifficulty(difficulty), [difficulty])

  const [slots, setSlots] = useState<Partial<Record<SlotId, RobotModule>>>({})
  const [done, setDone] = useState(isCompleted)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<MissionResult | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [startTime] = useState(Date.now)

  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const equippedModules = Object.values(slots).filter(Boolean) as RobotModule[]
  const totalCost = equippedModules.reduce((s, m) => s + m.cost, 0)
  const totalStrength = equippedModules.reduce((s, m) => s + m.strength, 0)
  const totalPrecision = equippedModules.reduce((s, m) => s + m.precision, 0)
  const totalSpeed = equippedModules.reduce((s, m) => s + m.speed, 0)

  const overBudget = totalCost > budget
  const strengthMet = totalStrength >= reqStrength
  const precisionMet = totalPrecision >= reqPrecision
  const speedMet = totalSpeed >= reqSpeed
  const allRequirementsMet = strengthMet && precisionMet && speedMet && !overBudget
  const equippedIds = new Set(equippedModules.map(m => m.id))

  const calculateScore = useCallback((): number => {
    if (reqStrength === 0 && reqPrecision === 0 && reqSpeed === 0) return 100
    const ratios: number[] = []
    if (reqStrength > 0) ratios.push(totalStrength / reqStrength)
    if (reqPrecision > 0) ratios.push(totalPrecision / reqPrecision)
    if (reqSpeed > 0) ratios.push(totalSpeed / reqSpeed)
    const statsAvg = ratios.length > 0 ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 1
    const budgetFactor = ((budget - totalCost) / budget) * 0.5 + 0.5
    return Math.round(Math.min(100, statsAvg * budgetFactor * 100))
  }, [totalStrength, totalPrecision, totalSpeed, reqStrength, reqPrecision, reqSpeed, budget, totalCost])

  const handleDragStart = useCallback((e: DragStartEvent) => { setActiveId(e.active.id as string) }, [])

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const mod = active.data.current?.module as RobotModule | undefined
    if (!mod) return
    const targetSlot = over.id as SlotId
    if (!ALL_SLOTS.includes(targetSlot)) return
    if (!mod.slots.includes(targetSlot)) return
    setSlots(prev => ({ ...prev, [targetSlot]: mod }))
  }, [])

  const removeFromSlot = useCallback((slotId: SlotId) => {
    setSlots(prev => { const next = { ...prev }; delete next[slotId]; return next })
  }, [])

  const handleAssemble = useCallback(async () => {
    if (!allRequirementsMet || saving) return
    setSaving(true)
    const score = calculateScore()
    try {
      const elapsed = (Date.now() - startTime) / 1000
      const missionResult = await completeMission(userId, 'robot_constructor', missionNumber, difficulty, score, {
        decision_time_avg: elapsed / Math.max(1, equippedModules.length),
        attempts: 1,
        style: totalCost < budget * 0.8 ? 'analytical' : 'fast',
        precision_score: Math.round((totalPrecision / Math.max(1, reqPrecision)) * 50),
        creativity_score: Math.max(0, Math.min(100, score - 50)),
        teamwork_score: 0,
      })
      setResult(missionResult)
      setDone(true)
      fireGameToast({ xp: missionResult.xpEarned, score, badge: missionResult.newBadges[0] })
      onComplete?.(score)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }, [allRequirementsMet, saving, calculateScore, userId, missionNumber, difficulty, totalCost, budget, reqPrecision, totalPrecision, onComplete, equippedModules.length, startTime, router])

  // Done state
  if (done && !saving) {
    const score = result ? calculateScore() : 0
    return (
      <div className="bg-[var(--brand-panel)] border border-green-500/40 rounded-2xl p-8 text-center">
        <h2 className="text-2xl font-black text-white mb-2">{t('missions.missionComplete')}</h2>
        <div className="text-4xl font-black text-[var(--brand-gold)] mb-2">{score}</div>
        <p className="text-gray-400 text-sm mb-4">{t('missions.score')}</p>
        {result && (
          <div className="space-y-1 mb-6">
            {result.isFirstCompletion && (
              <p className="text-green-400 font-bold">+{result.xpEarned} XP / +{result.currencyEarned} {t('game.common.coins')}</p>
            )}
            {result.isNewBestScore && <p className="text-yellow-400 text-sm">{t('game.common.newBestScore')}</p>}
            {result.newBadges.map(b => <p key={b} className="text-yellow-300 text-sm">{b}</p>)}
          </div>
        )}
        <Link href="/roles" className="inline-block px-6 py-3 bg-[var(--brand-panel)] border border-[var(--brand-blue)] text-[var(--brand-blue)] font-bold rounded-xl hover:bg-[var(--brand-blue)] hover:text-black transition-colors">
          {t('missions.backToRoles')}
        </Link>
      </div>
    )
  }

  // Active game
  const activeModule = activeId ? modules.find(m => m.id === activeId) : null

  return (
    <DndContext sensors={dndSensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">{t(mission?.titleKey ?? 'game.robot.m1_title')}</h2>
            <p className="text-gray-400 text-sm">{t(mission?.descKey ?? 'game.robot.m1_easy_desc')}</p>
          </div>
          <span className={clsx(
            'px-3 py-1 rounded-full text-xs font-bold uppercase',
            difficulty === 'easy' && 'bg-green-900/40 text-green-400 border border-green-500/30',
            difficulty === 'medium' && 'bg-yellow-900/40 text-yellow-400 border border-yellow-500/30',
            difficulty === 'hard' && 'bg-red-900/40 text-red-400 border border-red-500/30',
          )}>
            {t(`game.common.${difficulty}`)}
          </span>
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6">
          {/* Left: robot + stats */}
          <div className="space-y-4">
            <div className="bg-gray-950 rounded-2xl p-4 border border-gray-800">
              <RobotSVG slots={slots} />
            </div>

            {/* Drop slots */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-3 flex justify-center"><div className="w-1/3"><DroppableSlot slotId="head" equipped={slots.head} t={t} /></div></div>
              <DroppableSlot slotId="left-arm" equipped={slots['left-arm']} t={t} />
              <DroppableSlot slotId="body" equipped={slots.body} t={t} />
              <DroppableSlot slotId="right-arm" equipped={slots['right-arm']} t={t} />
              <div className="col-span-3 flex justify-center"><div className="w-1/3"><DroppableSlot slotId="legs" equipped={slots.legs} t={t} /></div></div>
            </div>

            {ALL_SLOTS.some(s => slots[s]) && (
              <div className="flex flex-wrap gap-1">
                {ALL_SLOTS.filter(s => slots[s]).map(s => (
                  <button key={s} onClick={() => removeFromSlot(s)} className="text-[10px] px-2 py-1 rounded bg-red-900/30 text-red-400 border border-red-500/30 hover:bg-red-900/50 transition-colors">
                    x {t(SLOT_LABELS[s])}
                  </button>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="space-y-3 bg-gray-950 rounded-xl p-4 border border-gray-800">
              <StatBar label={t('game.robot.stat_strength')} value={totalStrength} required={reqStrength} color="#EF4444" />
              <StatBar label={t('game.robot.stat_precision')} value={totalPrecision} required={reqPrecision} color="#3B82F6" />
              <StatBar label={t('game.robot.stat_speed')} value={totalSpeed} required={reqSpeed} color="#F59E0B" />
            </div>

            {/* Budget */}
            <div className="bg-gray-950 rounded-xl p-4 border border-gray-800">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">{t('game.robot.budget')}</span>
                <span className={clsx('font-bold', overBudget ? 'text-red-400' : 'text-[var(--brand-gold)]')}>{totalCost} / {budget} {t('game.robot.coins_unit')}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, (totalCost / budget) * 100)}%`, backgroundColor: overBudget ? '#EF4444' : '#22C55E' }} />
              </div>
            </div>

            {/* Assemble */}
            <button
              onClick={handleAssemble}
              disabled={!allRequirementsMet || saving}
              className={clsx(
                'w-full py-3 rounded-xl font-black text-lg uppercase tracking-wider transition-all',
                allRequirementsMet ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/30' : 'bg-gray-800 text-gray-500 cursor-not-allowed',
              )}
            >
              {saving ? t('game.robot.assembling') : t('game.robot.assemble_btn')}
            </button>
          </div>

          {/* Right: module palette */}
          <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
            <h3 className="text-sm font-bold text-gray-400 uppercase">{t('game.robot.module_palette')}</h3>
            <p className="text-xs text-gray-500">{t('game.robot.drag_hint')}</p>
            {MODULE_TYPES.map(type => {
              const typeMods = modules.filter(m => m.type === type)
              if (typeMods.length === 0) return null
              return (
                <div key={type}>
                  <p className="text-xs font-bold text-gray-500 uppercase mb-2">{t(TYPE_LABEL_KEYS[type])}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {typeMods.map(mod => (
                      <DraggableModule key={mod.id} mod={mod} isHidden={!!mod.hidden && !equippedIds.has(mod.id)} isEquipped={equippedIds.has(mod.id)} t={t} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeModule ? (
          <div className="p-3 rounded-xl border border-[var(--brand-blue)] bg-[var(--brand-panel)] shadow-xl shadow-cyan-500/20 opacity-90 pointer-events-none">
            <span className="font-bold text-white text-sm">{t(activeModule.nameKey)}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
