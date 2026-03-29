'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useLocale } from 'next-intl'

/* --- Types --- */

interface Candidate {
  id: number
  name: string
  role: 'Dev' | 'Design' | 'Marketing'
  salary: number
  skills: number
  trait: string
  conflictNote?: string
}

export interface ScoreBreakdownItem {
  label: string
  value: number
  max: number
}

interface EntrepreneurMission2Props {
  userId: string
  onComplete?: (score: number, breakdown: ScoreBreakdownItem[]) => void
}

/* --- Data --- */

const CANDIDATES: Candidate[] = [
  { id: 1, name: 'Alex',   role: 'Dev',       salary: 5000, skills: 4, trait: 'Team player' },
  { id: 2, name: 'Sam',    role: 'Dev',       salary: 7000, skills: 5, trait: 'Loner',
    conflictNote: 'Prefers working alone. Clashes with perfectionists who demand everyone meets their standards.' },
  { id: 3, name: 'Jordan', role: 'Dev',       salary: 3000, skills: 2, trait: 'Eager learner',
    conflictNote: 'Still learning the ropes. Needs an experienced mentor on the team to grow.' },
  { id: 4, name: 'Riley',  role: 'Design',    salary: 4000, skills: 3, trait: 'Creative' },
  { id: 5, name: 'Casey',  role: 'Design',    salary: 6000, skills: 5, trait: 'Perfectionist',
    conflictNote: 'Demands everyone meets their high standards. Clashes with loners who prefer independence.' },
  { id: 6, name: 'Morgan', role: 'Marketing', salary: 4000, skills: 3, trait: 'Energetic' },
  { id: 7, name: 'Taylor', role: 'Marketing', salary: 6000, skills: 4, trait: 'Strategic' },
  { id: 8, name: 'Jamie',  role: 'Marketing', salary: 3000, skills: 2, trait: 'Social butterfly',
    conflictNote: 'Junior and social. Without an experienced teammate, there is no one to learn from.' },
]

const BUDGET = 15000

// Conflict pairs: [id1, id2, reason]
const CONFLICTS: { ids: [number, number]; reason: string }[] = [
  {
    ids: [2, 5],
    reason: 'These two strong personalities will clash -- Sam prefers working alone while Casey demands everyone meets their standards.',
  },
  {
    ids: [3, 8],
    reason: 'Both are junior -- your team needs at least one experienced member to mentor them.',
  },
]

const ROLE_COLORS: Record<string, string> = {
  Dev: 'text-blue-400 bg-blue-900/40 border-blue-700',
  Design: 'text-purple-400 bg-purple-900/40 border-purple-700',
  Marketing: 'text-green-400 bg-green-900/40 border-green-700',
}

const ROLE_ICONS: Record<string, string> = {
  Dev: '\u{1F4BB}',
  Design: '\u{1F3A8}',
  Marketing: '\u{1F4E3}',
}

/* --- Localization maps --- */

const ROLES_RU: Record<string, string> = {
  'Dev': 'Разработка',
  'Design': 'Дизайн',
  'Marketing': 'Маркетинг',
}

const TRAITS_RU: Record<string, string> = {
  'Team player': 'Командный игрок',
  'Loner': 'Одиночка',
  'Eager learner': 'Любознательный',
  'Creative': 'Креативный',
  'Perfectionist': 'Перфекционист',
  'Energetic': 'Энергичный',
  'Strategic': 'Стратег',
  'Social butterfly': 'Душа компании',
}

const CONFLICT_NOTES_RU: Record<string, string> = {
  'Prefers working alone. Clashes with perfectionists who demand everyone meets their standards.':
    'Предпочитает работать в одиночку. Конфликтует с перфекционистами, которые требуют от всех высоких стандартов.',
  'Still learning the ropes. Needs an experienced mentor on the team to grow.':
    'Ещё учится. Нужен опытный наставник в команде для роста.',
  'Demands everyone meets their high standards. Clashes with loners who prefer independence.':
    'Требует от всех высоких стандартов. Конфликтует с одиночками, предпочитающими независимость.',
  'Junior and social. Without an experienced teammate, there is no one to learn from.':
    'Новичок и общительный. Без опытного коллеги не у кого учиться.',
}

const CONFLICT_REASONS_RU: Record<string, string> = {
  'These two strong personalities will clash -- Sam prefers working alone while Casey demands everyone meets their standards.':
    'Эти две сильные личности будут конфликтовать — Sam предпочитает работать один, а Casey требует от всех высоких стандартов.',
  'Both are junior -- your team needs at least one experienced member to mentor them.':
    'Оба новички — команде нужен хотя бы один опытный участник для наставничества.',
}

