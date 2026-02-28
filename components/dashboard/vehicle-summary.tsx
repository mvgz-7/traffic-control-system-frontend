"use client"

import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Car } from "lucide-react"
import { getLineCounts, getProcessingStatus } from "@/lib/api"
import type { ProcessingStatus } from "@/lib/types"

interface VehicleSummaryProps {
  intersectionId: string
  liveLineCounts?: Record<string, Record<string, number>> | null
}

const VEHICLE_CLASSES = [
  "Bus",
  "Car",
  "E-jeep",
  "Jeepney",
  "Motorcycle",
  "Tricycle",
  "Truck",
  "Van",
]



export function VehicleSummary({ intersectionId, liveLineCounts }: VehicleSummaryProps) {
  const { data, error, isLoading } = useSWR(
    intersectionId ? ["lineCounts", intersectionId] : null,
    () => getLineCounts(intersectionId),
    { refreshInterval: 3000, fallbackData: null }
  )

  const { data: processingStatus } = useSWR<ProcessingStatus>(
    intersectionId ? ["processingStatus", intersectionId] : null,
    () => getProcessingStatus(intersectionId),
    { refreshInterval: 5000 }
  )

  const isProcessingRunning = processingStatus?.state?.toLowerCase() === "running"

  // Prefer live line counts pushed from the WebSocket when available
  const counts: Record<string, Record<string, number>> = (liveLineCounts as any) || (data?.counts || {})

  // Aggregate per-class across all lines
  const classCounts: Record<string, number> = {}
  for (const clsMap of Object.values(counts)) {
    if (!clsMap) continue
    for (const [className, n] of Object.entries(clsMap)) {
      classCounts[className] = (classCounts[className] || 0) + (Number(n) || 0)
    }
  }

  const total = Object.values(classCounts).reduce((a, b) => a + (Number(b) || 0), 0)

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2">
          <Car className="h-4 w-4 text-primary" />
          Vehicle Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive mb-3">Failed to load line counts</p>}

        {/* Processing status indicator */}
        {!isProcessingRunning && (
          <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-3">
            <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
              Processing is not running
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Start processing to begin counting vehicles crossing the counting lines.
            </p>
          </div>
        )}

        <div className="mb-4">
          <div className="p-4 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Vehicles</p>
              <p className="text-4xl md:text-5xl font-extrabold text-foreground">{total}</p>
            </div>
            <div className="text-right space-y-1">
              <Badge variant={isProcessingRunning ? "success" : "secondary"} className="text-xs">
                {isProcessingRunning ? "Live" : "Idle"}
              </Badge>
              <p className="text-xs text-muted-foreground">{isLoading ? "Loading..." : (data?.source || "-")}</p>
            </div>
          </div>
        </div>

        <div className="w-full">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {VEHICLE_CLASSES.map((c) => {
              const count = classCounts[c] ?? 0
              return (
                <div
                  key={c}
                  className="min-w-0 rounded-lg border border-border p-3 flex items-center gap-3"
                  style={{ borderLeftWidth: "3px" }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground truncate">{c}</div>
                    <div className="text-xl font-bold text-foreground tabular-nums mt-0.5">{count}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          Aggregated from counting line crossings. Reset to clear all counts.
        </p>
      </CardContent>
    </Card>
  )
}
