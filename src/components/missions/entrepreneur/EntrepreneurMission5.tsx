'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useLocale } from 'next-intl'

/* --- Types --- */

export interface ScoreBreakdownItem {
  label: string
  value: number
  max: number
}

interface EntrepreneurMission5Props {
  userId: string
  onComplete?: (score: number, breakdown: ScoreBreakdownItem[]) => void
}

/* --- Constants --- */

const FIXED_COSTS = 3000 // per month
const MIN_PRICE = 5
const MAX_PRICE = 100
const MIN_MARKETING = 0
const MAX_MARKETING = 5000

// Canvas dimensions
const CANVAS_W = 600
const CANVAS_H = 250

/* --- Business model --- */

// Customers = f(price, marketing)
// Higher price = fewer customers, more marketing = more customers
function calculateCustomers(price: number, marketing: number): number {
  // Base customers decrease with price (demand curve)
  const priceEffect = Math.max(0, 120 - price * 1.5)
  // Marketing increases customers (diminishing returns)
  const marketingEffect = Math.sqrt(marketing) * 1.5
  return Math.max(0, Math.round(priceEffect + marketingEffect))
}

function calculateCAC(marketing: number, customers: number): number {
  if (customers === 0) return 0
  return Math.round((marketing / customers) * 100) / 100
}

function calculateRevenue(price: number, customers: number): number {
  return price * customers
}

function calculateProfit(price: number, customers: number, marketing: number): number {
  const revenue = calculateRevenue(price, customers)
  const totalCosts = FIXED_COSTS + marketing
  return revenue - totalCosts
}

// Find maximum possible profit for scoring
function findMaxProfit(): number {
  let maxProfit = -Infinity
  for (let p = MIN_PRICE; p <= MAX_PRICE; p += 1) {
    for (let m = MIN_MARKETING; m <= MAX_MARKETING; m += 100) {
      const customers = calculateCustomers(p, m)
      const profit = calculateProfit(p, customers, m)
      if (profit > maxProfit) maxProfit = profit
    }
  }
  return maxProfit
}

const MAX_POSSIBLE_PROFIT = findMaxProfit()

/* --- Canvas drawing: isometric helpers --- */

// Isometric tile dimensions
const TILE_W = 48
const TILE_H = 24

function drawIsoTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  topColor: string,
  leftColor: string,
  rightColor: string,
) {
  // Top face
  ctx.fillStyle = topColor
  ctx.beginPath()
  ctx.moveTo(x, y - h)
  ctx.lineTo(x + w / 2, y - h + TILE_H / 2)
  ctx.lineTo(x, y - h + TILE_H)
  ctx.lineTo(x - w / 2, y - h + TILE_H / 2)
  ctx.closePath()
  ctx.fill()

  // Left face
  ctx.fillStyle = leftColor
  ctx.beginPath()
  ctx.moveTo(x - w / 2, y - h + TILE_H / 2)
  ctx.lineTo(x, y - h + TILE_H)
  ctx.lineTo(x, y + TILE_H)
  ctx.lineTo(x - w / 2, y + TILE_H / 2)
  ctx.closePath()
  ctx.fill()

  // Right face
  ctx.fillStyle = rightColor
  ctx.beginPath()
  ctx.moveTo(x + w / 2, y - h + TILE_H / 2)
  ctx.lineTo(x, y - h + TILE_H)
  ctx.lineTo(x, y + TILE_H)
  ctx.lineTo(x + w / 2, y + TILE_H / 2)
  ctx.closePath()
  ctx.fill()
}

