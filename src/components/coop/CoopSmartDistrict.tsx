'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import clsx from 'clsx'

interface Props {
  role: string
  onComplete: (score: number, resultData: Record<string, unknown>) => void
  otherResults?: Record<string, unknown>[]
}

/* ============================================================
   SHARED: Celebration overlay when a task is submitted
   ============================================================ */
function CelebrationOverlay({ show }: { show: boolean }) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string; size: number; delay: number }>>([])

  useEffect(() => {
    if (!show) return
    const colors = ['#22d3ee', '#a78bfa', '#34d399', '#facc15', '#f472b6', '#60a5fa']
    const p = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      color: colors[i % colors.length],
      size: 4 + Math.random() * 8,
      delay: Math.random() * 0.6,
    }))
    setParticles(p)
  }, [show])

  if (!show) return null

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl z-20">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full animate-celebrationParticle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-4xl animate-celebrationPop">🎉</div>
      </div>
    </div>
  )
}

/* ============================================================
   SHARED: Animated coverage arc / gauge
   ============================================================ */
function CoverageGauge({ percent, label }: { percent: number; label: string }) {
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference
  const color = percent >= 80 ? '#34d399' : percent >= 50 ? '#facc15' : '#f87171'

  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="100" className="transform -rotate-90">
        <circle cx="50" cy="50" r={radius} stroke="#1e293b" strokeWidth="8" fill="none" />
        <circle
          cx="50" cy="50" r={radius}
          stroke={color}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: 100, height: 100 }}>
        <span className="text-xl font-bold text-white" style={{ textShadow: `0 0 10px ${color}` }}>
          {percent}%
        </span>
      </div>
      <span className="text-xs text-gray-400 mt-1">{label}</span>
    </div>
  )
}

/* ============================================================
   DRONE TASK: Isometric 8x8 grid with animated coverage
   ============================================================ */
