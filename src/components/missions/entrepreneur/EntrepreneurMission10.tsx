'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useLocale } from 'next-intl'

/* --- Types --- */

export interface ScoreBreakdownItem {
  label: string
  value: number
  max: number
}

interface EntrepreneurMission10Props {
  userId: string
  onComplete?: (score: number, breakdown: ScoreBreakdownItem[]) => void
}

/* --- Data --- */

interface Startup {
  id: string
  name: string
  industry: string
  stage: string
  fundingNeeded: number // in thousands
  techSkill: number    // 1-5
  bizSkill: number     // 1-5
  mktSkill: number     // 1-5
  synergyTags: string[]
}

type Zone = 'tech_hub' | 'industrial' | 'commercial' | 'residential' | 'university' | 'government'

interface Mentor {
  id: string
  name: string
  boostSkill: 'tech' | 'business' | 'marketing'
  description: string
}

const STARTUPS: Startup[] = [
  { id: 's1', name: 'EduTech AI', industry: 'EdTech', stage: 'Seed', fundingNeeded: 120, techSkill: 4, bizSkill: 2, mktSkill: 2, synergyTags: ['ai', 'education'] },
  { id: 's2', name: 'GreenHarvest', industry: 'AgriTech', stage: 'Pre-Seed', fundingNeeded: 80, techSkill: 3, bizSkill: 3, mktSkill: 2, synergyTags: ['agriculture', 'iot'] },
  { id: 's3', name: 'FinBlock', industry: 'FinTech', stage: 'Series A', fundingNeeded: 200, techSkill: 5, bizSkill: 4, mktSkill: 3, synergyTags: ['finance', 'blockchain'] },
  { id: 's4', name: 'MedScan', industry: 'HealthTech', stage: 'Seed', fundingNeeded: 150, techSkill: 5, bizSkill: 2, mktSkill: 1, synergyTags: ['health', 'ai'] },
  { id: 's5', name: 'LogiDrone', industry: 'Logistics', stage: 'Pre-Seed', fundingNeeded: 100, techSkill: 4, bizSkill: 3, mktSkill: 2, synergyTags: ['logistics', 'drones'] },
  { id: 's6', name: 'CleanWatt', industry: 'CleanTech', stage: 'Seed', fundingNeeded: 130, techSkill: 3, bizSkill: 3, mktSkill: 3, synergyTags: ['energy', 'sustainability'] },
  { id: 's7', name: 'StyleAI', industry: 'Fashion Tech', stage: 'Pre-Seed', fundingNeeded: 60, techSkill: 3, bizSkill: 2, mktSkill: 5, synergyTags: ['fashion', 'ai'] },
  { id: 's8', name: 'CyberShield', industry: 'Cybersecurity', stage: 'Seed', fundingNeeded: 170, techSkill: 5, bizSkill: 3, mktSkill: 2, synergyTags: ['security', 'finance'] },
  { id: 's9', name: 'FoodLoop', industry: 'FoodTech', stage: 'Pre-Seed', fundingNeeded: 90, techSkill: 2, bizSkill: 4, mktSkill: 4, synergyTags: ['food', 'sustainability'] },
  { id: 's10', name: 'BuildSmart', industry: 'ConTech', stage: 'Seed', fundingNeeded: 140, techSkill: 4, bizSkill: 3, mktSkill: 2, synergyTags: ['construction', 'iot'] },
  { id: 's11', name: 'TravelMate', industry: 'TravelTech', stage: 'Pre-Seed', fundingNeeded: 70, techSkill: 2, bizSkill: 3, mktSkill: 5, synergyTags: ['travel', 'ai'] },
  { id: 's12', name: 'GovConnect', industry: 'GovTech', stage: 'Seed', fundingNeeded: 110, techSkill: 3, bizSkill: 4, mktSkill: 3, synergyTags: ['government', 'education'] },
]

const ZONES_EN: { id: Zone; label: string; icon: string; bestFor: string[] }[] = [
  { id: 'tech_hub', label: 'Tech Hub', icon: '\u{1F4BB}', bestFor: ['ai', 'blockchain', 'iot'] },
  { id: 'industrial', label: 'Industrial', icon: '\u{1F3ED}', bestFor: ['logistics', 'construction', 'energy'] },
  { id: 'commercial', label: 'Commercial', icon: '\u{1F3EC}', bestFor: ['finance', 'fashion', 'travel'] },
  { id: 'residential', label: 'Residential', icon: '\u{1F3E0}', bestFor: ['food', 'health'] },
  { id: 'university', label: 'University', icon: '\u{1F3EB}', bestFor: ['education', 'ai'] },
  { id: 'government', label: 'Government', icon: '\u{1F3DB}', bestFor: ['government', 'security', 'sustainability'] },
]

const ZONES_RU: { id: Zone; label: string; icon: string; bestFor: string[] }[] = [
  { id: 'tech_hub', label: 'Технохаб', icon: '\u{1F4BB}', bestFor: ['ai', 'blockchain', 'iot'] },
  { id: 'industrial', label: 'Промышленная', icon: '\u{1F3ED}', bestFor: ['logistics', 'construction', 'energy'] },
  { id: 'commercial', label: 'Коммерческая', icon: '\u{1F3EC}', bestFor: ['finance', 'fashion', 'travel'] },
  { id: 'residential', label: 'Жилая', icon: '\u{1F3E0}', bestFor: ['food', 'health'] },
  { id: 'university', label: 'Университетская', icon: '\u{1F3EB}', bestFor: ['education', 'ai'] },
  { id: 'government', label: 'Государственная', icon: '\u{1F3DB}', bestFor: ['government', 'security', 'sustainability'] },
]

const MENTORS_EN: Mentor[] = [
  { id: 'mentor1', name: 'Dr. Chen', boostSkill: 'tech', description: 'CTO veteran, boosts tech capabilities' },
  { id: 'mentor2', name: 'Sarah Okonkwo', boostSkill: 'business', description: 'Serial entrepreneur, boosts business skills' },
  { id: 'mentor3', name: 'Alex Rivera', boostSkill: 'marketing', description: 'Growth expert, boosts marketing reach' },
]

const MENTORS_RU: Mentor[] = [
  { id: 'mentor1', name: 'Dr. Chen', boostSkill: 'tech', description: 'Ветеран CTO, усиливает технические возможности' },
  { id: 'mentor2', name: 'Sarah Okonkwo', boostSkill: 'business', description: 'Серийный предприниматель, усиливает бизнес-навыки' },
  { id: 'mentor3', name: 'Alex Rivera', boostSkill: 'marketing', description: 'Эксперт по росту, усиливает маркетинг' },
]

const INDUSTRY_NAMES_RU: Record<string, string> = {
  'EdTech': 'Образование',
  'AgriTech': 'Агротехнологии',
  'FinTech': 'Финтех',
  'HealthTech': 'Медтех',
  'Logistics': 'Логистика',
  'CleanTech': 'Чистые технологии',
  'Fashion Tech': 'Модные технологии',
  'Cybersecurity': 'Кибербезопасность',
  'FoodTech': 'Фудтех',
  'ConTech': 'Стройтех',
  'TravelTech': 'Туртех',
  'GovTech': 'Госуслуги',
}

const STAGE_NAMES_RU: Record<string, string> = {
  'Seed': 'Посевная',
  'Pre-Seed': 'Пре-посевная',
  'Series A': 'Серия A',
}

