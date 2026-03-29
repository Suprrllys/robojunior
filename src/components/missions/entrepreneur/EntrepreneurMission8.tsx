'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useLocale } from 'next-intl'

/* --- Types --- */

export interface ScoreBreakdownItem {
  label: string
  value: number
  max: number
}

interface EntrepreneurMission8Props {
  userId: string
  onComplete?: (score: number, breakdown: ScoreBreakdownItem[]) => void
}

/* --- Data --- */

interface CustomerRow {
  id: number
  country: string
  plan: 'Free' | 'Basic' | 'Premium'
  monthlyPayment: number
  activeMonths: number
}

type ChartType = 'bar' | 'pie' | 'line'

const COUNTRY_OPTIONS = ['India', 'Brazil', 'Russia', 'China', 'South Africa'] as const
const PLAN_OPTIONS = ['Free', 'Basic', 'Premium'] as const

// Generate 100 sample rows with a hidden pattern: Premium India = highest revenue
function generateData(): CustomerRow[] {
  const rows: CustomerRow[] = []
  let id = 1

  // Premium India customers: high payment, long active -- the "correct insight"
  for (let i = 0; i < 12; i++) {
    rows.push({ id: id++, country: 'India', plan: 'Premium', monthlyPayment: 80 + Math.floor(Math.random() * 40), activeMonths: 10 + Math.floor(Math.random() * 14) })
  }
  // Basic India
  for (let i = 0; i < 8; i++) {
    rows.push({ id: id++, country: 'India', plan: 'Basic', monthlyPayment: 15 + Math.floor(Math.random() * 15), activeMonths: 4 + Math.floor(Math.random() * 8) })
  }
  // Free India
  for (let i = 0; i < 5; i++) {
    rows.push({ id: id++, country: 'India', plan: 'Free', monthlyPayment: 0, activeMonths: 1 + Math.floor(Math.random() * 3) })
  }
  // Brazil mixed
  for (let i = 0; i < 6; i++) {
    rows.push({ id: id++, country: 'Brazil', plan: 'Premium', monthlyPayment: 60 + Math.floor(Math.random() * 30), activeMonths: 6 + Math.floor(Math.random() * 8) })
  }
  for (let i = 0; i < 8; i++) {
    rows.push({ id: id++, country: 'Brazil', plan: 'Basic', monthlyPayment: 10 + Math.floor(Math.random() * 15), activeMonths: 3 + Math.floor(Math.random() * 6) })
  }
  for (let i = 0; i < 4; i++) {
    rows.push({ id: id++, country: 'Brazil', plan: 'Free', monthlyPayment: 0, activeMonths: 1 + Math.floor(Math.random() * 2) })
  }
  // Russia
  for (let i = 0; i < 5; i++) {
    rows.push({ id: id++, country: 'Russia', plan: 'Premium', monthlyPayment: 50 + Math.floor(Math.random() * 30), activeMonths: 5 + Math.floor(Math.random() * 7) })
  }
  for (let i = 0; i < 8; i++) {
    rows.push({ id: id++, country: 'Russia', plan: 'Basic', monthlyPayment: 12 + Math.floor(Math.random() * 10), activeMonths: 3 + Math.floor(Math.random() * 5) })
  }
  for (let i = 0; i < 5; i++) {
    rows.push({ id: id++, country: 'Russia', plan: 'Free', monthlyPayment: 0, activeMonths: 1 + Math.floor(Math.random() * 3) })
  }
  // China
  for (let i = 0; i < 6; i++) {
    rows.push({ id: id++, country: 'China', plan: 'Premium', monthlyPayment: 55 + Math.floor(Math.random() * 25), activeMonths: 5 + Math.floor(Math.random() * 6) })
  }
  for (let i = 0; i < 10; i++) {
    rows.push({ id: id++, country: 'China', plan: 'Basic', monthlyPayment: 12 + Math.floor(Math.random() * 12), activeMonths: 3 + Math.floor(Math.random() * 5) })
  }
  for (let i = 0; i < 6; i++) {
    rows.push({ id: id++, country: 'China', plan: 'Free', monthlyPayment: 0, activeMonths: 1 + Math.floor(Math.random() * 2) })
  }
  // South Africa
  for (let i = 0; i < 4; i++) {
    rows.push({ id: id++, country: 'South Africa', plan: 'Premium', monthlyPayment: 45 + Math.floor(Math.random() * 20), activeMonths: 4 + Math.floor(Math.random() * 5) })
  }
  for (let i = 0; i < 7; i++) {
    rows.push({ id: id++, country: 'South Africa', plan: 'Basic', monthlyPayment: 10 + Math.floor(Math.random() * 10), activeMonths: 2 + Math.floor(Math.random() * 4) })
  }
  for (let i = 0; i < 6; i++) {
    rows.push({ id: id++, country: 'South Africa', plan: 'Free', monthlyPayment: 0, activeMonths: 1 + Math.floor(Math.random() * 2) })
  }

  return rows
}

const DATA = generateData()

const SEGMENTS = (() => {
  const segs: { key: string; label: string; revenue: number }[] = []
  for (const country of COUNTRY_OPTIONS) {
    for (const plan of PLAN_OPTIONS) {
      const rows = DATA.filter(r => r.country === country && r.plan === plan)
      const revenue = rows.reduce((s, r) => s + r.monthlyPayment * r.activeMonths, 0)
      if (rows.length > 0) {
        segs.push({ key: `${country}-${plan}`, label: `${plan} ${country}`, revenue })
      }
    }
  }
  return segs.sort((a, b) => b.revenue - a.revenue)
})()

