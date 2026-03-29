'use client'

import { useState, useMemo, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import clsx from 'clsx'

interface Props {
  role: string
  onComplete: (score: number, resultData: Record<string, unknown>) => void
  otherResults?: Record<string, unknown>[]
}

// Generate 5 random survivor positions on an 8x8 grid
function generateSurvivors(seed: number) {
  const survivors: { row: number; col: number; severity: 'low' | 'medium' | 'critical' }[] = []
  let val = seed
  const used = new Set<string>()
  const severities: ('low' | 'medium' | 'critical')[] = ['low', 'medium', 'critical', 'medium', 'critical']

  while (survivors.length < 5) {
    val = (val * 1103515245 + 12345) & 0x7fffffff
    const r = val % 8
    val = (val * 1103515245 + 12345) & 0x7fffffff
    const c = val % 8
    const key = `${r},${c}`
    if (!used.has(key)) {
      used.add(key)
      survivors.push({ row: r, col: c, severity: severities[survivors.length] })
    }
  }
  return survivors
}

/* ═══════════════════════════════════════════════════════════════
   SHARED ANIMATIONS — injected once via <style> tag
   ═══════════════════════════════════════════════════════════════ */
const sharedStyles = `
@keyframes cr-pulse-glow {
  0%, 100% { box-shadow: 0 0 8px rgba(239,68,68,0.3); }
  50% { box-shadow: 0 0 20px rgba(239,68,68,0.7); }
}
@keyframes cr-pulse-warm {
  0%, 100% { box-shadow: 0 0 6px rgba(251,191,36,0.2); }
  50% { box-shadow: 0 0 14px rgba(251,191,36,0.5); }
}
@keyframes cr-radar-scan {
  0% { transform: scale(0.3); opacity: 1; }
  100% { transform: scale(2.2); opacity: 0; }
}
@keyframes cr-heat-wave {
  0% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.25); opacity: 0.3; }
  100% { transform: scale(1); opacity: 0.6; }
}
@keyframes cr-float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-6px); }
}
@keyframes cr-fly-in {
  0% { transform: translateX(-40px) scale(0.5); opacity: 0; }
  60% { transform: translateX(4px) scale(1.05); opacity: 1; }
  100% { transform: translateX(0) scale(1); opacity: 1; }
}
@keyframes cr-draw-line {
  0% { width: 0; }
  100% { width: 100%; }
}
@keyframes cr-glow-green {
  0%, 100% { box-shadow: 0 0 8px rgba(34,197,94,0.3); }
  50% { box-shadow: 0 0 20px rgba(34,197,94,0.8); }
}
@keyframes cr-glow-red {
  0%, 100% { box-shadow: 0 0 8px rgba(239,68,68,0.3); }
  50% { box-shadow: 0 0 20px rgba(239,68,68,0.8); }
}
@keyframes cr-severity-critical {
  0%, 100% { box-shadow: 0 0 6px rgba(239,68,68,0.3), inset 0 0 8px rgba(239,68,68,0.1); }
  50% { box-shadow: 0 0 18px rgba(239,68,68,0.6), inset 0 0 12px rgba(239,68,68,0.2); }
}
@keyframes cr-severity-medium {
  0%, 100% { box-shadow: 0 0 4px rgba(234,179,8,0.2); }
  50% { box-shadow: 0 0 12px rgba(234,179,8,0.5); }
}
@keyframes cr-money-flow {
  0% { transform: translateY(-10px); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: translateY(10px); opacity: 0; }
}
@keyframes cr-compass-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes cr-compass-settle {
  0% { transform: rotate(0deg); }
  30% { transform: rotate(45deg); }
  60% { transform: rotate(-15deg); }
  100% { transform: rotate(0deg); }
}
@keyframes cr-celebrate {
  0% { transform: scale(1); }
  25% { transform: scale(1.05); }
  50% { transform: scale(0.97); }
  100% { transform: scale(1); }
}
@keyframes cr-confetti-fall {
  0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
  100% { transform: translateY(60px) rotate(720deg); opacity: 0; }
}
@keyframes cr-sparkle {
  0%, 100% { opacity: 0; transform: scale(0); }
  50% { opacity: 1; transform: scale(1); }
}
@keyframes cr-scan-sweep {
  0% { left: -20%; }
  100% { left: 120%; }
}
@keyframes cr-survivor-found {
  0% { transform: scale(0.5); opacity: 0; }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes cr-water-wave {
  0%, 100% { transform: translateX(0) scaleY(1); }
  25% { transform: translateX(2px) scaleY(1.1); }
  50% { transform: translateX(0) scaleY(0.9); }
  75% { transform: translateX(-2px) scaleY(1.1); }
}
@keyframes cr-fire-flicker {
  0%, 100% { transform: scaleY(1) scaleX(1); }
  25% { transform: scaleY(1.1) scaleX(0.95); }
  50% { transform: scaleY(0.95) scaleX(1.05); }
  75% { transform: scaleY(1.05) scaleX(0.9); }
}
@keyframes cr-debris-shake {
  0%, 100% { transform: translateX(0) rotate(0deg); }
  25% { transform: translateX(1px) rotate(1deg); }
  50% { transform: translateX(-1px) rotate(-1deg); }
  75% { transform: translateX(1px) rotate(0.5deg); }
}
`

// --- DRONE TASK: Scan 8x8 grid for 5 survivors ---
function DroneTask({ onComplete }: { onComplete: (score: number, data: Record<string, unknown>) => void }) {
  const t = useTranslations('coopMissions.rescue.drone')
  const survivors = useMemo(() => generateSurvivors(99), [])
  const [found, setFound] = useState<Set<string>>(new Set())
  const [scansLeft, setScansLeft] = useState(15)
  const [submitted, setSubmitted] = useState(false)
  const [scanning, setScanning] = useState<string | null>(null)
  const [recentFound, setRecentFound] = useState<string | null>(null)

  function scanCell(r: number, c: number) {
    if (submitted || scansLeft <= 0) return
    setScansLeft(prev => prev - 1)

    const key = `${r},${c}`
    setScanning(key)
    setTimeout(() => setScanning(null), 600)

    const isSurvivor = survivors.some(s => s.row === r && s.col === c)
    if (isSurvivor) {
      setFound(prev => { const a = Array.from(prev); a.push(key); return new Set(a) })
      setRecentFound(key)
      setTimeout(() => setRecentFound(null), 800)
    }
  }

  function getHeatLevel(r: number, c: number): number {
    let minDist = Infinity
    for (const s of survivors) {
      const dist = Math.abs(s.row - r) + Math.abs(s.col - c)
      if (dist < minDist) minDist = dist
    }
    if (minDist === 0) return 3
    if (minDist <= 1) return 2
    if (minDist <= 2) return 1
    return 0
  }

  function submit() {
    setSubmitted(true)
    const foundCount = found.size
    const score = Math.min(1000, Math.round((foundCount / 5) * 800 + Math.max(0, scansLeft) * 13))

    const foundSurvivors = survivors.filter(s => found.has(`${s.row},${s.col}`))
    onComplete(score, {
      foundCount,
      totalSurvivors: 5,
      scansUsed: 15 - scansLeft,
      survivors: foundSurvivors,
    })
  }

  return (
    <div className="space-y-4">
      <style>{sharedStyles}</style>

      {/* Header with floating effect */}
      <div style={{ animation: 'cr-float 3s ease-in-out infinite' }}>
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="text-2xl">📡</span> {t('title')}
        </h3>
        <p className="text-gray-400 text-sm mt-1">{t('desc')}</p>
      </div>

      {/* Status bar */}
      <div className="flex justify-between items-center text-sm bg-gray-900/60 rounded-xl px-4 py-2 border border-gray-700/50">
        <span className="text-gray-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500" style={{ animation: 'cr-pulse-glow 2s infinite' }} />
          {t('found')}: <span className="text-white font-bold">{found.size}/5</span>
        </span>
        <span className={clsx('font-bold flex items-center gap-2', scansLeft > 5 ? 'text-green-400' : scansLeft > 0 ? 'text-yellow-400' : 'text-red-400')}>
          <span className="relative w-4 h-4">
            <span className="absolute inset-0 rounded-full border-2 border-current opacity-50" style={{ animation: 'cr-radar-scan 2s infinite' }} />
          </span>
          {t('scansLeft')}: {scansLeft}
        </span>
      </div>

      {/* 8x8 Isometric Grid */}
      <div className="bg-gray-900/80 rounded-2xl p-6 border border-gray-700/30 overflow-hidden">
        <div className="flex justify-center max-w-[320px] sm:max-w-none mx-auto">
          <div
            style={{
              transform: 'perspective(600px) rotateX(35deg) rotateZ(-5deg)',
              transformStyle: 'preserve-3d',
            }}
          >
            <div className="grid grid-cols-8 gap-[3px]" style={{ filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))' }}>
              {Array.from({ length: 8 }, (_, r) =>
                Array.from({ length: 8 }, (_, c) => {
                  const key = `${r},${c}`
                  const isFound = found.has(key)
                  const isScanning = scanning === key
                  const isRecentFound = recentFound === key
                  const heat = getHeatLevel(r, c)

                  const heatBg = heat === 3
                    ? 'linear-gradient(135deg, rgba(239,68,68,0.5), rgba(220,38,38,0.6))'
                    : heat === 2
                      ? 'linear-gradient(135deg, rgba(249,115,22,0.35), rgba(234,88,12,0.45))'
                      : heat === 1
                        ? 'linear-gradient(135deg, rgba(234,179,8,0.2), rgba(202,138,4,0.3))'
                        : 'linear-gradient(135deg, rgba(55,65,81,0.4), rgba(31,41,55,0.6))'

                  const heatShadow = heat === 3
                    ? '0 0 12px rgba(239,68,68,0.4), inset 0 1px 2px rgba(255,255,255,0.1)'
                    : heat === 2
                      ? '0 0 8px rgba(249,115,22,0.3), inset 0 1px 2px rgba(255,255,255,0.08)'
                      : heat === 1
                        ? '0 0 5px rgba(234,179,8,0.2), inset 0 1px 2px rgba(255,255,255,0.05)'
                        : 'inset 0 1px 2px rgba(255,255,255,0.03)'

                  return (
                    <button
                      key={key}
                      onClick={() => scanCell(r, c)}
                      disabled={submitted || scansLeft <= 0}
                      className={clsx(
                        'relative w-9 h-9 sm:w-10 sm:h-10 rounded text-xs font-bold flex items-center justify-center transition-all duration-200',
                        !submitted && scansLeft > 0 && 'cursor-pointer hover:brightness-125 hover:scale-105'
                      )}
                      style={{
                        background: isFound
                          ? 'linear-gradient(135deg, rgba(239,68,68,0.5), rgba(185,28,28,0.6))'
                          : heatBg,
                        boxShadow: isFound
                          ? '0 0 16px rgba(239,68,68,0.5), inset 0 1px 2px rgba(255,255,255,0.15)'
                          : heatShadow,
                        border: isFound
                          ? '1px solid rgba(239,68,68,0.6)'
                          : heat > 0
                            ? '1px solid rgba(255,255,255,0.08)'
                            : '1px solid rgba(255,255,255,0.04)',
                        animation: isFound
                          ? 'cr-pulse-glow 2s infinite'
                          : heat >= 2
                            ? 'cr-heat-wave 3s ease-in-out infinite'
                            : undefined,
                        transformStyle: 'preserve-3d',
                        transform: 'translateZ(2px)',
                      }}
                    >
                      {/* Scan radar pulse */}
                      {isScanning && (
                        <span className="absolute inset-0 rounded border-2 border-cyan-400" style={{ animation: 'cr-radar-scan 0.6s ease-out forwards' }} />
                      )}

                      {/* Found survivor */}
                      {isFound && (
                        <span
                          className="text-base sm:text-lg"
                          style={{
                            animation: isRecentFound ? 'cr-survivor-found 0.5s ease-out' : 'cr-float 2s ease-in-out infinite',
                            filter: 'drop-shadow(0 0 6px rgba(239,68,68,0.8))',
                          }}
                        >
                          🆘
                        </span>
                      )}

                      {/* Heat shimmer for warm cells */}
                      {!isFound && heat >= 2 && (
                        <span
                          className="absolute inset-0 rounded opacity-30"
                          style={{
                            background: heat === 3
                              ? 'radial-gradient(circle, rgba(239,68,68,0.4), transparent 70%)'
                              : 'radial-gradient(circle, rgba(249,115,22,0.3), transparent 70%)',
                            animation: 'cr-heat-wave 2s ease-in-out infinite',
                          }}
                        />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-4 mt-5 text-xs text-gray-400">
          {[
            { bg: 'linear-gradient(135deg, rgba(239,68,68,0.5), rgba(220,38,38,0.6))', label: t('hot') },
            { bg: 'linear-gradient(135deg, rgba(249,115,22,0.35), rgba(234,88,12,0.45))', label: t('warm') },
            { bg: 'linear-gradient(135deg, rgba(234,179,8,0.2), rgba(202,138,4,0.3))', label: t('faint') },
          ].map((item, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded" style={{ background: item.bg, boxShadow: '0 0 4px rgba(0,0,0,0.3)' }} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {/* Scan sweep animation indicator */}
      {!submitted && scansLeft > 0 && (
        <div className="relative h-1 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="absolute h-full w-[20%] bg-gradient-to-r from-transparent via-cyan-400 to-transparent rounded-full"
            style={{ animation: 'cr-scan-sweep 3s linear infinite' }}
          />
        </div>
      )}

      {!submitted ? (
        <button onClick={submit} disabled={found.size === 0}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold rounded-xl disabled:opacity-40 hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg shadow-blue-900/30 active:scale-[0.98]">
          {t('submit')}
        </button>
      ) : (
        <div
          className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 text-center relative overflow-hidden"
          style={{ animation: 'cr-celebrate 0.5s ease-out' }}
        >
          {/* Confetti particles */}
          {[...Array(8)].map((_, i) => (
            <span
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                background: ['#34d399', '#60a5fa', '#f59e0b', '#ec4899', '#a78bfa'][i % 5],
                left: `${10 + i * 12}%`,
                top: '0',
                animation: `cr-confetti-fall ${1 + i * 0.15}s ease-in ${i * 0.1}s forwards`,
              }}
            />
          ))}
          <p className="text-green-400 font-bold text-lg">{t('submitted')}</p>
          <div className="flex justify-center gap-1 mt-2">
            {[...Array(5)].map((_, i) => (
              <span
                key={i}
                className="text-xl"
                style={{ animation: `cr-sparkle 0.8s ease-in-out ${i * 0.15}s infinite` }}
              >
                ✨
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// --- ROBOT TASK: Select rescue robot type for each survivor ---
function RobotTask({ onComplete }: { onComplete: (score: number, data: Record<string, unknown>) => void }) {
  const t = useTranslations('coopMissions.rescue.robot')
  const [assignments, setAssignments] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [animatingRobot, setAnimatingRobot] = useState<string | null>(null)

  const survivors = [
    { id: 0, hazard: 'water', labelKey: 'survivor1', hazardKey: 'flooded' },
    { id: 1, hazard: 'debris', labelKey: 'survivor2', hazardKey: 'collapsed' },
    { id: 2, hazard: 'fire', labelKey: 'survivor3', hazardKey: 'burning' },
    { id: 3, hazard: 'debris', labelKey: 'survivor4', hazardKey: 'trapped' },
    { id: 4, hazard: 'fire', labelKey: 'survivor5', hazardKey: 'smoke' },
  ]

  const ROBOT_TYPES = [
    { id: 'water', labelKey: 'waterBot', icon: '🚤', bestFor: 'water' },
    { id: 'debris', labelKey: 'debrisBot', icon: '🦾', bestFor: 'debris' },
    { id: 'fire', labelKey: 'fireBot', icon: '🧯', bestFor: 'fire' },
  ]

  const hazardIcons: Record<string, { icon: string; color: string; animation: string; bg: string }> = {
    water: { icon: '🌊', color: 'text-blue-400', animation: 'cr-water-wave 2s ease-in-out infinite', bg: 'from-blue-900/40 to-blue-800/20' },
    debris: { icon: '🧱', color: 'text-amber-400', animation: 'cr-debris-shake 1.5s ease-in-out infinite', bg: 'from-amber-900/40 to-amber-800/20' },
    fire: { icon: '🔥', color: 'text-red-400', animation: 'cr-fire-flicker 1s ease-in-out infinite', bg: 'from-red-900/40 to-red-800/20' },
  }

  function assign(survivorId: number, robotType: string) {
    if (submitted) return
    setAnimatingRobot(`${survivorId}-${robotType}`)
    setTimeout(() => setAnimatingRobot(null), 500)
    setAssignments(prev => ({ ...prev, [survivorId]: robotType }))
  }

  function submit() {
    if (Object.keys(assignments).length < 5) return
    setSubmitted(true)

    let correct = 0
    survivors.forEach(s => {
      if (assignments[s.id] === s.hazard) correct++
    })
    const score = Math.min(1000, correct * 200)

    onComplete(score, { assignments, correctCount: correct })
  }

  function isCorrect(survivorId: number): boolean | null {
    if (!submitted) return null
    const s = survivors.find(sv => sv.id === survivorId)
    return s ? assignments[survivorId] === s.hazard : null
  }

  return (
    <div className="space-y-4">
      <style>{sharedStyles}</style>

      <div style={{ animation: 'cr-float 3s ease-in-out infinite' }}>
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="text-2xl">🤖</span> {t('title')}
        </h3>
        <p className="text-gray-400 text-sm mt-1">{t('desc')}</p>
      </div>

      {/* Robot type legend */}
      <div className="flex gap-2 justify-center">
        {ROBOT_TYPES.map(rt => (
          <div
            key={rt.id}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-800/60 border border-gray-700/50 text-xs text-gray-300"
            style={{ animation: 'cr-float 3s ease-in-out infinite' }}
          >
            <span className="text-base">{rt.icon}</span>
            {t(rt.labelKey)}
          </div>
        ))}
      </div>

      {/* Survivor cards - isometric perspective */}
      <div
        className="space-y-3"
        style={{
          transform: 'perspective(800px) rotateX(5deg)',
          transformStyle: 'preserve-3d',
        }}
      >
        {survivors.map((s, idx) => {
          const hz = hazardIcons[s.hazard]
          const correct = isCorrect(s.id)

          return (
            <div
              key={s.id}
              className={clsx(
                'rounded-2xl p-4 border transition-all duration-300',
                correct === true ? 'border-green-500/60' : correct === false ? 'border-red-500/60' : 'border-gray-700/40'
              )}
              style={{
                background: `linear-gradient(135deg, rgba(17,24,39,0.9), rgba(31,41,55,0.8))`,
                boxShadow: correct === true
                  ? '0 4px 20px rgba(34,197,94,0.3)'
                  : correct === false
                    ? '0 4px 20px rgba(239,68,68,0.3)'
                    : '0 4px 16px rgba(0,0,0,0.4)',
                animation: correct === true
                  ? 'cr-glow-green 2s infinite'
                  : correct === false
                    ? 'cr-glow-red 2s infinite'
                    : undefined,
                transform: `translateZ(${idx * 2}px)`,
                animationDelay: `${idx * 0.1}s`,
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                {/* Hazard icon with animation */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{
                    background: `linear-gradient(135deg, ${s.hazard === 'water' ? 'rgba(59,130,246,0.3), rgba(37,99,235,0.2)' : s.hazard === 'fire' ? 'rgba(239,68,68,0.3), rgba(185,28,28,0.2)' : 'rgba(217,119,6,0.3), rgba(180,83,9,0.2)'})`,
                    animation: hz.animation,
                  }}
                >
                  {hz.icon}
                </div>

                <div className="flex-1">
                  <p className="text-sm font-bold text-white">
                    🆘 {t(s.labelKey)}
                  </p>
                  <p className={clsx('text-xs font-semibold', hz.color)}>
                    {t(s.hazardKey)}
                  </p>
                </div>

                {/* Match result indicator */}
                {submitted && (
                  <div className="text-xl" style={{ animation: 'cr-survivor-found 0.5s ease-out' }}>
                    {correct ? '✅' : '❌'}
                  </div>
                )}
              </div>

              {/* Robot selection buttons */}
              <div className="flex gap-2">
                {ROBOT_TYPES.map(rt => {
                  const isSelected = assignments[s.id] === rt.id
                  const isAnimating = animatingRobot === `${s.id}-${rt.id}`

                  return (
                    <button
                      key={rt.id}
                      onClick={() => assign(s.id, rt.id)}
                      disabled={submitted}
                      className={clsx(
                        'flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all duration-200 flex items-center justify-center gap-1.5',
                        isSelected
                          ? 'border-blue-500/60 text-white'
                          : 'border-gray-700/50 text-gray-400 hover:border-gray-500 hover:text-gray-300'
                      )}
                      style={{
                        background: isSelected
                          ? 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(37,99,235,0.15))'
                          : 'rgba(31,41,55,0.4)',
                        boxShadow: isSelected ? '0 2px 12px rgba(59,130,246,0.2)' : undefined,
                        animation: isAnimating ? 'cr-fly-in 0.4s ease-out' : undefined,
                      }}
                    >
                      <span className="text-base">{rt.icon}</span>
                      {t(rt.labelKey)}
                    </button>
                  )
                })}
              </div>

              {/* Animated connection line when assigned */}
              {assignments[s.id] && !submitted && (
                <div className="mt-2 h-0.5 rounded-full overflow-hidden bg-gray-800">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                    style={{ animation: 'cr-draw-line 0.5s ease-out forwards' }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!submitted ? (
        <button onClick={submit} disabled={Object.keys(assignments).length < 5}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold rounded-xl disabled:opacity-40 hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg shadow-blue-900/30 active:scale-[0.98]">
          {t('submit')}
        </button>
      ) : (
        <div
          className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 text-center relative overflow-hidden"
          style={{ animation: 'cr-celebrate 0.5s ease-out' }}
        >
          {[...Array(8)].map((_, i) => (
            <span
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                background: ['#34d399', '#60a5fa', '#f59e0b', '#ec4899', '#a78bfa'][i % 5],
                left: `${10 + i * 12}%`,
                top: '0',
                animation: `cr-confetti-fall ${1 + i * 0.15}s ease-in ${i * 0.1}s forwards`,
              }}
            />
          ))}
          <p className="text-green-400 font-bold text-lg">{t('submitted')}</p>
          <div className="flex justify-center gap-1 mt-2">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="text-xl" style={{ animation: `cr-sparkle 0.8s ease-in-out ${i * 0.15}s infinite` }}>✨</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// --- ENTREPRENEUR TASK: Allocate $100K rescue budget + press choices ---
function EntrepreneurTask({ onComplete }: { onComplete: (score: number, data: Record<string, unknown>) => void }) {
  const t = useTranslations('coopMissions.rescue.entrepreneur')
  const totalBudget = 100000
  const [allocations, setAllocations] = useState<number[]>([20000, 20000, 20000, 20000, 20000])
  const [pressChoice, setPressChoice] = useState<number>(-1)
  const [submitted, setSubmitted] = useState(false)
  const [compassAngle, setCompassAngle] = useState(0)

  const survivors = [
    { labelKey: 'victim1', severity: 'critical' as const },
    { labelKey: 'victim2', severity: 'critical' as const },
    { labelKey: 'victim3', severity: 'medium' as const },
    { labelKey: 'victim4', severity: 'low' as const },
    { labelKey: 'victim5', severity: 'medium' as const },
  ]

  const PRESS_OPTIONS = [
    { labelKey: 'press1', score: 300, icon: '📢', desc: 'Transparent' },
    { labelKey: 'press2', score: 200, icon: '🦸', desc: 'Heroic' },
    { labelKey: 'press3', score: 100, icon: '🤫', desc: 'Minimize' },
  ]

  const totalAllocated = allocations.reduce((a, b) => a + b, 0)

  const severityConfig = {
    critical: { color: 'text-red-400', bg: 'from-red-900/30 to-red-800/10', border: 'border-red-500/30', animation: 'cr-severity-critical 2s infinite', icon: '🔴', glow: 'rgba(239,68,68,0.3)' },
    medium: { color: 'text-yellow-400', bg: 'from-yellow-900/30 to-yellow-800/10', border: 'border-yellow-500/30', animation: 'cr-severity-medium 2.5s infinite', icon: '🟡', glow: 'rgba(234,179,8,0.2)' },
    low: { color: 'text-green-400', bg: 'from-green-900/30 to-green-800/10', border: 'border-green-500/30', animation: '', icon: '🟢', glow: 'rgba(34,197,94,0.1)' },
  }

  // Update compass based on ethical quality of allocations
  useEffect(() => {
    const criticalPct = (allocations[0] + allocations[1]) / totalBudget
    // More to critical = more ethical = compass points north (0 deg)
    const angle = (1 - criticalPct) * 180 - 90
    setCompassAngle(angle)
  }, [allocations])

  function updateAllocation(idx: number, val: number) {
    if (submitted) return
    const next = [...allocations]
    next[idx] = val
    setAllocations(next)
  }

  function submit() {
    if (totalAllocated > totalBudget || pressChoice < 0) return
    setSubmitted(true)

    let budgetScore = 0
    survivors.forEach((s, i) => {
      const pct = allocations[i] / totalBudget
      if (s.severity === 'critical' && pct >= 0.25) budgetScore += 150
      else if (s.severity === 'critical' && pct >= 0.15) budgetScore += 100
      else if (s.severity === 'medium' && pct >= 0.15) budgetScore += 120
      else if (s.severity === 'medium' && pct >= 0.10) budgetScore += 80
      else if (s.severity === 'low' && pct >= 0.05 && pct <= 0.20) budgetScore += 100
      else budgetScore += 40
    })
    const pressScore = PRESS_OPTIONS[pressChoice]?.score ?? 0
    const score = Math.min(1000, budgetScore + pressScore)

    onComplete(score, {
      allocations: survivors.map((s, i) => ({ survivor: s.labelKey, amount: allocations[i] })),
      pressStrategy: pressChoice,
    })
  }

  return (
    <div className="space-y-4">
      <style>{sharedStyles}</style>

      <div style={{ animation: 'cr-float 3s ease-in-out infinite' }}>
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="text-2xl">💼</span> {t('title')}
        </h3>
        <p className="text-gray-400 text-sm mt-1">{t('desc')}</p>
      </div>

      {/* Budget header with 2.5D look */}
      <div
        className="rounded-2xl p-5 text-center border border-gray-700/40 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(17,24,39,0.95), rgba(31,41,55,0.9))',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          transform: 'perspective(600px) rotateX(3deg)',
        }}
      >
        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">{t('rescueBudget')}</p>
        <p className="text-3xl font-black text-white mt-1" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
          ${totalBudget.toLocaleString()}
        </p>
        <p className={clsx('text-sm font-bold mt-2', totalAllocated <= totalBudget ? 'text-green-400' : 'text-red-400')}>
          {t('allocated')}: ${totalAllocated.toLocaleString()}
          {totalAllocated <= totalBudget && (
            <span className="text-gray-500 ml-2">
              (${(totalBudget - totalAllocated).toLocaleString()} left)
            </span>
          )}
        </p>

        {/* Budget bar */}
        <div className="mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={clsx('h-full rounded-full transition-all duration-300', totalAllocated <= totalBudget ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-red-500 to-red-400')}
            style={{ width: `${Math.min(100, (totalAllocated / totalBudget) * 100)}%` }}
          />
        </div>
      </div>

      {/* Victim cards with budget sliders */}
      <div
        className="space-y-3"
        style={{
          transform: 'perspective(800px) rotateX(3deg)',
          transformStyle: 'preserve-3d',
        }}
      >
        {survivors.map((s, i) => {
          const cfg = severityConfig[s.severity]
          const pct = (allocations[i] / totalBudget) * 100

          return (
            <div
              key={i}
              className={clsx('rounded-2xl p-4 border transition-all', cfg.border)}
              style={{
                background: 'linear-gradient(135deg, rgba(17,24,39,0.9), rgba(31,41,55,0.8))',
                boxShadow: `0 4px 16px rgba(0,0,0,0.3), 0 0 8px ${cfg.glow}`,
                animation: cfg.animation || undefined,
                transform: `translateZ(${i * 2}px)`,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {/* Severity indicator */}
                  <span className="text-lg">{cfg.icon}</span>
                  <span className="text-sm text-gray-300 font-medium">{t(s.labelKey)}</span>
                  <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full', cfg.color)}
                    style={{ background: `linear-gradient(135deg, ${cfg.glow}, transparent)` }}>
                    {t(s.severity)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {/* Money flow animation */}
                  <span className="text-xs text-green-400" style={{ animation: allocations[i] > 0 ? 'cr-money-flow 1.5s ease-in-out infinite' : undefined }}>
                    💵
                  </span>
                  <span className="text-white font-bold text-sm">${allocations[i].toLocaleString()}</span>
                </div>
              </div>

              {/* Custom styled slider */}
              <div className="relative">
                <input
                  type="range" min={0} max={50000} step={5000}
                  value={allocations[i]}
                  onChange={e => updateAllocation(i, Number(e.target.value))}
                  disabled={submitted}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${s.severity === 'critical' ? '#ef4444' : s.severity === 'medium' ? '#eab308' : '#22c55e'} ${pct}%, rgba(55,65,81,0.6) ${pct}%)`,
                  }}
                />
              </div>

              {/* Percentage indicator */}
              <div className="flex justify-between mt-1 text-xs text-gray-500">
                <span>$0</span>
                <span className={cfg.color}>{pct.toFixed(0)}%</span>
                <span>$50K</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Ethical compass */}
      <div className="flex justify-center">
        <div className="relative w-16 h-16">
          <div
            className="w-full h-full rounded-full border-2 border-gray-700 flex items-center justify-center"
            style={{ background: 'radial-gradient(circle, rgba(31,41,55,0.9), rgba(17,24,39,0.95))' }}
          >
            <div
              className="w-0.5 h-6 rounded-full"
              style={{
                background: 'linear-gradient(to top, #ef4444, #22c55e)',
                transform: `rotate(${compassAngle}deg)`,
                transformOrigin: 'bottom center',
                transition: 'transform 0.5s ease-out',
              }}
            />
          </div>
          <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] text-green-400 font-bold">{t('ethics')}</span>
        </div>
      </div>

      {/* Press communication */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <span className="text-lg">📰</span> {t('pressStrategy')}
        </p>
        {PRESS_OPTIONS.map((opt, i) => (
          <button
            key={i}
            onClick={() => setPressChoice(i)}
            disabled={submitted}
            className={clsx(
              'w-full text-left p-4 rounded-xl border text-sm transition-all duration-200 flex items-center gap-3',
              pressChoice === i
                ? 'border-blue-500/60 text-white'
                : 'border-gray-700/40 text-gray-400 hover:border-gray-500'
            )}
            style={{
              background: pressChoice === i
                ? 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(37,99,235,0.1))'
                : 'linear-gradient(135deg, rgba(17,24,39,0.8), rgba(31,41,55,0.6))',
              boxShadow: pressChoice === i ? '0 4px 16px rgba(59,130,246,0.2)' : '0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            <span className="text-2xl">{opt.icon}</span>
            <span className="flex-1">{t(opt.labelKey)}</span>
            {pressChoice === i && (
              <span className="text-blue-400 text-lg" style={{ animation: 'cr-sparkle 1s ease-in-out infinite' }}>✓</span>
            )}
          </button>
        ))}
      </div>

      {!submitted ? (
        <button onClick={submit} disabled={totalAllocated > totalBudget || pressChoice < 0}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold rounded-xl disabled:opacity-40 hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg shadow-blue-900/30 active:scale-[0.98]">
          {t('submit')}
        </button>
      ) : (
        <div
          className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 text-center relative overflow-hidden"
          style={{ animation: 'cr-celebrate 0.5s ease-out' }}
        >
          {[...Array(8)].map((_, i) => (
            <span
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                background: ['#34d399', '#60a5fa', '#f59e0b', '#ec4899', '#a78bfa'][i % 5],
                left: `${10 + i * 12}%`,
                top: '0',
                animation: `cr-confetti-fall ${1 + i * 0.15}s ease-in ${i * 0.1}s forwards`,
              }}
            />
          ))}
          <p className="text-green-400 font-bold text-lg">{t('submitted')}</p>
          <div className="flex justify-center gap-1 mt-2">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="text-xl" style={{ animation: `cr-sparkle 0.8s ease-in-out ${i * 0.15}s infinite` }}>✨</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function CoopRescue({ role, onComplete }: Props) {
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