const ROLES_AR: Record<string, string> = {
  'Dev': 'تطوير',
  'Design': 'تصميم',
  'Marketing': 'تسويق',
}

const TRAITS_AR: Record<string, string> = {
  'Team player': 'لاعب فريق',
  'Loner': 'انطوائي',
  'Eager learner': 'متعلم شغوف',
  'Creative': 'مبدع',
  'Perfectionist': 'ساعٍ للكمال',
  'Energetic': 'نشيط',
  'Strategic': 'استراتيجي',
  'Social butterfly': 'اجتماعي',
}

const CONFLICT_NOTES_AR: Record<string, string> = {
  'Prefers working alone. Clashes with perfectionists who demand everyone meets their standards.':
    'يفضل العمل وحده. يتعارض مع من يطالب الجميع بمعايير عالية.',
  'Still learning the ropes. Needs an experienced mentor on the team to grow.':
    'لا يزال يتعلم. يحتاج مرشدًا خبيرًا في الفريق للتطور.',
  'Demands everyone meets their high standards. Clashes with loners who prefer independence.':
    'يطالب الجميع بمعايير عالية. يتعارض مع من يفضل الاستقلالية.',
  'Junior and social. Without an experienced teammate, there is no one to learn from.':
    'مبتدئ واجتماعي. بدون زميل خبير لا يوجد من يتعلم منه.',
}

const CONFLICT_REASONS_AR: Record<string, string> = {
  'These two strong personalities will clash -- Sam prefers working alone while Casey demands everyone meets their standards.':
    'هاتان الشخصيتان القويتان ستتعارضان — Sam يفضل العمل وحده بينما Casey يطالب الجميع بمعاييره العالية.',
  'Both are junior -- your team needs at least one experienced member to mentor them.':
    'كلاهما مبتدئ — فريقك يحتاج عضوًا خبيرًا واحدًا على الأقل لتوجيههم.',
}

/* --- Helpers --- */

function hasConflict(hiredIds: number[]): boolean {
  for (const c of CONFLICTS) {
    if (hiredIds.includes(c.ids[0]) && hiredIds.includes(c.ids[1])) return true
  }
  return false
}

function getConflictInfo(hiredIds: number[]): { names: string; reason: string }[] {
  const results: { names: string; reason: string }[] = []
  for (const c of CONFLICTS) {
    if (hiredIds.includes(c.ids[0]) && hiredIds.includes(c.ids[1])) {
      const nameA = CANDIDATES.find(cand => cand.id === c.ids[0])!.name
      const nameB = CANDIDATES.find(cand => cand.id === c.ids[1])!.name
      results.push({ names: `${nameA} & ${nameB}`, reason: c.reason })
    }
  }
  return results
}

/**
 * Star rating using filled/empty unicode stars (not emoji) so CSS color works.
 * Filled star = solid color, empty star = dim gray.
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

/* --- 2.5D Isometric Office Canvas Header --- */

const OFFICE_CANVAS_W = 600
const OFFICE_CANVAS_H = 160

interface OfficeParticle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  type: 'steam' | 'paper'
  life: number
}

function createOfficeParticles(): OfficeParticle[] {
  const particles: OfficeParticle[] = []
  for (let i = 0; i < 12; i++) {
    particles.push({
      x: Math.random() * OFFICE_CANVAS_W,
      y: Math.random() * OFFICE_CANVAS_H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -Math.random() * 0.4 - 0.1,
      size: Math.random() * 2 + 1,
      alpha: Math.random() * 0.4 + 0.1,
      type: Math.random() > 0.6 ? 'steam' : 'paper',
      life: Math.random() * 200 + 100,
    })
  }
  return particles
}

function drawIsoDeskTile(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  tw: number,
  th: number,
  topColor: string,
  sideColor: string,
  depth: number,
) {
  // Top face
  ctx.beginPath()
  ctx.moveTo(cx, cy - th / 2)
  ctx.lineTo(cx + tw / 2, cy)
  ctx.lineTo(cx, cy + th / 2)
  ctx.lineTo(cx - tw / 2, cy)
  ctx.closePath()
  ctx.fillStyle = topColor
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'
  ctx.lineWidth = 0.5
  ctx.stroke()

  if (depth > 0) {
    // Right side
    ctx.beginPath()
    ctx.moveTo(cx + tw / 2, cy)
    ctx.lineTo(cx, cy + th / 2)
    ctx.lineTo(cx, cy + th / 2 + depth)
    ctx.lineTo(cx + tw / 2, cy + depth)
    ctx.closePath()
    ctx.fillStyle = sideColor
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.1)'
    ctx.stroke()

    // Left side
    ctx.beginPath()
    ctx.moveTo(cx - tw / 2, cy)
    ctx.lineTo(cx, cy + th / 2)
    ctx.lineTo(cx, cy + th / 2 + depth)
    ctx.lineTo(cx - tw / 2, cy + depth)
    ctx.closePath()
    ctx.fillStyle = sideColor
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.08)'
    ctx.stroke()
  }
}

