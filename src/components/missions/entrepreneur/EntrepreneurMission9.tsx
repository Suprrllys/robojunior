'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useLocale } from 'next-intl'

/* --- Types --- */

export interface ScoreBreakdownItem {
  label: string
  value: number
  max: number
}

interface EntrepreneurMission9Props {
  userId: string
  onComplete?: (score: number, breakdown: ScoreBreakdownItem[]) => void
}

/* --- Data --- */

const DISCOUNT_RATE = 0.10
const BUYER_OFFER = 2500000

interface DealTerm {
  id: string
  label: string
  description: string
}

const DEAL_TERMS_EN: DealTerm[] = [
  { id: 'keep_ceo', label: 'Keep CEO Role', description: 'You remain as CEO for at least 3 years' },
  { id: 'earn_out', label: '2-Year Earn-Out', description: 'Part of the payment depends on hitting targets' },
  { id: 'equity_retain', label: '20% Equity Retained', description: 'You keep a 20% stake in the company' },
]

const DEAL_TERMS_RU: DealTerm[] = [
  { id: 'keep_ceo', label: 'Остаться CEO', description: 'Ты остаёшься CEO минимум на 3 года' },
  { id: 'earn_out', label: '2-летний Earn-Out', description: 'Часть платежа зависит от достижения целей' },
  { id: 'equity_retain', label: '20% акций', description: 'Ты сохраняешь 20% долю в компании' },
]

interface Argument {
  id: string
  text: string
  forSell: boolean
  forKeep: boolean
  requiresHighNPV: boolean
  requiresLowNPV: boolean
}

const ARGUMENTS_EN: Argument[] = [
  { id: 'a1', text: 'The offer exceeds our projected company value', forSell: true, forKeep: false, requiresHighNPV: false, requiresLowNPV: true },
  { id: 'a2', text: 'We can grow faster with corporate resources', forSell: true, forKeep: false, requiresHighNPV: false, requiresLowNPV: false },
  { id: 'a3', text: 'Market conditions are uncertain -- lock in value now', forSell: true, forKeep: false, requiresHighNPV: false, requiresLowNPV: false },
  { id: 'a4', text: 'Our projections show the company will be worth more', forKeep: true, forSell: false, requiresHighNPV: true, requiresLowNPV: false },
  { id: 'a5', text: 'We have strong growth momentum and loyal customers', forKeep: true, forSell: false, requiresHighNPV: false, requiresLowNPV: false },
  { id: 'a6', text: 'Selling now means losing control of our vision', forKeep: true, forSell: false, requiresHighNPV: false, requiresLowNPV: false },
  { id: 'a7', text: 'The team will benefit from job security at a corporation', forSell: true, forKeep: false, requiresHighNPV: false, requiresLowNPV: false },
  { id: 'a8', text: 'Our technology is a competitive moat that increases over time', forKeep: true, forSell: false, requiresHighNPV: false, requiresLowNPV: false },
]

const ARGUMENTS_RU: Argument[] = [
  { id: 'a1', text: 'Предложение превышает прогнозную стоимость компании', forSell: true, forKeep: false, requiresHighNPV: false, requiresLowNPV: true },
  { id: 'a2', text: 'С ресурсами корпорации мы можем расти быстрее', forSell: true, forKeep: false, requiresHighNPV: false, requiresLowNPV: false },
  { id: 'a3', text: 'Рынок нестабилен — лучше зафиксировать прибыль сейчас', forSell: true, forKeep: false, requiresHighNPV: false, requiresLowNPV: false },
  { id: 'a4', text: 'Наши прогнозы показывают, что компания будет стоить больше', forKeep: true, forSell: false, requiresHighNPV: true, requiresLowNPV: false },
  { id: 'a5', text: 'У нас сильный рост и лояльные клиенты', forKeep: true, forSell: false, requiresHighNPV: false, requiresLowNPV: false },
  { id: 'a6', text: 'Продажа сейчас — потеря контроля над нашим видением', forKeep: true, forSell: false, requiresHighNPV: false, requiresLowNPV: false },
  { id: 'a7', text: 'Команда получит стабильность работы в корпорации', forSell: true, forKeep: false, requiresHighNPV: false, requiresLowNPV: false },
  { id: 'a8', text: 'Наша технология — конкурентное преимущество, которое растёт со временем', forKeep: true, forSell: false, requiresHighNPV: false, requiresLowNPV: false },
]

const DEAL_TERMS_AR: DealTerm[] = [
  { id: 'keep_ceo', label: 'البقاء كمدير تنفيذي', description: 'تبقى مديرًا تنفيذيًا لمدة 3 سنوات على الأقل' },
  { id: 'earn_out', label: 'Earn-Out لمدة سنتين', description: 'جزء من المبلغ يعتمد على تحقيق الأهداف' },
  { id: 'equity_retain', label: 'الاحتفاظ بـ 20% من الأسهم', description: 'تحتفظ بحصة 20% في الشركة' },
]

