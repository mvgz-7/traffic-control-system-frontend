"use client"

import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { getIntersectionStatus } from "@/lib/api"
import type { IntersectionStatus, LaneStatus } from "@/lib/types"

interface VACStatusDisplayProps {
  intersectionId: string
  liveStatus?: IntersectionStatus | null
}

function renderTrafficLight(state?: unknown) {
  const s = String(state ?? "").toUpperCase()
  const redOn = s === "ALL_RED" || s === "RED"
  const yellowOn = s === "YELLOW"
  const greenOn = s === "GREEN"
  return (
    <div className="basis-[25%] py-4 gap-5 p-1.5 bg-gradient-to-b from-zinc-800 to-zinc-950 rounded-2xl flex flex-col items-center justify-center shadow-inner border border-zinc-700/50 self-stretch">
      <div
        className={`w-10 h-10 rounded-full transition-all duration-300 ${redOn ? "bg-red-500 ring-[3px] ring-red-400/50" : "bg-zinc-700/60"}`}
        style={{ boxShadow: redOn ? "0 0 14px 2px rgba(239,68,68,0.5), inset 0 1px 2px rgba(255,255,255,0.15)" : "inset 0 1px 3px rgba(0,0,0,0.4)" }}
      />
      <div
        className={`w-10 h-10 rounded-full transition-all duration-300 ${yellowOn ? "bg-yellow-400 ring-[3px] ring-yellow-300/50" : "bg-zinc-700/60"}`}
        style={{ boxShadow: yellowOn ? "0 0 14px 2px rgba(234,179,8,0.4), inset 0 1px 2px rgba(255,255,255,0.15)" : "inset 0 1px 3px rgba(0,0,0,0.4)" }}
      />
      <div
        className={`w-10 h-10 rounded-full transition-all duration-300 ${greenOn ? "bg-green-500 ring-[3px] ring-green-300/50" : "bg-zinc-700/60"}`}
        style={{ boxShadow: greenOn ? "0 0 14px 2px rgba(34,197,94,0.4), inset 0 1px 2px rgba(255,255,255,0.15)" : "inset 0 1px 3px rgba(0,0,0,0.4)" }}
      />
    </div>
  )
}

function formatSeconds(value: unknown, digits = 1): string {
  if (typeof value === "number" && Number.isFinite(value)) return `${value.toFixed(digits)}s`
  return "-"
}

export function VACStatusDisplay({ intersectionId, liveStatus }: VACStatusDisplayProps) {
  const { data, error, isLoading } = useSWR<IntersectionStatus>(
    intersectionId ? ["intersectionStatus", intersectionId] : null,
    () => getIntersectionStatus(intersectionId),
    {
      refreshInterval: 2000,
    }
  )

  const status: IntersectionStatus | null | undefined = liveStatus || data

  if (isLoading && !status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Traffic Light Status</CardTitle>
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
          <CardTitle>Traffic Light Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">Failed to load traffic light status</p>
        </CardContent>
      </Card>
    )
  }

  const lanes: Record<string, LaneStatus> = status?.lanes || {}
  const laneIds = Object.keys(lanes)

  // Dynamic grid columns based on lane count
  const gridCols = laneIds.length <= 2 ? "sm:grid-cols-2" : laneIds.length === 3 ? "sm:grid-cols-3" : `sm:grid-cols-${Math.min(laneIds.length, 4)}`

  // State color helper
  function stateColor(state?: string) {
    const s = String(state ?? "").toUpperCase()
    if (s === "GREEN") return { bg: "bg-green-500/20", border: "border-green-600/60", text: "text-green-600", badge: "bg-green-500" }
    if (s === "YELLOW") return { bg: "bg-yellow-500/20", border: "border-yellow-500/60", text: "text-yellow-600", badge: "bg-yellow-400" }
    return { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-500", badge: "bg-red-500" }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          Traffic Light Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        {laneIds.length === 0 ? (
          <p className="text-sm text-muted-foreground">No lane status available</p>
        ) : (
          <div className={`grid grid-cols-1 gap-4 ${gridCols}`}>
            {/* Per-lane status blocks */}
            {laneIds.map((laneId) => {
              const lane = lanes[laneId] || {} as LaneStatus
              const colors = stateColor(lane.state)
              const stateUpper = String(lane.state ?? "").toUpperCase()
              return (
                <div key={laneId} className={`rounded-xl border ${colors.border} ${colors.bg} p-7 transition-colors duration-300`}>
                  {/* Lane header */}
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-sm font-semibold text-foreground">{laneId}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white ${colors.badge}`}>
                      {stateUpper || "—"}
                    </span>
                  </div>

                  {/* Traffic light + metrics side by side */}
                  <div className="flex items-stretch gap-3">
                    {renderTrafficLight(lane.state)}
                    <div className="flex-1 min-w-0 flex flex-col justify-between ml-3">
                      <div className="flex items-center justify-between rounded-md bg-background/100 px-2.5 py-2">
                        <span className="text-sm font-medium">Countdown</span>
                        <span className={`text-sm font-semibold tabular-nums ${stateUpper === "GREEN" && typeof lane.countdown === "number" && lane.countdown > 0 ? "text-green-600" : ""}`}>
                          {stateUpper === "GREEN" && typeof lane.countdown === "number" ? `${lane.countdown.toFixed(1)}s` : "-"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-md bg-background/100 px-2.5 py-2">
                        <span className="text-sm font-medium">Elapsed</span>
                        <span className="text-sm font-semibold tabular-nums">{formatSeconds(lane.elapsed, 1)}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-md bg-background/100 px-2.5 py-2">
                        <span className="text-sm font-medium">Gap</span>
                        <span className="text-sm font-semibold tabular-nums">{formatSeconds(lane.gap, 2)}</span>
                      </div>
                      {typeof lane.vehicles_this_green === "number" && (
                        <div className="flex items-center justify-between rounded-md bg-background/100 px-2.5 py-2">
                          <span className="text-sm font-medium">Vehicles</span>
                          <span className="text-sm font-semibold tabular-nums">{lane.vehicles_this_green}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Decision reason */}
                  {lane.decision?.reason && (
                    <p className="mt-2 text-[11px] text-muted-foreground truncate" title={lane.decision.reason}>
                      {lane.decision.reason}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
