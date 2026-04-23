"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { format, parseISO } from "date-fns"

export interface EventsOverTimeChartProps {
  data: { date: string; count: number }[]
  /** Tooltip label for the series (e.g., "Page Views", "Downloads"). */
  label: string
  /** Line color, defaults to indigo-500. */
  color?: string
  /** Chart height in pixels, defaults to 260. */
  height?: number
}

/**
 * Single-line time-series chart for analytics event counts. Used both for
 * the global dashboard (page views) and the per-user detail page
 * (page views + downloads, as two stacked instances).
 */
export function EventsOverTimeChart({
  data,
  label,
  color = "#6366f1",
  height = 260,
}: EventsOverTimeChartProps) {
  const formattedData = data.map((item) => ({
    ...item,
    formattedDate: format(parseISO(item.date), "MMM d"),
  }))

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={formattedData}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="formattedDate"
            tick={{ fontSize: 12, fill: "#6b7280" }}
            tickLine={{ stroke: "#e5e7eb" }}
            axisLine={{ stroke: "#e5e7eb" }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#6b7280" }}
            tickLine={{ stroke: "#e5e7eb" }}
            axisLine={{ stroke: "#e5e7eb" }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
            labelStyle={{ fontWeight: "bold", marginBottom: "4px" }}
            formatter={(value) => [value, label]}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke={color}
            strokeWidth={2}
            dot={{ fill: color, strokeWidth: 2, r: 3 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
