'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import clsx from 'clsx'
import { useTranslations } from 'next-intl'
import type { ScoreBreakdownItem } from '@/components/missions/common/MissionShell'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WeldPoint {
  id: number
  x: number
  y: number
  label: string
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  type: 'spark' | 'dust' | 'confetti'
}

export interface RobotMission5Props {
  onComplete?: (score: number, breakdown: ScoreBreakdownItem[]) => void
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

// Blueprint is 600x400 canvas. Arm base at (80, 350).
const ARM_BASE = { x: 80, y: 350 }

// All points must be within max reach of 150px from ARM_BASE (80, 350)
const WELD_POINTS: WeldPoint[] = [
  { id: 1, x: 130, y: 310, label: 'W1' },  // dist ~50
  { id: 2, x: 170, y: 270, label: 'W2' },  // dist ~115
  { id: 3, x: 200, y: 330, label: 'W3' },  // dist ~122
  { id: 4, x: 180, y: 250, label: 'W4' },  // dist ~140
  { id: 5, x: 220, y: 300, label: 'W5' },  // dist ~148
]

const MAX_SEGMENT_LENGTH = 50
const MIN_SEGMENT_LENGTH = 10

function distToPoint(point: WeldPoint): number {
  return Math.sqrt((point.x - ARM_BASE.x) ** 2 + (point.y - ARM_BASE.y) ** 2)
}

// ---------------------------------------------------------------------------
// Helper: rounded rectangle
// ---------------------------------------------------------------------------

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

// ---------------------------------------------------------------------------
// Particle system helpers
// ---------------------------------------------------------------------------

function createSparkParticles(cx: number, cy: number, count: number): Particle[] {
  const particles: Particle[] = []
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 1 + Math.random() * 4
    const life = 0.3 + Math.random() * 0.5
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed + (Math.random() - 0.5) * 2,
      life, maxLife: life,
      size: 1 + Math.random() * 2.5,
      color: Math.random() > 0.4 ? '#FFA500' : Math.random() > 0.5 ? '#FFD700' : '#FFFFFF',
      type: 'spark',
    })
  }
  return particles
}

function createDustParticles(W: number, H: number, count: number): Particle[] {
  const particles: Particle[] = []
  for (let i = 0; i < count; i++) {
    const life = 3 + Math.random() * 5
    particles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -0.1 - Math.random() * 0.3,
      life, maxLife: life,
      size: 0.5 + Math.random() * 1.5,
      color: '#8899AA',
      type: 'dust',
    })
  }
  return particles
}

function createConfettiParticles(cx: number, cy: number, count: number): Particle[] {
  const colors = ['#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#A855F7', '#EC4899']
  const particles: Particle[] = []
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 2 + Math.random() * 5
    const life = 1.5 + Math.random() * 1.5
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      life, maxLife: life,
      size: 2 + Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      type: 'confetti',
    })
  }
  return particles
}

function updateParticles(particles: Particle[], dt: number): Particle[] {
  return particles
    .map(p => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy + (p.type === 'confetti' ? 0.08 : 0),
      vy: p.type === 'spark' ? p.vy + 0.1 : p.type === 'confetti' ? p.vy + 0.06 : p.vy,
      life: p.life - dt,
    }))
    .filter(p => p.life > 0)
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    const alpha = Math.max(0, p.life / p.maxLife)
    ctx.globalAlpha = alpha

    if (p.type === 'spark') {
      // Bright spark with glow
      ctx.shadowColor = p.color
      ctx.shadowBlur = 6
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
    } else if (p.type === 'dust') {
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    } else if (p.type === 'confetti') {
      ctx.fillStyle = p.color
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.life * 5)
      ctx.fillRect(-p.size, -p.size / 2, p.size * 2, p.size)
      ctx.restore()
    }
  }
  ctx.globalAlpha = 1
  ctx.shadowBlur = 0
}

// ---------------------------------------------------------------------------
// Isometric floor helpers
// ---------------------------------------------------------------------------

const ISO_TILE_W = 48
const ISO_TILE_H = 24

