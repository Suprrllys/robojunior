'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import clsx from 'clsx'

interface Props {
  role: string
  onComplete: (score: number, resultData: Record<string, unknown>) => void
  otherResults?: Record<string, unknown>[]
}

/* ============================================================
   DRONE TASK — Isometric city map with animated drones
   ============================================================ */
function DroneTask({ onComplete }: { onComplete: (score: number, data: Record<string, unknown>) => void }) {
  const t = useTranslations('coopMissions.cityLaunch.drone')
  const [assignments, setAssignments] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [celebrationActive, setCelebrationActive] = useState(false)
  const [flyingDrone, setFlyingDrone] = useState<number | null>(null)

  const ZONES = [
    { id: 'north', labelKey: 'north', cells: 16 },
    { id: 'south', labelKey: 'south', cells: 16 },
    { id: 'east', labelKey: 'east', cells: 16 },
    { id: 'west', labelKey: 'west', cells: 16 },
    { id: 'center', labelKey: 'center', cells: 16 },
  ]

  const DRONES = [0, 1, 2, 3, 4]

  const ZONE_POSITIONS: Record<string, { x: number; y: number }> = {
    north:  { x: 50, y: 8 },
    south:  { x: 50, y: 72 },
    east:   { x: 82, y: 40 },
    west:   { x: 18, y: 40 },
    center: { x: 50, y: 40 },
  }

  const ZONE_COLORS: Record<string, string> = {
    north:  '#3b82f6',
    south:  '#f59e0b',
    east:   '#10b981',
    west:   '#8b5cf6',
    center: '#ef4444',
  }

  function assignDrone(droneIdx: number, zoneId: string) {
    if (submitted) return
    setFlyingDrone(droneIdx)
    setTimeout(() => setFlyingDrone(null), 600)
    setAssignments(prev => ({ ...prev, [droneIdx]: zoneId }))
  }

  const coveredZones = new Set(Object.values(assignments))

  function submit() {
    if (Object.keys(assignments).length < 5) return
    setSubmitted(true)
    setCelebrationActive(true)

    const uniqueZones = coveredZones.size
    const coverageScore = Math.round((uniqueZones / 5) * 700)
    const deployScore = Object.keys(assignments).length === 5 ? 300 : 150
    const score = Math.min(1000, coverageScore + deployScore)

    setTimeout(() => {
      onComplete(score, {
        droneAssignments: assignments,
        uniqueZonesCovered: uniqueZones,
      })
    }, 1500)
  }

  // Drones assigned to each zone for stacking
  const dronesInZone: Record<string, number[]> = {}
  Object.entries(assignments).forEach(([droneStr, zone]) => {
    const drone = Number(droneStr)
    if (!dronesInZone[zone]) dronesInZone[zone] = []
    dronesInZone[zone].push(drone)
  })

  return (
    <div className="space-y-4 relative">
      <style>{`
        @keyframes droneFly {
          0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
          50% { transform: translate(-50%, -80%) scale(1.2); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        @keyframes droneHover {
          0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
          50% { transform: translate(-50%, -50%) translateY(-4px); }
        }
        @keyframes zonePulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.25; }
          50% { transform: translate(-50%, -50%) scale(1.3); opacity: 0.08; }
        }
        @keyframes trailFade {
          0% { opacity: 0.6; width: 2px; }
          100% { opacity: 0; width: 0px; }
        }
        @keyframes celebratePop {
          0% { transform: scale(0) rotate(0deg); opacity: 1; }
          50% { transform: scale(1.5) rotate(180deg); opacity: 0.8; }
          100% { transform: scale(0) rotate(360deg); opacity: 0; }
        }
        @keyframes gridGlow {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.3; }
        }
      `}</style>

      <div>
        <h3 className="text-lg font-bold text-white">{t('title')}</h3>
        <p className="text-gray-400 text-sm mt-1">{t('desc')}</p>
      </div>

      {/* Coverage indicator */}
      <div className="flex items-center gap-3 bg-gray-900/60 rounded-xl p-3 border border-gray-700/50">
        <div className="flex gap-1">
          {ZONES.map(z => (
            <div key={z.id} className="w-5 h-5 rounded-full border-2 transition-all duration-500"
              style={{
                borderColor: ZONE_COLORS[z.id],
                backgroundColor: coveredZones.has(z.id) ? ZONE_COLORS[z.id] : 'transparent',
                boxShadow: coveredZones.has(z.id) ? `0 0 8px ${ZONE_COLORS[z.id]}80` : 'none',
              }} />
          ))}
        </div>
        <span className="text-sm text-gray-400">
          {t('zonesCovered')}: <span className={clsx('font-bold', coveredZones.size === 5 ? 'text-green-400' : 'text-yellow-400')}>{coveredZones.size}/5</span>
        </span>
      </div>

      {/* Isometric city map */}
      <div className="relative rounded-2xl overflow-hidden border border-gray-700/50"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          height: '220px',
          perspective: '800px',
        }}>
        {/* Isometric grid floor */}
        <div className="absolute inset-0" style={{
          transform: 'rotateX(55deg) rotateZ(45deg) scale(0.7)',
          transformOrigin: 'center center',
        }}>
          {Array.from({ length: 8 }).map((_, row) =>
            Array.from({ length: 8 }).map((_, col) => (
              <div key={`${row}-${col}`} className="absolute border border-cyan-500/10"
                style={{
                  width: '40px', height: '40px',
                  left: `${col * 40 + 20}px`, top: `${row * 40 + 20}px`,
                  animation: 'gridGlow 3s ease-in-out infinite',
                  animationDelay: `${(row + col) * 0.1}s`,
                }} />
            ))
          )}
        </div>

        {/* Zone areas */}
        {ZONES.map(zone => {
          const pos = ZONE_POSITIONS[zone.id]
          const isCovered = coveredZones.has(zone.id)
          return (
            <div key={zone.id} className="absolute" style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
              {/* Zone coverage circle */}
              <div className="absolute rounded-full" style={{
                width: isCovered ? '70px' : '50px',
                height: isCovered ? '70px' : '50px',
                left: '50%', top: '50%',
                transform: 'translate(-50%, -50%)',
                background: `radial-gradient(circle, ${ZONE_COLORS[zone.id]}40 0%, transparent 70%)`,
                transition: 'all 0.5s ease',
              }} />
              {/* Pulse ring when covered */}
              {isCovered && (
                <div className="absolute rounded-full" style={{
                  width: '80px', height: '80px',
                  left: '50%', top: '50%',
                  border: `2px solid ${ZONE_COLORS[zone.id]}`,
                  animation: 'zonePulse 2s ease-in-out infinite',
                }} />
              )}
              {/* Zone label */}
              <div className="absolute text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                style={{
                  left: '50%', top: '50%',
                  transform: 'translate(-50%, -50%) translateY(22px)',
                  color: isCovered ? ZONE_COLORS[zone.id] : '#6b7280',
                  textShadow: isCovered ? `0 0 8px ${ZONE_COLORS[zone.id]}80` : 'none',
                  transition: 'all 0.3s',
                }}>
                {t(zone.labelKey)}
              </div>
              {/* Drones in this zone */}
              {(dronesInZone[zone.id] || []).map((droneIdx, i) => (
                <div key={droneIdx} className="absolute text-lg"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: `translate(-50%, -50%) translate(${(i - ((dronesInZone[zone.id]?.length || 1) - 1) / 2) * 18}px, -14px)`,
                    animation: flyingDrone === droneIdx
                      ? 'droneFly 0.6s ease-out forwards'
                      : 'droneHover 2s ease-in-out infinite',
                    animationDelay: flyingDrone === droneIdx ? '0s' : `${droneIdx * 0.3}s`,
                    filter: `drop-shadow(0 0 6px ${ZONE_COLORS[zone.id]})`,
                  }}>
                  🛸
                </div>
              ))}
            </div>
          )
        })}

        {/* Unassigned drones in dock */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
          {DRONES.filter(d => !assignments[d]).map(d => (
            <div key={d} className="text-lg opacity-40" style={{
              animation: 'droneHover 2s ease-in-out infinite',
              animationDelay: `${d * 0.2}s`,
            }}>🛸</div>
          ))}
        </div>

        {/* Celebration particles */}
        {celebrationActive && Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="absolute rounded-full" style={{
            width: '6px', height: '6px',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            backgroundColor: Object.values(ZONE_COLORS)[i % 5],
            animation: 'celebratePop 1.5s ease-out forwards',
            animationDelay: `${i * 0.05}s`,
          }} />
        ))}
      </div>

      {/* Drone assignment controls */}
      <div className="space-y-2">
        {DRONES.map(idx => (
          <div key={idx} className={clsx(
            'rounded-xl p-3 transition-all duration-300 border',
            assignments[idx]
              ? 'bg-gray-800/80 border-gray-600/50'
              : 'bg-gray-900/60 border-gray-700/30',
            flyingDrone === idx && 'ring-2 ring-cyan-400/50'
          )}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base" style={{
                animation: flyingDrone === idx ? 'droneFly 0.6s ease-out' : 'droneHover 2s ease-in-out infinite',
                display: 'inline-block',
              }}>🛸</span>
              <span className="text-sm font-bold text-white">{t('drone')} #{idx + 1}</span>
              {assignments[idx] && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-bold" style={{
                  backgroundColor: `${ZONE_COLORS[assignments[idx]]}20`,
                  color: ZONE_COLORS[assignments[idx]],
                  border: `1px solid ${ZONE_COLORS[assignments[idx]]}40`,
                }}>
                  {t(assignments[idx])}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ZONES.map(zone => (
                <button key={zone.id} onClick={() => assignDrone(idx, zone.id)} disabled={submitted}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs border transition-all duration-300',
                    assignments[idx] === zone.id
                      ? 'font-bold text-white'
                      : 'border-gray-700/50 text-gray-500 hover:border-gray-500 hover:text-gray-300'
                  )}
                  style={assignments[idx] === zone.id ? {
                    borderColor: ZONE_COLORS[zone.id],
                    backgroundColor: `${ZONE_COLORS[zone.id]}15`,
                    color: ZONE_COLORS[zone.id],
                    boxShadow: `0 0 12px ${ZONE_COLORS[zone.id]}20`,
                  } : {}}>
                  {t(zone.labelKey)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {!submitted ? (
        <button onClick={submit} disabled={Object.keys(assignments).length < 5}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold rounded-xl disabled:opacity-30 hover:opacity-90 transition-all duration-300 shadow-lg shadow-blue-500/20">
          {t('submit')}
        </button>
      ) : (
        <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-green-500/10 to-green-500/5" style={{
            animation: 'gridGlow 2s ease-in-out infinite',
          }} />
          <p className="text-green-400 font-bold relative z-10">{t('submitted')}</p>
        </div>
      )}
    </div>
  )
}