// Isometric ground tiles
function drawGround(ctx: CanvasRenderingContext2D) {
  const baseX = CANVAS_W / 2
  const baseY = 190
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 10; col++) {
      const isoX = baseX + (col - row) * (TILE_W / 2) - 100
      const isoY = baseY + (col + row) * (TILE_H / 2) - 40
      const shade = (row + col) % 2 === 0 ? '#2D3748' : '#2A3040'
      ctx.fillStyle = shade
      ctx.beginPath()
      ctx.moveTo(isoX, isoY)
      ctx.lineTo(isoX + TILE_W / 2, isoY + TILE_H / 2)
      ctx.lineTo(isoX, isoY + TILE_H)
      ctx.lineTo(isoX - TILE_W / 2, isoY + TILE_H / 2)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#3A4558'
      ctx.lineWidth = 0.5
      ctx.stroke()
    }
  }
}

// Draw the storefront building -- size scales with profit
function drawStorefront(
  ctx: CanvasRenderingContext2D,
  profit: number,
  maxProfit: number,
  time: number,
) {
  const cx = 180
  const baseY = 180

  // Building scale based on profitability (0.6 to 1.2)
  const profitRatio = Math.max(0, Math.min(1, (profit + 3000) / (maxProfit + 3000)))
  const scale = 0.6 + profitRatio * 0.6
  const bw = 90 * scale
  const bh = 70 * scale

  // Building glow when profitable
  if (profit > 0) {
    const glowIntensity = Math.min(1, profit / maxProfit) * 0.4 + Math.sin(time * 2) * 0.05
    ctx.shadowColor = '#22C55E'
    ctx.shadowBlur = 20 * glowIntensity
  }

  // Main building block
  const topColor = profit > 0 ? '#4ADE80' : '#EF4444'
  const leftColor = profit > 0 ? '#16A34A' : '#B91C1C'
  const rightColor = profit > 0 ? '#15803D' : '#991B1B'
  drawIsoTile(ctx, cx, baseY, bw, bh, topColor, leftColor, rightColor)

  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0

  // Door
  const doorW = 10 * scale
  const doorH = 18 * scale
  ctx.fillStyle = '#1E293B'
  ctx.fillRect(cx - doorW / 2, baseY + TILE_H - doorH + 2, doorW, doorH)

  // Window(s)
  const windowSize = 8 * scale
  const windowGap = 16 * scale
  ctx.fillStyle = profit > 0 ? '#FDE68A' : '#64748B'
  ctx.fillRect(cx - windowGap - windowSize / 2, baseY - bh / 2, windowSize, windowSize)
  ctx.fillRect(cx + windowGap - windowSize / 2, baseY - bh / 2, windowSize, windowSize)

  // Roof sign: "$"
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `bold ${Math.round(14 * scale)}px monospace`
  ctx.textAlign = 'center'
  ctx.fillText('$', cx, baseY - bh + 6)
}

// Draw billboard for marketing
function drawBillboard(
  ctx: CanvasRenderingContext2D,
  marketing: number,
  maxMarketing: number,
  time: number,
) {
  const bx = 400
  const by = 120

  // Post
  ctx.strokeStyle = '#64748B'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(bx, by + 40)
  ctx.lineTo(bx, by + 80)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(bx + 30, by + 40)
  ctx.lineTo(bx + 30, by + 80)
  ctx.stroke()

  // Billboard board
  const glowRatio = marketing / maxMarketing
  const glow = glowRatio * 15 + Math.sin(time * 3) * 3 * glowRatio

  if (glowRatio > 0.1) {
    ctx.shadowColor = '#FBBF24'
    ctx.shadowBlur = glow
  }

  ctx.fillStyle = '#1E293B'
  ctx.fillRect(bx - 20, by, 70, 40)
  ctx.strokeStyle = glowRatio > 0.5 ? '#FBBF24' : '#475569'
  ctx.lineWidth = 2
  ctx.strokeRect(bx - 20, by, 70, 40)

  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0

  // Billboard text
  ctx.fillStyle = glowRatio > 0.3 ? '#FBBF24' : '#64748B'
  ctx.font = 'bold 10px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('ADS', bx + 15, by + 18)

  // Marketing spend indicator bars
  const bars = Math.round(glowRatio * 5)
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < bars ? '#FBBF24' : '#334155'
    ctx.fillRect(bx - 10 + i * 12, by + 26, 8, 6)
  }
}

