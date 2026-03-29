'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { completeMission } from '@/lib/game/scoring'
import { getMissionConfig } from '@/lib/game/missions'
import { fireGameToast } from '@/components/game/GameToast'
import type { Difficulty, MissionResult } from '@/types/game'

/* ─── Types ─── */

interface SceneOption {
  id: string
  textKey: string
  feedbackKey: string
  profit: number
  morale: number
  marketShare: number
}

interface SceneData {
  id: string
  titleKey: string
  contextKey: string
  options: SceneOption[]
  backdrop: 'city' | 'office' | 'market' | 'tech'
}

interface MarketShock {
  textKey: string
  profitDelta: number
  moraleDelta: number
}

/* ─── Scene Definitions ─── */

const MISSION_1_ALL_SCENES: SceneData[] = [
  {
    id: 'm1s1', titleKey: 'entrepreneur.m1s1_title', contextKey: 'entrepreneur.m1s1_context', backdrop: 'city',
    options: [
      { id: 'sa', textKey: 'entrepreneur.m1s1_opt1', feedbackKey: 'entrepreneur.m1s1_fb1', profit: 25, morale: 10, marketShare: 20 },
      { id: 'ru', textKey: 'entrepreneur.m1s1_opt2', feedbackKey: 'entrepreneur.m1s1_fb2', profit: 15, morale: 15, marketShare: 15 },
      { id: 'in', textKey: 'entrepreneur.m1s1_opt3', feedbackKey: 'entrepreneur.m1s1_fb3', profit: 10, morale: 20, marketShare: 25 },
    ],
  },
  {
    id: 'm1s2', titleKey: 'entrepreneur.m1s2_title', contextKey: 'entrepreneur.m1s2_context', backdrop: 'office',
    options: [
      { id: 'angel', textKey: 'entrepreneur.m1s2_opt1', feedbackKey: 'entrepreneur.m1s2_fb1', profit: 25, morale: 10, marketShare: 15 },
      { id: 'loan', textKey: 'entrepreneur.m1s2_opt2', feedbackKey: 'entrepreneur.m1s2_fb2', profit: 15, morale: 15, marketShare: 10 },
      { id: 'boot', textKey: 'entrepreneur.m1s2_opt3', feedbackKey: 'entrepreneur.m1s2_fb3', profit: 10, morale: 25, marketShare: 20 },
    ],
  },
  {
    id: 'm1s3', titleKey: 'entrepreneur.m1s3_title', contextKey: 'entrepreneur.m1s3_context', backdrop: 'market',
    options: [
      { id: 'elite', textKey: 'entrepreneur.m1s3_opt1', feedbackKey: 'entrepreneur.m1s3_fb1', profit: 20, morale: 10, marketShare: 15 },
      { id: 'large', textKey: 'entrepreneur.m1s3_opt2', feedbackKey: 'entrepreneur.m1s3_fb2', profit: 10, morale: 20, marketShare: 20 },
      { id: 'remote', textKey: 'entrepreneur.m1s3_opt3', feedbackKey: 'entrepreneur.m1s3_fb3', profit: 15, morale: 25, marketShare: 15 },
    ],
  },
  {
    id: 'm1s4', titleKey: 'entrepreneur.m1s4_title', contextKey: 'entrepreneur.m1s4_context', backdrop: 'tech',
    options: [
      { id: 'premium', textKey: 'entrepreneur.m1s4_opt1', feedbackKey: 'entrepreneur.m1s4_fb1', profit: 25, morale: 15, marketShare: 10 },
      { id: 'b2b', textKey: 'entrepreneur.m1s4_opt2', feedbackKey: 'entrepreneur.m1s4_fb2', profit: 20, morale: 20, marketShare: 15 },
      { id: 'freemium', textKey: 'entrepreneur.m1s4_opt3', feedbackKey: 'entrepreneur.m1s4_fb3', profit: 10, morale: 10, marketShare: 25 },
    ],
  },
]

