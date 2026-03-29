'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useLocale } from 'next-intl'

/* --- Types --- */

export interface ScoreBreakdownItem {
  label: string
  value: number
  max: number
}

interface EntrepreneurMission6Props {
  userId: string
  onComplete?: (score: number, breakdown: ScoreBreakdownItem[]) => void
}

/* --- Data --- */

interface Metrics {
  money: number
  customers: number
  morale: number
  reputation: number
}

interface RoundOption {
  text: string
  effects: Partial<Metrics>
}

interface Round {
  title: string
  scenario: string
  options: [RoundOption, RoundOption, RoundOption]
  worstOptionIndex: number // auto-selected if timer expires
}

const ROUNDS_EN: Round[] = [
  {
    title: 'Round 1: Competitor Launches',
    scenario: 'A well-funded competitor just launched a cheaper version of your product. Customers are asking questions. What do you do?',
    options: [
      { text: 'Lower your price to match', effects: { money: -15, customers: 5, morale: -5, reputation: -5 } },
      { text: 'Add premium features they lack', effects: { money: -10, customers: 10, morale: 5, reputation: 15 } },
      { text: 'Pivot to a new market segment', effects: { money: -20, customers: -5, morale: -10, reputation: 10 } },
    ],
    worstOptionIndex: 2,
  },
  {
    title: 'Round 2: Team Panics',
    scenario: 'Your team saw the competitor news. Two engineers are updating their LinkedIn profiles. Morale is dropping fast.',
    options: [
      { text: 'Reassure the team with a clear plan', effects: { money: 0, customers: 0, morale: 15, reputation: 5 } },
      { text: 'Hire an expensive consultant to boost confidence', effects: { money: -20, customers: 0, morale: 5, reputation: 10 } },
      { text: 'Give everyone bonuses to keep them', effects: { money: -25, customers: 0, morale: 20, reputation: 0 } },
    ],
    worstOptionIndex: 1,
  },
  {
    title: 'Round 3: Customers Leaving',
    scenario: '15% of your customers switched to the competitor last week. You need to stop the bleeding NOW.',
    options: [
      { text: 'Launch a loyalty program with rewards', effects: { money: -10, customers: 10, morale: 5, reputation: 10 } },
      { text: 'Match the competitor price', effects: { money: -15, customers: 5, morale: 0, reputation: -5 } },
      { text: 'Ship a major product improvement', effects: { money: -5, customers: 15, morale: 10, reputation: 15 } },
    ],
    worstOptionIndex: 1,
  },
  {
    title: 'Round 4: Press Coverage',
    scenario: 'TechCrunch writes an article: "Is [Your Company] losing the battle?" Your inbox is flooded with worried investor emails.',
    options: [
      { text: 'Launch a PR campaign showing growth metrics', effects: { money: -15, customers: 5, morale: 5, reputation: 20 } },
      { text: 'Ignore it and focus on product', effects: { money: 0, customers: -5, morale: -5, reputation: -15 } },
      { text: 'Write a public counter-article', effects: { money: -5, customers: 0, morale: 0, reputation: 5 } },
    ],
    worstOptionIndex: 1,
  },
  {
    title: 'Round 5: Board Meeting',
    scenario: 'The board demands a strategy update. Three options are on the table. This decision shapes the company future.',
    options: [
      { text: 'Pivot the product to enterprise B2B', effects: { money: -10, customers: -10, morale: -5, reputation: 10 } },
      { text: 'Double down on current strategy with aggressive growth', effects: { money: -15, customers: 15, morale: 10, reputation: 15 } },
      { text: 'Seek a merger with a larger company', effects: { money: 10, customers: -5, morale: -15, reputation: 5 } },
    ],
    worstOptionIndex: 2,
  },
]

const ROUNDS_RU: Round[] = [
  {
    title: 'Раунд 1: Конкурент выходит на рынок',
    scenario: 'Хорошо финансируемый конкурент только что выпустил более дешёвую версию вашего продукта. Клиенты задают вопросы. Что вы будете делать?',
    options: [
      { text: 'Снизить цену до уровня конкурента', effects: { money: -15, customers: 5, morale: -5, reputation: -5 } },
      { text: 'Добавить премиум-функции, которых у них нет', effects: { money: -10, customers: 10, morale: 5, reputation: 15 } },
      { text: 'Перейти в новый сегмент рынка', effects: { money: -20, customers: -5, morale: -10, reputation: 10 } },
    ],
    worstOptionIndex: 2,
  },
  {
    title: 'Раунд 2: Команда в панике',
    scenario: 'Команда увидела новости о конкуренте. Два инженера обновляют свои профили на LinkedIn. Боевой дух стремительно падает.',
    options: [
      { text: 'Успокоить команду чётким планом действий', effects: { money: 0, customers: 0, morale: 15, reputation: 5 } },
      { text: 'Нанять дорогого консультанта для повышения уверенности', effects: { money: -20, customers: 0, morale: 5, reputation: 10 } },
      { text: 'Выдать всем бонусы, чтобы удержать', effects: { money: -25, customers: 0, morale: 20, reputation: 0 } },
    ],
    worstOptionIndex: 1,
  },
  {
    title: 'Раунд 3: Клиенты уходят',
    scenario: '15% ваших клиентов перешли к конкуренту на прошлой неделе. Нужно остановить потери СЕЙЧАС.',
    options: [
      { text: 'Запустить программу лояльности с бонусами', effects: { money: -10, customers: 10, morale: 5, reputation: 10 } },
      { text: 'Снизить цену до уровня конкурента', effects: { money: -15, customers: 5, morale: 0, reputation: -5 } },
      { text: 'Выпустить крупное улучшение продукта', effects: { money: -5, customers: 15, morale: 10, reputation: 15 } },
    ],
    worstOptionIndex: 1,
  },
  {
    title: 'Раунд 4: Публикация в прессе',
    scenario: 'TechCrunch публикует статью: «Проигрывает ли [Ваша Компания] битву?» Почта завалена письмами от обеспокоенных инвесторов.',
    options: [
      { text: 'Запустить PR-кампанию с показателями роста', effects: { money: -15, customers: 5, morale: 5, reputation: 20 } },
      { text: 'Проигнорировать и сосредоточиться на продукте', effects: { money: 0, customers: -5, morale: -5, reputation: -15 } },
      { text: 'Написать публичную ответную статью', effects: { money: -5, customers: 0, morale: 0, reputation: 5 } },
    ],
    worstOptionIndex: 1,
  },
  {
    title: 'Раунд 5: Заседание совета директоров',
    scenario: 'Совет директоров требует обновления стратегии. На столе три варианта. Это решение определит будущее компании.',
    options: [
      { text: 'Переориентировать продукт на корпоративный B2B', effects: { money: -10, customers: -10, morale: -5, reputation: 10 } },
      { text: 'Удвоить ставку на текущую стратегию с агрессивным ростом', effects: { money: -15, customers: 15, morale: 10, reputation: 15 } },
      { text: 'Начать переговоры о слиянии с крупной компанией', effects: { money: 10, customers: -5, morale: -15, reputation: 5 } },
    ],
    worstOptionIndex: 2,
  },
]