// Particle system for money particles
interface MoneyParticle {
  x: number
  y: number
  vx: number
  vy: number
  text: string
  alpha: number
  size: number
  color: string
}

function createMoneyParticles(
  existing: MoneyParticle[],
  profit: number,
  time: number,
): MoneyParticle[] {
  const particles = [...existing]

  // Spawn new particles periodically
  if (Math.random() < 0.08 && Math.abs(profit) > 100) {
    const count = Math.min(3, Math.ceil(Math.abs(profit) / 2000))
    for (let i = 0; i < count; i++) {
      const goingUp = profit > 0
      particles.push({
        x: 170 + (Math.random() - 0.5) * 40,
        y: goingUp ? 140 : 120,
        vx: (Math.random() - 0.5) * 1.5,
        vy: goingUp ? -(0.8 + Math.random() * 1.2) : (0.5 + Math.random() * 0.8),
        text: goingUp ? '$' : '-$',
        alpha: 1,
        size: 10 + Math.random() * 6,
        color: goingUp ? '#4ADE80' : '#EF4444',
      })
    }
  }

  // Update existing
  return particles
    .map(p => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      alpha: p.alpha - 0.012,
    }))
    .filter(p => p.alpha > 0 && p.y > 0 && p.y < CANVAS_H)
}

function drawMoneyParticles(ctx: CanvasRenderingContext2D, particles: MoneyParticle[]) {
  for (const p of particles) {
    ctx.globalAlpha = p.alpha
    ctx.fillStyle = p.color
    ctx.font = `bold ${p.size}px monospace`
    ctx.textAlign = 'center'
    ctx.fillText(p.text, p.x, p.y)
  }
  ctx.globalAlpha = 1
}

// Customer figures walking
interface CustomerFigure {
  x: number
  y: number
  speed: number
  phase: number
}

function drawCustomerFigures(
  ctx: CanvasRenderingContext2D,
  customers: number,
  time: number,
  figures: CustomerFigure[],
): CustomerFigure[] {
  const maxFigures = Math.min(12, Math.ceil(customers / 10))
  const updated = [...figures]

  // Ensure correct number of figures
  while (updated.length < maxFigures) {
    updated.push({
      x: 300 + Math.random() * 200,
      y: 175 + Math.random() * 40,
      speed: 0.3 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
    })
  }
  while (updated.length > maxFigures) {
    updated.pop()
  }

  // Draw and update each figure
  for (let i = 0; i < updated.length; i++) {
    const fig = updated[i]
    // Walk toward store
    fig.x -= fig.speed
    if (fig.x < 200) {
      fig.x = 500 + Math.random() * 80
      fig.y = 175 + Math.random() * 40
    }

    // Walking bob
    const bob = Math.sin(time * 6 + fig.phase) * 2

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)'
    ctx.beginPath()
    ctx.ellipse(fig.x, fig.y + 10, 5, 2, 0, 0, Math.PI * 2)
    ctx.fill()

    // Body (simple stick figure)
    ctx.fillStyle = '#60A5FA'
    ctx.beginPath()
    ctx.arc(fig.x, fig.y - 4 + bob, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#60A5FA'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(fig.x, fig.y + bob)
    ctx.lineTo(fig.x, fig.y + 8 + bob)
    ctx.stroke()
    // Legs
    const legSwing = Math.sin(time * 6 + fig.phase) * 3
    ctx.beginPath()
    ctx.moveTo(fig.x, fig.y + 8 + bob)
    ctx.lineTo(fig.x - 3 + legSwing, fig.y + 13 + bob)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(fig.x, fig.y + 8 + bob)
    ctx.lineTo(fig.x + 3 - legSwing, fig.y + 13 + bob)
    ctx.stroke()
  }

  return updated
}

