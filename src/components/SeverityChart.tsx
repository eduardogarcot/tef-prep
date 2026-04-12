'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { SeverityCount } from '@/lib/analytics'

interface SeverityChartProps {
  data: SeverityCount[]
}

export function SeverityChart({ data }: SeverityChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-gray-400">
        No errors recorded yet
      </div>
    )
  }

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="flex items-center gap-6">
      <ResponsiveContainer width={160} height={160}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={70}
            dataKey="value"
            strokeWidth={2}
            stroke="#fff"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [value, 'errors']} />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-col gap-2">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2 text-sm">
            <span
              className="h-3 w-3 rounded-sm shrink-0"
              style={{ background: entry.color }}
            />
            <span className="text-gray-600 capitalize w-16">{entry.name}</span>
            <span className="font-medium text-gray-900 tabular-nums">{entry.value}</span>
            <span className="text-gray-400 text-xs">
              ({Math.round((entry.value / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