const TAG_NAMES_RU: Record<string, string> = {
  'ai': 'ИИ',
  'education': 'образование',
  'agriculture': 'сельское хозяйство',
  'iot': 'IoT',
  'finance': 'финансы',
  'blockchain': 'блокчейн',
  'health': 'здоровье',
  'logistics': 'логистика',
  'drones': 'дроны',
  'energy': 'энергетика',
  'sustainability': 'устойчивость',
  'fashion': 'мода',
  'security': 'безопасность',
  'food': 'еда',
  'construction': 'строительство',
  'travel': 'путешествия',
  'government': 'госуправление',
}

const ZONES_AR: { id: Zone; label: string; icon: string; bestFor: string[] }[] = [
  { id: 'tech_hub', label: 'مركز التقنية', icon: '\u{1F4BB}', bestFor: ['ai', 'blockchain', 'iot'] },
  { id: 'industrial', label: 'صناعية', icon: '\u{1F3ED}', bestFor: ['logistics', 'construction', 'energy'] },
  { id: 'commercial', label: 'تجارية', icon: '\u{1F3EC}', bestFor: ['finance', 'fashion', 'travel'] },
  { id: 'residential', label: 'سكنية', icon: '\u{1F3E0}', bestFor: ['food', 'health'] },
  { id: 'university', label: 'جامعية', icon: '\u{1F3EB}', bestFor: ['education', 'ai'] },
  { id: 'government', label: 'حكومية', icon: '\u{1F3DB}', bestFor: ['government', 'security', 'sustainability'] },
]

const MENTORS_AR: Mentor[] = [
  { id: 'mentor1', name: 'Dr. Chen', boostSkill: 'tech', description: 'خبير تقني، يعزز القدرات التقنية' },
  { id: 'mentor2', name: 'Sarah Okonkwo', boostSkill: 'business', description: 'رائدة أعمال متسلسلة، تعزز مهارات الأعمال' },
  { id: 'mentor3', name: 'Alex Rivera', boostSkill: 'marketing', description: 'خبير نمو، يعزز التسويق' },
]

const INDUSTRY_NAMES_AR: Record<string, string> = {
  'EdTech': 'تقنية التعليم',
  'AgriTech': 'تقنية الزراعة',
  'FinTech': 'تقنية مالية',
  'HealthTech': 'تقنية صحية',
  'Logistics': 'لوجستيات',
  'CleanTech': 'تقنية نظيفة',
  'Fashion Tech': 'تقنية الأزياء',
  'Cybersecurity': 'أمن سيبراني',
  'FoodTech': 'تقنية الغذاء',
  'ConTech': 'تقنية البناء',
  'TravelTech': 'تقنية السفر',
  'GovTech': 'تقنية حكومية',
}

const STAGE_NAMES_AR: Record<string, string> = {
  'Seed': 'بذرية',
  'Pre-Seed': 'ما قبل البذرية',
  'Series A': 'السلسلة A',
}

const TAG_NAMES_AR: Record<string, string> = {
  'ai': 'ذكاء اصطناعي',
  'education': 'تعليم',
  'agriculture': 'زراعة',
  'iot': 'IoT',
  'finance': 'مالية',
  'blockchain': 'بلوكتشين',
  'health': 'صحة',
  'logistics': 'لوجستيات',
  'drones': 'طائرات مسيّرة',
  'energy': 'طاقة',
  'sustainability': 'استدامة',
  'fashion': 'أزياء',
  'security': 'أمن',
  'food': 'غذاء',
  'construction': 'بناء',
  'travel': 'سفر',
  'government': 'إدارة حكومية',
}

const TOTAL_FUND = 1000000 // $1M

/* --- Canvas Constants --- */

const CANVAS_W = 600
const CANVAS_H = 250

// Isometric zone positions on the campus
const ZONE_POSITIONS: Record<Zone, { x: number; y: number }> = {
  tech_hub:    { x: 150, y: 80 },
  industrial:  { x: 350, y: 60 },
  commercial:  { x: 520, y: 100 },
  residential: { x: 100, y: 170 },
  university:  { x: 300, y: 160 },
  government:  { x: 480, y: 180 },
}

// Zone building colors
const ZONE_COLORS: Record<Zone, { top: string; left: string; right: string }> = {
  tech_hub:    { top: '#3B82F6', left: '#2563EB', right: '#1D4ED8' },
  industrial:  { top: '#F59E0B', left: '#D97706', right: '#B45309' },
  commercial:  { top: '#EC4899', left: '#DB2777', right: '#BE185D' },
  residential: { top: '#22C55E', left: '#16A34A', right: '#15803D' },
  university:  { top: '#8B5CF6', left: '#7C3AED', right: '#6D28D9' },
  government:  { top: '#6B7280', left: '#4B5563', right: '#374151' },
}

/* --- Canvas particle types --- */

interface M10Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  type: 'sparkle' | 'funding' | 'light'
  color: string
  size: number
}

/* --- Isometric helpers --- */

function drawIsoBuilding10(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number, d: number,
  topCol: string, leftCol: string, rightCol: string,
  glowAlpha: number = 0,
  dimAlpha: number = 0
) {
  ctx.save()
  if (dimAlpha > 0) {
    ctx.globalAlpha = Math.max(0.2, 1 - dimAlpha * 0.7)
  }

  // Right face
  ctx.fillStyle = rightCol
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + w / 2, y + d / 2)
  ctx.lineTo(x + w / 2, y + d / 2 - h)
  ctx.lineTo(x, y - h)
  ctx.closePath()
  ctx.fill()

  // Left face
  ctx.fillStyle = leftCol
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x - w / 2, y + d / 2)
  ctx.lineTo(x - w / 2, y + d / 2 - h)
  ctx.lineTo(x, y - h)
  ctx.closePath()
  ctx.fill()

  // Top face
  ctx.fillStyle = topCol
  ctx.beginPath()
  ctx.moveTo(x, y - h)
  ctx.lineTo(x + w / 2, y + d / 2 - h)
  ctx.lineTo(x, y + d - h)
  ctx.lineTo(x - w / 2, y + d / 2 - h)
  ctx.closePath()
  ctx.fill()

  // Glow
  if (glowAlpha > 0) {
    ctx.shadowColor = topCol
    ctx.shadowBlur = 15 * glowAlpha
    ctx.globalAlpha = glowAlpha * 0.4
    ctx.fillStyle = topCol
    ctx.beginPath()
    ctx.moveTo(x, y - h)
    ctx.lineTo(x + w / 2, y + d / 2 - h)
    ctx.lineTo(x, y + d - h)
    ctx.lineTo(x - w / 2, y + d / 2 - h)
    ctx.closePath()
    ctx.fill()
    ctx.shadowBlur = 0
  }

  ctx.restore()
}

