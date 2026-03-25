'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { completeMission } from '@/lib/game/scoring'
import { fireGameToast } from '@/components/game/GameToast'

interface Choice {
  id: string
  text: string
  impact: { management: number; creativity: number; teamwork: number }
  feedback: string
}

interface Scene {
  id: string
  situation: string
  context: string
  choices: Choice[]
}

const MISSION_1_SCENES: Scene[] = [
  {
    id: 'team',
    situation: 'Building Your Team',
    context: 'You are launching an EdTech startup for Saudi schools. You have budget for 2 hires. Who do you bring on first?',
    choices: [
      {
        id: 'dev_designer',
        text: '👨‍💻 Developer + 🎨 Designer — build the product fast',
        impact: { management: 1, creativity: 3, teamwork: 1 },
        feedback: 'Good call! A strong product MVP attracts early users and investors.',
      },
      {
        id: 'sales_dev',
        text: '📞 Sales + 👨‍💻 Developer — validate market first',
        impact: { management: 3, creativity: 1, teamwork: 2 },
        feedback: 'Smart! Talking to customers early prevents building the wrong thing.',
      },
      {
        id: 'all_rounders',
        text: '🦸 2 all-rounders who can do everything',
        impact: { management: 2, creativity: 2, teamwork: 2 },
        feedback: 'Flexible approach. Generalists help in early stages, but may slow down later.',
      },
    ],
  },
  {
    id: 'product',
    situation: 'Product Strategy',
    context: 'Your first prototype is ready. Teachers love it but students find it boring. What do you do?',
    choices: [
      {
        id: 'pivot_students',
        text: '🎮 Redesign for students — gamify the experience',
        impact: { management: 1, creativity: 4, teamwork: 1 },
        feedback: 'Bold move! Students are the actual users. Engagement drives adoption.',
      },
      {
        id: 'keep_teachers',
        text: '📚 Keep teacher focus — they decide what schools buy',
        impact: { management: 3, creativity: 1, teamwork: 2 },
        feedback: 'Logical. B2B decision-makers are often different from end users.',
      },
      {
        id: 'both',
        text: '🤝 Run 2-week sprints alternating focus',
        impact: { management: 2, creativity: 3, teamwork: 3 },
        feedback: 'Iterative approach! Balancing both stakeholders is harder but powerful.',
      },
    ],
  },
  {
    id: 'funding',
    situation: 'Funding Opportunity',
    context: 'An investor offers $200K for 30% of your startup. Another path: apply for a Saudi Vision 2030 grant ($150K, no equity). Which do you choose?',
    choices: [
      {
        id: 'investor',
        text: '💰 Take the investor deal — 30% equity',
        impact: { management: 3, creativity: 2, teamwork: 1 },
        feedback: 'Investors bring mentorship and network, not just money. Good long-term bet.',
      },
      {
        id: 'grant',
        text: '🏛️ Apply for the Vision 2030 grant',
        impact: { management: 2, creativity: 1, teamwork: 3 },
        feedback: 'Grants keep you fully in control. Strong alignment with national goals helps.',
      },
      {
        id: 'bootstrap',
        text: '🚀 Skip both — grow via revenue, stay independent',
        impact: { management: 1, creativity: 4, teamwork: 2 },
        feedback: 'Bootstrapping forces discipline and creativity. Hardest but most sustainable.',
      },
    ],
  },
]

const MISSION_2_SCENES: Scene[] = [
  {
    id: 'market',
    situation: 'Market Decision',
    context: 'Your Saudi EdTech startup hit $50K MRR. You can scale locally OR expand to Russia and India. What is your move?',
    choices: [
      {
        id: 'scale_local',
        text: '🇸🇦 Scale Saudi first — dominate the home market',
        impact: { management: 3, creativity: 1, teamwork: 2 },
        feedback: 'Smart! Deep local dominance creates a strong defensible base before going global.',
      },
      {
        id: 'expand_brics',
        text: '🌍 Expand to Russia + India simultaneously',
        impact: { management: 2, creativity: 3, teamwork: 3 },
        feedback: 'Ambitious! BRICS+ markets are huge but require localization investment.',
      },
      {
        id: 'partner',
        text: '🤝 Find local partners in each country — asset-light',
        impact: { management: 3, creativity: 2, teamwork: 4 },
        feedback: 'Partnership model lowers risk and leverages local expertise. Excellent strategic thinking.',
      },
    ],
  },
  {
    id: 'competition',
    situation: 'Competitive Threat',
    context: 'Google just announced a free EdTech tool for BRICS schools. Your paid product is at risk. How do you respond?',
    choices: [
      {
        id: 'differentiate',
        text: '🎯 Go deeper — serve a niche Google never will',
        impact: { management: 2, creativity: 4, teamwork: 2 },
        feedback: 'Perfect response! Big players can\'t focus on specific niches. Go where they won\'t.',
      },
      {
        id: 'free_tier',
        text: '🆓 Launch a free tier — compete head-on',
        impact: { management: 3, creativity: 2, teamwork: 1 },
        feedback: 'Brave. Freemium can grow users but compresses margins. Needs careful modeling.',
      },
      {
        id: 'pivot',
        text: '🔄 Pivot to teacher training — adjacent market',
        impact: { management: 1, creativity: 3, teamwork: 3 },
        feedback: 'Creative pivot! Teacher training is underserved and complements your expertise.',
      },
    ],
  },
  {
    id: 'leadership',
    situation: 'Team Crisis',
    context: 'Your lead developer wants to leave for a higher salary at Aramco. You cannot match their offer. What do you do?',
    choices: [
      {
        id: 'equity',
        text: '📊 Offer equity + flexible hours instead of salary',
        impact: { management: 3, creativity: 2, teamwork: 3 },
        feedback: 'Smart! Equity aligns long-term interests. Many great engineers prefer ownership.',
      },
      {
        id: 'knowledge_transfer',
        text: '📚 Negotiate 3-month transition to document everything',
        impact: { management: 4, creativity: 1, teamwork: 2 },
        feedback: 'Mature leadership. Knowledge transfer protects the company and respects the employee.',
      },
      {
        id: 'counter',
        text: '🙏 Be honest about constraints — let them decide freely',
        impact: { management: 2, creativity: 1, teamwork: 4 },
        feedback: 'Authentic leadership builds trust. The team sees how you treat people on the way out.',
      },
    ],
  },
]

