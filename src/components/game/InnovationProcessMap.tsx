'use client'

import { useTranslations } from 'next-intl'
import {
  INNOVATION_STAGES,
  STAGE_META,
  computeStageCoverage,
  countCoveredStages,
  type CompletedMission,
} from '@/lib/game/innovation-stages'

interface Props {
  completed: CompletedMission[]
}

export default function InnovationProcessMap({ completed }: Props) {
  const tStages = useTranslations('dashboard.stages')
  const tMap = useTranslations('dashboard.innovationMap')

  const coverage = computeStageCoverage(completed)
  const covered = countCoveredStages(coverage)

  return (
    <div className="bg-brand-panel border border-brand-border rounded-2xl p-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-white">{tMap('title')}</h2>
        <p className="text-xs text-gray-400 mt-1">{tMap('subtitle')}</p>
        <p className="text-xs text-brand-gold font-bold mt-2">
          {tMap('stagesProgress', { covered })}
        </p>
      </div>

      {/* Stages grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        {INNOVATION_STAGES.map((stageId, idx) => {
          const c = coverage.find(x => x.stage === stageId)!
          const meta = STAGE_META[c.stage]
          const isPersonal = c.hasPersonal
          const isProject = c.hasProject

          const bgClass = isPersonal
            ? 'bg-brand-dark'
            : isProject
            ? 'bg-brand-dark/60'
            : 'bg-brand-dark/30'

          const borderStyle: React.CSSProperties = isPersonal
            ? { borderColor: meta.color, borderWidth: 2 }
            : isProject
            ? { borderColor: meta.color, borderWidth: 2, borderStyle: 'dashed' }
            : { borderColor: 'rgba(156,163,175,0.2)', borderWidth: 1 }

          return (
            <div
              key={stageId}
              className={`rounded-xl p-3 flex flex-col items-center text-center transition-all ${bgClass}`}
              style={borderStyle}
              title={tStages(c.stage)}
            >
              <div className="relative mb-2">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                  style={{
                    backgroundColor: isPersonal || isProject ? `${meta.color}22` : 'transparent',
                    opacity: isPersonal || isProject ? 1 : 0.4,
                  }}
                >
                  {meta.icon}
                </div>
                {(isPersonal || isProject) && (
                  <div
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: isPersonal ? meta.color : 'transparent', border: `1.5px solid ${meta.color}` }}
                  >
                    {isPersonal ? <CheckmarkSolidSmall /> : <CheckmarkHollowSmall color={meta.color} />}
                  </div>
                )}
              </div>

              <div className="text-[10px] text-gray-500 font-bold">{idx + 1}</div>
              <div
                className="text-xs font-bold leading-tight"
                style={{ color: isPersonal || isProject ? meta.color : '#6B7280' }}
              >
                {tStages(`${c.stage}Short`)}
              </div>

              {c.personalCount > 0 && (
                <div className="text-[10px] text-gray-400 mt-1">
                  {tMap('missionsCount', { count: c.personalCount })}
                </div>
              )}
              {c.personalCount === 0 && c.projectCount > 0 && (
                <div className="text-[10px] text-gray-500 mt-1">
                  {tMap('projectsCount', { count: c.projectCount })}
                </div>
              )}
              {!isPersonal && !isProject && (
                <div className="text-[10px] text-gray-600 mt-1">{tMap('notStarted')}</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="border-t border-brand-border pt-3">
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <CheckmarkSolid />
            <span>{tMap('personalLabel')}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckmarkHollow />
            <span>{tMap('projectLabel')}</span>
          </div>
        </div>
        <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">{tMap('legend')}</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Checkmark icons
// ---------------------------------------------------------------------------
function CheckmarkSolid() {
  return (
    <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
        <path d="M2 6l3 3 5-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function CheckmarkHollow() {
  return (
    <div className="w-4 h-4 rounded-full border-2 border-green-500 bg-transparent flex items-center justify-center">
      <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
        <path d="M2 6l3 3 5-6" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function CheckmarkSolidSmall() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
      <path d="M2 6l3 3 5-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CheckmarkHollowSmall({ color }: { color: string }) {
  return (
    <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
      <path d="M2 6l3 3 5-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