const INSIGHT_OPTIONS_EN = [
  'Premium India customers = highest revenue segment',
  'Free users in China are the largest group',
  'Basic Brazil customers have longest retention',
  'South Africa Premium has best unit economics',
  'Russia Basic customers are most profitable',
]

const INSIGHT_OPTIONS_RU = [
  'Premium-клиенты из Индии = самый доходный сегмент',
  'Бесплатные пользователи из Китая — самая большая группа',
  'Basic-клиенты из Бразилии дольше всех остаются',
  'Premium из ЮАР — лучшая юнит-экономика',
  'Basic-клиенты из России — самые прибыльные',
]

const COUNTRY_NAMES_RU: Record<string, string> = {
  'India': 'Индия',
  'Brazil': 'Бразилия',
  'Russia': 'Россия',
  'China': 'Китай',
  'South Africa': 'ЮАР',
}

const PLAN_NAMES_RU: Record<string, string> = {
  'Free': 'Бесплатный',
  'Basic': 'Базовый',
  'Premium': 'Премиум',
}

const INSIGHT_OPTIONS_AR = [
  'عملاء Premium في الهند = أعلى شريحة إيرادات',
  'المستخدمون المجانيون في الصين هم أكبر مجموعة',
  'عملاء Basic في البرازيل لديهم أطول فترة احتفاظ',
  'Premium في جنوب أفريقيا لديها أفضل اقتصاديات الوحدة',
  'عملاء Basic في روسيا هم الأكثر ربحية',
]

const COUNTRY_NAMES_AR: Record<string, string> = {
  'India': 'الهند',
  'Brazil': 'البرازيل',
  'Russia': 'روسيا',
  'China': 'الصين',
  'South Africa': 'جنوب أفريقيا',
}

const PLAN_NAMES_AR: Record<string, string> = {
  'Free': 'مجاني',
  'Basic': 'أساسي',
  'Premium': 'مميز',
}

const MARKETING_BUDGET = 10000

/* --- 2.5D Chart Canvas --- */

const CHART_CANVAS_W = 580
const CHART_CANVAS_H = 280

const CHART_3D_COLORS = [
  { top: '#3B82F6', side: '#2563EB', right: '#1D4ED8', glow: '#60A5FA' },
  { top: '#22C55E', side: '#16A34A', right: '#15803D', glow: '#4ADE80' },
  { top: '#F59E0B', side: '#D97706', right: '#B45309', glow: '#FCD34D' },
  { top: '#A855F7', side: '#9333EA', right: '#7E22CE', glow: '#C084FC' },
  { top: '#EF4444', side: '#DC2626', right: '#B91C1C', glow: '#F87171' },
  { top: '#06B6D4', side: '#0891B2', right: '#0E7490', glow: '#22D3EE' },
  { top: '#EC4899', side: '#DB2777', right: '#BE185D', glow: '#F472B6' },
]

interface AnimatedChartEntry {
  label: string
  value: number
  targetValue: number
}

interface DataParticle {
  x: number
  y: number
  vx: number
  vy: number
  opacity: number
  size: number
  color: string
}

function createDataParticles(count: number): DataParticle[] {
  const particles: DataParticle[] = []
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * CHART_CANVAS_W,
      y: Math.random() * CHART_CANVAS_H,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -0.2 - Math.random() * 0.5,
      opacity: 0.1 + Math.random() * 0.3,
      size: 1 + Math.random() * 2,
      color: CHART_3D_COLORS[Math.floor(Math.random() * CHART_3D_COLORS.length)].glow,
    })
  }
  return particles
}

// Draw the glowing grid background
function drawChartGrid(ctx: CanvasRenderingContext2D, time: number) {
  const gridSpacing = 30
  const glowIntensity = 0.04 + Math.sin(time * 0.5) * 0.02

  ctx.strokeStyle = `rgba(59, 130, 246, ${glowIntensity})`
  ctx.lineWidth = 1

  for (let x = 40; x < CHART_CANVAS_W - 20; x += gridSpacing) {
    ctx.beginPath()
    ctx.moveTo(x, 20)
    ctx.lineTo(x, CHART_CANVAS_H - 40)
    ctx.stroke()
  }
  for (let y = 20; y < CHART_CANVAS_H - 40; y += gridSpacing) {
    ctx.beginPath()
    ctx.moveTo(40, y)
    ctx.lineTo(CHART_CANVAS_W - 20, y)
    ctx.stroke()
  }

  // Brighter axis lines (embossed 3D style)
  // Y-axis
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(40, 20)
  ctx.lineTo(40, CHART_CANVAS_H - 40)
  ctx.stroke()

  // 3D emboss on Y-axis
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(41, 20)
  ctx.lineTo(41, CHART_CANVAS_H - 40)
  ctx.stroke()

  // X-axis
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(40, CHART_CANVAS_H - 40)
  ctx.lineTo(CHART_CANVAS_W - 20, CHART_CANVAS_H - 40)
  ctx.stroke()

  // 3D emboss on X-axis
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(40, CHART_CANVAS_H - 41)
  ctx.lineTo(CHART_CANVAS_W - 20, CHART_CANVAS_H - 41)
  ctx.stroke()
}