const MISSION_2_ALL_SCENES: SceneData[] = [
  {
    id: 'm2s1', titleKey: 'entrepreneur.m2s1_title', contextKey: 'entrepreneur.m2s1_context', backdrop: 'city',
    options: [
      { id: 'me', textKey: 'entrepreneur.m2s1_opt1', feedbackKey: 'entrepreneur.m2s1_fb1', profit: 20, morale: 20, marketShare: 15 },
      { id: 'sea', textKey: 'entrepreneur.m2s1_opt2', feedbackKey: 'entrepreneur.m2s1_fb2', profit: 15, morale: 15, marketShare: 25 },
      { id: 'af', textKey: 'entrepreneur.m2s1_opt3', feedbackKey: 'entrepreneur.m2s1_fb3', profit: 10, morale: 10, marketShare: 20 },
    ],
  },
  {
    id: 'm2s2', titleKey: 'entrepreneur.m2s2_title', contextKey: 'entrepreneur.m2s2_context', backdrop: 'tech',
    options: [
      { id: 'hw', textKey: 'entrepreneur.m2s2_opt1', feedbackKey: 'entrepreneur.m2s2_fb1', profit: 15, morale: 10, marketShare: 20 },
      { id: 'sw', textKey: 'entrepreneur.m2s2_opt2', feedbackKey: 'entrepreneur.m2s2_fb2', profit: 25, morale: 15, marketShare: 25 },
      { id: 'svc', textKey: 'entrepreneur.m2s2_opt3', feedbackKey: 'entrepreneur.m2s2_fb3', profit: 20, morale: 25, marketShare: 10 },
    ],
  },
  {
    id: 'm2s3', titleKey: 'entrepreneur.m2s3_title', contextKey: 'entrepreneur.m2s3_context', backdrop: 'office',
    options: [
      { id: 'local', textKey: 'entrepreneur.m2s3_opt1', feedbackKey: 'entrepreneur.m2s3_fb1', profit: 15, morale: 15, marketShare: 25 },
      { id: 'internal', textKey: 'entrepreneur.m2s3_opt2', feedbackKey: 'entrepreneur.m2s3_fb2', profit: 20, morale: 25, marketShare: 15 },
      { id: 'mba', textKey: 'entrepreneur.m2s3_opt3', feedbackKey: 'entrepreneur.m2s3_fb3', profit: 25, morale: 10, marketShare: 20 },
    ],
  },
  {
    id: 'm2s4', titleKey: 'entrepreneur.m2s4_title', contextKey: 'entrepreneur.m2s4_context', backdrop: 'market',
    options: [
      { id: 'acquire', textKey: 'entrepreneur.m2s4_opt1', feedbackKey: 'entrepreneur.m2s4_fb1', profit: 10, morale: 20, marketShare: 25 },
      { id: 'diff', textKey: 'entrepreneur.m2s4_opt2', feedbackKey: 'entrepreneur.m2s4_fb2', profit: 20, morale: 15, marketShare: 20 },
      { id: 'partner', textKey: 'entrepreneur.m2s4_opt3', feedbackKey: 'entrepreneur.m2s4_fb3', profit: 15, morale: 25, marketShare: 15 },
    ],
  },
]

const MARKET_SHOCKS: MarketShock[] = [
  { textKey: 'entrepreneur.shock_regulation', profitDelta: -15, moraleDelta: -10 },
  { textKey: 'entrepreneur.shock_viral', profitDelta: 10, moraleDelta: -5 },
  { textKey: 'entrepreneur.shock_currency', profitDelta: -20, moraleDelta: -5 },
  { textKey: 'entrepreneur.shock_talent', profitDelta: -10, moraleDelta: -15 },
]

function getScenesForDifficulty(missionNumber: number, difficulty: Difficulty): SceneData[] {
  const allScenes = missionNumber === 1 ? MISSION_1_ALL_SCENES : MISSION_2_ALL_SCENES
  const config = getMissionConfig('entrepreneur', missionNumber, difficulty)
  const count = config?.sceneCount ?? 2
  return allScenes.slice(0, count)
}

/* ─── SVG Backdrops ─── */

