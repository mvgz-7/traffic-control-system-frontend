"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { VideoFrameMessage } from "@/lib/types"

interface VehicleSummaryProps {
  laneCounts?: Record<string, number>
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

export function VehicleSummary({ laneCounts }: VehicleSummaryProps) {
  const total = laneCounts ? Object.values(laneCounts).reduce((a, b) => a + b, 0) : 0

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Vehicle Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="p-4 rounded-lg bg-gradient-to-r from-white/5 to-white/3 border border-muted flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Vehicles</p>
              <p className="text-4xl md:text-5xl font-extrabold text-foreground">{total}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Updated</p>
            </div>
          </div>
        </div>

        <div className="w-full">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {VEHICLE_CLASSES.map((c) => {
              const count = laneCounts?.[c] ?? 0
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

        <p className="text-xs text-muted-foreground mt-3">Note: Per-class counts require backend support to publish class tallies in the status stream.</p>
      </CardContent>
    </Card>
  )
}
