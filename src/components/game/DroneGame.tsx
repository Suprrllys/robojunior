'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { completeMission } from '@/lib/game/scoring'
import { fireGameToast } from '@/components/game/GameToast'

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
type Block = { id: string; type: Direction | 'PICKUP' | 'DROP'; label: string; color: string }

const BLOCKS: Block[] = [
  { id: 'UP', type: 'UP', label: '↑ Forward', color: '#1E90FF' },
  { id: 'DOWN', type: 'DOWN', label: '↓ Back', color: '#6366F1' },
  { id: 'LEFT', type: 'LEFT', label: '← Left', color: '#10B981' },
  { id: 'RIGHT', type: 'RIGHT', label: '→ Right', color: '#F59E0B' },
  { id: 'PICKUP', type: 'PICKUP', label: '📦 Pick up', color: '#EF4444' },
  { id: 'DROP', type: 'DROP', label: '📍 Drop', color: '#8B5CF6' },
]

// Миссия 1: сетка 5x5, дрон стартует в [0,0], пакет в [2,2], цель в [4,4]
const GRID_SIZE = 5
const MISSION_1 = { start: [0, 4], package: [2, 2], target: [4, 0] }
const MISSION_2 = { start: [0, 4], package: [1, 3], target: [4, 0], obstacles: [[2, 2], [3, 1]] }

interface DroneGameProps {
  userId: string
  missionNumber: number
  isCompleted: boolean
}

type Cell = 'empty' | 'drone' | 'package' | 'target' | 'obstacle' | 'drone+package'

