"use client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
export default function UsageChart({
  data,
  metric = "calls",
  compact = false,
}: {
  data: {
    date: string;
    calls: number;
    minutes: number | null;
    tokens: number | null;
  }[];
  metric?: "calls" | "minutes" | "tokens";
  compact?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <AreaChart
        data={data}
        margin={
          compact
            ? { top: 4, right: 0, left: 0, bottom: 0 }
            : { top: 12, right: 12, left: -24, bottom: 0 }
        }
      >
        <defs>
          <linearGradient
            id={`fill-${metric}-${compact}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor="#2a6a62" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#2a6a62" stopOpacity={0} />
          </linearGradient>
        </defs>
        {!compact && (
          <>
            <CartesianGrid
              vertical={false}
              stroke="#e8eeec"
              strokeDasharray="3 4"
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              minTickGap={38}
              tick={{ fill: "#5c6f6c", fontSize: 11 }}
              tickFormatter={(v) =>
                new Date(`${v}T00:00:00`).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })
              }
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#5c6f6c", fontSize: 11 }}
              allowDecimals={metric === "minutes"}
            />
            <Tooltip
              contentStyle={{
                border: "1px solid #d7e0dd",
                borderRadius: 12,
                fontSize: 12,
                boxShadow: "0 8px 30px #0c262412",
              }}
              labelFormatter={(v) =>
                new Date(`${v}T00:00:00`).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                })
              }
            />
          </>
        )}
        <Area
          type="monotone"
          dataKey={metric}
          stroke="#0c2624"
          strokeWidth={compact ? 2 : 2.5}
          fill={`url(#fill-${metric}-${compact})`}
          connectNulls={false}
          isAnimationActive={false}
          activeDot={compact ? false : { r: 5, stroke: "#fff", strokeWidth: 3 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
