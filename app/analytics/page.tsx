"use client"

import { useMemo, useState, useEffect } from "react"
import useSWR from "swr"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { listIntersections, getIntersectionStatus, getVideoStreamUrl } from "@/lib/api"
import type { IntersectionSummary, VACStatus, VideoFrameMessage } from "@/lib/types"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
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

export default function AnalyticsPage() {
  const [selectedId, setSelectedId] = useState("")
  const [history, setHistory] = useState<AnalyticsPoint[]>([])
  const [laneCounts, setLaneCounts] = useState<Record<string, number>>({})
  const [laneCountsUpdatedAt, setLaneCountsUpdatedAt] = useState<number | null>(null)

  const { data: intersections } = useSWR<IntersectionSummary[]>("intersections", listIntersections, {
    refreshInterval: 5000,
  })

  const { data: vacStatus } = useSWR<VACStatus>(
    selectedId ? [`vac-status`, selectedId] : null,
    selectedId ? () => getIntersectionStatus(selectedId) : null,
    { refreshInterval: 2000 }
  )

  // Lightweight-ish live vehicle counts (lane_counts) for the table.
  // Note: backend currently publishes lane_counts on the video_feed stream.
  useEffect(() => {
    if (!selectedId) return

    let cancelled = false
    const ws = new WebSocket(getVideoStreamUrl(selectedId))

    ws.onmessage = (event) => {
      if (cancelled) return
      try {
        const msg = JSON.parse(event.data) as Partial<VideoFrameMessage>
        if (msg.type === "frame" && msg.lane_counts && typeof msg.lane_counts === "object") {
          setLaneCounts(msg.lane_counts as Record<string, number>)
          setLaneCountsUpdatedAt(Date.now())
        }
      } catch (_) {
        // ignore
      }
    }

    ws.onerror = () => {
      if (cancelled) return
      // Keep quiet; WS is optional for the table.
    }

    return () => {
      cancelled = true
      try {
        ws.close()
      } catch (_) {
        // ignore
      }
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
    // Reset history when intersection changes
    setHistory([])
  }, [selectedId])

  useEffect(() => {
    if (!vacStatus) return
    const ts = Date.now()
    const stateUpper = String(vacStatus.state ?? "").toUpperCase()
    const stateValue = stateUpper === "GREEN" ? 1 : stateUpper === "YELLOW" ? 0.5 : 0
    const utilization = vacStatus.max_green > 0 ? Math.min((vacStatus.elapsed / vacStatus.max_green) * 100, 100) : 0
    const point: AnalyticsPoint = {
      ts,
      time: formatTimeLabel(ts),
      elapsed: Number(vacStatus.elapsed ?? 0),
      gap: Number(vacStatus.gap ?? 0),
      utilization,
      state: String(vacStatus.state ?? ""),
      stateValue,
      activeLanes: Array.isArray(vacStatus.active_lanes) ? vacStatus.active_lanes.length : 0,
    }

    setHistory((prev) => {
      const next = [...prev, point]
      // Keep last ~10 minutes at 2s sampling (max 300 points)
      return next.length > 300 ? next.slice(next.length - 300) : next
    })
  }, [vacStatus])

  const report = useMemo(() => {
    return {
      generated_at: new Date().toISOString(),
      intersection_id: selectedId,
      latest_status: vacStatus ?? null,
      series: history,
    }
  }, [history, selectedId, vacStatus])

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

          {selectedId && vacStatus && (
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
                              No lane count data yet. Start processing and open the dashboard stream.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <p className="mt-3 text-xs text-muted-foreground">
                    This table uses live <span className="font-medium">lane_counts</span> from the <span className="font-medium">video_feed</span> WebSocket.
                  </p>
                </CardContent>
              </Card>
              </div>

              

              {/* Two-column layout: left = VAC Status + Active Lanes, right = Green Utilization + Decision + Min/Max info */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Left column */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>VAC Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-2 items-start">
                        <div className="flex items-center gap-4">
                          {(() => {
                            const stateUpper = vacStatus.state ? vacStatus.state.toString().toUpperCase() : ""
                            const redOn = stateUpper === "ALL_RED" || stateUpper === "RED"
                            const yellowOn = stateUpper === "YELLOW"
                            const greenOn = stateUpper === "GREEN"
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
                          })()}

                          <div className="space-y-2">
                            <div>
                              <p className="text-sm text-muted-foreground">Phase</p>
                              <p className="text-lg font-semibold">{vacStatus.phase_name}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">State</p>
                              <p className="text-lg font-semibold">{vacStatus.state}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-muted rounded">
                            <span className="text-sm">Elapsed</span>
                            <span className="font-semibold">{vacStatus.elapsed.toFixed(1)}s</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-muted rounded">
                            <span className="text-sm">Gap</span>
                            <span className="font-semibold">{vacStatus.gap.toFixed(2)}s</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground mb-2">Active Lanes</p>
                        <div className="flex flex-wrap gap-2">
                          {vacStatus.active_lanes && vacStatus.active_lanes.length > 0 ? (
                            vacStatus.active_lanes.map((lane) => (
                              <Badge key={lane} variant="default">
                                {lane}
                              </Badge>
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
                            width: `${Math.min((vacStatus.elapsed / vacStatus.max_green) * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {vacStatus.elapsed.toFixed(1)}s / {vacStatus.max_green.toFixed(1)}s
                      </p>
                    </CardContent>
                  </Card>

                  {vacStatus.decision && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Current Algorithm Decision</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-muted p-4 rounded-lg space-y-2">
                          <div>
                            <p className="text-xs text-muted-foreground">Action</p>
                            <p className="text-lg font-semibold">{vacStatus.decision.action}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Reason</p>
                            <p className="text-sm">{vacStatus.decision.reason}</p>
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
                          <p className="text-lg font-semibold">{vacStatus.min_green.toFixed(1)}s</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Max Green Time</p>
                          <p className="text-lg font-semibold">{vacStatus.max_green.toFixed(1)}s</p>
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
