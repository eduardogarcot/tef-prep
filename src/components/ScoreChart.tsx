'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { CRITERION_COLORS, CRITERION_LABELS } from '@/lib/analytics'
import type { ScoreChartPoint } from '@/lib/analytics'

interface ScoreChartProps {
  data: ScoreChartPoint[]
  height?: number
  showTooltip?: boolean
  showReferenceLines?: boolean
}

const CRITERIA = Object.keys(CRITERION_COLORS) as (keyof typeof CRITERION_COLORS)[]

interface TooltipEntry {
  name: string
  value: number
  color: string
  payload: ScoreChartPoint
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const title = payload[0]?.payload?.title
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-md px-3 py-2 text-xs">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      {title && <p className="text-gray-500 mb-1.5 italic truncate max-w-[180px]">{title}</p>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-600 capitalize">{p.name}</span>
          <span className="font-medium text-gray-900 ml-auto pl-3">{p.value}/3</span>
        </div>
      ))}
    </div>
  )
}

export function ScoreChart({
  data,
  height = 250,
  showTooltip = false,
  showReferenceLines = false,
}: ScoreChartProps) {
  if (data.length < 2) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400"
        style={{ height }}
      >
        Complete at least 2 exercises to see your progress
      </div>
    )
  }

  return (
    <div>
      {/* Custom legend */}
      <div className="flex flex-wrap gap-4 mb-3">
        {CRITERIA.map((key) => (
          <div key={key} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: CRITERION_COLORS[key] }}
            />
            <span className="text-xs text-gray-500">{CRITERION_LABELS[key]}</span>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 3]}
            ticks={[0, 1, 2, 3]}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
          />
          {showTooltip && <Tooltip content={<CustomTooltip />} />}
          {showReferenceLines && (
            <>
              <ReferenceLine
                y={2}
                stroke="#d1d5db"
                strokeDasharray="4 3"
                label={{ value: 'Intermédiaire', position: 'insideTopRight', fontSize: 10, fill: '#9ca3af' }}
              />
              <ReferenceLine
                y={3}
                stroke="#d1d5db"
                strokeDasharray="4 3"
                label={{ value: 'Avancé', position: 'insideTopRight', fontSize: 10, fill: '#9ca3af' }}
              />
            </>
          )}
          {CRITERIA.map((key) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={CRITERION_COLORS[key]}
              strokeWidth={2}
              dot={showReferenceLines ? { r: 3, fill: CRITERION_COLORS[key] } : false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