const ROUNDS_AR: Round[] = [
  {
    title: 'الجولة 1: المنافس يطلق منتجه',
    scenario: 'منافس ممول جيدًا أطلق نسخة أرخص من منتجك. العملاء يطرحون أسئلة. ماذا ستفعل؟',
    options: [
      { text: 'خفض السعر ليطابق المنافس', effects: { money: -15, customers: 5, morale: -5, reputation: -5 } },
      { text: 'إضافة ميزات متقدمة ليست لديهم', effects: { money: -10, customers: 10, morale: 5, reputation: 15 } },
      { text: 'التحول إلى شريحة سوقية جديدة', effects: { money: -20, customers: -5, morale: -10, reputation: 10 } },
    ],
    worstOptionIndex: 2,
  },
  {
    title: 'الجولة 2: الفريق في حالة ذعر',
    scenario: 'فريقك رأى أخبار المنافس. مهندسان يحدّثان سيرهما على LinkedIn. المعنويات تنخفض بسرعة.',
    options: [
      { text: 'طمأنة الفريق بخطة واضحة', effects: { money: 0, customers: 0, morale: 15, reputation: 5 } },
      { text: 'توظيف مستشار غالٍ لتعزيز الثقة', effects: { money: -20, customers: 0, morale: 5, reputation: 10 } },
      { text: 'منح الجميع مكافآت للاحتفاظ بهم', effects: { money: -25, customers: 0, morale: 20, reputation: 0 } },
    ],
    worstOptionIndex: 1,
  },
  {
    title: 'الجولة 3: العملاء يغادرون',
    scenario: '15% من عملائك انتقلوا للمنافس الأسبوع الماضي. يجب إيقاف النزيف الآن.',
    options: [
      { text: 'إطلاق برنامج ولاء مع مكافآت', effects: { money: -10, customers: 10, morale: 5, reputation: 10 } },
      { text: 'مطابقة سعر المنافس', effects: { money: -15, customers: 5, morale: 0, reputation: -5 } },
      { text: 'إصدار تحسين كبير للمنتج', effects: { money: -5, customers: 15, morale: 10, reputation: 15 } },
    ],
    worstOptionIndex: 1,
  },
  {
    title: 'الجولة 4: تغطية صحفية',
    scenario: 'TechCrunch ينشر مقالًا: "هل [شركتك] تخسر المعركة؟" بريدك مليء برسائل مستثمرين قلقين.',
    options: [
      { text: 'إطلاق حملة علاقات عامة تُظهر مقاييس النمو', effects: { money: -15, customers: 5, morale: 5, reputation: 20 } },
      { text: 'تجاهل الأمر والتركيز على المنتج', effects: { money: 0, customers: -5, morale: -5, reputation: -15 } },
      { text: 'كتابة مقال رد علني', effects: { money: -5, customers: 0, morale: 0, reputation: 5 } },
    ],
    worstOptionIndex: 1,
  },
  {
    title: 'الجولة 5: اجتماع مجلس الإدارة',
    scenario: 'مجلس الإدارة يطالب بتحديث الاستراتيجية. ثلاثة خيارات على الطاولة. هذا القرار يحدد مستقبل الشركة.',
    options: [
      { text: 'تحويل المنتج إلى B2B للشركات', effects: { money: -10, customers: -10, morale: -5, reputation: 10 } },
      { text: 'مضاعفة الرهان على الاستراتيجية الحالية مع نمو عدواني', effects: { money: -15, customers: 15, morale: 10, reputation: 15 } },
      { text: 'البحث عن اندماج مع شركة أكبر', effects: { money: 10, customers: -5, morale: -15, reputation: 5 } },
    ],
    worstOptionIndex: 2,
  },
]

const TIMER_SECONDS = 30

const METRIC_LABELS_EN: { key: keyof Metrics; label: string; color: string; icon: string }[] = [
  { key: 'money', label: 'Money', color: 'bg-green-500', icon: '\u{1F4B0}' },
  { key: 'customers', label: 'Customers', color: 'bg-blue-500', icon: '\u{1F465}' },
  { key: 'morale', label: 'Team Morale', color: 'bg-yellow-500', icon: '\u{1F525}' },
  { key: 'reputation', label: 'Reputation', color: 'bg-purple-500', icon: '\u{2B50}' },
]