// Draw a 3D isometric bar
function draw3DBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  barWidth: number,
  barHeight: number,
  colorSet: typeof CHART_3D_COLORS[0],
  isHighlighted: boolean,
  time: number,
) {
  const depth = 10 // 3D depth offset
  const topY = baseY - barHeight

  if (barHeight < 1) return

  // Glow for highlighted
  if (isHighlighted) {
    ctx.shadowColor = colorSet.glow
    ctx.shadowBlur = 12 + Math.sin(time * 3) * 4
  }

  // Right side face
  ctx.fillStyle = colorSet.right
  ctx.beginPath()
  ctx.moveTo(x + barWidth, topY)
  ctx.lineTo(x + barWidth + depth, topY - depth * 0.6)
  ctx.lineTo(x + barWidth + depth, baseY - depth * 0.6)
  ctx.lineTo(x + barWidth, baseY)
  ctx.closePath()
  ctx.fill()

  // Top face
  ctx.fillStyle = isHighlighted
    ? colorSet.glow
    : colorSet.top
  ctx.beginPath()
  ctx.moveTo(x, topY)
  ctx.lineTo(x + depth, topY - depth * 0.6)
  ctx.lineTo(x + barWidth + depth, topY - depth * 0.6)
  ctx.lineTo(x + barWidth, topY)
  ctx.closePath()
  ctx.fill()

  // Front face
  ctx.fillStyle = colorSet.side
  ctx.fillRect(x, topY, barWidth, barHeight)

  // Front face border
  ctx.strokeStyle = isHighlighted
    ? `rgba(255,255,255,0.5)`
    : `rgba(255,255,255,0.1)`
  ctx.lineWidth = 1
  ctx.strokeRect(x, topY, barWidth, barHeight)

  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
}

