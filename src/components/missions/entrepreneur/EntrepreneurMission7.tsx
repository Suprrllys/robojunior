'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useLocale } from 'next-intl'
import Image from 'next/image'

/* --- Country Flag Component using flagcdn.com --- */

const COUNTRY_FLAG_CODES: Record<string, string> = {
  russia: 'ru',
  india: 'in',
  brazil: 'br',
  china: 'cn',
  south_africa: 'za',
}

const FLAG_SIZES = {
  sm: { width: 20, height: 14 },
  md: { width: 30, height: 21 },
  lg: { width: 40, height: 28 },
} as const

function CountryFlag({ countryId, size = 'md' }: { countryId: string; size?: 'sm' | 'md' | 'lg' }) {
  const flagCode = COUNTRY_FLAG_CODES[countryId]
  const { width, height } = FLAG_SIZES[size]

  if (!flagCode) {
    return (
      <span
        className="bg-gray-600 rounded-sm flex items-center justify-center text-gray-400 flex-shrink-0"
        style={{ width, height, fontSize: Math.max(8, width * 0.35) }}
      >
        ?
      </span>
    )
  }

  return (
    <Image
      src={`https://flagcdn.com/w40/${flagCode}.png`}
      alt={countryId}
      width={width}
      height={height}
      className="rounded-sm object-cover flex-shrink-0"
      unoptimized
    />
  )
}

/* --- 2.5D World Map Canvas --- */

const MAP_W = 600
const MAP_H = 200

// Simplified region block positions (isometric-ish placement on a world map feel)
// Each region: centerX, centerY, width, height, color
interface RegionBlock {
  id: string
  label: string
  cx: number
  cy: number
  w: number
  h: number
  color: string
  glowColor: string
}

const REGION_BLOCKS: RegionBlock[] = [
  { id: 'russia', label: 'RU', cx: 370, cy: 45, w: 80, h: 32, color: '#3B82F6', glowColor: '#60A5FA' },
  { id: 'india', label: 'IN', cx: 380, cy: 100, w: 50, h: 28, color: '#F97316', glowColor: '#FB923C' },
  { id: 'brazil', label: 'BR', cx: 180, cy: 120, w: 55, h: 30, color: '#22C55E', glowColor: '#4ADE80' },
  { id: 'china', label: 'CN', cx: 440, cy: 75, w: 60, h: 30, color: '#EF4444', glowColor: '#F87171' },
  { id: 'south_africa', label: 'ZA', cx: 320, cy: 145, w: 40, h: 24, color: '#EAB308', glowColor: '#FACC15' },
]

const HOME_BASE = { x: 290, y: 60 } // "HQ" position

interface CloudParticle {
  x: number
  y: number
  w: number
  h: number
  speed: number
  opacity: number
}

interface ConnectionDot {
  x: number
  y: number
  phase: number
  speed: number
}

function createClouds(): CloudParticle[] {
  const clouds: CloudParticle[] = []
  for (let i = 0; i < 8; i++) {
    clouds.push({
      x: Math.random() * MAP_W,
      y: 10 + Math.random() * (MAP_H - 40),
      w: 30 + Math.random() * 50,
      h: 10 + Math.random() * 12,
      speed: 0.15 + Math.random() * 0.3,
      opacity: 0.06 + Math.random() * 0.08,
    })
  }
  return clouds
}

