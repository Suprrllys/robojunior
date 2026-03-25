'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { completeMission } from '@/lib/game/scoring'
import { fireGameToast } from '@/components/game/GameToast'

type ModuleCategory = 'body' | 'arms' | 'locomotion' | 'sensors'

interface Module {
  id: string
  category: ModuleCategory
  name: string
  emoji: string
  cost: number
  strength: number
  precision: number
  speed: number
  desc: string
}

const MODULES: Module[] = [
  // Body
  { id: 'body_light', category: 'body', name: 'Light Frame', emoji: '🪶', cost: 20, strength: 2, precision: 3, speed: 5, desc: 'Lightweight, fast but fragile' },
  { id: 'body_standard', category: 'body', name: 'Standard Frame', emoji: '🤖', cost: 35, strength: 4, precision: 4, speed: 3, desc: 'Balanced all-around frame' },
  { id: 'body_heavy', category: 'body', name: 'Heavy Frame', emoji: '🦾', cost: 50, strength: 7, precision: 2, speed: 1, desc: 'Maximum strength, slow' },

  // Arms
  { id: 'arms_clamp', category: 'arms', name: 'Clamp Arms', emoji: '🔧', cost: 15, strength: 3, precision: 2, speed: 2, desc: 'Simple grippers' },
  { id: 'arms_precise', category: 'arms', name: 'Precision Arms', emoji: '🦿', cost: 30, strength: 2, precision: 6, speed: 3, desc: 'Delicate manipulation' },
  { id: 'arms_power', category: 'arms', name: 'Power Arms', emoji: '💪', cost: 40, strength: 6, precision: 2, speed: 2, desc: 'Heavy lifting' },

  // Locomotion
  { id: 'loco_wheels', category: 'locomotion', name: 'Wheels', emoji: '🛞', cost: 10, strength: 1, precision: 2, speed: 6, desc: 'Fast on flat surfaces' },
  { id: 'loco_tracks', category: 'locomotion', name: 'Tracks', emoji: '⛓️', cost: 25, strength: 4, precision: 3, speed: 3, desc: 'Steady on any terrain' },
  { id: 'loco_legs', category: 'locomotion', name: 'Legs', emoji: '🦵', cost: 35, strength: 3, precision: 5, speed: 2, desc: 'Precise positioning' },

  // Sensors
  { id: 'sens_basic', category: 'sensors', name: 'Basic Camera', emoji: '📷', cost: 10, strength: 0, precision: 2, speed: 1, desc: 'Simple vision' },
  { id: 'sens_laser', category: 'sensors', name: 'Laser Scanner', emoji: '🔴', cost: 25, strength: 0, precision: 5, speed: 2, desc: 'High precision scanning' },
  { id: 'sens_ai', category: 'sensors', name: 'AI Vision', emoji: '🧠', cost: 40, strength: 0, precision: 7, speed: 3, desc: 'Smart object recognition' },
]

interface Mission {
  budget: number
  reqStrength: number
  reqPrecision: number
  reqSpeed: number
  label: string
  hint: string
}

const MISSIONS: Mission[] = [
  {
    budget: 100,
    reqStrength: 5,
    reqPrecision: 3,
    reqSpeed: 2,
    label: 'Pipeline Assembly',
    hint: 'Needs strength to handle heavy pipes. Budget: 100',
  },
  {
    budget: 120,
    reqStrength: 3,
    reqPrecision: 7,
    reqSpeed: 4,
    label: 'Microchip Soldering',
    hint: 'Needs precision for tiny components and decent speed. Budget: 120',
  },
]

interface RobotGameProps {
  userId: string
  missionNumber: number
  isCompleted: boolean
}

const CATEGORIES: ModuleCategory[] = ['body', 'arms', 'locomotion', 'sensors']
const CATEGORY_LABELS: Record<ModuleCategory, string> = {
  body: '🏗️ Body',
  arms: '🤲 Arms',
  locomotion: '🚗 Locomotion',
  sensors: '👁️ Sensors',
}