// Draw a 3D pie chart with extrusion
function draw3DPie(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  data: AnimatedChartEntry[],
  time: number,
  highlightIndex: number,
) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const extrudeDepth = 14

  // Draw extruded sides first (bottom layers)
  let cumAngle = -Math.PI / 2
  data.forEach((d, i) => {
    const pct = d.value / total
    const startAngle = cumAngle
    const endAngle = cumAngle + pct * Math.PI * 2
    cumAngle = endAngle

    if (pct <= 0) return

    const colorSet = CHART_3D_COLORS[i % CHART_3D_COLORS.length]

    // Extrude: draw side strips
    ctx.fillStyle = colorSet.right
    ctx.beginPath()
    const steps = Math.max(2, Math.ceil(pct * 40))
    for (let s = 0; s <= steps; s++) {
      const a = startAngle + (endAngle - startAngle) * (s / steps)
      const x = centerX + Math.cos(a) * radius
      const y = centerY + Math.sin(a) * radius
      if (s === 0) ctx.moveTo(x, y + extrudeDepth)
      else ctx.lineTo(x, y + extrudeDepth)
    }
    for (let s = steps; s >= 0; s--) {
      const a = startAngle + (endAngle - startAngle) * (s / steps)
      const x = centerX + Math.cos(a) * radius
      const y = centerY + Math.sin(a) * radius
      ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fill()
  })

  // Draw top face
  cumAngle = -Math.PI / 2
  data.forEach((d, i) => {
    const pct = d.value / total
    const startAngle = cumAngle
    const endAngle = cumAngle + pct * Math.PI * 2
    cumAngle = endAngle

    if (pct <= 0) return

    const colorSet = CHART_3D_COLORS[i % CHART_3D_COLORS.length]
    const isHighlighted = i === highlightIndex

    if (isHighlighted) {
      ctx.shadowColor = colorSet.glow
      ctx.shadowBlur = 15 + Math.sin(time * 3) * 5
    }

    ctx.fillStyle = isHighlighted ? colorSet.glow : colorSet.top
    ctx.beginPath()
    ctx.moveTo(centerX, centerY)
    ctx.arc(centerX, centerY, radius, startAngle, endAngle)
    ctx.closePath()
    ctx.fill()

    ctx.strokeStyle = '#1E293B'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0

    // Label
    const midAngle = (startAngle + endAngle) / 2
    const labelR = radius + 18
    const lx = centerX + Math.cos(midAngle) * labelR
    const ly = centerY + Math.sin(midAngle) * labelR

    if (pct > 0.05) {
      ctx.fillStyle = isHighlighted ? '#FFFFFF' : 'rgba(255,255,255,0.7)'
      ctx.font = `bold 9px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(d.label, lx, ly)
    }
  })
}

// Draw 3D line chart
function draw3DLine(
  ctx: CanvasRenderingContext2D,
  data: AnimatedChartEntry[],
  chartLeft: number,
  chartRight: number,
  chartTop: number,
  chartBottom: number,
  maxVal: number,
  time: number,
  highlightIndex: number,
) {
  if (data.length < 2) return

  const chartW = chartRight - chartLeft
  const chartH = chartBottom - chartTop

  // Filled gradient area under line
  const points: Array<{ x: number; y: number }> = data.map((d, i) => ({
    x: chartLeft + (i / (data.length - 1)) * chartW,
    y: chartBottom - (d.value / maxVal) * chartH,
  }))

  // Gradient fill under line
  const grad = ctx.createLinearGradient(0, chartTop, 0, chartBottom)
  grad.addColorStop(0, 'rgba(245, 158, 11, 0.25)')
  grad.addColorStop(1, 'rgba(245, 158, 11, 0.02)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.moveTo(points[0].x, chartBottom)
  points.forEach(p => ctx.lineTo(p.x, p.y))
  ctx.lineTo(points[points.length - 1].x, chartBottom)
  ctx.closePath()
  ctx.fill()

  // Main line with glow
  ctx.shadowColor = '#F59E0B'
  ctx.shadowBlur = 8
  ctx.strokeStyle = '#F59E0B'
  ctx.lineWidth = 3
  ctx.beginPath()
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.shadowColor = 'transparent'

  // Data points
  points.forEach((p, i) => {
    const isHighlighted = i === highlightIndex
    const colorSet = CHART_3D_COLORS[i % CHART_3D_COLORS.length]
    const pulse = isHighlighted ? 4 + Math.sin(time * 3) * 2 : 0

    // Outer glow
    if (isHighlighted) {
      ctx.fillStyle = colorSet.glow
      ctx.globalAlpha = 0.3
      ctx.beginPath()
      ctx.arc(p.x, p.y, 8 + pulse, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }

    // Point
    ctx.fillStyle = isHighlighted ? colorSet.glow : '#F59E0B'
    ctx.beginPath()
    ctx.arc(p.x, p.y, isHighlighted ? 6 : 4, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = '#1E293B'
    ctx.lineWidth = 2
    ctx.stroke()

    // Value label
    ctx.fillStyle = isHighlighted ? '#FFFFFF' : 'rgba(255,255,255,0.7)'
    ctx.font = `bold 9px sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText(data[i].value.toLocaleString(), p.x, p.y - 12)
  })
}

interface Chart3DCanvasProps {
  chartType: 'bar' | 'pie' | 'line'
  data: Array<{ label: string; value: number }>
  maxValue: number
}

function Chart3DCanvas({ chartType, data, maxValue }: Chart3DCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const timeRef = useRef(0)
  const animRef = useRef(0)
  const particlesRef = useRef<DataParticle[]>(createDataParticles(15))

  // Animated values for smooth transitions
  const animDataRef = useRef<AnimatedChartEntry[]>([])
  const dataRef = useRef(data)
  const chartTypeRef = useRef(chartType)
  const maxValueRef = useRef(maxValue)

  dataRef.current = data
  chartTypeRef.current = chartType
  maxValueRef.current = maxValue

  // Highlight rotates every 2 seconds
  const highlightRef = useRef(0)

  useEffect(() => {
    let active = true

    const loop = () => {
      if (!active) return
      const ctx = ctxRef.current
      if (ctx) {
        timeRef.current += 0.016
        const time = timeRef.current

        // Rotate highlight
        const currentData = dataRef.current
        if (currentData.length > 0) {
          highlightRef.current = Math.floor(time / 2) % currentData.length
        }

        // Animate data values (smooth transitions)
        const targetEntries = currentData.map(d => ({
          label: d.label,
          value: d.value,
          targetValue: d.value,
        }))

        // Initialize or update animated entries
        if (animDataRef.current.length !== targetEntries.length) {
          animDataRef.current = targetEntries.map(e => ({ ...e, value: 0 }))
        }
        for (let i = 0; i < animDataRef.current.length; i++) {
          if (i < targetEntries.length) {
            animDataRef.current[i].targetValue = targetEntries[i].targetValue
            animDataRef.current[i].label = targetEntries[i].label
            // Lerp toward target
            animDataRef.current[i].value +=
              (animDataRef.current[i].targetValue - animDataRef.current[i].value) * 0.08
          }
        }

        const curMaxVal = maxValueRef.current
        const curType = chartTypeRef.current
        const animData = animDataRef.current

        // Clear
        ctx.clearRect(0, 0, CHART_CANVAS_W, CHART_CANVAS_H)

        // Background
        const bgGrad = ctx.createLinearGradient(0, 0, 0, CHART_CANVAS_H)
        bgGrad.addColorStop(0, '#0F172A')
        bgGrad.addColorStop(1, '#1E293B')
        ctx.fillStyle = bgGrad
        ctx.fillRect(0, 0, CHART_CANVAS_W, CHART_CANVAS_H)

        // Grid
        drawChartGrid(ctx, time)

        const chartLeft = 55
        const chartRight = CHART_CANVAS_W - 30
        const chartTop = 30
        const chartBottom = CHART_CANVAS_H - 50

        if (curType === 'bar' && animData.length > 0) {
          const barAreaW = chartRight - chartLeft
          const gap = 12
          const barWidth = Math.max(10, (barAreaW - gap * (animData.length + 1)) / animData.length)

          animData.forEach((d, i) => {
            const x = chartLeft + gap + i * (barWidth + gap)
            const barHeight = (d.value / (curMaxVal || 1)) * (chartBottom - chartTop)
            const colorSet = CHART_3D_COLORS[i % CHART_3D_COLORS.length]

            draw3DBar(ctx, x, chartBottom, barWidth, barHeight, colorSet, i === highlightRef.current, time)

            // Label below
            ctx.fillStyle = i === highlightRef.current ? '#FFFFFF' : 'rgba(255,255,255,0.6)'
            ctx.font = 'bold 9px sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText(d.label, x + barWidth / 2, chartBottom + 15)

            // Value on top
            ctx.fillStyle = i === highlightRef.current ? '#FFFFFF' : 'rgba(255,255,255,0.7)'
            ctx.fillText(Math.round(d.value).toLocaleString(), x + barWidth / 2, chartBottom - barHeight - 8)
          })

          // Y-axis scale labels
          ctx.fillStyle = 'rgba(148, 163, 184, 0.5)'
          ctx.font = '8px sans-serif'
          ctx.textAlign = 'right'
          for (let i = 0; i <= 4; i++) {
            const val = Math.round((curMaxVal / 4) * i)
            const y = chartBottom - (i / 4) * (chartBottom - chartTop)
            ctx.fillText(val.toLocaleString(), chartLeft - 5, y + 3)
          }
        } else if (curType === 'pie' && animData.length > 0) {
          const pieRadius = Math.min(CHART_CANVAS_W, CHART_CANVAS_H) * 0.3
          draw3DPie(ctx, CHART_CANVAS_W / 2 - 40, CHART_CANVAS_H / 2, pieRadius, animData, time, highlightRef.current)
        } else if (curType === 'line' && animData.length > 0) {
          draw3DLine(ctx, animData, chartLeft, chartRight, chartTop, chartBottom, curMaxVal || 1, time, highlightRef.current)

          // X-axis labels
          animData.forEach((d, i) => {
            const x = chartLeft + (i / Math.max(animData.length - 1, 1)) * (chartRight - chartLeft)
            ctx.fillStyle = i === highlightRef.current ? '#FFFFFF' : 'rgba(255,255,255,0.6)'
            ctx.font = 'bold 9px sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText(d.label, x, chartBottom + 15)
          })
        }

        // Ambient data particles
        const particles = particlesRef.current
        for (const p of particles) {
          p.x += p.vx
          p.y += p.vy
          if (p.y < -5) {
            p.y = CHART_CANVAS_H + 5
            p.x = Math.random() * CHART_CANVAS_W
          }
          if (p.x < -5 || p.x > CHART_CANVAS_W + 5) {
            p.x = Math.random() * CHART_CANVAS_W
          }
          ctx.globalAlpha = p.opacity * (0.5 + Math.sin(time * 2 + p.x) * 0.5)
          ctx.fillStyle = p.color
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1
      }
      animRef.current = requestAnimationFrame(loop)
    }

    animRef.current = requestAnimationFrame(loop)

    return () => {
      active = false
      cancelAnimationFrame(animRef.current)
    }
  }, [])

  const canvasReady = useCallback((canvas: HTMLCanvasElement | null) => {
    ctxRef.current = null
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvasRef.current = canvas
    ctxRef.current = ctx
  }, [])

  return (
    <canvas
      ref={canvasReady}
      width={CHART_CANVAS_W}
      height={CHART_CANVAS_H}
      className="block w-full rounded-xl"
      style={{ maxWidth: CHART_CANVAS_W }}
    />
  )
}

/* --- Component --- */

export default function EntrepreneurMission8({ userId, onComplete }: EntrepreneurMission8Props) {
  const locale = useLocale()
  const t = (ru: string, ar: string, en: string) => locale === 'ru' ? ru : locale === 'ar' ? ar : en
  const INSIGHT_OPTIONS = locale === 'ru' ? INSIGHT_OPTIONS_RU : locale === 'ar' ? INSIGHT_OPTIONS_AR : INSIGHT_OPTIONS_EN
  const [phase, setPhase] = useState<'intro' | 'analysis' | 'insight' | 'budget' | 'done'>('intro')

  // Filters
  const [countryFilters, setCountryFilters] = useState<Set<string>>(new Set(COUNTRY_OPTIONS))
  const [planFilters, setPlanFilters] = useState<Set<string>>(new Set(PLAN_OPTIONS))
  const [filtersUsedCount, setFiltersUsedCount] = useState(0)

  // Chart config
  const [xAxis, setXAxis] = useState<'country' | 'plan'>('country')
  const [yAxis, setYAxis] = useState<'revenue' | 'customers' | 'avg_payment'>('revenue')
  const [chartType, setChartType] = useState<ChartType>('bar')

  // Insight
  const [selectedInsight, setSelectedInsight] = useState<number | null>(null)

  // Budget allocation
  const [budgetSliders, setBudgetSliders] = useState<Record<string, number>>(
    Object.fromEntries(SEGMENTS.slice(0, 5).map(s => [s.key, MARKETING_BUDGET / 5]))
  )

  // Data table page
  const [tablePage, setTablePage] = useState(0)
  const ROWS_PER_PAGE = 15

  const filteredData = useMemo(() => {
    return DATA.filter(r => countryFilters.has(r.country) && planFilters.has(r.plan))
  }, [countryFilters, planFilters])

  const translateCountry = useCallback((name: string) => locale === 'ru' ? (COUNTRY_NAMES_RU[name] || name) : locale === 'ar' ? (COUNTRY_NAMES_AR[name] || name) : name, [locale])
  const translatePlan = useCallback((name: string) => locale === 'ru' ? (PLAN_NAMES_RU[name] || name) : locale === 'ar' ? (PLAN_NAMES_AR[name] || name) : name, [locale])

  const chartData = useMemo(() => {
    const groups: Record<string, { label: string; value: number; count: number }> = {}

    for (const row of filteredData) {
      const key = xAxis === 'country' ? row.country : row.plan
      const label = xAxis === 'country' ? translateCountry(key) : translatePlan(key)
      if (!groups[key]) groups[key] = { label, value: 0, count: 0 }
      groups[key].count++
      if (yAxis === 'revenue') {
        groups[key].value += row.monthlyPayment * row.activeMonths
      } else if (yAxis === 'customers') {
        groups[key].value++
      } else {
        groups[key].value += row.monthlyPayment
      }
    }

    if (yAxis === 'avg_payment') {
      for (const g of Object.values(groups)) {
        g.value = g.count > 0 ? Math.round(g.value / g.count) : 0
      }
    }

    return Object.values(groups)
  }, [filteredData, xAxis, yAxis])

  const maxChartValue = useMemo(() => Math.max(1, ...chartData.map(d => d.value)), [chartData])

  const totalBudgetUsed = useMemo(() => Object.values(budgetSliders).reduce((s, v) => s + v, 0), [budgetSliders])

  const toggleCountry = useCallback((c: string) => {
    setCountryFilters(prev => {
      const next = new Set(prev)
      if (next.has(c)) next.delete(c)
      else next.add(c)
      return next
    })
    setFiltersUsedCount(p => p + 1)
  }, [])

  const togglePlan = useCallback((p: string) => {
    setPlanFilters(prev => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p)
      else next.add(p)
      return next
    })
    setFiltersUsedCount(p => p + 1)
  }, [])

  const handleSubmitInsight = useCallback(() => {
    if (selectedInsight !== null) {
      setPhase('budget')
    }
  }, [selectedInsight])

  const handleFinish = useCallback(() => {
    // Scoring
    // correct_insight: 500 if selected index 0 (Premium India = highest revenue)
    const insightScore = selectedInsight === 0 ? 500 : 100

    // budget_allocation: 350 based on proportional allocation to segment value
    // Best: allocate most budget to highest-revenue segments
    const topSegments = SEGMENTS.slice(0, 5)
    const totalSegRevenue = topSegments.reduce((s, seg) => s + seg.revenue, 0)
    let allocationScore = 0
    for (const seg of topSegments) {
      const idealShare = seg.revenue / totalSegRevenue
      const actualShare = (budgetSliders[seg.key] || 0) / Math.max(1, totalBudgetUsed)
      const diff = Math.abs(idealShare - actualShare)
      allocationScore += Math.max(0, 1 - diff * 3)
    }
    allocationScore = Math.round((allocationScore / topSegments.length) * 350)

    // analysis_depth: 150 based on filters used
    const depthScore = filtersUsedCount >= 6 ? 150 : filtersUsedCount >= 3 ? 100 : filtersUsedCount >= 1 ? 50 : 0

    const totalScore = Math.min(1000, insightScore + allocationScore + depthScore)

    setPhase('done')
    onComplete?.(totalScore, [
      { label: t('Правильный инсайт', 'الرؤية الصحيحة', 'Correct Insight'), value: insightScore, max: 500 },
      { label: t('Распределение бюджета', 'توزيع الميزانية', 'Budget Allocation'), value: allocationScore, max: 350 },
      { label: t('Глубина анализа', 'عمق التحليل', 'Analysis Depth'), value: depthScore, max: 150 },
    ])
  }, [selectedInsight, budgetSliders, totalBudgetUsed, filtersUsedCount, onComplete])

  /* --- Render: Intro --- */
  if (phase === 'intro') {
    return (
      <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl p-8 max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">{'\u{1F4CA}'}</div>
          <h2 className="text-2xl font-black text-white mb-3">{locale === 'ru' ? 'Решения на данных' : locale === 'ar' ? 'قرارات مبنية على البيانات' : 'Data-Driven'}</h2>
          <p className="text-gray-300 leading-relaxed mb-4">
            {locale === 'ru'
              ? <>У тебя данные по <span className="text-amber-400 font-bold">10 000 клиентов</span> (показано 100 строк). Проанализируй их, найди <span className="text-green-400 font-bold">самый ценный сегмент</span> и грамотно распредели маркетинговый бюджет.</>
              : locale === 'ar'
              ? <>لديك بيانات من <span className="text-amber-400 font-bold">10,000 عميل</span> (100 صف عينة معروض). حللها للعثور على <span className="text-green-400 font-bold">أقيم شريحة عملاء</span> ووزع ميزانيتك التسويقية بحكمة.</>
              : <>You have data from <span className="text-amber-400 font-bold">10,000 customers</span> (100 sample rows shown). Analyze it to find the <span className="text-green-400 font-bold">most valuable customer segment</span> and allocate your marketing budget wisely.</>
            }
          </p>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-4 mb-6 space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">{t('Твои задачи', 'مهامك', 'Your Tasks')}</h3>
          <div className="flex items-start gap-3 text-sm">
            <span className="text-blue-400 text-lg">{'\u{1F50D}'}</span>
            <p className="text-gray-300">
              {locale === 'ru'
                ? <>Используй <span className="text-blue-400 font-bold">фильтры</span> и <span className="text-blue-400 font-bold">графики</span>, чтобы изучить данные. Посмотри на выручку по странам и тарифам.</>
                : locale === 'ar'
                ? <>استخدم <span className="text-blue-400 font-bold">الفلاتر</span> و<span className="text-blue-400 font-bold">الرسوم البيانية</span> لاستكشاف البيانات. انظر إلى الإيرادات حسب البلد ونوع الخطة.</>
                : <>Use <span className="text-blue-400 font-bold">filters</span> and <span className="text-blue-400 font-bold">charts</span> to explore the data. Look at revenue by country and plan type.</>
              }
            </p>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <span className="text-green-400 text-lg">{'\u{1F4A1}'}</span>
            <p className="text-gray-300">
              {locale === 'ru'
                ? <>Найди <span className="text-green-400 font-bold">ключевой инсайт</span> — какой сегмент клиентов приносит больше всего выручки?</>
                : locale === 'ar'
                ? <>حدد <span className="text-green-400 font-bold">الرؤية الرئيسية</span> — أي شريحة عملاء تولد أكبر إيرادات؟</>
                : <>Identify the <span className="text-green-400 font-bold">key insight</span> -- which customer segment generates the most revenue?</>
              }
            </p>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <span className="text-amber-400 text-lg">{'\u{1F4B0}'}</span>
            <p className="text-gray-300">
              {locale === 'ru'
                ? <>Распредели <span className="text-amber-400 font-bold">маркетинговый бюджет $10 000</span> по сегментам пропорционально их ценности.</>
                : locale === 'ar'
                ? <>وزّع <span className="text-amber-400 font-bold">ميزانية التسويق $10,000</span> على الشرائح بما يتناسب مع قيمتها.</>
                : <>Allocate <span className="text-amber-400 font-bold">$10,000 marketing budget</span> across segments proportional to their value.</>
              }
            </p>
          </div>
        </div>

        <button
          onClick={() => setPhase('analysis')}
          className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-lg rounded-xl transition-colors"
        >
          {'\u{1F4CA}'} {t('Открыть аналитику', 'فتح لوحة التحليلات', 'Open Analytics Dashboard')}
        </button>
      </div>
    )
  }

  /* --- Render: Done --- */
  if (phase === 'done') {
    return (
      <div className="bg-[var(--brand-panel)] border border-green-500/40 rounded-2xl p-8 text-center">
        <div className="text-6xl mb-4">{selectedInsight === 0 ? '\u{1F4CA}' : '\u{1F914}'}</div>
        <p className={`text-lg font-bold ${selectedInsight === 0 ? 'text-green-400' : 'text-yellow-400'}`}>
          {selectedInsight === 0
            ? t('Верно! Premium-клиенты из Индии — самый доходный сегмент.', 'صحيح! عملاء Premium في الهند هم أعلى شريحة إيرادات.', 'Correct! Premium India customers are the highest-revenue segment.')
            : t('Не совсем верно. Данные показывают, что Premium-клиенты из Индии приносят больше всего выручки.', 'ليست الرؤية الصحيحة تماماً. البيانات تُظهر أن عملاء Premium في الهند يولدون أكبر إيرادات.', 'Not quite the right insight. The data shows Premium India customers generate the most revenue.')}
        </p>
        <p className="text-gray-400 text-sm mt-2">{t('Проверь результаты выше.', 'تحقق من النتائج أعلاه.', 'Check your results above.')}</p>
      </div>
    )
  }

  /* --- Render: Budget Allocation --- */
  if (phase === 'budget') {
    const topSegments = SEGMENTS.slice(0, 5)
    return (
      <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700">
          <span className="text-xs text-gray-400 font-bold">{t('Миссия 8: Распределение бюджета', 'المهمة 8: توزيع الميزانية', 'Mission 8: Budget Allocation')}</span>
          <span className={`text-xs font-bold ${Math.abs(totalBudgetUsed - MARKETING_BUDGET) <= 100 ? 'text-green-400' : 'text-yellow-400'}`}>
            ${totalBudgetUsed.toLocaleString()} / ${MARKETING_BUDGET.toLocaleString()}
          </span>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-blue-950/40 border border-blue-800/50 rounded-xl p-3">
            <p className="text-sm text-gray-300">
              {t('Твой инсайт', 'رؤيتك', 'Your insight')}: <span className="font-bold text-white">{INSIGHT_OPTIONS[selectedInsight!]}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {t('Теперь распредели маркетинговый бюджет $10K по топ-5 сегментам.', 'الآن وزّع ميزانية التسويق $10K على أفضل 5 شرائح.', 'Now allocate the $10K marketing budget across the top 5 segments.')}
            </p>
          </div>

          {topSegments.map((seg, i) => (
            <div key={seg.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-gray-300">{seg.label}</span>
                <span className="text-sm font-black text-white">${(budgetSliders[seg.key] || 0).toLocaleString()}</span>
              </div>
              <div className="text-[10px] text-gray-500 mb-1">{t('Выручка', 'الإيرادات', 'Revenue')}: ${seg.revenue.toLocaleString()}</div>
              <input
                type="range"
                min={0}
                max={MARKETING_BUDGET}
                step={100}
                value={budgetSliders[seg.key] || 0}
                onChange={(e) => {
                  setBudgetSliders(prev => ({ ...prev, [seg.key]: Number(e.target.value) }))
                }}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          ))}

          <button
            onClick={handleFinish}
            className="w-full px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors"
          >
            {t('Отправить бюджет', 'تقديم خطة الميزانية', 'Submit Budget Plan')} {'\u{1F4B0}'}
          </button>
        </div>
      </div>
    )
  }

  /* --- Render: Insight Selection --- */
  if (phase === 'insight') {
    return (
      <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl overflow-hidden">
        <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
          <span className="text-xs text-gray-400 font-bold">{t('Миссия 8: Ключевой инсайт', 'المهمة 8: الرؤية الرئيسية', 'Mission 8: Key Insight')}</span>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-amber-950/40 border border-amber-800/50 rounded-xl p-3">
            <p className="text-sm text-gray-300">
              {locale === 'ru'
                ? <>На основе анализа, какой <span className="font-bold text-amber-400">ключевой инсайт</span>?</>
                : locale === 'ar'
                ? <>بناءً على تحليلك، ما هي <span className="font-bold text-amber-400">الرؤية الرئيسية</span>؟</>
                : <>Based on your analysis, what is the <span className="font-bold text-amber-400">key insight</span>?</>
              }
            </p>
          </div>

          <div className="space-y-2">
            {INSIGHT_OPTIONS.map((opt, i) => (
              <button
                key={i}
                onClick={() => setSelectedInsight(i)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all text-sm ${
                  selectedInsight === i
                    ? 'border-amber-500 bg-amber-900/20 text-white'
                    : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-500'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setPhase('analysis')}
              className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-colors"
            >
              {t('Назад к данным', 'العودة للبيانات', 'Back to Data')}
            </button>
            <button
              onClick={handleSubmitInsight}
              disabled={selectedInsight === null}
              className={`flex-1 px-4 py-3 font-bold rounded-xl transition-colors ${
                selectedInsight !== null
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {t('Отправить инсайт', 'تقديم الرؤية', 'Submit Insight')} {'\u{1F4A1}'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* --- Render: Analysis Dashboard --- */
  const pagedData = filteredData.slice(tablePage * ROWS_PER_PAGE, (tablePage + 1) * ROWS_PER_PAGE)
  const totalPages = Math.ceil(filteredData.length / ROWS_PER_PAGE)

  return (
    <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700">
        <span className="text-xs text-gray-400 font-bold">{t('Миссия 8: Аналитика', 'المهمة 8: لوحة التحليلات', 'Mission 8: Analytics Dashboard')}</span>
        <span className="text-xs text-gray-500">{filteredData.length} {t('строк', 'صفوف', 'rows')}</span>
      </div>

      <div className="p-4 space-y-4">
        {/* Filters */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-3">
          <div className="text-[10px] text-gray-500 font-bold mb-2">{t('ФИЛЬТРЫ', 'الفلاتر', 'FILTERS')}</div>
          <div className="flex flex-wrap gap-4">
            <div>
              <div className="text-[10px] text-gray-400 mb-1">{t('Страна', 'البلد', 'Country')}</div>
              <div className="flex flex-wrap gap-1">
                {COUNTRY_OPTIONS.map(c => (
                  <button
                    key={c}
                    onClick={() => toggleCountry(c)}
                    className={`px-2 py-1 text-[10px] rounded font-bold transition-colors ${
                      countryFilters.has(c) ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {translateCountry(c)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-gray-400 mb-1">{t('Тариф', 'الخطة', 'Plan')}</div>
              <div className="flex gap-1">
                {PLAN_OPTIONS.map(p => (
                  <button
                    key={p}
                    onClick={() => togglePlan(p)}
                    className={`px-2 py-1 text-[10px] rounded font-bold transition-colors ${
                      planFilters.has(p) ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {translatePlan(p)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Chart builder controls */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-3">
          <div className="text-[10px] text-gray-500 font-bold mb-2">{t('ПОСТРОИТЕЛЬ ГРАФИКОВ', 'منشئ الرسوم البيانية', 'CHART BUILDER')}</div>
          <div className="flex flex-wrap gap-4">
            <div>
              <div className="text-[10px] text-gray-400 mb-1">{t('Ось X', 'المحور X', 'X-Axis')}</div>
              <div className="flex gap-1">
                {(['country', 'plan'] as const).map(opt => (
                  <button
                    key={opt}
                    onClick={() => setXAxis(opt)}
                    className={`px-2 py-1 text-[10px] rounded font-bold transition-colors ${
                      xAxis === opt ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {opt === 'country' ? t('Страна', 'البلد', 'Country') : t('Тариф', 'الخطة', 'Plan')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-gray-400 mb-1">{t('Ось Y', 'المحور Y', 'Y-Axis')}</div>
              <div className="flex gap-1">
                {([['revenue', t('Выручка', 'Revenue')], ['customers', t('Клиенты', 'العملاء', 'Customers')], ['avg_payment', t('Ср. платёж', 'متوسط الدفع', 'Avg Payment')]] as [string, string][]).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setYAxis(val as typeof yAxis)}
                    className={`px-2 py-1 text-[10px] rounded font-bold transition-colors ${
                      yAxis === val ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-gray-400 mb-1">{t('Тип графика', 'نوع الرسم البياني', 'Chart Type')}</div>
              <div className="flex gap-1">
                {([['bar', t('Столбцы', 'أعمدة', 'Bar')], ['pie', t('Круговой', 'دائري', 'Pie')], ['line', t('Линия', 'خطي', 'Line')]] as [string, string][]).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setChartType(val as ChartType)}
                    className={`px-2 py-1 text-[10px] rounded font-bold transition-colors ${
                      chartType === val ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 2.5D Chart Canvas */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-3">
          <Chart3DCanvas
            chartType={chartType}
            data={chartData}
            maxValue={maxChartValue}
          />
        </div>

        {/* Data table */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-xl overflow-hidden">
          <div className="text-[10px] text-gray-500 font-bold px-3 py-2 border-b border-gray-700">
            {t('ТАБЛИЦА ДАННЫХ', 'جدول البيانات', 'DATA TABLE')} ({t('Стр.', 'صفحة', 'Page')} {tablePage + 1}/{totalPages})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-gray-500 border-b border-gray-700">
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">{t('Страна', 'البلد', 'Country')}</th>
                  <th className="px-3 py-2 text-left">{t('Тариф', 'الخطة', 'Plan')}</th>
                  <th className="px-3 py-2 text-right">{t('$/мес', '$/شهر', '$/mo')}</th>
                  <th className="px-3 py-2 text-right">{t('Месяцы', 'الأشهر', 'Months')}</th>
                  <th className="px-3 py-2 text-right">{t('Итого $', 'الإجمالي $', 'Total $')}</th>
                </tr>
              </thead>
              <tbody>
                {pagedData.map(r => (
                  <tr key={r.id} className="border-b border-gray-800 text-gray-300">
                    <td className="px-3 py-1.5">{r.id}</td>
                    <td className="px-3 py-1.5">{translateCountry(r.country)}</td>
                    <td className="px-3 py-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        r.plan === 'Premium' ? 'bg-purple-900/50 text-purple-300'
                        : r.plan === 'Basic' ? 'bg-blue-900/50 text-blue-300'
                        : 'bg-gray-700 text-gray-400'
                      }`}>
                        {translatePlan(r.plan)}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-right">${r.monthlyPayment}</td>
                    <td className="px-3 py-1.5 text-right">{r.activeMonths}</td>
                    <td className="px-3 py-1.5 text-right font-bold">${(r.monthlyPayment * r.activeMonths).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-3 py-2 border-t border-gray-700">
            <button
              onClick={() => setTablePage(p => Math.max(0, p - 1))}
              disabled={tablePage === 0}
              className="text-[10px] text-gray-400 hover:text-white disabled:opacity-30"
            >
              {t('Назад', 'السابق', 'Prev')}
            </button>
            <button
              onClick={() => setTablePage(p => Math.min(totalPages - 1, p + 1))}
              disabled={tablePage >= totalPages - 1}
              className="text-[10px] text-gray-400 hover:text-white disabled:opacity-30"
            >
              {t('Далее', 'التالي', 'Next')}
            </button>
          </div>
        </div>

        {/* Submit insight button */}
        <button
          onClick={() => setPhase('insight')}
          className="w-full px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors"
        >
          {t('Я нашёл ключевой инсайт', 'وجدت الرؤية الرئيسية', 'I Found the Key Insight')} {'\u{1F4A1}'}
        </button>
      </div>
    </div>
  )
}