function drawOfficeDesk(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  hasWorker: boolean,
  showQuestion: boolean,
  time: number,
  workerColor: string,
) {
  // Desk surface (isometric rectangle)
  drawIsoDeskTile(ctx, cx, cy, 50, 25, '#8B6F47', '#6B5535', 8)

  // Chair behind desk
  drawIsoDeskTile(ctx, cx - 5, cy + 16, 18, 9, '#4A4A5A', '#3A3A4A', 4)

  // Monitor on desk
  ctx.fillStyle = '#1E293B'
  ctx.fillRect(cx - 6, cy - 18, 12, 10)
  ctx.fillStyle = '#3B82F6'
  ctx.fillRect(cx - 5, cy - 17, 10, 8)
  // Monitor stand
  ctx.fillStyle = '#666'
  ctx.fillRect(cx - 1, cy - 8, 2, 4)

  // Coffee mug
  ctx.fillStyle = '#D97706'
  ctx.beginPath()
  ctx.arc(cx + 14, cy - 6, 3, 0, Math.PI * 2)
  ctx.fill()

  if (hasWorker) {
    const bounce = Math.sin(time * 3) * 1

    // Worker body
    ctx.fillStyle = workerColor
    ctx.beginPath()
    ctx.arc(cx - 5, cy + 6 + bounce, 6, 0, Math.PI * 2)
    ctx.fill()

    // Worker head
    ctx.fillStyle = '#F5DEB3'
    ctx.beginPath()
    ctx.arc(cx - 5, cy + bounce, 4, 0, Math.PI * 2)
    ctx.fill()

    // Typing animation (arms moving)
    const armOffset = Math.sin(time * 8) * 2
    ctx.strokeStyle = workerColor
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(cx - 8, cy + 5 + bounce)
    ctx.lineTo(cx - 2 + armOffset, cy - 3)
    ctx.moveTo(cx - 2, cy + 5 + bounce)
    ctx.lineTo(cx + 2 - armOffset, cy - 3)
    ctx.stroke()

    // Screen glow when typing
    const screenBrightness = 0.3 + Math.sin(time * 4) * 0.1
    ctx.fillStyle = `rgba(59,130,246,${screenBrightness})`
    ctx.fillRect(cx - 5, cy - 17, 10, 8)

    // Coffee steam
    ctx.strokeStyle = `rgba(255,255,255,${0.3 + Math.sin(time * 2) * 0.15})`
    ctx.lineWidth = 0.8
    const steamX = cx + 14
    const steamBaseY = cy - 9
    ctx.beginPath()
    ctx.moveTo(steamX, steamBaseY)
    ctx.quadraticCurveTo(steamX + 2 * Math.sin(time * 3), steamBaseY - 5, steamX + Math.sin(time * 2), steamBaseY - 10)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(steamX + 2, steamBaseY)
    ctx.quadraticCurveTo(steamX + 2 - 2 * Math.sin(time * 3 + 1), steamBaseY - 4, steamX + 2 + Math.sin(time * 2 + 1), steamBaseY - 8)
    ctx.stroke()
  }

  if (showQuestion) {
    // Pulsing "?" marker
    const pulse = 0.8 + Math.sin(time * 3) * 0.2
    ctx.globalAlpha = pulse
    ctx.fillStyle = '#F59E0B'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('?', cx - 5, cy + 4)
    ctx.globalAlpha = 1

    // Glow around question mark
    const glowGrad = ctx.createRadialGradient(cx - 5, cy + 2, 0, cx - 5, cy + 2, 12)
    glowGrad.addColorStop(0, 'rgba(245,158,11,0.2)')
    glowGrad.addColorStop(1, 'rgba(245,158,11,0)')
    ctx.fillStyle = glowGrad
    ctx.beginPath()
    ctx.arc(cx - 5, cy + 2, 12, 0, Math.PI * 2)
    ctx.fill()
  }
}

const DESK_POSITIONS = [
  { x: 100, y: 60 },
  { x: 220, y: 50 },
  { x: 340, y: 65 },
  { x: 460, y: 55 },
  { x: 160, y: 100 },
  { x: 390, y: 95 },
]

