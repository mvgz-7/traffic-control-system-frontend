"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Area, AreaChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from "recharts"
import type { HistoricalData } from "@/lib/api"

interface TrafficChartProps {
  data: HistoricalData[]
}

export function TrafficChart({ data }: TrafficChartProps) {
  // Transform data
  const chartData = data.map((item, index) => {
    const lanes = item.lanes || {}
    return {
      time: item.timestamp
        ? new Date(item.timestamp).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        : `T-${data.length - index}`,
      total: item.total,
      ...lanes,
    }
  })

  // Get lane names
  const laneNames = data.find((d) => d.lanes && Object.keys(d.lanes).length > 0)?.lanes
  const lanes = laneNames ? Object.keys(laneNames) : []

  const colors = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444"]

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Vehicle Count Over Time</CardTitle>
        <CardDescription>Real-time traffic flow monitoring (last 60 data points)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                {lanes.map((lane, i) => (
                  <linearGradient key={lane} id={`color${lane}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors[i % colors.length]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={colors[i % colors.length]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="time" stroke="#666" fontSize={12} tickLine={false} interval="preserveStartEnd" />
              <YAxis stroke="#666" fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1625",
                  border: "1px solid #333",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#fff" }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#6366f1"
                fillOpacity={1}
                fill="url(#colorTotal)"
                name="Total"
              />
              {lanes.map((lane, i) => (
                <Area
                  key={lane}
                  type="monotone"
                  dataKey={lane}
                  stroke={colors[i % colors.length]}
                  fillOpacity={1}
                  fill={`url(#color${lane})`}
                  name={lane}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
