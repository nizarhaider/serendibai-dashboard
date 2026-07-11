'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DailyCallCount } from '@/lib/types'

type CallsChartProps = {
  data: DailyCallCount[]
}

export default function CallsChart({ data }: CallsChartProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: -20, right: 12, top: 12, bottom: 0 }}>
          <defs>
            <linearGradient id="callsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#28a98b" stopOpacity={0.34} />
              <stop offset="95%" stopColor="#28a98b" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#dfe5df" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#627184', fontSize: 12 }}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#627184', fontSize: 12 }}
          />
          <Tooltip
            cursor={{ stroke: '#168f8b', strokeWidth: 1 }}
            contentStyle={{
              border: '1px solid #dce4de',
              borderRadius: 14,
              boxShadow: '0 14px 40px rgba(16, 40, 32, 0.12)',
            }}
          />
          <Area
            type="monotone"
            dataKey="calls"
            stroke="#17876f"
            strokeWidth={2}
            fill="url(#callsGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