const METRIC_LABELS_RU: { key: keyof Metrics; label: string; color: string; icon: string }[] = [
  { key: 'money', label: 'Деньги', color: 'bg-green-500', icon: '\u{1F4B0}' },
  { key: 'customers', label: 'Клиенты', color: 'bg-blue-500', icon: '\u{1F465}' },
  { key: 'morale', label: 'Боевой дух', color: 'bg-yellow-500', icon: '\u{1F525}' },
  { key: 'reputation', label: 'Репутация', color: 'bg-purple-500', icon: '\u{2B50}' },
]

const METRIC_LABELS_AR: { key: keyof Metrics; label: string; color: string; icon: string }[] = [
  { key: 'money', label: 'المال', color: 'bg-green-500', icon: '\u{1F4B0}' },
  { key: 'customers', label: 'العملاء', color: 'bg-blue-500', icon: '\u{1F465}' },
  { key: 'morale', label: 'معنويات الفريق', color: 'bg-yellow-500', icon: '\u{1F525}' },
  { key: 'reputation', label: 'السمعة', color: 'bg-purple-500', icon: '\u{2B50}' },
]

/* --- Canvas Constants --- */

const CANVAS_W = 600
const CANVAS_H = 200
const TILE_W = 40
const TILE_H = 20

/* --- Canvas particle types --- */

interface AmbientParticle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  color: string
}

interface PersonFigure {
  x: number
  y: number
  speed: number
  phase: number
  direction: number // 1 = right, -1 = left
}

/* --- Canvas drawing functions --- */

function drawIsoGround(ctx: CanvasRenderingContext2D) {
  const baseX = CANVAS_W / 2
  const baseY = 155
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 12; col++) {
      const isoX = baseX + (col - row) * (TILE_W / 2) - 140
      const isoY = baseY + (col + row) * (TILE_H / 2) - 30
      const shade = (row + col) % 2 === 0 ? '#1E293B' : '#1A2332'
      ctx.fillStyle = shade
      ctx.beginPath()
      ctx.moveTo(isoX, isoY)
      ctx.lineTo(isoX + TILE_W / 2, isoY + TILE_H / 2)
      ctx.lineTo(isoX, isoY + TILE_H)
      ctx.lineTo(isoX - TILE_W / 2, isoY + TILE_H / 2)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#2A3545'
      ctx.lineWidth = 0.5
      ctx.stroke()
    }
  }
}

// Draw the office building -- metrics affect appearance
function drawOfficeBuilding(
  ctx: CanvasRenderingContext2D,
  metrics: Metrics,
  time: number,
  shakeAmount: number,
) {
  const cx = CANVAS_W / 2
  const baseY = 155
  const shakeX = shakeAmount > 0 ? Math.sin(time * 40) * shakeAmount : 0
  const shakeY = shakeAmount > 0 ? Math.cos(time * 35) * shakeAmount * 0.5 : 0

  const bx = cx + shakeX
  const by = baseY + shakeY

  // Building dimensions
  const bw = 120
  const bh = 90

  // Morale affects building brightness
  const moraleFactor = metrics.morale / 100
  const r = Math.round(30 + moraleFactor * 50)
  const g = Math.round(40 + moraleFactor * 70)
  const b = Math.round(60 + moraleFactor * 100)
  const topColor = `rgb(${r + 20}, ${g + 20}, ${b + 20})`
  const leftColor = `rgb(${r}, ${g}, ${b})`
  const rightColor = `rgb(${Math.max(0, r - 10)}, ${Math.max(0, g - 10)}, ${Math.max(0, b - 10)})`

  // Top face
  ctx.fillStyle = topColor
  ctx.beginPath()
  ctx.moveTo(bx, by - bh)
  ctx.lineTo(bx + bw / 2, by - bh + TILE_H)
  ctx.lineTo(bx, by - bh + TILE_H * 2)
  ctx.lineTo(bx - bw / 2, by - bh + TILE_H)
  ctx.closePath()
  ctx.fill()

  // Left face
  ctx.fillStyle = leftColor
  ctx.beginPath()
  ctx.moveTo(bx - bw / 2, by - bh + TILE_H)
  ctx.lineTo(bx, by - bh + TILE_H * 2)
  ctx.lineTo(bx, by + TILE_H * 2)
  ctx.lineTo(bx - bw / 2, by + TILE_H)
  ctx.closePath()
  ctx.fill()

  // Right face
  ctx.fillStyle = rightColor
  ctx.beginPath()
  ctx.moveTo(bx + bw / 2, by - bh + TILE_H)
  ctx.lineTo(bx, by - bh + TILE_H * 2)
  ctx.lineTo(bx, by + TILE_H * 2)
  ctx.lineTo(bx + bw / 2, by + TILE_H)
  ctx.closePath()
  ctx.fill()

  // Windows -- money controls how many are lit
  const totalWindows = 12
  const litWindows = Math.round((metrics.money / 100) * totalWindows)

  // Left face windows (2 columns x 3 rows)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      const idx = row * 2 + col
      const isLit = idx < litWindows / 2
      const wx = bx - bw / 2 + 12 + col * 20
      const wy = by - bh + TILE_H + 14 + row * 22
      // Shift for iso perspective
      const isoShiftX = (wy - (by - bh + TILE_H)) * 0.25
      ctx.fillStyle = isLit
        ? `rgba(253, 230, 138, ${0.7 + Math.sin(time * 2 + idx) * 0.2})`
        : 'rgba(30, 41, 59, 0.8)'
      ctx.fillRect(wx + isoShiftX, wy, 10, 10)
      if (isLit) {
        ctx.shadowColor = '#FDE68A'
        ctx.shadowBlur = 6
        ctx.fillRect(wx + isoShiftX, wy, 10, 10)
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
      }
    }
  }

  // Right face windows (2 columns x 3 rows)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      const idx = 6 + row * 2 + col
      const isLit = idx < litWindows
      const wx = bx + 8 + col * 20
      const wy = by - bh + TILE_H + 14 + row * 22
      const isoShiftX = -(wy - (by - bh + TILE_H)) * 0.25
      ctx.fillStyle = isLit
        ? `rgba(253, 230, 138, ${0.7 + Math.sin(time * 2 + idx) * 0.2})`
        : 'rgba(30, 41, 59, 0.8)'
      ctx.fillRect(wx + isoShiftX, wy, 10, 10)
      if (isLit) {
        ctx.shadowColor = '#FDE68A'
        ctx.shadowBlur = 6
        ctx.fillRect(wx + isoShiftX, wy, 10, 10)
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
      }
    }
  }

  // Door
  ctx.fillStyle = '#0F172A'
  ctx.fillRect(bx - 6, by + TILE_H * 2 - 18, 12, 16)

  // Flag/banner on top -- reputation controls quality
  drawFlag(ctx, bx, by - bh, metrics.reputation, time)
}

