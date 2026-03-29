'use client'

import { useTranslations, useLocale } from 'next-intl'
import { useState } from 'react'
import type { CompetencyScore } from '@/types/database'
import { ProfessionIcon } from '@/components/ui/SvgIcon'

interface CareerRecommendationProps {
  competency: CompetencyScore | null
}

type Profession = {
  title: string
  titleRu: string
  titleAr: string
  emoji: string
  match: number
  reason: string
  reasonRu: string
  reasonAr: string
  teamworkWeight: number // how much teamwork contributes to this profession (0-1)
}

function getProfessions(scores: CompetencyScore | null): Profession[] {
  if (!scores) return []

  const professions = [
    // === Programming / Drone role careers ===
    {
      title: 'Drone Systems Programmer',
      titleRu: 'Программист дронов',
      titleAr: 'مبرمج أنظمة الطائرات المسيّرة',
      emoji: '🛸',
      match: Math.round(scores.analytical_thinking * 0.4 + scores.technical_precision * 0.3 + scores.learning_speed * 0.3),
      reason: 'Your algorithmic thinking and quick learning make you ideal for programming autonomous drones',
      reasonRu: 'Твоё алгоритмическое мышление и быстрая обучаемость идеальны для программирования автономных дронов',
      reasonAr: 'تفكيرك الخوارزمي وسرعة تعلمك يجعلانك مثاليًا لبرمجة الطائرات المسيّرة المستقلة',
      teamworkWeight: 0,
    },
    {
      title: 'Software Developer',
      titleRu: 'Разработчик ПО',
      titleAr: 'مطوّر برمجيات',
      emoji: '💻',
      match: Math.round(scores.analytical_thinking * 0.4 + scores.technical_precision * 0.4 + scores.learning_speed * 0.2),
      reason: 'Strong logic and precision are the foundation of software development',
      reasonRu: 'Сильная логика и точность — основа разработки программного обеспечения',
      reasonAr: 'المنطق القوي والدقة هما أساس تطوير البرمجيات',
      teamworkWeight: 0,
    },
    {
      title: 'AI / Machine Learning Engineer',
      titleRu: 'Инженер ИИ / машинного обучения',
      titleAr: 'مهندس ذكاء اصطناعي / تعلم آلي',
      emoji: '🧠',
      match: Math.round(scores.analytical_thinking * 0.5 + scores.learning_speed * 0.3 + scores.technical_precision * 0.2),
      reason: 'Your analytical depth and fast learning suit complex AI systems',
      reasonRu: 'Твоя аналитическая глубина и быстрое обучение подходят для сложных систем ИИ',
      reasonAr: 'عمقك التحليلي وسرعة تعلمك يناسبان أنظمة الذكاء الاصطناعي المعقدة',
      teamworkWeight: 0,
    },
    {
      title: 'Data Scientist',
      titleRu: 'Дата-сайентист',
      titleAr: 'عالم بيانات',
      emoji: '📊',
      match: Math.round(scores.analytical_thinking * 0.45 + scores.technical_precision * 0.3 + scores.creativity * 0.25),
      reason: 'You combine analytical rigor with creative problem-solving — key for data science',
      reasonRu: 'Ты сочетаешь аналитическую строгость с творческим решением задач — ключ к науке о данных',
      reasonAr: 'تجمع بين الدقة التحليلية وحل المشكلات الإبداعي — مفتاح علم البيانات',
      teamworkWeight: 0,
    },

    // === Engineering / Robot role careers ===
    {
      title: 'Robotics Engineer',
      titleRu: 'Инженер-робототехник',
      titleAr: 'مهندس روبوتات',
      emoji: '🤖',
      match: Math.round(scores.technical_precision * 0.4 + scores.analytical_thinking * 0.4 + scores.creativity * 0.2),
      reason: 'Your precision and analytical skills are perfect for designing robots',
      reasonRu: 'Твоя точность и аналитические навыки идеальны для проектирования роботов',
      reasonAr: 'دقتك ومهاراتك التحليلية مثالية لتصميم الروبوتات',
      teamworkWeight: 0,
    },
    {
      title: 'Mechanical Engineer',
      titleRu: 'Инженер-механик',
      titleAr: 'مهندس ميكانيكي',
      emoji: '⚙️',
      match: Math.round(scores.technical_precision * 0.5 + scores.analytical_thinking * 0.3 + scores.creativity * 0.2),
      reason: 'You excel at precise technical design — the core of mechanical engineering',
      reasonRu: 'Ты отлично справляешься с точным техническим проектированием — основой механики',
      reasonAr: 'تتفوق في التصميم التقني الدقيق — جوهر الهندسة الميكانيكية',
      teamworkWeight: 0,
    },
    {
      title: 'IoT / Embedded Systems Engineer',
      titleRu: 'Инженер IoT / встраиваемых систем',
      titleAr: 'مهندس IoT / أنظمة مدمجة',
      emoji: '📡',
      match: Math.round(scores.technical_precision * 0.35 + scores.analytical_thinking * 0.35 + scores.learning_speed * 0.3),
      reason: 'Your technical skills and adaptability fit the fast-evolving IoT field',
      reasonRu: 'Твои технические навыки и адаптивность подходят для быстро развивающейся сферы IoT',
      reasonAr: 'مهاراتك التقنية وقدرتك على التكيف تناسب مجال IoT سريع التطور',
      teamworkWeight: 0,
    },
    {
      title: 'Quality Assurance Engineer',
      titleRu: 'Инженер по тестированию',
      titleAr: 'مهندس ضمان الجودة',
      emoji: '🔍',
      match: Math.round(scores.technical_precision * 0.5 + scores.analytical_thinking * 0.3 + scores.teamwork * 0.2),
      reason: 'Your attention to detail and systematic approach make you a natural at QA',
      reasonRu: 'Твоё внимание к деталям и системный подход делают тебя прирождённым тестировщиком',
      reasonAr: 'اهتمامك بالتفاصيل ونهجك المنظم يجعلانك مناسبًا بشكل طبيعي لضمان الجودة',
      teamworkWeight: 0.2,
    },

    // === Business / Entrepreneur role careers ===
    {
      title: 'Tech Entrepreneur / Startup Founder',
      titleRu: 'Технологический предприниматель',
      titleAr: 'رائد أعمال تقني / مؤسس شركة ناشئة',
      emoji: '🚀',
      match: Math.round(scores.management * 0.4 + scores.creativity * 0.3 + scores.teamwork * 0.3),
      reason: 'Your leadership, creativity, and team skills are what it takes to build a startup',
      reasonRu: 'Твоё лидерство, креативность и командные навыки — то, что нужно для создания стартапа',
      reasonAr: 'قيادتك وإبداعك ومهارات العمل الجماعي هي ما تحتاجه لبناء شركة ناشئة',
      teamworkWeight: 0.3,
    },
    {
      title: 'Product Manager',
      titleRu: 'Продакт-менеджер',
      titleAr: 'مدير منتجات',
      emoji: '📋',
      match: Math.round(scores.management * 0.35 + scores.teamwork * 0.3 + scores.analytical_thinking * 0.2 + scores.creativity * 0.15),
      reason: 'You balance business thinking with team coordination — the essence of product management',
      reasonRu: 'Ты совмещаешь бизнес-мышление с координацией команды — суть продакт-менеджмента',
      reasonAr: 'توازن بين التفكير التجاري وتنسيق الفريق — جوهر إدارة المنتجات',
      teamworkWeight: 0.3,
    },
    {
      title: 'Business Analyst',
      titleRu: 'Бизнес-аналитик',
      titleAr: 'محلل أعمال',
      emoji: '📈',
      match: Math.round(scores.analytical_thinking * 0.35 + scores.management * 0.35 + scores.teamwork * 0.3),
      reason: 'Your mix of analytical skills and business sense fits business analysis perfectly',
      reasonRu: 'Твоё сочетание аналитических навыков и бизнес-чутья идеально для бизнес-анализа',
      reasonAr: 'مزيجك من المهارات التحليلية والحس التجاري يناسب تحليل الأعمال تمامًا',
      teamworkWeight: 0.3,
    },
    {
      title: 'Marketing Strategist',
      titleRu: 'Маркетолог-стратег',
      titleAr: 'خبير تسويق استراتيجي',
      emoji: '🎯',
      match: Math.round(scores.creativity * 0.4 + scores.management * 0.3 + scores.teamwork * 0.3),
      reason: 'Your creativity and strategic thinking are ideal for marketing',
      reasonRu: 'Твоя креативность и стратегическое мышление идеальны для маркетинга',
      reasonAr: 'إبداعك وتفكيرك الاستراتيجي مثاليان للتسويق',
      teamworkWeight: 0.3,
    },
    {
      title: 'UX Designer',
      titleRu: 'UX-дизайнер',
      titleAr: 'مصمم تجربة المستخدم',
      emoji: '🎨',
      match: Math.round(scores.creativity * 0.45 + scores.teamwork * 0.3 + scores.analytical_thinking * 0.25),
      reason: 'You combine creativity with user empathy — core UX skills',
      reasonRu: 'Ты сочетаешь креативность с эмпатией к пользователям — ключевые навыки UX',
      reasonAr: 'تجمع بين الإبداع والتعاطف مع المستخدم — مهارات UX الأساسية',
      teamworkWeight: 0.3,
    },

    // === Teamwork-heavy careers (boosted by coop play) ===
    {
      title: 'Project Manager',
      titleRu: 'Проджект-менеджер',
      titleAr: 'مدير مشاريع',
      emoji: '📌',
      match: Math.round(scores.teamwork * 0.4 + scores.management * 0.35 + scores.analytical_thinking * 0.25),
      reason: 'Your team coordination skills and management ability make you a strong project leader',
      reasonRu: 'Твои навыки координации команды и управления делают тебя сильным руководителем проектов',
      reasonAr: 'مهاراتك في تنسيق الفريق والإدارة تجعلك قائد مشاريع قويًا',
      teamworkWeight: 0.4,
    },
    {
      title: 'Scrum Master / Agile Coach',
      titleRu: 'Скрам-мастер / Agile-коуч',
      titleAr: 'سكرام ماستر / مدرب أجايل',
      emoji: '🔄',
      match: Math.round(scores.teamwork * 0.5 + scores.management * 0.3 + scores.learning_speed * 0.2),
      reason: 'Your teamwork skills and adaptability are essential for agile leadership',
      reasonRu: 'Твои навыки командной работы и адаптивность необходимы для agile-лидерства',
      reasonAr: 'مهاراتك في العمل الجماعي وقدرتك على التكيف ضرورية لقيادة أجايل',
      teamworkWeight: 0.5,
    },
  ]

  return professions.sort((a, b) => b.match - a.match).slice(0, 3)
}