const WORKER_COLORS = ['#3B82F6', '#8B5CF6', '#22C55E', '#EF4444', '#F59E0B', '#EC4899']

function IsometricOfficeCanvas({ hiredCount, label }: { hiredCount: number; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const timeRef = useRef(0)
  const particlesRef = useRef<OfficeParticle[]>(createOfficeParticles())
  const animFrameRef = useRef(0)

  useEffect(() => {
    let active = true

    const loop = () => {
      if (!active) return
      const ctx = ctxRef.current
      if (!ctx) {
        animFrameRef.current = requestAnimationFrame(loop)
        return
      }

      timeRef.current += 0.016
      const t = timeRef.current

      // Clear
      ctx.clearRect(0, 0, OFFICE_CANVAS_W, OFFICE_CANVAS_H)

      // Office background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, OFFICE_CANVAS_H)
      bgGrad.addColorStop(0, '#1a1a2e')
      bgGrad.addColorStop(1, '#16213e')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, OFFICE_CANVAS_W, OFFICE_CANVAS_H)

      // Floor tiles (isometric grid)
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 14; col++) {
          const fx = col * 48 - row * 10 - 20
          const fy = 30 + row * 22
          const isEven = (row + col) % 2 === 0
          drawIsoDeskTile(ctx, fx, fy, 48, 22, isEven ? '#2A2A3E' : '#252538', '#1E1E30', 0)
        }
      }

      // Wall at the back
      ctx.fillStyle = '#2D3748'
      ctx.fillRect(0, 0, OFFICE_CANVAS_W, 25)
      ctx.fillStyle = '#374151'
      ctx.fillRect(0, 25, OFFICE_CANVAS_W, 2)

      // Wall decorations (whiteboard, clock)
      // Whiteboard
      ctx.fillStyle = '#F8FAFC'
      ctx.fillRect(180, 4, 60, 18)
      ctx.strokeStyle = '#94A3B8'
      ctx.lineWidth = 1
      ctx.strokeRect(180, 4, 60, 18)
      // Some scribbles on whiteboard
      ctx.strokeStyle = '#3B82F6'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(185, 10)
      ctx.lineTo(210, 12)
      ctx.lineTo(195, 16)
      ctx.lineTo(230, 14)
      ctx.stroke()

      // Clock
      ctx.fillStyle = '#1E293B'
      ctx.beginPath()
      ctx.arc(400, 14, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#60A5FA'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(400, 14, 8, 0, Math.PI * 2)
      ctx.stroke()
      // Clock hands
      const clockAngle1 = t * 0.2
      const clockAngle2 = t * 2.5
      ctx.strokeStyle = '#F8FAFC'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(400, 14)
      ctx.lineTo(400 + Math.cos(clockAngle1) * 5, 14 + Math.sin(clockAngle1) * 5)
      ctx.stroke()
      ctx.strokeStyle = '#EF4444'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(400, 14)
      ctx.lineTo(400 + Math.cos(clockAngle2) * 6, 14 + Math.sin(clockAngle2) * 6)
      ctx.stroke()

      // Plant in corner
      ctx.fillStyle = '#4A3728'
      ctx.fillRect(30, 22, 10, 12)
      ctx.fillStyle = '#22C55E'
      ctx.beginPath()
      ctx.arc(35, 18, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#16A34A'
      ctx.beginPath()
      ctx.arc(32, 20, 5, 0, Math.PI * 2)
      ctx.fill()

      // Draw desks
      // First 2 desks always have existing workers, rest are empty until hired
      for (let i = 0; i < DESK_POSITIONS.length; i++) {
        const pos = DESK_POSITIONS[i]
        const isExistingWorker = i < 2
        const isNewHire = !isExistingWorker && (i - 2) < hiredCount
        const hasWorker = isExistingWorker || isNewHire
        const showQuestion = !isExistingWorker && !isNewHire

        drawOfficeDesk(
          ctx,
          pos.x,
          pos.y,
          hasWorker,
          showQuestion,
          t,
          WORKER_COLORS[i % WORKER_COLORS.length],
        )
      }

      // Ambient particles (steam and paper)
      const particles = particlesRef.current
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        p.life -= 1

        if (p.life <= 0) {
          p.x = Math.random() * OFFICE_CANVAS_W
          p.y = OFFICE_CANVAS_H + 5
          p.vy = -Math.random() * 0.4 - 0.1
          p.alpha = Math.random() * 0.4 + 0.1
          p.life = Math.random() * 200 + 100
        }

        // Wrap
        if (p.y < -5) {
          p.y = OFFICE_CANVAS_H + 5
          p.x = Math.random() * OFFICE_CANVAS_W
        }

        ctx.globalAlpha = p.alpha * (p.life > 50 ? 1 : p.life / 50)

        if (p.type === 'steam') {
          ctx.fillStyle = 'rgba(255,255,255,0.3)'
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.fillStyle = 'rgba(248,250,252,0.2)'
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate(t * 0.5 + p.x)
          ctx.fillRect(-p.size, -p.size * 0.6, p.size * 2, p.size * 1.2)
          ctx.restore()
        }

        ctx.globalAlpha = 1
      }

      // Label
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.font = '9px sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(label, OFFICE_CANVAS_W - 10, OFFICE_CANVAS_H - 6)

      animFrameRef.current = requestAnimationFrame(loop)
    }

    animFrameRef.current = requestAnimationFrame(loop)

    return () => {
      active = false
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [hiredCount, label])

  const canvasReady = useCallback((canvas: HTMLCanvasElement | null) => {
    ctxRef.current = null
    canvasRef.current = null
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvasRef.current = canvas
    ctxRef.current = ctx
  }, [])

  return (
    <div className="bg-gray-900 rounded-t-xl border-b border-gray-700 overflow-hidden">
      <canvas
        ref={canvasReady}
        width={OFFICE_CANVAS_W}
        height={OFFICE_CANVAS_H}
        className="block w-full"
        style={{ maxHeight: '160px' }}
      />
    </div>
  )
}

/* --- Main Component --- */

export default function EntrepreneurMission2({ userId, onComplete }: EntrepreneurMission2Props) {
  const locale = useLocale()
  const ru = locale === 'ru'
  const ar = locale === 'ar'
  const [hiredIds, setHiredIds] = useState<number[]>([])
  const [phase, setPhase] = useState<'hiring' | 'simulation' | 'done'>('hiring')
  const [simStep, setSimStep] = useState(0)

  // Derived state
  const hiredCandidates = useMemo(
    () => CANDIDATES.filter(c => hiredIds.includes(c.id)),
    [hiredIds],
  )
  const totalSalary = useMemo(
    () => hiredCandidates.reduce((sum, c) => sum + c.salary, 0),
    [hiredCandidates],
  )
  const withinBudget = totalSalary <= BUDGET
  const coveredRoles = useMemo(
    () => new Set(hiredCandidates.map(c => c.role)),
    [hiredCandidates],
  )
  const allRolesCovered = coveredRoles.size === 3
  const teamHasConflict = hasConflict(hiredIds)
  const conflictDetails = getConflictInfo(hiredIds)

  // Toggle hire
  const toggleHire = useCallback((id: number) => {
    setHiredIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 3) return prev
      return [...prev, id]
    })
  }, [])

  // Start simulation
  const handleStartMonth = useCallback(() => {
    if (hiredIds.length !== 3) return
    setPhase('simulation')
    setSimStep(0)
  }, [hiredIds])

  // Advance simulation
  const advanceSim = useCallback(() => {
    if (simStep < 3) {
      setSimStep(prev => prev + 1)
    } else {
      // Calculate score
      const roleCount = coveredRoles.size
      const roleCoverage = roleCount === 3 ? 350 : roleCount === 2 ? 200 : 100
      const avgSkills = hiredCandidates.reduce((s, c) => s + c.skills, 0) / Math.max(hiredCandidates.length, 1)
      const teamQuality = Math.round(avgSkills * 70)
      const budgetScore = withinBudget ? 150 : 0
      const compatScore = teamHasConflict ? 50 : 150
      const totalScore = Math.min(1000, roleCoverage + teamQuality + budgetScore + compatScore)

      setPhase('done')

      onComplete?.(totalScore, [
        { label: ru ? 'Покрытие ролей' : ar ? 'تغطية الأدوار' : 'Role coverage', value: roleCoverage, max: 350 },
        { label: ru ? 'Качество команды' : ar ? 'جودة الفريق' : 'Team quality', value: teamQuality, max: 350 },
        { label: ru ? 'Управление бюджетом' : ar ? 'إدارة الميزانية' : 'Budget management', value: budgetScore, max: 150 },
        { label: ru ? 'Совместимость команды' : ar ? 'توافق الفريق' : 'Team compatibility', value: compatScore, max: 150 },
      ])
    }
  }, [simStep, coveredRoles, hiredCandidates, withinBudget, teamHasConflict, onComplete, ru, ar])

  /* --- Simulation Messages --- */
  const simMessages = useMemo(() => {
    const msgs: { text: string; type: 'good' | 'bad' | 'neutral' }[] = []

    // Step 0: week 1
    msgs.push({ text: ru ? 'Неделя 1: Команда начинает работу над первым спринтом...' : ar ? 'الأسبوع 1: الفريق يبدأ العمل على أول سبرنت...' : 'Week 1: The team starts working on the first sprint...', type: 'neutral' })

    // Step 1: role check
    if (allRolesCovered) {
      msgs.push({ text: ru ? 'Все три ключевые роли закрыты! Разработка, дизайн и маркетинг двигаются вперёд вместе.' : ar ? 'جميع الأدوار الثلاثة مغطاة! التطوير والتصميم والتسويق يتقدمون معًا.' : 'All three key roles are covered! Development, design, and marketing are moving forward together.', type: 'good' })
    } else {
      const missing = ['Dev', 'Design', 'Marketing'].filter(r => !coveredRoles.has(r as 'Dev' | 'Design' | 'Marketing'))
      const missingText = ru ? missing.map(r => ROLES_RU[r] || r).join(' или ') : ar ? missing.map(r => ROLES_AR[r] || r).join(' أو ') : missing.join(' or ')
      msgs.push({ text: ru ? `Проблема: Никто не закрывает ${missingText}! Важная работа отстаёт.` : ar ? `مشكلة: لا أحد يغطي ${missingText}! العمل المهم يتأخر.` : `Problem: No one covers ${missingText}! Important work is falling behind.`, type: 'bad' })
    }

    // Step 2: conflicts
    if (teamHasConflict) {
      const conflictText = conflictDetails.map(c => `${c.names}: ${ru ? (CONFLICT_REASONS_RU[c.reason] || c.reason) : ar ? (CONFLICT_REASONS_AR[c.reason] || c.reason) : c.reason}`).join(' ')
      msgs.push({ text: ru ? `Конфликт! ${conflictText}` : ar ? `تنبيه تعارض! ${conflictText}` : `Conflict alert! ${conflictText}`, type: 'bad' })
    } else {
      msgs.push({ text: ru ? 'Команда отлично ладит! Сотрудничество идёт гладко, все поддерживают друг друга.' : ar ? 'الفريق متناغم! التعاون سلس والجميع يدعم بعضهم البعض.' : 'The team gets along great! Collaboration is smooth and everyone supports each other.', type: 'good' })
    }

    // Step 3: budget
    if (withinBudget) {
      msgs.push({ text: ru ? `Месяц завершён! Зарплаты: $${totalSalary.toLocaleString()}/мес. В рамках бюджета $${(BUDGET).toLocaleString()}. Отлично!` : ar ? `اكتمل الشهر! الرواتب: $${totalSalary.toLocaleString()}/شهر. ضمن ميزانية $${(BUDGET).toLocaleString()}. أحسنت!` : `Month complete! Total salary: $${totalSalary.toLocaleString()}/mo. Within the $${(BUDGET).toLocaleString()} budget. Well managed!`, type: 'good' })
    } else {
      msgs.push({ text: ru ? `Месяц завершён! Зарплаты: $${totalSalary.toLocaleString()}/мес. Это на $${(totalSalary - BUDGET).toLocaleString()} БОЛЬШЕ бюджета! Так долго не протянуть.` : ar ? `اكتمل الشهر! الرواتب: $${totalSalary.toLocaleString()}/شهر. تجاوزت الميزانية بـ $${(totalSalary - BUDGET).toLocaleString()}! غير مستدام.` : `Month complete! Total salary: $${totalSalary.toLocaleString()}/mo. That's $${(totalSalary - BUDGET).toLocaleString()} OVER budget! Not sustainable.`, type: 'bad' })
    }

    return msgs
  }, [allRolesCovered, coveredRoles, teamHasConflict, conflictDetails, withinBudget, totalSalary, ru, ar])

  /* --- Render: Done --- */
  if (phase === 'done') {
    return (
      <div className="bg-[var(--brand-panel)] border border-green-500/40 rounded-2xl p-8 text-center">
        <div className="text-6xl mb-4">&#x1F465;</div>
        <p className="text-lg font-bold text-green-400">{ru ? 'Команда собрана!' : ar ? 'تم تشكيل الفريق!' : 'Team assembled!'}</p>
        <p className="text-gray-400 text-sm mt-2">{ru ? 'Месяц завершён. Проверьте результаты выше.' : ar ? 'اكتمل الشهر. تحقق من النتائج أعلاه.' : 'Your month is complete. Check your results above.'}</p>
      </div>
    )
  }

  /* --- Render: Simulation --- */
  if (phase === 'simulation') {
    return (
      <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl p-6">
        <h2 className="text-xl font-black text-white mb-2">{ru ? 'Симуляция месяца' : ar ? 'محاكاة الشهر' : 'Month Simulation'}</h2>
        <p className="text-gray-400 text-sm mb-6">{ru ? 'Наблюдаем, как ваша команда работает вместе один месяц...' : ar ? 'نشاهد كيف يعمل فريقك معًا لمدة شهر...' : 'Watching your team work together for one month...'}</p>

        {/* Team summary */}
        <div className="flex gap-3 mb-6 justify-center flex-wrap">
          {hiredCandidates.map(c => (
            <div key={c.id} className={`px-4 py-2 rounded-xl border ${ROLE_COLORS[c.role]}`}>
              <span className="mr-1">{ROLE_ICONS[c.role]}</span>
              <span className="font-bold text-sm">{c.name}</span>
            </div>
          ))}
        </div>

        {/* Messages */}
        <div className="space-y-3 mb-6">
          {simMessages.slice(0, simStep + 1).map((msg, i) => (
            <div
              key={i}
              className={`p-4 rounded-xl border text-sm font-medium animate-in fade-in slide-in-from-bottom-2 ${
                msg.type === 'good'
                  ? 'bg-green-900/30 border-green-700 text-green-300'
                  : msg.type === 'bad'
                  ? 'bg-red-900/30 border-red-700 text-red-300'
                  : 'bg-gray-800/50 border-gray-600 text-gray-300'
              }`}
            >
              {msg.text}
            </div>
          ))}
        </div>

        <button
          onClick={advanceSim}
          className="w-full px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors"
        >
          {simStep < 3 ? (ru ? 'Продолжить...' : ar ? 'متابعة...' : 'Continue...') : (ru ? 'Результаты' : ar ? 'عرض النتائج' : 'See Results')}
        </button>
      </div>
    )
  }

  /* --- Render: Hiring Phase --- */
  return (
    <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl overflow-hidden">
      {/* 2.5D Isometric Office Canvas Header */}
      <IsometricOfficeCanvas hiredCount={hiredIds.length} label={ru ? 'Ваш офис' : ar ? 'مكتبك' : 'Your Office'} />

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700">
        <span className="text-xs text-gray-400 font-bold">{ru ? 'Миссия 2: Команда мечты' : ar ? 'المهمة 2: فريق الأحلام' : 'Mission 2: Dream Team'}</span>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400">
            {ru ? 'Нанято' : ar ? 'تم التوظيف' : 'Hired'}: <span className="text-white font-bold">{hiredIds.length}</span>/3
          </span>
        </div>
      </div>

      {/* Briefing panel */}
      <div className="px-4 py-4 bg-indigo-950/40 border-b border-indigo-800/50">
        <h3 className="text-sm font-bold text-indigo-300 mb-2">{ru ? 'Ваша миссия' : ar ? 'مهمتك' : 'Your Mission'}</h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          <li className="flex items-start gap-2">
            <span className="text-indigo-400 mt-0.5">&#x2022;</span>
            {ru
              ? <>Наймите <span className="font-bold text-white">3 членов команды</span> для стартапа: разработчика, дизайнера и маркетолога.</>
              : ar
              ? <>وظّف <span className="font-bold text-white">3 أعضاء فريق</span> لشركتك الناشئة: مطوّر ومصمم ومسوّق.</>
              : <>Hire <span className="font-bold text-white">3 team members</span> for your startup: one Developer, one Designer, and one Marketer.</>}
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-400 mt-0.5">&#x26A0;</span>
            {ru
              ? <>Следите за <span className="font-bold text-yellow-300">конфликтами характеров</span> — некоторые люди не уживаются вместе!</>
              : ar
              ? <>انتبه لـ<span className="font-bold text-yellow-300">تعارضات الشخصيات</span> — بعض الأشخاص لا يعملون معًا بشكل جيد!</>
              : <>Watch out for <span className="font-bold text-yellow-300">personality conflicts</span> -- some people don&apos;t work well together!</>}
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5">&#x1F4B0;</span>
            {ru
              ? <>Уложитесь в бюджет <span className="font-bold text-green-300">${BUDGET.toLocaleString()}/мес</span>.</>
              : ar
              ? <>التزم بميزانية <span className="font-bold text-green-300">${BUDGET.toLocaleString()}/شهر</span>.</>
              : <>Stay within your <span className="font-bold text-green-300">${BUDGET.toLocaleString()}/month</span> budget.</>}
          </li>
        </ul>
      </div>

      {/* Budget bar */}
      <div className="px-4 py-3 bg-gray-900/50 border-b border-gray-700">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400 font-bold">{ru ? 'Месячный бюджет' : ar ? 'الميزانية الشهرية' : 'Monthly Budget'}</span>
          <span className={`text-xs font-bold ${withinBudget ? 'text-green-400' : 'text-red-400'}`}>
            ${totalSalary.toLocaleString()} / ${BUDGET.toLocaleString()}
          </span>
        </div>
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              withinBudget ? 'bg-green-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(100, (totalSalary / BUDGET) * 100)}%` }}
          />
        </div>
        {!allRolesCovered && hiredIds.length > 0 && (
          <p className="text-yellow-400 text-xs mt-1">
            {ru ? 'Не хватает' : ar ? 'ناقص' : 'Missing'}: {['Dev', 'Design', 'Marketing'].filter(r => !coveredRoles.has(r as 'Dev' | 'Design' | 'Marketing')).map(r => ru ? (ROLES_RU[r] || r) : ar ? (ROLES_AR[r] || r) : r).join(', ')}
          </p>
        )}
        {conflictDetails.length > 0 && (
          <div className="mt-2 space-y-1">
            {conflictDetails.map((c, i) => (
              <div key={i} className="bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2">
                <p className="text-red-400 text-xs font-bold">{c.names} {ru ? 'будут конфликтовать!' : ar ? 'سيتعارضون!' : 'will conflict!'}</p>
                <p className="text-red-300/70 text-xs mt-0.5">{ru ? (CONFLICT_REASONS_RU[c.reason] || c.reason) : ar ? (CONFLICT_REASONS_AR[c.reason] || c.reason) : c.reason}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Candidate grid */}
      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {CANDIDATES.map(c => {
            const isHired = hiredIds.includes(c.id)
            const cantHire = !isHired && hiredIds.length >= 3

            return (
              <button
                key={c.id}
                onClick={() => toggleHire(c.id)}
                disabled={cantHire}
                className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                  isHired
                    ? 'border-amber-400 bg-amber-900/30 scale-[1.02] shadow-lg shadow-amber-900/20'
                    : cantHire
                    ? 'border-gray-700 bg-gray-800/30 opacity-50 cursor-not-allowed'
                    : 'border-gray-600 bg-gray-800/50 hover:border-gray-400 hover:bg-gray-800'
                }`}
              >
                {isHired && (
                  <span className="absolute top-2 right-2 text-amber-400 text-lg">&#x2713;</span>
                )}

                {/* Name */}
                <div className="text-white font-bold text-sm mb-1">{c.name}</div>

                {/* Role badge */}
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border mb-2 ${ROLE_COLORS[c.role]}`}>
                  <span>{ROLE_ICONS[c.role]}</span>
                  {ru ? (ROLES_RU[c.role] || c.role) : ar ? (ROLES_AR[c.role] || c.role) : c.role}
                </div>

                {/* Salary */}
                <div className="text-gray-300 text-xs mb-1">
                  {ru ? 'Зарплата' : ar ? 'الراتب' : 'Salary'}: <span className="text-white font-bold">${c.salary.toLocaleString()}/{ru ? 'мес' : ar ? 'شهر' : 'mo'}</span>
                </div>

                {/* Skills */}
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-gray-400 text-xs">{ru ? 'Навыки' : ar ? 'المهارات' : 'Skills'}:</span>
                  <StarRating stars={c.skills} />
                </div>

                {/* Trait */}
                <div className="text-gray-500 text-xs italic">&ldquo;{ru ? (TRAITS_RU[c.trait] || c.trait) : ar ? (TRAITS_AR[c.trait] || c.trait) : c.trait}&rdquo;</div>

                {/* Conflict note tooltip */}
                {c.conflictNote && (
                  <div className="mt-2 bg-yellow-900/20 border border-yellow-700/30 rounded-md px-2 py-1">
                    <p className="text-yellow-400/80 text-[10px] leading-tight">
                      &#x26A0; {ru ? (CONFLICT_NOTES_RU[c.conflictNote] || c.conflictNote) : ar ? (CONFLICT_NOTES_AR[c.conflictNote] || c.conflictNote) : c.conflictNote}
                    </p>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Start button */}
        <div className="flex justify-end">
          <button
            onClick={handleStartMonth}
            disabled={hiredIds.length !== 3}
            className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
          >
            {ru ? 'Начать месяц' : ar ? 'بدء الشهر' : 'Start Month'} &#x2192;
          </button>
        </div>
      </div>
    </div>
  )
}
