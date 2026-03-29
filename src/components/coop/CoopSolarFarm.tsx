'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import clsx from 'clsx'

interface Props {
  role: string
  onComplete: (score: number, resultData: Record<string, unknown>) => void
  otherResults?: Record<string, unknown>[]
}

// Generate a 6x6 grid with random elevation values (1-10)
function generateTerrain(seed: number): number[][] {
  const grid: number[][] = []
  let val = seed
  for (let r = 0; r < 6; r++) {
    const row: number[] = []
    for (let c = 0; c < 6; c++) {
      val = (val * 1103515245 + 12345) & 0x7fffffff
      row.push((val % 10) + 1)
    }
    grid.push(row)
  }
  return grid
}

// Confetti particle component
function ConfettiOverlay() {
  const colors = ['#4ade80', '#3b82f6', '#f59e0b', '#ef4444', '#a78bfa', '#22d3ee']
  const particles = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 1.5 + Math.random() * 2,
      color: colors[i % colors.length],
      size: 4 + Math.random() * 6,
      rotation: Math.random() * 360,
    }))
  , [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute confetti-fall"
          style={{
            left: `${p.x}%`,
            top: '-10px',
            width: `${p.size}px`,
            height: `${p.size * 0.6}px`,
            backgroundColor: p.color,
            borderRadius: '1px',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  )
}

// --- DRONE TASK: Scan grid, find 3 flattest cells ---
function DroneTask({ onComplete }: { onComplete: (score: number, data: Record<string, unknown>) => void }) {
  const t = useTranslations('coopMissions.solarFarm.drone')
  const terrain = useMemo(() => generateTerrain(42), [])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [submitted, setSubmitted] = useState(false)
  const [hoveredCell, setHoveredCell] = useState<string | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)

  // Find the actual 3 flattest (lowest elevation) cells
  const allCells = terrain.flatMap((row, r) => row.map((val, c) => ({ r, c, val })))
  const sortedCells = [...allCells].sort((a, b) => a.val - b.val)
  const bestThree = new Set(sortedCells.slice(0, 3).map(c => `${c.r},${c.c}`))

  function toggleCell(r: number, c: number) {
    if (submitted) return
    const key = `${r},${c}`
    const next = new Set(selected)
    if (next.has(key)) {
      next.delete(key)
    } else if (next.size < 3) {
      next.add(key)
    }
    setSelected(next)
  }

  function submit() {
    if (selected.size !== 3) return
    setSubmitted(true)
    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), 4000)

    // Score: how many of the selected are in the best 3
    let correct = 0
    selected.forEach(key => {
      if (bestThree.has(key)) correct++
    })

    // Also score based on how low the selected elevations are
    const selectedElevations = Array.from(selected).map(key => {
      const [r, c] = key.split(',').map(Number)
      return terrain[r][c]
    })
    const avgElevation = selectedElevations.reduce((a, b) => a + b, 0) / 3
    const elevationScore = Math.max(0, Math.round((10 - avgElevation) / 9 * 500))
    const correctScore = correct * 167 // max 501 for 3 correct
    const score = Math.min(1000, correctScore + elevationScore)

    const coords = Array.from(selected).map(key => {
      const [r, c] = key.split(',').map(Number)
      return { row: r, col: c, elevation: terrain[r][c] }
    })

    onComplete(score, { selectedCoords: coords, terrainData: terrain })
  }

  return (
    <div className="space-y-4 relative">
      {showConfetti && <ConfettiOverlay />}
      <div>
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-400 pulse-glow-blue" />
          {t('title')}
        </h3>
        <p className="text-gray-400 text-sm mt-1">{t('desc')}</p>
      </div>

      {/* 2.5D Isometric Grid */}
      <div className="bg-[var(--brand-dark)] rounded-xl p-6 overflow-hidden">
        <div className="flex justify-center">
          <div
            className="relative max-w-[280px] sm:max-w-xs mx-auto"
            style={{
              perspective: '800px',
              perspectiveOrigin: '50% 50%',
            }}
          >
            <div
              className="grid grid-cols-6 gap-0"
              style={{
                transform: 'perspective(800px) rotateX(55deg) rotateZ(45deg)',
                transformStyle: 'preserve-3d',
              }}
            >
              {terrain.map((row, r) =>
                row.map((val, c) => {
                  const key = `${r},${c}`
                  const isSelected = selected.has(key)
                  const isBest = submitted && bestThree.has(key)
                  const isHovered = hoveredCell === key
                  // Height based on elevation
                  const height = val * 3
                  // Color based on elevation
                  const hue = val <= 3 ? 140 : val <= 6 ? 45 : 0
                  const sat = val <= 3 ? 60 : val <= 6 ? 70 : 65
                  const light = val <= 3 ? 45 : val <= 6 ? 50 : 45

                  return (
                    <button
                      key={key}
                      onClick={() => toggleCell(r, c)}
                      onMouseEnter={() => setHoveredCell(key)}
                      onMouseLeave={() => setHoveredCell(null)}
                      disabled={submitted}
                      className={clsx(
                        'relative transition-all duration-300',
                        !submitted && 'cursor-pointer',
                        submitted && 'cursor-default',
                        isSelected && 'z-10',
                      )}
                      style={{
                        width: '48px',
                        height: '48px',
                        transform: `translateZ(${height}px)${isHovered && !submitted ? ' translateZ(8px) scale(1.1)' : ''}${isSelected ? ' translateZ(5px)' : ''}`,
                        transformStyle: 'preserve-3d',
                        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                      }}
                    >
                      {/* Top face */}
                      <div
                        className={clsx(
                          'absolute inset-0 rounded-sm border transition-all duration-300',
                          isSelected && 'iso-cell-selected',
                          isBest && !isSelected && 'iso-cell-best',
                        )}
                        style={{
                          backgroundColor: `hsla(${hue}, ${sat}%, ${light}%, 0.7)`,
                          borderColor: isSelected
                            ? 'var(--brand-blue)'
                            : isBest
                            ? '#4ade80'
                            : `hsla(${hue}, ${sat}%, ${light - 15}%, 0.5)`,
                          borderWidth: isSelected || isBest ? '2px' : '1px',
                          boxShadow: isSelected
                            ? '0 0 15px rgba(59,130,246,0.6), inset 0 0 10px rgba(59,130,246,0.2)'
                            : isBest
                            ? '0 0 12px rgba(74,222,128,0.5)'
                            : isHovered && !submitted
                            ? '0 0 10px rgba(255,255,255,0.2)'
                            : 'none',
                        }}
                      >
                        {/* Elevation value */}
                        <span
                          className="absolute inset-0 flex items-center justify-center text-xs font-bold"
                          style={{
                            color: val <= 3 ? '#4ade80' : val <= 6 ? '#fbbf24' : '#f87171',
                            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                          }}
                        >
                          {val}
                        </span>

                        {/* Selection checkmark */}
                        {submitted && isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center check-pop">
                            <span className="text-green-400 text-lg font-bold drop-shadow-lg">✓</span>
                          </div>
                        )}

                        {/* Best indicator when not selected */}
                        {submitted && isBest && !isSelected && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full pulse-glow-green" />
                        )}
                      </div>

                      {/* Side face (right) - 3D extrusion */}
                      <div
                        className="absolute rounded-sm"
                        style={{
                          bottom: '-' + Math.min(height, 20) + 'px',
                          left: '0',
                          width: '100%',
                          height: Math.min(height, 20) + 'px',
                          backgroundColor: `hsla(${hue}, ${sat}%, ${light - 20}%, 0.5)`,
                          transformOrigin: 'top',
                          borderBottomLeftRadius: '2px',
                          borderBottomRightRadius: '2px',
                        }}
                      />
                    </button>
                  )
                })
              )}
            </div>

            {/* Scanning line animation */}
            {!submitted && (
              <div
                className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-40 pointer-events-none scan-line"
                style={{
                  top: '50%',
                  transform: 'perspective(800px) rotateX(55deg) rotateZ(45deg)',
                }}
              />
            )}
          </div>
        </div>

        <div className="flex justify-center gap-4 mt-6 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsla(140, 60%, 45%, 0.7)' }} />
            1-3 = {t('flat')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsla(45, 70%, 50%, 0.7)' }} />
            4-6 = {t('moderate')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsla(0, 65%, 45%, 0.7)' }} />
            7-10 = {t('steep')}
          </span>
        </div>
      </div>

      <p className="text-sm text-gray-300 flex items-center gap-2">
        <span className="text-blue-400 font-bold">{selected.size}</span>/3 {t('selected')}
        {selected.size === 3 && !submitted && (
          <span className="text-green-400 text-xs pulse-text">{t('ready')}</span>
        )}
      </p>

      {!submitted ? (
        <button
          onClick={submit}
          disabled={selected.size !== 3}
          className="w-full py-3 bg-[var(--brand-blue)] text-white font-bold rounded-xl disabled:opacity-40 hover:opacity-90 transition-all hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98]"
        >
          {t('submit')}
        </button>
      ) : (
        <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 text-center success-fade-in">
          <p className="text-green-400 font-bold text-lg">{t('submitted')}</p>
        </div>
      )}
    </div>
  )
}

