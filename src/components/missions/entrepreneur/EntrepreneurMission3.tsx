'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useLocale } from 'next-intl'

/* --- Types --- */

interface Feature {
  id: number
  name: string
  weeks: number
  impact: number
  category: 'Core' | 'Nice-to-have' | 'Risky'
}

export interface ScoreBreakdownItem {
  label: string
  value: number
  max: number
}

interface EntrepreneurMission3Props {
  userId: string
  onComplete?: (score: number, breakdown: ScoreBreakdownItem[]) => void
}

/* --- Data --- */

const FEATURES: Feature[] = [
  { id: 1, name: 'User Registration',  weeks: 1, impact: 5, category: 'Core' },
  { id: 2, name: 'Basic Dashboard',    weeks: 2, impact: 4, category: 'Core' },
  { id: 3, name: 'Payment System',     weeks: 2, impact: 5, category: 'Core' },
  { id: 4, name: 'Social Sharing',     weeks: 1, impact: 2, category: 'Nice-to-have' },
  { id: 5, name: 'Dark Mode',          weeks: 1, impact: 1, category: 'Nice-to-have' },
  { id: 6, name: 'AI Chatbot',         weeks: 3, impact: 3, category: 'Risky' },
  { id: 7, name: 'Mobile App',         weeks: 3, impact: 4, category: 'Risky' },
  { id: 8, name: 'Analytics',          weeks: 1, impact: 3, category: 'Nice-to-have' },
]

const TIME_BUDGET = 6

const FEATURE_NAMES_RU: Record<string, string> = {
  'User Registration': 'Регистрация',
  'Basic Dashboard': 'Панель управления',
  'Payment System': 'Система оплаты',
  'Social Sharing': 'Соцсети',
  'Dark Mode': 'Тёмная тема',
  'AI Chatbot': 'ИИ-чатбот',
  'Mobile App': 'Мобильное приложение',
  'Analytics': 'Аналитика',
}

const CATEGORY_NAMES_RU: Record<string, string> = {
  'Core': 'Основное',
  'Nice-to-have': 'Желательно',
  'Risky': 'Рискованно',
}

const FEATURE_NAMES_AR: Record<string, string> = {
  'User Registration': 'تسجيل المستخدم',
  'Basic Dashboard': 'لوحة التحكم الأساسية',
  'Payment System': 'نظام الدفع',
  'Social Sharing': 'المشاركة الاجتماعية',
  'Dark Mode': 'الوضع الداكن',
  'AI Chatbot': 'روبوت محادثة ذكي',
  'Mobile App': 'تطبيق الجوال',
  'Analytics': 'التحليلات',
}

const CATEGORY_NAMES_AR: Record<string, string> = {
  'Core': 'أساسي',
  'Nice-to-have': 'مستحسن',
  'Risky': 'محفوف بالمخاطر',
}

const CATEGORY_COLORS: Record<string, string> = {
  'Core':         'text-blue-400 bg-blue-900/40 border-blue-700',
  'Nice-to-have': 'text-green-400 bg-green-900/40 border-green-700',
  'Risky':        'text-red-400 bg-red-900/40 border-red-700',
}

const CATEGORY_ICONS: Record<string, string> = {
  'Core':         '\u{2B50}',
  'Nice-to-have': '\u{1F48E}',
  'Risky':        '\u{26A0}\uFE0F',
}

/* --- Helpers --- */

/**
 * Star rating using filled/empty unicode stars (not emoji) so CSS color works.
 */
function StarRating({ stars, max = 5 }: { stars: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={`text-xs ${i < stars ? 'text-yellow-400' : 'text-gray-600'}`}
          style={{ fontFamily: 'sans-serif' }}
        >
          {i < stars ? '\u2605' : '\u2606'}
        </span>
      ))}
    </div>
  )
}

interface Review {
  text: string
  type: 'positive' | 'negative' | 'neutral'
}