function CityBackdrop() {
  return (
    <svg viewBox="0 0 400 120" className="w-full h-28 opacity-30" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sky-city" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand-blue)" stopOpacity="0.6" />
          <stop offset="100%" stopColor="var(--brand-dark)" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <rect width="400" height="120" fill="url(#sky-city)" />
      <circle cx="350" cy="25" r="15" fill="#F59E0B" opacity="0.5" />
      <rect x="20" y="50" width="30" height="70" fill="#334155" rx="2" />
      <rect x="60" y="30" width="25" height="90" fill="#475569" rx="2" />
      <rect x="95" y="55" width="35" height="65" fill="#334155" rx="2" />
      <rect x="140" y="20" width="20" height="100" fill="#64748B" rx="2" />
      <rect x="170" y="45" width="40" height="75" fill="#475569" rx="2" />
      <rect x="220" y="35" width="28" height="85" fill="#334155" rx="2" />
      <rect x="258" y="60" width="35" height="60" fill="#64748B" rx="2" />
      <rect x="303" y="25" width="22" height="95" fill="#475569" rx="2" />
      <rect x="335" y="50" width="45" height="70" fill="#334155" rx="2" />
    </svg>
  )
}

function OfficeBackdrop() {
  return (
    <svg viewBox="0 0 400 120" className="w-full h-28 opacity-30" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sky-office" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366F1" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--brand-dark)" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <rect width="400" height="120" fill="url(#sky-office)" />
      <rect x="50" y="30" width="300" height="80" fill="#334155" rx="4" />
      <rect x="70" y="45" width="40" height="25" fill="#1E293B" rx="2" />
      <rect x="130" y="45" width="40" height="25" fill="#1E293B" rx="2" />
      <rect x="190" y="45" width="40" height="25" fill="#1E293B" rx="2" />
      <rect x="250" y="45" width="40" height="25" fill="#1E293B" rx="2" />
      <rect x="180" y="80" width="40" height="30" fill="#475569" rx="2" />
      <rect x="70" y="85" width="30" height="25" fill="#1E293B" rx="1" />
      <rect x="300" y="85" width="30" height="25" fill="#1E293B" rx="1" />
    </svg>
  )
}

function MarketBackdrop() {
  return (
    <svg viewBox="0 0 400 120" className="w-full h-28 opacity-30" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sky-market" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--brand-dark)" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <rect width="400" height="120" fill="url(#sky-market)" />
      <polygon points="30,100 80,100 55,40" fill="#334155" />
      <polygon points="100,100 160,100 130,50" fill="#475569" />
      <polygon points="180,100 250,100 215,35" fill="#334155" />
      <polygon points="270,100 330,100 300,55" fill="#475569" />
      <polygon points="340,100 390,100 365,45" fill="#334155" />
      <line x1="0" y1="100" x2="400" y2="100" stroke="#64748B" strokeWidth="2" />
    </svg>
  )
}

function TechBackdrop() {
  return (
    <svg viewBox="0 0 400 120" className="w-full h-28 opacity-30" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sky-tech" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--brand-dark)" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <rect width="400" height="120" fill="url(#sky-tech)" />
      <circle cx="200" cy="60" r="30" fill="none" stroke="#6366F1" strokeWidth="1" opacity="0.5" />
      <circle cx="200" cy="60" r="50" fill="none" stroke="#6366F1" strokeWidth="0.5" opacity="0.3" />
      <circle cx="200" cy="60" r="5" fill="#818CF8" opacity="0.6" />
      <line x1="200" y1="60" x2="260" y2="30" stroke="#818CF8" strokeWidth="0.5" opacity="0.4" />
      <circle cx="260" cy="30" r="3" fill="#818CF8" opacity="0.4" />
      <line x1="200" y1="60" x2="140" y2="30" stroke="#818CF8" strokeWidth="0.5" opacity="0.4" />
      <circle cx="140" cy="30" r="3" fill="#818CF8" opacity="0.4" />
      <line x1="200" y1="60" x2="150" y2="95" stroke="#818CF8" strokeWidth="0.5" opacity="0.4" />
      <circle cx="150" cy="95" r="3" fill="#818CF8" opacity="0.4" />
      <line x1="200" y1="60" x2="260" y2="90" stroke="#818CF8" strokeWidth="0.5" opacity="0.4" />
      <circle cx="260" cy="90" r="3" fill="#818CF8" opacity="0.4" />
      <rect x="30" y="40" width="50" height="60" fill="#334155" rx="4" />
      <rect x="320" y="35" width="55" height="65" fill="#334155" rx="4" />
    </svg>
  )
}

