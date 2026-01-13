"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Activity, Clock, Target, Zap } from "lucide-react"
import type { TrafficStats, HistoricalData } from "@/lib/api"

interface PerformanceMetricsProps {
  stats: TrafficStats
  history: HistoricalData[]
}

export function PerformanceMetrics({ stats, history }: PerformanceMetricsProps) {
  // Calculate metrics from data
  const avgFps = history.length > 0 ? history.reduce((sum, h) => sum + h.fps, 0) / history.length : stats.fps
  const maxFps = 30 
  const fpsEfficiency = Math.min((avgFps / maxFps) * 100, 100)
  const vehiclesPerMinute = 10 //DUMMY
  const detectionAccuracy = 94.5 //DUMMY

  const metrics = [
    {
      label: "Detection Accuracy (DUMMY DATA)",
      value: `${detectionAccuracy}%`,
      icon: Target,
      progress: detectionAccuracy,
      color: "bg-chart-1",
    },
    {
      label: "Processing Speed",
      value: `${avgFps.toFixed(1)} FPS`,
      icon: Zap,
      progress: fpsEfficiency,
      color: "bg-chart-2",
    },
    {
      label: "Vehicles/Min (DUMMY DATA)",
      value: `${vehiclesPerMinute}`,
      icon: Activity,
      progress: vehiclesPerMinute,
      color: "bg-chart-3",
    },
    {
      label: "System Uptime",
      value: stats.status === "Active" ? "Online" : "Offline",
      icon: Clock,
      progress: stats.status === "Active" ? 100 : 0,
      color: "bg-chart-4",
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Metrics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {metrics.map((metric) => (
          <div key={metric.label} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <metric.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{metric.label}</span>
              </div>
              <span className="text-sm font-bold">{metric.value}</span>
            </div>
            <Progress value={metric.progress} className="h-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
