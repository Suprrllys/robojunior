'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { useRouter as useNextRouter } from 'next/navigation'
import clsx from 'clsx'
import { completeMission } from '@/lib/game/scoring'
import { getMissionConfig } from '@/lib/game/missions'
import { fireGameToast } from '@/components/game/GameToast'
import type { Difficulty, MissionResult } from '@/types/game'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Direction = 'N' | 'S' | 'E' | 'W'
type CommandType = 'forward' | 'turn-left' | 'turn-right' | 'repeat'
interface ProgramBlock { id: string; type: CommandType }

interface Coord { x: number; y: number }

interface DroneGameProps {
  userId: string
  missionNumber: number
  difficulty: Difficulty
  isCompleted: boolean
  onComplete?: (score: number) => void
}

// ---------------------------------------------------------------------------
// Direction helpers
// ---------------------------------------------------------------------------

const TURN_LEFT: Record<Direction, Direction> = { N: 'W', W: 'S', S: 'E', E: 'N' }
const TURN_RIGHT: Record<Direction, Direction> = { N: 'E', E: 'S', S: 'W', W: 'N' }
const MOVE: Record<Direction, Coord> = { N: { x: 0, y: -1 }, S: { x: 0, y: 1 }, E: { x: 1, y: 0 }, W: { x: -1, y: 0 } }

// ---------------------------------------------------------------------------
// Level generation (deterministic per mission+difficulty)
// ---------------------------------------------------------------------------

function generateLevel(missionNumber: number, difficulty: Difficulty, gridSize: number) {
  const mid = Math.floor(gridSize / 2)
  const start: Coord = { x: 0, y: gridSize - 1 }
  const target: Coord = { x: gridSize - 1, y: 0 }

  const obstacles: Coord[] = []
  const packages: Coord[] = []

  const isOccupied = (c: Coord) =>
    (c.x === start.x && c.y === start.y) ||
    (c.x === target.x && c.y === target.y) ||
    obstacles.some(o => o.x === c.x && o.y === c.y) ||
    packages.some(p => p.x === c.x && p.y === c.y)

  if (difficulty === 'medium' || difficulty === 'hard') {
    const obstacleCoords: Coord[] = missionNumber === 1
      ? [{ x: 2, y: 2 }, { x: 3, y: 1 }, { x: 1, y: 3 }]
      : [{ x: 1, y: 1 }, { x: 3, y: 3 }, { x: 2, y: 4 }]

    for (const c of obstacleCoords) {
      if (c.x < gridSize && c.y < gridSize && !isOccupied(c)) {
        obstacles.push(c)
      }
    }
  }

  if (difficulty === 'hard') {
    const extra: Coord[] = missionNumber === 1
      ? [{ x: 4, y: 3 }, { x: 5, y: 2 }, { x: 3, y: 5 }]
      : [{ x: 5, y: 1 }, { x: 4, y: 4 }, { x: 1, y: 5 }]
    for (const c of extra) {
      if (c.x < gridSize && c.y < gridSize && !isOccupied(c)) {
        obstacles.push(c)
      }
    }

    // 3 package cells for hard mode
    const pkgCoords: Coord[] = missionNumber === 1
      ? [{ x: 1, y: 1 }, { x: 3, y: 4 }, { x: 5, y: 5 }]
      : [{ x: 2, y: 1 }, { x: 4, y: 3 }, { x: 6, y: 5 }]
    for (const c of pkgCoords) {
      if (c.x < gridSize && c.y < gridSize && !isOccupied(c)) {
        packages.push(c)
      }
    }
  }

  // Non-hard: single package at midpoint
  if (difficulty !== 'hard') {
    const pkg: Coord = { x: mid, y: mid }
    if (!isOccupied(pkg)) packages.push(pkg)
  }

  return { start, target, obstacles, packages }
}

// ---------------------------------------------------------------------------
// SVG Drone Component
// ---------------------------------------------------------------------------