function generateReviews(selectedIds: number[], locale: string = 'en'): Review[] {
  const reviews: Review[] = []
  const selected = FEATURES.filter(f => selectedIds.includes(f.id))
  const coreSelected = selected.filter(f => f.category === 'Core')
  const coreMissing = FEATURES.filter(f => f.category === 'Core' && !selectedIds.includes(f.id))
  const riskySelected = selected.filter(f => f.category === 'Risky')
  const niceSelected = selected.filter(f => f.category === 'Nice-to-have')
  const ru = locale === 'ru'
  const ar = locale === 'ar'

  // Positive reviews for core features
  for (const f of coreSelected) {
    if (f.name === 'User Registration') {
      reviews.push({ text: ru ? '"Регистрация быстрая и простая. Отличное первое впечатление!"' : ar ? '"التسجيل كان سريعاً وسهلاً. انطباع أول ممتاز!"' : '"Signing up was quick and easy. Great first impression!"', type: 'positive' })
    } else if (f.name === 'Basic Dashboard') {
      reviews.push({ text: ru ? '"Панель управления удобная, всё легко найти."' : ar ? '"لوحة التحكم نظيفة وأجد كل ما أحتاجه."' : '"The dashboard is clean and I can find everything I need."', type: 'positive' })
    } else if (f.name === 'Payment System') {
      reviews.push({ text: ru ? '"Оплатил сразу. Процесс покупки очень удобный!"' : ar ? '"تمكنت من الدفع فوراً. عملية الشراء سلسة!"' : '"I was able to pay right away. The checkout was smooth!"', type: 'positive' })
    }
  }

  // Negative reviews for missing core
  for (const f of coreMissing) {
    if (f.name === 'User Registration') {
      reviews.push({ text: ru ? '"Даже аккаунт создать нельзя?! Как этим пользоваться?"' : ar ? '"لا أستطيع حتى إنشاء حساب؟! كيف أستخدم هذا؟"' : '"I can\'t even create an account?! How do I use this?"', type: 'negative' })
    } else if (f.name === 'Basic Dashboard') {
      reviews.push({ text: ru ? '"Нет возможности посмотреть данные. Приложение пустое."' : ar ? '"لا توجد طريقة لرؤية بياناتي. التطبيق يبدو فارغاً."' : '"There\'s no way to see my data. The app feels empty."', type: 'negative' })
    } else if (f.name === 'Payment System') {
      reviews.push({ text: ru ? '"Хочу заплатить, но нет такой возможности. Ухожу."' : ar ? '"أريد الدفع لكن لا توجد طريقة. سأغادر."' : '"I want to pay but there\'s no way to do it. I\'m leaving."', type: 'negative' })
    }
  }

  // Risky without all core = very negative
  if (riskySelected.length > 0 && coreSelected.length < 3) {
    for (const f of riskySelected) {
      if (f.name === 'AI Chatbot') {
        reviews.push({ text: ru ? '"Зачем ИИ, если даже логина нет?! У продукта нет приоритетов."' : ar ? '"لماذا تضيفون ذكاء اصطناعي بدون تسجيل دخول؟! لا توجد أولويات."' : '"Why add AI but no login?! This product has no priorities."', type: 'negative' })
      } else if (f.name === 'Mobile App') {
        reviews.push({ text: ru ? '"Мобильное приложение до того, как работает основное? Пустая трата времени."' : ar ? '"تطبيق جوال قبل أن تعمل الأساسيات؟ مضيعة للوقت."' : '"A mobile app before the basics work? Waste of time."', type: 'negative' })
      }
    }
  } else if (riskySelected.length > 0) {
    // Risky with all core = neutral/positive
    for (const f of riskySelected) {
      const displayName = ru ? (FEATURE_NAMES_RU[f.name] || f.name) : ar ? (FEATURE_NAMES_AR[f.name] || f.name) : f.name
      reviews.push({ text: ru ? `"${displayName} — смелый шаг. Интересно, но ещё сыровато."` : ar ? `"${displayName} — خطوة جريئة. مثير للاهتمام لكنه لا يزال خاماً."` : `"${f.name} is a bold move. Interesting but still rough."`, type: 'neutral' })
    }
  }

  // Nice-to-have = slight positive
  for (const f of niceSelected) {
    if (f.name === 'Social Sharing') {
      reviews.push({ text: ru ? '"Поделился продуктом с друзьями. Приятная функция!"' : ar ? '"شاركت المنتج مع أصدقائي. لمسة لطيفة!"' : '"I shared the product with friends. Nice touch!"', type: 'positive' })
    } else if (f.name === 'Dark Mode') {
      reviews.push({ text: ru ? '"Тёмная тема — это приятно, но хотелось бы, чтобы основные функции работали лучше."' : ar ? '"الوضع الداكن لطيف لكن أتمنى أن تعمل الميزات الأساسية بشكل أفضل."' : '"Dark mode is nice but I wish core features worked better."', type: 'neutral' })
    } else if (f.name === 'Analytics') {
      reviews.push({ text: ru ? '"Аналитика помогает понять, как я использую продукт. Полезно!"' : ar ? '"التحليلات تساعدني على فهم استخدامي. مفيدة!"' : '"The analytics help me understand my usage. Helpful!"', type: 'positive' })
    }
  }

  return reviews
}

