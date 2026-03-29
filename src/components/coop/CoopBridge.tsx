'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import clsx from 'clsx'

interface Props {
  role: string
  onComplete: (score: number, resultData: Record<string, unknown>) => void
  otherResults?: Record<string, unknown>[]
}

// ---------------------------------------------------------------------------
// Shared animation styles (injected once)
// ---------------------------------------------------------------------------
const COOP_STYLES = `
@keyframes coopFloat {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-6px); }
}
@keyframes coopPulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
@keyframes coopScanLine {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
}
@keyframes coopWindLine {
  0% { transform: translateX(-60px); opacity: 0; }
  30% { opacity: 1; }
  100% { transform: translateX(120px); opacity: 0; }
}
@keyframes coopWeld {
  0%, 100% { opacity: 0.3; box-shadow: 0 0 4px rgba(251,191,36,0.3); }
  50% { opacity: 1; box-shadow: 0 0 16px rgba(251,191,36,0.8); }
}
@keyframes coopSparkle {
  0% { transform: scale(0) rotate(0deg); opacity: 1; }
  50% { transform: scale(1.2) rotate(180deg); opacity: 0.8; }
  100% { transform: scale(0) rotate(360deg); opacity: 0; }
}
@keyframes coopConfetti {
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(-80px) rotate(720deg); opacity: 0; }
}
@keyframes coopBarGrow {
  0% { transform: scaleX(0); }
  100% { transform: scaleX(1); }
}
@keyframes coopGlowPulse {
  0%, 100% { box-shadow: 0 0 8px rgba(34,197,94,0.2); }
  50% { box-shadow: 0 0 20px rgba(34,197,94,0.6); }
}
@keyframes coopWarnPulse {
  0%, 100% { box-shadow: 0 0 8px rgba(239,68,68,0.2); }
  50% { box-shadow: 0 0 20px rgba(239,68,68,0.6); }
}
@keyframes coopRobotArm {
  0%, 100% { transform: rotate(-5deg); }
  50% { transform: rotate(5deg); }
}
@keyframes coopDroneHover {
  0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
  50% { transform: translate(-50%, -50%) translateY(-8px); }
}
@keyframes coopPieSlice {
  0% { transform: scale(0.8); opacity: 0.5; }
  100% { transform: scale(1); opacity: 1; }
}
.coop-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 28px; height: 28px;
  border-radius: 50%;
  background: #3B82F6;
  cursor: pointer;
  box-shadow: 0 0 8px rgba(59,130,246,0.6);
}
.coop-slider::-webkit-slider-runnable-track {
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(90deg, #1E3A5F, #3B82F6);
}
.coop-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  background: transparent;
}
`