const BACKDROP_MAP: Record<string, () => React.JSX.Element> = {
  city: CityBackdrop,
  office: OfficeBackdrop,
  market: MarketBackdrop,
  tech: TechBackdrop,
}

/* ─── Business Avatar SVG ─── */

function BusinessAvatar({ mood }: { mood: 'neutral' | 'happy' | 'worried' }) {
  const mouthColor = mood === 'happy' ? '#10B981' : mood === 'worried' ? '#EF4444' : '#94A3B8'
  return (
    <svg viewBox="0 0 60 80" className="w-12 h-16 shrink-0">
      <rect x="15" y="35" width="30" height="40" rx="4" fill="#334155" />
      <circle cx="30" cy="22" r="16" fill="#64748B" />
      <circle cx="24" cy="19" r="2" fill="#E2E8F0" />
      <circle cx="36" cy="19" r="2" fill="#E2E8F0" />
      {mood === 'happy' && <path d="M22 28 Q30 35 38 28" stroke={mouthColor} fill="none" strokeWidth="2" strokeLinecap="round" />}
      {mood === 'worried' && <path d="M22 32 Q30 26 38 32" stroke={mouthColor} fill="none" strokeWidth="2" strokeLinecap="round" />}
      {mood === 'neutral' && <line x1="23" y1="30" x2="37" y2="30" stroke={mouthColor} strokeWidth="2" strokeLinecap="round" />}
    </svg>
  )
}

/* ─── Metrics Bar ─── */

function MetricsBar({ label, value, color }: { label: string; value: number; color: string }) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 w-24 shrink-0 font-medium">{label}</span>
      <div className="flex-1 bg-[var(--brand-dark)] rounded-full h-3 overflow-hidden">
        <div
          className="h-3 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-bold text-white w-8 text-right">{clamped}%</span>
    </div>
  )
}

/* ─── Main Component ─── */

interface EntrepreneurGameProps {
  userId: string
  missionNumber: number
  difficulty: Difficulty
  isCompleted: boolean
  onComplete?: (score: number) => void
}