/* --- Canvas Header Constants --- */

const CANVAS_W = 600
const CANVAS_H = 160

// Isometric card dimensions
const CARD_W = 36
const CARD_H = 24
const CARD_DEPTH = 4

// Column positions (To Do, In Progress, Done)
function getColumns(locale: string) {
  return [
    { label: locale === 'ru' ? 'К выполнению' : locale === 'ar' ? 'للتنفيذ' : 'To Do', x: 120, color: '#6366F1' },
    { label: locale === 'ru' ? 'В работе' : locale === 'ar' ? 'قيد التنفيذ' : 'In Progress', x: 300, color: '#F59E0B' },
    { label: locale === 'ru' ? 'Готово' : locale === 'ar' ? 'مكتمل' : 'Done', x: 480, color: '#22C55E' },
  ]
}

interface StickyParticle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  rotation: number
  rotSpeed: number
  alpha: number
  life: number
}

function createStickyParticles(count: number): StickyParticle[] {
  const colors = ['#FBBF24', '#60A5FA', '#F472B6', '#34D399', '#A78BFA', '#FB923C']
  const particles: StickyParticle[] = []
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * CANVAS_W,
      y: Math.random() * CANVAS_H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -Math.random() * 0.4 - 0.1,
      size: Math.random() * 3 + 1.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.03,
      alpha: Math.random() * 0.4 + 0.1,
      life: Math.random(),
    })
  }
  return particles
}

function drawIsometricCard(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  color: string, glowIntensity: number,
) {
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)'
  ctx.beginPath()
  ctx.moveTo(x, y + 4)
  ctx.lineTo(x + CARD_W / 2, y + CARD_H / 2 + 4)
  ctx.lineTo(x, y + CARD_H + 4)
  ctx.lineTo(x - CARD_W / 2, y + CARD_H / 2 + 4)
  ctx.closePath()
  ctx.fill()

  // Card top face
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + CARD_W / 2, y + CARD_H / 2)
  ctx.lineTo(x, y + CARD_H)
  ctx.lineTo(x - CARD_W / 2, y + CARD_H / 2)
  ctx.closePath()
  ctx.fill()

  // Card right side (depth)
  ctx.fillStyle = shadeColor(color, -30)
  ctx.beginPath()
  ctx.moveTo(x + CARD_W / 2, y + CARD_H / 2)
  ctx.lineTo(x + CARD_W / 2, y + CARD_H / 2 + CARD_DEPTH)
  ctx.lineTo(x, y + CARD_H + CARD_DEPTH)
  ctx.lineTo(x, y + CARD_H)
  ctx.closePath()
  ctx.fill()

  // Card left side (depth)
  ctx.fillStyle = shadeColor(color, -50)
  ctx.beginPath()
  ctx.moveTo(x - CARD_W / 2, y + CARD_H / 2)
  ctx.lineTo(x - CARD_W / 2, y + CARD_H / 2 + CARD_DEPTH)
  ctx.lineTo(x, y + CARD_H + CARD_DEPTH)
  ctx.lineTo(x, y + CARD_H)
  ctx.closePath()
  ctx.fill()

  // Border
  ctx.strokeStyle = shadeColor(color, 30)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + CARD_W / 2, y + CARD_H / 2)
  ctx.lineTo(x, y + CARD_H)
  ctx.lineTo(x - CARD_W / 2, y + CARD_H / 2)
  ctx.closePath()
  ctx.stroke()

  // Glow
  if (glowIntensity > 0) {
    ctx.save()
    ctx.globalAlpha = glowIntensity * 0.4
    ctx.shadowColor = color
    ctx.shadowBlur = 12
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + CARD_W / 2, y + CARD_H / 2)
    ctx.lineTo(x, y + CARD_H)
    ctx.lineTo(x - CARD_W / 2, y + CARD_H / 2)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
}

function shadeColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, Math.max(0, (num >> 16) + percent))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent))
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent))
  return `rgb(${r},${g},${b})`
}

function drawKanbanBoard(
  ctx: CanvasRenderingContext2D,
  time: number,
  selectedCount: number,
  totalWeeksUsed: number,
  timeBudget: number,
  locale: string = 'en',
) {
  const COLUMNS = getColumns(locale)

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
  grad.addColorStop(0, '#0F172A')
  grad.addColorStop(1, '#1E1B4B')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // Grid pattern (subtle)
  ctx.strokeStyle = 'rgba(99,102,241,0.06)'
  ctx.lineWidth = 1
  for (let x = 0; x < CANVAS_W; x += 30) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, CANVAS_H)
    ctx.stroke()
  }
  for (let y = 0; y < CANVAS_H; y += 30) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(CANVAS_W, y)
    ctx.stroke()
  }

  // Column headers and dividers
  COLUMNS.forEach((col, ci) => {
    // Column background
    ctx.fillStyle = 'rgba(30,41,59,0.5)'
    ctx.beginPath()
    const colW = 130
    const rx = col.x - colW / 2
    const ry = 20
    const rh = 120
    roundRect(ctx, rx, ry, colW, rh, 8)
    ctx.fill()

    // Column border
    ctx.strokeStyle = col.color + '40'
    ctx.lineWidth = 1
    roundRect(ctx, rx, ry, colW, rh, 8)
    ctx.stroke()

    // Column label
    ctx.fillStyle = col.color
    ctx.font = 'bold 10px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(col.label, col.x, 36)

    // Glow dot on header
    ctx.save()
    ctx.globalAlpha = 0.3 + Math.sin(time * 2 + ci) * 0.15
    ctx.shadowColor = col.color
    ctx.shadowBlur = 8
    ctx.fillStyle = col.color
    ctx.beginPath()
    ctx.arc(col.x - colW / 2 + 12, 32, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  })

  // Draw cards in columns
  // "To Do" column: total features minus selected
  const todoCards = Math.max(0, 8 - selectedCount)
  const inProgressCards = selectedCount
  const doneCards = 0

  const cardCounts = [todoCards, inProgressCards, doneCards]
  const cardColors = ['#818CF8', '#FBBF24', '#34D399']

  cardCounts.forEach((count, ci) => {
    const colX = COLUMNS[ci].x
    for (let i = 0; i < Math.min(count, 5); i++) {
      const cardY = 48 + i * 16
      const wobble = Math.sin(time * 1.5 + i * 0.7 + ci * 2) * 1.5
      const glowPulse = ci === 1 ? (Math.sin(time * 3 + i) * 0.5 + 0.5) : 0
      drawIsometricCard(ctx, colX + wobble, cardY, cardColors[ci], glowPulse)
    }
    // Show count if more than 5
    if (count > 5) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.font = '9px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(locale === 'ru' ? `+${count - 5} ещё` : locale === 'ar' ? `+${count - 5} أخرى` : `+${count - 5} more`, colX, 135)
    }
  })

  // Sprint progress bar at bottom
  const barX = 60
  const barY = 148
  const barW = CANVAS_W - 120
  const barH = 6
  const progress = Math.min(1, totalWeeksUsed / timeBudget)

  // Bar background
  ctx.fillStyle = 'rgba(51,65,85,0.6)'
  ctx.beginPath()
  roundRect(ctx, barX, barY, barW, barH, 3)
  ctx.fill()

  // Bar fill with glow
  const barColor = progress <= 1 ? '#22C55E' : '#EF4444'
  ctx.save()
  ctx.shadowColor = barColor
  ctx.shadowBlur = 6
  ctx.fillStyle = barColor
  ctx.beginPath()
  roundRect(ctx, barX, barY, barW * Math.min(progress, 1), barH, 3)
  ctx.fill()
  ctx.restore()

  // Week labels
  ctx.fillStyle = 'rgba(148,163,184,0.7)'
  ctx.font = '8px system-ui, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(locale === 'ru' ? 'Неделя 0' : locale === 'ar' ? 'الأسبوع 0' : 'Week 0', barX, barY - 3)
  ctx.textAlign = 'right'
  ctx.fillText(locale === 'ru' ? `Неделя ${timeBudget}` : locale === 'ar' ? `الأسبوع ${timeBudget}` : `Week ${timeBudget}`, barX + barW, barY - 3)
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.fillText(`${totalWeeksUsed}/${timeBudget}`, barX + barW * progress, barY - 3)

  // Timer icon (top right)
  const clockX = CANVAS_W - 40
  const clockY = 30
  const clockR = 12
  ctx.save()
  ctx.strokeStyle = '#94A3B8'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(clockX, clockY, clockR, 0, Math.PI * 2)
  ctx.stroke()

  // Clock hands
  const sec = time * 0.5
  ctx.strokeStyle = '#E2E8F0'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(clockX, clockY)
  ctx.lineTo(clockX + Math.sin(sec) * 8, clockY - Math.cos(sec) * 8)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(clockX, clockY)
  ctx.lineTo(clockX + Math.sin(sec * 0.08) * 6, clockY - Math.cos(sec * 0.08) * 6)
  ctx.stroke()

  // Clock center dot
  ctx.fillStyle = '#FBBF24'
  ctx.beginPath()
  ctx.arc(clockX, clockY, 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // "SPRINT" label top left
  ctx.fillStyle = 'rgba(129,140,248,0.8)'
  ctx.font = 'bold 11px system-ui, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(locale === 'ru' ? 'ДОСКА СПРИНТА' : locale === 'ar' ? 'لوحة السبرنت' : 'SPRINT BOARD', 16, 14)
}

