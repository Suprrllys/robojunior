'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useLocale } from 'next-intl'

/* --- Types --- */

export interface ScoreBreakdownItem {
  label: string
  value: number
  max: number
}

interface EntrepreneurMission4Props {
  userId: string
  onComplete?: (score: number, breakdown: ScoreBreakdownItem[]) => void
}

/* --- Data --- */

interface SlideCard {
  id: string
  label: string
  icon: string
  description: string
}

const SLIDES_EN: SlideCard[] = [
  { id: 'problem',   label: 'Problem',        icon: '\u{1F6A8}', description: 'What pain point are you solving?' },
  { id: 'solution',  label: 'Solution',        icon: '\u{1F4A1}', description: 'How does your product fix it?' },
  { id: 'market',    label: 'Market Size',     icon: '\u{1F30D}', description: 'How big is the opportunity?' },
  { id: 'business',  label: 'Business Model',  icon: '\u{1F4B0}', description: 'How will you make money?' },
  { id: 'team',      label: 'Team',            icon: '\u{1F465}', description: 'Why is YOUR team the one?' },
  { id: 'ask',       label: 'The Ask',         icon: '\u{1F3AF}', description: 'How much do you need?' },
]

const SLIDES_RU: SlideCard[] = [
  { id: 'problem',   label: 'Проблема',       icon: '\u{1F6A8}', description: 'Какую боль ты решаешь?' },
  { id: 'solution',  label: 'Решение',         icon: '\u{1F4A1}', description: 'Как твой продукт это исправит?' },
  { id: 'market',    label: 'Размер рынка',    icon: '\u{1F30D}', description: 'Насколько велика возможность?' },
  { id: 'business',  label: 'Бизнес-модель',   icon: '\u{1F4B0}', description: 'Как ты будешь зарабатывать?' },
  { id: 'team',      label: 'Команда',         icon: '\u{1F465}', description: 'Почему именно ТВОЯ команда?' },
  { id: 'ask',       label: 'Запрос',          icon: '\u{1F3AF}', description: 'Сколько тебе нужно?' },
]

const SLIDES_AR: SlideCard[] = [
  { id: 'problem',   label: 'المشكلة',       icon: '\u{1F6A8}', description: 'ما هي المشكلة التي تحلها؟' },
  { id: 'solution',  label: 'الحل',           icon: '\u{1F4A1}', description: 'كيف يحل منتجك هذه المشكلة؟' },
  { id: 'market',    label: 'حجم السوق',      icon: '\u{1F30D}', description: 'ما حجم الفرصة؟' },
  { id: 'business',  label: 'نموذج العمل',    icon: '\u{1F4B0}', description: 'كيف ستجني المال؟' },
  { id: 'team',      label: 'الفريق',         icon: '\u{1F465}', description: 'لماذا فريقك تحديدًا؟' },
  { id: 'ask',       label: 'الطلب',          icon: '\u{1F3AF}', description: 'كم تحتاج من التمويل؟' },
]

const CORRECT_ORDER = ['problem', 'solution', 'market', 'business', 'team', 'ask']

interface InvestorQuestion {
  question: string
  options: { text: string; score: number }[]
}

const INVESTOR_QUESTIONS_EN: InvestorQuestion[] = [
  {
    question: 'What makes your solution different from existing alternatives?',
    options: [
      { text: 'We have no competitors', score: 20 },
      { text: 'We solve the problem 10x faster with proprietary technology', score: 70 },
      { text: 'Our team is really passionate about this', score: 40 },
    ],
  },
  {
    question: 'How will you acquire your first 1,000 customers?',
    options: [
      { text: 'Viral marketing on social media', score: 40 },
      { text: 'Strategic partnerships with schools and pilot programs', score: 70 },
      { text: 'We will figure it out later', score: 10 },
    ],
  },
  {
    question: 'What is your biggest risk?',
    options: [
      { text: 'We have no risks -- everything is planned', score: 10 },
      { text: 'Regulatory changes could slow adoption, but we have a mitigation plan', score: 70 },
      { text: 'Our team might leave', score: 30 },
    ],
  },
  {
    question: 'When will you become profitable?',
    options: [
      { text: 'We are already profitable', score: 40 },
      { text: 'Within 18 months based on our unit economics model', score: 70 },
      { text: 'Profitability is not our focus right now', score: 20 },
    ],
  },
  {
    question: 'What will you do if this funding round fails?',
    options: [
      { text: 'We will shut down the company', score: 10 },
      { text: 'We have a lean plan B that extends our runway 6 more months', score: 70 },
      { text: 'We will just ask other investors', score: 30 },
    ],
  },
]