function drawIsometricFloor(ctx: CanvasRenderingContext2D, W: number, H: number) {
  // Draw isometric diamond tiles on the workshop floor (bottom portion)
  const startY = 300
  const cols = 16
  const rows = 6

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = col * ISO_TILE_W / 2 + row * ISO_TILE_W / 2 - 50
      const cy = startY + (col - row) * ISO_TILE_H / 2

      if (cx < -ISO_TILE_W || cx > W + ISO_TILE_W || cy < startY - 40 || cy > H + 20) continue

      const isEven = (row + col) % 2 === 0

      // Top face
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + ISO_TILE_W / 2, cy - ISO_TILE_H / 2)
      ctx.lineTo(cx + ISO_TILE_W, cy)
      ctx.lineTo(cx + ISO_TILE_W / 2, cy + ISO_TILE_H / 2)
      ctx.closePath()
      ctx.fillStyle = isEven ? '#1A2A3E' : '#162236'
      ctx.fill()
      ctx.strokeStyle = '#1E3A5F44'
      ctx.lineWidth = 0.5
      ctx.stroke()

      // Side face (right)
      const sideH = 8
      ctx.beginPath()
      ctx.moveTo(cx + ISO_TILE_W / 2, cy + ISO_TILE_H / 2)
      ctx.lineTo(cx + ISO_TILE_W, cy)
      ctx.lineTo(cx + ISO_TILE_W, cy + sideH)
      ctx.lineTo(cx + ISO_TILE_W / 2, cy + ISO_TILE_H / 2 + sideH)
      ctx.closePath()
      ctx.fillStyle = isEven ? '#0F1A2A' : '#0C1622'
      ctx.fill()

      // Side face (left)
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + ISO_TILE_W / 2, cy + ISO_TILE_H / 2)
      ctx.lineTo(cx + ISO_TILE_W / 2, cy + ISO_TILE_H / 2 + sideH)
      ctx.lineTo(cx, cy + sideH)
      ctx.closePath()
      ctx.fillStyle = isEven ? '#121E30' : '#0E1926'
      ctx.fill()
    }
  }
}

// ---------------------------------------------------------------------------
// Blueprint Canvas
// ---------------------------------------------------------------------------

function BlueprintCanvas({
  segments,
  precision,
  speed,
  isWelding,
  onWeldEnd,
  t,
}: {
  segments: [number, number, number]
  precision: number
  speed: number
  isWelding: boolean
  onWeldEnd: (reachedPoints: number[]) => void
  t: (key: string) => string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const particlesRef = useRef<Particle[]>([])
  const dustRef = useRef<Particle[]>([])
  const timeRef = useRef<number>(0)
  const weldedTrailRef = useRef<Array<{ x: number; y: number }>>([])

  const totalReach = segments[0] + segments[1] + segments[2]

  // Determine which points are reachable
  const reachable = useMemo(() => {
    return WELD_POINTS.filter(p => distToPoint(p) <= totalReach).map(p => p.id)
  }, [totalReach])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width
    const H = canvas.height

    if (animRef.current) cancelAnimationFrame(animRef.current)

    // Initialize ambient dust
    if (dustRef.current.length === 0) {
      dustRef.current = createDustParticles(W, H, 30)
    }

    if (!isWelding) {
      // Static draw with ambient animation
      weldedTrailRef.current = []
      timeRef.current = 0

      let active = true
      function staticLoop() {
        if (!active || !ctx) return
        timeRef.current += 0.016
        // Refresh dust
        dustRef.current = updateParticles(dustRef.current, 0.016)
        if (dustRef.current.length < 20) {
          dustRef.current = dustRef.current.concat(createDustParticles(W, H, 5))
        }

        ctx.clearRect(0, 0, W, H)
        drawBlueprint(ctx, W, H, totalReach, reachable, null, t, timeRef.current, [], null, dustRef.current)
        animRef.current = requestAnimationFrame(staticLoop)
      }
      animRef.current = requestAnimationFrame(staticLoop)

      return () => {
        active = false
        if (animRef.current) cancelAnimationFrame(animRef.current)
      }
    }

    const DURATION = 4000
    startTimeRef.current = performance.now()
    particlesRef.current = []
    weldedTrailRef.current = []

    function animate(now: number) {
      if (!ctx || !canvas) return
      const elapsed = now - startTimeRef.current
      const progress = Math.min(elapsed / DURATION, 1)
      timeRef.current += 0.016

      // Update particles
      particlesRef.current = updateParticles(particlesRef.current, 0.016)
      dustRef.current = updateParticles(dustRef.current, 0.016)
      if (dustRef.current.length < 15) {
        dustRef.current = dustRef.current.concat(createDustParticles(W, H, 3))
      }

      // Generate sparks at active weld point
      const pointIndex = Math.floor(progress * reachable.length)
      const pointProgress = (progress * reachable.length) - pointIndex
      if (pointIndex < reachable.length && pointProgress > 0.3) {
        const wp = WELD_POINTS.find(p => p.id === reachable[pointIndex])
        if (wp) {
          particlesRef.current = particlesRef.current.concat(createSparkParticles(wp.x, wp.y, 3))
        }
      }

      // Build welded trail
      weldedTrailRef.current = []
      for (let i = 0; i < reachable.length; i++) {
        const thisPhase = progress * reachable.length - i
        if (thisPhase > 1) {
          const wp = WELD_POINTS.find(p => p.id === reachable[i])
          if (wp) weldedTrailRef.current.push({ x: wp.x, y: wp.y })
        }
      }

      // On completion, spawn confetti
      if (progress >= 0.98 && particlesRef.current.filter(p => p.type === 'confetti').length === 0) {
        for (const wp of WELD_POINTS) {
          if (reachable.includes(wp.id)) {
            particlesRef.current = particlesRef.current.concat(createConfettiParticles(wp.x, wp.y, 8))
          }
        }
      }

      ctx.clearRect(0, 0, W, H)
      drawBlueprint(ctx, W, H, totalReach, reachable, progress, t, timeRef.current, weldedTrailRef.current, particlesRef.current, dustRef.current)

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        onWeldEnd(reachable)
      }
    }

    animRef.current = requestAnimationFrame(animate)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWelding, totalReach, reachable])

  return (
    <div className="relative w-full rounded-xl border border-gray-800 overflow-hidden bg-gray-950">
      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        className="w-full"
        style={{ minHeight: 280 }}
      />
      {!isWelding && (
        <div className="absolute bottom-2 left-2 text-gray-600 text-xs pointer-events-none">
          {t('reachInfo')}: {totalReach}cm
        </div>
      )}
    </div>
  )
}