const ARGUMENTS_AR: Argument[] = [
  { id: 'a1', text: 'العرض يتجاوز القيمة المتوقعة للشركة', forSell: true, forKeep: false, requiresHighNPV: false, requiresLowNPV: true },
  { id: 'a2', text: 'يمكننا النمو أسرع بموارد الشركة الكبرى', forSell: true, forKeep: false, requiresHighNPV: false, requiresLowNPV: false },
  { id: 'a3', text: 'ظروف السوق غير مستقرة — الأفضل تأمين القيمة الآن', forSell: true, forKeep: false, requiresHighNPV: false, requiresLowNPV: false },
  { id: 'a4', text: 'توقعاتنا تُظهر أن الشركة ستكون أعلى قيمة', forKeep: true, forSell: false, requiresHighNPV: true, requiresLowNPV: false },
  { id: 'a5', text: 'لدينا نمو قوي وعملاء أوفياء', forKeep: true, forSell: false, requiresHighNPV: false, requiresLowNPV: false },
  { id: 'a6', text: 'البيع الآن يعني فقدان السيطرة على رؤيتنا', forKeep: true, forSell: false, requiresHighNPV: false, requiresLowNPV: false },
  { id: 'a7', text: 'الفريق سيستفيد من الاستقرار الوظيفي في شركة كبرى', forSell: true, forKeep: false, requiresHighNPV: false, requiresLowNPV: false },
  { id: 'a8', text: 'تقنيتنا ميزة تنافسية تزداد قيمتها مع الوقت', forKeep: true, forSell: false, requiresHighNPV: false, requiresLowNPV: false },
]

/* --- Canvas Constants --- */

const CANVAS_W = 600
const CANVAS_H = 180

/* --- Canvas particle types --- */

interface M9Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  type: 'dollar' | 'confetti' | 'paper'
  color: string
  size: number
  rotation: number
  rotSpeed: number
}

/* --- Isometric drawing helpers --- */

function drawIsoBuilding(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number, depth: number,
  topColor: string, leftColor: string, rightColor: string,
  glowAlpha: number = 0
) {
  // Right face
  ctx.fillStyle = rightColor
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + w / 2, y + depth / 2)
  ctx.lineTo(x + w / 2, y + depth / 2 - h)
  ctx.lineTo(x, y - h)
  ctx.closePath()
  ctx.fill()

  // Left face
  ctx.fillStyle = leftColor
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x - w / 2, y + depth / 2)
  ctx.lineTo(x - w / 2, y + depth / 2 - h)
  ctx.lineTo(x, y - h)
  ctx.closePath()
  ctx.fill()

  // Top face
  ctx.fillStyle = topColor
  ctx.beginPath()
  ctx.moveTo(x, y - h)
  ctx.lineTo(x + w / 2, y + depth / 2 - h)
  ctx.lineTo(x, y + depth - h)
  ctx.lineTo(x - w / 2, y + depth / 2 - h)
  ctx.closePath()
  ctx.fill()

  // Glow effect
  if (glowAlpha > 0) {
    ctx.save()
    ctx.shadowColor = topColor
    ctx.shadowBlur = 20 * glowAlpha
    ctx.globalAlpha = glowAlpha * 0.5
    ctx.fillStyle = topColor
    ctx.beginPath()
    ctx.moveTo(x, y - h)
    ctx.lineTo(x + w / 2, y + depth / 2 - h)
    ctx.lineTo(x, y + depth - h)
    ctx.lineTo(x - w / 2, y + depth / 2 - h)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
}

function drawWindows(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, side: 'left' | 'right', time: number) {
  const cols = 3
  const rows = Math.floor(h / 14)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lit = Math.sin(time * 2 + r * 1.5 + c * 2.3) > -0.3
      ctx.fillStyle = lit ? '#FCD34D' : '#1E293B'
      ctx.globalAlpha = lit ? 0.8 : 0.4
      const wx = side === 'right'
        ? x + 4 + c * 10
        : x - 34 + c * 10
      const wy = y - h + 8 + r * 14
      ctx.fillRect(wx, wy, 6, 8)
    }
  }
  ctx.globalAlpha = 1
}

function drawStockChart(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, time: number) {
  ctx.strokeStyle = '#22C55E'
  ctx.lineWidth = 1.5
  ctx.globalAlpha = 0.3
  ctx.beginPath()
  for (let i = 0; i <= w; i += 3) {
    const progress = i / w
    const chartY = y + h - (progress * h * 0.7) - Math.sin(progress * 8 + time) * 6 - Math.sin(progress * 3) * 10
    if (i === 0) ctx.moveTo(x + i, chartY)
    else ctx.lineTo(x + i, chartY)
  }
  ctx.stroke()

  // Subtle fill under the line
  ctx.lineTo(x + w, y + h)
  ctx.lineTo(x, y + h)
  ctx.closePath()
  ctx.fillStyle = '#22C55E'
  ctx.globalAlpha = 0.05
  ctx.fill()
  ctx.globalAlpha = 1
}