// Cash register animation
function drawCashRegister(
  ctx: CanvasRenderingContext2D,
  profit: number,
  time: number,
) {
  const rx = 280
  const ry = 160

  // Register body
  ctx.fillStyle = '#475569'
  ctx.fillRect(rx - 12, ry, 24, 16)
  ctx.fillStyle = '#334155'
  ctx.fillRect(rx - 14, ry + 16, 28, 4)

  // Screen
  const screenColor = profit > 0 ? '#4ADE80' : profit < 0 ? '#EF4444' : '#64748B'
  ctx.fillStyle = screenColor
  ctx.fillRect(rx - 8, ry + 2, 16, 8)

  // Ring animation when profitable
  if (profit > 0 && Math.sin(time * 4) > 0.7) {
    ctx.strokeStyle = '#FDE68A'
    ctx.lineWidth = 1.5
    const ringSize = (Math.sin(time * 8) + 1) * 6 + 4
    ctx.globalAlpha = 0.6
    ctx.beginPath()
    ctx.arc(rx, ry - 4, ringSize, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 0.3
    ctx.beginPath()
    ctx.arc(rx, ry - 4, ringSize + 4, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 1
  }
}

/* --- Canvas Component --- */

function StorefrontCanvas({
  price,
  marketing,
  customers,
  profit,
}: {
  price: number
  marketing: number
  customers: number
  profit: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<MoneyParticle[]>([])
  const figuresRef = useRef<CustomerFigure[]>([])
  const animRef = useRef<number>(0)
  const stateRef = useRef({ price, marketing, customers, profit })

  // Keep state ref current without restarting the animation loop
  useEffect(() => {
    stateRef.current = { price, marketing, customers, profit }
  }, [price, marketing, customers, profit])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let startTime = performance.now()

    function draw(now: number) {
      const time = (now - startTime) / 1000
      const s = stateRef.current

      ctx!.clearRect(0, 0, CANVAS_W, CANVAS_H)

      // Background gradient
      const grad = ctx!.createLinearGradient(0, 0, 0, CANVAS_H)
      grad.addColorStop(0, '#0F172A')
      grad.addColorStop(1, '#1E293B')
      ctx!.fillStyle = grad
      ctx!.fillRect(0, 0, CANVAS_W, CANVAS_H)

      // Ambient stars
      ctx!.fillStyle = '#64748B'
      for (let i = 0; i < 20; i++) {
        const sx = ((i * 137 + 50) % CANVAS_W)
        const sy = ((i * 89 + 20) % 80)
        const twinkle = Math.sin(time * 2 + i) * 0.5 + 0.5
        ctx!.globalAlpha = twinkle * 0.6
        ctx!.beginPath()
        ctx!.arc(sx, sy, 1, 0, Math.PI * 2)
        ctx!.fill()
      }
      ctx!.globalAlpha = 1

      // Ground
      drawGround(ctx!)

      // Storefront
      drawStorefront(ctx!, s.profit, MAX_POSSIBLE_PROFIT, time)

      // Cash register
      drawCashRegister(ctx!, s.profit, time)

      // Billboard
      drawBillboard(ctx!, s.marketing, MAX_MARKETING, time)

      // Money particles
      particlesRef.current = createMoneyParticles(particlesRef.current, s.profit, time)
      drawMoneyParticles(ctx!, particlesRef.current)

      // Customer figures
      figuresRef.current = drawCustomerFigures(ctx!, s.customers, time, figuresRef.current)

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animRef.current)
    }
  }, [])

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

export default function EntrepreneurMission5({ userId, onComplete }: EntrepreneurMission5Props) {
  const locale = useLocale()
  const [price, setPrice] = useState(25)
  const [marketing, setMarketing] = useState(1000)
  const [locked, setLocked] = useState(false)

  const customers = useMemo(() => calculateCustomers(price, marketing), [price, marketing])
  const cac = useMemo(() => calculateCAC(marketing, customers), [marketing, customers])
  const revenue = useMemo(() => calculateRevenue(price, customers), [price, customers])
  const totalCosts = FIXED_COSTS + marketing
  const profit = useMemo(() => calculateProfit(price, customers, marketing), [price, customers, marketing])
  const isProfitable = profit > 0

  // Simple bar chart data points for the visual
  const chartPoints = useMemo(() => {
    const points: { price: number; revenue: number; cost: number }[] = []
    for (let p = 10; p <= 90; p += 10) {
      const c = calculateCustomers(p, marketing)
      points.push({
        price: p,
        revenue: calculateRevenue(p, c),
        cost: FIXED_COSTS + marketing,
      })
    }
    return points
  }, [marketing])

  const maxChartValue = useMemo(() => {
    let max = 0
    for (const p of chartPoints) {
      if (p.revenue > max) max = p.revenue
      if (p.cost > max) max = p.cost
    }
    return max || 1
  }, [chartPoints])

  const handleLockIn = useCallback(() => {
    setLocked(true)

    // Scoring
    const profitScore = isProfitable ? 500 : Math.max(0, Math.round(250 + (profit / 1000) * 250))
    const optimizationScore = isProfitable
      ? Math.round(350 * Math.min(1, profit / MAX_POSSIBLE_PROFIT))
      : 0
    // Sustainability: penalize if marketing > 60% of revenue
    const marketingRatio = revenue > 0 ? marketing / revenue : 1
    const sustainabilityScore = marketingRatio <= 0.4 ? 150 : marketingRatio <= 0.6 ? 100 : marketingRatio <= 0.8 ? 50 : 0

    const totalScore = Math.min(1000, profitScore + optimizationScore + sustainabilityScore)

    onComplete?.(totalScore, [
      { label: locale === 'ru' ? 'Прибыльность' : locale === 'ar' ? 'الربحية' : 'Profitability', value: profitScore, max: 500 },
      { label: locale === 'ru' ? 'Оптимизация' : locale === 'ar' ? 'التحسين' : 'Optimization', value: optimizationScore, max: 350 },
      { label: locale === 'ru' ? 'Устойчивость' : locale === 'ar' ? 'الاستدامة' : 'Sustainability', value: sustainabilityScore, max: 150 },
    ])
  }, [isProfitable, profit, marketing, revenue, onComplete, locale])

  /* --- Render: Done --- */
  if (locked) {
    return (
      <div className="bg-[var(--brand-panel)] border border-green-500/40 rounded-2xl p-8 text-center">
        <div className="text-6xl mb-4">{isProfitable ? '\u{1F4B8}' : '\u{1F4C9}'}</div>
        <p className={`text-lg font-bold ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
          {isProfitable
            ? (locale === 'ru' ? 'Бизнес прибыльный!' : locale === 'ar' ? 'المشروع مربح!' : 'Business is profitable!')
            : (locale === 'ru' ? 'Бизнес пока не прибыльный.' : locale === 'ar' ? 'المشروع ليس مربحاً بعد.' : 'Business is not profitable yet.')}
        </p>
        <p className="text-gray-400 text-sm mt-2">
          {locale === 'ru' ? 'Цена' : locale === 'ar' ? 'السعر' : 'Price'}: ${price} | {locale === 'ru' ? 'Клиенты' : locale === 'ar' ? 'العملاء' : 'Customers'}: {customers} | {locale === 'ru' ? 'Месячная прибыль' : locale === 'ar' ? 'الربح الشهري' : 'Monthly profit'}: ${profit.toLocaleString()}
        </p>
        <p className="text-gray-500 text-xs mt-1">{locale === 'ru' ? 'Проверьте результаты выше.' : locale === 'ar' ? 'تحقق من النتائج أعلاه.' : 'Check your results above.'}</p>
      </div>
    )
  }

  /* --- Render: Dashboard --- */
  return (
    <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700">
        <span className="text-xs text-gray-400 font-bold">{locale === 'ru' ? 'Миссия 5: Назначь правильную цену' : locale === 'ar' ? 'المهمة 5: حدد السعر المناسب' : 'Mission 5: Price It Right'}</span>
      </div>

      {/* Briefing */}
      <div className="px-4 py-4 bg-indigo-950/40 border-b border-indigo-800/50">
        <h3 className="text-sm font-bold text-indigo-300 mb-2">{locale === 'ru' ? 'Ваша миссия' : locale === 'ar' ? 'مهمتك' : 'Your Mission'}</h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          <li className="flex items-start gap-2">
            <span className="text-indigo-400 mt-0.5">&#x2022;</span>
            {locale === 'ru'
              ? <>Установите <span className="font-bold text-white">правильную цену</span> и <span className="font-bold text-white">бюджет на маркетинг</span> для вашего продукта.</>
              : locale === 'ar'
              ? <>حدد <span className="font-bold text-white">السعر المناسب</span> و<span className="font-bold text-white">ميزانية التسويق</span> لمنتجك.</>
              : <>Set the <span className="font-bold text-white">right price</span> and <span className="font-bold text-white">marketing budget</span> for your product.</>}
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-400 mt-0.5">&#x26A0;</span>
            {locale === 'ru' ? 'Слишком высокая цена = нет покупателей. Слишком низкая = банкротство.' : locale === 'ar' ? 'سعر مرتفع جداً = لا مشترين. منخفض جداً = إفلاس.' : 'Too high a price = no buyers. Too low = bankruptcy.'}
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5">&#x1F4B0;</span>
            {locale === 'ru'
              ? <>Формула: <span className="font-mono text-green-300 text-xs">Прибыль = (Цена x Клиенты) - Маркетинг - Постоянные расходы ($3,000/мес)</span></>
              : locale === 'ar'
              ? <>المعادلة: <span className="font-mono text-green-300 text-xs">الربح = (السعر x العملاء) - التسويق - التكاليف الثابتة ($3,000/شهر)</span></>
              : <>Formula: <span className="font-mono text-green-300 text-xs">Profit = (Price x Customers) - Marketing - Fixed Costs ($3,000/mo)</span></>}
          </li>
        </ul>
      </div>

      <div className="p-4 space-y-6">
        {/* 2.5D Canvas Visualization */}
        <div className="flex justify-center">
          <StorefrontCanvas
            price={price}
            marketing={marketing}
            customers={customers}
            profit={profit}
          />
        </div>

        {/* Big profit indicator */}
        <div className="text-center">
          <div className="text-xs text-gray-500 font-bold mb-1">{locale === 'ru' ? 'МЕСЯЧНАЯ ПРИБЫЛЬ' : locale === 'ar' ? 'الربح الشهري' : 'MONTHLY PROFIT'}</div>
          <div className={`text-4xl font-black ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
            ${profit.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {locale === 'ru' ? 'Выручка' : locale === 'ar' ? 'الإيرادات' : 'Revenue'}: ${revenue.toLocaleString()} | {locale === 'ru' ? 'Расходы' : locale === 'ar' ? 'التكاليف' : 'Costs'}: ${totalCosts.toLocaleString()}
          </div>
        </div>

        {/* Revenue vs Costs chart */}
        <div>
          <div className="text-xs text-gray-400 font-bold mb-2">{locale === 'ru' ? 'Выручка и расходы по ценовым точкам' : locale === 'ar' ? 'الإيرادات مقابل التكاليف حسب نقطة السعر' : 'Revenue vs Costs by Price Point'}</div>
          <div className="flex items-end gap-1 h-32 bg-gray-900/50 rounded-xl p-2 border border-gray-700">
            {chartPoints.map((p, i) => {
              const revHeight = (p.revenue / maxChartValue) * 100
              const costHeight = (p.cost / maxChartValue) * 100
              const isCurrentRange = Math.abs(p.price - price) <= 5
              return (
                <div key={i} className="flex-1 flex items-end gap-px h-full">
                  <div className="flex-1 flex flex-col justify-end h-full">
                    <div
                      className={`rounded-t-sm ${isCurrentRange ? 'bg-green-400' : 'bg-green-700/60'}`}
                      style={{ height: `${revHeight}%` }}
                    />
                  </div>
                  <div className="flex-1 flex flex-col justify-end h-full">
                    <div
                      className={`rounded-t-sm ${isCurrentRange ? 'bg-red-400' : 'bg-red-700/60'}`}
                      style={{ height: `${costHeight}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 mt-1 px-1">
            <span>$10</span>
            <span>$50</span>
            <span>$90</span>
          </div>
          <div className="flex gap-4 justify-center mt-1">
            <span className="flex items-center gap-1 text-[10px] text-gray-400">
              <span className="w-2 h-2 rounded-sm bg-green-500 inline-block" /> {locale === 'ru' ? 'Выручка' : locale === 'ar' ? 'الإيرادات' : 'Revenue'}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-gray-400">
              <span className="w-2 h-2 rounded-sm bg-red-500 inline-block" /> {locale === 'ru' ? 'Расходы' : locale === 'ar' ? 'التكاليف' : 'Costs'}
            </span>
          </div>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-3 text-center">
            <div className="text-[10px] text-gray-500 font-bold">{locale === 'ru' ? 'КЛИЕНТЫ' : locale === 'ar' ? 'العملاء' : 'CUSTOMERS'}</div>
            <div className="text-xl font-black text-blue-400">{customers}</div>
          </div>
          <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-3 text-center">
            <div className="text-[10px] text-gray-500 font-bold">CAC</div>
            <div className="text-xl font-black text-yellow-400">${cac.toFixed(0)}</div>
          </div>
          <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-3 text-center">
            <div className="text-[10px] text-gray-500 font-bold">{locale === 'ru' ? 'ВЫРУЧКА' : locale === 'ar' ? 'الإيرادات' : 'REVENUE'}</div>
            <div className="text-xl font-black text-green-400">${revenue.toLocaleString()}</div>
          </div>
        </div>

        {/* Price slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-gray-300">{locale === 'ru' ? 'Цена продукта' : locale === 'ar' ? 'سعر المنتج' : 'Product Price'}</label>
            <span className="text-sm font-black text-white">${price}</span>
          </div>
          <input
            type="range"
            min={MIN_PRICE}
            max={MAX_PRICE}
            step={1}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex justify-between text-[10px] text-gray-500 mt-1">
            <span>${MIN_PRICE}</span>
            <span>${MAX_PRICE}</span>
          </div>
        </div>

        {/* Marketing slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-gray-300">{locale === 'ru' ? 'Бюджет на маркетинг' : locale === 'ar' ? 'ميزانية التسويق' : 'Marketing Budget'}</label>
            <span className="text-sm font-black text-white">${marketing.toLocaleString()}/{locale === 'ru' ? 'мес' : locale === 'ar' ? 'شهر' : 'mo'}</span>
          </div>
          <input
            type="range"
            min={MIN_MARKETING}
            max={MAX_MARKETING}
            step={100}
            value={marketing}
            onChange={(e) => setMarketing(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex justify-between text-[10px] text-gray-500 mt-1">
            <span>$0</span>
            <span>${MAX_MARKETING.toLocaleString()}</span>
          </div>
        </div>

        {/* Lock in button */}
        <div className="flex justify-end">
          <button
            onClick={handleLockIn}
            className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors"
          >
            {locale === 'ru' ? 'Зафиксировать цену' : locale === 'ar' ? 'تثبيت السعر' : 'Lock In Price'} &#x1F512;
          </button>
        </div>
      </div>
    </div>
  )
}