export default function RobotGame({ userId, missionNumber, isCompleted }: RobotGameProps) {
  const t = useTranslations('missions')
  const mission = MISSIONS[missionNumber - 1]

  const [selected, setSelected] = useState<Partial<Record<ModuleCategory, Module>>>({})
  const [done, setDone] = useState(isCompleted)
  const [score, setScore] = useState(0)
  const [tested, setTested] = useState(false)
  const [testResult, setTestResult] = useState<{ pass: boolean; message: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [startTime] = useState(Date.now())

  const totalCost = Object.values(selected).reduce((s, m) => s + (m?.cost ?? 0), 0)
  const totalStrength = Object.values(selected).reduce((s, m) => s + (m?.strength ?? 0), 0)
  const totalPrecision = Object.values(selected).reduce((s, m) => s + (m?.precision ?? 0), 0)
  const totalSpeed = Object.values(selected).reduce((s, m) => s + (m?.speed ?? 0), 0)
  const allSelected = CATEGORIES.every(c => selected[c])

  function selectModule(mod: Module) {
    setSelected(prev => ({ ...prev, [mod.category]: mod }))
    setTested(false)
    setTestResult(null)
  }

  function testRobot() {
    if (!allSelected) return
    if (totalCost > mission.budget) {
      setTestResult({ pass: false, message: `Over budget! You spent ${totalCost} but limit is ${mission.budget}.` })
      setTested(true)
      return
    }

    const strengthOk = totalStrength >= mission.reqStrength
    const precisionOk = totalPrecision >= mission.reqPrecision
    const speedOk = totalSpeed >= mission.reqSpeed

    const fails = []
    if (!strengthOk) fails.push(`Strength ${totalStrength}/${mission.reqStrength}`)
    if (!precisionOk) fails.push(`Precision ${totalPrecision}/${mission.reqPrecision}`)
    if (!speedOk) fails.push(`Speed ${totalSpeed}/${mission.reqSpeed}`)

    if (fails.length > 0) {
      setTestResult({ pass: false, message: `Mission requirements not met: ${fails.join(', ')}` })
    } else {
      const budgetEfficiency = Math.round(((mission.budget - totalCost) / mission.budget) * 30)
      const statBonus = Math.min(20, (totalStrength - mission.reqStrength + totalPrecision - mission.reqPrecision + totalSpeed - mission.reqSpeed) * 2)
      const elapsed = (Date.now() - startTime) / 1000
      const timeBonus = Math.max(0, 10 - Math.floor(elapsed / 30))
      const finalScore = Math.min(100, 60 + budgetEfficiency + statBonus + timeBonus)
      setScore(finalScore)
      setTestResult({ pass: true, message: `Robot passed all tests! Score: ${finalScore}` })
    }
    setTested(true)
  }

  async function submitMission() {
    if (!testResult?.pass) return
    setSaving(true)
    const elapsed = (Date.now() - startTime) / 1000
    await completeMission(userId, 'robot_constructor', missionNumber, score, {
      decision_time_avg: elapsed / 4,
      attempts: 1,
      style: totalCost < mission.budget * 0.8 ? 'analytical' : 'fast',
      precision_score: totalPrecision * 10,
      creativity_score: score - 60,
      teamwork_score: 0,
    })
    setSaving(false)
    setDone(true)
    fireGameToast({ xp: 150, score })
  }

  if (done && !saving) {
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
            onClick={() => { setDone(false); setSelected({}); setTested(false); setTestResult(null) }}
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
    <div className="bg-brand-panel border border-brand-border rounded-2xl p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">
          Mission {missionNumber}: {mission.label}
        </h2>
        <p className="text-gray-400 text-sm">{mission.hint}</p>
      </div>

      {/* Requirements */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '💪 Strength', req: mission.reqStrength, val: totalStrength },
          { label: '🎯 Precision', req: mission.reqPrecision, val: totalPrecision },
          { label: '⚡ Speed', req: mission.reqSpeed, val: totalSpeed },
        ].map(({ label, req, val }) => (
          <div key={label} className={`rounded-xl p-3 border text-center ${val >= req ? 'border-green-500/50 bg-green-900/10' : 'border-brand-border bg-brand-dark'}`}>
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className={`text-xl font-black ${val >= req ? 'text-green-400' : 'text-white'}`}>{val}</p>
            <p className="text-xs text-gray-500">need {req}+</p>
          </div>
        ))}
      </div>

      {/* Module picker */}
      <div className="space-y-4">
        {CATEGORIES.map(cat => {
          const catMods = MODULES.filter(m => m.category === cat)
          const chosen = selected[cat]
          return (
            <div key={cat}>
              <p className="text-xs font-bold text-gray-400 uppercase mb-2">{CATEGORY_LABELS[cat]}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {catMods.map(mod => {
                  const isChosen = chosen?.id === mod.id
                  return (
                    <button
                      key={mod.id}
                      onClick={() => selectModule(mod)}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        isChosen
                          ? 'border-brand-blue bg-blue-900/20'
                          : 'border-brand-border hover:border-gray-500 bg-brand-dark'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{mod.emoji}</span>
                        <span className="font-bold text-white text-sm">{mod.name}</span>
                        <span className="ml-auto text-brand-gold text-xs font-bold">{mod.cost}¢</span>
                      </div>
                      <p className="text-gray-500 text-xs mb-1">{mod.desc}</p>
                      <div className="flex gap-2 text-xs text-gray-400">
                        <span>💪{mod.strength}</span>
                        <span>🎯{mod.precision}</span>
                        <span>⚡{mod.speed}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Budget & actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className={`text-sm font-bold ${totalCost > mission.budget ? 'text-red-400' : 'text-gray-300'}`}>
          Budget: <span className={totalCost > mission.budget ? 'text-red-400' : 'text-brand-gold'}>{totalCost}</span> / {mission.budget}
          {!allSelected && <span className="text-gray-500 font-normal ml-2">(select all 4 modules)</span>}
        </div>
        <div className="flex gap-3">
          <button
            onClick={testRobot}
            disabled={!allSelected}
            className="px-5 py-2.5 bg-brand-blue hover:bg-blue-500 disabled:opacity-40 text-white font-bold rounded-xl transition-colors"
          >
            🔬 Test Robot
          </button>
          {testResult?.pass && (
            <button
              onClick={submitMission}
              disabled={saving}
              className="px-5 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-bold rounded-xl transition-colors"
            >
              {saving ? 'Saving...' : '✅ Submit'}
            </button>
          )}
        </div>
      </div>

      {testResult && (
        <div className={`rounded-xl p-4 border text-sm font-medium ${
          testResult.pass
            ? 'bg-green-900/20 border-green-500/50 text-green-300'
            : 'bg-red-900/20 border-red-500/50 text-red-300'
        }`}>
          {testResult.pass ? '✅' : '❌'} {testResult.message}
        </div>
      )}

      <p className="text-xs text-gray-500">
        💡 Tip: Meet the minimum requirements for all stats and stay within budget. Leftover budget = bonus points!
      </p>
    </div>
  )
}