/* ============================================================
   ROBOT TASK — Visual schedule grid with animated robots
   ============================================================ */
function RobotTask({ onComplete }: { onComplete: (score: number, data: Record<string, unknown>) => void }) {
  const t = useTranslations('coopMissions.cityLaunch.robot')
  const [schedule, setSchedule] = useState<Record<string, { robot: string; slot: string }>>({})
  const [submitted, setSubmitted] = useState(false)
  const [celebrationActive, setCelebrationActive] = useState(false)
  const [lastAssigned, setLastAssigned] = useState<string | null>(null)

  const ROBOTS = [
    { id: 'r1', labelKey: 'maintenanceBot', icon: '🔧', color: '#f59e0b' },
    { id: 'r2', labelKey: 'cleaningBot', icon: '🧹', color: '#10b981' },
    { id: 'r3', labelKey: 'deliveryBot', icon: '📦', color: '#3b82f6' },
    { id: 'r4', labelKey: 'inspectionBot', icon: '🔍', color: '#8b5cf6' },
  ]

  const TASKS = [
    { id: 't1', labelKey: 'pipeCheck', bestRobot: 'r1', icon: '🔧' },
    { id: 't2', labelKey: 'streetClean', bestRobot: 'r2', icon: '🧹' },
    { id: 't3', labelKey: 'packageDelivery', bestRobot: 'r3', icon: '📦' },
    { id: 't4', labelKey: 'buildingInspect', bestRobot: 'r4', icon: '🔍' },
    { id: 't5', labelKey: 'parkMaintenance', bestRobot: 'r1', icon: '🌳' },
    { id: 't6', labelKey: 'wasteCollection', bestRobot: 'r2', icon: '🗑️' },
  ]

  const TIME_SLOTS = ['06:00', '10:00', '14:00', '18:00']

  const SLOT_COLORS: Record<string, string> = {
    '06:00': '#f97316',
    '10:00': '#eab308',
    '14:00': '#22c55e',
    '18:00': '#6366f1',
  }

  const SLOT_LABELS: Record<string, string> = {
    '06:00': '🌅',
    '10:00': '☀️',
    '14:00': '🌤️',
    '18:00': '🌙',
  }

  function assignTask(taskId: string, robotId: string, slot: string) {
    if (submitted) return
    setLastAssigned(taskId)
    setTimeout(() => setLastAssigned(null), 500)
    setSchedule(prev => ({ ...prev, [taskId]: { robot: robotId, slot } }))
  }

  const allAssigned = TASKS.every(task => schedule[task.id]?.robot && schedule[task.id]?.slot)

  // Check for scheduling conflicts
  const conflicts = (() => {
    const robotSlots: Record<string, string[]> = {}
    Object.values(schedule).forEach(({ robot, slot }) => {
      if (!robotSlots[robot]) robotSlots[robot] = []
      robotSlots[robot].push(slot)
    })
    let count = 0
    Object.values(robotSlots).forEach(slots => {
      const unique = new Set(slots)
      count += slots.length - unique.size
    })
    return count
  })()

  // Detect which specific cells have conflicts
  const conflictCells = (() => {
    const cells = new Set<string>()
    const robotSlotTasks: Record<string, string[]> = {}
    Object.entries(schedule).forEach(([taskId, { robot, slot }]) => {
      const key = `${robot}-${slot}`
      if (!robotSlotTasks[key]) robotSlotTasks[key] = []
      robotSlotTasks[key].push(taskId)
    })
    Object.entries(robotSlotTasks).forEach(([, tasks]) => {
      if (tasks.length > 1) tasks.forEach(t => cells.add(t))
    })
    return cells
  })()

  function submit() {
    if (!allAssigned) return
    setSubmitted(true)
    setCelebrationActive(true)

    let matchScore = 0
    TASKS.forEach(task => {
      if (schedule[task.id]?.robot === task.bestRobot) matchScore += 120
      else matchScore += 50
    })
    const conflictPenalty = conflicts * 100
    const score = Math.min(1000, Math.max(0, matchScore + 280 - conflictPenalty))

    setTimeout(() => {
      onComplete(score, { schedule, conflicts })
    }, 1500)
  }

  function getRobotById(id: string) {
    return ROBOTS.find(r => r.id === id)
  }

  return (
    <div className="space-y-4">
      <style>{`
        @keyframes robotBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes robotAssign {
          0% { transform: scale(0.5) rotate(-10deg); opacity: 0; }
          60% { transform: scale(1.15) rotate(3deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes conflictFlash {
          0%, 100% { border-color: rgba(239, 68, 68, 0.3); background-color: rgba(239, 68, 68, 0.05); }
          50% { border-color: rgba(239, 68, 68, 0.7); background-color: rgba(239, 68, 68, 0.15); }
        }
        @keyframes slotGlow {
          0%, 100% { box-shadow: 0 0 0px transparent; }
          50% { box-shadow: 0 0 8px var(--glow-color); }
        }
        @keyframes gridLine {
          0% { opacity: 0; width: 0; }
          100% { opacity: 1; width: 100%; }
        }
        @keyframes celebSpin {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.5); }
          100% { transform: rotate(360deg) scale(0); opacity: 0; }
        }
      `}</style>

      <div>
        <h3 className="text-lg font-bold text-white">{t('title')}</h3>
        <p className="text-gray-400 text-sm mt-1">{t('desc')}</p>
      </div>

      {/* Conflict alert */}
      {conflicts > 0 && (
        <div className="rounded-xl p-3 text-center" style={{
          animation: 'conflictFlash 1s ease-in-out infinite',
          border: '1px solid rgba(239, 68, 68, 0.3)',
        }}>
          <p className="text-red-400 text-sm font-bold">⚠️ {t('conflicts', { count: conflicts })}</p>
        </div>
      )}

      {/* Robot legend */}
      <div className="flex flex-wrap gap-2 bg-gray-900/60 rounded-xl p-3 border border-gray-700/30">
        {ROBOTS.map(robot => (
          <div key={robot.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
            style={{ backgroundColor: `${robot.color}15`, border: `1px solid ${robot.color}30` }}>
            <span style={{ animation: 'robotBounce 2s ease-in-out infinite', display: 'inline-block', animationDelay: `${ROBOTS.indexOf(robot) * 0.3}s` }}>
              {robot.icon}
            </span>
            <span className="text-xs font-medium" style={{ color: robot.color }}>{t(robot.labelKey)}</span>
          </div>
        ))}
      </div>

      {/* Visual schedule grid */}
      <div className="overflow-x-auto">
        <div className="rounded-2xl border border-gray-700/40 overflow-hidden" style={{
          background: 'linear-gradient(180deg, #0f172a, #1e293b)',
          minWidth: '340px',
        }}>
          {/* Header row with time slots */}
          <div className="grid" style={{ gridTemplateColumns: '1fr repeat(4, 1fr)' }}>
            <div className="p-2 border-b border-r border-gray-700/30" />
            {TIME_SLOTS.map(slot => (
              <div key={slot} className="p-2 text-center border-b border-r border-gray-700/30 last:border-r-0">
                <div className="text-base">{SLOT_LABELS[slot]}</div>
                <div className="text-[10px] font-bold" style={{ color: SLOT_COLORS[slot] }}>{slot}</div>
              </div>
            ))}
          </div>

          {/* Task rows */}
          {TASKS.map(task => {
            const assigned = schedule[task.id]
            const hasConflict = conflictCells.has(task.id)
            const isLastAssigned = lastAssigned === task.id

            return (
              <div key={task.id} className="grid" style={{ gridTemplateColumns: '1fr repeat(4, 1fr)' }}>
                {/* Task label cell */}
                <div className={clsx(
                  'p-2 border-b border-r border-gray-700/30 flex items-center gap-1.5 transition-all duration-300',
                  hasConflict && 'bg-red-900/10'
                )} style={isLastAssigned ? { animation: 'robotAssign 0.5s ease-out' } : {}}>
                  <span className="text-sm">{task.icon}</span>
                  <span className="text-xs font-medium text-gray-300 leading-tight">{t(task.labelKey)}</span>
                </div>

                {/* Time slot cells */}
                {TIME_SLOTS.map(slot => {
                  const isThisCell = assigned?.robot && assigned?.slot === slot
                  const robot = isThisCell ? getRobotById(assigned.robot) : null

                  return (
                    <div key={slot} className={clsx(
                      'p-1.5 border-b border-r border-gray-700/30 last:border-r-0 min-h-[48px] flex items-center justify-center cursor-pointer transition-all duration-200',
                      isThisCell && hasConflict ? 'bg-red-900/20' : isThisCell ? 'bg-gray-800/50' : 'hover:bg-gray-800/30'
                    )} style={hasConflict && isThisCell ? { animation: 'conflictFlash 1s ease-in-out infinite' } : {}}>
                      {isThisCell && robot ? (
                        <div className="flex flex-col items-center" style={{
                          animation: isLastAssigned ? 'robotAssign 0.5s ease-out' : 'robotBounce 2s ease-in-out infinite',
                        }}>
                          <span className="text-xl" style={{
                            filter: `drop-shadow(0 0 6px ${robot.color})`,
                          }}>{robot.icon}</span>
                          <div className="w-3 h-0.5 rounded-full mt-0.5" style={{
                            backgroundColor: robot.color,
                            boxShadow: `0 0 6px ${robot.color}`,
                          }} />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded border border-dashed border-gray-700/50" />
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Assignment controls */}
      <div className="space-y-2">
        {TASKS.map(task => {
          const assigned = schedule[task.id]
          const hasConflict = conflictCells.has(task.id)
          return (
            <div key={task.id} className={clsx(
              'rounded-xl p-3 border transition-all duration-300',
              hasConflict ? 'border-red-500/40 bg-red-900/10' : assigned?.robot ? 'border-gray-600/50 bg-gray-800/60' : 'border-gray-700/30 bg-gray-900/40'
            )} style={hasConflict ? { animation: 'conflictFlash 1.5s ease-in-out infinite' } : {}}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">{task.icon}</span>
                <span className="text-sm font-bold text-white">{t(task.labelKey)}</span>
                {assigned?.robot && (
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{
                    backgroundColor: `${getRobotById(assigned.robot)?.color}20`,
                    color: getRobotById(assigned.robot)?.color,
                    border: `1px solid ${getRobotById(assigned.robot)?.color}40`,
                  }}>
                    {getRobotById(assigned.robot)?.icon} → {assigned.slot}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-1">
                  {ROBOTS.map(robot => (
                    <button key={robot.id}
                      onClick={() => assignTask(task.id, robot.id, assigned?.slot || '06:00')}
                      disabled={submitted}
                      className={clsx(
                        'px-2 py-1 rounded-lg text-xs border transition-all duration-200',
                        assigned?.robot === robot.id
                          ? 'font-bold text-white'
                          : 'border-gray-700/50 text-gray-500 hover:text-gray-300'
                      )}
                      style={assigned?.robot === robot.id ? {
                        borderColor: robot.color,
                        backgroundColor: `${robot.color}15`,
                        color: robot.color,
                        boxShadow: `0 0 8px ${robot.color}20`,
                      } : {}}>
                      {robot.icon} {t(robot.labelKey)}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  {TIME_SLOTS.map(slot => (
                    <button key={slot}
                      onClick={() => assigned?.robot && assignTask(task.id, assigned.robot, slot)}
                      disabled={submitted || !assigned?.robot}
                      className={clsx(
                        'px-2 py-1 rounded-lg text-xs border transition-all duration-200',
                        assigned?.slot === slot
                          ? 'font-bold'
                          : 'border-gray-700/50 text-gray-600 hover:border-gray-500'
                      )}
                      style={assigned?.slot === slot ? {
                        borderColor: SLOT_COLORS[slot],
                        backgroundColor: `${SLOT_COLORS[slot]}15`,
                        color: SLOT_COLORS[slot],
                      } : {}}>
                      {SLOT_LABELS[slot]} {slot}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Celebration overlay */}
      {celebrationActive && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="absolute" style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              fontSize: '20px',
              animation: 'celebSpin 2s ease-out forwards',
              animationDelay: `${i * 0.05}s`,
            }}>
              {['🤖', '⚙️', '✨', '🎯'][i % 4]}
            </div>
          ))}
        </div>
      )}

      {!submitted ? (
        <button onClick={submit} disabled={!allAssigned}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-500 text-white font-bold rounded-xl disabled:opacity-30 hover:opacity-90 transition-all duration-300 shadow-lg shadow-purple-500/20">
          {t('submit')}
        </button>
      ) : (
        <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-green-500/10 to-green-500/5" />
          <p className="text-green-400 font-bold relative z-10">{t('submitted')}</p>
        </div>
      )}
    </div>
  )
}

/* ============================================================
   ENTREPRENEUR TASK — Launch timeline with rocket + gauges
   ============================================================ */
function EntrepreneurTask({ onComplete }: { onComplete: (score: number, data: Record<string, unknown>) => void }) {
  const t = useTranslations('coopMissions.cityLaunch.entrepreneur')
  const [infra, setInfra] = useState(100000)
  const [marketing, setMarketing] = useState(100000)
  const [reserves, setReserves] = useState(100000)
  const [milestones, setMilestones] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [celebrationActive, setCelebrationActive] = useState(false)

  const totalBudget = 500000
  const total = infra + marketing + reserves

  const MILESTONE_OPTIONS = [
    { id: 'beta', labelKey: 'betaLaunch', icon: '🚀', color: '#3b82f6' },
    { id: 'press', labelKey: 'pressEvent', icon: '📰', color: '#8b5cf6' },
    { id: 'partnerships', labelKey: 'partnerships', icon: '🤝', color: '#10b981' },
    { id: 'hiring', labelKey: 'hiringWave', icon: '👥', color: '#f59e0b' },
    { id: 'expansion', labelKey: 'expansion', icon: '🌍', color: '#ef4444' },
  ]

  const BUDGET_ITEMS = [
    { label: t('infrastructure'), value: infra, set: setInfra, icon: '🏗️', color: '#3b82f6', optimalMin: 0.30, optimalMax: 0.50 },
    { label: t('marketing'), value: marketing, set: setMarketing, icon: '📢', color: '#f59e0b', optimalMin: 0.20, optimalMax: 0.40 },
    { label: t('reserves'), value: reserves, set: setReserves, icon: '🏦', color: '#10b981', optimalMin: 0.15, optimalMax: 0.30 },
  ]

  function toggleMilestone(id: string) {
    if (submitted) return
    setMilestones(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : prev.length < 3 ? [...prev, id] : prev
    )
  }

  // Launch readiness calculation (visual only, does not affect scoring)
  const readiness = (() => {
    let r = 0
    const infraPct = infra / totalBudget
    const reservePct = reserves / totalBudget
    if (infraPct >= 0.30 && infraPct <= 0.50) r += 30
    else if (infraPct >= 0.20) r += 20
    else r += 5
    if (marketing >= 100000 && marketing <= 200000) r += 25
    else r += 10
    if (reservePct >= 0.15 && reservePct <= 0.30) r += 25
    else if (reservePct >= 0.10) r += 15
    else r += 5
    if (milestones.includes('beta')) r += 10
    r += milestones.length * 3
    if (total <= totalBudget) r += 7
    return Math.min(100, r)
  })()

  function submit() {
    if (total > totalBudget || milestones.length < 2) return
    setSubmitted(true)
    setCelebrationActive(true)

    // Scoring logic — unchanged
    const infraPct = infra / totalBudget
    const reservePct = reserves / totalBudget
    const infraScore = infraPct >= 0.30 && infraPct <= 0.50 ? 250 : infraPct >= 0.20 ? 180 : 100
    const marketScore = marketing >= 100000 && marketing <= 200000 ? 200 : 120
    const reserveScore = reservePct >= 0.15 && reservePct <= 0.30 ? 200 : reservePct >= 0.10 ? 150 : 80
    const milestoneScore = milestones.includes('beta') ? 200 : 100
    const extraMilestones = (milestones.length - 1) * 50
    const score = Math.min(1000, infraScore + marketScore + reserveScore + milestoneScore + extraMilestones)

    setTimeout(() => {
      onComplete(score, {
        budget: { infrastructure: infra, marketing, reserves },
        milestones,
        totalSpent: total,
      })
    }, 2000)
  }

  const overBudget = total > totalBudget

  return (
    <div className="space-y-4 relative">
      <style>{`
        @keyframes rocketIdle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes rocketLaunch {
          0% { transform: translateY(0) scale(1); }
          30% { transform: translateY(5px) scale(1.05); }
          100% { transform: translateY(-200px) scale(0.3); opacity: 0; }
        }
        @keyframes flameFlicker {
          0%, 100% { transform: scaleY(1) scaleX(1); opacity: 0.8; }
          25% { transform: scaleY(1.3) scaleX(0.8); opacity: 1; }
          50% { transform: scaleY(0.8) scaleX(1.2); opacity: 0.7; }
          75% { transform: scaleY(1.1) scaleX(0.9); opacity: 0.9; }
        }
        @keyframes barFlow {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes milestonePing {
          0% { transform: scale(1); box-shadow: 0 0 0 0 var(--ping-color); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 8px transparent; }
          100% { transform: scale(1); box-shadow: 0 0 0 0 transparent; }
        }
        @keyframes gaugeArrow {
          0% { transform: rotate(-90deg); }
        }
        @keyframes budgetPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes launchStar {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
        }
        @keyframes gaugeGlow {
          0%, 100% { filter: drop-shadow(0 0 3px var(--gauge-color)); }
          50% { filter: drop-shadow(0 0 8px var(--gauge-color)); }
        }
      `}</style>

      <div>
        <h3 className="text-lg font-bold text-white">{t('title')}</h3>
        <p className="text-gray-400 text-sm mt-1">{t('desc')}</p>
      </div>

      {/* Budget overview with animated gauge */}
      <div className="rounded-2xl overflow-hidden border border-gray-700/40" style={{
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
      }}>
        <div className="p-4 flex items-center gap-4">
          {/* Budget circle gauge */}
          <div className="relative w-20 h-20 flex-shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#1e293b" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none"
                stroke={overBudget ? '#ef4444' : '#22c55e'}
                strokeWidth="8"
                strokeDasharray={`${Math.min(100, (total / totalBudget) * 100) * 2.64} 264`}
                strokeLinecap="round"
                className="transition-all duration-500"
                style={{
                  filter: `drop-shadow(0 0 4px ${overBudget ? '#ef4444' : '#22c55e'})`,
                }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={clsx('text-xs font-black', overBudget ? 'text-red-400' : 'text-green-400')}>
                {Math.round((total / totalBudget) * 100)}%
              </span>
            </div>
          </div>

          <div className="flex-1">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">{t('launchBudget')}</p>
            <p className="text-2xl font-black text-white">${totalBudget.toLocaleString()}</p>
            <p className={clsx('text-sm font-bold mt-0.5 transition-colors', overBudget ? 'text-red-400' : 'text-green-400')}
              style={overBudget ? { animation: 'budgetPulse 1s ease-in-out infinite' } : {}}>
              {t('allocated')}: ${total.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Budget distribution bar */}
        <div className="h-3 flex">
          {BUDGET_ITEMS.map(item => (
            <div key={item.label} className="h-full transition-all duration-300 first:rounded-bl-none last:rounded-br-none" style={{
              width: `${total > 0 ? (item.value / total) * 100 : 33}%`,
              background: `linear-gradient(90deg, ${item.color}, ${item.color}cc, ${item.color})`,
              backgroundSize: '200% 100%',
              animation: 'barFlow 3s linear infinite',
            }} />
          ))}
        </div>
      </div>

      {/* Budget sliders with visual bars */}
      <div className="space-y-3">
        {BUDGET_ITEMS.map(item => {
          const pct = item.value / totalBudget
          const isOptimal = pct >= item.optimalMin && pct <= item.optimalMax
          return (
            <div key={item.label} className="rounded-xl p-3 border border-gray-700/30 bg-gray-900/40">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-300 text-sm flex items-center gap-1.5">
                  <span className="text-base">{item.icon}</span> {item.label}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold text-sm">${item.value.toLocaleString()}</span>
                  {isOptimal && <span className="text-green-400 text-xs">✓</span>}
                </div>
              </div>
              {/* Custom styled range */}
              <div className="relative h-6">
                {/* Optimal range indicator */}
                <div className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full opacity-20" style={{
                  left: `${item.optimalMin * 100}%`,
                  width: `${(item.optimalMax - item.optimalMin) * 100}%`,
                  backgroundColor: item.color,
                }} />
                <input type="range" min={0} max={400000} step={10000}
                  value={item.value} onChange={e => item.set(Number(e.target.value))}
                  disabled={submitted} className="w-full h-full opacity-0 cursor-pointer relative z-10" />
                {/* Visual bar */}
                <div className="absolute top-1/2 -translate-y-1/2 left-0 h-2 rounded-full pointer-events-none transition-all duration-200" style={{
                  width: `${(item.value / 400000) * 100}%`,
                  background: `linear-gradient(90deg, ${item.color}88, ${item.color})`,
                  boxShadow: `0 0 8px ${item.color}40`,
                }} />
                {/* Track */}
                <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-2 rounded-full bg-gray-800 pointer-events-none -z-10" />
              </div>
              <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                <span>$0</span>
                <span>$400K</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Milestone timeline */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-300">{t('selectMilestones')} ({milestones.length}/3)</p>
        <div className="relative">
          {/* Timeline connector line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-700/50" />

          <div className="space-y-2">
            {MILESTONE_OPTIONS.map((m, i) => {
              const isSelected = milestones.includes(m.id)
              return (
                <button key={m.id} onClick={() => toggleMilestone(m.id)} disabled={submitted}
                  className={clsx(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-300 text-left relative',
                    isSelected
                      ? 'text-white font-bold'
                      : 'border-gray-700/30 text-gray-500 hover:border-gray-600 hover:text-gray-300'
                  )}
                  style={isSelected ? {
                    borderColor: `${m.color}60`,
                    backgroundColor: `${m.color}10`,
                    // @ts-ignore
                    '--ping-color': `${m.color}40`,
                    animation: 'milestonePing 2s ease-in-out infinite',
                  } as React.CSSProperties : {}}>
                  {/* Timeline dot */}
                  <div className={clsx(
                    'w-[10px] h-[10px] rounded-full border-2 flex-shrink-0 transition-all duration-300 relative z-10',
                  )} style={{
                    borderColor: isSelected ? m.color : '#4b5563',
                    backgroundColor: isSelected ? m.color : 'transparent',
                    boxShadow: isSelected ? `0 0 8px ${m.color}80` : 'none',
                  }} />
                  <span className="text-lg">{m.icon}</span>
                  <span className="text-sm flex-1">{t(m.labelKey)}</span>
                  {isSelected && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{
                      backgroundColor: `${m.color}20`,
                      color: m.color,
                    }}>
                      #{milestones.indexOf(m.id) + 1}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Launch readiness gauge + rocket */}
      <div className="rounded-2xl overflow-hidden border border-gray-700/40 p-4" style={{
        background: 'linear-gradient(180deg, #0f172a, #1e1e2e)',
      }}>
        <div className="text-center mb-3">
          <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">{t('launchReadiness')}</p>
        </div>

        {/* Readiness bar */}
        <div className="relative h-4 rounded-full bg-gray-800 overflow-hidden mb-4">
          <div className="h-full rounded-full transition-all duration-700 ease-out" style={{
            width: `${readiness}%`,
            background: readiness >= 80
              ? 'linear-gradient(90deg, #22c55e, #4ade80)'
              : readiness >= 50
                ? 'linear-gradient(90deg, #eab308, #facc15)'
                : 'linear-gradient(90deg, #ef4444, #f87171)',
            boxShadow: `0 0 12px ${readiness >= 80 ? '#22c55e' : readiness >= 50 ? '#eab308' : '#ef4444'}40`,
          }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-black text-white drop-shadow-lg">{readiness}%</span>
          </div>
        </div>

        {/* Rocket */}
        <div className="flex justify-center">
          <div className="relative" style={{
            animation: submitted ? 'rocketLaunch 2s ease-in forwards' : 'rocketIdle 2s ease-in-out infinite',
          }}>
            <div className="text-5xl">🚀</div>
            {/* Flame effect */}
            {readiness > 30 && (
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-2xl" style={{
                animation: 'flameFlicker 0.3s ease-in-out infinite',
                opacity: readiness / 100,
                filter: `blur(${readiness < 60 ? 1 : 0}px)`,
              }}>
                🔥
              </div>
            )}
          </div>
        </div>

        {/* Launch stars on submit */}
        {celebrationActive && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 24 }).map((_, i) => {
              const angle = (i / 24) * Math.PI * 2
              const dist = 60 + Math.random() * 80
              return (
                <div key={i} className="absolute left-1/2 bottom-1/4 text-base" style={{
                  '--tx': `${Math.cos(angle) * dist}px`,
                  '--ty': `${Math.sin(angle) * dist - 40}px`,
                  animation: 'launchStar 1.5s ease-out forwards',
                  animationDelay: `${i * 0.03}s`,
                } as React.CSSProperties}>
                  {['⭐', '✨', '💫', '🌟'][i % 4]}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {!submitted ? (
        <button onClick={submit} disabled={overBudget || milestones.length < 2}
          className="w-full py-3 text-white font-bold rounded-xl disabled:opacity-30 hover:opacity-90 transition-all duration-300 shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            boxShadow: '0 4px 20px rgba(245, 158, 11, 0.3)',
          }}>
          {t('submit')}
        </button>
      ) : (
        <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-green-500/10 to-green-500/5" />
          <p className="text-green-400 font-bold relative z-10">{t('submitted')}</p>
        </div>
      )}
    </div>
  )
}

/* ============================================================
   MAIN EXPORT — Role-based task switcher
   ============================================================ */
export default function CoopCityLaunch({ role, onComplete }: Props) {
  const handleComplete = (score: number, data: Record<string, unknown>) => {
    onComplete(score, data)
  }

  switch (role) {
    case 'drone_programmer':
      return <DroneTask onComplete={handleComplete} />
    case 'robot_constructor':
      return <RobotTask onComplete={handleComplete} />
    case 'entrepreneur':
      return <EntrepreneurTask onComplete={handleComplete} />
    default:
      return <DroneTask onComplete={handleComplete} />
  }
}