// Draw zone-specific roof decoration
function drawZoneDecoration(ctx: CanvasRenderingContext2D, zone: Zone, x: number, y: number, h: number, time: number) {
  const topY = y - h - 4
  ctx.save()

  switch (zone) {
    case 'tech_hub': {
      // Server rack antenna
      ctx.strokeStyle = '#60A5FA'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, topY)
      ctx.lineTo(x, topY - 12)
      ctx.stroke()
      // Blinking light
      ctx.fillStyle = (Math.sin(time * 5) > 0) ? '#3B82F6' : '#1E40AF'
      ctx.beginPath()
      ctx.arc(x, topY - 14, 2, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'industrial': {
      // Chimney with smoke
      ctx.fillStyle = '#78716C'
      ctx.fillRect(x - 3, topY - 10, 6, 10)
      // Smoke puffs
      ctx.globalAlpha = 0.3
      ctx.fillStyle = '#9CA3AF'
      const smokeY = topY - 14 - Math.abs(Math.sin(time * 2)) * 5
      ctx.beginPath()
      ctx.arc(x, smokeY, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x + 3, smokeY - 4, 3, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'commercial': {
      // Shop sign
      ctx.fillStyle = '#FDE68A'
      ctx.globalAlpha = 0.6 + Math.sin(time * 4) * 0.3
      ctx.fillRect(x - 8, topY - 2, 16, 5)
      break
    }
    case 'residential': {
      // Triangular roof peak
      ctx.fillStyle = '#B45309'
      ctx.beginPath()
      ctx.moveTo(x - 12, topY + 2)
      ctx.lineTo(x, topY - 8)
      ctx.lineTo(x + 12, topY + 2)
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'university': {
      // Flag on top
      ctx.strokeStyle = '#A78BFA'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(x, topY)
      ctx.lineTo(x, topY - 14)
      ctx.stroke()
      ctx.fillStyle = '#8B5CF6'
      ctx.beginPath()
      ctx.moveTo(x, topY - 14)
      ctx.lineTo(x + 8, topY - 11)
      ctx.lineTo(x, topY - 8)
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'government': {
      // Columns
      ctx.strokeStyle = '#9CA3AF'
      ctx.lineWidth = 2
      for (let c = -1; c <= 1; c++) {
        ctx.beginPath()
        ctx.moveTo(x + c * 6, y - h + 5)
        ctx.lineTo(x + c * 6, y - 2)
        ctx.stroke()
      }
      // Pediment
      ctx.fillStyle = '#6B7280'
      ctx.beginPath()
      ctx.moveTo(x - 12, topY + 3)
      ctx.lineTo(x, topY - 5)
      ctx.lineTo(x + 12, topY + 3)
      ctx.closePath()
      ctx.fill()
      break
    }
  }
  ctx.restore()
}

// Mentor figure
function drawMentor(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  ctx.save()
  // Body
  ctx.fillStyle = '#F59E0B'
  ctx.beginPath()
  ctx.arc(x, y - 8, 4, 0, Math.PI * 2)
  ctx.fill()
  // Head
  ctx.fillStyle = '#FBBF24'
  ctx.beginPath()
  ctx.arc(x, y - 14, 3, 0, Math.PI * 2)
  ctx.fill()
  // Walking bounce
  const bounce = Math.abs(Math.sin(time * 6)) * 2
  ctx.fillStyle = '#F59E0B'
  ctx.fillRect(x - 2, y - 4 - bounce, 4, 4)
  ctx.restore()
}

function createM10Particle(type: M10Particle['type'], x: number, y: number): M10Particle {
  const colors = type === 'sparkle'
    ? ['#FBBF24', '#F59E0B', '#FDE68A', '#E5E7EB']
    : type === 'funding'
    ? ['#F59E0B', '#FBBF24', '#FCD34D']
    : ['#E0E7FF', '#C7D2FE', '#A5B4FC']

  return {
    x: x + (Math.random() - 0.5) * 20,
    y,
    vx: (Math.random() - 0.5) * 0.5,
    vy: type === 'funding' ? (Math.random() * 0.5 + 0.5) : -(Math.random() * 0.3 + 0.1),
    life: 1,
    maxLife: type === 'funding' ? 80 : 100,
    type,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: type === 'sparkle' ? 2 : type === 'funding' ? 3 : 1.5,
  }
}

/* --- Component --- */

export default function EntrepreneurMission10({ userId, onComplete }: EntrepreneurMission10Props) {
  const locale = useLocale()
  const t = (ru: string, ar: string, en: string) => locale === 'ru' ? ru : locale === 'ar' ? ar : en
  const tIndustry = (name: string) => locale === 'ru' ? (INDUSTRY_NAMES_RU[name] || name) : locale === 'ar' ? (INDUSTRY_NAMES_AR[name] || name) : name
  const tStage = (name: string) => locale === 'ru' ? (STAGE_NAMES_RU[name] || name) : locale === 'ar' ? (STAGE_NAMES_AR[name] || name) : name
  const tTag = (tag: string) => locale === 'ru' ? (TAG_NAMES_RU[tag] || tag) : locale === 'ar' ? (TAG_NAMES_AR[tag] || tag) : tag
  const ZONES = locale === 'ru' ? ZONES_RU : locale === 'ar' ? ZONES_AR : ZONES_EN
  const MENTORS = locale === 'ru' ? MENTORS_RU : locale === 'ar' ? MENTORS_AR : MENTORS_EN
  const [phase, setPhase] = useState<'intro' | 'select' | 'place' | 'connect' | 'fund' | 'mentor' | 'simulate' | 'done'>('intro')

  // Selected startups (max 6)
  const [selectedStartups, setSelectedStartups] = useState<Set<string>>(new Set())

  // Zone placement
  const [placements, setPlacements] = useState<Record<string, Zone>>({})

  // Partnerships (pairs of startup IDs)
  const [partnerships, setPartnerships] = useState<[string, string][]>([])
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)

  // Fund allocation
  const [fundSliders, setFundSliders] = useState<Record<string, number>>({})

  // Mentor assignments
  const [mentorAssignments, setMentorAssignments] = useState<Record<string, string>>({}) // mentorId -> startupId

  // Simulation
  const [simMonth, setSimMonth] = useState(0)
  const [simResults, setSimResults] = useState<Record<string, { growth: number; status: string }>>({})

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({
    phase: 'intro' as string,
    placements: {} as Record<string, Zone>,
    partnerships: [] as [string, string][],
    mentorAssignments: {} as Record<string, string>,
    simResults: {} as Record<string, { growth: number; status: string }>,
    simMonth: 0,
    selectedStartups: new Set<string>(),
  })
  const particlesRef = useRef<M10Particle[]>([])
  const mentorPosRef = useRef<{ x: number; y: number; targetX: number; targetY: number }>({ x: 300, y: 150, targetX: 300, targetY: 150 })

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current.phase = phase
    stateRef.current.placements = placements
    stateRef.current.partnerships = partnerships
    stateRef.current.mentorAssignments = mentorAssignments
    stateRef.current.simResults = simResults
    stateRef.current.simMonth = simMonth
    stateRef.current.selectedStartups = selectedStartups
  }, [phase, placements, partnerships, mentorAssignments, simResults, simMonth, selectedStartups])

  const selectedList = useMemo(() =>
    STARTUPS.filter(s => selectedStartups.has(s.id)),
    [selectedStartups]
  )

  const totalFundAllocated = useMemo(() =>
    Object.values(fundSliders).reduce((s, v) => s + v, 0),
    [fundSliders]
  )

  // Diversity: count unique industries
  const industryDiversity = useMemo(() => {
    const industries = new Set(selectedList.map(s => s.industry))
    return industries.size
  }, [selectedList])

  const toggleStartup = useCallback((id: string) => {
    setSelectedStartups(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < 6) {
        next.add(id)
      }
      return next
    })
  }, [])

  const handlePlaceStartup = useCallback((startupId: string, zone: Zone) => {
    setPlacements(prev => ({ ...prev, [startupId]: zone }))
  }, [])

  const handleConnect = useCallback((startupId: string) => {
    if (!connectingFrom) {
      setConnectingFrom(startupId)
    } else if (connectingFrom === startupId) {
      setConnectingFrom(null)
    } else {
      // Check if partnership already exists
      const exists = partnerships.some(
        ([a, b]) => (a === connectingFrom && b === startupId) || (a === startupId && b === connectingFrom)
      )
      if (!exists) {
        setPartnerships(prev => [...prev, [connectingFrom, startupId]])
      }
      setConnectingFrom(null)
    }
  }, [connectingFrom, partnerships])

  const removePartnership = useCallback((index: number) => {
    setPartnerships(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleRunSimulation = useCallback(() => {
    setPhase('simulate')

    // Calculate results for each startup
    const results: Record<string, { growth: number; status: string }> = {}

    for (const s of selectedList) {
      let score = 50 // base

      // Zone fit
      const zone = placements[s.id]
      const zoneData = ZONES.find(z => z.id === zone)
      const zoneFit = s.synergyTags.some(tag => zoneData?.bestFor.includes(tag))
      if (zoneFit) score += 15

      // Partnerships (synergy)
      const partnerCount = partnerships.filter(([a, b]) => a === s.id || b === s.id).length
      const synergyPartners = partnerships.filter(([a, b]) => {
        const partnerId = a === s.id ? b : b === s.id ? a : null
        if (!partnerId) return false
        const partner = STARTUPS.find(st => st.id === partnerId)
        return partner && partner.synergyTags.some(tag => s.synergyTags.includes(tag))
      }).length
      score += synergyPartners * 10 + (partnerCount - synergyPartners) * 3

      // Funding adequacy
      const funding = fundSliders[s.id] || 0
      const fundingRatio = funding / (s.fundingNeeded * 1000)
      score += Math.min(20, Math.round(fundingRatio * 20))

      // Mentor boost
      const mentorEntry = Object.entries(mentorAssignments).find(([, sId]) => sId === s.id)
      if (mentorEntry) {
        const mentor = MENTORS.find(m => m.id === mentorEntry[0])
        if (mentor) {
          if (mentor.boostSkill === 'tech' && s.techSkill < 4) score += 10
          if (mentor.boostSkill === 'business' && s.bizSkill < 4) score += 10
          if (mentor.boostSkill === 'marketing' && s.mktSkill < 4) score += 10
        }
      }

      results[s.id] = {
        growth: Math.min(100, Math.max(0, score)),
        status: score >= 70 ? 'Thriving' : score >= 50 ? 'Stable' : 'Struggling',
      }
    }

    setSimResults(results)

    // Animate months
    let month = 0
    const interval = setInterval(() => {
      month++
      setSimMonth(month)
      if (month >= 12) clearInterval(interval)
    }, 300)
  }, [selectedList, placements, partnerships, fundSliders, mentorAssignments])

  const handleFinish = useCallback(() => {
    // startup_selection: 500 (diverse + complementary)
    const diversityRatio = industryDiversity / 6 // max 6 different industries out of 6 selected
    const stageVariety = new Set(selectedList.map(s => s.stage)).size
    const selectionScore = Math.round(500 * (diversityRatio * 0.7 + (stageVariety >= 2 ? 0.3 : 0.1)))

    // partnerships: 350 (synergy score)
    let synergyTotal = 0
    for (const [a, b] of partnerships) {
      const sA = STARTUPS.find(s => s.id === a)
      const sB = STARTUPS.find(s => s.id === b)
      if (sA && sB) {
        const shared = sA.synergyTags.filter(t => sB.synergyTags.includes(t)).length
        synergyTotal += shared > 0 ? 2 : 0.5
      }
    }
    const maxSynergy = 6 // rough max
    const partnershipScore = Math.round(350 * Math.min(1, synergyTotal / maxSynergy))

    // fund_allocation: 150
    const thriving = Object.values(simResults).filter(r => r.status === 'Thriving').length
    const fundScore = Math.round(150 * (thriving / Math.max(1, selectedList.length)))

    const totalScore = Math.min(1000, selectionScore + partnershipScore + fundScore)

    setPhase('done')
    onComplete?.(totalScore, [
      { label: t('Выбор стартапов', 'اختيار الشركات الناشئة', 'Startup Selection'), value: selectionScore, max: 500 },
      { label: t('Партнёрства', 'الشراكات', 'Partnerships'), value: partnershipScore, max: 350 },
      { label: t('Распределение фонда', 'توزيع التمويل', 'Fund Allocation'), value: fundScore, max: 150 },
    ])
  }, [selectedList, partnerships, simResults, industryDiversity, onComplete])

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
      bgGrad.addColorStop(0.6, '#1E293B')
      bgGrad.addColorStop(1, '#0F172A')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

      // Isometric ground grid
      ctx.strokeStyle = 'rgba(100,116,139,0.08)'
      ctx.lineWidth = 1
      for (let i = 0; i < 20; i++) {
        ctx.beginPath()
        ctx.moveTo(i * 40 - 100, 0)
        ctx.lineTo(i * 40 + 100, CANVAS_H)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(0, i * 20)
        ctx.lineTo(CANVAS_W, i * 20)
        ctx.stroke()
      }

      const state = stateRef.current
      const isSimulating = state.phase === 'simulate' || state.phase === 'done'

      // Draw zone buildings
      const zoneEntries = Object.entries(ZONE_POSITIONS) as [Zone, { x: number; y: number }][]
      for (const [zoneId, pos] of zoneEntries) {
        const colors = ZONE_COLORS[zoneId]
        const zoneData = ZONES.find(z => z.id === zoneId)

        // Determine building height based on startups placed
        const startupsHere = Object.entries(state.placements).filter(([, z]) => z === zoneId)
        const baseH = 30
        const bonusH = startupsHere.length * 8
        const h = baseH + bonusH

        // Glow/dim based on sim results
        let glowAlpha = 0
        let dimAlpha = 0
        if (isSimulating && state.simMonth >= 12) {
          const startupIds = startupsHere.map(([id]) => id)
          const statuses = startupIds.map(id => state.simResults[id]?.status)
          const hasThrive = statuses.some(s => s === 'Thriving')
          const hasStruggle = statuses.some(s => s === 'Struggling')
          if (hasThrive) glowAlpha = 0.5 + Math.sin(time * 3) * 0.3
          if (hasStruggle && !hasThrive) dimAlpha = 0.5
        }

        drawIsoBuilding10(ctx, pos.x, pos.y, 40, h, 14, colors.top, colors.left, colors.right, glowAlpha, dimAlpha)
        drawZoneDecoration(ctx, zoneId, pos.x, pos.y, h, time)

        // Zone label
        ctx.fillStyle = '#9CA3AF'
        ctx.font = 'bold 8px sans-serif'
        ctx.textAlign = 'center'
        ctx.globalAlpha = 0.7
        ctx.fillText(zoneData?.label || '', pos.x, pos.y + 14)
        ctx.globalAlpha = 1

        // Startup dots on buildings
        for (let si = 0; si < startupsHere.length; si++) {
          const startup = STARTUPS.find(s => s.id === startupsHere[si][0])
          if (!startup) continue
          const dotX = pos.x - 10 + (si % 3) * 10
          const dotY = pos.y - h + 8 + Math.floor(si / 3) * 10

          // Color based on sim result
          let dotColor = '#60A5FA'
          if (isSimulating && state.simMonth >= 12) {
            const result = state.simResults[startup.id]
            if (result?.status === 'Thriving') dotColor = '#22C55E'
            else if (result?.status === 'Struggling') dotColor = '#EF4444'
            else dotColor = '#F59E0B'
          }

          ctx.fillStyle = dotColor
          ctx.beginPath()
          ctx.arc(dotX, dotY, 3, 0, Math.PI * 2)
          ctx.fill()

          // Name label
          ctx.fillStyle = '#E5E7EB'
          ctx.font = '6px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(startup.name.substring(0, 6), dotX, dotY + 8)
        }
      }

      // Synergy connection lines between partnered startups
      for (const [aId, bId] of state.partnerships) {
        const aZone = state.placements[aId]
        const bZone = state.placements[bId]
        if (!aZone || !bZone) continue
        const aPos = ZONE_POSITIONS[aZone]
        const bPos = ZONE_POSITIONS[bZone]
        if (!aPos || !bPos) continue

        const sA = STARTUPS.find(s => s.id === aId)
        const sB = STARTUPS.find(s => s.id === bId)
        const hasSynergy = sA && sB && sA.synergyTags.some(t => sB.synergyTags.includes(t))

        // Glowing arc
        const midX = (aPos.x + bPos.x) / 2
        const midY = Math.min(aPos.y, bPos.y) - 30

        ctx.strokeStyle = hasSynergy ? '#A855F7' : '#6B7280'
        ctx.lineWidth = hasSynergy ? 2 : 1
        ctx.globalAlpha = 0.4 + (hasSynergy ? Math.sin(time * 3) * 0.3 : 0)

        if (hasSynergy) {
          ctx.shadowColor = '#A855F7'
          ctx.shadowBlur = 8
        }

        ctx.beginPath()
        ctx.moveTo(aPos.x, aPos.y - 20)
        ctx.quadraticCurveTo(midX, midY, bPos.x, bPos.y - 20)
        ctx.stroke()

        ctx.shadowBlur = 0
        ctx.globalAlpha = 1
      }

      // Mentor figure walking between buildings
      if (state.phase === 'mentor' || state.phase === 'simulate' || state.phase === 'done') {
        // Pick a random assigned building as target
        const assignedStartupIds = Object.values(state.mentorAssignments)
        if (assignedStartupIds.length > 0) {
          const targetIdx = Math.floor((time * 0.3) % assignedStartupIds.length)
          const targetStartupId = assignedStartupIds[targetIdx]
          const targetZone = state.placements[targetStartupId]
          if (targetZone) {
            const targetPos = ZONE_POSITIONS[targetZone]
            mentorPosRef.current.targetX = targetPos.x
            mentorPosRef.current.targetY = targetPos.y - 10
          }
        }

        // Smooth movement toward target
        const mp = mentorPosRef.current
        mp.x += (mp.targetX - mp.x) * 0.02
        mp.y += (mp.targetY - mp.y) * 0.02
        drawMentor(ctx, mp.x, mp.y, time)
      }

      // Funding visualization: golden particles from top
      if ((state.phase === 'fund' || state.phase === 'mentor' || state.phase === 'simulate') && spawnTimer % 8 === 0) {
        const zoneKeys = Object.keys(state.placements) as string[]
        if (zoneKeys.length > 0) {
          const randKey = zoneKeys[Math.floor(Math.random() * zoneKeys.length)]
          const zone = state.placements[randKey]
          if (zone) {
            const pos = ZONE_POSITIONS[zone]
            particlesRef.current.push(createM10Particle('funding', pos.x + (Math.random() - 0.5) * 30, 0))
          }
        }
      }

      // Ambient sparkles
      if (spawnTimer % 20 === 0) {
        const rx = Math.random() * CANVAS_W
        const ry = Math.random() * CANVAS_H
        particlesRef.current.push(createM10Particle('sparkle', rx, ry))
      }

      // Light particles
      if (spawnTimer % 30 === 0) {
        particlesRef.current.push(createM10Particle('light', Math.random() * CANVAS_W, CANVAS_H + 5))
      }

      // Update and draw particles
      const alive: M10Particle[] = []
      for (let i = 0; i < particlesRef.current.length; i++) {
        const p = particlesRef.current[i]
        p.x += p.vx
        p.y += p.vy
        p.life -= 1 / p.maxLife

        if (p.life > 0 && p.y < CANVAS_H + 10 && p.y > -10) {
          ctx.save()
          ctx.globalAlpha = Math.min(1, p.life * 2) * 0.7

          if (p.type === 'sparkle') {
            // 4-pointed star
            ctx.fillStyle = p.color
            const sparkSize = p.size * (0.5 + Math.sin(time * 8 + p.x) * 0.5)
            ctx.beginPath()
            ctx.moveTo(p.x, p.y - sparkSize)
            ctx.lineTo(p.x + sparkSize * 0.3, p.y)
            ctx.lineTo(p.x, p.y + sparkSize)
            ctx.lineTo(p.x - sparkSize * 0.3, p.y)
            ctx.closePath()
            ctx.fill()
          } else if (p.type === 'funding') {
            ctx.fillStyle = p.color
            ctx.font = `${p.size * 3}px sans-serif`
            ctx.textAlign = 'center'
            ctx.fillText('$', p.x, p.y)
          } else {
            ctx.fillStyle = p.color
            ctx.beginPath()
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
            ctx.fill()
          }
          ctx.restore()
          alive.push(p)
        }
      }
      particlesRef.current = alive

      // Phase label
      ctx.fillStyle = '#475569'
      ctx.font = 'bold 9px sans-serif'
      ctx.textAlign = 'left'
      ctx.globalAlpha = 0.5
      const phaseLabel = locale === 'ru'
        ? (state.phase === 'intro' ? 'КАМПУС ИНКУБАТОРА' :
          state.phase === 'select' ? 'ВЫБОР СТАРТАПОВ' :
          state.phase === 'place' ? 'РАЗМЕЩЕНИЕ В ЗОНАХ' :
          state.phase === 'connect' ? 'СОЗДАНИЕ СИНЕРГИЙ' :
          state.phase === 'fund' ? 'РАСПРЕДЕЛЕНИЕ ФОНДА' :
          state.phase === 'mentor' ? 'НАЗНАЧЕНИЕ МЕНТОРОВ' :
          state.phase === 'simulate' ? `СИМУЛЯЦИЯ - МЕСЯЦ ${state.simMonth}` :
          'РЕЗУЛЬТАТЫ ЭКОСИСТЕМЫ')
        : locale === 'ar'
        ? (state.phase === 'intro' ? 'حَرَم الحاضنة' :
          state.phase === 'select' ? 'اختيار الشركات الناشئة' :
          state.phase === 'place' ? 'التوزيع في المناطق' :
          state.phase === 'connect' ? 'إنشاء التآزر' :
          state.phase === 'fund' ? 'توزيع التمويل' :
          state.phase === 'mentor' ? 'تعيين المرشدين' :
          state.phase === 'simulate' ? `المحاكاة - الشهر ${state.simMonth}` :
          'نتائج المنظومة')
        : (state.phase === 'intro' ? 'INCUBATOR CAMPUS' :
          state.phase === 'select' ? 'SELECT STARTUPS' :
          state.phase === 'place' ? 'PLACE IN ZONES' :
          state.phase === 'connect' ? 'CREATE SYNERGIES' :
          state.phase === 'fund' ? 'ALLOCATE FUNDING' :
          state.phase === 'mentor' ? 'ASSIGN MENTORS' :
          state.phase === 'simulate' ? `SIMULATION - MONTH ${state.simMonth}` :
          'ECOSYSTEM RESULTS')
      ctx.fillText(phaseLabel, 10, 15)
      ctx.globalAlpha = 1

      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animId)
  }, [])

  /* --- Canvas element --- */
  const canvasElement = (
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
        {canvasElement}
        <div className="p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black text-white mb-3">{t('Экосистема BRICS City', 'منظومة BRICS City', 'BRICS City Ecosystem')}</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              {locale === 'ru'
                ? <>Построй <span className="text-amber-400 font-bold">стартап-экосистему</span> для своего города. Выбери стартапы, размести их в нужных зонах, создай партнёрства и распредели <span className="text-green-400 font-bold">фонд $1 млн</span>.</>
                : locale === 'ar'
                ? <>ابنِ <span className="text-amber-400 font-bold">منظومة شركات ناشئة</span> لمدينتك. اختر الشركات، وزّعها في المناطق المناسبة، وأنشئ شراكات، ووزّع <span className="text-green-400 font-bold">صندوق مليون دولار</span>.</>
                : <>Build a <span className="text-amber-400 font-bold">startup ecosystem</span> for your city. Select startups, place them in the right zones, create partnerships, and allocate your <span className="text-green-400 font-bold"> $1M fund</span>.</>
              }
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-4 mb-6 space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">{t('Твои задачи', 'مهامك', 'Your Tasks')}</h3>
            <div className="flex items-start gap-3 text-sm">
              <span className="text-blue-400 text-lg">{'\u{1F4CB}'}</span>
              <p className="text-gray-300">
                {locale === 'ru'
                  ? <>Выбери <span className="text-blue-400 font-bold">6 стартапов</span> из 12 кандидатов. Разнообразие важно — выбирай дополняющие отрасли.</>
                  : locale === 'ar'
                  ? <>اختر <span className="text-blue-400 font-bold">6 شركات ناشئة</span> من أصل 12 مرشحًا. التنوع مهم — اختر قطاعات متكاملة.</>
                  : <>Choose <span className="text-blue-400 font-bold">6 startups</span> from 12 candidates. Diversity matters -- pick complementary industries.</>
                }
              </p>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <span className="text-green-400 text-lg">{'\u{1F5FA}'}</span>
              <p className="text-gray-300">
                {locale === 'ru'
                  ? <>Размести стартапы в <span className="text-green-400 font-bold">зонах города</span> (Технохаб, Промышленная, Коммерческая и др.). Совпадение усиливает результат.</>
                  : locale === 'ar'
                  ? <>وزّع الشركات في <span className="text-green-400 font-bold">مناطق المدينة</span> (مركز التقنية، صناعية، تجارية، إلخ). التطابق يعزز الأداء.</>
                  : <>Place startups in <span className="text-green-400 font-bold">city zones</span> (Tech Hub, Industrial, Commercial, etc.). Matching boosts performance.</>
                }
              </p>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <span className="text-purple-400 text-lg">{'\u{1F517}'}</span>
              <p className="text-gray-300">
                {locale === 'ru'
                  ? <>Создай <span className="text-purple-400 font-bold">партнёрства</span> между стартапами. Общие технологии дают синергию.</>
                  : locale === 'ar'
                  ? <>أنشئ <span className="text-purple-400 font-bold">شراكات</span> بين الشركات الناشئة. التقنيات المشتركة تخلق تآزرًا.</>
                  : <>Create <span className="text-purple-400 font-bold">partnerships</span> between startups. Shared technologies create synergy.</>
                }
              </p>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <span className="text-amber-400 text-lg">{'\u{1F4B0}'}</span>
              <p className="text-gray-300">
                {locale === 'ru'
                  ? <>Распредели <span className="text-amber-400 font-bold">фонд $1 млн</span> и назначь <span className="text-amber-400 font-bold">3 менторов</span>. Затем запусти 12-месячную симуляцию.</>
                  : locale === 'ar'
                  ? <>وزّع <span className="text-amber-400 font-bold">صندوق مليون دولار</span> وعيّن <span className="text-amber-400 font-bold">3 مرشدين</span>. ثم شغّل محاكاة لمدة 12 شهرًا.</>
                  : <>Distribute <span className="text-amber-400 font-bold">$1M fund</span> and assign <span className="text-amber-400 font-bold">3 mentors</span>. Then run a 12-month simulation.</>
                }
              </p>
            </div>
          </div>

          <button
            onClick={() => setPhase('select')}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-lg rounded-xl transition-colors"
          >
            {'\u{1F3D9}'} {t('Начать строить экосистему', 'ابدأ بناء المنظومة', 'Start Building Ecosystem')}
          </button>
        </div>
      </div>
    )
  }

  /* --- Render: Done --- */
  if (phase === 'done') {
    const thriving = Object.values(simResults).filter(r => r.status === 'Thriving').length
    return (
      <div className="bg-[var(--brand-panel)] border border-green-500/40 rounded-2xl overflow-hidden">
        {canvasElement}
        <div className="p-8 text-center">
          <p className={`text-lg font-bold ${thriving >= 4 ? 'text-green-400' : 'text-yellow-400'}`}>
            {thriving >= 4
              ? t(`Экосистема процветает! ${thriving} стартапов растут.`, `Ecosystem is thriving! ${thriving} startups are growing.`)
              : t(`Экосистеме нужна доработка. Только ${thriving} стартапов процветают.`, `Ecosystem needs work. Only ${thriving} startups are thriving.`)}
          </p>
          <p className="text-gray-400 text-sm mt-2">{t('Проверь результаты выше.', 'تحقق من النتائج أعلاه.', 'Check your results above.')}</p>
        </div>
      </div>
    )
  }

  /* --- Render: Simulation --- */
  if (phase === 'simulate') {
    return (
      <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl overflow-hidden">
        {canvasElement}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700">
          <span className="text-xs text-gray-400 font-bold">{t('Миссия 10: Симуляция экосистемы', 'المهمة 10: محاكاة المنظومة', 'Mission 10: Ecosystem Simulation')}</span>
          <span className="text-xs text-amber-400 font-bold">{t('Месяц', 'الشهر', 'Month')} {simMonth}/12</span>
        </div>

        <div className="px-4 pt-3">
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full transition-all duration-300" style={{ width: `${(simMonth / 12) * 100}%` }} />
          </div>
        </div>

        <div className="p-4 space-y-3">
          {selectedList.map(s => {
            const result = simResults[s.id]
            const revealed = simMonth >= 12
            return (
              <div
                key={s.id}
                className={`p-3 rounded-xl border transition-all ${
                  revealed
                    ? result?.status === 'Thriving'
                      ? 'border-green-600/50 bg-green-900/20'
                      : result?.status === 'Stable'
                      ? 'border-yellow-600/50 bg-yellow-900/20'
                      : 'border-red-600/50 bg-red-900/20'
                    : 'border-gray-700 bg-gray-800/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-white">{s.name}</div>
                    <div className="text-[10px] text-gray-400">{tIndustry(s.industry)} | {ZONES.find(z => z.id === placements[s.id])?.label || '?'}</div>
                  </div>
                  {revealed && result && (
                    <div className="text-right">
                      <span className={`text-xs font-black ${
                        result.status === 'Thriving' ? 'text-green-400' : result.status === 'Stable' ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {result.status === 'Thriving' ? t('Растёт', 'مزدهر', 'Thriving') : result.status === 'Stable' ? t('Стабильно', 'مستقر', 'Stable') : t('Трудности', 'يعاني', 'Struggling')}
                      </span>
                      <div className="w-20 h-1.5 bg-gray-700 rounded-full mt-1">
                        <div
                          className={`h-full rounded-full ${
                            result.growth >= 70 ? 'bg-green-500' : result.growth >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${result.growth}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {!revealed && (
                    <div className="flex gap-0.5">
                      {Array.from({ length: 12 }, (_, i) => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full ${simMonth > i ? 'bg-amber-400' : 'bg-gray-600'}`} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {simMonth >= 12 && (
            <button
              onClick={handleFinish}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors"
            >
              {t('Посмотреть результаты', 'عرض النتائج النهائية', 'See Final Results')}
            </button>
          )}
        </div>
      </div>
    )
  }

  /* --- Render: Mentor Assignment --- */
  if (phase === 'mentor') {
    return (
      <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl overflow-hidden">
        {canvasElement}
        <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
          <span className="text-xs text-gray-400 font-bold">{t('Миссия 10: Назначение менторов', 'المهمة 10: تعيين المرشدين', 'Mission 10: Assign Mentors')}</span>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-purple-950/40 border border-purple-800/50 rounded-xl p-3">
            <p className="text-sm text-gray-300">
              {locale === 'ru'
                ? <>Назначь каждого ментора стартапу, которому его навык нужнее всего. Каждый ментор усиливает одну область: <span className="text-blue-400">технологии</span>, <span className="text-green-400">бизнес</span> или <span className="text-amber-400">маркетинг</span>.</>
                : locale === 'ar'
                ? <>عيّن كل مرشد للشركة التي تحتاج مهارته أكثر. كل مرشد يعزز مجالًا واحدًا: <span className="text-blue-400">التقنية</span>، <span className="text-green-400">الأعمال</span>، أو <span className="text-amber-400">التسويق</span>.</>
                : <>Assign each mentor to a startup that needs their skill most. Each mentor boosts one area: <span className="text-blue-400">tech</span>, <span className="text-green-400"> business</span>, or <span className="text-amber-400"> marketing</span>.</>
              }
            </p>
          </div>

          {MENTORS.map(mentor => (
            <div key={mentor.id} className="bg-gray-900/50 border border-gray-700 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{'\u{1F9D1}\u200D\u{1F3EB}'}</span>
                <div>
                  <div className="text-sm font-bold text-white">{mentor.name}</div>
                  <div className="text-[10px] text-gray-400">{mentor.description}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {selectedList.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setMentorAssignments(prev => ({ ...prev, [mentor.id]: s.id }))}
                    className={`p-2 text-[10px] rounded-lg border transition-all text-center ${
                      mentorAssignments[mentor.id] === s.id
                        ? 'border-purple-500 bg-purple-900/30 text-white font-bold'
                        : 'border-gray-700 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="flex gap-3">
            <button
              onClick={() => setPhase('fund')}
              className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-colors"
            >
              {t('Назад', 'رجوع', 'Back')}
            </button>
            <button
              onClick={handleRunSimulation}
              disabled={Object.keys(mentorAssignments).length < 3}
              className={`flex-1 px-4 py-3 font-bold rounded-xl transition-colors ${
                Object.keys(mentorAssignments).length >= 3
                  ? 'bg-green-600 hover:bg-green-500 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {t('Запустить симуляцию', 'تشغيل محاكاة 12 شهرًا', 'Run 12-Month Sim')} {'\u{1F680}'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* --- Render: Fund Allocation --- */
  if (phase === 'fund') {
    return (
      <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl overflow-hidden">
        {canvasElement}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700">
          <span className="text-xs text-gray-400 font-bold">{t('Миссия 10: Распределение фонда', 'المهمة 10: توزيع التمويل', 'Mission 10: Fund Allocation')}</span>
          <span className={`text-xs font-bold ${totalFundAllocated <= TOTAL_FUND ? 'text-green-400' : 'text-red-400'}`}>
            ${totalFundAllocated.toLocaleString()} / ${TOTAL_FUND.toLocaleString()}
          </span>
        </div>

        <div className="p-4 space-y-3">
          {selectedList.map(s => (
            <div key={s.id}>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className="text-sm font-bold text-white">{s.name}</span>
                  <span className="text-[10px] text-gray-500 ml-2">{t('нужно', 'يحتاج', 'needs')} ${s.fundingNeeded}K</span>
                </div>
                <span className="text-sm font-black text-amber-400">${((fundSliders[s.id] || 0) / 1000).toFixed(0)}K</span>
              </div>
              <input
                type="range"
                min={0}
                max={500000}
                step={10000}
                value={fundSliders[s.id] || 0}
                onChange={(e) => setFundSliders(prev => ({ ...prev, [s.id]: Number(e.target.value) }))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          ))}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setPhase('connect')}
              className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-colors"
            >
              {t('Назад', 'رجوع', 'Back')}
            </button>
            <button
              onClick={() => setPhase('mentor')}
              className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors"
            >
              {t('Назначить менторов', 'تعيين المرشدين', 'Assign Mentors')} {'\u{1F9D1}\u200D\u{1F3EB}'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* --- Render: Connect Partnerships --- */
  if (phase === 'connect') {
    return (
      <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl overflow-hidden">
        {canvasElement}
        <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
          <span className="text-xs text-gray-400 font-bold">{t('Миссия 10: Создание партнёрств', 'المهمة 10: إنشاء الشراكات', 'Mission 10: Create Partnerships')}</span>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-purple-950/40 border border-purple-800/50 rounded-xl p-3">
            <p className="text-sm text-gray-300">
              {locale === 'ru'
                ? <>Нажми на один стартап, затем на другой, чтобы создать партнёрство. Стартапы с <span className="text-purple-400 font-bold">общими технологиями</span> получают бонус синергии.</>
                : locale === 'ar'
                ? <>انقر على شركة ناشئة، ثم على أخرى لإنشاء شراكة. الشركات ذات <span className="text-purple-400 font-bold">التقنيات المشتركة</span> تحصل على مكافأة تآزر.</>
                : <>Click one startup, then click another to create a partnership. Startups with <span className="text-purple-400 font-bold">shared technology tags</span> get synergy bonuses.</>
              }
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {selectedList.map(s => (
              <button
                key={s.id}
                onClick={() => handleConnect(s.id)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  connectingFrom === s.id
                    ? 'border-purple-500 bg-purple-900/30 ring-2 ring-purple-400/50'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
                }`}
              >
                <div className="text-sm font-bold text-white">{s.name}</div>
                <div className="text-[10px] text-gray-400">{tIndustry(s.industry)}</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {s.synergyTags.map(tag => (
                    <span key={tag} className="px-1 py-0.5 text-[9px] bg-gray-700 text-gray-300 rounded">{tTag(tag)}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>

          {/* Partnership list */}
          {partnerships.length > 0 && (
            <div>
              <div className="text-[10px] text-gray-500 font-bold mb-1">{t('ПАРТНЁРСТВА', 'الشراكات', 'PARTNERSHIPS')} ({partnerships.length})</div>
              <div className="space-y-1">
                {partnerships.map(([a, b], i) => {
                  const sA = STARTUPS.find(s => s.id === a)
                  const sB = STARTUPS.find(s => s.id === b)
                  const hasSynergy = sA && sB && sA.synergyTags.some(t => sB.synergyTags.includes(t))
                  return (
                    <div key={i} className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg">
                      <span className="text-xs text-gray-300">
                        {sA?.name} {'\u{1F517}'} {sB?.name}
                        {hasSynergy && <span className="text-green-400 ml-1">{t('Синергия!', 'تآزر!', 'Synergy!')}</span>}
                      </span>
                      <button onClick={() => removePartnership(i)} className="text-red-400 text-xs hover:text-red-300">{t('Удалить', 'حذف', 'Remove')}</button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setPhase('place')}
              className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-colors"
            >
              {t('Назад', 'رجوع', 'Back')}
            </button>
            <button
              onClick={() => {
                // Initialize fund sliders
                const initial: Record<string, number> = {}
                for (const s of selectedList) {
                  initial[s.id] = Math.round(TOTAL_FUND / selectedList.length)
                }
                setFundSliders(initial)
                setPhase('fund')
              }}
              className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors"
            >
              {t('Распределить фонд', 'توزيع التمويل', 'Allocate Funds')} {'\u{1F4B0}'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* --- Render: Place on Map --- */
  if (phase === 'place') {
    const allPlaced = selectedList.every(s => placements[s.id])
    return (
      <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl overflow-hidden">
        {canvasElement}
        <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
          <span className="text-xs text-gray-400 font-bold">{t('Миссия 10: Размещение в зонах', 'المهمة 10: التوزيع في المناطق', 'Mission 10: Place in City Zones')}</span>
        </div>

        <div className="p-4 space-y-4">
          {/* City zones */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ZONES.map(zone => {
              const placedHere = selectedList.filter(s => placements[s.id] === zone.id)
              return (
                <div key={zone.id} className="bg-gray-900/50 border border-gray-700 rounded-xl p-3">
                  <div className="text-lg mb-1">{zone.icon}</div>
                  <div className="text-xs font-bold text-white">{zone.label}</div>
                  <div className="text-[9px] text-gray-500 mb-2">{t('Лучше для', 'الأفضل لـ', 'Best')}: {zone.bestFor.map(tTag).join(', ')}</div>
                  {placedHere.map(s => (
                    <div key={s.id} className="text-[10px] text-green-400 font-bold">{s.name}</div>
                  ))}
                </div>
              )
            })}
          </div>

          {/* Startup assignment */}
          {selectedList.map(s => (
            <div key={s.id} className="bg-gray-900/50 border border-gray-700 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-bold text-white">{s.name}</span>
                  <span className="text-[10px] text-gray-400 ml-2">{tIndustry(s.industry)}</span>
                  <span className="text-[9px] text-gray-500 ml-1">({s.synergyTags.map(tTag).join(', ')})</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {ZONES.map(zone => (
                  <button
                    key={zone.id}
                    onClick={() => handlePlaceStartup(s.id, zone.id)}
                    className={`px-2 py-1 text-[10px] rounded font-bold transition-colors ${
                      placements[s.id] === zone.id
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    {zone.icon} {zone.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="flex gap-3">
            <button
              onClick={() => setPhase('select')}
              className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-colors"
            >
              {t('Назад', 'رجوع', 'Back')}
            </button>
            <button
              onClick={() => setPhase('connect')}
              disabled={!allPlaced}
              className={`flex-1 px-4 py-3 font-bold rounded-xl transition-colors ${
                allPlaced
                  ? 'bg-purple-600 hover:bg-purple-500 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {t('Создать партнёрства', 'إنشاء شراكات', 'Create Partnerships')} {'\u{1F517}'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* --- Render: Select Startups --- */
  return (
    <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl overflow-hidden">
      {canvasElement}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700">
        <span className="text-xs text-gray-400 font-bold">{t('Миссия 10: Выбор стартапов', 'المهمة 10: اختيار الشركات الناشئة', 'Mission 10: Select Startups')}</span>
        <span className="text-xs text-amber-400 font-bold">{selectedStartups.size}/6 {t('выбрано', 'محدد', 'selected')}</span>
      </div>

      <div className="p-4 space-y-3">
        <div className="text-xs text-gray-500 mb-2">
          {t('Выбери 6 стартапов для финансирования. Разнообразие отраслей = сильная экосистема.', 'اختر 6 شركات ناشئة للتمويل. التنوع في القطاعات = منظومة أقوى.', 'Choose 6 startups to fund. Diversity across industries = stronger ecosystem.')}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {STARTUPS.map(s => {
            const isSelected = selectedStartups.has(s.id)
            const disabled = !isSelected && selectedStartups.size >= 6
            return (
              <button
                key={s.id}
                onClick={() => !disabled && toggleStartup(s.id)}
                disabled={disabled}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? 'border-green-500 bg-green-900/20'
                    : disabled
                    ? 'border-gray-800 bg-gray-900/30 opacity-40 cursor-not-allowed'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-white">{s.name}</div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    s.stage === 'Series A' ? 'bg-purple-900/50 text-purple-300'
                    : s.stage === 'Seed' ? 'bg-blue-900/50 text-blue-300'
                    : 'bg-gray-700 text-gray-300'
                  }`}>
                    {tStage(s.stage)}
                  </span>
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">{tIndustry(s.industry)} | {t('Нужно', 'يحتاج', 'Needs')} ${s.fundingNeeded}K</div>
                <div className="flex gap-2 mt-1">
                  <span className="text-[9px] text-blue-400">{locale === 'ru' ? 'Тех' : locale === 'ar' ? 'تقنية' : 'Tech'}:{s.techSkill}</span>
                  <span className="text-[9px] text-green-400">{locale === 'ru' ? 'Биз' : locale === 'ar' ? 'أعمال' : 'Biz'}:{s.bizSkill}</span>
                  <span className="text-[9px] text-amber-400">{locale === 'ru' ? 'Мрк' : locale === 'ar' ? 'تسويق' : 'Mkt'}:{s.mktSkill}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {s.synergyTags.map(tag => (
                    <span key={tag} className="px-1 py-0.5 text-[9px] bg-gray-700 text-gray-300 rounded">{tTag(tag)}</span>
                  ))}
                </div>
              </button>
            )
          })}
        </div>

        <div className="flex justify-between items-center pt-2">
          <div className="text-xs text-gray-500">
            {industryDiversity} {t('уникальных отраслей выбрано', 'قطاعات فريدة محددة', 'unique industries selected')}
          </div>
          <button
            onClick={() => setPhase('place')}
            disabled={selectedStartups.size < 6}
            className={`px-6 py-3 font-bold rounded-xl transition-colors ${
              selectedStartups.size >= 6
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {t('Разместить на карте', 'وضع على الخريطة', 'Place on Map')} {'\u{1F5FA}'}
          </button>
        </div>
      </div>
    </div>
  )
}