function drawGoldenBridge(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, time: number, mergeProgress: number) {
  const midX = (x1 + x2) / 2
  const midY = Math.min(y1, y2) - 20

  // Bridge arc
  ctx.strokeStyle = '#F59E0B'
  ctx.lineWidth = 3
  ctx.globalAlpha = 0.6 + Math.sin(time * 3) * 0.2
  ctx.shadowColor = '#F59E0B'
  ctx.shadowBlur = 10
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.quadraticCurveTo(midX, midY - 10, x2, y2)
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.globalAlpha = 1

  // Handshake icon at center if not merging
  if (mergeProgress <= 0) {
    const handX = midX
    const handY = midY - 5 + Math.sin(time * 2) * 3
    ctx.fillStyle = '#F59E0B'
    ctx.globalAlpha = 0.7 + Math.sin(time * 4) * 0.3
    ctx.beginPath()
    ctx.arc(handX, handY, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#FEF3C7'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('$', handX, handY + 3.5)
    ctx.globalAlpha = 1
  }
}

function createM9Particle(type: M9Particle['type'], startX: number, startY: number): M9Particle {
  const colors = type === 'dollar'
    ? ['#22C55E', '#16A34A', '#4ADE80']
    : type === 'confetti'
    ? ['#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#A855F7', '#EC4899']
    : ['#E5E7EB', '#D1D5DB', '#F3F4F6']

  return {
    x: startX + (Math.random() - 0.5) * 40,
    y: startY + (Math.random() - 0.5) * 20,
    vx: (Math.random() - 0.5) * (type === 'confetti' ? 3 : 1),
    vy: type === 'confetti' ? -(Math.random() * 2 + 1) : -(Math.random() * 0.5 + 0.2),
    life: 1,
    maxLife: type === 'confetti' ? 60 : 120,
    type,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: type === 'dollar' ? 10 : type === 'confetti' ? 4 : 6,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.1,
  }
}

/* --- Component --- */

export default function EntrepreneurMission9({ userId, onComplete }: EntrepreneurMission9Props) {
  const locale = useLocale()
  const t = (ru: string, ar: string, en: string) => locale === 'ru' ? ru : locale === 'ar' ? ar : en
  const DEAL_TERMS = locale === 'ru' ? DEAL_TERMS_RU : locale === 'ar' ? DEAL_TERMS_AR : DEAL_TERMS_EN
  const ARGUMENTS = locale === 'ru' ? ARGUMENTS_RU : locale === 'ar' ? ARGUMENTS_AR : ARGUMENTS_EN
  const [phase, setPhase] = useState<'intro' | 'projection' | 'decision' | 'done'>('intro')

  // Year projections
  const [revenues, setRevenues] = useState([500000, 800000, 1200000, 1800000, 2500000])
  const [costs, setCosts] = useState([300000, 450000, 650000, 900000, 1200000])
  const [growthRate, setGrowthRate] = useState(25)

  // Deal terms
  const [selectedTerms, setSelectedTerms] = useState<Set<string>>(new Set())

  // Decision
  const [decision, setDecision] = useState<'sell' | 'keep' | null>(null)
  const [selectedArgs, setSelectedArgs] = useState<Set<string>>(new Set())

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({ phase: 'intro' as string, decision: null as string | null })
  const particlesRef = useRef<M9Particle[]>([])
  const mergeProgressRef = useRef(0)
  const keepGlowRef = useRef(0)

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current.phase = phase
    stateRef.current.decision = decision

    // Trigger merge/keep animations
    if (phase === 'done' && decision === 'sell') {
      mergeProgressRef.current = 0.01
      // Spawn confetti
      for (let i = 0; i < 40; i++) {
        particlesRef.current.push(createM9Particle('confetti', CANVAS_W / 2, CANVAS_H / 2))
      }
    }
    if (phase === 'done' && decision === 'keep') {
      keepGlowRef.current = 0.01
    }
  }, [phase, decision])

  // Canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let time = 0
    let spawnTimer = 0

    const draw = () => {
      time += 0.016
      spawnTimer++
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
      bgGrad.addColorStop(0, '#0F172A')
      bgGrad.addColorStop(1, '#1E293B')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

      // Stock chart in background
      drawStockChart(ctx, 50, 20, CANVAS_W - 100, CANVAS_H - 40, time)

      // Grid floor lines (subtle)
      ctx.strokeStyle = 'rgba(100,116,139,0.1)'
      ctx.lineWidth = 1
      for (let i = 0; i < 8; i++) {
        ctx.beginPath()
        ctx.moveTo(0, CANVAS_H - 10 - i * 6)
        ctx.lineTo(CANVAS_W, CANVAS_H - 10 - i * 6)
        ctx.stroke()
      }

      const { decision: dec } = stateRef.current
      const isDone = stateRef.current.phase === 'done'

      // Building positions
      const leftBuildingX = 160
      const rightBuildingX = 440
      const buildingBaseY = CANVAS_H - 25

      // Merge animation: buildings slide toward center
      let leftOffset = 0
      let rightOffset = 0
      if (isDone && dec === 'sell') {
        if (mergeProgressRef.current < 1) {
          mergeProgressRef.current = Math.min(1, mergeProgressRef.current + 0.008)
        }
        const mp = mergeProgressRef.current
        leftOffset = mp * 100
        rightOffset = -mp * 100
      }

      // Keep animation: left building glows
      let leftGlow = 0
      let rightFade = 0
      if (isDone && dec === 'keep') {
        if (keepGlowRef.current < 1) {
          keepGlowRef.current = Math.min(1, keepGlowRef.current + 0.01)
        }
        leftGlow = keepGlowRef.current
        rightFade = keepGlowRef.current * 0.6
      }

      // Left building (your company) - taller, blue tint
      const lx = leftBuildingX + leftOffset
      ctx.globalAlpha = 1 - (isDone && dec === 'sell' && mergeProgressRef.current > 0.8 ? (mergeProgressRef.current - 0.8) * 5 : 0)
      drawIsoBuilding(ctx, lx, buildingBaseY, 60, 80 + Math.sin(time * 0.5) * 2, 20, '#3B82F6', '#2563EB', '#1D4ED8', leftGlow * (0.5 + Math.sin(time * 3) * 0.3))
      drawWindows(ctx, lx, buildingBaseY, 80, 'right', time)
      drawWindows(ctx, lx, buildingBaseY, 80, 'left', time)
      ctx.globalAlpha = 1

      // Label for your building
      ctx.fillStyle = '#93C5FD'
      ctx.font = 'bold 9px sans-serif'
      ctx.textAlign = 'center'
      ctx.globalAlpha = isDone && dec === 'sell' && mergeProgressRef.current > 0.5 ? Math.max(0, 1 - mergeProgressRef.current * 2) : 1
      ctx.fillText('YOUR STARTUP', lx, buildingBaseY + 18)
      ctx.globalAlpha = 1

      // Right building (acquirer) - wider, amber tint
      const rx = rightBuildingX + rightOffset
      ctx.globalAlpha = 1 - rightFade
      drawIsoBuilding(ctx, rx, buildingBaseY, 70, 70 + Math.sin(time * 0.7 + 1) * 2, 24, '#F59E0B', '#D97706', '#B45309', 0)
      drawWindows(ctx, rx, buildingBaseY, 70, 'right', time + 1)
      drawWindows(ctx, rx, buildingBaseY, 70, 'left', time + 1)
      ctx.globalAlpha = 1

      // Label for acquirer
      ctx.fillStyle = '#FCD34D'
      ctx.font = 'bold 9px sans-serif'
      ctx.textAlign = 'center'
      ctx.globalAlpha = isDone && dec === 'keep' ? Math.max(0, 1 - keepGlowRef.current) : 1
      ctx.fillText('ACQUIRER', rx, buildingBaseY + 18)
      ctx.globalAlpha = 1

      // Golden bridge between buildings (only in decision/projection phases)
      if (!isDone || (isDone && dec === 'sell' && mergeProgressRef.current < 0.9)) {
        drawGoldenBridge(ctx, lx + 30, buildingBaseY - 40, rx - 35, buildingBaseY - 35, time, isDone ? mergeProgressRef.current : 0)
      }

      // Merged building (appears when sell animation completes)
      if (isDone && dec === 'sell' && mergeProgressRef.current > 0.8) {
        const mergedAlpha = Math.min(1, (mergeProgressRef.current - 0.8) * 5)
        ctx.globalAlpha = mergedAlpha
        const mx = CANVAS_W / 2
        drawIsoBuilding(ctx, mx, buildingBaseY, 90, 100, 30, '#A855F7', '#7C3AED', '#6D28D9', 0.5 + Math.sin(time * 2) * 0.3)
        drawWindows(ctx, mx, buildingBaseY, 100, 'right', time)
        drawWindows(ctx, mx, buildingBaseY, 100, 'left', time)
        ctx.fillStyle = '#C4B5FD'
        ctx.font = 'bold 10px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('MERGED ENTITY', mx, buildingBaseY + 18)
        ctx.globalAlpha = 1
      }

      // Spawn ambient particles
      if (spawnTimer % 15 === 0) {
        // Money particles flowing between buildings
        const fromX = lx + 30
        const toX = rx - 35
        const midX = (fromX + toX) / 2
        particlesRef.current.push(createM9Particle('dollar', midX, buildingBaseY - 50))

        // Floating paper documents
        if (spawnTimer % 45 === 0) {
          particlesRef.current.push(createM9Particle('paper', Math.random() * CANVAS_W, CANVAS_H))
        }
      }

      // Update and draw particles
      const alive: M9Particle[] = []
      for (let i = 0; i < particlesRef.current.length; i++) {
        const p = particlesRef.current[i]
        p.x += p.vx
        p.y += p.vy
        if (p.type === 'confetti') {
          p.vy += 0.05
        }
        p.rotation += p.rotSpeed
        p.life -= 1 / p.maxLife

        if (p.life > 0) {
          ctx.save()
          ctx.globalAlpha = Math.min(1, p.life * 2) * 0.8
          ctx.translate(p.x, p.y)
          ctx.rotate(p.rotation)

          if (p.type === 'dollar') {
            ctx.fillStyle = p.color
            ctx.font = `${p.size}px sans-serif`
            ctx.textAlign = 'center'
            ctx.fillText('$', 0, 0)
          } else if (p.type === 'confetti') {
            ctx.fillStyle = p.color
            ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
          } else {
            // Paper document
            ctx.fillStyle = p.color
            ctx.fillRect(-p.size / 2, -p.size * 0.7, p.size, p.size * 1.4)
            ctx.strokeStyle = '#9CA3AF'
            ctx.lineWidth = 0.5
            ctx.strokeRect(-p.size / 2, -p.size * 0.7, p.size, p.size * 1.4)
            // Lines on paper
            ctx.strokeStyle = '#D1D5DB'
            for (let l = 0; l < 3; l++) {
              ctx.beginPath()
              ctx.moveTo(-p.size / 2 + 1, -p.size * 0.7 + 3 + l * 3)
              ctx.lineTo(p.size / 2 - 1, -p.size * 0.7 + 3 + l * 3)
              ctx.stroke()
            }
          }
          ctx.restore()
          alive.push(p)
        }
      }
      particlesRef.current = alive

      // Ambient sparkle dots
      for (let i = 0; i < 5; i++) {
        const sx = Math.sin(time * 0.7 + i * 47) * CANVAS_W * 0.4 + CANVAS_W / 2
        const sy = Math.cos(time * 0.5 + i * 31) * CANVAS_H * 0.3 + CANVAS_H / 2
        const alpha = (Math.sin(time * 3 + i * 13) + 1) * 0.15
        ctx.fillStyle = '#F59E0B'
        ctx.globalAlpha = alpha
        ctx.beginPath()
        ctx.arc(sx, sy, 1.5, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animId)
  }, [])

  // NPV calculation
  const npv = useMemo(() => {
    let value = 0
    for (let i = 0; i < 5; i++) {
      const cashflow = revenues[i] - costs[i]
      value += cashflow / Math.pow(1 + DISCOUNT_RATE, i + 1)
    }
    return Math.round(value)
  }, [revenues, costs])

  const yearlyProfits = useMemo(() => {
    return revenues.map((r, i) => r - costs[i])
  }, [revenues, costs])

  const maxRevenue = 5000000
  const maxCost = 3000000

  const toggleTerm = useCallback((termId: string) => {
    setSelectedTerms(prev => {
      const next = new Set(prev)
      if (next.has(termId)) next.delete(termId)
      else next.add(termId)
      return next
    })
  }, [])

  const toggleArg = useCallback((argId: string) => {
    setSelectedArgs(prev => {
      const next = new Set(prev)
      if (next.has(argId)) {
        next.delete(argId)
      } else if (next.size < 3) {
        next.add(argId)
      }
      return next
    })
  }, [])

  const handleFinish = useCallback(() => {
    if (!decision || selectedArgs.size < 3) return

    const isHighNPV = npv > BUYER_OFFER

    // financial_analysis: 500 -- is NPV calculation reasonable?
    // Reasonable = revenues grow, costs < revenues, growth rate reflects projections
    const revenuesGrow = revenues.every((r, i) => i === 0 || r >= revenues[i - 1])
    const costsReasonable = costs.every((c, i) => c < revenues[i])
    const profitableYears = yearlyProfits.filter(p => p > 0).length
    const analysisScore = Math.round(
      500 * (
        (revenuesGrow ? 0.3 : 0) +
        (costsReasonable ? 0.3 : 0) +
        (profitableYears / 5) * 0.4
      )
    )

    // decision_quality: 350 -- do arguments match the data?
    const args = ARGUMENTS.filter(a => selectedArgs.has(a.id))
    let matchCount = 0
    for (const arg of args) {
      if (decision === 'sell' && arg.forSell) matchCount++
      if (decision === 'keep' && arg.forKeep) matchCount++
      // Bonus: argument matches NPV data
      if (arg.requiresHighNPV && isHighNPV) matchCount += 0.5
      if (arg.requiresLowNPV && !isHighNPV) matchCount += 0.5
    }
    const decisionScore = Math.round(350 * Math.min(1, matchCount / 3.5))

    // negotiation: 150 -- deal terms selection
    const termsScore = selectedTerms.size >= 2 ? 150 : selectedTerms.size === 1 ? 75 : 0

    const totalScore = Math.min(1000, analysisScore + decisionScore + termsScore)

    setPhase('done')
    onComplete?.(totalScore, [
      { label: t('Финансовый анализ', 'التحليل المالي', 'Financial Analysis'), value: analysisScore, max: 500 },
      { label: t('Качество решения', 'جودة القرار', 'Decision Quality'), value: decisionScore, max: 350 },
      { label: t('Переговоры', 'التفاوض', 'Negotiation'), value: termsScore, max: 150 },
    ])
  }, [decision, selectedArgs, npv, revenues, costs, yearlyProfits, selectedTerms, onComplete])

  /* --- Canvas header (shared across phases) --- */
  const canvasHeader = (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      className="w-full rounded-t-2xl"
      style={{ maxWidth: CANVAS_W, imageRendering: 'auto' }}
    />
  )

  /* --- Render: Intro --- */
  if (phase === 'intro') {
    return (
      <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl max-w-2xl mx-auto overflow-hidden">
        {canvasHeader}
        <div className="p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black text-white mb-3">{t('Стратегия выхода', 'استراتيجية الخروج', 'Exit Strategy')}</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              {locale === 'ru'
                ? <>Крупная корпорация предложила <span className="text-green-400 font-bold">$2,5 млн</span> за твой стартап. Продавать или продолжать строить? Цифры подскажут.</>
                : locale === 'ar'
                ? <>شركة كبرى عرضت <span className="text-green-400 font-bold">$2.5 مليون</span> لشراء شركتك الناشئة. هل تبيع أم تواصل البناء؟ الأرقام ستخبرك.</>
                : <>A large corporation has offered <span className="text-green-400 font-bold">$2.5 million</span> to acquire your startup. Should you sell or keep building? The numbers will tell the story.</>
              }
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-4 mb-6 space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">{t('Твои задачи', 'مهامك', 'Your Tasks')}</h3>
            <div className="flex items-start gap-3 text-sm">
              <span className="text-blue-400 text-lg">{'\u{1F4C8}'}</span>
              <p className="text-gray-300">
                {locale === 'ru'
                  ? <>Построй <span className="text-blue-400 font-bold">5-летний финансовый прогноз</span>: задай выручку, расходы и темп роста на каждый год.</>
                  : locale === 'ar'
                  ? <>ابنِ <span className="text-blue-400 font-bold">توقعات مالية لـ 5 سنوات</span>: حدد الإيرادات والتكاليف ومعدل النمو لكل سنة.</>
                  : <>Build a <span className="text-blue-400 font-bold">5-year financial projection</span>: set revenue, costs, and growth rate for each year.</>
                }
              </p>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <span className="text-green-400 text-lg">{'\u{1F4B5}'}</span>
              <p className="text-gray-300">
                {locale === 'ru'
                  ? <>Рассчитай <span className="text-green-400 font-bold">NPV (чистую приведённую стоимость)</span> компании и сравни с предложением $2,5 млн.</>
                  : locale === 'ar'
                  ? <>احسب <span className="text-green-400 font-bold">NPV (صافي القيمة الحالية)</span> لشركتك وقارنها بعرض $2.5M.</>
                  : <>Calculate the <span className="text-green-400 font-bold">NPV (Net Present Value)</span> of your company and compare it to the $2.5M offer.</>
                }
              </p>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <span className="text-amber-400 text-lg">{'\u{1F91D}'}</span>
              <p className="text-gray-300">
                {locale === 'ru'
                  ? <>Договорись об <span className="text-amber-400 font-bold">условиях сделки</span>, затем прими решение: <span className="text-red-400 font-bold">ПРОДАТЬ</span> или <span className="text-green-400 font-bold">ОСТАВИТЬ</span>.</>
                  : locale === 'ar'
                  ? <>تفاوض على <span className="text-amber-400 font-bold">شروط الصفقة</span>، ثم اتخذ قرارك النهائي: <span className="text-red-400 font-bold">بيع</span> أو <span className="text-green-400 font-bold">الاحتفاظ</span>.</>
                  : <>Negotiate <span className="text-amber-400 font-bold">deal terms</span>, then make your final decision: <span className="text-red-400 font-bold">SELL</span> or <span className="text-green-400 font-bold">KEEP</span>.</>
                }
              </p>
            </div>
          </div>

          <button
            onClick={() => setPhase('projection')}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-lg rounded-xl transition-colors"
          >
            {'\u{1F4BC}'} {t('Открыть финансовый калькулятор', 'فتح الآلة الحاسبة المالية', 'Open Financial Calculator')}
          </button>
        </div>
      </div>
    )
  }

  /* --- Render: Done --- */
  if (phase === 'done') {
    return (
      <div className="bg-[var(--brand-panel)] border border-green-500/40 rounded-2xl overflow-hidden">
        {canvasHeader}
        <div className="p-8 text-center">
          <p className="text-lg font-bold text-white">
            {decision === 'sell'
              ? t(`Ты продал компанию за $2,5 млн (NPV был $${npv.toLocaleString()}).`, `You sold the company for $2.5M (NPV was $${npv.toLocaleString()}).`)
              : t(`Ты оставил компанию (NPV: $${npv.toLocaleString()} vs предложение $2,5 млн).`, `You kept the company (NPV: $${npv.toLocaleString()} vs $2.5M offer).`)}
          </p>
          <p className="text-gray-400 text-sm mt-2">{t('Проверь результаты выше.', 'تحقق من النتائج أعلاه.', 'Check your results above.')}</p>
        </div>
      </div>
    )
  }

  /* --- Render: Decision --- */
  if (phase === 'decision') {
    return (
      <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl overflow-hidden">
        {canvasHeader}
        <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
          <span className="text-xs text-gray-400 font-bold">{t('Миссия 9: Финальное решение', 'المهمة 9: القرار النهائي', 'Mission 9: Final Decision')}</span>
        </div>

        <div className="p-4 space-y-5">
          {/* NPV comparison */}
          <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-[10px] text-gray-500 font-bold">{t('ТВОЙ NPV', 'NPV الخاص بك', 'YOUR NPV')}</div>
                <div className={`text-2xl font-black ${npv > BUYER_OFFER ? 'text-green-400' : 'text-yellow-400'}`}>
                  ${npv.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 font-bold">{t('ПРЕДЛОЖЕНИЕ', 'عرض المشتري', 'BUYER OFFER')}</div>
                <div className="text-2xl font-black text-amber-400">
                  ${BUYER_OFFER.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="text-center mt-2">
              <span className={`text-xs font-bold ${npv > BUYER_OFFER ? 'text-green-400' : 'text-red-400'}`}>
                {npv > BUYER_OFFER
                  ? t(`Твоя компания стоит на $${(npv - BUYER_OFFER).toLocaleString()} БОЛЬШЕ предложения`, `Your company is worth $${(npv - BUYER_OFFER).toLocaleString()} MORE than the offer`)
                  : t(`Предложение на $${(BUYER_OFFER - npv).toLocaleString()} БОЛЬШЕ твоего NPV`, `The offer is $${(BUYER_OFFER - npv).toLocaleString()} MORE than your NPV`)}
              </span>
            </div>
          </div>

          {/* Deal terms */}
          <div>
            <h4 className="text-sm font-bold text-gray-300 mb-2">{t('Условия сделки (выбери при продаже)', 'شروط الصفقة (اختر عند البيع)', 'Deal Terms (select if selling)')}</h4>
            <div className="space-y-2">
              {DEAL_TERMS.map(term => (
                <button
                  key={term.id}
                  onClick={() => toggleTerm(term.id)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                    selectedTerms.has(term.id)
                      ? 'border-amber-500 bg-amber-900/20'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
                  }`}
                >
                  <div className="text-sm font-bold text-white">{term.label}</div>
                  <div className="text-[10px] text-gray-400">{term.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* SELL or KEEP */}
          <div>
            <h4 className="text-sm font-bold text-gray-300 mb-2">{t('Твоё решение', 'قرارك', 'Your Decision')}</h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setDecision('sell'); setSelectedArgs(new Set()) }}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  decision === 'sell'
                    ? 'border-red-500 bg-red-900/20'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
                }`}
              >
                <div className="text-2xl mb-1">{'\u{1F91D}'}</div>
                <div className="text-sm font-black text-white">{t('ПРОДАТЬ', 'بيع', 'SELL')}</div>
                <div className="text-[10px] text-gray-400">{t('Принять $2,5 млн', 'قبول $2.5M', 'Accept $2.5M')}</div>
              </button>
              <button
                onClick={() => { setDecision('keep'); setSelectedArgs(new Set()) }}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  decision === 'keep'
                    ? 'border-green-500 bg-green-900/20'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
                }`}
              >
                <div className="text-2xl mb-1">{'\u{1F680}'}</div>
                <div className="text-sm font-black text-white">{t('ОСТАВИТЬ', 'الاحتفاظ', 'KEEP')}</div>
                <div className="text-[10px] text-gray-400">{t('Продолжить строить', 'متابعة البناء', 'Continue building')}</div>
              </button>
            </div>
          </div>

          {/* Arguments */}
          {decision && (
            <div>
              <h4 className="text-sm font-bold text-gray-300 mb-1">
                {t('Выбери 3 аргумента в поддержку', 'اختر 3 حجج داعمة', 'Select 3 supporting arguments')}
              </h4>
              <div className="text-[10px] text-gray-500 mb-2">{selectedArgs.size}/3 {t('выбрано', 'مختار', 'selected')}</div>
              <div className="space-y-2">
                {ARGUMENTS.map(arg => {
                  const isSelected = selectedArgs.has(arg.id)
                  return (
                    <button
                      key={arg.id}
                      onClick={() => toggleArg(arg.id)}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all text-sm ${
                        isSelected
                          ? 'border-amber-500 bg-amber-900/20 text-white'
                          : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      {arg.text}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3">
            <button
              onClick={() => setPhase('projection')}
              className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-colors"
            >
              {t('Назад к цифрам', 'العودة للأرقام', 'Back to Numbers')}
            </button>
            <button
              onClick={handleFinish}
              disabled={!decision || selectedArgs.size < 3}
              className={`flex-1 px-4 py-3 font-bold rounded-xl transition-colors ${
                decision && selectedArgs.size >= 3
                  ? 'bg-green-600 hover:bg-green-500 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {t('Отправить решение', 'تقديم القرار', 'Submit Decision')} {'\u{1F4BC}'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* --- Render: Financial Projection --- */
  return (
    <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl overflow-hidden">
      {canvasHeader}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700">
        <span className="text-xs text-gray-400 font-bold">{t('Миссия 9: Финансовый калькулятор', 'المهمة 9: الآلة الحاسبة المالية', 'Mission 9: Financial Calculator')}</span>
        <span className="text-xs text-gray-500">{t('Ставка дисконтирования', 'معدل الخصم', 'Discount rate')}: {(DISCOUNT_RATE * 100).toFixed(0)}%</span>
      </div>

      <div className="p-4 space-y-5">
        {/* NPV display */}
        <div className="text-center">
          <div className="text-[10px] text-gray-500 font-bold mb-1">{t('ЧИСТАЯ ПРИВЕДЁННАЯ СТОИМОСТЬ (NPV)', 'صافي القيمة الحالية (NPV)', 'NET PRESENT VALUE (NPV)')}</div>
          <div className={`text-4xl font-black ${npv > BUYER_OFFER ? 'text-green-400' : npv > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
            ${npv.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {t('Предложение покупателя', 'عرض المشتري', 'Buyer offer')}: <span className="text-amber-400 font-bold">${BUYER_OFFER.toLocaleString()}</span>
          </div>
        </div>

        {/* Visual: 5-year profit chart */}
        <div>
          <div className="text-[10px] text-gray-500 font-bold mb-2">{t('ПРОГНОЗ НА 5 ЛЕТ', 'التوقعات لـ 5 سنوات', '5-YEAR PROJECTION')}</div>
          <div className="flex items-end gap-2 h-32 bg-gray-900/50 rounded-xl p-2 border border-gray-700">
            {yearlyProfits.map((profit, i) => {
              const maxVal = Math.max(...yearlyProfits.map(Math.abs), 1)
              const height = Math.abs(profit) / maxVal * 100
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div className="text-[9px] text-gray-400 mb-1">${(profit / 1000).toFixed(0)}K</div>
                  <div
                    className={`w-full rounded-t-sm ${profit >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{ height: `${height}%`, minHeight: '4px' }}
                  />
                  <div className="text-[9px] text-gray-500 mt-1">Y{i + 1}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Year-by-year sliders */}
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="bg-gray-900/50 border border-gray-700 rounded-xl p-3">
            <div className="text-xs font-bold text-white mb-2">{t(`Год ${i + 1}`, `Year ${i + 1}`)}</div>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-green-400">{t('Выручка', 'الإيرادات', 'Revenue')}</span>
                  <span className="text-white font-bold">${(revenues[i] / 1000).toFixed(0)}K</span>
                </div>
                <input
                  type="range"
                  min={100000}
                  max={maxRevenue}
                  step={50000}
                  value={revenues[i]}
                  onChange={(e) => {
                    const newRevs = [...revenues]
                    newRevs[i] = Number(e.target.value)
                    setRevenues(newRevs)
                  }}
                  className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-red-400">{t('Расходы', 'التكاليف', 'Costs')}</span>
                  <span className="text-white font-bold">${(costs[i] / 1000).toFixed(0)}K</span>
                </div>
                <input
                  type="range"
                  min={50000}
                  max={maxCost}
                  step={50000}
                  value={costs[i]}
                  onChange={(e) => {
                    const newCosts = [...costs]
                    newCosts[i] = Number(e.target.value)
                    setCosts(newCosts)
                  }}
                  className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                />
              </div>
              <div className="text-right">
                <span className={`text-[10px] font-bold ${yearlyProfits[i] >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {t('Прибыль', 'الربح', 'Profit')}: ${(yearlyProfits[i] / 1000).toFixed(0)}K
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Growth rate (informational) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-bold text-gray-300">{t('Ожидаемый темп роста', 'معدل النمو المتوقع', 'Expected Growth Rate')}</span>
            <span className="text-sm font-black text-white">{growthRate}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={50}
            step={1}
            value={growthRate}
            onChange={(e) => setGrowthRate(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex justify-between text-[10px] text-gray-500 mt-1">
            <span>0%</span>
            <span>50%</span>
          </div>
        </div>

        {/* Proceed to decision */}
        <button
          onClick={() => setPhase('decision')}
          className="w-full px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors"
        >
          {t('Перейти к решению', 'المتابعة للقرار', 'Proceed to Decision')} {'\u{1F4BC}'}
        </button>
      </div>
    </div>
  )
}
