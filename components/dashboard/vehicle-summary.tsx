"use client"

import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getLineCounts } from "@/lib/api"

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
      <CardHeader>
        <CardTitle>Vehicle Summary</CardTitle>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive mb-3">Failed to load line counts</p>}
        <div className="mb-4">
          <div className="p-4 rounded-lg bg-gradient-to-r from-white/5 to-white/3 border border-muted flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Vehicles</p>
              <p className="text-4xl md:text-5xl font-extrabold text-foreground">{total}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Updated</p>
              <p className="text-xs text-muted-foreground">{isLoading ? "Loading…" : (data?.source || "-")}</p>
            </div>
          </div>
        </div>

        <div className="w-full">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {VEHICLE_CLASSES.map((c) => {
              const count = classCounts[c] ?? 0
              return (
                <div key={c} className="min-w-0 rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground truncate">{c}</div>
                  <div className="mt-2 rounded-lg bg-muted px-3 py-2 text-center">
                    <div className="text-2xl font-semibold text-foreground tabular-nums">{count}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          Counts come from <span className="font-medium">/api/v1/intersections/{intersectionId}/line-counts</span>.
        </p>
      </CardContent>
    </Card>
  )
}