const INVESTOR_QUESTIONS_RU: InvestorQuestion[] = [
  {
    question: 'Чем ваше решение отличается от существующих альтернатив?',
    options: [
      { text: 'У нас нет конкурентов', score: 20 },
      { text: 'Мы решаем проблему в 10 раз быстрее с помощью нашей технологии', score: 70 },
      { text: 'Наша команда очень увлечена этим', score: 40 },
    ],
  },
  {
    question: 'Как вы привлечёте первых 1000 клиентов?',
    options: [
      { text: 'Вирусный маркетинг в соцсетях', score: 40 },
      { text: 'Стратегические партнёрства со школами и пилотные программы', score: 70 },
      { text: 'Мы разберёмся с этим позже', score: 10 },
    ],
  },
  {
    question: 'Каков ваш главный риск?',
    options: [
      { text: 'У нас нет рисков — всё спланировано', score: 10 },
      { text: 'Изменения в регулировании могут замедлить внедрение, но у нас есть план', score: 70 },
      { text: 'Наша команда может уйти', score: 30 },
    ],
  },
  {
    question: 'Когда вы выйдете на прибыль?',
    options: [
      { text: 'Мы уже прибыльны', score: 40 },
      { text: 'В течение 18 месяцев согласно нашей модели юнит-экономики', score: 70 },
      { text: 'Прибыльность сейчас не наш приоритет', score: 20 },
    ],
  },
  {
    question: 'Что будете делать, если этот раунд финансирования провалится?',
    options: [
      { text: 'Мы закроем компанию', score: 10 },
      { text: 'У нас есть экономный план Б, который продлит наш запас на 6 месяцев', score: 70 },
      { text: 'Мы просто обратимся к другим инвесторам', score: 30 },
    ],
  },
]

const INVESTOR_QUESTIONS_AR: InvestorQuestion[] = [
  {
    question: 'ما الذي يميّز حلكم عن البدائل الموجودة؟',
    options: [
      { text: 'ليس لدينا منافسون', score: 20 },
      { text: 'نحل المشكلة أسرع 10 مرات بتقنية خاصة', score: 70 },
      { text: 'فريقنا شغوف جدًا بهذا المجال', score: 40 },
    ],
  },
  {
    question: 'كيف ستجذبون أول 1,000 عميل؟',
    options: [
      { text: 'تسويق فيروسي عبر وسائل التواصل', score: 40 },
      { text: 'شراكات استراتيجية مع المدارس وبرامج تجريبية', score: 70 },
      { text: 'سنكتشف ذلك لاحقًا', score: 10 },
    ],
  },
  {
    question: 'ما هو أكبر خطر يواجهكم؟',
    options: [
      { text: 'ليس لدينا مخاطر — كل شيء مخطط', score: 10 },
      { text: 'التغييرات التنظيمية قد تبطئ التبني، لكن لدينا خطة للتعامل معها', score: 70 },
      { text: 'فريقنا قد يغادر', score: 30 },
    ],
  },
  {
    question: 'متى ستحققون الربحية؟',
    options: [
      { text: 'نحن مربحون بالفعل', score: 40 },
      { text: 'خلال 18 شهرًا وفقًا لنموذج اقتصاديات الوحدة', score: 70 },
      { text: 'الربحية ليست أولويتنا الآن', score: 20 },
    ],
  },
  {
    question: 'ماذا ستفعلون إذا فشلت جولة التمويل هذه؟',
    options: [
      { text: 'سنغلق الشركة', score: 10 },
      { text: 'لدينا خطة بديلة تمدد مدرجنا 6 أشهر إضافية', score: 70 },
      { text: 'سنتواصل مع مستثمرين آخرين', score: 30 },
    ],
  },
]

const INVESTOR_FACES_AR = [
  { emoji: '\u{1F612}', label: 'متشكك' },
  { emoji: '\u{1F610}', label: 'محايد' },
  { emoji: '\u{1F914}', label: 'مهتم' },
  { emoji: '\u{1F60A}', label: 'معجب' },
  { emoji: '\u{1F929}', label: 'متحمس!' },
]

const INVESTOR_FACES_EN = [
  { emoji: '\u{1F612}', label: 'Skeptical' },   // 0-199
  { emoji: '\u{1F610}', label: 'Neutral' },      // 200-399
  { emoji: '\u{1F914}', label: 'Interested' },   // 400-599
  { emoji: '\u{1F60A}', label: 'Impressed' },     // 600-799
  { emoji: '\u{1F929}', label: 'Excited!' },      // 800+
]

const INVESTOR_FACES_RU = [
  { emoji: '\u{1F612}', label: 'Скептический' },   // 0-199
  { emoji: '\u{1F610}', label: 'Нейтральный' },    // 200-399
  { emoji: '\u{1F914}', label: 'Заинтересованный' }, // 400-599
  { emoji: '\u{1F60A}', label: 'Впечатлённый' },    // 600-799
  { emoji: '\u{1F929}', label: 'В восторге!' },     // 800+
]