interface EntrepreneurGameProps {
  userId: string
  missionNumber: number
  isCompleted: boolean
}

export default function EntrepreneurGame({ userId, missionNumber, isCompleted }: EntrepreneurGameProps) {
  const t = useTranslations('missions')
  const scenes = missionNumber === 1 ? MISSION_1_SCENES : MISSION_2_SCENES

  const [sceneIdx, setSceneIdx] = useState(0)
  const [chosen, setChosen] = useState<Choice | null>(null)
  const [answers, setAnswers] = useState<Choice[]>([])
  const [done, setDone] = useState(isCompleted)
  const [score, setScore] = useState(0)
  const [saving, setSaving] = useState(false)
  const [startTime] = useState(Date.now())

  const scene = scenes[sceneIdx]
  const isLastScene = sceneIdx === scenes.length - 1

  function selectChoice(choice: Choice) {
    setChosen(choice)
  }

  function next() {
    if (!chosen) return
    const newAnswers = [...answers, chosen]
    setAnswers(newAnswers)

    if (isLastScene) {
      finishMission(newAnswers)
    } else {
      setSceneIdx(prev => prev + 1)
      setChosen(null)
    }
  }

  async function finishMission(allAnswers: Choice[]) {
    const mgmt = allAnswers.reduce((s, a) => s + a.impact.management, 0)
    const creativity = allAnswers.reduce((s, a) => s + a.impact.creativity, 0)
    const team = allAnswers.reduce((s, a) => s + a.impact.teamwork, 0)
    const maxPossible = allAnswers.length * 4

    const normalized = Math.round(((mgmt + creativity + team) / (maxPossible * 3)) * 100)
    const elapsed = (Date.now() - startTime) / 1000
    const timeBonus = Math.max(0, 10 - Math.floor(elapsed / 60))
    const finalScore = Math.min(100, 55 + normalized / 2 + timeBonus)

    setScore(finalScore)
    setSaving(true)

    await completeMission(userId, 'entrepreneur', missionNumber, finalScore, {
      decision_time_avg: elapsed / allAnswers.length,
      attempts: 1,
      style: mgmt >= creativity ? 'analytical' : 'fast',
      precision_score: mgmt * 10,
      creativity_score: creativity * 10,
      teamwork_score: team * 10,
    })

    setSaving(false)
    setDone(true)
    fireGameToast({ xp: 150, score: finalScore })
  }

  if (saving) {
    return (
      <div className="bg-brand-panel border border-brand-border rounded-2xl p-8 text-center">
        <div className="text-4xl mb-4 animate-pulse">💼</div>
        <p className="text-gray-400">Saving your results...</p>
      </div>
    )
  }

  if (done) {
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
            onClick={() => { setDone(false); setSceneIdx(0); setChosen(null); setAnswers([]) }}
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
      {/* Progress */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400 font-bold uppercase">Decision {sceneIdx + 1} of {scenes.length}</span>
        <div className="flex-1 bg-brand-dark rounded-full h-1.5">
          <div
            className="bg-brand-blue h-1.5 rounded-full transition-all"
            style={{ width: `${((sceneIdx + (chosen ? 1 : 0)) / scenes.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Scene */}
      <div>
        <p className="text-xs font-bold text-yellow-400 uppercase mb-2">📋 {scene.situation}</p>
        <p className="text-white font-medium leading-relaxed">{scene.context}</p>
      </div>

      {/* Choices */}
      <div className="space-y-3">
        {scene.choices.map(choice => {
          const isSelected = chosen?.id === choice.id
          return (
            <button
              key={choice.id}
              onClick={() => selectChoice(choice)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                isSelected
                  ? 'border-brand-blue bg-blue-900/20'
                  : 'border-brand-border hover:border-gray-500 bg-brand-dark'
              }`}
            >
              <p className="text-white text-sm font-medium">{choice.text}</p>
            </button>
          )
        })}
      </div>

      {/* Feedback after selection */}
      {chosen && (
        <div className="bg-brand-dark border border-yellow-500/30 rounded-xl p-4">
          <p className="text-yellow-300 text-sm">💡 {chosen.feedback}</p>
        </div>
      )}

      {/* Continue button */}
      <div className="flex justify-end">
        <button
          onClick={next}
          disabled={!chosen}
          className="px-6 py-3 bg-brand-blue hover:bg-blue-500 disabled:opacity-40 text-white font-bold rounded-xl transition-colors"
        >
          {isLastScene ? '✅ Submit Decisions' : 'Next →'}
        </button>
      </div>

      <p className="text-xs text-gray-500">
        💡 Tip: There is no single right answer — your choices reflect your leadership style and affect your competency profile.
      </p>
    </div>
  )
}
