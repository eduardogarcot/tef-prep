'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { InterferencePoint } from '@/lib/analytics'

interface InterferenceChartProps {
  data: InterferencePoint[]
  trend: 'increasing' | 'decreasing' | 'stable'
}

export function InterferenceChart({ data, trend }: InterferenceChartProps) {
  const trendLabel =
    trend === 'decreasing'
      ? { icon: '↓', text: 'Decreasing', color: 'text-green-600' }
      : trend === 'increasing'
      ? { icon: '↑', text: 'Increasing', color: 'text-red-500' }
      : { icon: '→', text: 'Stable', color: 'text-gray-500' }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-gray-400">
        No data yet
      </div>
    )
  }

  return (
    <div>
      <div className={`flex items-center gap-1 text-sm font-medium mb-3 ${trendLabel.color}`}>
        <span>{trendLabel.icon}</span>
        <span>{trendLabel.text}</span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 0, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: '#fef3f2' }}
            formatter={(value) => [value, 'Interference errors']}
          />
          <Bar dataKey="count" fill="#D85A30" radius={[3, 3, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
