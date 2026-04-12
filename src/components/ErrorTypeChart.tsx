'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { ErrorAggregate } from '@/lib/analytics'
import Link from 'next/link'

interface ErrorTypeChartProps {
  data: ErrorAggregate[]
}

export function ErrorTypeChart({ data }: ErrorTypeChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-sm text-gray-400 gap-2">
        <span>No errors recorded yet.</span>
        <Link href="/practice" className="text-blue-600 text-xs hover:underline">
          Start practising →
        </Link>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 44)}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 0, right: 24, bottom: 0, left: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="type"
          tick={{ fontSize: 12, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
          width={100}
          tickFormatter={(v: string) =>
            v.charAt(0).toUpperCase() + v.slice(1)
          }
        />
        <Tooltip
          cursor={{ fill: '#f9fafb' }}
          formatter={(value) => [value, 'Errors']}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={28}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
