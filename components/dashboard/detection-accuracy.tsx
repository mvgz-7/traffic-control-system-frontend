"use client"

import { useMemo } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getHealthMetrics, getHealth, getProcessingStatus } from "@/lib/api"
import type { HealthMetricPoint, ProcessingStatus } from "@/lib/types"
import { Activity, TrendingUp, TrendingDown, Minus } from "lucide-react"

interface DetectionAccuracyProps {
  intersectionId: string
}

function getConfidenceColor(value: number): string {
  if (value >= 0.8) return "text-green-500"
  if (value >= 0.6) return "text-yellow-500"
  return "text-red-500"
}

function getConfidenceBg(value: number): string {
  if (value >= 0.8) return "bg-green-500/10 border-green-500/30"
  if (value >= 0.6) return "bg-yellow-500/10 border-yellow-500/30"
  return "bg-red-500/10 border-red-500/30"
}

function getConfidenceLabel(value: number): string {
  if (value >= 0.9) return "Excellent"
  if (value >= 0.8) return "Good"
  if (value >= 0.7) return "Fair"
  if (value >= 0.6) return "Low"
  return "Poor"
}

function getConfidenceBadgeVariant(value: number): "success" | "warning" | "destructive" | "secondary" {
  if (value >= 0.8) return "success"
  if (value >= 0.6) return "warning"
  if (value > 0) return "destructive"
  return "secondary"
}

/** Tiny inline sparkline drawn with SVG */
function Sparkline({ data, width = 200, height = 40 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) return null

  const min = Math.min(...data) * 0.95
  const max = Math.max(...data) * 1.05 || 1
  const range = max - min || 1

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * height
    return `${x},${y}`
  })

  const last = data[data.length - 1]
  const color = last >= 0.8 ? "#22c55e" : last >= 0.6 ? "#eab308" : "#ef4444"

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points.join(" ")}
        opacity={0.8}
      />
      {/* gradient fill under the line */}
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        fill="url(#sparkFill)"
        points={`0,${height} ${points.join(" ")} ${width},${height}`}
      />
    </svg>
  )
}

export function DetectionAccuracy({ intersectionId }: DetectionAccuracyProps) {
  // Fetch avg_confidence history from the health metrics endpoint (5-min window)
  const { data: confidenceHistory } = useSWR<HealthMetricPoint[]>(
    "health-metrics-avg_confidence",
    () => getHealthMetrics("avg_confidence", 300),
    { refreshInterval: 5000, fallbackData: [] }
  )

  // Fetch overall health status to get latest avg_confidence
  const { data: healthStatus } = useSWR(
    "health-status",
    () => getHealth(),
    { refreshInterval: 5000 }
  )

  // Fetch processing status
  const { data: processingStatus } = useSWR<ProcessingStatus>(
    intersectionId ? ["processingStatus", intersectionId] : null,
    () => getProcessingStatus(intersectionId),
    { refreshInterval: 5000 }
  )

  const isProcessingRunning = processingStatus?.state?.toLowerCase() === "running"

  // Derive stats from history
  const stats = useMemo(() => {
    const history = confidenceHistory || []
    if (history.length === 0) {
      // Fall back to latest from healthStatus
      const latest = healthStatus?.metrics?.avg_confidence
      if (latest !== undefined && latest !== null) {
        return {
          current: latest as number,
          avg: latest as number,
          min: latest as number,
          max: latest as number,
          trend: 0,
          sparkData: [latest as number],
          count: 1,
        }
      }
      return null
    }

    const values = history.map((p) => p.value)
    const current = values[values.length - 1]
    const avg = values.reduce((a, b) => a + b, 0) / values.length
    const min = Math.min(...values)
    const max = Math.max(...values)

    // Calculate trend: compare last 5 vs previous 5
    let trend = 0
    if (values.length >= 10) {
      const recent = values.slice(-5).reduce((a, b) => a + b, 0) / 5
      const earlier = values.slice(-10, -5).reduce((a, b) => a + b, 0) / 5
      trend = recent - earlier
    }

    return { current, avg, min, max, trend, sparkData: values, count: values.length }
  }, [confidenceHistory, healthStatus])

  const TrendIcon = stats && stats.trend > 0.01 ? TrendingUp : stats && stats.trend < -0.01 ? TrendingDown : Minus

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Detection Accuracy
        </CardTitle>
        <Badge variant={stats ? getConfidenceBadgeVariant(stats.current) : "secondary"} className="text-xs">
          {isProcessingRunning ? "Live" : "Idle"}
        </Badge>
      </CardHeader>
      <CardContent>
        {/* Processing not running warning */}
        {!isProcessingRunning && (
          <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-3">
            <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
              Processing is not running
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Start processing to see live detection confidence metrics.
            </p>
          </div>
        )}

        {!stats ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">No detection data available yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Confidence metrics appear once AI processing begins.
            </p>
          </div>
        ) : (
          <>
            {/* Current confidence - large display */}
            <div className={`p-4 rounded-lg border ${getConfidenceBg(stats.current)} flex items-center justify-between mb-4`}>
              <div>
                <p className="text-sm text-muted-foreground">Current Confidence</p>
                <div className="flex items-baseline gap-2">
                  <p className={`text-4xl md:text-5xl font-extrabold tabular-nums ${getConfidenceColor(stats.current)}`}>
                    {(stats.current * 100).toFixed(1)}%
                  </p>
                  <span className="text-sm text-muted-foreground font-medium">
                    {getConfidenceLabel(stats.current)}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendIcon className={`h-3 w-3 ${
                    stats.trend > 0.01 ? "text-green-500" : stats.trend < -0.01 ? "text-red-500" : "text-muted-foreground"
                  }`} />
                  {stats.trend > 0.01 ? "Improving" : stats.trend < -0.01 ? "Declining" : "Stable"}
                </div>
              </div>
            </div>

            {/* Sparkline chart */}
            {stats.sparkData.length >= 2 && (
              <div className="mb-4 p-3 rounded-lg border border-border bg-muted/20">
                <p className="text-xs text-muted-foreground mb-2">Confidence Trend (last 5 min)</p>
                <div className="w-full flex justify-center">
                  <Sparkline data={stats.sparkData} width={280} height={48} />
                </div>
              </div>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-xs text-muted-foreground">Average</p>
                <p className={`text-lg font-bold tabular-nums ${getConfidenceColor(stats.avg)}`}>
                  {(stats.avg * 100).toFixed(1)}%
                </p>
              </div>
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-xs text-muted-foreground">Min</p>
                <p className={`text-lg font-bold tabular-nums ${getConfidenceColor(stats.min)}`}>
                  {(stats.min * 100).toFixed(1)}%
                </p>
              </div>
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-xs text-muted-foreground">Max</p>
                <p className={`text-lg font-bold tabular-nums ${getConfidenceColor(stats.max)}`}>
                  {(stats.max * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-3">
              Average confidence across all detected vehicles. Updated every 5 seconds from the AI model.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