function DroneTask({ onComplete }: { onComplete: (score: number, data: Record<string, unknown>) => void }) {
  const t = useTranslations('coopMissions.smartDistrict.drone')
  const [cameras, setCameras] = useState<Set<string>>(new Set())
  const [submitted, setSubmitted] = useState(false)

  // Roads are at rows 2, 5 and cols 2, 5 (cross-pattern)
  const ROAD_ROWS = useMemo(() => new Set([2, 5]), [])
  const ROAD_COLS = useMemo(() => new Set([2, 5]), [])

  const isRoad = useCallback((r: number, c: number): boolean => {
    return ROAD_ROWS.has(r) || ROAD_COLS.has(c)
  }, [ROAD_ROWS, ROAD_COLS])

  // Camera covers a 3x3 area around it
  const getCoveredRoadCells = useCallback((cameraPositions: Set<string>): Set<string> => {
    const covered = new Set<string>()
    cameraPositions.forEach(key => {
      const [cr, cc] = key.split(',').map(Number)
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = cr + dr
          const nc = cc + dc
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && isRoad(nr, nc)) {
            covered.add(`${nr},${nc}`)
          }
        }
      }
    })
    return covered
  }, [isRoad])

  // Count total road cells
  const totalRoadCells = useMemo(() => {
    let count = 0
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if (isRoad(r, c)) count++
    return count
  }, [isRoad])

  function toggleCamera(r: number, c: number) {
    if (submitted) return
    const key = `${r},${c}`
    const next = new Set(cameras)
    if (next.has(key)) {
      next.delete(key)
    } else if (next.size < 4) {
      next.add(key)
    }
    setCameras(next)
  }

  const coveredCells = getCoveredRoadCells(cameras)
  const coveragePct = totalRoadCells > 0 ? Math.round((coveredCells.size / totalRoadCells) * 100) : 0

  function submit() {
    if (cameras.size !== 4) return
    setSubmitted(true)
    const score = Math.min(1000, Math.round(coveragePct * 10))
    onComplete(score, {
      cameraPositions: Array.from(cameras),
      coveragePercent: coveragePct,
      coveredRoadCells: coveredCells.size,
      totalRoadCells,
    })
  }

  // Check if cell is in camera coverage zone (for blue overlay)
  const isCoveredByCamera = useCallback((r: number, c: number): boolean => {
    for (const key of cameras) {
      const [cr, cc] = key.split(',').map(Number)
      if (Math.abs(r - cr) <= 1 && Math.abs(c - cc) <= 1) return true
    }
    return false
  }, [cameras])

  return (
    <div className="space-y-4 relative">
      <CelebrationOverlay show={submitted} />

      <div>
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="animate-isoPulse inline-block">📡</span>
          {t('title')}
        </h3>
        <p className="text-gray-400 text-sm mt-1">{t('desc')}</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={clsx(
            'px-3 py-1.5 rounded-lg border text-sm font-bold',
            cameras.size === 4
              ? 'border-cyan-500/50 bg-cyan-900/20 text-cyan-300'
              : 'border-gray-600 bg-gray-800/50 text-gray-400'
          )}>
            📷 {cameras.size}/4
          </div>
        </div>
        <div className="relative">
          <CoverageGauge percent={coveragePct} label={t('coverage')} />
        </div>
      </div>

      {/* Isometric grid container */}
      <div className="bg-gradient-to-br from-gray-900 via-[#0a1628] to-gray-900 rounded-xl p-6 border border-gray-700/30 overflow-hidden relative">
        {/* Grid glow background */}
        <div className="absolute inset-0 opacity-20"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(34,211,238,0.15), transparent 70%)',
          }}
        />

        {/* Isometric grid */}
        <div
          className="mx-auto relative w-full max-w-[320px]"
          style={{
            transform: 'perspective(800px) rotateX(45deg) rotateZ(-30deg)',
            transformStyle: 'preserve-3d',
            aspectRatio: '1',
          }}
        >
          {Array.from({ length: 8 }, (_, r) =>
            Array.from({ length: 8 }, (_, c) => {
              const key = `${r},${c}`
              const isCamera = cameras.has(key)
              const road = isRoad(r, c)
              const isCovered = coveredCells.has(key)
              const inCoverageZone = isCoveredByCamera(r, c)

              return (
                <button
                  key={key}
                  onClick={() => toggleCamera(r, c)}
                  disabled={submitted}
                  className={clsx(
                    'absolute transition-all duration-300 border',
                    !submitted && 'cursor-pointer hover:brightness-150 hover:scale-110',
                    isCamera
                      ? 'z-10'
                      : road
                        ? 'z-[2]'
                        : 'z-[1]'
                  )}
                  style={{
                    left: c * 38 + 8,
                    top: r * 38 + 8,
                    width: 34,
                    height: 34,
                    borderRadius: 4,
                    background: isCamera
                      ? 'linear-gradient(135deg, #0ea5e9, #06b6d4)'
                      : road && isCovered
                        ? 'linear-gradient(135deg, #064e3b, #065f46)'
                        : road
                          ? 'linear-gradient(135deg, #1e293b, #334155)'
                          : inCoverageZone
                            ? 'linear-gradient(135deg, #0c1a2e, #0f2744)'
                            : 'linear-gradient(135deg, #111827, #1a2332)',
                    borderColor: isCamera
                      ? '#22d3ee'
                      : road && isCovered
                        ? 'rgba(52,211,153,0.4)'
                        : road
                          ? 'rgba(71,85,105,0.5)'
                          : inCoverageZone
                            ? 'rgba(34,211,238,0.15)'
                            : 'rgba(55,65,81,0.2)',
                    boxShadow: isCamera
                      ? '0 0 20px rgba(6,182,212,0.6), inset 0 0 10px rgba(6,182,212,0.3)'
                      : road && isCovered
                        ? '0 0 8px rgba(52,211,153,0.3)'
                        : inCoverageZone
                          ? '0 0 6px rgba(34,211,238,0.1)'
                          : 'none',
                    transform: isCamera ? 'translateZ(12px)' : road ? 'translateZ(2px)' : 'translateZ(6px)',
                  }}
                >
                  {isCamera && (
                    <>
                      <span className="text-lg leading-none animate-isoPulse block" style={{ fontSize: 18 }}>📷</span>
                      <span
                        className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-recBlink"
                        style={{ boxShadow: '0 0 6px rgba(239,68,68,0.8)' }}
                      />
                    </>
                  )}
                  {road && !isCamera && (
                    <span className="text-gray-500 text-[10px]">━</span>
                  )}
                </button>
              )
            })
          )}

          {/* Coverage zone overlays for cameras */}
          {Array.from(cameras).map(key => {
            const [cr, cc] = key.split(',').map(Number)
            return (
              <div
                key={`zone-${key}`}
                className="absolute rounded-lg animate-coverageExpand pointer-events-none z-[3]"
                style={{
                  left: (cc - 1) * 38 + 8 - 2,
                  top: (cr - 1) * 38 + 8 - 2,
                  width: 3 * 38 + 4,
                  height: 3 * 38 + 4,
                  border: '1.5px solid rgba(34,211,238,0.3)',
                  background: 'rgba(34,211,238,0.04)',
                  boxShadow: '0 0 15px rgba(34,211,238,0.1)',
                }}
              />
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-5 mt-8 text-xs text-gray-500 relative z-10">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)' }} />
            {t('camera')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }} />
            {t('road')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ background: 'linear-gradient(135deg, #064e3b, #065f46)' }} />
            {t('covered')}
          </span>
        </div>
      </div>

      {!submitted ? (
        <button onClick={submit} disabled={cameras.size !== 4}
          className={clsx(
            'w-full py-3 font-bold rounded-xl transition-all duration-300',
            cameras.size === 4
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:scale-[1.02]'
              : 'bg-gray-800 text-gray-500 opacity-40 cursor-not-allowed'
          )}>
          {t('submit')}
        </button>
      ) : (
        <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-500/30 rounded-xl p-4 text-center animate-fadeInScale">
          <p className="text-green-400 font-bold text-lg">{t('submitted')}</p>
          <p className="text-green-300/60 text-sm mt-1">{coveragePct}% {t('coverage')}</p>
        </div>
      )}
    </div>
  )
}

