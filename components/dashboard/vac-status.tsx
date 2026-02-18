"use client"

import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { getIntersectionStatus } from "@/lib/api"

interface VACStatusDisplayProps {
  intersectionId: string
  liveStatus?: any
}

function renderTrafficLight(state?: unknown) {
  const s = String(state ?? "").toUpperCase()
  const redOn = s === "ALL_RED" || s === "RED"
  const yellowOn = s === "YELLOW"
  const greenOn = s === "GREEN"
  return (
    <div className="w-14 p-2 bg-black rounded-md flex flex-col items-center gap-2">
      <div
        className={`w-8 h-8 rounded-full ${redOn ? "bg-red-500 ring-4 ring-red-400" : "bg-gray-700"}`}
        style={{ boxShadow: redOn ? "0 0 10px rgba(239,68,68,0.6)" : undefined }}
      />
      <div
        className={`w-8 h-8 rounded-full ${yellowOn ? "bg-yellow-400 ring-4 ring-yellow-300" : "bg-gray-700"}`}
        style={{ boxShadow: yellowOn ? "0 0 10px rgba(234,179,8,0.45)" : undefined }}
      />
      <div
        className={`w-8 h-8 rounded-full ${greenOn ? "bg-green-500 ring-4 ring-green-300" : "bg-gray-700"}`}
        style={{ boxShadow: greenOn ? "0 0 10px rgba(34,197,94,0.45)" : undefined }}
      />
    </div>
  )
}

function formatSeconds(value: unknown, digits = 1): string {
  if (typeof value === "number" && Number.isFinite(value)) return `${value.toFixed(digits)}s`
  return "-"
}

export function VACStatusDisplay({ intersectionId, liveStatus }: VACStatusDisplayProps) {
  const { data, error, isLoading } = useSWR(
    intersectionId ? ["intersectionStatus", intersectionId] : null,
    () => getIntersectionStatus(intersectionId),
    {
      refreshInterval: 2000,
    }
  )

  const status: any = liveStatus || data

  if (isLoading && !status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>VAC Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>VAC Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">Failed to load VAC status</p>
        </CardContent>
      </Card>
    )
  }

  const lanes: Record<string, any> = status?.lanes || {}
  const laneIds = Object.keys(lanes).slice(0, 3)

  return (
    <Card>
      <CardHeader>
        <CardTitle>VAC Status</CardTitle>
      </CardHeader>
      <CardContent>
        {laneIds.length === 0 ? (
          <p className="text-sm text-muted-foreground">No lane status available</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Lane labels at top (desktop) */}
            <div className="hidden sm:col-span-3 sm:grid sm:grid-cols-3 sm:gap-4">
              {laneIds.map((laneId) => (
                <div key={`label-${laneId}`} className="text-sm font-medium text-center">
                  {laneId}
                </div>
              ))}
            </div>

            {/* Per-lane status blocks */}
            {laneIds.map((laneId) => {
              const lane = lanes[laneId] || {}
              return (
                <div key={laneId} className="rounded-lg border p-3">
                  <div className="sm:hidden mb-2 text-sm font-medium text-center">{laneId}</div>
                  <div className="flex items-center justify-center">
                    {renderTrafficLight(lane.state)}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Elapsed</div>
                      <div>{formatSeconds(lane.elapsed, 1)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Gap</div>
                      <div>{formatSeconds(lane.gap, 2)}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
