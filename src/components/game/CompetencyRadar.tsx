'use client'

import { useTranslations } from 'next-intl'
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip,
} from 'recharts'
import type { CompetencyScore } from '@/types/database'

interface CompetencyRadarProps {
  scores: CompetencyScore
}

function CustomTick({ payload, x, y, textAnchor, fill: _fill, ...rest }: Record<string, unknown>) {
  const text = String(payload && typeof payload === 'object' && 'value' in payload ? (payload as { value: string }).value : '')
  void _fill // ignore Recharts default fill
  // Split long labels into two lines
  const words = text.split(' ')
  let lines: string[]
  if (words.length >= 2 && text.length > 10) {
    const mid = Math.ceil(words.length / 2)
    lines = [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
  } else {
    lines = [text]
  }
  return (
    <text x={x as number} y={y as number} textAnchor={textAnchor as string} {...rest} fill="#E5E7EB" fontSize={11}>
      {lines.map((line, i) => (
        <tspan key={i} x={x as number} dy={i === 0 ? 0 : 14}>{line}</tspan>
      ))}
    </text>
  )
}

export default function CompetencyRadar({ scores }: CompetencyRadarProps) {
  const t = useTranslations('dashboard.axes')
  const tDash = useTranslations('dashboard')

  const data = [
    { axis: t('technical_precision'), value: scores.technical_precision },
    { axis: t('analytical_thinking'), value: scores.analytical_thinking },
    { axis: t('creativity'), value: scores.creativity },
    { axis: t('teamwork'), value: scores.teamwork },
    { axis: t('management'), value: scores.management },
    { axis: t('learning_speed'), value: scores.learning_speed },
  ]

  return (
    <ResponsiveContainer width="100%" height={350}>
      <RadarChart data={data} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
        <PolarGrid stroke="#1F2937" />
        <PolarAngleAxis
          dataKey="axis"
          tick={CustomTick}
        />
        <Radar
          name={tDash('competencies')}
          dataKey="value"
          stroke="#1E90FF"
          fill="#1E90FF"
          fillOpacity={0.25}
          strokeWidth={2}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: 8 }}
          labelStyle={{ color: '#fff' }}
          itemStyle={{ color: '#1E90FF' }}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