function roundRect(
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

/* --- Canvas Header Component --- */

function SprintBoardCanvas({ selectedCount, totalWeeks, locale }: { selectedCount: number; totalWeeks: number; locale: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<StickyParticle[]>(createStickyParticles(15))
  const animRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let startTime = performance.now()

    const render = (now: number) => {
      const time = (now - startTime) / 1000

      // Draw main board
      drawKanbanBoard(ctx, time, selectedCount, totalWeeks, TIME_BUDGET, locale)

      // Draw particles
      const particles = particlesRef.current
      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        p.rotation += p.rotSpeed
        p.life -= 0.002

        // Wrap around
        if (p.y < -5) { p.y = CANVAS_H + 5; p.life = 1 }
        if (p.x < -5) p.x = CANVAS_W + 5
        if (p.x > CANVAS_W + 5) p.x = -5
        if (p.life <= 0) {
          p.y = CANVAS_H + 5
          p.life = 1
          p.alpha = Math.random() * 0.4 + 0.1
        }

        ctx.save()
        ctx.globalAlpha = p.alpha * p.life
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
        ctx.restore()
      })

      animRef.current = requestAnimationFrame(render)
    }

    animRef.current = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animRef.current)
    }
  }, [selectedCount, totalWeeks, locale])

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

export default function EntrepreneurMission3({ userId, onComplete }: EntrepreneurMission3Props) {
  const locale = useLocale()
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [phase, setPhase] = useState<'building' | 'launch' | 'done'>('building')
  const [reviewStep, setReviewStep] = useState(0)

  // Derived
  const selectedFeatures = useMemo(
    () => FEATURES.filter(f => selectedIds.includes(f.id)),
    [selectedIds],
  )
  const totalWeeks = useMemo(
    () => selectedFeatures.reduce((sum, f) => sum + f.weeks, 0),
    [selectedFeatures],
  )
  const withinTime = totalWeeks <= TIME_BUDGET
  const coreCount = useMemo(
    () => selectedFeatures.filter(f => f.category === 'Core').length,
    [selectedFeatures],
  )
  const allCoreSelected = coreCount === 3
  const riskyWithoutCore = useMemo(
    () => selectedFeatures.some(f => f.category === 'Risky') && !allCoreSelected,
    [selectedFeatures, allCoreSelected],
  )

  // Reviews
  const reviews = useMemo(() => generateReviews(selectedIds, locale), [selectedIds, locale])
  const positiveReviews = reviews.filter(r => r.type === 'positive')
  const negativeReviews = reviews.filter(r => r.type === 'negative')

  // Customer count
  const customerCount = useMemo(() => {
    let count = 20
    for (const f of selectedFeatures) {
      if (f.category === 'Core') count += 15
      else if (f.category === 'Nice-to-have') count += 5
      else if (f.category === 'Risky' && allCoreSelected) count += 10
      else if (f.category === 'Risky') count -= 5
    }
    return Math.max(0, count)
  }, [selectedFeatures, allCoreSelected])

  // Toggle feature
  const toggleFeature = useCallback((id: number) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id],
    )
  }, [])

  // Launch
  const handleLaunch = useCallback(() => {
    if (selectedIds.length === 0) return
    setPhase('launch')
    setReviewStep(0)
  }, [selectedIds])

  // Advance review
  const advanceReview = useCallback(() => {
    if (reviewStep < reviews.length - 1) {
      setReviewStep(prev => prev + 1)
    } else {
      // Calculate score
      const coreScore = coreCount * 150 // max 450
      const timeScore = withinTime ? 200 : 0
      const totalReviews = positiveReviews.length + negativeReviews.length
      const satisfactionRatio = totalReviews > 0 ? positiveReviews.length / totalReviews : 0
      const satisfactionScore = Math.round(satisfactionRatio * 200)
      const mvpFocusScore = riskyWithoutCore ? 0 : 150
      const totalScore = Math.min(1000, coreScore + timeScore + satisfactionScore + mvpFocusScore)

      setPhase('done')

      onComplete?.(totalScore, [
        { label: locale === 'ru' ? `Основные функции (${coreCount}/3)` : locale === 'ar' ? `الميزات الأساسية (${coreCount}/3)` : `Core features (${coreCount}/3)`, value: coreScore, max: 450 },
        { label: locale === 'ru' ? 'Управление временем' : locale === 'ar' ? 'إدارة الوقت' : 'Time management', value: timeScore, max: 200 },
        { label: locale === 'ru' ? 'Удовлетворённость клиентов' : locale === 'ar' ? 'رضا العملاء' : 'Customer satisfaction', value: satisfactionScore, max: 200 },
        { label: locale === 'ru' ? 'Фокус на MVP' : locale === 'ar' ? 'التركيز على MVP' : 'MVP focus', value: mvpFocusScore, max: 150 },
      ])
    }
  }, [reviewStep, reviews, coreCount, withinTime, positiveReviews, negativeReviews, riskyWithoutCore, onComplete, locale])

  /* --- Render: Done --- */
  if (phase === 'done') {
    return (
      <div className="bg-[var(--brand-panel)] border border-green-500/40 rounded-2xl p-8 text-center">
        <div className="text-6xl mb-4">&#x1F680;</div>
        <p className="text-lg font-bold text-green-400">{locale === 'ru' ? 'Продукт запущен!' : locale === 'ar' ? 'تم إطلاق المنتج!' : 'Product launched!'}</p>
        <p className="text-gray-400 text-sm mt-2">{locale === 'ru' ? `${customerCount} клиентов зарегистрировались. Проверьте результаты выше.` : locale === 'ar' ? `${customerCount} عميل سجلوا. تحقق من النتائج أعلاه.` : `${customerCount} customers signed up. Check your results above.`}</p>
      </div>
    )
  }

  /* --- Render: Launch / Reviews --- */
  if (phase === 'launch') {
    return (
      <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl p-6">
        <h2 className="text-xl font-black text-white mb-2">{locale === 'ru' ? 'День запуска!' : locale === 'ar' ? 'يوم الإطلاق!' : 'Launch Day!'}</h2>
        <p className="text-gray-400 text-sm mb-4">{locale === 'ru' ? 'Реакции клиентов поступают...' : locale === 'ar' ? 'ردود فعل العملاء بدأت بالوصول...' : 'Customer reactions are coming in...'}</p>

        {/* Selected features summary */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {selectedFeatures.map(f => (
            <span key={f.id} className={`px-2 py-1 rounded-lg text-xs font-bold border ${CATEGORY_COLORS[f.category]}`}>
              {locale === 'ru' ? FEATURE_NAMES_RU[f.name] : locale === 'ar' ? FEATURE_NAMES_AR[f.name] : f.name}
            </span>
          ))}
        </div>

        {/* Customer counter */}
        <div className="text-center mb-4">
          <span className="text-3xl font-black text-white">{customerCount}</span>
          <span className="text-gray-400 text-sm ml-2">{locale === 'ru' ? 'клиентов' : locale === 'ar' ? 'عملاء' : 'customers'}</span>
        </div>

        {/* Reviews */}
        <div className="space-y-3 mb-6">
          {reviews.slice(0, reviewStep + 1).map((review, i) => (
            <div
              key={i}
              className={`p-4 rounded-xl border text-sm font-medium animate-in fade-in slide-in-from-bottom-2 ${
                review.type === 'positive'
                  ? 'bg-green-900/30 border-green-700 text-green-300'
                  : review.type === 'negative'
                  ? 'bg-red-900/30 border-red-700 text-red-300'
                  : 'bg-gray-800/50 border-gray-600 text-gray-300'
              }`}
            >
              {review.text}
            </div>
          ))}
        </div>

        <button
          onClick={advanceReview}
          className="w-full px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors"
        >
          {reviewStep < reviews.length - 1 ? (locale === 'ru' ? 'Следующий отзыв...' : locale === 'ar' ? 'التقييم التالي...' : 'Next Review...') : (locale === 'ru' ? 'Посмотреть результаты' : locale === 'ar' ? 'عرض النتائج' : 'See Results')}
        </button>
      </div>
    )
  }

  /* --- Render: Building Phase --- */
  return (
    <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl overflow-hidden">
      {/* Animated canvas header */}
      <div className="flex justify-center bg-[#0F172A]">
        <SprintBoardCanvas selectedCount={selectedIds.length} totalWeeks={totalWeeks} locale={locale} />
      </div>

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700">
        <span className="text-xs text-gray-400 font-bold">{locale === 'ru' ? 'Миссия 3: Запуск MVP' : locale === 'ar' ? 'المهمة 3: إطلاق MVP' : 'Mission 3: MVP Launch'}</span>
        <span className="text-xs text-gray-400">
          {locale === 'ru' ? 'Функции' : locale === 'ar' ? 'الميزات' : 'Features'}: <span className="text-white font-bold">{selectedIds.length}</span>
        </span>
      </div>

      {/* Briefing panel */}
      <div className="px-4 py-4 bg-indigo-950/40 border-b border-indigo-800/50">
        <h3 className="text-sm font-bold text-indigo-300 mb-2">{locale === 'ru' ? 'Ваша миссия' : locale === 'ar' ? 'مهمتك' : 'Your Mission'}</h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          <li className="flex items-start gap-2">
            <span className="text-indigo-400 mt-0.5">&#x2022;</span>
            {locale === 'ru' ? (<>Создайте свой <span className="font-bold text-white">MVP (минимально жизнеспособный продукт)</span> — выберите правильные функции для запуска.</>) : locale === 'ar' ? (<>ابنِ <span className="font-bold text-white">MVP (الحد الأدنى من المنتج القابل للتطبيق)</span> — اختر الميزات المناسبة للإطلاق.</>) : (<>Build your <span className="font-bold text-white">MVP (Minimum Viable Product)</span> -- choose the right features to launch.</>)}
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-400 mt-0.5">&#x23F0;</span>
            {locale === 'ru' ? (<>У вас есть <span className="font-bold text-blue-300">{TIME_BUDGET} недель</span> на разработку. <span className="font-bold text-blue-300">Основные</span> функции обязательны.</>) : locale === 'ar' ? (<>لديك <span className="font-bold text-blue-300">{TIME_BUDGET} أسابيع</span> للتطوير. الميزات <span className="font-bold text-blue-300">الأساسية</span> ضرورية.</>) : (<>You have <span className="font-bold text-blue-300">{TIME_BUDGET} weeks</span> of development time. <span className="font-bold text-blue-300">Core</span> features are must-haves.</>)}
          </li>
          <li className="flex items-start gap-2">
            <span className="text-red-400 mt-0.5">&#x26A0;</span>
            {locale === 'ru' ? (<>Будьте осторожны с <span className="font-bold text-red-300">рискованными</span> функциями — они могут навредить, если основы не покрыты!</>) : locale === 'ar' ? (<>كن حذراً مع الميزات <span className="font-bold text-red-300">المحفوفة بالمخاطر</span> — قد تأتي بنتائج عكسية إذا لم تُغطَّ الأساسيات!</>) : (<>Be careful with <span className="font-bold text-red-300">Risky</span> features -- they can backfire if basics aren&apos;t covered!</>)}
          </li>
        </ul>
      </div>

      {/* Time bar */}
      <div className="px-4 py-3 bg-gray-900/50 border-b border-gray-700">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400 font-bold">{locale === 'ru' ? 'Время разработки' : locale === 'ar' ? 'وقت التطوير' : 'Development Time'}</span>
          <span className={`text-xs font-bold ${withinTime ? 'text-green-400' : 'text-red-400'}`}>
            {totalWeeks} / {TIME_BUDGET} {locale === 'ru' ? 'нед.' : locale === 'ar' ? 'أسابيع' : 'weeks'}
          </span>
        </div>
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              withinTime ? 'bg-green-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(100, (totalWeeks / TIME_BUDGET) * 100)}%` }}
          />
        </div>
        {riskyWithoutCore && (
          <p className="text-red-400 text-xs mt-1">
            {locale === 'ru' ? 'Внимание: добавлять рискованные функции без всех основных — опасно!' : locale === 'ar' ? 'تحذير: إضافة ميزات محفوفة بالمخاطر بدون جميع الميزات الأساسية أمر خطير!' : 'Warning: Adding risky features without all core features first is dangerous!'}
          </p>
        )}
      </div>

      {/* Feature grid */}
      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {FEATURES.map(f => {
            const isSelected = selectedIds.includes(f.id)

            return (
              <button
                key={f.id}
                onClick={() => toggleFeature(f.id)}
                className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? 'border-amber-400 bg-amber-900/30 scale-[1.02] shadow-lg shadow-amber-900/20'
                    : 'border-gray-600 bg-gray-800/50 hover:border-gray-400 hover:bg-gray-800'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-2 right-2 text-amber-400 text-lg">&#x2713;</span>
                )}

                {/* Name */}
                <div className="text-white font-bold text-sm mb-1">{locale === 'ru' ? FEATURE_NAMES_RU[f.name] : locale === 'ar' ? FEATURE_NAMES_AR[f.name] : f.name}</div>

                {/* Category badge */}
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border mb-2 ${CATEGORY_COLORS[f.category]}`}>
                  <span>{CATEGORY_ICONS[f.category]}</span>
                  {locale === 'ru' ? CATEGORY_NAMES_RU[f.category] : locale === 'ar' ? CATEGORY_NAMES_AR[f.category] : f.category}
                </div>

                {/* Dev time */}
                <div className="text-gray-300 text-xs mb-1">
                  {locale === 'ru' ? 'Время' : locale === 'ar' ? 'الوقت' : 'Time'}: <span className="text-white font-bold">{f.weeks} {locale === 'ru' ? (f.weeks === 1 ? 'неделя' : f.weeks < 5 ? 'недели' : 'недель') : locale === 'ar' ? (f.weeks === 1 ? 'أسبوع' : 'أسابيع') : (f.weeks > 1 ? 'weeks' : 'week')}</span>
                </div>

                {/* Impact */}
                <div className="flex items-center gap-1">
                  <span className="text-gray-400 text-xs">{locale === 'ru' ? 'Влияние' : locale === 'ar' ? 'التأثير' : 'Impact'}:</span>
                  <StarRating stars={f.impact} />
                </div>
              </button>
            )
          })}
        </div>

        {/* Launch button */}
        <div className="flex justify-end">
          <button
            onClick={handleLaunch}
            disabled={selectedIds.length === 0}
            className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
          >
            {locale === 'ru' ? 'Запуск!' : locale === 'ar' ? 'إطلاق!' : 'Launch!'} &#x1F680;
          </button>
        </div>
      </div>
    </div>
  )
}