function drawFlag(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  reputation: number,
  time: number,
) {
  const poleHeight = 22
  // Pole
  ctx.strokeStyle = '#94A3B8'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x, y - poleHeight)
  ctx.stroke()

  // Flag -- gold when reputation is high, tattered/gray when low
  const flagW = 18
  const flagH = 10
  const wave = Math.sin(time * 4) * 2

  if (reputation > 60) {
    // Golden flag with glow
    ctx.shadowColor = '#FBBF24'
    ctx.shadowBlur = 8
    ctx.fillStyle = '#FBBF24'
  } else if (reputation > 30) {
    ctx.fillStyle = '#94A3B8'
  } else {
    // Tattered flag -- dim red
    ctx.fillStyle = '#6B2121'
  }

  ctx.beginPath()
  ctx.moveTo(x, y - poleHeight)
  ctx.lineTo(x + flagW, y - poleHeight + flagH / 2 + wave)
  ctx.lineTo(x, y - poleHeight + flagH)
  ctx.closePath()
  ctx.fill()

  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0

  // Tattered effect for low reputation
  if (reputation <= 30) {
    ctx.strokeStyle = '#451A1A'
    ctx.lineWidth = 1
    ctx.setLineDash([2, 3])
    ctx.beginPath()
    ctx.moveTo(x + flagW * 0.6, y - poleHeight + 2)
    ctx.lineTo(x + flagW * 0.8, y - poleHeight + flagH - 2)
    ctx.stroke()
    ctx.setLineDash([])
  }
}

function drawPeople(
  ctx: CanvasRenderingContext2D,
  figures: PersonFigure[],
  time: number,
) {
  for (const fig of figures) {
    const bob = Math.sin(time * 5 + fig.phase) * 1.5

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)'
    ctx.beginPath()
    ctx.ellipse(fig.x, fig.y + 8, 4, 1.5, 0, 0, Math.PI * 2)
    ctx.fill()

    // Head
    ctx.fillStyle = '#60A5FA'
    ctx.beginPath()
    ctx.arc(fig.x, fig.y - 3 + bob, 3, 0, Math.PI * 2)
    ctx.fill()

    // Body
    ctx.strokeStyle = '#60A5FA'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(fig.x, fig.y + bob)
    ctx.lineTo(fig.x, fig.y + 6 + bob)
    ctx.stroke()

    // Legs
    const legSwing = Math.sin(time * 5 + fig.phase) * 2
    ctx.beginPath()
    ctx.moveTo(fig.x, fig.y + 6 + bob)
    ctx.lineTo(fig.x - 2 + legSwing, fig.y + 10 + bob)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(fig.x, fig.y + 6 + bob)
    ctx.lineTo(fig.x + 2 - legSwing, fig.y + 10 + bob)
    ctx.stroke()
  }
}

function updatePeople(
  figures: PersonFigure[],
  targetCount: number,
): PersonFigure[] {
  const updated = [...figures]

  while (updated.length < targetCount) {
    const side = Math.random() > 0.5 ? 1 : -1
    updated.push({
      x: CANVAS_W / 2 + (80 + Math.random() * 160) * side,
      y: 150 + Math.random() * 30,
      speed: 0.2 + Math.random() * 0.3,
      phase: Math.random() * Math.PI * 2,
      direction: side > 0 ? -1 : 1,
    })
  }
  while (updated.length > targetCount) {
    updated.pop()
  }

  // Move figures
  for (const fig of updated) {
    fig.x += fig.speed * fig.direction
    // Wrap around
    if (fig.direction < 0 && fig.x < CANVAS_W / 2 - 200) {
      fig.x = CANVAS_W / 2 + 200
    }
    if (fig.direction > 0 && fig.x > CANVAS_W / 2 + 200) {
      fig.x = CANVAS_W / 2 - 200
    }
  }

  return updated
}

function createAmbientParticles(
  existing: AmbientParticle[],
  metrics: Metrics,
): AmbientParticle[] {
  const particles = [...existing]

  // Crisis level based on average metrics
  const avg = (metrics.money + metrics.customers + metrics.morale + metrics.reputation) / 4
  const crisisLevel = 1 - avg / 100 // 0 = no crisis, 1 = full crisis

  // Spawn particles based on crisis level
  if (Math.random() < 0.03 + crisisLevel * 0.05) {
    const isWarning = crisisLevel > 0.5
    particles.push({
      x: Math.random() * CANVAS_W,
      y: CANVAS_H + 5,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -(0.3 + Math.random() * 0.8),
      size: 1 + Math.random() * 2,
      alpha: 0.4 + Math.random() * 0.4,
      color: isWarning
        ? (Math.random() > 0.5 ? '#EF4444' : '#F59E0B')
        : (Math.random() > 0.5 ? '#60A5FA' : '#818CF8'),
    })
  }

  return particles
    .map(p => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      alpha: p.alpha - 0.005,
    }))
    .filter(p => p.alpha > 0 && p.y > -10)
}

