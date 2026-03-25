'use client'

import { useTranslations, useLocale } from 'next-intl'
import { useState } from 'react'
import type { CompetencyScore } from '@/types/database'

interface CareerRecommendationProps {
  competency: CompetencyScore | null
}

type Profession = {
  title: string
  emoji: string
  match: number
  reason: string
}

function getProfessions(scores: CompetencyScore | null): Profession[] {
  if (!scores) return []

  const professions = [
    {
      title: 'Robotics Engineer',
      emoji: '🤖',
      match: Math.round((scores.technical_precision * 0.4 + scores.analytical_thinking * 0.4 + scores.creativity * 0.2)),
      reason: 'You showed strong technical precision and analytical skills',
    },
    {
      title: 'Drone Systems Programmer',
      emoji: '🛸',
      match: Math.round((scores.analytical_thinking * 0.4 + scores.technical_precision * 0.3 + scores.learning_speed * 0.3)),
      reason: 'Your algorithmic thinking and quick learning stand out',
    },
    {
      title: 'Tech Entrepreneur',
      emoji: '💡',
      match: Math.round((scores.management * 0.4 + scores.creativity * 0.3 + scores.teamwork * 0.3)),
      reason: 'You demonstrated strong management and creative decision-making',
    },
    {
      title: 'AI/ML Engineer',
      emoji: '🧠',
      match: Math.round((scores.analytical_thinking * 0.5 + scores.learning_speed * 0.3 + scores.technical_precision * 0.2)),
      reason: 'Strong analytical thinking is core to AI/ML work',
    },
    {
      title: 'Systems Integration Engineer',
      emoji: '⚙️',
      match: Math.round((scores.technical_precision * 0.35 + scores.teamwork * 0.35 + scores.analytical_thinking * 0.3)),
      reason: 'You balance technical skills with team collaboration',
    },
  ]

  return professions.sort((a, b) => b.match - a.match).slice(0, 3)
}

export default function CareerRecommendation({ competency }: CareerRecommendationProps) {
  const t = useTranslations('dashboard')
  const [answer, setAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const professions = getProfessions(competency)

  const professionOptions = professions.map(p => p.title).concat([t('noneOfThese')])

  return (
    <div className="bg-brand-panel border border-brand-border rounded-2xl p-6 space-y-6">
      <h2 className="text-lg font-bold text-white">{t('topProfessions')}</h2>

      <div className="space-y-3">
        {professions.map((prof, i) => (
          <div key={prof.title} className="flex items-center gap-4 bg-brand-dark border border-brand-border rounded-xl p-4">
            <div className="text-3xl">{prof.emoji}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {i === 0 && (
                  <span className="text-xs bg-brand-gold/20 text-brand-gold px-2 py-0.5 rounded-full font-bold">
                    Best Match
                  </span>
                )}
                <span className="font-bold text-white">{prof.title}</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{prof.reason}</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-black" style={{ color: `hsl(${prof.match}, 80%, 60%)` }}>
                {prof.match}%
              </div>
              <div className="text-xs text-gray-500">match</div>
            </div>
          </div>
        ))}
      </div>

      {/* Question */}
      {!submitted ? (
        <div className="bg-blue-900/20 border border-brand-blue/30 rounded-xl p-4">
          <p className="font-medium text-white mb-1">{t('professionQuestion')}</p>
          <p className="text-xs text-gray-400 mb-3">{t('professionQuestionSubtitle')}</p>
          <div className="grid grid-cols-2 gap-2">
            {professionOptions.map(opt => (
              <button
                key={opt}
                onClick={() => { setAnswer(opt); setSubmitted(true) }}
                className={`text-sm text-left px-3 py-2 rounded-lg border transition-colors ${
                  answer === opt
                    ? 'border-brand-blue bg-brand-blue/20 text-brand-blue'
                    : 'border-brand-border text-gray-300 hover:border-brand-blue hover:text-white'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 text-center">
          <div className="text-2xl mb-1">✅</div>
          <p className="text-green-400 font-medium">Thanks for your answer!</p>
          <p className="text-gray-400 text-sm mt-1">You chose: <strong className="text-white">{answer}</strong></p>
        </div>
      )}
    </div>
  )
}