/* ============================================================
   ROBOT TASK: Visual district map with robot deployment
   ============================================================ */
function RobotTask({ onComplete }: { onComplete: (score: number, data: Record<string, unknown>) => void }) {
  const t = useTranslations('coopMissions.smartDistrict.robot')
  const [selectedRobots, setSelectedRobots] = useState<Set<string>>(new Set())
  const [zoneAssignments, setZoneAssignments] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [deployingRobot, setDeployingRobot] = useState<string | null>(null)

  const ROBOTS = [
    { id: 'cleaner', labelKey: 'cleaner', icon: '🧹', bestZone: 'streets', color: '#22d3ee' },
    { id: 'security', labelKey: 'security', icon: '🛡️', bestZone: 'perimeter', color: '#a78bfa' },
    { id: 'delivery', labelKey: 'delivery', icon: '📦', bestZone: 'commercial', color: '#fb923c' },
    { id: 'garden', labelKey: 'garden', icon: '🌱', bestZone: 'parks', color: '#34d399' },
    { id: 'repair', labelKey: 'repair', icon: '🔧', bestZone: 'infrastructure', color: '#f472b6' },
    { id: 'medical', labelKey: 'medical', icon: '🏥', bestZone: 'residential', color: '#60a5fa' },
  ]

  const ZONES = [
    { id: 'streets', labelKey: 'streets', x: 10, y: 5, w: 30, h: 20 },
    { id: 'perimeter', labelKey: 'perimeter', x: 60, y: 5, w: 30, h: 20 },
    { id: 'commercial', labelKey: 'commercial', x: 10, y: 35, w: 30, h: 25 },
    { id: 'parks', labelKey: 'parks', x: 60, y: 35, w: 30, h: 25 },
    { id: 'infrastructure', labelKey: 'infrastructure', x: 10, y: 70, w: 30, h: 22 },
    { id: 'residential', labelKey: 'residential', x: 60, y: 70, w: 30, h: 22 },
  ]

  function toggleRobot(id: string) {
    if (submitted) return
    const next = new Set(selectedRobots)
    if (next.has(id)) {
      next.delete(id)
      const nextZones = { ...zoneAssignments }
      delete nextZones[id]
      setZoneAssignments(nextZones)
    } else if (next.size < 3) {
      next.add(id)
    }
    setSelectedRobots(next)
  }

  function assignZone(robotId: string, zoneId: string) {
    if (submitted) return
    setDeployingRobot(robotId)
    setTimeout(() => setDeployingRobot(null), 600)
    setZoneAssignments(prev => ({ ...prev, [robotId]: zoneId }))
  }

  const allAssigned = selectedRobots.size === 3 && Array.from(selectedRobots).every(id => zoneAssignments[id])

  // Diversity bonus check
  const hasDiversityBonus = selectedRobots.size === 3

  function submit() {
    if (!allAssigned) return
    setSubmitted(true)

    // Score: correct zone assignments + good robot selection diversity
    let matchScore = 0
    selectedRobots.forEach(robotId => {
      const robot = ROBOTS.find(r => r.id === robotId)
      if (robot && zoneAssignments[robotId] === robot.bestZone) matchScore += 250
      else matchScore += 100
    })
    // Diversity bonus: different capability types
    const diversityBonus = selectedRobots.size === 3 ? 250 : 0
    const score = Math.min(1000, matchScore + diversityBonus)

    onComplete(score, {
      selectedRobots: Array.from(selectedRobots),
      zoneAssignments,
    })
  }

  // Find which zone a robot is assigned to
  const getZoneForRobot = (robotId: string) => ZONES.find(z => z.id === zoneAssignments[robotId])
  const getRobotForZone = (zoneId: string) => {
    const entry = Object.entries(zoneAssignments).find(([, z]) => z === zoneId)
    if (!entry) return null
    return ROBOTS.find(r => r.id === entry[0])
  }

  return (
    <div className="space-y-4 relative">
      <CelebrationOverlay show={submitted} />

      <div>
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="animate-isoFloat inline-block">🤖</span>
          {t('title')}
        </h3>
        <p className="text-gray-400 text-sm mt-1">{t('desc')}</p>
      </div>

      {/* Robot catalog as cards */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-300">{t('selectRobots')} ({selectedRobots.size}/3)</p>
        <div className="grid grid-cols-3 gap-2">
          {ROBOTS.map(r => {
            const selected = selectedRobots.has(r.id)
            const isDeploying = deployingRobot === r.id
            const assignedZone = getZoneForRobot(r.id)

            return (
              <button
                key={r.id}
                onClick={() => toggleRobot(r.id)}
                disabled={submitted}
                className={clsx(
                  'relative p-3 rounded-xl border text-center transition-all duration-300 overflow-hidden group',
                  selected
                    ? 'border-opacity-60 bg-opacity-20 scale-[1.02]'
                    : 'border-gray-700/50 bg-gray-800/30 hover:border-gray-500 hover:bg-gray-800/50',
                  isDeploying && 'animate-robotDeploy'
                )}
                style={{
                  borderColor: selected ? r.color : undefined,
                  background: selected ? `linear-gradient(135deg, ${r.color}15, ${r.color}08)` : undefined,
                  boxShadow: selected ? `0 0 15px ${r.color}20, inset 0 0 20px ${r.color}05` : undefined,
                }}
              >
                {/* Robot glow */}
                {selected && (
                  <div className="absolute inset-0 opacity-10 animate-isoPulse" style={{ background: `radial-gradient(circle, ${r.color}, transparent)` }} />
                )}
                <span className={clsx(
                  'text-2xl block transition-transform duration-300',
                  selected ? 'animate-isoFloat' : 'group-hover:scale-110'
                )}>
                  {r.icon}
                </span>
                <p className="text-white text-xs font-bold mt-1">{t(r.labelKey)}</p>
                {assignedZone && (
                  <p className="text-[10px] mt-0.5 opacity-60" style={{ color: r.color }}>
                    → {t(assignedZone.labelKey)}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Diversity bonus indicator */}
      {hasDiversityBonus && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-yellow-500/30 bg-yellow-900/10 animate-fadeInScale">
          <span className="animate-isoPulse">⭐</span>
          <span className="text-yellow-400 text-xs font-bold">{t('diversityBonus')}</span>
        </div>
      )}

      {/* Visual district map with zones */}
      {selectedRobots.size > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-300">{t('assignZones')}</p>

          {/* Isometric district map */}
          <div
            className="relative bg-gradient-to-br from-gray-900 via-[#0a1628] to-gray-900 rounded-xl border border-gray-700/30 overflow-hidden"
            style={{
              height: 220,
              perspective: '600px',
            }}
          >
            {/* Grid lines background */}
            <div className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />

            {/* Zones on the map */}
            {ZONES.map(zone => {
              const assignedRobot = getRobotForZone(zone.id)
              const isActive = assignedRobot != null

              return (
                <div
                  key={zone.id}
                  className={clsx(
                    'absolute rounded-lg border transition-all duration-500 flex flex-col items-center justify-center',
                    isActive ? 'border-opacity-50' : 'border-gray-600/30 bg-gray-800/20'
                  )}
                  style={{
                    left: `${zone.x}%`,
                    top: `${zone.y}%`,
                    width: `${zone.w}%`,
                    height: `${zone.h}%`,
                    borderColor: isActive ? assignedRobot!.color : undefined,
                    background: isActive
                      ? `linear-gradient(135deg, ${assignedRobot!.color}15, ${assignedRobot!.color}05)`
                      : undefined,
                    boxShadow: isActive ? `0 0 20px ${assignedRobot!.color}15` : undefined,
                    transform: isActive ? 'scale(1.02)' : 'scale(1)',
                  }}
                >
                  <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{t(zone.labelKey)}</span>
                  {isActive && (
                    <span className="text-xl mt-1 animate-robotLand">{assignedRobot!.icon}</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Zone assignment controls for each selected robot */}
          {Array.from(selectedRobots).map(robotId => {
            const robot = ROBOTS.find(r => r.id === robotId)!
            return (
              <div key={robotId} className="bg-gradient-to-r from-gray-900/80 to-gray-800/40 rounded-xl p-3 border border-gray-700/30">
                <p className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <span className="animate-isoFloat inline-block">{robot.icon}</span>
                  {t(robot.labelKey)}
                  {zoneAssignments[robotId] && (
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: `${robot.color}20`, color: robot.color }}>
                      ✓ {t(ZONES.find(z => z.id === zoneAssignments[robotId])?.labelKey || '')}
                    </span>
                  )}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ZONES.map(zone => {
                    const isSelected = zoneAssignments[robotId] === zone.id
                    return (
                      <button
                        key={zone.id}
                        onClick={() => assignZone(robotId, zone.id)}
                        disabled={submitted}
                        className={clsx(
                          'px-2.5 py-1.5 rounded-lg text-xs border transition-all duration-300',
                          isSelected
                            ? 'text-white font-bold scale-105'
                            : 'border-gray-700/50 text-gray-400 hover:border-gray-500 hover:text-gray-300'
                        )}
                        style={{
                          borderColor: isSelected ? robot.color : undefined,
                          background: isSelected ? `linear-gradient(135deg, ${robot.color}25, ${robot.color}10)` : undefined,
                          boxShadow: isSelected ? `0 0 10px ${robot.color}20` : undefined,
                        }}
                      >
                        {t(zone.labelKey)}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!submitted ? (
        <button onClick={submit} disabled={!allAssigned}
          className={clsx(
            'w-full py-3 font-bold rounded-xl transition-all duration-300',
            allAssigned
              ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:scale-[1.02]'
              : 'bg-gray-800 text-gray-500 opacity-40 cursor-not-allowed'
          )}>
          {t('submit')}
        </button>
      ) : (
        <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-500/30 rounded-xl p-4 text-center animate-fadeInScale">
          <p className="text-green-400 font-bold text-lg">{t('submitted')}</p>
        </div>
      )}
    </div>
  )
}

/* ============================================================
   ENTREPRENEUR TASK: Radar chart + animated budget bars
   ============================================================ */
function EntrepreneurTask({ onComplete }: { onComplete: (score: number, data: Record<string, unknown>) => void }) {
  const t = useTranslations('coopMissions.smartDistrict.entrepreneur')
  const [kpis, setKpis] = useState({ safety: 70, efficiency: 50, satisfaction: 60, eco: 50 })
  const [budget, setBudget] = useState({ staff: 10000, tech: 10000, maintenance: 15000, marketing: 15000 })
  const [submitted, setSubmitted] = useState(false)

  const totalBudget = 50000
  const budgetTotal = Object.values(budget).reduce((a, b) => a + b, 0)

  // Balance metric for KPIs (used for visual feedback)
  const kpiValues = Object.values(kpis)
  const kpiSpread = Math.max(...kpiValues) - Math.min(...kpiValues)
  const isBalanced = kpiSpread < 30

  function submit() {
    if (budgetTotal > totalBudget) return
    setSubmitted(true)

    // KPI scoring: balanced KPIs are better than extreme ones
    const kpiAvg = kpiValues.reduce((a, b) => a + b, 0) / kpiValues.length
    const kpiBalance = 100 - (Math.max(...kpiValues) - Math.min(...kpiValues))
    const kpiScore = Math.round((kpiAvg / 100) * 300 + (kpiBalance / 100) * 200)

    // Budget scoring: balanced with emphasis on tech and staff
    const techPct = budget.tech / totalBudget
    const staffPct = budget.staff / totalBudget
    const budgetScore = Math.round(
      (techPct >= 0.25 ? 150 : techPct >= 0.15 ? 100 : 50) +
      (staffPct >= 0.25 ? 150 : staffPct >= 0.15 ? 100 : 50) +
      (budgetTotal <= totalBudget ? 200 : 0)
    )

    const score = Math.min(1000, kpiScore + budgetScore)
    onComplete(score, { kpis, budget })
  }

  const KPI_ITEMS = [
    { key: 'safety' as const, labelKey: 'kpiSafety', icon: '🛡️', color: '#a78bfa' },
    { key: 'efficiency' as const, labelKey: 'kpiEfficiency', icon: '⚡', color: '#facc15' },
    { key: 'satisfaction' as const, labelKey: 'kpiSatisfaction', icon: '😊', color: '#34d399' },
    { key: 'eco' as const, labelKey: 'kpiEco', icon: '🌿', color: '#22d3ee' },
  ]

  const BUDGET_ITEMS = [
    { key: 'staff' as const, labelKey: 'budgetStaff', icon: '👷', color: '#60a5fa', optimal: 0.25 },
    { key: 'tech' as const, labelKey: 'budgetTech', icon: '💻', color: '#a78bfa', optimal: 0.25 },
    { key: 'maintenance' as const, labelKey: 'budgetMaintenance', icon: '🔧', color: '#fb923c', optimal: 0.25 },
    { key: 'marketing' as const, labelKey: 'budgetMarketing', icon: '📢', color: '#f472b6', optimal: 0.15 },
  ]

  // Radar chart drawing
  const radarSize = 160
  const radarCenter = radarSize / 2
  const radarRadius = radarSize / 2 - 20

  function getRadarPoint(index: number, value: number): { x: number; y: number } {
    const angle = (Math.PI * 2 * index) / KPI_ITEMS.length - Math.PI / 2
    const r = (value / 100) * radarRadius
    return { x: radarCenter + r * Math.cos(angle), y: radarCenter + r * Math.sin(angle) }
  }

  const radarPoints = KPI_ITEMS.map((kpi, i) => getRadarPoint(i, kpis[kpi.key]))
  const radarPath = radarPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'

  return (
    <div className="space-y-5 relative">
      <CelebrationOverlay show={submitted} />

      <div>
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="animate-isoPulse inline-block">💼</span>
          {t('title')}
        </h3>
        <p className="text-gray-400 text-sm mt-1">{t('desc')}</p>
      </div>

      {/* KPI Section with Radar Chart */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-300">{t('setKPIs')}</p>
          {isBalanced && (
            <span className="text-xs px-2 py-1 rounded-full bg-green-900/30 border border-green-500/30 text-green-400 animate-fadeInScale">
              ✓ {t('balanced')}
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          {/* Radar chart */}
          <div className="relative flex-shrink-0">
            <svg width={radarSize} height={radarSize} className="animate-fadeIn">
              {/* Background rings */}
              {[25, 50, 75, 100].map(level => {
                const points = KPI_ITEMS.map((_, i) => {
                  const p = getRadarPoint(i, level)
                  return `${p.x},${p.y}`
                }).join(' ')
                return <polygon key={level} points={points} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              })}

              {/* Axis lines */}
              {KPI_ITEMS.map((_, i) => {
                const p = getRadarPoint(i, 100)
                return <line key={i} x1={radarCenter} y1={radarCenter} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
              })}

              {/* Data shape */}
              <path
                d={radarPath}
                fill="rgba(34,211,238,0.12)"
                stroke="#22d3ee"
                strokeWidth="2"
                className="transition-all duration-300"
                style={{ filter: 'drop-shadow(0 0 6px rgba(34,211,238,0.4))' }}
              />

              {/* Data points */}
              {radarPoints.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x} cy={p.y} r="4"
                  fill={KPI_ITEMS[i].color}
                  className="transition-all duration-300"
                  style={{ filter: `drop-shadow(0 0 4px ${KPI_ITEMS[i].color})` }}
                />
              ))}

              {/* Labels */}
              {KPI_ITEMS.map((kpi, i) => {
                const p = getRadarPoint(i, 120)
                return (
                  <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="14">
                    {kpi.icon}
                  </text>
                )
              })}
            </svg>
          </div>

          {/* KPI sliders */}
          <div className="flex-1 space-y-3 w-full">
            {KPI_ITEMS.map(kpi => (
              <div key={kpi.key} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">{kpi.icon} {t(kpi.labelKey)}</span>
                  <span className="font-bold" style={{ color: kpi.color, textShadow: `0 0 8px ${kpi.color}40` }}>
                    {kpis[kpi.key]}%
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="range" min={10} max={100} value={kpis[kpi.key]}
                    onChange={e => setKpis(prev => ({ ...prev, [kpi.key]: Number(e.target.value) }))}
                    disabled={submitted}
                    className="w-full appearance-none h-2 rounded-full bg-gray-800 outline-none"
                    style={{
                      background: `linear-gradient(to right, ${kpi.color} ${kpis[kpi.key]}%, #1e293b ${kpis[kpi.key]}%)`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Budget Section with animated bars */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <p className="text-sm font-medium text-gray-300">{t('monthlyBudget')}</p>
          <div className={clsx(
            'text-sm font-bold px-3 py-1 rounded-lg border transition-all duration-300',
            budgetTotal <= totalBudget
              ? 'border-green-500/30 bg-green-900/20 text-green-400'
              : 'border-red-500/30 bg-red-900/20 text-red-400 animate-isoPulse'
          )} style={{
            boxShadow: budgetTotal <= totalBudget
              ? '0 0 10px rgba(52,211,153,0.15)'
              : '0 0 10px rgba(248,113,113,0.15)',
          }}>
            ${budgetTotal.toLocaleString()} / ${totalBudget.toLocaleString()}
          </div>
        </div>

        {/* Stacked bar visualization */}
        <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-700/30">
          <div className="h-8 rounded-lg overflow-hidden flex mb-3" style={{ background: '#0f172a' }}>
            {BUDGET_ITEMS.map(item => {
              const pct = (budget[item.key] / totalBudget) * 100
              return (
                <div
                  key={item.key}
                  className="h-full transition-all duration-500 flex items-center justify-center text-[10px] font-bold text-white/80 overflow-hidden"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(135deg, ${item.color}cc, ${item.color}88)`,
                    boxShadow: `inset 0 0 10px ${item.color}40`,
                    minWidth: pct > 0 ? 2 : 0,
                  }}
                >
                  {pct >= 12 ? `${Math.round(pct)}%` : ''}
                </div>
              )
            })}
            {/* Remaining budget */}
            {budgetTotal < totalBudget && (
              <div
                className="h-full flex items-center justify-center text-[10px] text-gray-600"
                style={{ width: `${((totalBudget - budgetTotal) / totalBudget) * 100}%` }}
              />
            )}
          </div>

          {/* Individual budget sliders */}
          {BUDGET_ITEMS.map(item => {
            const pct = budget[item.key] / totalBudget
            const isOptimal = pct >= item.optimal
            return (
              <div key={item.key} className="space-y-1 mb-3 last:mb-0">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300 flex items-center gap-1.5">
                    {item.icon} {t(item.labelKey)}
                    {isOptimal && (
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-isoPulse inline-block"
                        style={{ boxShadow: '0 0 6px rgba(52,211,153,0.6)' }}
                      />
                    )}
                  </span>
                  <span className="font-bold transition-all duration-300" style={{
                    color: isOptimal ? '#34d399' : item.color,
                    textShadow: isOptimal ? '0 0 8px rgba(52,211,153,0.4)' : 'none',
                  }}>
                    ${budget[item.key].toLocaleString()}
                  </span>
                </div>
                <input
                  type="range" min={0} max={30000} step={1000}
                  value={budget[item.key]}
                  onChange={e => setBudget(prev => ({ ...prev, [item.key]: Number(e.target.value) }))}
                  disabled={submitted}
                  className="w-full appearance-none h-2 rounded-full bg-gray-800 outline-none"
                  style={{
                    background: `linear-gradient(to right, ${isOptimal ? '#34d399' : item.color} ${(budget[item.key] / 30000) * 100}%, #1e293b ${(budget[item.key] / 30000) * 100}%)`,
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>

      {!submitted ? (
        <button onClick={submit} disabled={budgetTotal > totalBudget}
          className={clsx(
            'w-full py-3 font-bold rounded-xl transition-all duration-300',
            budgetTotal <= totalBudget
              ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:scale-[1.02]'
              : 'bg-gray-800 text-gray-500 opacity-40 cursor-not-allowed'
          )}>
          {t('submit')}
        </button>
      ) : (
        <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-500/30 rounded-xl p-4 text-center animate-fadeInScale">
          <p className="text-green-400 font-bold text-lg">{t('submitted')}</p>
        </div>
      )}
    </div>
  )
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function CoopSmartDistrict({ role, onComplete }: Props) {
  const handleComplete = (score: number, data: Record<string, unknown>) => {
    onComplete(score, data)
  }

  const taskContent = (() => {
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
  })()

  return (
    <>
      <style jsx global>{`
        @keyframes isoPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes isoFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes recBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
        @keyframes coverageExpand {
          0% { transform: scale(0.7); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeInScale {
          0% { transform: scale(0.9); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes robotDeploy {
          0% { transform: scale(1); }
          30% { transform: scale(0.95) rotate(-2deg); }
          60% { transform: scale(1.05) rotate(1deg); }
          100% { transform: scale(1) rotate(0); }
        }
        @keyframes robotLand {
          0% { transform: translateY(-20px) scale(0.5); opacity: 0; }
          60% { transform: translateY(3px) scale(1.1); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes celebrationParticle {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          50% { opacity: 0.8; }
          100% { transform: translateY(-80px) scale(0); opacity: 0; }
        }
        @keyframes celebrationPop {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.4); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }

        .animate-isoPulse { animation: isoPulse 2s ease-in-out infinite; }
        .animate-isoFloat { animation: isoFloat 3s ease-in-out infinite; }
        .animate-recBlink { animation: recBlink 1s ease-in-out infinite; }
        .animate-coverageExpand { animation: coverageExpand 0.5s ease-out forwards; }
        .animate-fadeInScale { animation: fadeInScale 0.4s ease-out forwards; }
        .animate-fadeIn { animation: fadeIn 0.6s ease-out forwards; }
        .animate-robotDeploy { animation: robotDeploy 0.5s ease-out; }
        .animate-robotLand { animation: robotLand 0.6s ease-out forwards; }
        .animate-celebrationParticle { animation: celebrationParticle 1.5s ease-out forwards; }
        .animate-celebrationPop { animation: celebrationPop 0.6s ease-out forwards; }

        /* Custom range slider styling */
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 0 6px rgba(255,255,255,0.3);
          border: 2px solid rgba(255,255,255,0.2);
        }
        input[type="range"]::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 0 6px rgba(255,255,255,0.3);
          border: 2px solid rgba(255,255,255,0.2);
        }
      `}</style>
      {taskContent}
    </>
  )
}
