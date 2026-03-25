'use client'

import { useTranslations } from 'next-intl'
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip,
} from 'recharts'
import type { CompetencyScore } from '@/types/database'

interface CompetencyRadarProps {
  scores: CompetencyScore
}

export default function CompetencyRadar({ scores }: CompetencyRadarProps) {
  const t = useTranslations('dashboard.axes')

  const data = [
    { axis: t('technical_precision'), value: scores.technical_precision },
    { axis: t('analytical_thinking'), value: scores.analytical_thinking },
    { axis: t('creativity'), value: scores.creativity },
    { axis: t('teamwork'), value: scores.teamwork },
    { axis: t('management'), value: scores.management },
    { axis: t('learning_speed'), value: scores.learning_speed },
  ]

  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke="#1F2937" />
        <PolarAngleAxis
          dataKey="axis"
          tick={{ fill: '#9CA3AF', fontSize: 12 }}
        />
        <Radar
          name="Competencies"
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