function drawBlueprint(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  totalReach: number,
  reachable: number[],
  weldProgress: number | null,
  t: (key: string) => string,
  time: number,
  weldedTrail: Array<{ x: number; y: number }>,
  sparkParticles: Particle[] | null,
  dustParticles: Particle[],
) {
  // Blueprint background with dark gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H)
  bgGrad.addColorStop(0, '#070E1A')
  bgGrad.addColorStop(1, '#0A1628')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, W, H)

  // Blueprint grid lines with subtle cyan glow
  ctx.strokeStyle = '#0E2A4A'
  ctx.lineWidth = 0.3
  for (let x = 0; x < W; x += 40) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, H)
    ctx.stroke()
  }
  for (let y = 0; y < H; y += 40) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(W, y)
    ctx.stroke()
  }

  // Minor grid (finer lines for technical drawing)
  ctx.strokeStyle = '#0A1E3A'
  ctx.lineWidth = 0.15
  for (let x = 0; x < W; x += 10) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, H)
    ctx.stroke()
  }
  for (let y = 0; y < H; y += 10) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(W, y)
    ctx.stroke()
  }

  // Cyan accent lines (blueprint style)
  ctx.strokeStyle = 'rgba(0, 200, 255, 0.08)'
  ctx.lineWidth = 0.5
  for (let x = 0; x < W; x += 80) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, H)
    ctx.stroke()
  }
  for (let y = 0; y < H; y += 80) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(W, y)
    ctx.stroke()
  }

  // Isometric workshop floor
  drawIsometricFloor(ctx, W, H)

  // Ambient dust particles
  drawParticles(ctx, dustParticles)

  // Bridge structure with metallic look
  ctx.strokeStyle = '#374151'
  ctx.lineWidth = 3
  // Main beam
  ctx.beginPath()
  ctx.moveTo(100, 340)
  ctx.lineTo(560, 340)
  ctx.stroke()

  // Metallic highlight on beam
  ctx.strokeStyle = '#4B5563'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(100, 338)
  ctx.lineTo(560, 338)
  ctx.stroke()

  // Support struts with gradient
  const strutGrad = ctx.createLinearGradient(100, 340, 200, 120)
  strutGrad.addColorStop(0, '#374151')
  strutGrad.addColorStop(1, '#4B5563')
  ctx.strokeStyle = strutGrad
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(100, 340)
  ctx.lineTo(200, 120)
  ctx.lineTo(300, 340)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(300, 340)
  ctx.lineTo(400, 120)
  ctx.lineTo(500, 340)
  ctx.stroke()
  // Top beam
  ctx.beginPath()
  ctx.moveTo(200, 120)
  ctx.lineTo(400, 120)
  ctx.stroke()

  // Reach zone with animated gradient arc
  const pulseAlpha = 0.08 + Math.sin(time * 2) * 0.04
  const reachGrad = ctx.createRadialGradient(ARM_BASE.x, ARM_BASE.y, 0, ARM_BASE.x, ARM_BASE.y, totalReach)
  reachGrad.addColorStop(0, `rgba(59, 130, 246, ${pulseAlpha + 0.05})`)
  reachGrad.addColorStop(0.7, `rgba(59, 130, 246, ${pulseAlpha})`)
  reachGrad.addColorStop(1, 'rgba(59, 130, 246, 0)')
  ctx.fillStyle = reachGrad
  ctx.beginPath()
  ctx.arc(ARM_BASE.x, ARM_BASE.y, totalReach, 0, Math.PI * 2)
  ctx.fill()

  // Reach zone border with glow
  ctx.shadowColor = '#3B82F6'
  ctx.shadowBlur = 8
  ctx.strokeStyle = `rgba(59, 130, 246, ${0.3 + Math.sin(time * 2) * 0.1})`
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(ARM_BASE.x, ARM_BASE.y, totalReach, 0, Math.PI * 2)
  ctx.stroke()
  ctx.shadowBlur = 0

  // Welded trail (glowing path)
  if (weldedTrail.length > 0) {
    ctx.shadowColor = '#22C55E'
    ctx.shadowBlur = 10
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(ARM_BASE.x, ARM_BASE.y)
    for (const pt of weldedTrail) {
      ctx.lineTo(pt.x, pt.y)
    }
    ctx.stroke()
    ctx.shadowBlur = 0

    // Bright dots at welded points
    for (const pt of weldedTrail) {
      ctx.fillStyle = 'rgba(34, 197, 94, 0.4)'
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // 3D Robot arm base - cylindrical mount
  drawArmBase3D(ctx, ARM_BASE.x, ARM_BASE.y, time)

  // Arm base label
  ctx.fillStyle = '#D4D4D8'
  ctx.font = 'bold 10px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(t('armBase'), ARM_BASE.x, ARM_BASE.y + 28)

  // Weld points
  for (const wp of WELD_POINTS) {
    const isReachable = reachable.includes(wp.id)
    const dist = distToPoint(wp)

    // During welding animation, draw arm moving to each reachable point
    if (weldProgress !== null && isReachable) {
      const pointIndex = reachable.indexOf(wp.id)
      const pointProgress = weldProgress * reachable.length
      const thisPointPhase = pointProgress - pointIndex

      if (thisPointPhase > 0 && thisPointPhase <= 1) {
        // Draw articulated arm from base to this point
        const armEndX = ARM_BASE.x + (wp.x - ARM_BASE.x) * Math.min(thisPointPhase, 1)
        const armEndY = ARM_BASE.y + (wp.y - ARM_BASE.y) * Math.min(thisPointPhase, 1)
        drawArticulatedArm(ctx, ARM_BASE.x, ARM_BASE.y, armEndX, armEndY, time)

        // Welding spark glow at tip
        if (thisPointPhase > 0.3) {
          const glowSize = 15 + Math.sin(time * 10) * 5
          const sparkGrad = ctx.createRadialGradient(armEndX, armEndY, 0, armEndX, armEndY, glowSize)
          sparkGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)')
          sparkGrad.addColorStop(0.2, 'rgba(255, 200, 50, 0.7)')
          sparkGrad.addColorStop(0.5, 'rgba(255, 140, 0, 0.3)')
          sparkGrad.addColorStop(1, 'rgba(255, 100, 0, 0)')
          ctx.fillStyle = sparkGrad
          ctx.beginPath()
          ctx.arc(armEndX, armEndY, glowSize, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Mark as welded if past this point
      if (thisPointPhase > 1) {
        // Success green circle with glow
        ctx.shadowColor = '#22C55E'
        ctx.shadowBlur = 12
        ctx.fillStyle = '#22C55E'
        ctx.beginPath()
        ctx.arc(wp.x, wp.y, 8, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0

        // Inner highlight
        const successGrad = ctx.createRadialGradient(wp.x - 2, wp.y - 2, 0, wp.x, wp.y, 8)
        successGrad.addColorStop(0, 'rgba(255,255,255,0.4)')
        successGrad.addColorStop(1, 'rgba(34, 197, 94, 0)')
        ctx.fillStyle = successGrad
        ctx.beginPath()
        ctx.arc(wp.x, wp.y, 8, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#fff'
        ctx.font = 'bold 9px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('\u2713', wp.x, wp.y + 3)
        continue
      }
    }

    // Draw 3D weld point marker
    drawWeldPointMarker(ctx, wp.x, wp.y, isReachable, time, weldProgress === null)

    // Label with glow
    if (isReachable) {
      ctx.shadowColor = '#EF4444'
      ctx.shadowBlur = 4
    }
    ctx.fillStyle = isReachable ? '#FCA5A5' : '#6B7280'
    ctx.font = 'bold 10px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(wp.label, wp.x, wp.y - 16)
    ctx.shadowBlur = 0

    // Distance
    ctx.fillStyle = '#6B7280'
    ctx.font = '9px sans-serif'
    ctx.fillText(`${Math.round(dist)}cm`, wp.x, wp.y + 22)
  }

  // Draw spark particles on top
  if (sparkParticles && sparkParticles.length > 0) {
    drawParticles(ctx, sparkParticles)
  }

  // Status indicators with glow
  drawStatusIndicators(ctx, W, reachable.length, WELD_POINTS.length, time)
}

// ---------------------------------------------------------------------------
// Draw 3D arm base (cylindrical mount)
// ---------------------------------------------------------------------------

function drawArmBase3D(ctx: CanvasRenderingContext2D, cx: number, cy: number, time: number) {
  const baseW = 22
  const baseH = 14
  const sideH = 10

  // Shadow under base
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.beginPath()
  ctx.ellipse(cx, cy + sideH + 2, baseW + 2, 6, 0, 0, Math.PI * 2)
  ctx.fill()

  // Cylinder side
  const sideGrad = ctx.createLinearGradient(cx - baseW, cy, cx + baseW, cy)
  sideGrad.addColorStop(0, '#6B5300')
  sideGrad.addColorStop(0.3, '#D4A017')
  sideGrad.addColorStop(0.5, '#F59E0B')
  sideGrad.addColorStop(0.7, '#D4A017')
  sideGrad.addColorStop(1, '#6B5300')
  ctx.fillStyle = sideGrad
  ctx.beginPath()
  ctx.moveTo(cx - baseW, cy)
  ctx.lineTo(cx - baseW, cy + sideH)
  ctx.ellipse(cx, cy + sideH, baseW, baseH / 2, 0, Math.PI, 0, true)
  ctx.lineTo(cx + baseW, cy)
  ctx.ellipse(cx, cy, baseW, baseH / 2, 0, 0, Math.PI, true)
  ctx.closePath()
  ctx.fill()

  // Bottom ellipse (dark)
  ctx.fillStyle = '#7A6200'
  ctx.beginPath()
  ctx.ellipse(cx, cy + sideH, baseW, baseH / 2, 0, 0, Math.PI * 2)
  ctx.fill()

  // Top ellipse with metallic gradient
  const topGrad = ctx.createRadialGradient(cx - 4, cy - 2, 0, cx, cy, baseW)
  topGrad.addColorStop(0, '#FFD700')
  topGrad.addColorStop(0.5, '#F59E0B')
  topGrad.addColorStop(1, '#B8860B')
  ctx.fillStyle = topGrad
  ctx.beginPath()
  ctx.ellipse(cx, cy, baseW, baseH / 2, 0, 0, Math.PI * 2)
  ctx.fill()

  // Highlight spot
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.beginPath()
  ctx.ellipse(cx - 5, cy - 2, 6, 3, -0.3, 0, Math.PI * 2)
  ctx.fill()

  // Glow pulse
  const glowAlpha = 0.2 + Math.sin(time * 3) * 0.1
  ctx.shadowColor = '#F59E0B'
  ctx.shadowBlur = 15
  ctx.strokeStyle = `rgba(245, 158, 11, ${glowAlpha})`
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.ellipse(cx, cy, baseW + 2, baseH / 2 + 2, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.shadowBlur = 0
}

// ---------------------------------------------------------------------------
// Articulated arm segments
// ---------------------------------------------------------------------------

function drawArticulatedArm(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  time: number,
) {
  // Mid point for a two-segment elbow joint
  const midX = x1 + (x2 - x1) * 0.5 + Math.sin(time * 2) * 8
  const midY = y1 + (y2 - y1) * 0.4 - 20

  // Segment 1 (base to elbow) - gradient filled
  const seg1Grad = ctx.createLinearGradient(x1, y1, midX, midY)
  seg1Grad.addColorStop(0, '#D4A017')
  seg1Grad.addColorStop(1, '#B8860B')
  ctx.strokeStyle = seg1Grad
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(midX, midY)
  ctx.stroke()

  // Segment 1 highlight
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(midX, midY)
  ctx.stroke()

  // Segment 2 (elbow to end)
  const seg2Grad = ctx.createLinearGradient(midX, midY, x2, y2)
  seg2Grad.addColorStop(0, '#B8860B')
  seg2Grad.addColorStop(1, '#996D00')
  ctx.strokeStyle = seg2Grad
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(midX, midY)
  ctx.lineTo(x2, y2)
  ctx.stroke()

  // Segment 2 highlight
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.2)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(midX, midY)
  ctx.lineTo(x2, y2)
  ctx.stroke()

  // Elbow joint circle
  const jointGrad = ctx.createRadialGradient(midX - 2, midY - 2, 0, midX, midY, 8)
  jointGrad.addColorStop(0, '#FFD700')
  jointGrad.addColorStop(0.5, '#D4A017')
  jointGrad.addColorStop(1, '#8B6914')
  ctx.fillStyle = jointGrad
  ctx.beginPath()
  ctx.arc(midX, midY, 6, 0, Math.PI * 2)
  ctx.fill()

  // Joint highlight
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.beginPath()
  ctx.arc(midX - 1.5, midY - 1.5, 2.5, 0, Math.PI * 2)
  ctx.fill()

  // Joint border
  ctx.strokeStyle = '#8B6914'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(midX, midY, 6, 0, Math.PI * 2)
  ctx.stroke()

  // End effector (welder tip)
  ctx.fillStyle = '#666'
  ctx.beginPath()
  ctx.arc(x2, y2, 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#999'
  ctx.beginPath()
  ctx.arc(x2 - 1, y2 - 1, 1.5, 0, Math.PI * 2)
  ctx.fill()
}

// ---------------------------------------------------------------------------
// 3D Weld point marker
// ---------------------------------------------------------------------------

function drawWeldPointMarker(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  isReachable: boolean,
  time: number,
  showPulse: boolean,
) {
  const baseColor = isReachable ? '#EF4444' : '#991B1B'
  const glowColor = isReachable ? '#EF4444' : '#991B1B'

  // Pulsing glow ring for reachable
  if (isReachable && showPulse) {
    const pulseRadius = 12 + Math.sin(time * 3) * 3
    const pulseAlpha = 0.3 + Math.sin(time * 3) * 0.15

    ctx.shadowColor = glowColor
    ctx.shadowBlur = 10
    ctx.strokeStyle = `rgba(239, 68, 68, ${pulseAlpha})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, y, pulseRadius, 0, Math.PI * 2)
    ctx.stroke()

    // Second outer ring
    const outerPulse = 16 + Math.sin(time * 3 + 1) * 2
    ctx.strokeStyle = `rgba(239, 68, 68, ${pulseAlpha * 0.4})`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(x, y, outerPulse, 0, Math.PI * 2)
    ctx.stroke()
    ctx.shadowBlur = 0
  }

  // 3D marker - outer ring shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)'
  ctx.beginPath()
  ctx.ellipse(x, y + 2, 8, 5, 0, 0, Math.PI * 2)
  ctx.fill()

  // Main marker with radial gradient for 3D look
  const markerGrad = ctx.createRadialGradient(x - 2, y - 2, 0, x, y, 7)
  if (isReachable) {
    markerGrad.addColorStop(0, '#FF8888')
    markerGrad.addColorStop(0.5, '#EF4444')
    markerGrad.addColorStop(1, '#B91C1C')
  } else {
    markerGrad.addColorStop(0, '#7F1D1D')
    markerGrad.addColorStop(0.5, '#991B1B')
    markerGrad.addColorStop(1, '#450A0A')
  }
  ctx.fillStyle = markerGrad
  ctx.beginPath()
  ctx.arc(x, y, 7, 0, Math.PI * 2)
  ctx.fill()

  // Highlight spot
  ctx.fillStyle = isReachable ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)'
  ctx.beginPath()
  ctx.arc(x - 2, y - 2, 2.5, 0, Math.PI * 2)
  ctx.fill()

  // Border
  ctx.strokeStyle = isReachable ? '#FECACA' : '#7F1D1D'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(x, y, 7, 0, Math.PI * 2)
  ctx.stroke()
}

// ---------------------------------------------------------------------------
// Status indicators
// ---------------------------------------------------------------------------

function drawStatusIndicators(
  ctx: CanvasRenderingContext2D,
  W: number,
  reachableCount: number,
  totalPoints: number,
  time: number,
) {
  // Top-right status box
  const boxX = W - 155
  const boxY = 10
  const boxW = 145
  const boxH = 34

  // Background
  ctx.fillStyle = 'rgba(10, 22, 40, 0.85)'
  roundRect(ctx, boxX, boxY, boxW, boxH, 6)
  ctx.fill()
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)'
  ctx.lineWidth = 1
  roundRect(ctx, boxX, boxY, boxW, boxH, 6)
  ctx.stroke()

  // Status dots
  for (let i = 0; i < totalPoints; i++) {
    const dotX = boxX + 15 + i * 20
    const dotY = boxY + 17
    const isReached = i < reachableCount

    if (isReached) {
      // Glow
      ctx.shadowColor = '#22C55E'
      ctx.shadowBlur = 6
      ctx.fillStyle = '#22C55E'
    } else {
      ctx.fillStyle = '#374151'
    }
    ctx.beginPath()
    ctx.arc(dotX, dotY, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    // Highlight
    if (isReached) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.beginPath()
      ctx.arc(dotX - 1.5, dotY - 1.5, 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Count text
  ctx.fillStyle = reachableCount >= totalPoints ? '#22C55E' : reachableCount >= 3 ? '#F59E0B' : '#EF4444'
  ctx.font = 'bold 10px sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText(`${reachableCount}/${totalPoints}`, boxX + boxW - 10, boxY + 21)
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function RobotMission5({ onComplete }: RobotMission5Props) {
  const t = useTranslations('missions.robot.m5')

  const [seg1, setSeg1] = useState(30)
  const [seg2, setSeg2] = useState(30)
  const [seg3, setSeg3] = useState(30)
  const [precision, setPrecision] = useState(5)
  const [speed, setSpeed] = useState(5)
  const [isWelding, setIsWelding] = useState(false)
  const [phase, setPhase] = useState<'configuring' | 'done'>('configuring')

  const totalReach = seg1 + seg2 + seg3
  const totalCost = Math.round(totalReach * 0.5) // $0.50 per cm of arm

  // Count reachable points
  const reachableCount = useMemo(() => {
    return WELD_POINTS.filter(p => distToPoint(p) <= totalReach).length
  }, [totalReach])

  const handleTestWeld = useCallback(() => {
    setIsWelding(true)
  }, [])

  const handleWeldEnd = useCallback((reachedPoints: number[]) => {
    setIsWelding(false)
    setPhase('done')

    // Scoring
    // Coverage: 100 per point reached (max 500)
    const coverageScore = reachedPoints.length * 100

    // Weld quality: precision * (11 - speed) / 10, scaled to 350
    // Best: high precision (10) + low speed (1) = 10*10/10 = 10 -> 350
    // Worst: low precision (1) + high speed (10) = 1*1/10 = 0.1 -> 35
    const qualityRaw = (precision * (11 - speed)) / 100
    const qualityScore = Math.round(Math.min(qualityRaw, 1) * 350)

    // Budget: shorter arm = cheaper = better
    // Min possible total reach to cover all 5 points: ~470cm (point W5 is ~445cm away)
    // Budget bonus: 150 if arm is under 150cm total, scaled down for longer
    const budgetScore = totalReach <= 100 ? 150
      : totalReach <= 120 ? 120
      : totalReach <= 140 ? 80
      : 50

    const total = coverageScore + qualityScore + budgetScore

    const breakdownItems: ScoreBreakdownItem[] = [
      { label: t('scoreCoverage'), value: coverageScore, max: 500 },
      { label: t('scoreQuality'), value: qualityScore, max: 350 },
      { label: t('scoreBudget'), value: budgetScore, max: 150 },
    ]

    onComplete?.(total, breakdownItems)
  }, [precision, speed, totalReach, onComplete, t])

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Story */}
      <div className="bg-gray-950 rounded-xl p-4 border border-gray-800">
        <p className="text-gray-300 text-sm">{t('story')}</p>
        <p className="text-yellow-400 text-sm font-bold mt-2">{t('requirement')}</p>
      </div>

      {/* Blueprint canvas */}
      <BlueprintCanvas
        segments={[seg1, seg2, seg3]}
        precision={precision}
        speed={speed}
        isWelding={isWelding}
        onWeldEnd={handleWeldEnd}
        t={t}
      />

      {/* Arm segment sliders */}
      <div>
        <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">{t('armSegments')}</h3>
        <div className="bg-gray-950 rounded-xl p-4 border border-gray-800 space-y-4">
          {[
            { label: t('segment1'), value: seg1, setter: setSeg1 },
            { label: t('segment2'), value: seg2, setter: setSeg2 },
            { label: t('segment3'), value: seg3, setter: setSeg3 },
          ].map(({ label, value, setter }, i) => (
            <div key={i} className="flex items-center gap-4">
              <span className="text-gray-400 text-sm w-28">{label}</span>
              <input
                type="range"
                min={MIN_SEGMENT_LENGTH}
                max={MAX_SEGMENT_LENGTH}
                step={5}
                value={value}
                onChange={e => setter(Number(e.target.value))}
                disabled={isWelding}
                className="flex-1 accent-blue-500"
              />
              <span className="text-white font-bold text-sm w-14 text-right">{value}cm</span>
            </div>
          ))}
          <div className="flex justify-between text-sm border-t border-gray-800 pt-3">
            <span className="text-gray-400">{t('totalReach')}:</span>
            <span className={clsx(
              'font-bold',
              reachableCount >= 5 ? 'text-green-400' : reachableCount >= 3 ? 'text-yellow-400' : 'text-red-400',
            )}>
              {totalReach}cm ({reachableCount}/5 {t('pointsReachable')})
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">{t('armCost')}:</span>
            <span className="text-yellow-400 font-bold">${totalCost}</span>
          </div>
        </div>
      </div>

      {/* Precision and Speed sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gray-950 rounded-xl p-4 border border-gray-800 space-y-3">
          <h4 className="text-sm font-bold text-gray-400 uppercase">{t('precisionLabel')}</h4>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={precision}
            onChange={e => setPrecision(Number(e.target.value))}
            disabled={isWelding}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{t('precisionLow')}</span>
            <span className="text-white font-bold">{precision}/10</span>
            <span>{t('precisionHigh')}</span>
          </div>
        </div>

        <div className="bg-gray-950 rounded-xl p-4 border border-gray-800 space-y-3">
          <h4 className="text-sm font-bold text-gray-400 uppercase">{t('speedLabel')}</h4>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={speed}
            onChange={e => setSpeed(Number(e.target.value))}
            disabled={isWelding}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{t('speedSlow')}</span>
            <span className="text-white font-bold">{speed}/10</span>
            <span>{t('speedFast')}</span>
          </div>
        </div>
      </div>

      {/* Quality indicator */}
      <div className="bg-gray-950 rounded-xl p-3 border border-gray-800">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">{t('weldQuality')}:</span>
          <span className={clsx(
            'font-bold',
            precision >= 7 && speed <= 4 ? 'text-green-400' :
            precision >= 4 && speed <= 7 ? 'text-yellow-400' :
            'text-red-400',
          )}>
            {precision >= 7 && speed <= 4 ? t('qualityExcellent') :
             precision >= 4 && speed <= 7 ? t('qualityGood') :
             t('qualityPoor')}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">{t('qualityHint')}</p>
      </div>

      {/* Test Weld button */}
      {phase === 'configuring' && (
        <button
          onClick={handleTestWeld}
          disabled={isWelding}
          className={clsx(
            'w-full py-3 rounded-xl font-black text-lg uppercase tracking-wider transition-all',
            !isWelding
              ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/30'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed',
          )}
        >
          {t('testWeld')}
        </button>
      )}
    </div>
  )
}
