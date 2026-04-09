'use client'

import { useTranslations, useLocale } from 'next-intl'
import { useState } from 'react'
import type { CompetencyScore } from '@/types/database'

interface CareerRecommendationProps {
  competency: CompetencyScore | null
}

type InnovationStrength = {
  stageId: string
  titleEn: string
  titleRu: string
  titleAr: string
  icon: string
  color: string
  score: number
  reasonEn: string
  reasonRu: string
  reasonAr: string
}

function getInnovationStrengths(scores: CompetencyScore | null): InnovationStrength[] {
  if (!scores) return []

  const stages: InnovationStrength[] = [
    {
      stageId: 'research',
      titleEn: 'Research',
      titleRu: 'Исследование проблемы',
      titleAr: 'البحث عن المشكلة',
      icon: '\u{1F50D}',
      color: '#3B82F6',
      score: Math.round(scores.analytical_thinking * 0.5 + scores.creativity * 0.3 + scores.teamwork * 0.2),
      reasonEn: 'You find hidden problems and ask the right questions — the starting point of any innovation',
      reasonRu: 'Ты находишь скрытые проблемы и задаёшь правильные вопросы — отправная точка любой инновации',
      reasonAr: 'تكتشف المشكلات الخفية وتطرح الأسئلة الصحيحة — نقطة البداية لأي ابتكار',
    },
    {
      stageId: 'idea',
      titleEn: 'Idea Generation',
      titleRu: 'Генерация идей',
      titleAr: 'توليد الأفكار',
      icon: '\u{1F4A1}',
      color: '#FBBF24',
      score: Math.round(scores.creativity * 0.5 + scores.analytical_thinking * 0.3 + scores.learning_speed * 0.2),
      reasonEn: 'You generate creative solutions and quickly evaluate which ideas have the most potential',
      reasonRu: 'Ты генерируешь креативные решения и быстро оцениваешь, какие идеи самые перспективные',
      reasonAr: 'تولّد حلولًا إبداعية وتقيّم بسرعة الأفكار الأكثر إمكانية',
    },
    {
      stageId: 'prototype',
      titleEn: 'Prototyping',
      titleRu: 'Прототипирование',
      titleAr: 'بناء النموذج الأولي',
      icon: '\u{1F6E0}',
      color: '#10B981',
      score: Math.round(scores.technical_precision * 0.5 + scores.analytical_thinking * 0.3 + scores.creativity * 0.2),
      reasonEn: 'You turn ideas into working prototypes with precision and technical skill',
      reasonRu: 'Ты превращаешь идеи в работающие прототипы с точностью и техническим мастерством',
      reasonAr: 'تحوّل الأفكار إلى نماذج أولية عاملة بدقة ومهارة تقنية',
    },
    {
      stageId: 'test',
      titleEn: 'Testing',
      titleRu: 'Тестирование',
      titleAr: 'الاختبار',
      icon: '\u{1F9EA}',
      color: '#06B6D4',
      score: Math.round(scores.technical_precision * 0.4 + scores.analytical_thinking * 0.4 + scores.learning_speed * 0.2),
      reasonEn: 'You methodically test, find bugs, and iterate until the product works flawlessly',
      reasonRu: 'Ты методично тестируешь, находишь ошибки и улучшаешь продукт до идеала',
      reasonAr: 'تختبر بمنهجية وتكتشف الأخطاء وتكرر حتى يعمل المنتج بلا عيوب',
    },
    {
      stageId: 'pitch',
      titleEn: 'Pitch & Investment',
      titleRu: 'Питч и инвестиции',
      titleAr: 'العرض والاستثمار',
      icon: '\u{1F4CA}',
      color: '#A855F7',
      score: Math.round(scores.management * 0.35 + scores.teamwork * 0.35 + scores.creativity * 0.3),
      reasonEn: 'You present ideas convincingly and negotiate with confidence — key skills for attracting investors',
      reasonRu: 'Ты убедительно презентуешь идеи и уверенно ведёшь переговоры — ключ к привлечению инвесторов',
      reasonAr: 'تقدّم الأفكار بشكل مقنع وتتفاوض بثقة — مهارات أساسية لجذب المستثمرين',
    },
    {
      stageId: 'launch',
      titleEn: 'Launch & Scale',
      titleRu: 'Запуск и масштабирование',
      titleAr: 'الإطلاق والتوسع',
      icon: '\u{1F680}',
      color: '#EF4444',
      score: Math.round(scores.management * 0.4 + scores.learning_speed * 0.3 + scores.teamwork * 0.3),
      reasonEn: 'You make fast decisions under pressure and lead growth — the engine of a successful launch',
      reasonRu: 'Ты быстро принимаешь решения под давлением и ведёшь рост — двигатель успешного запуска',
      reasonAr: 'تتخذ قرارات سريعة تحت الضغط وتقود النمو — محرك الإطلاق الناجح',
    },
  ]

  return stages.sort((a, b) => b.score - a.score)
}