// Draw an isometric-style 3D block for a region
function drawRegionBlock(
  ctx: CanvasRenderingContext2D,
  region: RegionBlock,
  isSelected: boolean,
  time: number,
  parallaxShift: number,
) {
  const depth = 8
  const cx = region.cx + parallaxShift * 0.5
  const cy = region.cy
  const hw = region.w / 2
  const hh = region.h / 2

  // Glow effect when selected
  if (isSelected) {
    const glowSize = 12 + Math.sin(time * 3) * 4
    ctx.shadowColor = region.glowColor
    ctx.shadowBlur = glowSize
  }

  // Side face (bottom-right)
  ctx.fillStyle = isSelected
    ? adjustBrightness(region.color, -40)
    : adjustBrightness(region.color, -60)
  ctx.beginPath()
  ctx.moveTo(cx - hw, cy + hh)
  ctx.lineTo(cx + hw, cy + hh)
  ctx.lineTo(cx + hw, cy + hh + depth)
  ctx.lineTo(cx - hw, cy + hh + depth)
  ctx.closePath()
  ctx.fill()

  // Side face (right)
  ctx.fillStyle = isSelected
    ? adjustBrightness(region.color, -25)
    : adjustBrightness(region.color, -45)
  ctx.beginPath()
  ctx.moveTo(cx + hw, cy - hh)
  ctx.lineTo(cx + hw, cy + hh)
  ctx.lineTo(cx + hw, cy + hh + depth)
  ctx.lineTo(cx + hw, cy - hh + depth)
  ctx.closePath()
  ctx.fill()

  // Top face
  ctx.fillStyle = isSelected ? region.color : adjustBrightness(region.color, -20)
  ctx.fillRect(cx - hw, cy - hh, region.w, region.h)

  // Border
  ctx.strokeStyle = isSelected ? region.glowColor : 'rgba(255,255,255,0.15)'
  ctx.lineWidth = isSelected ? 2 : 1
  ctx.strokeRect(cx - hw, cy - hh, region.w, region.h)

  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0

  // Label
  ctx.fillStyle = isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.7)'
  ctx.font = `bold ${isSelected ? '11px' : '9px'} sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(region.label, cx, cy)
}

function adjustBrightness(hex: string, amount: number): string {
  const r = Math.max(0, Math.min(255, parseInt(hex.slice(1, 3), 16) + amount))
  const g = Math.max(0, Math.min(255, parseInt(hex.slice(3, 5), 16) + amount))
  const b = Math.max(0, Math.min(255, parseInt(hex.slice(5, 7), 16) + amount))
  return `rgb(${r},${g},${b})`
}

function drawAirplaneRoute(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  progress: number,
  color: string,
) {
  // Curved route line
  const cpX = (fromX + toX) / 2
  const cpY = Math.min(fromY, toY) - 30

  // Draw dashed route
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.setLineDash([4, 4])
  ctx.globalAlpha = 0.5
  ctx.beginPath()
  ctx.moveTo(fromX, fromY)
  ctx.quadraticCurveTo(cpX, cpY, toX, toY)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.globalAlpha = 1

  // Airplane icon along the curve
  const t = (progress % 1)
  const ax = (1 - t) * (1 - t) * fromX + 2 * (1 - t) * t * cpX + t * t * toX
  const ay = (1 - t) * (1 - t) * fromY + 2 * (1 - t) * t * cpY + t * t * toY

  // Small airplane triangle
  ctx.fillStyle = '#FFFFFF'
  ctx.beginPath()
  const angle = Math.atan2(toY - fromY, toX - fromX)
  ctx.moveTo(ax + Math.cos(angle) * 6, ay + Math.sin(angle) * 6)
  ctx.lineTo(ax + Math.cos(angle + 2.5) * 4, ay + Math.sin(angle + 2.5) * 4)
  ctx.lineTo(ax + Math.cos(angle - 2.5) * 4, ay + Math.sin(angle - 2.5) * 4)
  ctx.closePath()
  ctx.fill()
}

function drawCloud(ctx: CanvasRenderingContext2D, cloud: CloudParticle) {
  ctx.globalAlpha = cloud.opacity
  ctx.fillStyle = '#FFFFFF'
  // Simple oval cloud
  ctx.beginPath()
  ctx.ellipse(cloud.x, cloud.y, cloud.w / 2, cloud.h / 2, 0, 0, Math.PI * 2)
  ctx.fill()
  // Smaller bumps
  ctx.beginPath()
  ctx.ellipse(cloud.x - cloud.w * 0.25, cloud.y - cloud.h * 0.2, cloud.w * 0.3, cloud.h * 0.4, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(cloud.x + cloud.w * 0.2, cloud.y - cloud.h * 0.15, cloud.w * 0.25, cloud.h * 0.35, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
}

function drawConnectionDot(ctx: CanvasRenderingContext2D, dot: ConnectionDot, time: number, color: string) {
  const pulse = 0.5 + Math.sin(time * dot.speed + dot.phase) * 0.5
  const radius = 3 + pulse * 3
  ctx.globalAlpha = 0.3 + pulse * 0.7
  ctx.fillStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = 8 + pulse * 6
  ctx.beginPath()
  ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.globalAlpha = 1
}

function drawHomeBase(ctx: CanvasRenderingContext2D, time: number) {
  const pulse = Math.sin(time * 2) * 0.3 + 0.7
  ctx.fillStyle = `rgba(251, 191, 36, ${pulse})`
  ctx.shadowColor = '#FBBF24'
  ctx.shadowBlur = 10
  ctx.beginPath()
  ctx.arc(HOME_BASE.x, HOME_BASE.y, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.shadowColor = 'transparent'

  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.font = 'bold 8px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('HQ', HOME_BASE.x, HOME_BASE.y - 10)
}

// Grid background for map
function drawMapGrid(ctx: CanvasRenderingContext2D, time: number) {
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.06)'
  ctx.lineWidth = 1

  // Horizontal lines
  for (let y = 0; y < MAP_H; y += 20) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(MAP_W, y)
    ctx.stroke()
  }
  // Vertical lines with subtle parallax
  const shift = (Math.sin(time * 0.2) * 3)
  for (let x = 0; x < MAP_W + 20; x += 20) {
    ctx.beginPath()
    ctx.moveTo(x + shift, 0)
    ctx.lineTo(x + shift, MAP_H)
    ctx.stroke()
  }
}

// Continent outlines (simplified blocks to give a map feel)
function drawContinentShapes(ctx: CanvasRenderingContext2D, parallaxShift: number) {
  ctx.fillStyle = 'rgba(100, 116, 139, 0.12)'

  // North America shape
  ctx.beginPath()
  ctx.moveTo(60 + parallaxShift, 30)
  ctx.lineTo(140 + parallaxShift, 25)
  ctx.lineTo(150 + parallaxShift, 60)
  ctx.lineTo(130 + parallaxShift, 90)
  ctx.lineTo(80 + parallaxShift, 85)
  ctx.lineTo(50 + parallaxShift, 50)
  ctx.closePath()
  ctx.fill()

  // South America
  ctx.beginPath()
  ctx.moveTo(150 + parallaxShift, 95)
  ctx.lineTo(200 + parallaxShift, 90)
  ctx.lineTo(210 + parallaxShift, 130)
  ctx.lineTo(190 + parallaxShift, 165)
  ctx.lineTo(155 + parallaxShift, 160)
  ctx.lineTo(140 + parallaxShift, 120)
  ctx.closePath()
  ctx.fill()

  // Europe/Africa
  ctx.beginPath()
  ctx.moveTo(270 + parallaxShift, 25)
  ctx.lineTo(330 + parallaxShift, 30)
  ctx.lineTo(340 + parallaxShift, 70)
  ctx.lineTo(310 + parallaxShift, 90)
  ctx.lineTo(280 + parallaxShift, 80)
  ctx.lineTo(260 + parallaxShift, 50)
  ctx.closePath()
  ctx.fill()

  // Africa
  ctx.beginPath()
  ctx.moveTo(290 + parallaxShift, 90)
  ctx.lineTo(340 + parallaxShift, 95)
  ctx.lineTo(345 + parallaxShift, 145)
  ctx.lineTo(320 + parallaxShift, 170)
  ctx.lineTo(295 + parallaxShift, 155)
  ctx.lineTo(285 + parallaxShift, 120)
  ctx.closePath()
  ctx.fill()

  // Asia
  ctx.beginPath()
  ctx.moveTo(350 + parallaxShift, 25)
  ctx.lineTo(480 + parallaxShift, 30)
  ctx.lineTo(500 + parallaxShift, 70)
  ctx.lineTo(470 + parallaxShift, 110)
  ctx.lineTo(390 + parallaxShift, 105)
  ctx.lineTo(340 + parallaxShift, 60)
  ctx.closePath()
  ctx.fill()

  // Australia
  ctx.beginPath()
  ctx.moveTo(470 + parallaxShift, 130)
  ctx.lineTo(530 + parallaxShift, 125)
  ctx.lineTo(545 + parallaxShift, 150)
  ctx.lineTo(520 + parallaxShift, 165)
  ctx.lineTo(465 + parallaxShift, 155)
  ctx.closePath()
  ctx.fill()
}

interface WorldMapCanvasProps {
  selectedCountryId: string | null
}

function WorldMapCanvas({ selectedCountryId }: WorldMapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const timeRef = useRef(0)
  const cloudsRef = useRef<CloudParticle[]>(createClouds())
  const animRef = useRef(0)

  // Connection dots for each region
  const dotsRef = useRef<Record<string, ConnectionDot>>(
    Object.fromEntries(
      REGION_BLOCKS.map(r => [
        r.id,
        { x: r.cx, y: r.cy, phase: Math.random() * Math.PI * 2, speed: 2 + Math.random() * 2 },
      ])
    )
  )

  const selectedRef = useRef(selectedCountryId)
  selectedRef.current = selectedCountryId

  useEffect(() => {
    let active = true

    const loop = () => {
      if (!active) return
      const ctx = ctxRef.current
      if (ctx) {
        timeRef.current += 0.016
        const time = timeRef.current
        const parallaxShift = Math.sin(time * 0.15) * 4

        // Clear
        ctx.clearRect(0, 0, MAP_W, MAP_H)

        // Dark background with gradient
        const grad = ctx.createLinearGradient(0, 0, 0, MAP_H)
        grad.addColorStop(0, '#0F172A')
        grad.addColorStop(1, '#1E293B')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, MAP_W, MAP_H)

        // Grid
        drawMapGrid(ctx, time)

        // Continent outlines
        drawContinentShapes(ctx, parallaxShift)

        // Route lines from HQ to selected country
        const selected = selectedRef.current
        if (selected) {
          const region = REGION_BLOCKS.find(r => r.id === selected)
          if (region) {
            const routeProgress = (time * 0.4) % 1
            drawAirplaneRoute(
              ctx,
              HOME_BASE.x + parallaxShift * 0.3,
              HOME_BASE.y,
              region.cx + parallaxShift * 0.5,
              region.cy,
              routeProgress,
              region.glowColor,
            )
          }
        }

        // Draw region blocks
        for (const region of REGION_BLOCKS) {
          const isSelected = region.id === selected
          drawRegionBlock(ctx, region, isSelected, time, parallaxShift)
        }

        // Connection dots
        for (const region of REGION_BLOCKS) {
          const dot = dotsRef.current[region.id]
          if (dot) {
            drawConnectionDot(
              ctx,
              { ...dot, x: dot.x + parallaxShift * 0.5 },
              time,
              region.id === selected ? region.glowColor : 'rgba(148,163,184,0.4)',
            )
          }
        }

        // Home base
        drawHomeBase(ctx, time)

        // Update & draw clouds
        const clouds = cloudsRef.current
        for (const cloud of clouds) {
          cloud.x += cloud.speed
          if (cloud.x - cloud.w > MAP_W) {
            cloud.x = -cloud.w
          }
          drawCloud(ctx, cloud)
        }

        // Ambient particles (tiny dots)
        for (let i = 0; i < 3; i++) {
          const px = (Math.sin(time * 0.7 + i * 47) * 0.5 + 0.5) * MAP_W
          const py = (Math.cos(time * 0.5 + i * 31) * 0.5 + 0.5) * MAP_H
          ctx.globalAlpha = 0.15 + Math.sin(time * 2 + i * 19) * 0.1
          ctx.fillStyle = '#94A3B8'
          ctx.beginPath()
          ctx.arc(px, py, 1.5, 0, Math.PI * 2)
          ctx.fill()
          ctx.globalAlpha = 1
        }
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
      width={MAP_W}
      height={MAP_H}
      className="block w-full rounded-t-2xl"
      style={{ maxWidth: MAP_W }}
    />
  )
}

/* --- Types --- */

export interface ScoreBreakdownItem {
  label: string
  value: number
  max: number
}

interface EntrepreneurMission7Props {
  userId: string
  onComplete?: (score: number, breakdown: ScoreBreakdownItem[]) => void
}

/* --- Data --- */

type EntryStrategy = 'partner' | 'subsidiary' | 'franchise'

interface Manager {
  id: string
  name: string
  languages: string[]
  languagesRu: string[]
  languagesAr: string[]
  experience: number // 1-5
  costPerMonth: number // in thousands
}

interface Country {
  id: string
  name: string
  population: string
  avgIncome: number
  competitors: number
  sweetSpotMin: number
  sweetSpotMax: number
  color: string
}

interface CountryConfig {
  strategy: EntryStrategy | null
  price: number
  managerId: string | null
}

const COUNTRIES: Country[] = [
  { id: 'russia', name: 'Russia', population: '144M', avgIncome: 12000, competitors: 2, sweetSpotMin: 15, sweetSpotMax: 35, color: 'blue' },
  { id: 'india', name: 'India', population: '1.4B', avgIncome: 2000, competitors: 5, sweetSpotMin: 5, sweetSpotMax: 15, color: 'orange' },
  { id: 'brazil', name: 'Brazil', population: '214M', avgIncome: 9000, competitors: 3, sweetSpotMin: 12, sweetSpotMax: 28, color: 'green' },
  { id: 'china', name: 'China', population: '1.4B', avgIncome: 12000, competitors: 4, sweetSpotMin: 15, sweetSpotMax: 35, color: 'red' },
  { id: 'south_africa', name: 'South Africa', population: '60M', avgIncome: 6000, competitors: 1, sweetSpotMin: 8, sweetSpotMax: 22, color: 'yellow' },
]

const MANAGERS: Manager[] = [
  { id: 'mgr1', name: 'Anna Volkov', languages: ['Russian', 'English'], languagesRu: ['Русский', 'Английский'], languagesAr: ['الروسية', 'الإنجليزية'], experience: 4, costPerMonth: 6 },
  { id: 'mgr2', name: 'Raj Patel', languages: ['Hindi', 'English'], languagesRu: ['Хинди', 'Английский'], languagesAr: ['الهندية', 'الإنجليزية'], experience: 3, costPerMonth: 4 },
  { id: 'mgr3', name: 'Carlos Silva', languages: ['Portuguese', 'Spanish', 'English'], languagesRu: ['Португальский', 'Испанский', 'Английский'], languagesAr: ['البرتغالية', 'الإسبانية', 'الإنجليزية'], experience: 5, costPerMonth: 8 },
  { id: 'mgr4', name: 'Wei Zhang', languages: ['Mandarin', 'English'], languagesRu: ['Мандарин (Китайский)', 'Английский'], languagesAr: ['الصينية (الماندرين)', 'الإنجليزية'], experience: 4, costPerMonth: 7 },
  { id: 'mgr5', name: 'Thabo Ndlovu', languages: ['Zulu', 'English', 'Afrikaans'], languagesRu: ['Зулу', 'Английский', 'Африкаанс'], languagesAr: ['الزولو', 'الإنجليزية', 'الأفريكانية'], experience: 2, costPerMonth: 3 },
]

const STRATEGY_COSTS: Record<EntryStrategy, number> = {
  partner: 50000,
  subsidiary: 150000,
  franchise: 100000,
}

const STRATEGY_LABELS_EN: Record<EntryStrategy, string> = {
  partner: 'Local Partner',
  subsidiary: 'Own Subsidiary',
  franchise: 'Franchise',
}

const STRATEGY_LABELS_RU: Record<EntryStrategy, string> = {
  partner: 'Местный партнёр',
  subsidiary: 'Своя дочерняя компания',
  franchise: 'Франшиза',
}

const STRATEGY_LABELS_AR: Record<EntryStrategy, string> = {
  partner: 'شريك محلي',
  subsidiary: 'شركة تابعة',
  franchise: 'امتياز تجاري',
}

const COUNTRY_LANG_MAP: Record<string, string> = {
  russia: 'Russian',
  india: 'Hindi',
  brazil: 'Portuguese',
  china: 'Mandarin',
  south_africa: 'Zulu',
}

const COUNTRY_NAMES_RU: Record<string, string> = {
  russia: 'Россия',
  india: 'Индия',
  brazil: 'Бразилия',
  china: 'Китай',
  south_africa: 'Южная Африка',
}

const COUNTRY_NAMES_AR: Record<string, string> = {
  russia: 'روسيا',
  india: 'الهند',
  brazil: 'البرازيل',
  china: 'الصين',
  south_africa: 'جنوب أفريقيا',
}

const BUDGET = 400000

/* --- Simulation logic --- */

function simulateCountry(
  country: Country,
  strategy: EntryStrategy,
  price: number,
  manager: Manager,
): { revenue: number; costs: number; profit: number; success: boolean } {
  const strategyCost = STRATEGY_COSTS[strategy]

  // Price fitness: closer to sweet spot = more customers
  const sweetMid = (country.sweetSpotMin + country.sweetSpotMax) / 2
  const priceDist = Math.abs(price - sweetMid) / sweetMid
  const priceFit = Math.max(0, 1 - priceDist)

  // Manager language bonus
  const hasLanguage = manager.languages.includes(COUNTRY_LANG_MAP[country.id] || '')
  const langBonus = hasLanguage ? 1.3 : 0.7

  // Experience factor
  const expFactor = 0.5 + (manager.experience / 5) * 0.5

  // Strategy multiplier (subsidiary = highest control but costly, partner = good local knowledge)
  const strategyMult = strategy === 'subsidiary' ? 1.1 : strategy === 'partner' ? 1.2 : 1.0

  // Market size factor (population-based, scaled)
  const popFactor = country.id === 'india' || country.id === 'china' ? 2.0 : country.id === 'brazil' ? 1.3 : country.id === 'russia' ? 1.0 : 0.6

  // Competition penalty
  const compPenalty = Math.max(0.4, 1 - country.competitors * 0.12)

  // 3-month revenue estimate
  const monthlyCustomers = Math.round(500 * priceFit * langBonus * expFactor * strategyMult * popFactor * compPenalty)
  const monthlyRevenue = monthlyCustomers * price
  const monthlyCosts = strategyCost / 3 + manager.costPerMonth * 1000
  const totalRevenue = monthlyRevenue * 3
  const totalCosts = strategyCost + manager.costPerMonth * 1000 * 3

  return {
    revenue: totalRevenue,
    costs: totalCosts,
    profit: totalRevenue - totalCosts,
    success: totalRevenue - totalCosts > 0,
  }
}

/* --- Component --- */

export default function EntrepreneurMission7({ userId, onComplete }: EntrepreneurMission7Props) {
  const locale = useLocale()
  const STRATEGY_LABELS = locale === 'ru' ? STRATEGY_LABELS_RU : locale === 'ar' ? STRATEGY_LABELS_AR : STRATEGY_LABELS_EN
  const countryName = (c: Country) => locale === 'ru' ? (COUNTRY_NAMES_RU[c.id] || c.name) : locale === 'ar' ? (COUNTRY_NAMES_AR[c.id] || c.name) : c.name
  const [phase, setPhase] = useState<'intro' | 'configure' | 'simulate' | 'done'>('intro')
  const [activeCountry, setActiveCountry] = useState(0)
  const [configs, setConfigs] = useState<Record<string, CountryConfig>>(
    Object.fromEntries(COUNTRIES.map(c => [c.id, { strategy: null, price: 20, managerId: null }]))
  )
  const [results, setResults] = useState<Record<string, { revenue: number; costs: number; profit: number; success: boolean }>>({})
  const [simMonth, setSimMonth] = useState(0)

  const totalSpent = useMemo(() => {
    let total = 0
    for (const c of COUNTRIES) {
      const cfg = configs[c.id]
      if (cfg.strategy) total += STRATEGY_COSTS[cfg.strategy]
    }
    return total
  }, [configs])

  const budgetRemaining = BUDGET - totalSpent

  const usedManagers = useMemo(() => {
    const used = new Set<string>()
    for (const c of COUNTRIES) {
      const mgr = configs[c.id].managerId
      if (mgr) used.add(mgr)
    }
    return used
  }, [configs])

  const allConfigured = useMemo(() => {
    return COUNTRIES.every(c => {
      const cfg = configs[c.id]
      return cfg.strategy && cfg.managerId
    })
  }, [configs])

  const updateConfig = useCallback((countryId: string, update: Partial<CountryConfig>) => {
    setConfigs(prev => ({
      ...prev,
      [countryId]: { ...prev[countryId], ...update },
    }))
  }, [])

  const handleRunSimulation = useCallback(() => {
    if (budgetRemaining < 0) return

    const res: typeof results = {}
    for (const c of COUNTRIES) {
      const cfg = configs[c.id]
      if (!cfg.strategy || !cfg.managerId) continue
      const manager = MANAGERS.find(m => m.id === cfg.managerId)!
      res[c.id] = simulateCountry(c, cfg.strategy, cfg.price, manager)
    }
    setResults(res)
    setPhase('simulate')

    // Animate months
    let month = 0
    const interval = setInterval(() => {
      month++
      setSimMonth(month)
      if (month >= 3) {
        clearInterval(interval)
      }
    }, 800)
  }, [configs, budgetRemaining])

  const handleFinish = useCallback(() => {
    const successCount = Object.values(results).filter(r => r.success).length
    const totalROI = Object.values(results).reduce((sum, r) => sum + r.profit, 0)
    const maxPossibleROI = BUDGET * 2 // theoretical max

    // market_entry: 500 * (countries successful / 5)
    const marketEntryScore = Math.round(500 * (successCount / 5))

    // strategy: 350 based on ROI
    const roiRatio = Math.max(0, totalROI) / maxPossibleROI
    const strategyScore = Math.round(350 * Math.min(1, roiRatio * 2))

    // team: 150 based on manager language fit
    let fitCount = 0
    for (const c of COUNTRIES) {
      const cfg = configs[c.id]
      const mgr = MANAGERS.find(m => m.id === cfg.managerId)
      if (mgr && mgr.languages.includes(COUNTRY_LANG_MAP[c.id] || '')) fitCount++
    }
    const teamScore = Math.round(150 * (fitCount / 5))

    const totalScore = Math.min(1000, marketEntryScore + strategyScore + teamScore)

    setPhase('done')
    onComplete?.(totalScore, [
      { label: locale === 'ru' ? 'Выход на рынок' : locale === 'ar' ? 'دخول السوق' : 'Market Entry', value: marketEntryScore, max: 500 },
      { label: locale === 'ru' ? 'ROI стратегии' : locale === 'ar' ? 'عائد الاستراتيجية' : 'Strategy ROI', value: strategyScore, max: 350 },
      { label: locale === 'ru' ? 'Подбор команды' : locale === 'ar' ? 'ملاءمة الفريق' : 'Team Fit', value: teamScore, max: 150 },
    ])
  }, [results, configs, onComplete, locale])

  /* --- Render: Intro --- */
  if (phase === 'intro') {
    return (
      <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl p-8 max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">{'\u{1F30D}'}</div>
          <h2 className="text-2xl font-black text-white mb-3">{locale === 'ru' ? 'Выход на мировой рынок' : locale === 'ar' ? 'التوسع العالمي' : 'Go Global'}</h2>
          <p className="text-gray-300 leading-relaxed mb-4">
            {locale === 'ru'
              ? <>Ваш стартап готов к международной экспансии. <span className="text-amber-400 font-bold">Страны БРИКС</span> — ваши целевые рынки. У вас бюджет <span className="text-green-400 font-bold">$400,000</span> для выхода на все 5 рынков.</>
              : locale === 'ar'
              ? <>شركتك الناشئة جاهزة للتوسع دوليًا. <span className="text-amber-400 font-bold">دول بريكس</span> هي أسواقك المستهدفة. لديك ميزانية <span className="text-green-400 font-bold">$400,000</span> لدخول جميع الأسواق الخمسة.</>
              : <>Your startup is ready to expand internationally. The <span className="text-amber-400 font-bold">BRICS countries</span> are your target markets. You have a <span className="text-green-400 font-bold">$400,000 budget</span> to enter all 5 markets.</>}
          </p>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-4 mb-6 space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">{locale === 'ru' ? 'Ваши задачи' : locale === 'ar' ? 'مهامك' : 'Your Tasks'}</h3>
          <div className="flex items-start gap-3 text-sm">
            <span className="text-blue-400 text-lg">{'\u{1F3E2}'}</span>
            <p className="text-gray-300">
              {locale === 'ru'
                ? <>Выберите <span className="text-blue-400 font-bold">стратегию входа</span> для каждой страны: Партнёр ($50K), Франшиза ($100K) или Дочерняя компания ($150K).</>
                : locale === 'ar'
                ? <>اختر <span className="text-blue-400 font-bold">استراتيجية الدخول</span> لكل دولة: شريك ($50K)، امتياز ($100K)، أو شركة تابعة ($150K).</>
                : <>Choose an <span className="text-blue-400 font-bold">entry strategy</span> for each country: Partner ($50K), Franchise ($100K), or Subsidiary ($150K).</>}
            </p>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <span className="text-green-400 text-lg">{'\u{1F4B2}'}</span>
            <p className="text-gray-300">
              {locale === 'ru'
                ? <>Установите <span className="text-green-400 font-bold">правильную цену</span> для каждого рынка. Разные страны = разная покупательная способность.</>
                : locale === 'ar'
                ? <>حدد <span className="text-green-400 font-bold">السعر المناسب</span> لكل سوق. دول مختلفة = قوة شرائية مختلفة.</>
                : <>Set the <span className="text-green-400 font-bold">right price</span> for each market. Different countries = different purchasing power.</>}
            </p>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <span className="text-purple-400 text-lg">{'\u{1F464}'}</span>
            <p className="text-gray-300">
              {locale === 'ru'
                ? <>Назначьте <span className="text-purple-400 font-bold">лучшего менеджера</span> для каждой страны. Знание языка и опыт имеют значение!</>
                : locale === 'ar'
                ? <>عيّن <span className="text-purple-400 font-bold">أفضل مدير</span> لكل دولة. المهارات اللغوية والخبرة مهمة!</>
                : <>Assign the <span className="text-purple-400 font-bold">best manager</span> for each country. Language skills and experience matter!</>}
            </p>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <span className="text-red-400 text-lg">{'\u{1F3AF}'}</span>
            <p className="text-gray-300">
              {locale === 'ru'
                ? <>Цель: быть <span className="text-red-400 font-bold">прибыльным минимум в 2 странах</span> после 3-месячной симуляции.</>
                : locale === 'ar'
                ? <>الهدف: أن تكون <span className="text-red-400 font-bold">مربحًا في دولتين على الأقل</span> بعد محاكاة 3 أشهر.</>
                : <>Goal: Be <span className="text-red-400 font-bold">profitable in at least 2 countries</span> after a 3-month simulation.</>}
            </p>
          </div>
        </div>

        <button
          onClick={() => setPhase('configure')}
          className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-lg rounded-xl transition-colors"
        >
          {'\u{1F30D}'} {locale === 'ru' ? 'Начать глобальную экспансию' : locale === 'ar' ? 'بدء التوسع العالمي' : 'Start Global Expansion'}
        </button>
      </div>
    )
  }

  /* --- Render: Done --- */
  if (phase === 'done') {
    const successCount = Object.values(results).filter(r => r.success).length
    return (
      <div className="bg-[var(--brand-panel)] border border-green-500/40 rounded-2xl p-8 text-center">
        <div className="text-6xl mb-4">{successCount >= 2 ? '\u{1F30D}' : '\u{1F4C9}'}</div>
        <p className={`text-lg font-bold ${successCount >= 2 ? 'text-green-400' : 'text-red-400'}`}>
          {successCount >= 2
            ? (locale === 'ru' ? `Глобальная экспансия успешна! Прибыль в ${successCount} странах.` : locale === 'ar' ? `نجح التوسع العالمي! أرباح في ${successCount} دول.` : `Global expansion succeeded! Profitable in ${successCount} countries.`)
            : (locale === 'ru' ? `Прибыль только в ${successCount} стране. Нужно минимум 2.` : locale === 'ar' ? `أرباح في ${successCount} دولة فقط. تحتاج على الأقل 2.` : `Only profitable in ${successCount} country. Need at least 2.`)}
        </p>
        <p className="text-gray-400 text-sm mt-2">{locale === 'ru' ? 'Проверьте результаты выше.' : locale === 'ar' ? 'تحقق من النتائج أعلاه.' : 'Check your results above.'}</p>
      </div>
    )
  }

  /* --- Render: Simulation Results --- */
  if (phase === 'simulate') {
    return (
      <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700">
          <span className="text-xs text-gray-400 font-bold">{locale === 'ru' ? 'Миссия 7: Выход на мировой рынок — Симуляция' : locale === 'ar' ? 'المهمة 7: التوسع العالمي — المحاكاة' : 'Mission 7: Go Global -- Simulation'}</span>
          <span className="text-xs text-amber-400 font-bold">{locale === 'ru' ? `Месяц ${simMonth}/3` : locale === 'ar' ? `الشهر ${simMonth}/3` : `Month ${simMonth}/3`}</span>
        </div>

        {/* Progress bar */}
        <div className="px-4 pt-3">
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-700"
              style={{ width: `${(simMonth / 3) * 100}%` }}
            />
          </div>
        </div>

        <div className="p-4 space-y-3">
          {COUNTRIES.map(c => {
            const r = results[c.id]
            if (!r) return null
            const cfg = configs[c.id]
            const manager = MANAGERS.find(m => m.id === cfg.managerId)
            const revealed = simMonth >= 3
            return (
              <div
                key={c.id}
                className={`p-4 rounded-xl border ${
                  revealed
                    ? r.success
                      ? 'border-green-600/50 bg-green-900/20'
                      : 'border-red-600/50 bg-red-900/20'
                    : 'border-gray-700 bg-gray-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CountryFlag countryId={c.id} size="md" />
                    <div>
                      <div className="font-bold text-white text-sm">{countryName(c)}</div>
                      <div className="text-[10px] text-gray-500">
                        {STRATEGY_LABELS[cfg.strategy!]} | ${cfg.price}/{locale === 'ru' ? 'мес' : locale === 'ar' ? 'شهر' : 'mo'} | {manager?.name}
                      </div>
                    </div>
                  </div>
                  {revealed && (
                    <span className={`text-sm font-black ${r.success ? 'text-green-400' : 'text-red-400'}`}>
                      {r.success ? (locale === 'ru' ? 'ПРИБЫЛЬ' : locale === 'ar' ? 'مربح' : 'PROFITABLE') : (locale === 'ru' ? 'УБЫТОК' : locale === 'ar' ? 'خسارة' : 'LOSS')}
                    </span>
                  )}
                </div>
                {revealed && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div className="text-center">
                      <div className="text-[10px] text-gray-500">{locale === 'ru' ? 'Выручка' : locale === 'ar' ? 'الإيرادات' : 'Revenue'}</div>
                      <div className="text-sm font-bold text-green-400">${r.revenue.toLocaleString()}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-gray-500">{locale === 'ru' ? 'Расходы' : locale === 'ar' ? 'التكاليف' : 'Costs'}</div>
                      <div className="text-sm font-bold text-red-400">${r.costs.toLocaleString()}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-gray-500">{locale === 'ru' ? 'Прибыль' : locale === 'ar' ? 'الربح' : 'Profit'}</div>
                      <div className={`text-sm font-bold ${r.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${r.profit.toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
                {!revealed && (
                  <div className="h-6 flex items-center">
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${simMonth > i ? 'bg-amber-400' : 'bg-gray-600'}`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-gray-500 ml-2">{locale === 'ru' ? 'Симуляция...' : locale === 'ar' ? 'جاري المحاكاة...' : 'Simulating...'}</span>
                  </div>
                )}
              </div>
            )
          })}

          {simMonth >= 3 && (
            <div className="pt-2">
              <div className="text-center mb-3">
                <span className="text-sm text-gray-400">
                  {locale === 'ru' ? 'Итого P&L:' : locale === 'ar' ? 'إجمالي الأرباح والخسائر:' : 'Total P&L:'} <span className={`font-bold ${Object.values(results).reduce((s, r) => s + r.profit, 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${Object.values(results).reduce((s, r) => s + r.profit, 0).toLocaleString()}
                  </span>
                </span>
              </div>
              <button
                onClick={handleFinish}
                className="w-full px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors"
              >
                {locale === 'ru' ? 'Посмотреть итоги' : locale === 'ar' ? 'عرض النتائج النهائية' : 'See Final Results'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  /* --- Render: Configure --- */
  const country = COUNTRIES[activeCountry]
  const cfg = configs[country.id]

  return (
    <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl overflow-hidden">
      {/* Animated 2.5D World Map Canvas */}
      <WorldMapCanvas selectedCountryId={country.id} />

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700">
        <span className="text-xs text-gray-400 font-bold">{locale === 'ru' ? 'Миссия 7: Выход на мировой рынок' : locale === 'ar' ? 'المهمة 7: التوسع العالمي' : 'Mission 7: Go Global'}</span>
        <span className={`text-xs font-bold ${budgetRemaining >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {locale === 'ru' ? 'Бюджет' : locale === 'ar' ? 'الميزانية' : 'Budget'}: ${budgetRemaining.toLocaleString()} / ${BUDGET.toLocaleString()}
        </span>
      </div>

      {/* Country tabs */}
      <div className="flex border-b border-gray-700 overflow-x-auto">
        {COUNTRIES.map((c, i) => {
          const cCfg = configs[c.id]
          const isConfigured = cCfg.strategy && cCfg.managerId
          return (
            <button
              key={c.id}
              onClick={() => setActiveCountry(i)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-bold transition-colors flex items-center gap-1.5 ${
                activeCountry === i
                  ? 'bg-gray-800 text-white border-b-2 border-amber-500'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <CountryFlag countryId={c.id} size="sm" />
              <span className="hidden sm:inline">{countryName(c)}</span>
              {isConfigured && <span className="text-green-400 text-xs">{'\u2713'}</span>}
            </button>
          )
        })}
      </div>

      <div className="p-4 space-y-5">
        {/* Country info card */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <CountryFlag countryId={country.id} size="lg" />
            <div>
              <h3 className="text-lg font-black text-white">{countryName(country)}</h3>
              <div className="flex gap-3 text-xs text-gray-400">
                <span>{locale === 'ru' ? 'Нас.' : locale === 'ar' ? 'السكان' : 'Pop'}: {country.population}</span>
                <span>{locale === 'ru' ? 'Ср. доход' : locale === 'ar' ? 'متوسط الدخل' : 'Avg Income'}: ${country.avgIncome.toLocaleString()}/{locale === 'ru' ? 'год' : locale === 'ar' ? 'سنة' : 'yr'}</span>
                <span>{locale === 'ru' ? 'Конкуренты' : locale === 'ar' ? 'المنافسون' : 'Competitors'}: {country.competitors}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Entry strategy */}
        <div>
          <h4 className="text-sm font-bold text-gray-300 mb-2">{locale === 'ru' ? 'Стратегия входа' : locale === 'ar' ? 'استراتيجية الدخول' : 'Entry Strategy'}</h4>
          <div className="grid grid-cols-3 gap-2">
            {(['partner', 'subsidiary', 'franchise'] as EntryStrategy[]).map(s => {
              const cost = STRATEGY_COSTS[s]
              const isSelected = cfg.strategy === s
              return (
                <button
                  key={s}
                  onClick={() => updateConfig(country.id, { strategy: s })}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? 'border-amber-500 bg-amber-900/20'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
                  }`}
                >
                  <div className="text-xs font-bold text-white">{STRATEGY_LABELS[s]}</div>
                  <div className="text-[10px] text-gray-500">${(cost / 1000).toFixed(0)}K</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Price slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold text-gray-300">{locale === 'ru' ? 'Месячная цена' : locale === 'ar' ? 'السعر الشهري' : 'Monthly Price'}</h4>
            <span className="text-sm font-black text-white">${cfg.price}</span>
          </div>
          <input
            type="range"
            min={5}
            max={100}
            step={1}
            value={cfg.price}
            onChange={(e) => updateConfig(country.id, { price: Number(e.target.value) })}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex justify-between text-[10px] text-gray-500 mt-1">
            <span>$5</span>
            <span>$100</span>
          </div>
        </div>

        {/* Manager selection */}
        <div>
          <h4 className="text-sm font-bold text-gray-300 mb-2">{locale === 'ru' ? 'Назначить менеджера' : locale === 'ar' ? 'تعيين مدير' : 'Assign Manager'}</h4>
          <div className="space-y-2">
            {MANAGERS.map(m => {
              const isSelected = cfg.managerId === m.id
              const isUsedElsewhere = usedManagers.has(m.id) && !isSelected
              return (
                <button
                  key={m.id}
                  onClick={() => !isUsedElsewhere && updateConfig(country.id, { managerId: m.id })}
                  disabled={isUsedElsewhere}
                  className={`w-full p-3 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-amber-500 bg-amber-900/20'
                      : isUsedElsewhere
                      ? 'border-gray-800 bg-gray-900/30 opacity-40 cursor-not-allowed'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
                  }`}
                >
                  <div>
                    <div className="text-sm font-bold text-white">{m.name}</div>
                    <div className="text-[10px] text-gray-400">
                      {(locale === 'ru' ? m.languagesRu : locale === 'ar' ? m.languagesAr : m.languages).join(', ')} | {locale === 'ru' ? 'Опыт' : locale === 'ar' ? 'الخبرة' : 'Exp'}: {'*'.repeat(m.experience)}{'*'.repeat(0)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-amber-400">${m.costPerMonth}K/mo</div>
                    {isUsedElsewhere && <div className="text-[10px] text-gray-500">{locale === 'ru' ? 'Назначен' : locale === 'ar' ? 'معيّن' : 'Assigned'}</div>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Run simulation button */}
        <div className="flex justify-between items-center pt-2">
          <div className="text-xs text-gray-500">
            {allConfigured
              ? (locale === 'ru' ? 'Все страны настроены' : locale === 'ar' ? 'تم إعداد جميع الدول' : 'All countries configured')
              : (locale === 'ru' ? 'Настройте все 5 стран, чтобы продолжить' : locale === 'ar' ? 'قم بإعداد جميع الدول الخمس للمتابعة' : 'Configure all 5 countries to proceed')}
          </div>
          <button
            onClick={handleRunSimulation}
            disabled={!allConfigured || budgetRemaining < 0}
            className={`px-6 py-3 font-bold rounded-xl transition-colors ${
              allConfigured && budgetRemaining >= 0
                ? 'bg-green-600 hover:bg-green-500 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {locale === 'ru' ? 'Запустить симуляцию на 3 месяца' : locale === 'ar' ? 'تشغيل محاكاة 3 أشهر' : 'Run 3-Month Simulation'} {'\u{1F680}'}
          </button>
        </div>
      </div>
    </div>
  )
}
