"use client"

import type { ReactNode } from "react"
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
              const ICONS: Record<string, ReactNode> = {
                    Bus: (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="12" rx="2" />
                        <path d="M7 20v-2" />
                        <path d="M17 20v-2" />
                        <path d="M3 10h18" />
                      </svg>
                    ),
                    Car: (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12l1-3c1-2 4-3 7-3s6 1 7 3l1 3" />
                        <rect x="5" y="12" width="14" height="6" rx="2" />
                        <path d="M7 18v2" />
                        <path d="M17 18v2" />
                      </svg>
                    ),
                    "E-jeep": (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="6" width="14" height="12" rx="2" />
                        <path d="M7 18v2" />
                        <path d="M13 18v2" />
                        <path d="M20 8v6" />
                        <path d="M18 10h2l-2 4" />
                      </svg>
                    ),
                    Jeepney: (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="5" width="20" height="10" rx="2" />
                        <path d="M6 15v2" />
                        <path d="M18 15v2" />
                        <path d="M2 11h20" />
                      </svg>
                    ),
                    Motorcycle: (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
                        <path d="M19 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
                        <path d="M9 17h4l3-5-2-2-2 1" />
                      </svg>
                    ),
                    Tricycle: (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="6" cy="17" r="2" />
                        <circle cx="18" cy="17" r="2" />
                        <path d="M6 17h6l2-6h2" />
                        <path d="M4 12h2" />
                      </svg>
                    ),
                    Truck: (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 3h13v13H1z" />
                        <path d="M14 8h6l3 3v5h-9" />
                        <circle cx="6" cy="20" r="1" />
                        <circle cx="18" cy="20" r="1" />
                      </svg>
                    ),
                    Van: (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                        <rect x="1" y="6" width="16" height="10" rx="2" />
                        <path d="M17 8h4v6" />
                        <circle cx="6" cy="18" r="1" />
                        <circle cx="18" cy="18" r="1" />
                      </svg>
                    ),
                  }
              const icon = ICONS[c] ?? ICONS["Car"]
              return (
                <div key={c} className="min-w-0 rounded-lg bg-muted p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                      <div className="shrink-0">{icon}</div>
                      <div className="text-sm text-muted-foreground truncate">{c}</div>
                    </div>
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