export default function EntrepreneurGame({ userId, missionNumber, difficulty, isCompleted, onComplete }: EntrepreneurGameProps) {
  const t = useTranslations('game')
  const tMissions = useTranslations('missions')
  const router = useRouter()

  const scenes = getScenesForDifficulty(missionNumber, difficulty)
  const isHard = difficulty === 'hard'
  const HARD_TIME_LIMIT = 120

  const [sceneIdx, setSceneIdx] = useState(0)
  const [selected, setSelected] = useState<SceneOption | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [answers, setAnswers] = useState<SceneOption[]>([])

  // Metrics
  const [profit, setProfit] = useState(50)
  const [morale, setMorale] = useState(50)
  const [marketShare, setMarketShare] = useState(50)

  // Market shocks (hard mode)
  const [activeShock, setActiveShock] = useState<MarketShock | null>(null)
  const [shocksUsed, setShocksUsed] = useState<number[]>([])
  const [shockTimer, setShockTimer] = useState(0)

  // Timer (hard mode)
  const [timeLeft, setTimeLeft] = useState(HARD_TIME_LIMIT)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Completion state
  const [done, setDone] = useState(isCompleted)
  const [score, setScore] = useState(0)
  const [saving, setSaving] = useState(false)
  const [missionResult, setMissionResult] = useState<MissionResult | null>(null)
  const [startTime] = useState(Date.now())

  // Scene transition — use transitionend instead of setTimeout
  const [slideDir, setSlideDir] = useState<'in' | 'out'>('in')
  const [pendingAdvance, setPendingAdvance] = useState(false)
  const slideRef = useRef<HTMLDivElement>(null)

  const scene = scenes[sceneIdx]
  const isLastScene = sceneIdx === scenes.length - 1

  // Use refs for values needed in handleFinish to avoid stale closures
  const profitRef = useRef(profit)
  const moraleRef = useRef(morale)
  const marketShareRef = useRef(marketShare)
  const answersRef = useRef(answers)
  profitRef.current = profit
  moraleRef.current = morale
  marketShareRef.current = marketShare
  answersRef.current = answers

  // Hard mode timer
  useEffect(() => {
    if (isHard && !done && !saving) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isHard, done, saving])

  const handleFinish = useCallback(async (allAnswers: SceneOption[]) => {
    if (timerRef.current) clearInterval(timerRef.current)
    setSaving(true)

    const profitPct = profitRef.current
    const currentMorale = moraleRef.current
    const currentMarketShare = marketShareRef.current
    const moraleFactor = 0.5 + (currentMorale / 100) * 0.5
    const elapsed = (Date.now() - startTime) / 1000
    const speedBonus = isHard && elapsed < HARD_TIME_LIMIT ? 1.0 + (1 - elapsed / HARD_TIME_LIMIT) * 0.2 : 1.0
    const rawScore = profitPct * moraleFactor * speedBonus
    const finalScore = Math.round(Math.min(100, rawScore))

    setScore(finalScore)

    try {
      const result = await completeMission(userId, 'entrepreneur', missionNumber, difficulty, finalScore, {
        decision_time_avg: elapsed / Math.max(allAnswers.length, 1),
        attempts: 1,
        style: profitPct >= currentMorale ? 'analytical' : 'balanced',
        precision_score: profitPct,
        creativity_score: currentMarketShare,
        teamwork_score: currentMorale,
      })
      setMissionResult(result)
      fireGameToast({ xp: result.xpEarned, score: finalScore, badge: result.newBadges?.[0] })
    } catch {
      fireGameToast({ xp: 0, score: finalScore })
    }

    setSaving(false)
    setDone(true)
    onComplete?.(finalScore)
    router.refresh()
  }, [userId, missionNumber, difficulty, isHard, startTime, HARD_TIME_LIMIT, onComplete, router])

  // Auto-finish when timer runs out
  useEffect(() => {
    if (isHard && timeLeft === 0 && !done && !saving) {
      handleFinish([...answersRef.current])
    }
  }, [timeLeft, isHard, done, saving, handleFinish])

  const selectOption = useCallback((opt: SceneOption) => {
    if (showFeedback) return
    setSelected(opt)
    setShowFeedback(true)
    setProfit(prev => Math.max(0, Math.min(100, prev + opt.profit)))
    setMorale(prev => Math.max(0, Math.min(100, prev + opt.morale)))
    setMarketShare(prev => Math.max(0, Math.min(100, prev + opt.marketShare)))
  }, [showFeedback])

  const advanceScene = useCallback(() => {
    setSceneIdx(prev => prev + 1)
    setSelected(null)
    setShowFeedback(false)
    setSlideDir('in')
  }, [])

  // Shock display timer via useEffect
  useEffect(() => {
    if (shockTimer <= 0 || !activeShock) return
    const id = setTimeout(() => {
      setShockTimer(0)
      setActiveShock(null)
      advanceScene()
    }, shockTimer)
    return () => clearTimeout(id)
  }, [shockTimer, activeShock, advanceScene])

  // Listen for transitionend on the slide container to advance after slide-out
  useEffect(() => {
    const el = slideRef.current
    if (!el || !pendingAdvance) return
    function onEnd(e: TransitionEvent) {
      if (e.propertyName !== 'transform') return
      setPendingAdvance(false)
      // Check for market shock in hard mode between scenes
      if (isHard && sceneIdx > 0 && sceneIdx < scenes.length - 2) {
        const availableShocks = MARKET_SHOCKS.filter((_, i) => !shocksUsed.includes(i))
        if (availableShocks.length > 0 && Math.random() > 0.4) {
          const shockIdx = MARKET_SHOCKS.indexOf(availableShocks[Math.floor(Math.random() * availableShocks.length)])
          const shock = MARKET_SHOCKS[shockIdx]
          setShocksUsed(prev => [...prev, shockIdx])
          setActiveShock(shock)
          setProfit(prev => Math.max(0, Math.min(100, prev + shock.profitDelta)))
          setMorale(prev => Math.max(0, Math.min(100, prev + shock.moraleDelta)))
          setShockTimer(2500)
          return
        }
      }
      advanceScene()
    }
    el.addEventListener('transitionend', onEnd)
    return () => el.removeEventListener('transitionend', onEnd)
  }, [pendingAdvance, isHard, sceneIdx, scenes.length, shocksUsed, advanceScene])

  const goNext = useCallback(() => {
    if (!selected) return
    const newAnswers = [...answers, selected]
    setAnswers(newAnswers)

    if (isLastScene) {
      handleFinish(newAnswers)
      return
    }

    setSlideDir('out')
    setPendingAdvance(true)
  }, [selected, answers, isLastScene, handleFinish])

  /* ─── Render: Saving ─── */
  if (saving) {
    return (
      <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl p-8 text-center">
        <div className="text-4xl mb-4 animate-pulse">💼</div>
        <p className="text-gray-400">{t('entrepreneur.saving')}</p>
      </div>
    )
  }

  /* ─── Render: Done ─── */
  if (done) {
    return (
      <div className="bg-[var(--brand-panel)] border border-green-500/40 rounded-2xl p-8 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-black text-white mb-2">{tMissions('missionComplete')}</h2>
        <div className="text-4xl font-black text-[var(--brand-gold)] mb-2">{score}</div>
        <p className="text-gray-400 text-sm mb-6">{tMissions('score')}</p>
        {missionResult?.isFirstCompletion && (
          <p className="text-green-400 font-bold mb-2">{t('common.firstCompletion')}</p>
        )}
        {missionResult?.isNewBestScore && !missionResult.isFirstCompletion && (
          <p className="text-yellow-400 font-bold mb-2">{t('common.newBestScore')}</p>
        )}
        {missionResult && missionResult.xpEarned > 0 && (
          <p className="text-green-400 font-bold mb-6">{t('common.reward')}: +{missionResult.xpEarned} XP</p>
        )}
        {missionNumber === 1 ? (
          <button
            onClick={() => {
              setDone(false)
              setSceneIdx(0)
              setSelected(null)
              setAnswers([])
              setProfit(50)
              setMorale(50)
              setMarketShare(50)
              setTimeLeft(HARD_TIME_LIMIT)
              setShocksUsed([])
              setMissionResult(null)
            }}
            className="px-6 py-3 bg-[var(--brand-blue)] text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
          >
            {tMissions('nextMission')} →
          </button>
        ) : (
          <a
            href="../roles"
            className="inline-block px-6 py-3 bg-[var(--brand-panel)] border border-[var(--brand-blue)] text-[var(--brand-blue)] font-bold rounded-xl hover:bg-[var(--brand-blue)] hover:text-black transition-colors"
          >
            {tMissions('backToRoles')}
          </a>
        )}
      </div>
    )
  }

  /* ─── Render: Market Shock Overlay ─── */
  if (activeShock) {
    return (
      <div className="bg-[var(--brand-panel)] border border-red-500/50 rounded-2xl p-8 text-center">
        <div className="text-5xl mb-4 animate-bounce">⚡</div>
        <h3 className="text-xl font-black text-red-400 mb-3">{t('entrepreneur.marketShock')}</h3>
        <p className="text-white font-medium leading-relaxed">{t(activeShock.textKey)}</p>
        <div className="mt-4 space-y-2 max-w-xs mx-auto">
          <MetricsBar label={t('entrepreneur.profit')} value={profit} color="#10B981" />
          <MetricsBar label={t('entrepreneur.morale')} value={morale} color="#3B82F6" />
        </div>
      </div>
    )
  }

  /* ─── Render: Game Scene ─── */
  const BackdropSvg = BACKDROP_MAP[scene.backdrop]
  const avatarMood = morale > 60 ? 'happy' : morale < 30 ? 'worried' : 'neutral'

  return (
    <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl overflow-hidden">
      {/* Backdrop */}
      <div className="relative">
        <BackdropSvg />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--brand-panel)]" />
      </div>

      <div
        ref={slideRef}
        className={clsx(
          'p-6 space-y-5 transition-all duration-300 ease-in-out',
          slideDir === 'in' && 'translate-x-0 opacity-100',
          slideDir === 'out' && '-translate-x-full opacity-0'
        )}
      >
        {/* Top bar: progress + timer */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-bold uppercase">
            {t('entrepreneur.decision', { current: sceneIdx + 1, total: scenes.length })}
          </span>
          <div className="flex-1 bg-[var(--brand-dark)] rounded-full h-1.5">
            <div
              className="bg-[var(--brand-blue)] h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${((sceneIdx + (showFeedback ? 1 : 0)) / scenes.length) * 100}%` }}
            />
          </div>
          {isHard && (
            <span className={clsx(
              'text-xs font-bold tabular-nums',
              timeLeft < 30 ? 'text-red-400' : 'text-gray-400'
            )}>
              {t('entrepreneur.timeRemaining', { seconds: timeLeft })}
            </span>
          )}
        </div>

        {/* Metrics Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[var(--brand-dark)] rounded-xl p-3">
          <MetricsBar label={t('entrepreneur.profit')} value={profit} color="#10B981" />
          <MetricsBar label={t('entrepreneur.morale')} value={morale} color="#3B82F6" />
          <MetricsBar label={t('entrepreneur.marketShare')} value={marketShare} color="#F59E0B" />
        </div>

        {/* Scene Title + Avatar */}
        <div className="flex items-start gap-3">
          <BusinessAvatar mood={avatarMood} />
          <div className="flex-1">
            <p className="text-xs font-bold text-[var(--brand-gold)] uppercase mb-1">
              {t(scene.titleKey)}
            </p>
            <p className="text-white font-medium leading-relaxed">
              {t(scene.contextKey)}
            </p>
          </div>
        </div>

        {/* Option Cards */}
        <div className="space-y-3">
          {scene.options.map(opt => {
            const isSelected = selected?.id === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => selectOption(opt)}
                disabled={showFeedback}
                className={clsx(
                  'w-full text-left p-4 rounded-xl border transition-all duration-200',
                  isSelected
                    ? 'border-[var(--brand-gold)] bg-yellow-900/20 scale-[1.02]'
                    : showFeedback
                      ? 'border-[var(--brand-border)] bg-[var(--brand-dark)] opacity-50'
                      : 'border-[var(--brand-border)] bg-[var(--brand-dark)] hover:border-gray-500 hover:scale-[1.02]'
                )}
              >
                <p className="text-white text-sm font-medium">
                  {t(opt.textKey)}
                </p>
              </button>
            )
          })}
        </div>

        {/* Feedback */}
        {showFeedback && selected && (
          <div className="bg-[var(--brand-dark)] border border-yellow-500/30 rounded-xl p-4 transition-all duration-300">
            <p className="text-yellow-300 text-sm">
              💡 {t(selected.feedbackKey)}
            </p>
          </div>
        )}

        {/* Continue Button */}
        <div className="flex justify-end">
          <button
            onClick={goNext}
            disabled={!showFeedback}
            className="px-6 py-3 bg-[var(--brand-blue)] hover:opacity-90 disabled:opacity-40 text-white font-bold rounded-xl transition-opacity"
          >
            {isLastScene ? t('entrepreneur.submit') : t('entrepreneur.nextScene')} →
          </button>
        </div>

        <p className="text-xs text-gray-500">
          💡 {t('entrepreneur.tip')}
        </p>
      </div>
    </div>
  )
}