export default function CareerRecommendation({ competency }: CareerRecommendationProps) {
  const t = useTranslations('dashboard')
  const locale = useLocale()
  const [answer, setAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const professions = getProfessions(competency)

  const professionOptions = professions.map(p => locale === 'ru' ? p.titleRu : locale === 'ar' ? p.titleAr : p.title).concat([t('noneOfThese')])

  return (
    <div className="bg-brand-panel border border-brand-border rounded-2xl p-6 space-y-6">
      <h2 className="text-lg font-bold text-white">{t('topProfessions')}</h2>

      <div className="space-y-3">
        {professions.map((prof, i) => (
          <div key={prof.title} className="flex items-center gap-4 bg-brand-dark border border-brand-border rounded-xl p-4">
            <ProfessionIcon title={prof.title} size={40} animated />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {i === 0 && (
                  <span className="text-xs bg-brand-gold/20 text-brand-gold px-2 py-0.5 rounded-full font-bold">
                    {locale === 'ru' ? 'Лучшее совпадение' : locale === 'ar' ? 'أفضل تطابق' : 'Best Match'}
                  </span>
                )}
                {prof.teamworkWeight >= 0.3 && (
                  <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full font-bold">
                    {locale === 'ru' ? 'Командная работа' : locale === 'ar' ? 'عمل جماعي' : 'Teamwork'}
                  </span>
                )}
                <span className="font-bold text-white">{locale === 'ru' ? prof.titleRu : locale === 'ar' ? prof.titleAr : prof.title}</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{locale === 'ru' ? prof.reasonRu : locale === 'ar' ? prof.reasonAr : prof.reason}</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-black" style={{ color: `hsl(${prof.match}, 80%, 60%)` }}>
                {prof.match}%
              </div>
              <div className="text-xs text-gray-500">{locale === 'ru' ? 'совпадение' : locale === 'ar' ? 'تطابق' : 'match'}</div>
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
              ? 'Навык командной работы из кооперативных миссий влияет на профессии с пометкой "Командная работа". Чем выше навык — тем выше совпадение.'
              : locale === 'ar'
                ? 'مهارة العمل الجماعي من المهمات التعاونية تؤثر على المهن التي تحمل علامة "عمل جماعي". كلما زادت المهارة، زاد التطابق.'
                : 'Teamwork skill from co-op missions boosts professions tagged "Teamwork". Higher skill = higher match.'}
          </p>
        </div>
      )}

      {/* Question */}
      {!submitted ? (
        <div className="bg-blue-900/20 border border-brand-blue/30 rounded-xl p-4">
          <p className="font-medium text-white mb-1">{t('professionQuestion')}</p>
          <p className="text-xs text-gray-400 mb-3">{t('professionQuestionSubtitle')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
          <p className="text-green-400 font-medium">{locale === 'ru' ? 'Спасибо за ответ!' : locale === 'ar' ? 'شكرًا على إجابتك!' : 'Thanks for your answer!'}</p>
          <p className="text-gray-400 text-sm mt-1">{locale === 'ru' ? 'Ваш выбор:' : locale === 'ar' ? 'اخترت:' : 'You chose:'} <strong className="text-white">{answer}</strong></p>
        </div>
      )}
    </div>
  )
}