// ---------------------------------------------------------------------------
// Celebration overlay (confetti + sparkles)
// ---------------------------------------------------------------------------
function CelebrationOverlay() {
  const confettiColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#A78BFA', '#EC4899']
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {Array.from({ length: 18 }).map((_, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: `${10 + Math.random() * 80}%`,
            bottom: `${Math.random() * 40}%`,
            width: 8,
            height: 8,
            borderRadius: i % 3 === 0 ? '50%' : '2px',
            backgroundColor: confettiColors[i % confettiColors.length],
            animation: `coopConfetti ${1.2 + Math.random() * 0.8}s ease-out ${Math.random() * 0.5}s forwards`,
          }}
        />
      ))}
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={`s${i}`}
          className="absolute text-yellow-300"
          style={{
            left: `${20 + Math.random() * 60}%`,
            top: `${20 + Math.random() * 60}%`,
            fontSize: 16 + Math.random() * 12,
            animation: `coopSparkle ${0.8 + Math.random() * 0.6}s ease-out ${Math.random() * 0.4}s forwards`,
          }}
        >
          ✦
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// DRONE TASK: Survey gorge dimensions with 2.5D canyon scene
// ---------------------------------------------------------------------------
function DroneTask({ onComplete }: { onComplete: (score: number, data: Record<string, unknown>) => void }) {
  const t = useTranslations('coopMissions.bridge.drone')
  const [width, setWidth] = useState(100)
  const [depth, setDepth] = useState(50)
  const [wind, setWind] = useState<string>('')
  const [submitted, setSubmitted] = useState(false)
  const WIND_OPTIONS = [
    { id: 'calm', labelKey: 'calm', speed: 5 },
    { id: 'moderate', labelKey: 'moderate', speed: 25 },
    { id: 'strong', labelKey: 'strong', speed: 50 },
  ]

  function submit() {
    if (!wind) return
    setSubmitted(true)

    const widthScore = width >= 80 && width <= 150 ? 350 : width >= 60 && width <= 180 ? 250 : 150
    const depthScore = depth >= 30 && depth <= 70 ? 350 : depth >= 15 && depth <= 85 ? 250 : 150
    const windScore = wind === 'moderate' ? 300 : wind === 'calm' ? 250 : 200
    const score = Math.min(1000, widthScore + depthScore + windScore)

    onComplete(score, { width, depth, windSpeed: WIND_OPTIONS.find(w => w.id === wind)?.speed ?? 25, windLevel: wind })
  }

  // Canyon proportions mapped from slider values
  const canyonWidthPx = 40 + (width - 50) * 0.8 // 40-160px visual width
  const canyonDepthPx = 30 + (depth - 10) * 1.2  // 30-138px visual depth
  const windIntensity = wind === 'strong' ? 3 : wind === 'moderate' ? 2 : wind === 'calm' ? 1 : 0

  return (
    <div className="space-y-4 relative">
      {submitted && <CelebrationOverlay />}

      <div>
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="inline-block w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-sm shadow-lg shadow-cyan-500/30">🛸</span>
          {t('title')}
        </h3>
        <p className="text-gray-400 text-sm mt-1">{t('desc')}</p>
      </div>

      {/* 2.5D Canyon Scene */}
      <div className="relative bg-gradient-to-b from-[#0a1628] via-[#0f2038] to-[#0a1628] rounded-2xl border border-cyan-900/40 overflow-hidden"
           style={{ height: 220, perspective: '800px' }}>
        {/* Sky gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/60 via-transparent to-transparent" />

        {/* Stars */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="absolute rounded-full bg-white"
            style={{
              width: 1 + (i % 3),
              height: 1 + (i % 3),
              left: `${5 + (i * 8) % 90}%`,
              top: `${5 + (i * 7) % 30}%`,
              opacity: 0.3 + (i % 3) * 0.2,
              animation: `coopPulse ${2 + i * 0.3}s ease-in-out infinite`,
            }}
          />
        ))}

        {/* Canyon walls - left */}
        <div className="absolute bottom-0" style={{
          left: `calc(50% - ${canyonWidthPx / 2 + 50}px)`,
          width: 50,
          height: `${60 + canyonDepthPx * 0.7}px`,
          background: 'linear-gradient(90deg, #5B4A3A, #8B7355, #6B5A45)',
          borderRadius: '8px 8px 0 0',
          transform: 'perspective(400px) rotateY(-8deg)',
          boxShadow: 'inset -8px 0 20px rgba(0,0,0,0.4)',
        }} />
        {/* Canyon walls - right */}
        <div className="absolute bottom-0" style={{
          right: `calc(50% - ${canyonWidthPx / 2 + 50}px)`,
          width: 50,
          height: `${60 + canyonDepthPx * 0.7}px`,
          background: 'linear-gradient(90deg, #6B5A45, #8B7355, #5B4A3A)',
          borderRadius: '8px 8px 0 0',
          transform: 'perspective(400px) rotateY(8deg)',
          boxShadow: 'inset 8px 0 20px rgba(0,0,0,0.4)',
        }} />

        {/* Canyon floor (dark water/shadow) */}
        <div className="absolute bottom-0" style={{
          left: `calc(50% - ${canyonWidthPx / 2}px)`,
          width: `${canyonWidthPx}px`,
          height: 20,
          background: 'linear-gradient(180deg, #0a2540, #061525)',
          boxShadow: '0 0 30px rgba(6,21,37,0.8)',
        }} />

        {/* Canyon depth indicator */}
        <div className="absolute bottom-0 flex flex-col items-center" style={{
          left: `calc(50% - ${canyonWidthPx / 2 + 70}px)`,
          height: `${canyonDepthPx * 0.7}px`,
        }}>
          <div className="w-px h-full bg-cyan-400/50 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-px bg-cyan-400" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-px bg-cyan-400" />
          </div>
          <span className="text-[10px] text-cyan-400 mt-1 whitespace-nowrap">{depth}m</span>
        </div>

        {/* Canyon width indicator */}
        <div className="absolute flex items-center justify-center" style={{
          bottom: `${60 + canyonDepthPx * 0.7 + 8}px`,
          left: `calc(50% - ${canyonWidthPx / 2}px)`,
          width: `${canyonWidthPx}px`,
        }}>
          <div className="h-px flex-1 bg-cyan-400/50" />
          <span className="text-[10px] text-cyan-400 px-1 whitespace-nowrap">{width}m</span>
          <div className="h-px flex-1 bg-cyan-400/50" />
        </div>

        {/* Drone */}
        <div className="absolute" style={{
          left: '50%',
          top: '28%',
          transform: 'translate(-50%, -50%)',
          animation: 'coopDroneHover 2s ease-in-out infinite',
        }}>
          <div className="relative">
            {/* Drone body */}
            <div className="w-10 h-5 rounded bg-gradient-to-r from-blue-500 to-cyan-400 shadow-lg shadow-cyan-500/40 relative">
              {/* Propellers */}
              <div className="absolute -top-1 -left-2 w-3 h-1 bg-gray-300 rounded-full" style={{ animation: `coopPulse 0.15s linear infinite` }} />
              <div className="absolute -top-1 -right-2 w-3 h-1 bg-gray-300 rounded-full" style={{ animation: `coopPulse 0.15s linear infinite` }} />
            </div>
            {/* Scan beam */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2" style={{
              width: 2,
              height: 60,
              background: 'linear-gradient(180deg, rgba(34,211,238,0.8), rgba(34,211,238,0))',
              animation: 'coopPulse 1.5s ease-in-out infinite',
            }} />
            {/* Scan field cone */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2" style={{
              width: 0,
              height: 0,
              borderLeft: '20px solid transparent',
              borderRight: '20px solid transparent',
              borderTop: '50px solid rgba(34,211,238,0.06)',
            }} />
          </div>
        </div>

        {/* Scan lines */}
        {!submitted && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"
              style={{ animation: 'coopScanLine 3s linear infinite' }} />
            <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-cyan-400/15 to-transparent"
              style={{ animation: 'coopScanLine 3s linear 1.5s infinite' }} />
          </div>
        )}

        {/* Wind arrows */}
        {windIntensity > 0 && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: windIntensity * 3 }).map((_, i) => (
              <div key={i} className="absolute flex items-center" style={{
                left: -60,
                top: `${15 + i * (60 / (windIntensity * 3))}%`,
                animation: `coopWindLine ${1.5 - windIntensity * 0.2}s linear ${i * 0.3}s infinite`,
              }}>
                <div className="h-px bg-gradient-to-r from-transparent via-sky-300/60 to-sky-300/20" style={{ width: 30 + windIntensity * 10 }} />
                <div className="text-sky-300/60 text-xs ml-px">›</div>
              </div>
            ))}
          </div>
        )}

        {/* Submitted overlay */}
        {submitted && (
          <div className="absolute inset-0 bg-green-900/20 flex items-center justify-center backdrop-blur-[1px]">
            <div className="text-green-400 font-bold text-lg px-4 py-2 bg-green-900/40 rounded-xl border border-green-500/30">
              ✓ {t('submitted')}
            </div>
          </div>
        )}
      </div>

      {/* Width slider */}
      <div className="space-y-2 bg-[#0d1b2a]/60 rounded-xl p-3 border border-cyan-900/20">
        <p className="text-sm font-medium text-gray-300">{t('gorgeWidth')}</p>
        <input
          type="range" min={50} max={200} value={width}
          onChange={e => setWidth(Number(e.target.value))}
          disabled={submitted} className="coop-slider"
        />
        <p className="text-xl font-black text-cyan-400 text-center">{width}m</p>
      </div>

      {/* Depth slider */}
      <div className="space-y-2 bg-[#0d1b2a]/60 rounded-xl p-3 border border-cyan-900/20">
        <p className="text-sm font-medium text-gray-300">{t('gorgeDepth')}</p>
        <input
          type="range" min={10} max={100} value={depth}
          onChange={e => setDepth(Number(e.target.value))}
          disabled={submitted} className="coop-slider"
        />
        <p className="text-xl font-black text-cyan-400 text-center">{depth}m</p>
      </div>

      {/* Wind speed */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-300">{t('windSpeed')}</p>
        <div className="grid grid-cols-3 gap-2">
          {WIND_OPTIONS.map(opt => {
            const isSelected = wind === opt.id
            const accent = opt.id === 'calm' ? 'from-green-500/20 to-green-900/10 border-green-500/50'
              : opt.id === 'moderate' ? 'from-yellow-500/20 to-yellow-900/10 border-yellow-500/50'
              : 'from-red-500/20 to-red-900/10 border-red-500/50'
            return (
              <button
                key={opt.id}
                onClick={() => setWind(opt.id)}
                disabled={submitted}
                className={clsx(
                  'p-3 rounded-xl border text-center transition-all duration-300',
                  isSelected
                    ? `bg-gradient-to-b ${accent} shadow-lg`
                    : 'border-[var(--brand-border)] bg-[var(--brand-dark)]/60 hover:border-gray-500 hover:bg-[var(--brand-dark)]'
                )}
              >
                <p className="text-2xl">{opt.id === 'calm' ? '🍃' : opt.id === 'moderate' ? '💨' : '🌪️'}</p>
                <p className="text-white text-xs font-bold mt-1">{t(opt.labelKey)}</p>
                <p className="text-gray-500 text-xs">{opt.speed} km/h</p>
              </button>
            )
          })}
        </div>
      </div>

      {!submitted ? (
        <button onClick={submit} disabled={!wind}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold rounded-xl disabled:opacity-40 hover:shadow-lg hover:shadow-cyan-500/30 transition-all duration-300 active:scale-[0.98]">
          {t('submit')}
        </button>
      ) : (
        <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 text-center"
             style={{ animation: 'coopGlowPulse 2s ease-in-out infinite' }}>
          <p className="text-green-400 font-bold">{t('submitted')}</p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ROBOT TASK: Bridge construction with welding arm visual
// ---------------------------------------------------------------------------
function RobotTask({ onComplete }: { onComplete: (score: number, data: Record<string, unknown>) => void }) {
  const t = useTranslations('coopMissions.bridge.robot')
  const [armReach, setArmReach] = useState(3)
  const [material, setMaterial] = useState<string>('')
  const [submitted, setSubmitted] = useState(false)

  const MATERIALS = [
    { id: 'steel', labelKey: 'steel', strength: 10, weight: 10, cost: 1 },
    { id: 'aluminum', labelKey: 'aluminum', strength: 6, weight: 4, cost: 2 },
    { id: 'titanium', labelKey: 'titanium', strength: 9, weight: 5, cost: 4 },
  ]

  function submit() {
    if (!material) return
    setSubmitted(true)

    const mat = MATERIALS.find(m => m.id === material)!
    const materialScore = material === 'titanium' ? 400 : material === 'steel' ? 300 : 200
    const armScore = armReach >= 5 && armReach <= 7 ? 400 : armReach >= 3 && armReach <= 9 ? 300 : 200
    const balanceScore = mat.strength / mat.weight > 1.5 ? 200 : 100
    const score = Math.min(1000, materialScore + armScore + balanceScore)

    onComplete(score, { material, armReach, materialProps: mat })
  }

  // Material visual properties
  const matColors: Record<string, { beam: string; glow: string; label: string }> = {
    steel: { beam: 'linear-gradient(180deg, #9CA3AF, #6B7280, #4B5563)', glow: 'rgba(156,163,175,0.3)', label: '#9CA3AF' },
    aluminum: { beam: 'linear-gradient(180deg, #E5E7EB, #D1D5DB, #C0C4CC)', glow: 'rgba(229,231,235,0.3)', label: '#E5E7EB' },
    titanium: { beam: 'linear-gradient(180deg, #6366F1, #4338CA, #3730A3)', glow: 'rgba(99,102,241,0.4)', label: '#818CF8' },
  }
  const currentMat = matColors[material] || matColors.steel
  const armLengthPx = 30 + armReach * 15 // visual arm extension

  const selectedMatData = MATERIALS.find(m => m.id === material)

  return (
    <div className="space-y-4 relative">
      {submitted && <CelebrationOverlay />}

      <div>
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="inline-block w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-sm shadow-lg shadow-orange-500/30">🤖</span>
          {t('title')}
        </h3>
        <p className="text-gray-400 text-sm mt-1">{t('desc')}</p>
      </div>

      {/* 2.5D Bridge Construction Scene */}
      <div className="relative bg-gradient-to-b from-[#1a0f0a] via-[#1a1510] to-[#0f0a05] rounded-2xl border border-orange-900/30 overflow-hidden"
           style={{ height: 220, perspective: '800px' }}>

        {/* Ground/platform left */}
        <div className="absolute bottom-0 left-0 w-[35%] h-[70px]"
          style={{
            background: 'linear-gradient(0deg, #5B4A3A, #7B6A55)',
            borderRadius: '0 12px 0 0',
            boxShadow: 'inset 0 2px 8px rgba(123,106,85,0.3)',
          }}
        />
        {/* Ground/platform right */}
        <div className="absolute bottom-0 right-0 w-[35%] h-[70px]"
          style={{
            background: 'linear-gradient(0deg, #5B4A3A, #7B6A55)',
            borderRadius: '12px 0 0 0',
            boxShadow: 'inset 0 2px 8px rgba(123,106,85,0.3)',
          }}
        />
        {/* Canyon gap */}
        <div className="absolute bottom-0 left-[35%] w-[30%] h-[70px]"
          style={{ background: 'linear-gradient(180deg, #0a1020, #050810)' }}
        />

        {/* Bridge beams */}
        {material && (
          <>
            {/* Main horizontal beam */}
            <div className="absolute" style={{
              bottom: 70,
              left: '30%',
              width: '40%',
              height: 8,
              background: currentMat.beam,
              boxShadow: `0 2px 12px ${currentMat.glow}`,
              borderRadius: 2,
              transition: 'all 0.5s ease',
            }} />
            {/* Support beams (triangular truss look) */}
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="absolute" style={{
                bottom: 70,
                left: `${32 + i * 9}%`,
                width: 3,
                height: 20,
                background: currentMat.beam,
                boxShadow: `0 0 6px ${currentMat.glow}`,
                borderRadius: 1,
                transform: `rotate(${i % 2 === 0 ? 15 : -15}deg)`,
                transformOrigin: 'bottom center',
                transition: 'all 0.5s ease',
              }} />
            ))}
            {/* Top beam */}
            <div className="absolute" style={{
              bottom: 88,
              left: '31%',
              width: '38%',
              height: 4,
              background: currentMat.beam,
              boxShadow: `0 -2px 8px ${currentMat.glow}`,
              borderRadius: 2,
              transition: 'all 0.5s ease',
            }} />
          </>
        )}

        {/* Robot */}
        <div className="absolute" style={{ bottom: 70, left: '22%' }}>
          {/* Robot body */}
          <div className="relative">
            <div className="w-8 h-10 rounded-md bg-gradient-to-b from-gray-400 to-gray-600 border border-gray-500" style={{
              transform: 'translateY(-10px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            }}>
              {/* Eyes */}
              <div className="flex gap-1 justify-center pt-1">
                <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
                <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
              </div>
            </div>
            {/* Welding arm */}
            <div className="absolute" style={{
              top: -6,
              left: 32,
              width: armLengthPx,
              height: 4,
              background: 'linear-gradient(90deg, #9CA3AF, #6B7280)',
              borderRadius: 2,
              transformOrigin: 'left center',
              animation: submitted ? 'none' : 'coopRobotArm 2s ease-in-out infinite',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              transition: 'width 0.3s ease',
            }}>
              {/* Welding tip glow */}
              <div className="absolute -right-1 -top-1 w-3 h-3 rounded-full"
                style={{
                  background: 'radial-gradient(circle, #FCD34D, #F59E0B, transparent)',
                  animation: submitted ? 'none' : 'coopWeld 1s ease-in-out infinite',
                }}
              />
            </div>
          </div>
        </div>

        {/* Weld sparks */}
        {!submitted && (
          <div className="absolute pointer-events-none" style={{ bottom: 74, left: `calc(22% + ${armLengthPx + 30}px)` }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="absolute w-1 h-1 rounded-full bg-yellow-300"
                style={{
                  animation: `coopSparkle 0.6s ease-out ${i * 0.15}s infinite`,
                  left: Math.random() * 10 - 5,
                  top: Math.random() * 10 - 5,
                }}
              />
            ))}
          </div>
        )}

        {/* Submitted overlay */}
        {submitted && (
          <div className="absolute inset-0 bg-green-900/20 flex items-center justify-center backdrop-blur-[1px]">
            <div className="text-green-400 font-bold text-lg px-4 py-2 bg-green-900/40 rounded-xl border border-green-500/30">
              ✓ {t('submitted')}
            </div>
          </div>
        )}
      </div>

      {/* Arm reach */}
      <div className="space-y-2 bg-[#1a1510]/60 rounded-xl p-3 border border-orange-900/20">
        <p className="text-sm font-medium text-gray-300">{t('armReach')}</p>
        <input
          type="range" min={1} max={10} value={armReach}
          onChange={e => setArmReach(Number(e.target.value))}
          disabled={submitted} className="coop-slider"
        />
        <p className="text-xl font-black text-orange-400 text-center">{armReach}m</p>
      </div>

      {/* Material selection */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-300">{t('selectMaterial')}</p>
        {MATERIALS.map(mat => {
          const colors = matColors[mat.id]
          const isSelected = material === mat.id
          return (
            <button
              key={mat.id}
              onClick={() => setMaterial(mat.id)}
              disabled={submitted}
              className={clsx(
                'w-full text-left p-4 rounded-xl border transition-all duration-300',
                isSelected
                  ? 'border-orange-400/60 shadow-lg'
                  : 'border-[var(--brand-border)] bg-[var(--brand-dark)]/60 hover:border-gray-500'
              )}
              style={isSelected ? {
                background: `linear-gradient(135deg, rgba(0,0,0,0.4), rgba(0,0,0,0.2))`,
                boxShadow: `0 0 20px ${colors.glow}`,
              } : undefined}
            >
              <div className="flex items-center gap-3">
                {/* Material color swatch */}
                <div className="w-6 h-6 rounded" style={{ background: colors.beam }} />
                <div className="flex-1">
                  <p className="font-bold text-sm" style={{ color: isSelected ? colors.label : '#fff' }}>{t(mat.labelKey)}</p>
                  <div className="flex gap-4 text-xs text-gray-400 mt-1">
                    <span>{t('strength')}: {mat.strength}/10</span>
                    <span>{t('weight')}: {mat.weight}/10</span>
                    <span>{t('cost')}: {'$'.repeat(mat.cost)}</span>
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Strength vs Weight animated bars */}
      {selectedMatData && (
        <div className="bg-[#1a1510]/60 rounded-xl p-3 border border-orange-900/20 space-y-2">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">💪 {t('strength')}</span>
              <span className="text-white font-bold">{selectedMatData.strength}/10</span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-500"
                style={{ width: `${selectedMatData.strength * 10}%`, animation: 'coopBarGrow 0.5s ease-out' }} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">⚖️ {t('weight')}</span>
              <span className="text-white font-bold">{selectedMatData.weight}/10</span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500"
                style={{ width: `${selectedMatData.weight * 10}%`, animation: 'coopBarGrow 0.5s ease-out' }} />
            </div>
          </div>
          <div className="text-center text-xs mt-1">
            <span className={clsx(
              'font-bold',
              selectedMatData.strength / selectedMatData.weight > 1.5 ? 'text-green-400' : 'text-yellow-400'
            )}>
              {t('strength')}/{t('weight')}: {(selectedMatData.strength / selectedMatData.weight).toFixed(1)}x
              {selectedMatData.strength / selectedMatData.weight > 1.5 ? ' ✓' : ' ⚠️'}
            </span>
          </div>
        </div>
      )}

      {!submitted ? (
        <button onClick={submit} disabled={!material}
          className="w-full py-3 bg-gradient-to-r from-orange-600 to-amber-500 text-white font-bold rounded-xl disabled:opacity-40 hover:shadow-lg hover:shadow-orange-500/30 transition-all duration-300 active:scale-[0.98]">
          {t('submit')}
        </button>
      ) : (
        <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 text-center"
             style={{ animation: 'coopGlowPulse 2s ease-in-out infinite' }}>
          <p className="text-green-400 font-bold">{t('submitted')}</p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ENTREPRENEUR TASK: Budget allocation with animated charts
// ---------------------------------------------------------------------------
function EntrepreneurTask({ onComplete }: { onComplete: (score: number, data: Record<string, unknown>) => void }) {
  const t = useTranslations('coopMissions.bridge.entrepreneur')
  const [materials, setMaterials] = useState(40)
  const [labor, setLabor] = useState(35)
  const [safety, setSafety] = useState(25)
  const [submitted, setSubmitted] = useState(false)

  const totalBudget = 500000
  const total = materials + labor + safety

  function submit() {
    if (total !== 100) return
    setSubmitted(true)

    const matScore = materials >= 35 && materials <= 50 ? 350 : materials >= 25 && materials <= 60 ? 250 : 150
    const labScore = labor >= 25 && labor <= 40 ? 350 : labor >= 15 && labor <= 50 ? 250 : 150
    const safScore = safety >= 15 && safety <= 30 ? 300 : safety >= 10 ? 200 : 100
    const score = Math.min(1000, matScore + labScore + safScore)

    onComplete(score, {
      budget: {
        materials: Math.round(totalBudget * materials / 100),
        labor: Math.round(totalBudget * labor / 100),
        safety: Math.round(totalBudget * safety / 100),
      },
      percentages: { materials, labor, safety },
    })
  }

  // Check if each category is in "good" range
  const matGood = materials >= 35 && materials <= 50
  const labGood = labor >= 25 && labor <= 40
  const safGood = safety >= 15 && safety <= 30
  const matWarn = materials < 25 || materials > 60
  const labWarn = labor < 15 || labor > 50
  const safWarn = safety < 10

  const categories = [
    {
      label: t('materials'), value: materials, set: setMaterials, icon: '🧱',
      color: '#3B82F6', gradient: 'from-blue-600 to-blue-400',
      good: matGood, warn: matWarn,
    },
    {
      label: t('labor'), value: labor, set: setLabor, icon: '👷',
      color: '#F59E0B', gradient: 'from-amber-600 to-amber-400',
      good: labGood, warn: labWarn,
    },
    {
      label: t('safetyEquip'), value: safety, set: setSafety, icon: '🦺',
      color: '#10B981', gradient: 'from-emerald-600 to-emerald-400',
      good: safGood, warn: safWarn,
    },
  ]

  // SVG pie chart data
  const pieData = [
    { value: materials, color: '#3B82F6', label: 'Materials' },
    { value: labor, color: '#F59E0B', label: 'Labor' },
    { value: safety, color: '#10B981', label: 'Safety' },
  ]

  function getPieSlices() {
    const slices: { d: string; color: string; label: string }[] = []
    let currentAngle = -90 // start from top
    const totalVal = pieData.reduce((s, d) => s + d.value, 0) || 1
    for (const item of pieData) {
      const angle = (item.value / totalVal) * 360
      const startAngle = (currentAngle * Math.PI) / 180
      const endAngle = ((currentAngle + angle) * Math.PI) / 180
      const largeArc = angle > 180 ? 1 : 0
      const x1 = 60 + 50 * Math.cos(startAngle)
      const y1 = 60 + 50 * Math.sin(startAngle)
      const x2 = 60 + 50 * Math.cos(endAngle)
      const y2 = 60 + 50 * Math.sin(endAngle)
      slices.push({
        d: `M60,60 L${x1},${y1} A50,50 0 ${largeArc},1 ${x2},${y2} Z`,
        color: item.color,
        label: item.label,
      })
      currentAngle += angle
    }
    return slices
  }

  return (
    <div className="space-y-4 relative">
      {submitted && <CelebrationOverlay />}

      <div>
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="inline-block w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-sm shadow-lg shadow-emerald-500/30">💼</span>
          {t('title')}
        </h3>
        <p className="text-gray-400 text-sm mt-1">{t('desc')}</p>
      </div>

      {/* Budget header with pie chart */}
      <div className="bg-gradient-to-br from-[#0d1b2a] to-[#0a1620] rounded-2xl border border-emerald-900/30 p-4 overflow-hidden">
        <div className="flex items-center gap-4">
          {/* Animated pie chart */}
          <div className="flex-shrink-0" style={{ animation: 'coopPieSlice 0.5s ease-out' }}>
            <svg width="120" height="120" viewBox="0 0 120 120">
              {/* Background circle */}
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
              {/* Pie slices */}
              {getPieSlices().map((slice, i) => (
                <path key={i} d={slice.d} fill={slice.color} opacity={0.85}
                  style={{ transition: 'all 0.3s ease', filter: `drop-shadow(0 0 4px ${slice.color}40)` }}
                />
              ))}
              {/* Center hole for donut look */}
              <circle cx="60" cy="60" r="24" fill="#0d1b2a" />
              {/* Center text */}
              <text x="60" y="56" textAnchor="middle" fill={total === 100 ? '#10B981' : '#EF4444'} fontSize="14" fontWeight="bold">
                {total}%
              </text>
              <text x="60" y="70" textAnchor="middle" fill="#6B7280" fontSize="8">
                {total === 100 ? '✓' : '≠ 100'}
              </text>
            </svg>
          </div>

          {/* Budget info */}
          <div className="flex-1">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">{t('totalBudget')}</p>
            <p className="text-2xl font-black text-white">${totalBudget.toLocaleString()}</p>
            {/* Legend */}
            <div className="mt-2 space-y-1">
              {categories.map(cat => (
                <div key={cat.label} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: cat.color }} />
                  <span className="text-gray-400">{cat.icon} {cat.label}</span>
                  <span className="text-white font-bold ml-auto">{cat.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Budget sliders with visual feedback */}
      {categories.map(item => {
        const barStyle = item.warn
          ? 'coopWarnPulse 2s ease-in-out infinite'
          : item.good
          ? 'coopGlowPulse 2s ease-in-out infinite'
          : 'none'
        return (
          <div key={item.label} className={clsx(
            'rounded-xl p-3 border transition-all duration-300',
            item.warn ? 'border-red-500/40 bg-red-900/10' :
            item.good ? 'border-green-500/30 bg-green-900/10' :
            'border-gray-700/30 bg-[var(--brand-dark)]/40'
          )} style={{ animation: barStyle }}>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-300 flex items-center gap-1">
                <span className="text-lg">{item.icon}</span> {item.label}
              </span>
              <span className={clsx('font-bold', item.warn ? 'text-red-400' : item.good ? 'text-green-400' : 'text-white')}>
                {item.value}% (${Math.round(totalBudget * item.value / 100).toLocaleString()})
              </span>
            </div>
            <input
              type="range" min={5} max={80} value={item.value}
              onChange={e => item.set(Number(e.target.value))}
              disabled={submitted} className="coop-slider"
            />
            {/* Animated fill bar */}
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden mt-2">
              <div className={`h-full rounded-full bg-gradient-to-r ${item.gradient} transition-all duration-300`}
                style={{ width: `${item.value}%` }} />
            </div>
            {/* Status indicator */}
            {item.warn && (
              <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                ⚠️ {t('outOfRange')}
              </p>
            )}
            {item.good && (
              <p className="text-[10px] text-green-400 mt-1 flex items-center gap-1">
                ✓ {t('optimalRange')}
              </p>
            )}
          </div>
        )
      })}

      <div className={clsx('text-center text-sm font-bold py-2 rounded-lg transition-all',
        total === 100 ? 'text-green-400 bg-green-900/20' : 'text-red-400 bg-red-900/20')}>
        {t('totalAllocation')}: {total}% {total !== 100 && `(${t('mustBe100')})`}
      </div>

      {!submitted ? (
        <button onClick={submit} disabled={total !== 100}
          className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold rounded-xl disabled:opacity-40 hover:shadow-lg hover:shadow-emerald-500/30 transition-all duration-300 active:scale-[0.98]">
          {t('submit')}
        </button>
      ) : (
        <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 text-center"
             style={{ animation: 'coopGlowPulse 2s ease-in-out infinite' }}>
          <p className="text-green-400 font-bold">{t('submitted')}</p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main CoopBridge component
// ---------------------------------------------------------------------------
export default function CoopBridge({ role, onComplete }: Props) {
  const handleComplete = (score: number, data: Record<string, unknown>) => {
    onComplete(score, data)
  }

  // Inject animation styles once
  useEffect(() => {
    if (typeof document === 'undefined') return
    const id = 'coop-bridge-styles'
    if (!document.getElementById(id)) {
      const style = document.createElement('style')
      style.id = id
      style.textContent = COOP_STYLES
      document.head.appendChild(style)
    }
    return () => {
      // Don't remove on unmount — other instances may still use them
    }
  }, [])

  switch (role) {
    case 'drone_programmer':
      return <DroneTask onComplete={handleComplete} />
    case 'robot_constructor':
      return <RobotTask onComplete={handleComplete} />
    case 'entrepreneur':
      return <EntrepreneurTask onComplete={handleComplete} />
    default:
      return <DroneTask onComplete={handleComplete} />
  }
}