function getInvestorFace(score: number, faces: typeof INVESTOR_FACES_EN) {
  if (score >= 800) return faces[4]
  if (score >= 600) return faces[3]
  if (score >= 400) return faces[2]
  if (score >= 200) return faces[1]
  return faces[0]
}

/* --- Helpers --- */

// Count minimum swaps needed to sort an array to match target order
function countSwapsNeeded(current: string[], target: string[]): number {
  const indexed = current.map(id => target.indexOf(id))
  let swaps = 0
  const arr = [...indexed]
  for (let i = 0; i < arr.length; i++) {
    while (arr[i] !== i) {
      const j = arr[i]
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      swaps++
    }
  }
  return swaps
}

/* --- Canvas Header Constants --- */

const CANVAS_W = 600
const CANVAS_H = 160

// Slide icons mapped to simple canvas symbols
const SLIDE_ICONS: Record<string, string> = {
  problem: '!',
  solution: '*',
  market: 'O',
  business: '$',
  team: 'T',
  ask: '>',
}

interface DustParticle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  life: number
}

interface FlashEffect {
  x: number
  y: number
  alpha: number
  radius: number
}

function createDustParticles(count: number): DustParticle[] {
  const particles: DustParticle[] = []
  for (let i = 0; i < count; i++) {
    particles.push({
      x: 240 + Math.random() * 120,
      y: 20 + Math.random() * 80,
      vx: (Math.random() - 0.5) * 0.2,
      vy: Math.random() * 0.3 + 0.05,
      size: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.3 + 0.05,
      life: Math.random(),
    })
  }
  return particles
}

function shadeColor4(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, Math.max(0, (num >> 16) + percent))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent))
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent))
  return `rgb(${r},${g},${b})`
}