export default function DroneGame({ userId, missionNumber, isCompleted }: DroneGameProps) {
  const t = useTranslations('missions')
  const router = useRouter()

  const mission = missionNumber === 1 ? MISSION_1 : MISSION_2
  const obstacles = missionNumber === 2 ? MISSION_2.obstacles : []

  const [program, setProgram] = useState<Block[]>([])
  const [dronePos, setDronePos] = useState(mission.start)
  const [hasPackage, setHasPackage] = useState(false)
  const [packagePos, setPackagePos] = useState(mission.package)
  const [delivered, setDelivered] = useState(false)
  const [running, setRunning] = useState(false)
  const [step, setStep] = useState(-1)
  const [crashed, setCrashed] = useState(false)
  const [done, setDone] = useState(isCompleted)
  const [score, setScore] = useState(0)
  const [startTime] = useState(Date.now())

  function addBlock(block: Block) {
    if (program.length >= 12) return
    setProgram(prev => [...prev, { ...block, id: block.id + Date.now() }])
  }

  function removeBlock(idx: number) {
    setProgram(prev => prev.filter((_, i) => i !== idx))
  }

  function reset() {
    setDronePos(mission.start)
    setHasPackage(false)
    setPackagePos(mission.package)
    setDelivered(false)
    setRunning(false)
    setStep(-1)
    setCrashed(false)
  }

  const runProgram = useCallback(async () => {
    if (program.length === 0) return
    reset()
    setRunning(true)

    let pos = [...mission.start]
    let holding = false
    let pkgPos = [...mission.package]
    let success = false
    let hitObstacle = false

    for (let i = 0; i < program.length; i++) {
      setStep(i)
      await new Promise(r => setTimeout(r, 500))

      const cmd = program[i]
      let newPos = [...pos]

      if (cmd.type === 'UP') newPos[1] = Math.max(0, pos[1] - 1)
      else if (cmd.type === 'DOWN') newPos[1] = Math.min(GRID_SIZE - 1, pos[1] + 1)
      else if (cmd.type === 'LEFT') newPos[0] = Math.max(0, pos[0] - 1)
      else if (cmd.type === 'RIGHT') newPos[0] = Math.min(GRID_SIZE - 1, pos[0] + 1)
      else if (cmd.type === 'PICKUP') {
        if (pos[0] === pkgPos[0] && pos[1] === pkgPos[1]) {
          holding = true
          pkgPos = [-1, -1]
          setHasPackage(true)
          setPackagePos([-1, -1])
        }
        continue
      } else if (cmd.type === 'DROP') {
        if (holding && pos[0] === mission.target[0] && pos[1] === mission.target[1]) {
          holding = false
          success = true
          setDelivered(true)
        }
        continue
      }

      // Проверяем препятствия
      const isObstacle = obstacles.some(o => o[0] === newPos[0] && o[1] === newPos[1])
      if (isObstacle) {
        hitObstacle = true
        setCrashed(true)
        break
      }

      pos = newPos
      setDronePos([...pos])
    }

    setRunning(false)
    setStep(-1)

    if (success && !hitObstacle) {
      const elapsed = (Date.now() - startTime) / 1000
      const timeBonus = Math.max(0, 30 - Math.floor(elapsed / 10))
      const efficiencyBonus = Math.max(0, 12 - program.length) * 5
      const finalScore = Math.min(100, 60 + timeBonus + efficiencyBonus)
      setScore(finalScore)
      setDone(true)
      fireGameToast({ xp: 150, score: finalScore })

      await completeMission(userId, 'drone_programmer', missionNumber, finalScore, {
        decision_time_avg: elapsed / program.length,
        attempts: 1,
        style: program.length <= 8 ? 'fast' : 'analytical',
        precision_score: finalScore,
        creativity_score: efficiencyBonus * 2,
        teamwork_score: 0,
      })

      router.refresh()
    }
  }, [program, mission, obstacles, userId, missionNumber, startTime, router])

  function getCell(x: number, y: number): Cell {
    if (obstacles.some(o => o[0] === x && o[1] === y)) return 'obstacle'
    const isDrone = dronePos[0] === x && dronePos[1] === y
    const isPkg = packagePos[0] === x && packagePos[1] === y
    const isTarget = mission.target[0] === x && mission.target[1] === y
    if (isDrone && hasPackage) return 'drone+package'
    if (isDrone) return 'drone'
    if (isPkg) return 'package'
    if (isTarget) return 'target'
    return 'empty'
  }

  const CELL_DISPLAY: Record<Cell, string> = {
    empty: '',
    drone: '🛸',
    package: '📦',
    target: '🎯',
    obstacle: '🪨',
    'drone+package': '🛸📦',
  }

  if (done && !running) {
    return (
      <div className="bg-brand-panel border border-green-500/40 rounded-2xl p-8 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-black text-white mb-2">{t('missionComplete')}</h2>
        <p className="text-gray-400 mb-4">Mission {missionNumber} completed!</p>
        <div className="text-4xl font-black text-brand-gold mb-2">{score}</div>
        <p className="text-gray-400 text-sm mb-6">{t('score')}</p>
        <p className="text-green-400 font-bold mb-6">+150 XP</p>
        {missionNumber === 1 ? (
          <button
            onClick={() => { setDone(false); setProgram([]); reset() }}
            className="px-6 py-3 bg-brand-blue text-white font-bold rounded-xl hover:bg-blue-500 transition-colors"
          >
            {t('nextMission')} →
          </button>
        ) : (
          <a href="../roles" className="inline-block px-6 py-3 bg-brand-panel border border-brand-blue text-brand-blue font-bold rounded-xl hover:bg-brand-blue hover:text-black transition-colors">
            {t('backToRoles')}
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="bg-brand-panel border border-brand-border rounded-2xl p-6">
      <h2 className="text-lg font-bold text-white mb-1">
        Mission {missionNumber}: {missionNumber === 1 ? t('drone.m1_title') : t('drone.m2_title')}
      </h2>
      <p className="text-gray-400 text-sm mb-6">
        {missionNumber === 1 ? t('drone.m1_desc') : t('drone.m2_desc')}
      </p>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Grid */}
        <div className="flex-shrink-0">
          <p className="text-xs text-gray-400 mb-2 uppercase font-bold">Simulation Grid</p>
          <div
            className="inline-grid gap-1 p-2 bg-brand-dark rounded-xl border border-brand-border"
            style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 2.5rem)` }}
          >
            {Array.from({ length: GRID_SIZE }, (_, y) =>
              Array.from({ length: GRID_SIZE }, (_, x) => {
                const cell = getCell(x, y)
                const isStart = mission.start[0] === x && mission.start[1] === y
                return (
                  <div
                    key={`${x}-${y}`}
                    className={`w-10 h-10 rounded-md flex items-center justify-center text-lg border transition-all ${
                      cell === 'obstacle' ? 'bg-gray-800 border-gray-700' :
                      cell === 'target' ? 'bg-purple-900/40 border-purple-500' :
                      isStart && cell === 'empty' ? 'bg-blue-900/20 border-blue-800' :
                      'bg-brand-panel border-brand-border'
                    } ${crashed && cell.includes('drone') ? 'bg-red-900/40 border-red-500' : ''}`}
                  >
                    {CELL_DISPLAY[cell]}
                  </div>
                )
              })
            )}
          </div>
          <div className="flex gap-4 mt-2 text-xs text-gray-500">
            <span>🛸 Drone</span>
            <span>📦 Package</span>
            <span>🎯 Target</span>
            {missionNumber === 2 && <span>🪨 Obstacle</span>}
          </div>
          {crashed && (
            <p className="text-red-400 text-sm mt-2 font-bold">💥 Crashed! Reset and try again.</p>
          )}
        </div>

        {/* Programming panel */}
        <div className="flex-1 space-y-4">
          {/* Block palette */}
          <div>
            <p className="text-xs text-gray-400 mb-2 uppercase font-bold">Code Blocks</p>
            <div className="flex flex-wrap gap-2">
              {BLOCKS.map(block => (
                <button
                  key={block.id}
                  onClick={() => addBlock(block)}
                  disabled={running}
                  className="px-3 py-2 rounded-lg text-sm font-bold text-white border transition-all hover:scale-105 disabled:opacity-50"
                  style={{ backgroundColor: `${block.color}33`, borderColor: block.color }}
                >
                  {block.label}
                </button>
              ))}
            </div>
          </div>

          {/* Program */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs text-gray-400 uppercase font-bold">
                Your Program ({program.length}/12 blocks)
              </p>
              <button
                onClick={() => setProgram([])}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors"
              >
                Clear all
              </button>
            </div>
            <div className="min-h-16 bg-brand-dark border border-brand-border rounded-xl p-3 flex flex-wrap gap-2">
              {program.length === 0 && (
                <p className="text-gray-600 text-sm">Add code blocks above...</p>
              )}
              {program.map((block, idx) => (
                <button
                  key={block.id}
                  onClick={() => !running && removeBlock(idx)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold text-white border transition-all ${
                    step === idx ? 'scale-110 ring-2 ring-white' : 'hover:opacity-70'
                  }`}
                  style={{ backgroundColor: `${block.color}55`, borderColor: block.color }}
                  title="Click to remove"
                >
                  {block.label}
                </button>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            <button
              onClick={runProgram}
              disabled={running || program.length === 0}
              className="px-6 py-3 bg-brand-blue hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center gap-2"
            >
              {running ? '▶ Running...' : '▶ Run Program'}
            </button>
            <button
              onClick={() => { reset(); setProgram([]) }}
              disabled={running}
              className="px-4 py-3 bg-brand-panel border border-brand-border hover:border-brand-blue text-white font-bold rounded-xl transition-colors"
            >
              Reset
            </button>
          </div>

          <p className="text-xs text-gray-500">
            💡 Tip: Pick up the 📦 package, then navigate to the 🎯 target and drop it. Shorter programs score higher!
          </p>
        </div>
      </div>
    </div>
  )
}
