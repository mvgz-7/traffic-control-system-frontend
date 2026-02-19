"use client"

import { useMemo, useState, useEffect } from "react"
import useSWR from "swr"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { listIntersections, getIntersectionStatus, getStatusStreamUrl } from "@/lib/api"
import type { IntersectionSummary, IntersectionStatus, LaneStatus, StatusMessage } from "@/lib/types"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"

type AnalyticsPoint = {
  ts: number
  time: string
  elapsed: number
  gap: number
  utilization: number
  state: string
  stateValue: number
  activeLanes: number
}

function formatTimeLabel(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Pick a representative lane — prefer GREEN lane, fallback to first */
function getRepLane(status: IntersectionStatus): LaneStatus | null {
  const lanes = status.lanes || {}
  const entries = Object.values(lanes)
  if (entries.length === 0) return null
  return entries.find((l) => String(l.state ?? "").toUpperCase() === "GREEN") || entries[0]
}

export default function AnalyticsPage() {
  const [selectedId, setSelectedId] = useState("")
  const [history, setHistory] = useState<AnalyticsPoint[]>([])
  const [laneCounts, setLaneCounts] = useState<Record<string, number>>({})
  const [laneCountsUpdatedAt, setLaneCountsUpdatedAt] = useState<number | null>(null)

  const { data: intersections } = useSWR<IntersectionSummary[]>("intersections", listIntersections, {
    refreshInterval: 5000,
  })

  const { data: intersectionStatus } = useSWR<IntersectionStatus>(
    selectedId ? [`vac-status`, selectedId] : null,
    selectedId ? () => getIntersectionStatus(selectedId) : null,
    { refreshInterval: 2000 }
  )

  // Use the lighter status_feed WebSocket instead of video_feed
  useEffect(() => {
    if (!selectedId) return

    let cancelled = false
    const ws = new WebSocket(getStatusStreamUrl(selectedId))

    ws.onmessage = (event) => {
      if (cancelled) return
      try {
        const msg = JSON.parse(event.data) as Partial<StatusMessage>
        if (msg.type === "status" && msg.vac_status) {
          // Extract lane counts from the status if available
          const lanes = msg.vac_status.lanes || {}
          const counts: Record<string, number> = {}
          for (const [laneId, lane] of Object.entries(lanes)) {
            if (typeof (lane as any).vehicles_this_green === "number") {
              counts[laneId] = (lane as any).vehicles_this_green
            }
          }
          if (Object.keys(counts).length > 0) {
            setLaneCounts(counts)
            setLaneCountsUpdatedAt(Date.now())
          }
        }
      } catch (_) {
        // ignore
      }
    }

    ws.onerror = () => {}

    return () => {
      cancelled = true
      try { ws.close() } catch (_) {}
    }
  }, [selectedId])

  const laneCountRows = useMemo(() => {
    return Object.entries(laneCounts)
      .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
      .map(([lane, count]) => ({ lane, count }))
  }, [laneCounts])

  const laneCountTotal = useMemo(() => {
    return Object.values(laneCounts).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0)
  }, [laneCounts])

  useEffect(() => {
    if (intersections && intersections.length > 0 && !selectedId) {
      setSelectedId(intersections[0].id)
    }
  }, [intersections, selectedId])

  useEffect(() => {
    setHistory([])
  }, [selectedId])

  useEffect(() => {
    if (!intersectionStatus) return
    const ts = Date.now()
    const rep = getRepLane(intersectionStatus)

    const elapsed = rep ? Number(rep.elapsed ?? 0) : 0
    const gap = rep ? Number(rep.gap ?? 0) : 0
    const maxGreen = rep ? Number(rep.max_green ?? 0) : 0
    const state = rep ? String(rep.state ?? "") : ""

    const stateUpper = state.toUpperCase()
    const stateValue = stateUpper === "GREEN" ? 1 : stateUpper === "YELLOW" ? 0.5 : 0
    const utilization = maxGreen > 0 ? Math.min((elapsed / maxGreen) * 100, 100) : 0

    const laneIds = Object.keys(intersectionStatus.lanes || {})

    const point: AnalyticsPoint = {
      ts,
      time: formatTimeLabel(ts),
      elapsed: Number(elapsed),
      gap: Number(gap),
      utilization,
      state,
      stateValue,
      activeLanes: laneIds.filter((id) => {
        const s = String(intersectionStatus.lanes[id]?.state ?? "").toUpperCase()
        return s === "GREEN" || s === "YELLOW"
      }).length,
    }

    setHistory((prev) => {
      const next = [...prev, point]
      return next.length > 300 ? next.slice(next.length - 300) : next
    })
  }, [intersectionStatus])

  const report = useMemo(() => {
    return {
      generated_at: new Date().toISOString(),
      intersection_id: selectedId,
      latest_status: intersectionStatus ?? null,
      series: history,
    }
  }, [history, selectedId, intersectionStatus])

  const rep = intersectionStatus ? getRepLane(intersectionStatus) : null
  const laneIds = intersectionStatus ? Object.keys(intersectionStatus.lanes || {}) : []

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="min-w-0 md:pl-72">
        <Header
          title="Traffic Analytics"
          subtitle="Real-time traffic signal analytics"
          actions={
            <Button
              variant="default"
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => {
                const safeId = selectedId || "intersection"
                const ts = new Date().toISOString().replace(/[:.]/g, "-")
                downloadJson(`traffic_analytics_${safeId}_${ts}.json`, report)
              }}
              disabled={!selectedId}
            >
              Save Report
            </Button>
          }
        />
        <div className="space-y-6 p-6">
          {/* Intersection Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Select Intersection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-t border-border pt-4">
                <p className="text-sm text-muted-foreground mb-3">Intersections</p>
                <div className="flex flex-wrap gap-2">
                  {intersections?.map((intersection) => (
                    <Button
                      key={intersection.id}
                      size="sm"
                      variant={selectedId === intersection.id ? "default" : "outline"}
                      onClick={() => setSelectedId(intersection.id)}
                    >
                      {intersection.name}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {selectedId && intersectionStatus && (
            <>
              {/* Charts */}
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Elapsed & Gap Over Time</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={history} margin={{ left: 8, right: 8, top: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                          formatter={(value: any, name: any) => [value, name]}
                          labelFormatter={(label: any) => `Time: ${label}`}
                        />
                        <Line type="monotone" dataKey="elapsed" name="Elapsed (s)" stroke="var(--chart-1)" dot={false} strokeWidth={2} />
                        <Line type="monotone" dataKey="gap" name="Gap (s)" stroke="var(--chart-3)" dot={false} strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Vehicle Summary Table (lane counts) */}
                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <CardTitle>Vehicle Summary</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Total: {laneCountTotal}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Updated: {laneCountsUpdatedAt ? new Date(laneCountsUpdatedAt).toLocaleTimeString() : "—"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="py-2 text-left font-medium">Lane</th>
                            <th className="py-2 text-right font-medium">Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {laneCountRows.length > 0 ? (
                            laneCountRows.map((row) => (
                              <tr key={row.lane} className="border-b last:border-b-0">
                                <td className="py-2 pr-4">
                                  <span className="inline-flex rounded-md bg-muted px-2 py-1 text-xs">
                                    {row.lane}
                                  </span>
                                </td>
                                <td className="py-2 text-right tabular-nums font-semibold">{row.count}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td className="py-3 text-muted-foreground" colSpan={2}>
                                No lane count data yet. Start processing to see vehicle counts per lane.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Uses lightweight <span className="font-medium">status_feed</span> WebSocket (no video overhead).
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Per-lane VAC Status + Active Lanes / Right = Green Utilization + Decision + Timing */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Left column */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Per-Lane VAC Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-3">
                        {laneIds.map((laneId) => {
                          const lane = intersectionStatus.lanes[laneId]
                          if (!lane) return null
                          const stateUpper = String(lane.state ?? "").toUpperCase()
                          const redOn = stateUpper === "ALL_RED" || stateUpper === "RED"
                          const yellowOn = stateUpper === "YELLOW"
                          const greenOn = stateUpper === "GREEN"
                          return (
                            <div key={laneId} className="flex items-center gap-4 p-3 rounded-lg border">
                              <div className="w-10 p-1.5 bg-black rounded-md flex flex-col items-center gap-1.5">
                                <div
                                  className={`w-6 h-6 rounded-full ${redOn ? "bg-red-500 ring-2 ring-red-400" : "bg-gray-700"}`}
                                  style={{ boxShadow: redOn ? "0 0 8px rgba(239,68,68,0.6)" : undefined }}
                                />
                                <div
                                  className={`w-6 h-6 rounded-full ${yellowOn ? "bg-yellow-400 ring-2 ring-yellow-300" : "bg-gray-700"}`}
                                  style={{ boxShadow: yellowOn ? "0 0 8px rgba(234,179,8,0.45)" : undefined }}
                                />
                                <div
                                  className={`w-6 h-6 rounded-full ${greenOn ? "bg-green-500 ring-2 ring-green-300" : "bg-gray-700"}`}
                                  style={{ boxShadow: greenOn ? "0 0 8px rgba(34,197,94,0.45)" : undefined }}
                                />
                              </div>

                              <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-sm">{laneId}</span>
                                  <Badge variant={greenOn ? "default" : stateUpper === "YELLOW" ? "secondary" : "destructive"}>
                                    {lane.state}
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="flex justify-between p-1.5 bg-muted rounded">
                                    <span className="text-muted-foreground">Elapsed</span>
                                    <span className="font-medium">{typeof lane.elapsed === "number" ? `${lane.elapsed.toFixed(1)}s` : "-"}</span>
                                  </div>
                                  <div className="flex justify-between p-1.5 bg-muted rounded">
                                    <span className="text-muted-foreground">Gap</span>
                                    <span className="font-medium">{typeof lane.gap === "number" ? `${lane.gap.toFixed(2)}s` : "-"}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground mb-2">Active Lanes</p>
                        <div className="flex flex-wrap gap-2">
                          {laneIds.filter((id) => {
                            const s = String(intersectionStatus.lanes[id]?.state ?? "").toUpperCase()
                            return s === "GREEN" || s === "YELLOW"
                          }).length > 0 ? (
                            laneIds.filter((id) => {
                              const s = String(intersectionStatus.lanes[id]?.state ?? "").toUpperCase()
                              return s === "GREEN" || s === "YELLOW"
                            }).map((laneId) => (
                              <Badge key={laneId} variant="default">{laneId}</Badge>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground">No active lanes</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right column */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Green Time Utilization</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(((rep?.elapsed ?? 0) / (rep?.max_green ?? 1)) * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {typeof rep?.elapsed === "number" ? rep.elapsed.toFixed(1) : "-"}s / {typeof rep?.max_green === "number" ? rep.max_green.toFixed(1) : "-"}s
                        <span className="ml-2 text-muted-foreground/70">(representative GREEN lane)</span>
                      </p>
                    </CardContent>
                  </Card>

                  {rep?.decision && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Current Algorithm Decision</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-muted p-4 rounded-lg space-y-2">
                          <div>
                            <p className="text-xs text-muted-foreground">Action</p>
                            <p className="text-lg font-semibold">{rep.decision.action}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Reason</p>
                            <p className="text-sm">{rep.decision.reason}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle>Timing Info</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Min Green Time</p>
                          <p className="text-lg font-semibold">{typeof rep?.min_green === "number" ? `${rep.min_green.toFixed(1)}s` : "-"}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Max Green Time</p>
                          <p className="text-lg font-semibold">{typeof rep?.max_green === "number" ? `${rep.max_green.toFixed(1)}s` : "-"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