function roundRect4(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function drawPitchStage(
  ctx: CanvasRenderingContext2D,
  time: number,
  slideOrder: string[],
  phase: string,
  flashes: FlashEffect[],
  slides: SlideCard[] = SLIDES_EN,
  stageLabel: string = 'PITCH STAGE',
) {
  // Background gradient (dark auditorium)
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
  grad.addColorStop(0, '#0C0A1A')
  grad.addColorStop(0.5, '#1A1035')
  grad.addColorStop(1, '#0F172A')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // Spotlight cone from top center
  const spotX = 300
  const spotTopY = 0
  const spotGrad = ctx.createRadialGradient(spotX, spotTopY, 5, spotX, 80, 200)
  spotGrad.addColorStop(0, 'rgba(251,191,36,0.12)')
  spotGrad.addColorStop(0.5, 'rgba(251,191,36,0.04)')
  spotGrad.addColorStop(1, 'rgba(251,191,36,0)')
  ctx.fillStyle = spotGrad
  ctx.beginPath()
  ctx.moveTo(spotX - 10, spotTopY)
  ctx.lineTo(spotX - 140, CANVAS_H)
  ctx.lineTo(spotX + 140, CANVAS_H)
  ctx.lineTo(spotX + 10, spotTopY)
  ctx.closePath()
  ctx.fill()

  // Subtle ray animation in spotlight
  for (let i = 0; i < 3; i++) {
    const rayAlpha = 0.02 + Math.sin(time * 0.8 + i * 2.1) * 0.015
    const rayOffset = Math.sin(time * 0.3 + i * 1.5) * 15
    ctx.fillStyle = `rgba(251,191,36,${rayAlpha})`
    ctx.beginPath()
    ctx.moveTo(spotX + rayOffset - 3, spotTopY)
    ctx.lineTo(spotX + rayOffset - 60, CANVAS_H)
    ctx.lineTo(spotX + rayOffset + 60, CANVAS_H)
    ctx.lineTo(spotX + rayOffset + 3, spotTopY)
    ctx.closePath()
    ctx.fill()
  }

  // Stage / podium (isometric trapezoid)
  const stageY = 110
  const stageW = 260
  const stageH = 18
  const stageDepth = 12

  // Stage top face
  ctx.fillStyle = '#2D2252'
  ctx.beginPath()
  ctx.moveTo(spotX - stageW / 2, stageY)
  ctx.lineTo(spotX + stageW / 2, stageY)
  ctx.lineTo(spotX + stageW / 2 - 20, stageY + stageH)
  ctx.lineTo(spotX - stageW / 2 + 20, stageY + stageH)
  ctx.closePath()
  ctx.fill()

  // Stage front face
  ctx.fillStyle = '#1E1640'
  ctx.beginPath()
  ctx.moveTo(spotX - stageW / 2 + 20, stageY + stageH)
  ctx.lineTo(spotX + stageW / 2 - 20, stageY + stageH)
  ctx.lineTo(spotX + stageW / 2 - 20, stageY + stageH + stageDepth)
  ctx.lineTo(spotX - stageW / 2 + 20, stageY + stageH + stageDepth)
  ctx.closePath()
  ctx.fill()

  // Stage edge glow
  ctx.save()
  ctx.shadowColor = '#A78BFA'
  ctx.shadowBlur = 8
  ctx.strokeStyle = '#A78BFA60'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(spotX - stageW / 2, stageY)
  ctx.lineTo(spotX + stageW / 2, stageY)
  ctx.stroke()
  ctx.restore()

  // Projector screen
  const screenX = spotX - 70
  const screenY = 22
  const screenW = 140
  const screenH = 75

  // Screen frame
  ctx.fillStyle = '#1E293B'
  roundRect4(ctx, screenX - 3, screenY - 3, screenW + 6, screenH + 6, 4)
  ctx.fill()

  // Screen surface
  ctx.fillStyle = '#0F172A'
  roundRect4(ctx, screenX, screenY, screenW, screenH, 3)
  ctx.fill()

  // Screen glow border
  ctx.save()
  ctx.shadowColor = '#60A5FA'
  ctx.shadowBlur = 6
  ctx.strokeStyle = '#60A5FA40'
  ctx.lineWidth = 1
  roundRect4(ctx, screenX, screenY, screenW, screenH, 3)
  ctx.stroke()
  ctx.restore()

  // Show current slide icon on screen based on order
  if (slideOrder.length > 0) {
    const currentSlideIdx = Math.floor(time * 0.3) % slideOrder.length
    const slideId = slideOrder[currentSlideIdx]
    const icon = SLIDE_ICONS[slideId] || '?'

    // Slide icon
    ctx.fillStyle = '#A78BFA'
    ctx.font = 'bold 28px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(icon, spotX, screenY + screenH / 2 - 5)

    // Slide label
    const slideData = slides.find(s => s.id === slideId)
    if (slideData) {
      ctx.fillStyle = 'rgba(148,163,184,0.8)'
      ctx.font = '9px system-ui, sans-serif'
      ctx.fillText(slideData.label, spotX, screenY + screenH - 10)
    }

    // Slide number indicator dots
    slideOrder.forEach((_, i) => {
      const dotX = spotX - ((slideOrder.length - 1) * 6) / 2 + i * 6
      const dotY = screenY + screenH - 22
      ctx.fillStyle = i === currentSlideIdx ? '#A78BFA' : 'rgba(148,163,184,0.3)'
      ctx.beginPath()
      ctx.arc(dotX, dotY, 2, 0, Math.PI * 2)
      ctx.fill()
    })
  }

  // Podium (small lectern on stage)
  const podiumX = spotX + 85
  const podiumY = stageY - 8

  // Podium body
  ctx.fillStyle = '#3B2D6E'
  ctx.beginPath()
  ctx.moveTo(podiumX - 10, podiumY)
  ctx.lineTo(podiumX + 10, podiumY)
  ctx.lineTo(podiumX + 8, podiumY + 22)
  ctx.lineTo(podiumX - 8, podiumY + 22)
  ctx.closePath()
  ctx.fill()

  // Podium top
  ctx.fillStyle = '#5B4C9E'
  ctx.fillRect(podiumX - 12, podiumY - 2, 24, 4)

  // Microphone
  ctx.strokeStyle = '#94A3B8'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(podiumX, podiumY - 2)
  ctx.lineTo(podiumX - 5, podiumY - 15)
  ctx.stroke()
  ctx.fillStyle = '#E2E8F0'
  ctx.beginPath()
  ctx.arc(podiumX - 5, podiumY - 16, 3, 0, Math.PI * 2)
  ctx.fill()

  // Speaker figure (simple)
  const speakerX = podiumX
  const speakerY = podiumY - 25
  // Head
  ctx.fillStyle = '#DDB892'
  ctx.beginPath()
  ctx.arc(speakerX, speakerY, 5, 0, Math.PI * 2)
  ctx.fill()
  // Body
  ctx.fillStyle = '#4338CA'
  ctx.beginPath()
  ctx.moveTo(speakerX - 7, speakerY + 5)
  ctx.lineTo(speakerX + 7, speakerY + 5)
  ctx.lineTo(speakerX + 5, speakerY + 20)
  ctx.lineTo(speakerX - 5, speakerY + 20)
  ctx.closePath()
  ctx.fill()

  // Audience silhouettes (rows of small circles)
  const audienceRows = [
    { y: 140, count: 9, spacing: 24, startX: spotX - 100 },
    { y: 150, count: 11, spacing: 22, startX: spotX - 115 },
  ]
  audienceRows.forEach((row) => {
    for (let i = 0; i < row.count; i++) {
      const ax = row.startX + i * row.spacing
      // Head
      const bobble = Math.sin(time * 0.5 + i * 0.8 + row.y) * 0.5
      ctx.fillStyle = 'rgba(51,65,85,0.7)'
      ctx.beginPath()
      ctx.arc(ax, row.y + bobble, 4, 0, Math.PI * 2)
      ctx.fill()
      // Shoulders
      ctx.fillStyle = 'rgba(30,41,59,0.6)'
      ctx.beginPath()
      ctx.ellipse(ax, row.y + 7 + bobble, 6, 3, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  })

  // Camera flash effects
  flashes.forEach((flash) => {
    if (flash.alpha > 0) {
      ctx.save()
      ctx.globalAlpha = flash.alpha
      const flashGrad = ctx.createRadialGradient(flash.x, flash.y, 0, flash.x, flash.y, flash.radius)
      flashGrad.addColorStop(0, 'rgba(255,255,255,0.8)')
      flashGrad.addColorStop(0.5, 'rgba(255,255,255,0.2)')
      flashGrad.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = flashGrad
      ctx.beginPath()
      ctx.arc(flash.x, flash.y, flash.radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  })

  // "PITCH STAGE" label
  ctx.fillStyle = 'rgba(167,139,250,0.7)'
  ctx.font = 'bold 11px system-ui, sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(stageLabel, 16, 10)
}

/* --- Canvas Header Component --- */

function PitchStageCanvas({ slideOrder, phase, slides, stageLabel }: { slideOrder: string[]; phase: string; slides?: SlideCard[]; stageLabel?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<DustParticle[]>(createDustParticles(20))
  const flashesRef = useRef<FlashEffect[]>([])
  const nextFlashRef = useRef<number>(2)
  const animRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const startTime = performance.now()

    const render = (now: number) => {
      const time = (now - startTime) / 1000

      // Draw main stage
      drawPitchStage(ctx, time, slideOrder, phase, flashesRef.current, slides, stageLabel)

      // Update and draw dust particles in spotlight
      const particles = particlesRef.current
      particles.forEach((p) => {
        p.x += p.vx + Math.sin(time * 0.5 + p.y * 0.1) * 0.1
        p.y += p.vy
        p.life -= 0.001

        // Reset when out of bounds
        if (p.y > CANVAS_H || p.life <= 0) {
          p.x = 240 + Math.random() * 120
          p.y = 20 + Math.random() * 30
          p.life = 1
          p.alpha = Math.random() * 0.3 + 0.05
        }

        ctx.save()
        ctx.globalAlpha = p.alpha * p.life
        ctx.fillStyle = `rgba(251,191,36,${0.5 + Math.sin(time + p.x) * 0.3})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      })

      // Trigger camera flashes periodically
      if (time >= nextFlashRef.current) {
        const audienceX = 160 + Math.random() * 280
        const audienceY = 135 + Math.random() * 20
        flashesRef.current.push({
          x: audienceX,
          y: audienceY,
          alpha: 0.7,
          radius: 15 + Math.random() * 10,
        })
        nextFlashRef.current = time + 2 + Math.random() * 4
      }

      // Update flashes (fade out)
      flashesRef.current = flashesRef.current.filter(f => {
        f.alpha -= 0.03
        return f.alpha > 0
      })

      animRef.current = requestAnimationFrame(render)
    }

    animRef.current = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animRef.current)
    }
  }, [slideOrder, phase, slides, stageLabel])

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      className="w-full rounded-t-2xl"
      style={{ maxWidth: CANVAS_W, imageRendering: 'auto' }}
    />
  )
}

/* --- Main Component --- */

export default function EntrepreneurMission4({ userId, onComplete }: EntrepreneurMission4Props) {
  const locale = useLocale()
  const isRu = locale === 'ru'
  const isAr = locale === 'ar'
  const SLIDES = isRu ? SLIDES_RU : isAr ? SLIDES_AR : SLIDES_EN
  const INVESTOR_QUESTIONS = isRu ? INVESTOR_QUESTIONS_RU : isAr ? INVESTOR_QUESTIONS_AR : INVESTOR_QUESTIONS_EN
  const INVESTOR_FACES = isRu ? INVESTOR_FACES_RU : isAr ? INVESTOR_FACES_AR : INVESTOR_FACES_EN

  // Shuffle slides initially
  const [slideOrder, setSlideOrder] = useState<string[]>(() => {
    const ids = SLIDES_EN.map(s => s.id)
    // Fisher-Yates shuffle
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[ids[i], ids[j]] = [ids[j], ids[i]]
    }
    return ids
  })
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [phase, setPhase] = useState<'arrange' | 'numbers' | 'qa' | 'done'>('arrange')

  // Numbers phase
  const [marketSize, setMarketSize] = useState('')
  const [monthlyRevenue, setMonthlyRevenue] = useState('')
  const [fundingAsk, setFundingAsk] = useState('')

  // Q&A phase
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [qaAnswers, setQaAnswers] = useState<number[]>([])

  // Running score for investor face
  const runningScore = useMemo(() => {
    let s = 0
    // Slide order partial score
    if (phase !== 'arrange') {
      const swaps = countSwapsNeeded(slideOrder, CORRECT_ORDER)
      const maxSwaps = 5
      s += Math.round(300 * Math.max(0, 1 - swaps / maxSwaps))
    }
    // Numbers partial
    if (phase === 'qa' || phase === 'done') {
      let numScore = 0
      if (marketSize === '$100M') numScore += 80
      else if (marketSize === '$1B') numScore += 50
      else if (marketSize === '$10M') numScore += 30
      if (monthlyRevenue === '$20K') numScore += 60
      else if (monthlyRevenue === '$50K') numScore += 40
      else if (monthlyRevenue === '$5K') numScore += 30
      if (fundingAsk === '$500K') numScore += 60
      else if (fundingAsk === '$2M') numScore += 30
      else if (fundingAsk === '$100K') numScore += 30
      s += numScore
    }
    // Q&A partial
    for (const a of qaAnswers) {
      s += a
    }
    return s
  }, [phase, slideOrder, marketSize, monthlyRevenue, fundingAsk, qaAnswers])

  const investorFace = getInvestorFace(runningScore, INVESTOR_FACES)

  // Drag handlers
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    setSlideOrder(prev => {
      const newOrder = [...prev]
      const [dragged] = newOrder.splice(draggedIndex, 1)
      newOrder.splice(index, 0, dragged)
      return newOrder
    })
    setDraggedIndex(index)
  }, [draggedIndex])

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null)
  }, [])

  // Move up/down for mobile
  const moveSlide = useCallback((index: number, direction: -1 | 1) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= slideOrder.length) return
    setSlideOrder(prev => {
      const newOrder = [...prev]
      ;[newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]]
      return newOrder
    })
  }, [slideOrder.length])

  // Submit slide order
  const handleSubmitOrder = useCallback(() => {
    setPhase('numbers')
  }, [])

  // Submit numbers
  const handleSubmitNumbers = useCallback(() => {
    if (!marketSize || !monthlyRevenue || !fundingAsk) return
    setPhase('qa')
    setCurrentQuestion(0)
    setQaAnswers([])
  }, [marketSize, monthlyRevenue, fundingAsk])

  // Answer Q&A
  const handleAnswer = useCallback((score: number) => {
    const newAnswers = [...qaAnswers, score]
    setQaAnswers(newAnswers)
    if (currentQuestion < INVESTOR_QUESTIONS.length - 1) {
      setCurrentQuestion(prev => prev + 1)
    } else {
      // Calculate final score
      const swaps = countSwapsNeeded(slideOrder, CORRECT_ORDER)
      const maxSwaps = 5
      const slideScore = Math.round(300 * Math.max(0, 1 - swaps / maxSwaps))

      let numScore = 0
      if (marketSize === '$100M') numScore += 80
      else if (marketSize === '$1B') numScore += 50
      else if (marketSize === '$10M') numScore += 30
      if (monthlyRevenue === '$20K') numScore += 60
      else if (monthlyRevenue === '$50K') numScore += 40
      else if (monthlyRevenue === '$5K') numScore += 30
      if (fundingAsk === '$500K') numScore += 60
      else if (fundingAsk === '$2M') numScore += 30
      else if (fundingAsk === '$100K') numScore += 30

      const qaTotal = newAnswers.reduce((s, a) => s + a, 0)

      // Presentation quality: bonus for perfect order + good numbers
      const orderPerfect = swaps === 0
      const numbersGood = numScore >= 160
      const presentationScore = (orderPerfect ? 80 : 30) + (numbersGood ? 70 : 30)

      const totalScore = Math.min(1000, slideScore + numScore + qaTotal + presentationScore)

      setPhase('done')

      onComplete?.(totalScore, [
        { label: isRu ? 'Порядок слайдов' : isAr ? 'ترتيب الشرائح' : 'Slide order', value: slideScore, max: 300 },
        { label: isRu ? 'Ключевые цифры' : isAr ? 'الأرقام الرئيسية' : 'Key numbers', value: numScore, max: 200 },
        { label: isRu ? 'Ответы на вопросы' : isAr ? 'إجابات الأسئلة' : 'Q&A answers', value: qaTotal, max: 350 },
        { label: isRu ? 'Качество презентации' : isAr ? 'جودة العرض' : 'Presentation quality', value: presentationScore, max: 150 },
      ])
    }
  }, [qaAnswers, currentQuestion, slideOrder, marketSize, monthlyRevenue, fundingAsk, onComplete])

  /* --- Render: Done --- */
  if (phase === 'done') {
    const funded = runningScore >= 500
    return (
      <div className="bg-[var(--brand-panel)] border border-green-500/40 rounded-2xl p-8 text-center">
        <div className="text-6xl mb-4">{funded ? '\u{1F911}' : '\u{1F614}'}</div>
        <p className={`text-lg font-bold ${funded ? 'text-green-400' : 'text-red-400'}`}>
          {funded
            ? (isRu ? 'Инвестор согласился финансировать ваш стартап!' : isAr ? 'وافق المستثمر على تمويل شركتك الناشئة!' : 'Investor agreed to fund your startup!')
            : (isRu ? 'Инвестор отказал в этом раунде.' : isAr ? 'المستثمر رفض في هذه الجولة.' : 'Investor passed on this round.')}
        </p>
        <p className="text-gray-400 text-sm mt-2">{isRu ? 'Проверьте результаты выше.' : isAr ? 'تحقق من النتائج أعلاه.' : 'Check your results above.'}</p>
      </div>
    )
  }

  /* --- Render: Q&A Phase --- */
  if (phase === 'qa') {
    const q = INVESTOR_QUESTIONS[currentQuestion]
    return (
      <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl p-6">
        {/* Investor face */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-1">{investorFace.emoji}</div>
          <p className="text-sm text-gray-400">{isRu ? 'Инвестор' : isAr ? 'المستثمر' : 'Investor'}: {investorFace.label}</p>
        </div>

        <div className="mb-2 text-xs text-gray-500 font-bold">{isRu ? `Вопрос ${currentQuestion + 1} из ${INVESTOR_QUESTIONS.length}` : isAr ? `السؤال ${currentQuestion + 1} من ${INVESTOR_QUESTIONS.length}` : `Question ${currentQuestion + 1} of ${INVESTOR_QUESTIONS.length}`}</div>
        <h2 className="text-lg font-bold text-white mb-4">{q.question}</h2>

        <div className="space-y-3">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(opt.score)}
              className="w-full text-left p-4 rounded-xl border-2 border-gray-600 bg-gray-800/50 hover:border-amber-400 hover:bg-amber-900/20 transition-all text-sm text-gray-200"
            >
              {opt.text}
            </button>
          ))}
        </div>
      </div>
    )
  }

  /* --- Render: Numbers Phase --- */
  if (phase === 'numbers') {
    const allFilled = marketSize && monthlyRevenue && fundingAsk
    return (
      <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl p-6">
        {/* Investor face */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-1">{investorFace.emoji}</div>
          <p className="text-sm text-gray-400">{isRu ? 'Инвестор' : isAr ? 'المستثمر' : 'Investor'}: {investorFace.label}</p>
        </div>

        <h2 className="text-xl font-black text-white mb-2">{isRu ? 'Ключевые цифры' : isAr ? 'الأرقام الرئيسية' : 'Key Numbers'}</h2>
        <p className="text-gray-400 text-sm mb-6">{isRu ? 'Заполните 3 ключевые метрики для вашего питча.' : isAr ? 'أدخل 3 مقاييس رئيسية لعرضك.' : 'Fill in the 3 key metrics for your pitch.'}</p>

        <div className="space-y-4 mb-6">
          {/* Market Size */}
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">{isRu ? 'Общий адресуемый рынок (TAM)' : isAr ? 'إجمالي السوق المستهدف (TAM)' : 'Total Addressable Market (TAM)'}</label>
            <div className="grid grid-cols-3 gap-2">
              {['$10M', '$100M', '$1B'].map(v => (
                <button
                  key={v}
                  onClick={() => setMarketSize(v)}
                  className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${
                    marketSize === v
                      ? 'border-amber-400 bg-amber-900/30 text-amber-300'
                      : 'border-gray-600 bg-gray-800/50 text-gray-300 hover:border-gray-400'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Monthly Revenue */}
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">{isRu ? 'Текущая месячная выручка' : isAr ? 'الإيرادات الشهرية الحالية' : 'Current Monthly Revenue'}</label>
            <div className="grid grid-cols-3 gap-2">
              {['$5K', '$20K', '$50K'].map(v => (
                <button
                  key={v}
                  onClick={() => setMonthlyRevenue(v)}
                  className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${
                    monthlyRevenue === v
                      ? 'border-amber-400 bg-amber-900/30 text-amber-300'
                      : 'border-gray-600 bg-gray-800/50 text-gray-300 hover:border-gray-400'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Funding Ask */}
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">{isRu ? 'Запрос финансирования' : isAr ? 'طلب التمويل' : 'Funding Ask'}</label>
            <div className="grid grid-cols-3 gap-2">
              {['$100K', '$500K', '$2M'].map(v => (
                <button
                  key={v}
                  onClick={() => setFundingAsk(v)}
                  className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${
                    fundingAsk === v
                      ? 'border-amber-400 bg-amber-900/30 text-amber-300'
                      : 'border-gray-600 bg-gray-800/50 text-gray-300 hover:border-gray-400'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleSubmitNumbers}
          disabled={!allFilled}
          className="w-full px-6 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
        >
          {isRu ? 'Презентовать инвестору' : isAr ? 'قدّم للمستثمر' : 'Present to Investor'}
        </button>
      </div>
    )
  }

  /* --- Render: Arrange Phase --- */
  return (
    <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl overflow-hidden">
      {/* Animated canvas header */}
      <div className="flex justify-center bg-[#0C0A1A]">
        <PitchStageCanvas slideOrder={slideOrder} phase={phase} slides={SLIDES} stageLabel={isRu ? 'СЦЕНА ПИТЧА' : isAr ? 'منصة العرض' : 'PITCH STAGE'} />
      </div>

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700">
        <span className="text-xs text-gray-400 font-bold">{isRu ? 'Миссия 4: Питч инвестору' : isAr ? 'المهمة 4: العرض على المستثمر' : 'Mission 4: Investor Pitch'}</span>
        <span className="text-xs text-gray-400">{isRu ? 'Шаг 1 из 3' : isAr ? 'الخطوة 1 من 3' : 'Step 1 of 3'}</span>
      </div>

      {/* Briefing */}
      <div className="px-4 py-4 bg-indigo-950/40 border-b border-indigo-800/50">
        <h3 className="text-sm font-bold text-indigo-300 mb-2">{isRu ? 'Твоя миссия' : isAr ? 'مهمتك' : 'Your Mission'}</h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          <li className="flex items-start gap-2">
            <span className="shrink-0 text-indigo-400 mt-0.5">&#x2022;</span>
            <span className="flex-1">{isRu
              ? <>Расположи <span className="font-bold text-white">6 слайдов питч-дека</span> в правильном порядке.</>
              : isAr
              ? <>رتّب <span className="font-bold text-white">6 شرائح العرض</span> بالترتيب الصحيح.</>
              : <>Arrange your <span className="font-bold text-white">6 pitch deck slides</span> in the correct order.</>}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="shrink-0 text-yellow-400 mt-0.5">&#x26A0;</span>
            <span className="flex-1">{isRu ? 'Перетаскивай слайды или используй стрелки для изменения порядка.' : isAr ? 'اسحب الشرائح أو استخدم الأسهم لتغيير الترتيب.' : 'Drag slides up/down or use the arrow buttons to reorder them.'}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="shrink-0 text-green-400 mt-0.5">&#x1F3AF;</span>
            <span className="flex-1">{isRu
              ? <>Хороший питч рассказывает <span className="font-bold text-green-300">логичную историю</span> от проблемы до запроса.</>
              : isAr
              ? <>العرض الرائع يروي <span className="font-bold text-green-300">قصة منطقية</span> من المشكلة إلى الطلب.</>
              : <>A great pitch tells a <span className="font-bold text-green-300">logical story</span> from problem to ask.</>}</span>
          </li>
        </ul>
      </div>

      {/* Slide cards */}
      <div className="p-4">
        <div className="space-y-2 mb-6">
          {slideOrder.map((slideId, index) => {
            const slide = SLIDES.find(s => s.id === slideId)!
            return (
              <div
                key={slideId}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-grab active:cursor-grabbing ${
                  draggedIndex === index
                    ? 'border-amber-400 bg-amber-900/30 scale-[1.02] shadow-lg'
                    : 'border-gray-600 bg-gray-800/50 hover:border-gray-400'
                }`}
              >
                {/* Position number */}
                <span className="text-lg font-black text-gray-500 w-6 text-center">{index + 1}</span>

                {/* Icon */}
                <span className="text-2xl">{slide.icon}</span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="text-white font-bold text-sm">{slide.label}</div>
                  <div className="text-gray-400 text-xs truncate">{slide.description}</div>
                </div>

                {/* Move buttons for mobile */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); moveSlide(index, -1) }}
                    disabled={index === 0}
                    className="text-gray-400 hover:text-white disabled:opacity-20 text-xs px-1"
                  >
                    &#x25B2;
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); moveSlide(index, 1) }}
                    disabled={index === slideOrder.length - 1}
                    className="text-gray-400 hover:text-white disabled:opacity-20 text-xs px-1"
                  >
                    &#x25BC;
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSubmitOrder}
            className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors"
          >
            {isRu ? 'Зафиксировать порядок' : isAr ? 'تثبيت الترتيب' : 'Lock Order'} &#x2192;
          </button>
        </div>
      </div>
    </div>
  )
}