function DroneSVG({ facing, hasPackage }: { facing: Direction; hasPackage: boolean }) {
  const rotation = { N: 0, E: 90, S: 180, W: 270 }[facing]
  return (
    <svg
      viewBox="0 0 40 40"
      className="w-full h-full"
      style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 0.3s ease' }}
    >
      {/* Body */}
      <rect x="12" y="14" width="16" height="12" rx="3" fill="#3B82F6" stroke="#60A5FA" strokeWidth="1" />
      {/* Propeller arms */}
      <line x1="8" y1="16" x2="16" y2="16" stroke="#60A5FA" strokeWidth="2" />
      <line x1="24" y1="16" x2="32" y2="16" stroke="#60A5FA" strokeWidth="2" />
      <line x1="8" y1="24" x2="16" y2="24" stroke="#60A5FA" strokeWidth="2" />
      <line x1="24" y1="24" x2="32" y2="24" stroke="#60A5FA" strokeWidth="2" />
      {/* Propellers */}
      <circle cx="8" cy="16" r="4" fill="#3B82F6" opacity="0.5">
        <animateTransform attributeName="transform" type="rotate" from="0 8 16" to="360 8 16" dur="0.3s" repeatCount="indefinite" />
      </circle>
      <circle cx="32" cy="16" r="4" fill="#3B82F6" opacity="0.5">
        <animateTransform attributeName="transform" type="rotate" from="0 32 16" to="360 32 16" dur="0.3s" repeatCount="indefinite" />
      </circle>
      <circle cx="8" cy="24" r="4" fill="#3B82F6" opacity="0.5">
        <animateTransform attributeName="transform" type="rotate" from="0 8 24" to="360 8 24" dur="0.3s" repeatCount="indefinite" />
      </circle>
      <circle cx="32" cy="24" r="4" fill="#3B82F6" opacity="0.5">
        <animateTransform attributeName="transform" type="rotate" from="0 32 24" to="360 32 24" dur="0.3s" repeatCount="indefinite" />
      </circle>
      {/* Direction indicator (nose) */}
      <polygon points="20,8 17,14 23,14" fill="#F59E0B" />
      {/* Camera eye */}
      <circle cx="20" cy="20" r="2" fill="#1E293B" />
      {/* Package indicator */}
      {hasPackage && (
        <rect x="16" y="27" width="8" height="6" rx="1" fill="#F59E0B" stroke="#D97706" strokeWidth="0.5" />
      )}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Celebration animation keyframes
// ---------------------------------------------------------------------------

const CELEBRATION_CSS = `
@keyframes drone-celebrate {
  0% { transform: scale(0.5); opacity: 0; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes drone-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
`

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function DroneGame({ userId, missionNumber, difficulty, isCompleted, onComplete }: DroneGameProps) {
  const t = useTranslations('game')
  const router = useRouter()
  const nextRouter = useNextRouter()

  const config = getMissionConfig('drone_programmer', missionNumber, difficulty)
  const gridSize = config?.gridSize ?? 5
  const maxBlocks = config?.maxBlocks ?? 12

  const level = useMemo(
    () => generateLevel(missionNumber, difficulty, gridSize),
    [missionNumber, difficulty, gridSize]
  )

  // Game state
  const [program, setProgram] = useState<ProgramBlock[]>([])
  const [dronePos, setDronePos] = useState<Coord>(level.start)
  const [droneFacing, setDroneFacing] = useState<Direction>('N')
  const [collectedPackages, setCollectedPackages] = useState<Set<string>>(new Set())
  const [trail, setTrail] = useState<Coord[]>([level.start])
  const [running, setRunning] = useState(false)
  const [activeStep, setActiveStep] = useState(-1)
  const [crashed, setCrashed] = useState(false)
  const [missionResult, setMissionResult] = useState<MissionResult | null>(null)
  const [done, setDone] = useState(isCompleted)
  const [score, setScore] = useState(0)
  const startTimeRef = useRef(Date.now())
  const abortRef = useRef(false)

  // Reset when switching missions
  useEffect(() => {
    setDone(isCompleted)
    setProgram([])
    setMissionResult(null)
    setScore(0)
  }, [missionNumber, difficulty, isCompleted])

  // Command palette
  const PALETTE: { type: CommandType; labelKey: string; color: string; icon: string }[] = [
    { type: 'forward', labelKey: 'drone.forward', color: '#3B82F6', icon: '\u2191' },
    { type: 'turn-left', labelKey: 'drone.turnLeft', color: '#10B981', icon: '\u21B0' },
    { type: 'turn-right', labelKey: 'drone.turnRight', color: '#F59E0B', icon: '\u21B1' },
    { type: 'repeat', labelKey: 'drone.repeat', color: '#8B5CF6', icon: '\u21BB' },
  ]

  function addBlock(type: CommandType) {
    if (program.length >= maxBlocks) return
    setProgram(prev => [...prev, { id: `${type}-${Date.now()}-${Math.random()}`, type }])
  }

  function removeBlock(idx: number) {
    if (running) return
    setProgram(prev => prev.filter((_, i) => i !== idx))
  }

  function clearProgram() {
    if (running) return
    setProgram([])
  }

  const resetSimulation = useCallback(() => {
    abortRef.current = true
    setDronePos(level.start)
    setDroneFacing('N')
    setCollectedPackages(new Set())
    setTrail([level.start])
    setRunning(false)
    setActiveStep(-1)
    setCrashed(false)
  }, [level.start])

  function expandProgram(blocks: ProgramBlock[]): CommandType[] {
    const expanded: CommandType[] = []
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]
      if (block.type === 'repeat') {
        if (expanded.length > 0) {
          expanded.push(expanded[expanded.length - 1])
        }
      } else {
        expanded.push(block.type)
      }
    }
    return expanded
  }

  const runProgram = useCallback(async () => {
    if (program.length === 0 || running) return
    resetSimulation()
    await new Promise(r => requestAnimationFrame(() => setTimeout(r, 50)))
    abortRef.current = false
    setRunning(true)

    const commands = expandProgram(program)
    let pos = { ...level.start }
    let facing: Direction = 'N'
    const collected = new Set<string>()
    const pathTrail: Coord[] = [{ ...pos }]
    let hitObstacle = false

    for (let i = 0; i < commands.length; i++) {
      if (abortRef.current) return
      setActiveStep(i)
      await new Promise(r => requestAnimationFrame(() => setTimeout(r, 350)))

      const cmd = commands[i]

      if (cmd === 'turn-left') {
        facing = TURN_LEFT[facing]
        setDroneFacing(facing)
        continue
      }
      if (cmd === 'turn-right') {
        facing = TURN_RIGHT[facing]
        setDroneFacing(facing)
        continue
      }
      if (cmd === 'forward') {
        const delta = MOVE[facing]
        const newPos = { x: pos.x + delta.x, y: pos.y + delta.y }

        if (newPos.x < 0 || newPos.x >= gridSize || newPos.y < 0 || newPos.y >= gridSize) {
          continue
        }

        if (level.obstacles.some(o => o.x === newPos.x && o.y === newPos.y)) {
          hitObstacle = true
          setCrashed(true)
          setDronePos(newPos)
          break
        }

        pos = newPos
        setDronePos({ ...pos })
        pathTrail.push({ ...pos })
        setTrail([...pathTrail])

        const pkgKey = `${pos.x},${pos.y}`
        if (level.packages.some(p => p.x === pos.x && p.y === pos.y) && !collected.has(pkgKey)) {
          collected.add(pkgKey)
          setCollectedPackages(new Set(collected))
        }
      }
    }

    setRunning(false)
    setActiveStep(-1)

    if (abortRef.current) return

    const atTarget = pos.x === level.target.x && pos.y === level.target.y
    const allPackages = collected.size >= level.packages.length
    const success = atTarget && allPackages && !hitObstacle

    if (success) {
      const efficiencyBonus = Math.max(0, maxBlocks - program.length) * 50
      const baseScore = 600
      const finalScore = Math.min(1000, baseScore + efficiencyBonus)
      setScore(finalScore)
      setDone(true)
      onComplete?.(finalScore)
    }
  }, [program, level, gridSize, maxBlocks, userId, missionNumber, difficulty, router, nextRouter, resetSimulation, running, onComplete])

  // Lookup sets for rendering
  const obstacleSet = useMemo(
    () => new Set(level.obstacles.map(o => `${o.x},${o.y}`)),
    [level.obstacles]
  )
  const packageSet = useMemo(
    () => new Set(level.packages.map(p => `${p.x},${p.y}`)),
    [level.packages]
  )
  const trailSet = useMemo(
    () => new Set(trail.map(c => `${c.x},${c.y}`)),
    [trail]
  )

  const difficultyColor: Record<Difficulty, string> = {
    easy: 'bg-green-500/20 text-green-400 border-green-500/40',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    hard: 'bg-red-500/20 text-red-400 border-red-500/40',
  }

  const tileSize = gridSize <= 5 ? 56 : gridSize <= 6 ? 48 : 42

  // ---------------------------------------------------------------------------
  // Render: Success State
  // ---------------------------------------------------------------------------

  if (done && !running) {
    return (
      <>
        <style>{CELEBRATION_CSS}</style>
        <div
          className="relative bg-[var(--brand-panel)] border border-green-500/40 rounded-2xl p-8 text-center"
          style={{ animation: 'drone-celebrate 0.6s ease-out' }}
        >
          <button
            onClick={() => { setDone(false); setMissionResult(null) }}
            className="absolute top-3 right-3 text-gray-500 hover:text-white text-xl leading-none"
            aria-label="Close"
          >×</button>
          <div className="w-20 h-20 mx-auto mb-4">
            <DroneSVG facing="N" hasPackage={false} />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">{t('drone.missionComplete')}</h2>
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full border', difficultyColor[difficulty])}>
              {t(`common.${difficulty}`)}
            </span>
          </div>
          <div
            className="text-5xl font-black text-[var(--brand-gold)] mb-1"
            style={{ animation: 'drone-pulse 2s ease-in-out infinite' }}
          >
            {score}
          </div>
          <p className="text-gray-400 text-sm mb-4">{t('drone.score')}</p>

          {missionResult && (
            <div className="space-y-1 mb-6">
              {missionResult.xpEarned > 0 && (
                <p className="text-green-400 font-bold">{t('drone.xpEarned', { xp: missionResult.xpEarned })}</p>
              )}
              {missionResult.currencyEarned > 0 && (
                <p className="text-[var(--brand-gold)] font-bold">{t('drone.coinsEarned', { coins: missionResult.currencyEarned })}</p>
              )}
              {missionResult.isFirstCompletion && (
                <p className="text-purple-400 font-medium">{t('drone.firstClear')}</p>
              )}
              {missionResult.isNewBestScore && !missionResult.isFirstCompletion && (
                <p className="text-blue-400 font-medium">{t('drone.newBest')}</p>
              )}
            </div>
          )}

          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                setDone(false)
                setProgram([])
                resetSimulation()
                startTimeRef.current = Date.now()
                setMissionResult(null)
              }}
              className="px-6 py-3 bg-[var(--brand-panel)] border border-[var(--brand-blue)] text-[var(--brand-blue)] font-bold rounded-xl hover:bg-[var(--brand-blue)] hover:text-black transition-colors"
            >
              {t('drone.playAgain')}
            </button>
            {missionNumber < 2 && (
              <button
                onClick={() => router.push(`/missions/drone?mission=${missionNumber + 1}&difficulty=${difficulty}`)}
                className="px-6 py-3 bg-[var(--brand-blue)] text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
              >
                {t('drone.nextMission')}
              </button>
            )}
          </div>
        </div>
      </>
    )
  }

  // ---------------------------------------------------------------------------
  // Render: Game
  // ---------------------------------------------------------------------------

  return (
    <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <h2 className="text-lg font-bold text-white">
          {t(config?.titleKey ?? `drone.m${missionNumber}_title`)}
        </h2>
        <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full border', difficultyColor[difficulty])}>
          {t(`common.${difficulty}`)}
        </span>
      </div>
      <p className="text-gray-400 text-sm mb-6">
        {t(config?.descKey ?? `drone.m${missionNumber}_${difficulty === 'medium' ? 'med' : difficulty}_desc`)}
      </p>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Isometric 2.5D Grid */}
        <div className="flex-shrink-0">
          <p className="text-xs text-gray-400 mb-3 uppercase font-bold tracking-wider">{t('drone.simulationGrid')}</p>
          <div className="flex justify-center lg:justify-start" style={{ perspective: '800px' }}>
            <div
              className="inline-grid gap-px p-3 bg-gray-900 rounded-xl border border-[var(--brand-border)]"
              style={{
                gridTemplateColumns: `repeat(${gridSize}, ${tileSize}px)`,
                transform: 'rotateX(60deg) rotateZ(-45deg)',
                transformStyle: 'preserve-3d',
              }}
            >
              {Array.from({ length: gridSize }, (_, y) =>
                Array.from({ length: gridSize }, (_, x) => {
                  const key = `${x},${y}`
                  const isDrone = dronePos.x === x && dronePos.y === y
                  const isTarget = level.target.x === x && level.target.y === y
                  const isObstacle = obstacleSet.has(key)
                  const isPackage = packageSet.has(key) && !collectedPackages.has(key)
                  const isCollected = packageSet.has(key) && collectedPackages.has(key)
                  const isTrail = trailSet.has(key) && !isDrone
                  const isStart = level.start.x === x && level.start.y === y

                  return (
                    <div
                      key={key}
                      className={clsx(
                        'flex items-center justify-center border transition-colors',
                        isObstacle && 'bg-red-900/30 border-red-700/50',
                        isTarget && !isObstacle && 'bg-purple-900/40 border-purple-500/60',
                        isCollected && !isDrone && 'bg-green-900/20 border-green-700/30',
                        isTrail && !isTarget && !isCollected && 'bg-blue-900/20 border-blue-800/30',
                        isStart && !isDrone && !isTrail && 'bg-blue-900/10 border-blue-900/30',
                        !isObstacle && !isTarget && !isTrail && !isStart && !isCollected && 'bg-gray-800/60 border-gray-700/30',
                        crashed && isDrone && 'bg-red-900/60 border-red-500',
                      )}
                      style={{
                        width: tileSize,
                        height: tileSize,
                        transformStyle: 'preserve-3d',
                        transform: isObstacle ? 'translateZ(8px)' : isTarget ? 'translateZ(2px)' : undefined,
                      }}
                    >
                      {isDrone && (
                        <div className="w-[80%] h-[80%]" style={{ transform: 'rotateZ(45deg) rotateX(-60deg)' }}>
                          <DroneSVG facing={droneFacing} hasPackage={collectedPackages.size > 0} />
                        </div>
                      )}
                      {isPackage && !isDrone && (
                        <svg viewBox="0 0 24 24" className="w-6 h-6" style={{ transform: 'rotateZ(45deg) rotateX(-60deg)' }}>
                          <rect x="4" y="6" width="16" height="12" rx="2" fill="#F59E0B" stroke="#D97706" strokeWidth="1" />
                          <line x1="4" y1="12" x2="20" y2="12" stroke="#D97706" strokeWidth="1" />
                          <line x1="12" y1="6" x2="12" y2="18" stroke="#D97706" strokeWidth="1" />
                        </svg>
                      )}
                      {isTarget && !isDrone && (
                        <svg viewBox="0 0 24 24" className="w-6 h-6" style={{ transform: 'rotateZ(45deg) rotateX(-60deg)' }}>
                          <circle cx="12" cy="12" r="10" fill="none" stroke="#A855F7" strokeWidth="2" />
                          <circle cx="12" cy="12" r="6" fill="none" stroke="#A855F7" strokeWidth="2" />
                          <circle cx="12" cy="12" r="2" fill="#A855F7" />
                        </svg>
                      )}
                      {isObstacle && !isDrone && (
                        <svg viewBox="0 0 24 24" className="w-5 h-5" style={{ transform: 'rotateZ(45deg) rotateX(-60deg)' }}>
                          <line x1="6" y1="6" x2="18" y2="18" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
                          <line x1="18" y1="6" x2="6" y2="18" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                      )}
                      {isCollected && !isDrone && (
                        <svg viewBox="0 0 24 24" className="w-5 h-5 opacity-40" style={{ transform: 'rotateZ(45deg) rotateX(-60deg)' }}>
                          <path d="M9 12l2 2 4-4" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-blue-500/50" /> {t('drone.legend_drone')}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-yellow-500/50" /> {t('drone.legend_package')}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-purple-500/50" /> {t('drone.legend_target')}
            </span>
            {level.obstacles.length > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-red-500/50" /> {t('drone.legend_obstacle')}
              </span>
            )}
          </div>

          {/* Package counter for hard mode */}
          {difficulty === 'hard' && level.packages.length > 1 && (
            <p className="text-sm text-gray-400 mt-2 font-medium">
              {t('drone.packages', { collected: collectedPackages.size, total: level.packages.length })}
            </p>
          )}

          {crashed && (
            <p className="text-red-400 text-sm mt-2 font-bold">{t('drone.crashed')}</p>
          )}
        </div>

        {/* Programming Panel */}
        <div className="flex-1 space-y-4">
          {/* Block palette */}
          <div>
            <p className="text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">{t('drone.codeBlocks')}</p>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map(block => (
                <button
                  key={block.type}
                  onClick={() => addBlock(block.type)}
                  disabled={running || program.length >= maxBlocks}
                  className="px-3 py-2 rounded-lg text-sm font-bold text-white border transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
                  style={{ backgroundColor: `${block.color}22`, borderColor: block.color }}
                >
                  {block.icon} {t(block.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Program area */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">
                {t('drone.yourProgram')} ({t('drone.blocksCount', { used: program.length, max: maxBlocks })})
              </p>
              <button
                onClick={clearProgram}
                disabled={running || program.length === 0}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors disabled:opacity-30"
              >
                {t('drone.clearAll')}
              </button>
            </div>
            <div className="min-h-16 bg-gray-900 border border-[var(--brand-border)] rounded-xl p-3 flex flex-wrap gap-2">
              {program.length === 0 && (
                <p className="text-gray-600 text-sm">{t('drone.addBlocksHint')}</p>
              )}
              {program.map((block, idx) => {
                const palette = PALETTE.find(p => p.type === block.type)
                return (
                  <button
                    key={block.id}
                    onClick={() => removeBlock(idx)}
                    className={clsx(
                      'px-2.5 py-1.5 rounded-lg text-xs font-bold text-white border transition-all',
                      activeStep === idx ? 'scale-110 ring-2 ring-white' : 'hover:opacity-70',
                    )}
                    style={{ backgroundColor: `${palette?.color ?? '#666'}44`, borderColor: palette?.color ?? '#666' }}
                  >
                    {palette?.icon} {t(palette?.labelKey ?? 'drone.forward')}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            <button
              onClick={runProgram}
              disabled={running || program.length === 0}
              className={clsx(
                'px-8 py-3 font-black text-sm rounded-xl transition-all uppercase tracking-wider',
                'bg-[var(--brand-blue)] text-white',
                'hover:shadow-lg hover:shadow-blue-500/30 hover:scale-105',
                'active:scale-95',
                'disabled:opacity-40 disabled:hover:scale-100 disabled:hover:shadow-none',
              )}
            >
              {running ? t('drone.running') : t('drone.runProgram')}
            </button>
            <button
              onClick={() => { resetSimulation(); setProgram([]) }}
              disabled={running}
              className="px-4 py-3 bg-[var(--brand-panel)] border border-[var(--brand-border)] hover:border-[var(--brand-blue)] text-white font-bold rounded-xl transition-colors disabled:opacity-40"
            >
              {t('drone.reset')}
            </button>
          </div>

          <p className="text-xs text-gray-500">
            {t('drone.tip')}
          </p>
        </div>
      </div>
    </div>
  )
}