// --- ROBOT TASK: Select chassis type and configure weight ---
function RobotTask({ onComplete }: { onComplete: (score: number, data: Record<string, unknown>) => void }) {
  const t = useTranslations('coopMissions.solarFarm.robot')
  const [chassis, setChassis] = useState<string>('')
  const [panelCount, setPanelCount] = useState(3)
  const [submitted, setSubmitted] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  const CHASSIS_OPTIONS = [
    { id: 'wheeled', labelKey: 'wheeled', terrain: 'flat', capacity: 100, icon: '🛞' },
    { id: 'tracked', labelKey: 'tracked', terrain: 'mixed', capacity: 80, icon: '⛓️' },
    { id: 'legged', labelKey: 'legged', terrain: 'rough', capacity: 60, icon: '🦿' },
  ]

  // Best answer: wheeled (flat terrain from drone task), max panels within capacity
  // Each panel = 20kg, wheeled can carry 100kg = 5 panels max
  const selectedChassis = CHASSIS_OPTIONS.find(c => c.id === chassis)
  const maxPanels = selectedChassis ? Math.floor(selectedChassis.capacity / 20) : 0
  const overweight = panelCount > maxPanels
  const weightPercent = selectedChassis ? (panelCount * 20) / selectedChassis.capacity * 100 : 0

  function submit() {
    if (!chassis || overweight) return
    setSubmitted(true)
    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), 4000)

    // Score: wheeled is best for flat terrain (500 pts), panel count efficiency
    let chassisScore = 0
    if (chassis === 'wheeled') chassisScore = 500
    else if (chassis === 'tracked') chassisScore = 300
    else chassisScore = 150

    // More panels = more energy = better (max 5 for wheeled)
    const panelScore = Math.round((panelCount / 5) * 500)
    const score = Math.min(1000, chassisScore + panelScore)

    onComplete(score, {
      chassis,
      panelCount,
      totalWeight: panelCount * 20,
      capacity: selectedChassis?.capacity,
    })
  }

  return (
    <div className="space-y-4 relative">
      {showConfetti && <ConfettiOverlay />}
      <div>
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-purple-400 pulse-glow-purple" />
          {t('title')}
        </h3>
        <p className="text-gray-400 text-sm mt-1">{t('desc')}</p>
      </div>

      {/* Robot visual preview */}
      <div className="bg-[var(--brand-dark)] rounded-xl p-5 flex justify-center">
        <div className="relative w-[160px] sm:w-[200px]" style={{ height: '160px' }}>
          {/* Ground/platform */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2"
            style={{
              width: '160px',
              height: '20px',
              background: 'linear-gradient(to bottom, #374151, #1f2937)',
              borderRadius: '4px',
              transform: 'perspective(400px) rotateX(20deg) translateX(-50%)',
              left: '50%',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            }}
          />

          {/* Robot body */}
          <div
            className={clsx(
              'absolute left-1/2 -translate-x-1/2 transition-all duration-500',
              chassis ? 'robot-hover' : 'opacity-30'
            )}
            style={{
              bottom: '25px',
              width: '100px',
              height: '70px',
            }}
          >
            {/* Main chassis body */}
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-lg transition-all duration-500"
              style={{
                width: '80px',
                height: '45px',
                background: chassis === 'wheeled'
                  ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
                  : chassis === 'tracked'
                  ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)'
                  : chassis === 'legged'
                  ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                  : 'linear-gradient(135deg, #374151, #1f2937)',
                boxShadow: chassis
                  ? `0 4px 20px ${chassis === 'wheeled' ? 'rgba(59,130,246,0.4)' : chassis === 'tracked' ? 'rgba(139,92,246,0.4)' : 'rgba(245,158,11,0.4)'}`
                  : 'none',
                borderRadius: '8px',
              }}
            >
              {/* Eyes / sensors */}
              <div className="absolute top-2 left-3 w-3 h-3 bg-white/80 rounded-full robot-blink" />
              <div className="absolute top-2 right-3 w-3 h-3 bg-white/80 rounded-full robot-blink" style={{ animationDelay: '0.1s' }} />

              {/* Panel rack on top */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-0.5">
                {Array.from({ length: Math.min(panelCount, 7) }, (_, i) => (
                  <div
                    key={i}
                    className="panel-stack-in"
                    style={{
                      width: `${Math.max(6, 60 / Math.max(panelCount, 1))}px`,
                      height: '8px',
                      background: 'linear-gradient(to bottom, #0ea5e9, #0369a1)',
                      borderRadius: '1px',
                      boxShadow: '0 -2px 4px rgba(14,165,233,0.3)',
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Locomotion based on chassis type */}
            {chassis === 'wheeled' && (
              <>
                <div className="absolute -bottom-2 left-2 w-5 h-5 rounded-full border-2 border-gray-400 bg-gray-600 wheel-spin" />
                <div className="absolute -bottom-2 left-10 w-5 h-5 rounded-full border-2 border-gray-400 bg-gray-600 wheel-spin" />
                <div className="absolute -bottom-2 right-2 w-5 h-5 rounded-full border-2 border-gray-400 bg-gray-600 wheel-spin" />
                <div className="absolute -bottom-2 right-10 w-5 h-5 rounded-full border-2 border-gray-400 bg-gray-600 wheel-spin" />
              </>
            )}
            {chassis === 'tracked' && (
              <>
                <div className="absolute -bottom-3 left-0 rounded-md track-move" style={{
                  width: '30px', height: '8px',
                  background: 'repeating-linear-gradient(90deg, #4b5563 0px, #4b5563 4px, #374151 4px, #374151 8px)',
                  borderRadius: '3px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }} />
                <div className="absolute -bottom-3 right-0 rounded-md track-move" style={{
                  width: '30px', height: '8px',
                  background: 'repeating-linear-gradient(90deg, #4b5563 0px, #4b5563 4px, #374151 4px, #374151 8px)',
                  borderRadius: '3px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }} />
              </>
            )}
            {chassis === 'legged' && (
              <>
                <div className="absolute -bottom-4 left-3 w-1.5 rounded-b-full leg-walk" style={{ height: '12px', backgroundColor: '#d97706' }} />
                <div className="absolute -bottom-4 left-8 w-1.5 rounded-b-full leg-walk" style={{ height: '12px', backgroundColor: '#d97706', animationDelay: '0.3s' }} />
                <div className="absolute -bottom-4 right-3 w-1.5 rounded-b-full leg-walk" style={{ height: '12px', backgroundColor: '#d97706', animationDelay: '0.6s' }} />
                <div className="absolute -bottom-4 right-8 w-1.5 rounded-b-full leg-walk" style={{ height: '12px', backgroundColor: '#d97706', animationDelay: '0.9s' }} />
              </>
            )}
          </div>

          {/* Chassis label */}
          {chassis && (
            <div className="absolute top-1 left-1/2 -translate-x-1/2 text-xs font-bold text-gray-400 uppercase tracking-wider">
              {chassis}
            </div>
          )}
        </div>
      </div>

      {/* Chassis selection */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-300">{t('selectChassis')}</p>
        {CHASSIS_OPTIONS.map(opt => (
          <button
            key={opt.id}
            onClick={() => { setChassis(opt.id); if (!submitted) setPanelCount(Math.min(panelCount, Math.floor(opt.capacity / 20))) }}
            disabled={submitted}
            className={clsx(
              'w-full text-left p-4 rounded-xl border transition-all duration-300',
              chassis === opt.id
                ? 'border-[var(--brand-blue)] bg-blue-900/20 shadow-lg shadow-blue-500/10 scale-[1.02]'
                : 'border-[var(--brand-border)] bg-[var(--brand-dark)] hover:border-gray-500 hover:bg-gray-800/50'
            )}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{opt.icon}</span>
              <div className="flex-1">
                <p className="font-bold text-white text-sm">{t(opt.labelKey)}</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {t('bestFor')}: {t(`terrain_${opt.terrain}`)} | {t('capacity')}: {opt.capacity}kg
                </p>
              </div>
              {chassis === opt.id && (
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center check-pop">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Panel count with visual weight bar */}
      {chassis && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-300">
            {t('panelCount')} ({t('eachPanel')}: 20kg)
          </p>
          <input
            type="range"
            min={1}
            max={Math.max(1, maxPanels + 2)}
            value={panelCount}
            onChange={e => setPanelCount(Number(e.target.value))}
            disabled={submitted}
            className="w-full accent-blue-500"
          />

          {/* Visual weight indicator */}
          <div className="bg-[var(--brand-dark)] rounded-lg p-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
              <span>{panelCount} {t('panels')} ({panelCount * 20}kg)</span>
              <span>{selectedChassis?.capacity}kg max</span>
            </div>
            <div className="h-4 bg-gray-800 rounded-full overflow-hidden relative">
              <div
                className={clsx(
                  'h-full rounded-full transition-all duration-500 weight-bar-shine',
                  overweight
                    ? 'bg-gradient-to-r from-red-600 to-red-400'
                    : weightPercent > 80
                    ? 'bg-gradient-to-r from-yellow-600 to-yellow-400'
                    : 'bg-gradient-to-r from-green-600 to-green-400'
                )}
                style={{ width: `${Math.min(100, weightPercent)}%` }}
              />
              {/* Capacity line marker */}
              <div className="absolute top-0 bottom-0 w-0.5 bg-white/50" style={{ left: '100%', transform: 'translateX(-2px)' }} />
            </div>
            {overweight && (
              <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1 overweight-shake">
                <span>⚠️</span> {t('overweight')}
              </p>
            )}
          </div>
        </div>
      )}

      {!submitted ? (
        <button
          onClick={submit}
          disabled={!chassis || overweight}
          className="w-full py-3 bg-[var(--brand-blue)] text-white font-bold rounded-xl disabled:opacity-40 hover:opacity-90 transition-all hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98]"
        >
          {t('submit')}
        </button>
      ) : (
        <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 text-center success-fade-in">
          <p className="text-green-400 font-bold text-lg">{t('submitted')}</p>
        </div>
      )}
    </div>
  )
}

// --- ENTREPRENEUR TASK: Calculate price per kWh ---
function EntrepreneurTask({ onComplete }: { onComplete: (score: number, data: Record<string, unknown>) => void }) {
  const t = useTranslations('coopMissions.solarFarm.entrepreneur')
  const [pricePerKwh, setPricePerKwh] = useState(0.15)
  const [submitted, setSubmitted] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  // Given data
  const installationCost = 50000 // $50K
  const annualOutput = 120000 // 120,000 kWh per year
  const maintenanceCost = 5000 // $5K/year
  const targetYears = 10 // 10 year payback

  // Break-even price = (installationCost + maintenanceCost * years) / (annualOutput * years)
  const breakEvenPrice = (installationCost + maintenanceCost * targetYears) / (annualOutput * targetYears)
  // breakEvenPrice ~ $0.083/kWh

  const annualRevenue = annualOutput * pricePerKwh
  const annualProfit = annualRevenue - maintenanceCost
  const paybackYears = annualProfit > 0 ? installationCost / annualProfit : Infinity

  // Revenue chart data points (years 1-10)
  const chartYears = 10
  const chartData = useMemo(() => {
    const data = []
    let cumRevenue = 0
    let cumCost = installationCost
    for (let y = 1; y <= chartYears; y++) {
      cumRevenue += annualOutput * pricePerKwh
      cumCost += maintenanceCost
      data.push({ year: y, revenue: cumRevenue, cost: cumCost })
    }
    return data
  }, [pricePerKwh])

  const maxChartVal = Math.max(
    chartData[chartData.length - 1]?.revenue || 1,
    chartData[chartData.length - 1]?.cost || 1
  )

  function submit() {
    setSubmitted(true)
    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), 4000)

    // Score based on how close to optimal price (should be above break-even but competitive)
    // Optimal range: $0.10 - $0.15/kWh (profitable but competitive)
    let score = 0
    if (pricePerKwh < breakEvenPrice) {
      // Below break-even = not profitable
      score = Math.round(Math.max(0, (pricePerKwh / breakEvenPrice) * 300))
    } else if (pricePerKwh <= 0.15) {
      // Good range: profitable and competitive
      score = Math.round(700 + ((pricePerKwh - breakEvenPrice) / (0.15 - breakEvenPrice)) * 300)
    } else if (pricePerKwh <= 0.25) {
      // Too expensive but still somewhat reasonable
      score = Math.round(800 - ((pricePerKwh - 0.15) / 0.10) * 300)
    } else {
      score = Math.max(100, Math.round(500 - (pricePerKwh - 0.25) * 1000))
    }
    score = Math.min(1000, Math.max(0, score))

    onComplete(score, {
      pricePerKwh,
      annualRevenue: Math.round(annualRevenue),
      annualProfit: Math.round(annualProfit),
      paybackYears: Math.round(paybackYears * 10) / 10,
    })
  }

  return (
    <div className="space-y-4 relative">
      {showConfetti && <ConfettiOverlay />}

      {/* Floating dollar signs when profitable */}
      {annualProfit > 0 && !submitted && (
        <div className="absolute top-0 right-0 w-20 h-32 overflow-hidden pointer-events-none z-10">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="absolute text-green-400/60 font-bold dollar-float"
              style={{
                right: `${10 + i * 20}px`,
                fontSize: `${14 + i * 4}px`,
                animationDelay: `${i * 0.7}s`,
                animationDuration: `${2 + i * 0.5}s`,
              }}
            >
              $
            </div>
          ))}
        </div>
      )}

      <div>
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-green-400 pulse-glow-green" />
          {t('title')}
        </h3>
        <p className="text-gray-400 text-sm mt-1">{t('desc')}</p>
      </div>

      {/* Given info */}
      <div className="bg-[var(--brand-dark)] rounded-xl p-4 space-y-2 border border-gray-700/50">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('givenData')}</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-gray-400">{t('installCost')}:</div>
          <div className="text-white font-bold">${installationCost.toLocaleString()}</div>
          <div className="text-gray-400">{t('annualOutput')}:</div>
          <div className="text-white font-bold">{annualOutput.toLocaleString()} kWh</div>
          <div className="text-gray-400">{t('maintenance')}:</div>
          <div className="text-white font-bold">${maintenanceCost.toLocaleString()}/yr</div>
          <div className="text-gray-400">{t('targetPayback')}:</div>
          <div className="text-white font-bold">{targetYears} {t('years')}</div>
        </div>
      </div>

      {/* Price slider */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-300">{t('setPrice')}</p>
        <input
          type="range"
          min={0.03}
          max={0.30}
          step={0.01}
          value={pricePerKwh}
          onChange={e => setPricePerKwh(Number(e.target.value))}
          disabled={submitted}
          className="w-full accent-green-500"
        />
        <div className="text-center">
          <span
            className="text-3xl font-black text-white inline-block transition-all duration-300"
            style={{
              textShadow: annualProfit > 0
                ? '0 0 20px rgba(74,222,128,0.3)'
                : '0 0 20px rgba(248,113,113,0.3)',
            }}
          >
            ${pricePerKwh.toFixed(2)}/kWh
          </span>
          {pricePerKwh < breakEvenPrice && (
            <p className="text-red-400 text-xs mt-1">{t('belowBreakeven')}</p>
          )}
        </div>
      </div>

      {/* Animated Revenue Chart */}
      <div className="bg-[var(--brand-dark)] rounded-xl p-4 border border-gray-700/50">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">{t('projection')}</p>
        <div className="relative h-36 flex items-end gap-0.5">
          {chartData.map((d, i) => {
            const revHeight = (d.revenue / maxChartVal) * 100
            const costHeight = (d.cost / maxChartVal) * 100
            const isProfitable = d.revenue >= d.cost
            const isBreakevenYear = i > 0 && chartData[i - 1].revenue < chartData[i - 1].cost && isProfitable

            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5 relative">
                {/* Breakeven marker */}
                {isBreakevenYear && (
                  <div className="absolute -top-5 text-xs text-yellow-400 font-bold whitespace-nowrap breakeven-pop">
                    ★
                  </div>
                )}

                {/* Revenue bar */}
                <div className="w-full flex gap-px" style={{ height: `${Math.max(revHeight, 2)}%` }}>
                  <div
                    className="flex-1 rounded-t-sm transition-all duration-700 chart-bar-grow"
                    style={{
                      background: isProfitable
                        ? 'linear-gradient(to top, #059669, #34d399)'
                        : 'linear-gradient(to top, #dc2626, #f87171)',
                      animationDelay: `${i * 0.08}s`,
                    }}
                  />
                  <div
                    className="flex-1 rounded-t-sm transition-all duration-700 chart-bar-grow opacity-50"
                    style={{
                      background: 'linear-gradient(to top, #6b7280, #9ca3af)',
                      height: `${Math.max(costHeight, 2)}%`,
                      alignSelf: 'flex-end',
                      animationDelay: `${i * 0.08 + 0.04}s`,
                    }}
                  />
                </div>

                {/* Year label */}
                <span className="text-[9px] text-gray-600">{d.year}</span>
              </div>
            )
          })}
        </div>
        <div className="flex justify-center gap-4 mt-2 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-green-500" /> Revenue
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-gray-500" /> Cost
          </span>
        </div>
      </div>

      {/* Live calculations with gradient bars */}
      <div className="bg-[var(--brand-dark)] rounded-xl p-4 space-y-3 border border-gray-700/50">
        <div className="space-y-2">
          {/* Annual Revenue */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">{t('annualRevenue')}:</span>
              <span className="text-white font-bold">${Math.round(annualRevenue).toLocaleString()}</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-blue-600 to-blue-400"
                style={{ width: `${Math.min(100, (annualRevenue / 40000) * 100)}%` }}
              />
            </div>
          </div>

          {/* Annual Profit */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">{t('annualProfit')}:</span>
              <span className={clsx('font-bold', annualProfit > 0 ? 'text-green-400' : 'text-red-400')}>
                ${Math.round(annualProfit).toLocaleString()}
              </span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={clsx(
                  'h-full rounded-full transition-all duration-500',
                  annualProfit > 0
                    ? 'bg-gradient-to-r from-green-600 to-green-400'
                    : 'bg-gradient-to-r from-red-600 to-red-400'
                )}
                style={{ width: `${Math.min(100, Math.abs(annualProfit) / 30000 * 100)}%` }}
              />
            </div>
          </div>

          {/* Payback */}
          <div className="flex justify-between text-sm pt-1 border-t border-gray-700/50">
            <span className="text-gray-400">{t('payback')}:</span>
            <span className={clsx('font-bold', paybackYears <= targetYears ? 'text-green-400' : 'text-yellow-400')}>
              {paybackYears === Infinity ? '---' : `${Math.round(paybackYears * 10) / 10} ${t('years')}`}
              {paybackYears <= targetYears && paybackYears !== Infinity && ' ✓'}
            </span>
          </div>
        </div>
      </div>

      {!submitted ? (
        <button
          onClick={submit}
          disabled={submitted}
          className="w-full py-3 bg-[var(--brand-blue)] text-white font-bold rounded-xl disabled:opacity-40 hover:opacity-90 transition-all hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98]"
        >
          {t('submit')}
        </button>
      ) : (
        <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 text-center success-fade-in">
          <p className="text-green-400 font-bold text-lg">{t('submitted')}</p>
        </div>
      )}
    </div>
  )
}

// --- Main component: picks the right sub-task based on role ---
export default function CoopSolarFarm({ role, onComplete }: Props) {
  const handleComplete = (score: number, data: Record<string, unknown>) => {
    onComplete(score, data)
  }

  return (
    <>
      {role === 'drone_programmer' && <DroneTask onComplete={handleComplete} />}
      {role === 'robot_constructor' && <RobotTask onComplete={handleComplete} />}
      {role === 'entrepreneur' && <EntrepreneurTask onComplete={handleComplete} />}
      {!['drone_programmer', 'robot_constructor', 'entrepreneur'].includes(role) && (
        <DroneTask onComplete={handleComplete} />
      )}

      {/* Global CSS animations */}
      <style jsx global>{`
        /* Confetti falling */
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(400px) rotate(720deg); opacity: 0; }
        }
        .confetti-fall {
          animation: confettiFall 3s ease-in forwards;
        }

        /* Pulse glow effects */
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 4px currentColor; opacity: 1; }
          50% { box-shadow: 0 0 12px currentColor; opacity: 0.7; }
        }
        .pulse-glow-blue { animation: pulseGlow 2s ease-in-out infinite; color: #60a5fa; }
        .pulse-glow-green { animation: pulseGlow 2s ease-in-out infinite; color: #4ade80; }
        .pulse-glow-purple { animation: pulseGlow 2s ease-in-out infinite; color: #a78bfa; }

        /* Iso cell selected glow */
        .iso-cell-selected {
          animation: cellPulse 1.5s ease-in-out infinite;
        }
        @keyframes cellPulse {
          0%, 100% { box-shadow: 0 0 10px rgba(59,130,246,0.4); }
          50% { box-shadow: 0 0 20px rgba(59,130,246,0.7), inset 0 0 10px rgba(59,130,246,0.2); }
        }

        .iso-cell-best {
          animation: bestPulse 1.5s ease-in-out infinite;
        }
        @keyframes bestPulse {
          0%, 100% { box-shadow: 0 0 8px rgba(74,222,128,0.3); }
          50% { box-shadow: 0 0 16px rgba(74,222,128,0.6); }
        }

        /* Checkmark pop-in */
        @keyframes checkPop {
          0% { transform: scale(0) rotate(-45deg); opacity: 0; }
          50% { transform: scale(1.3) rotate(5deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .check-pop { animation: checkPop 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards; }

        /* Scan line */
        @keyframes scanLine {
          0% { top: 10%; opacity: 0; }
          10% { opacity: 0.5; }
          90% { opacity: 0.5; }
          100% { top: 90%; opacity: 0; }
        }
        .scan-line { animation: scanLine 3s ease-in-out infinite; }

        /* Pulsing text */
        @keyframes pulseText {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .pulse-text { animation: pulseText 1s ease-in-out infinite; }

        /* Success fade in */
        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .success-fade-in { animation: fadeInUp 0.5s ease-out forwards; }

        /* Robot hover (floating) */
        @keyframes robotHover {
          0%, 100% { transform: translateY(0px) translateX(-50%); }
          50% { transform: translateY(-4px) translateX(-50%); }
        }
        .robot-hover { animation: robotHover 2s ease-in-out infinite; }

        /* Robot blink */
        @keyframes robotBlink {
          0%, 90%, 100% { opacity: 1; }
          95% { opacity: 0.1; }
        }
        .robot-blink { animation: robotBlink 3s ease-in-out infinite; }

        /* Wheel spin */
        @keyframes wheelSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .wheel-spin { animation: wheelSpin 1s linear infinite; }

        /* Track movement */
        @keyframes trackMove {
          0% { background-position: 0 0; }
          100% { background-position: 8px 0; }
        }
        .track-move { animation: trackMove 0.5s linear infinite; }

        /* Leg walking */
        @keyframes legWalk {
          0%, 100% { height: 12px; transform: translateY(0); }
          50% { height: 8px; transform: translateY(4px); }
        }
        .leg-walk { animation: legWalk 0.6s ease-in-out infinite; }

        /* Panel stack-in */
        @keyframes panelStackIn {
          0% { transform: translateY(-10px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .panel-stack-in { animation: panelStackIn 0.4s ease-out forwards; }

        /* Weight bar shine */
        @keyframes weightShine {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .weight-bar-shine {
          background-size: 200% 100%;
          animation: weightShine 3s ease-in-out infinite;
        }

        /* Overweight shake */
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-3px); }
          40% { transform: translateX(3px); }
          60% { transform: translateX(-2px); }
          80% { transform: translateX(2px); }
        }
        .overweight-shake { animation: shake 0.5s ease-in-out; }

        /* Dollar float */
        @keyframes dollarFloat {
          0% { transform: translateY(100px); opacity: 0; }
          20% { opacity: 0.8; }
          100% { transform: translateY(-20px); opacity: 0; }
        }
        .dollar-float { animation: dollarFloat 2.5s ease-out infinite; }

        /* Chart bar grow */
        @keyframes chartBarGrow {
          0% { transform: scaleY(0); transform-origin: bottom; }
          100% { transform: scaleY(1); transform-origin: bottom; }
        }
        .chart-bar-grow {
          animation: chartBarGrow 0.6s ease-out forwards;
          transform-origin: bottom;
        }

        /* Breakeven pop */
        @keyframes breakevenPop {
          0% { transform: scale(0); }
          50% { transform: scale(1.5); }
          100% { transform: scale(1); }
        }
        .breakeven-pop { animation: breakevenPop 0.6s ease-out forwards; }
      `}</style>
    </>
  )
}