export default function CareerRecommendation({ competency }: CareerRecommendationProps) {
  const t = useTranslations('dashboard')
  const locale = useLocale()
  const [answer, setAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const strengths = getInnovationStrengths(competency)
  const top3 = strengths.slice(0, 3)

  const stageOptions = top3
    .map(s => locale === 'ru' ? s.titleRu : locale === 'ar' ? s.titleAr : s.titleEn)
    .concat([t('noneOfThese')])

  return (
    <div className="bg-brand-panel border border-brand-border rounded-2xl p-6 space-y-6">
      <h2 className="text-lg font-bold text-white">{t('topProfessions')}</h2>

      <div className="space-y-3">
        {top3.map((stage, i) => (
          <div key={stage.stageId} className="flex items-center gap-4 bg-brand-dark border border-brand-border rounded-xl p-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
              style={{ backgroundColor: `${stage.color}20`, border: `1px solid ${stage.color}40` }}
            >
              {stage.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {i === 0 && (
                  <span className="text-xs bg-brand-gold/20 text-brand-gold px-2 py-0.5 rounded-full font-bold">
                    {locale === 'ru' ? 'Твоя суперсила' : locale === 'ar' ? 'قوّتك الخارقة' : 'Your Superpower'}
                  </span>
                )}
                <span className="font-bold text-white">
                  {locale === 'ru' ? stage.titleRu : locale === 'ar' ? stage.titleAr : stage.titleEn}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {locale === 'ru' ? stage.reasonRu : locale === 'ar' ? stage.reasonAr : stage.reasonEn}
              </p>
            </div>
            <div className="text-right">
              <div className="text-lg font-black" style={{ color: stage.color }}>
                {stage.score}%
              </div>
              <div className="text-xs text-gray-500">
                {locale === 'ru' ? 'сила' : locale === 'ar' ? 'قوة' : 'strength'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Teamwork impact note */}
      {competency && competency.teamwork > 0 && (
        <div className="bg-purple-900/15 border border-purple-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <svg width={16} height={16} viewBox="0 0 24 24" className="text-purple-400">
              <path fill="currentColor" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
            </svg>
            <p className="text-sm font-bold text-purple-400">
              {locale === 'ru' ? `Командная работа: ${competency.teamwork}/100` : locale === 'ar' ? `العمل الجماعي: ${competency.teamwork}/100` : `Teamwork: ${competency.teamwork}/100`}
            </p>
          </div>
          <p className="text-xs text-gray-400">
            {locale === 'ru'
              ? 'Навык командной работы из кооперативных миссий усиливает этапы Питча и Запуска. Чем выше навык — тем сильнее ты на этих этапах.'
              : locale === 'ar'
                ? 'مهارة العمل الجماعي من المهمات التعاونية تعزز مراحل العرض والإطلاق. كلما زادت المهارة، زادت قوتك في هذه المراحل.'
                : 'Teamwork skill from co-op missions boosts your Pitch and Launch stages. Higher skill = stronger at those stages.'}
          </p>
        </div>
      )}

      {/* Question */}
      {!submitted ? (
        <div className="bg-blue-900/20 border border-brand-blue/30 rounded-xl p-4">
          <p className="font-medium text-white mb-1">{t('professionQuestion')}</p>
          <p className="text-xs text-gray-400 mb-3">{t('professionQuestionSubtitle')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {stageOptions.map(opt => (
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
          <p className="text-green-400 font-medium">{locale === 'ru' ? 'Спасибо за ответ!' : locale === 'ar' ? 'شكرًا على إجابتك!' : 'Thanks for your answer!'}</p>
          <p className="text-gray-400 text-sm mt-1">{locale === 'ru' ? 'Твой выбор:' : locale === 'ar' ? 'اخترت:' : 'You chose:'} <strong className="text-white">{answer}</strong></p>
        </div>
      )}
    </div>
  )
}