function drawAmbientParticles(ctx: CanvasRenderingContext2D, particles: AmbientParticle[]) {
  for (const p of particles) {
    ctx.globalAlpha = p.alpha
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

// Lightning effect for crisis start
function drawLightning(ctx: CanvasRenderingContext2D, intensity: number, time: number) {
  if (intensity <= 0) return

  // Flash
  ctx.globalAlpha = intensity * 0.15
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
  ctx.globalAlpha = 1

  // Lightning bolt
  if (intensity > 0.3) {
    ctx.strokeStyle = `rgba(253, 230, 138, ${intensity * 0.8})`
    ctx.lineWidth = 2
    ctx.shadowColor = '#FDE68A'
    ctx.shadowBlur = 10 * intensity

    const startX = CANVAS_W / 2 - 30 + Math.random() * 60
    ctx.beginPath()
    ctx.moveTo(startX, 0)
    let x = startX
    let y = 0
    while (y < 60) {
      x += (Math.random() - 0.5) * 20
      y += 10 + Math.random() * 15
      ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
  }
}

// Timer border pulsing effect
function drawTimerBorder(ctx: CanvasRenderingContext2D, timer: number, maxTimer: number) {
  const ratio = timer / maxTimer
  if (ratio > 0.5) return // Only show when time is running out

  const urgency = 1 - ratio * 2 // 0 to 1
  const pulse = Math.sin(Date.now() / (200 - urgency * 150)) * 0.5 + 0.5
  const alpha = urgency * 0.4 * pulse

  ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`
  ctx.lineWidth = 3 + urgency * 3
  ctx.strokeRect(1, 1, CANVAS_W - 2, CANVAS_H - 2)
}

/* --- Crisis Canvas Component --- */

function CrisisCanvas({
  metrics,
  timer,
  maxTimer,
  phase,
  currentRound,
}: {
  metrics: Metrics
  timer: number
  maxTimer: number
  phase: string
  currentRound: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const particlesRef = useRef<AmbientParticle[]>([])
  const figuresRef = useRef<PersonFigure[]>([])
  const shakeRef = useRef(0)
  const prevRoundRef = useRef(currentRound)
  const lightningRef = useRef(0)

  const stateRef = useRef({ metrics, timer, phase, currentRound })
  useEffect(() => {
    stateRef.current = { metrics, timer, phase, currentRound }

    // Trigger shake and lightning on new round start
    if (currentRound !== prevRoundRef.current && phase === 'playing') {
      shakeRef.current = 4
      lightningRef.current = 1
      prevRoundRef.current = currentRound
    }
  }, [metrics, timer, phase, currentRound])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const startTime = performance.now()

    function draw(now: number) {
      const time = (now - startTime) / 1000
      const s = stateRef.current

      ctx!.clearRect(0, 0, CANVAS_W, CANVAS_H)

      // Background
      const grad = ctx!.createLinearGradient(0, 0, 0, CANVAS_H)
      const avg = (s.metrics.money + s.metrics.customers + s.metrics.morale + s.metrics.reputation) / 4
      // Sky darkens with crisis
      const skyDark = Math.max(0, 1 - avg / 100)
      grad.addColorStop(0, `rgb(${Math.round(15 - skyDark * 10)}, ${Math.round(23 - skyDark * 15)}, ${Math.round(42 - skyDark * 20)})`)
      grad.addColorStop(1, '#1E293B')
      ctx!.fillStyle = grad
      ctx!.fillRect(0, 0, CANVAS_W, CANVAS_H)

      // Stars (dim when crisis is severe)
      ctx!.fillStyle = '#64748B'
      for (let i = 0; i < 15; i++) {
        const sx = ((i * 157 + 30) % CANVAS_W)
        const sy = ((i * 73 + 10) % 40)
        const twinkle = Math.sin(time * 1.5 + i * 0.7) * 0.5 + 0.5
        ctx!.globalAlpha = twinkle * 0.4 * (avg / 100)
        ctx!.beginPath()
        ctx!.arc(sx, sy, 1, 0, Math.PI * 2)
        ctx!.fill()
      }
      ctx!.globalAlpha = 1

      // Lightning effect (decays over time)
      if (lightningRef.current > 0) {
        drawLightning(ctx!, lightningRef.current, time)
        lightningRef.current = Math.max(0, lightningRef.current - 0.02)
      }

      // Ground
      drawIsoGround(ctx!)

      // Shake decays
      if (shakeRef.current > 0) {
        shakeRef.current = Math.max(0, shakeRef.current - 0.05)
      }

      // Building
      drawOfficeBuilding(ctx!, s.metrics, time, shakeRef.current)

      // People
      const targetPeople = Math.min(10, Math.ceil(s.metrics.customers / 10))
      figuresRef.current = updatePeople(figuresRef.current, targetPeople)
      drawPeople(ctx!, figuresRef.current, time)

      // Ambient particles
      particlesRef.current = createAmbientParticles(particlesRef.current, s.metrics)
      drawAmbientParticles(ctx!, particlesRef.current)

      // Timer border when playing
      if (s.phase === 'playing') {
        drawTimerBorder(ctx!, s.timer, maxTimer)
      }

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animRef.current)
    }
  // maxTimer is a constant, safe to include
  }, [maxTimer])

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      className="w-full rounded-xl border border-gray-700"
      style={{ maxWidth: CANVAS_W, imageRendering: 'auto' }}
    />
  )
}

/* --- Main Component --- */

export default function EntrepreneurMission6({ userId, onComplete }: EntrepreneurMission6Props) {
  const locale = useLocale()
  const ROUNDS = locale === 'ru' ? ROUNDS_RU : locale === 'ar' ? ROUNDS_AR : ROUNDS_EN
  const METRIC_LABELS = locale === 'ru' ? METRIC_LABELS_RU : locale === 'ar' ? METRIC_LABELS_AR : METRIC_LABELS_EN
  const [currentRound, setCurrentRound] = useState(0)
  const [metrics, setMetrics] = useState<Metrics>({ money: 70, customers: 60, morale: 80, reputation: 50 })
  const [phase, setPhase] = useState<'intro' | 'playing' | 'feedback' | 'gameover' | 'done'>('intro')
  const [timer, setTimer] = useState(TIMER_SECONDS)
  const [chosenOption, setChosenOption] = useState<number | null>(null)
  const [lastEffects, setLastEffects] = useState<Partial<Metrics> | null>(null)
  const [decisionTimes, setDecisionTimes] = useState<number[]>([])
  const [gameOverMetric, setGameOverMetric] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Timer countdown
  useEffect(() => {
    if (phase !== 'playing') return

    setTimer(TIMER_SECONDS)
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          // Time's up -- auto-select worst option
          clearInterval(timerRef.current!)
          const round = ROUNDS[currentRound]
          handleChoice(round.worstOptionIndex, true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentRound])

  const handleChoice = useCallback((optionIndex: number, timedOut = false) => {
    if (timerRef.current) clearInterval(timerRef.current)

    const round = ROUNDS[currentRound]
    const option = round.options[optionIndex]
    const timeUsed = TIMER_SECONDS - timer

    setChosenOption(optionIndex)
    setLastEffects(option.effects)
    setDecisionTimes(prev => [...prev, timedOut ? TIMER_SECONDS : timeUsed])

    // Apply effects
    const newMetrics = { ...metrics }
    for (const [key, value] of Object.entries(option.effects)) {
      const k = key as keyof Metrics
      newMetrics[k] = Math.max(0, Math.min(100, newMetrics[k] + (value as number)))
    }
    setMetrics(newMetrics)

    // Check game over
    const deadMetric = METRIC_LABELS.find(m => newMetrics[m.key] <= 0)
    if (deadMetric) {
      setGameOverMetric(deadMetric.label)
      setPhase('gameover')
      return
    }

    setPhase('feedback')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRound, metrics, timer])

  const handleNextRound = useCallback(() => {
    if (currentRound < ROUNDS.length - 1) {
      setCurrentRound(prev => prev + 1)
      setChosenOption(null)
      setLastEffects(null)
      setPhase('playing')
    } else {
      // All rounds complete -- calculate score
      finishMission()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRound])

  const finishMission = useCallback(() => {
    // Survival: 500 if all metrics > 0 (already checked)
    const survivalScore = 500

    // Final metrics average
    const avg = (metrics.money + metrics.customers + metrics.morale + metrics.reputation) / 4
    const metricsScore = Math.round((avg / 100) * 350)

    // Decision speed: bonus for fast decisions
    const avgTime = decisionTimes.reduce((s, t) => s + t, 0) / Math.max(decisionTimes.length, 1)
    const speedScore = avgTime <= 10 ? 150 : avgTime <= 20 ? 100 : avgTime <= 25 ? 50 : 0

    const totalScore = Math.min(1000, survivalScore + metricsScore + speedScore)

    setPhase('done')

    onComplete?.(totalScore, [
      { label: locale === 'ru' ? 'Выживание' : locale === 'ar' ? 'البقاء' : 'Survival', value: survivalScore, max: 500 },
      { label: locale === 'ru' ? 'Итоговые показатели' : locale === 'ar' ? 'المؤشرات النهائية' : 'Final metrics', value: metricsScore, max: 350 },
      { label: locale === 'ru' ? 'Скорость решений' : locale === 'ar' ? 'سرعة القرارات' : 'Decision speed', value: speedScore, max: 150 },
    ])
  }, [metrics, decisionTimes, onComplete, locale])

  const finishMissionGameOver = useCallback(() => {
    // Partial score for game over
    const roundsSurvived = currentRound
    const survivalScore = Math.round((roundsSurvived / ROUNDS.length) * 250)
    const avg = (metrics.money + metrics.customers + metrics.morale + metrics.reputation) / 4
    const metricsScore = Math.round((avg / 100) * 150)
    const avgTime = decisionTimes.reduce((s, t) => s + t, 0) / Math.max(decisionTimes.length, 1)
    const speedScore = avgTime <= 15 ? 50 : 0

    const totalScore = Math.min(1000, survivalScore + metricsScore + speedScore)

    setPhase('done')

    onComplete?.(totalScore, [
      { label: locale === 'ru' ? 'Выживание' : locale === 'ar' ? 'البقاء' : 'Survival', value: survivalScore, max: 500 },
      { label: locale === 'ru' ? 'Итоговые показатели' : locale === 'ar' ? 'المؤشرات النهائية' : 'Final metrics', value: metricsScore, max: 350 },
      { label: locale === 'ru' ? 'Скорость решений' : locale === 'ar' ? 'سرعة القرارات' : 'Decision speed', value: speedScore, max: 150 },
    ])
  }, [currentRound, metrics, decisionTimes, onComplete, locale])

  /* --- Metric Bar Component --- */
  const MetricBar = ({ metricKey, label, color, icon }: { metricKey: keyof Metrics; label: string; color: string; icon: string }) => {
    const value = metrics[metricKey]
    const effect = lastEffects?.[metricKey]
    return (
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-xs text-gray-400 font-bold">{label}</span>
            <span className="text-xs font-bold text-white flex items-center gap-1">
              {value}
              {effect != null && phase === 'feedback' && (
                <span className={`text-[10px] ${effect > 0 ? 'text-green-400' : effect < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                  {effect > 0 ? `+${effect}` : effect}
                </span>
              )}
            </span>
          </div>
          <div className="w-full h-2.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                value <= 20 ? 'bg-red-500 animate-pulse' : color
              }`}
              style={{ width: `${value}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  /* --- Render: Intro --- */
  if (phase === 'intro') {
    return (
      <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl p-8 max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">{'\u{26A1}'}</div>
          <h2 className="text-2xl font-black text-white mb-3">{locale === 'ru' ? 'Режим кризиса' : locale === 'ar' ? 'وضع الأزمة' : 'Crisis Mode'}</h2>
          <p className="text-gray-300 leading-relaxed mb-4">
            {locale === 'ru'
              ? <>Хорошо финансируемый конкурент скопировал ваш продукт и продаёт его дешевле. Ваша компания под угрозой. Вам нужно принять <span className="text-yellow-400 font-bold">5 критических решений</span>, чтобы спасти свой стартап.</>
              : locale === 'ar'
              ? <>منافس ممول نسخ منتجك ويبيعه بسعر أرخص. شركتك مهددة. عليك اتخاذ <span className="text-yellow-400 font-bold">5 قرارات حاسمة</span> لإنقاذ شركتك الناشئة.</>
              : <>A well-funded competitor just copied your product and is selling it cheaper. Your company is under threat. You must make <span className="text-yellow-400 font-bold">5 critical decisions</span> to save your startup.</>}
          </p>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-4 mb-6 space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">{locale === 'ru' ? 'Правила' : locale === 'ar' ? 'القواعد' : 'Rules'}</h3>
          <div className="flex items-start gap-3 text-sm">
            <span className="text-red-400 text-lg">{'\u23F0'}</span>
            <p className="text-gray-300">
              {locale === 'ru'
                ? <>У вас <span className="text-red-400 font-bold">30 секунд</span> на каждый раунд для принятия решения. Если время истечёт, худший вариант будет выбран автоматически.</>
                : locale === 'ar'
                ? <>لديك <span className="text-red-400 font-bold">30 ثانية</span> لكل جولة لاتخاذ قرارك. إذا انتهى الوقت، سيُختار أسوأ خيار تلقائيًا.</>
                : <>You have <span className="text-red-400 font-bold">30 seconds</span> per round to make your decision. If time runs out, the worst option is chosen automatically.</>}
            </p>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <span className="text-blue-400 text-lg">{'\u{1F4CA}'}</span>
            <p className="text-gray-300">
              {locale === 'ru'
                ? <>Следите за 4 показателями: <span className="text-green-400">Деньги</span>, <span className="text-blue-400">Клиенты</span>, <span className="text-purple-400">Боевой дух</span>, <span className="text-yellow-400">Репутация</span>. Каждое решение влияет на них по-разному.</>
                : locale === 'ar'
                ? <>راقب 4 مقاييس: <span className="text-green-400">المال</span>، <span className="text-blue-400">العملاء</span>، <span className="text-purple-400">معنويات الفريق</span>، <span className="text-yellow-400">السمعة</span>. كل قرار يؤثر عليها بشكل مختلف.</>
                : <>Watch your 4 metrics: <span className="text-green-400">Money</span>, <span className="text-blue-400">Customers</span>, <span className="text-purple-400">Team Morale</span>, <span className="text-yellow-400">Reputation</span>. Each decision affects them differently.</>}
            </p>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <span className="text-red-400 text-lg">{'\u{1F480}'}</span>
            <p className="text-gray-300">
              {locale === 'ru'
                ? <>Если <span className="text-red-400 font-bold">любой показатель упадёт до нуля</span> — игра окончена. Ваша компания не выживет.</>
                : locale === 'ar'
                ? <>إذا <span className="text-red-400 font-bold">انخفض أي مقياس إلى الصفر</span> — انتهت اللعبة. شركتك لن تنجو.</>
                : <>If <span className="text-red-400 font-bold">any metric drops to zero</span> — game over. Your company doesn{'\u2019'}t survive.</>}
            </p>
          </div>
        </div>

        <button
          onClick={() => setPhase('playing')}
          className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black text-lg rounded-xl transition-colors"
        >
          {'\u26A1'} {locale === 'ru' ? 'Начать кризис — 30 секунд на раунд' : locale === 'ar' ? 'بدء الأزمة — 30 ثانية لكل جولة' : 'Start Crisis — 30 seconds per round'}
        </button>
      </div>
    )
  }

  /* --- Render: Done --- */
  if (phase === 'done') {
    const survived = !gameOverMetric
    return (
      <div className="bg-[var(--brand-panel)] border border-green-500/40 rounded-2xl p-8 text-center">
        <div className="text-6xl mb-4">{survived ? '\u{1F3C6}' : '\u{1F4A5}'}</div>
        <p className={`text-lg font-bold ${survived ? 'text-green-400' : 'text-red-400'}`}>
          {survived
            ? (locale === 'ru' ? 'Компания пережила кризис!' : locale === 'ar' ? 'الشركة نجت من الأزمة!' : 'Company survived the crisis!')
            : (locale === 'ru' ? 'Компания не выжила.' : locale === 'ar' ? 'الشركة لم تنجُ.' : 'Company did not survive.')}
        </p>
        <p className="text-gray-400 text-sm mt-2">{locale === 'ru' ? 'Проверьте результаты выше.' : locale === 'ar' ? 'تحقق من النتائج أعلاه.' : 'Check your results above.'}</p>
      </div>
    )
  }

  /* --- Render: Game Over --- */
  if (phase === 'gameover') {
    return (
      <div className="bg-[var(--brand-panel)] border border-red-500/40 rounded-2xl p-6">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">{'\u{1F4A5}'}</div>
          <h2 className="text-xl font-black text-red-400">{locale === 'ru' ? 'Игра окончена!' : locale === 'ar' ? 'انتهت اللعبة!' : 'Game Over!'}</h2>
          <p className="text-gray-400 text-sm mt-2">
            {locale === 'ru'
              ? <>{gameOverMetric} упал до нуля. Ваша компания не смогла выжить.</>
              : locale === 'ar'
              ? <>{gameOverMetric} انخفض إلى الصفر. شركتك لم تستطع البقاء.</>
              : <>{gameOverMetric} dropped to zero. Your company could not survive.</>}
          </p>
        </div>

        {/* Canvas showing final state */}
        <div className="flex justify-center mb-4">
          <CrisisCanvas
            metrics={metrics}
            timer={0}
            maxTimer={TIMER_SECONDS}
            phase={phase}
            currentRound={currentRound}
          />
        </div>

        {/* Final metrics */}
        <div className="space-y-3 mb-6">
          {METRIC_LABELS.map(m => (
            <MetricBar key={m.key} metricKey={m.key} label={m.label} color={m.color} icon={m.icon} />
          ))}
        </div>

        <button
          onClick={finishMissionGameOver}
          className="w-full px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors"
        >
          {locale === 'ru' ? 'Посмотреть результаты' : locale === 'ar' ? 'عرض النتائج' : 'See Results'}
        </button>
      </div>
    )
  }

  /* --- Render: Feedback --- */
  if (phase === 'feedback') {
    const round = ROUNDS[currentRound]
    const option = round.options[chosenOption!]
    return (
      <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl p-6">
        {/* Round indicator */}
        <div className="text-xs text-gray-500 font-bold mb-2">{locale === 'ru' ? `Раунд ${currentRound + 1} из ${ROUNDS.length} — Результат` : locale === 'ar' ? `الجولة ${currentRound + 1} من ${ROUNDS.length} — النتيجة` : `Round ${currentRound + 1} of ${ROUNDS.length} -- Result`}</div>

        {/* Canvas showing updated state */}
        <div className="flex justify-center mb-4">
          <CrisisCanvas
            metrics={metrics}
            timer={TIMER_SECONDS}
            maxTimer={TIMER_SECONDS}
            phase={phase}
            currentRound={currentRound}
          />
        </div>

        <h2 className="text-lg font-bold text-white mb-4">{locale === 'ru' ? 'Вы выбрали:' : locale === 'ar' ? 'اخترت:' : 'You chose:'} {option.text}</h2>

        {/* Effects */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          {Object.entries(option.effects).map(([key, value]) => {
            const label = METRIC_LABELS.find(m => m.key === key)
            return (
              <div
                key={key}
                className={`p-3 rounded-xl border text-sm font-bold text-center ${
                  (value as number) > 0
                    ? 'bg-green-900/30 border-green-700 text-green-300'
                    : (value as number) < 0
                    ? 'bg-red-900/30 border-red-700 text-red-300'
                    : 'bg-gray-800/50 border-gray-600 text-gray-300'
                }`}
              >
                {label?.icon} {label?.label}: {(value as number) > 0 ? '+' : ''}{value as number}
              </div>
            )
          })}
        </div>

        {/* Updated metrics */}
        <div className="space-y-3 mb-6">
          {METRIC_LABELS.map(m => (
            <MetricBar key={m.key} metricKey={m.key} label={m.label} color={m.color} icon={m.icon} />
          ))}
        </div>

        <button
          onClick={handleNextRound}
          className="w-full px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors"
        >
          {currentRound < ROUNDS.length - 1
            ? (locale === 'ru' ? 'Следующий раунд' : locale === 'ar' ? 'الجولة التالية' : 'Next Round')
            : (locale === 'ru' ? 'Посмотреть результаты' : locale === 'ar' ? 'عرض النتائج' : 'See Results')}
        </button>
      </div>
    )
  }

  /* --- Render: Playing --- */
  const round = ROUNDS[currentRound]
  const timerUrgent = timer <= 10
  const timerCritical = timer <= 5

  return (
    <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl overflow-hidden">
      {/* Top bar with timer */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700">
        <span className="text-xs text-gray-400 font-bold">{locale === 'ru' ? 'Миссия 6: Режим кризиса' : locale === 'ar' ? 'المهمة 6: وضع الأزمة' : 'Mission 6: Crisis Mode'}</span>
        <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-black ${
          timerCritical
            ? 'bg-red-900/50 text-red-400 animate-pulse'
            : timerUrgent
            ? 'bg-yellow-900/50 text-yellow-400'
            : 'bg-gray-700 text-white'
        }`}>
          &#x23F1; {timer}{locale === 'ru' ? 'с' : locale === 'ar' ? 'ث' : 's'}
        </div>
      </div>

      {/* 2.5D Canvas Visualization */}
      <div className="px-4 pt-3">
        <CrisisCanvas
          metrics={metrics}
          timer={timer}
          maxTimer={TIMER_SECONDS}
          phase={phase}
          currentRound={currentRound}
        />
      </div>

      {/* Metrics bar */}
      <div className="px-4 py-3 bg-gray-900/50 border-b border-gray-700 space-y-2">
        {METRIC_LABELS.map(m => (
          <MetricBar key={m.key} metricKey={m.key} label={m.label} color={m.color} icon={m.icon} />
        ))}
      </div>

      {/* Round content */}
      <div className="p-4">
        <div className="text-xs text-gray-500 font-bold mb-2">{round.title}</div>
        <p className="text-white text-sm mb-6 leading-relaxed">{round.scenario}</p>

        {/* Options */}
        <div className="space-y-3">
          {round.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleChoice(i)}
              className="w-full text-left p-4 rounded-xl border-2 border-gray-600 bg-gray-800/50 hover:border-amber-400 hover:bg-amber-900/20 transition-all text-sm text-gray-200"
            >
              <span className="font-bold text-white">{String.fromCharCode(65 + i)}.</span> {opt.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
