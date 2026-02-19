"use client"

import { useMemo, useState, useEffect } from "react"
import useSWR from "swr"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { IntersectionSelector } from "@/components/dashboard/intersection-selector"
import { listIntersections, getIntersectionStatus, getDecisionLog, getStatusStreamUrl } from "@/lib/api"
import type { IntersectionSummary, IntersectionStatus, LaneStatus, StatusMessage, DecisionLogEntry } from "@/lib/types"

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

  const { data: decisionLog } = useSWR<DecisionLogEntry[]>(
    selectedId ? [`decision-log-analytics`, selectedId] : null,
    selectedId ? () => getDecisionLog(selectedId, 30) : null,
    { refreshInterval: 3000 }
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
              variant="outline"
              size="sm"
              className="border-primary text-primary hover:bg-primary/10"
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
          <IntersectionSelector
            intersections={intersections || []}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />

          {selectedId && intersectionStatus && (
            <>
              {/* 3-column layout: Per-Lane Status | Vehicle Counts | VAC Decisions */}
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Column 1: Per-Lane VAC Status */}
                <Card>
                  <CardHeader>
                    <CardTitle>Per-Lane VAC Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {laneIds.map((laneId) => {
                      const lane = intersectionStatus.lanes[laneId]
                      if (!lane) return null
                      const stateUpper = String(lane.state ?? "").toUpperCase()
                      const greenOn = stateUpper === "GREEN"
                      const yellowOn = stateUpper === "YELLOW"
                      const stateColor = greenOn ? "border-green-500/40 bg-green-500/5" : yellowOn ? "border-yellow-400/40 bg-yellow-400/5" : "border-red-500/30 bg-red-500/5"
                      const badgeColor = greenOn ? "bg-green-500" : yellowOn ? "bg-yellow-400" : "bg-red-500"
                      return (
                        <div key={laneId} className={`rounded-lg border p-3 ${stateColor}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-sm">{laneId}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase text-white ${badgeColor}`}>{stateUpper || "—"}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex justify-between p-1.5 bg-background/60 rounded">
                              <span className="text-muted-foreground">Elapsed</span>
                              <span className="font-medium tabular-nums">{typeof lane.elapsed === "number" ? `${lane.elapsed.toFixed(1)}s` : "-"}</span>
                            </div>
                            <div className="flex justify-between p-1.5 bg-background/60 rounded">
                              <span className="text-muted-foreground">Gap</span>
                              <span className="font-medium tabular-nums">{typeof lane.gap === "number" ? `${lane.gap.toFixed(2)}s` : "-"}</span>
                            </div>
                          </div>
                          {lane.decision?.reason && (
                            <p className="mt-1.5 text-[11px] text-muted-foreground truncate" title={lane.decision.reason}>{lane.decision.reason}</p>
                          )}
                        </div>
                      )
                    })}

                    {/* Green Utilization */}
                    <div className="pt-3 border-t">
                      <p className="text-xs text-muted-foreground mb-1.5">Green Utilization</p>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(((rep?.elapsed ?? 0) / (rep?.max_green ?? 1)) * 100, 100)}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {typeof rep?.elapsed === "number" ? rep.elapsed.toFixed(1) : "-"}s / {typeof rep?.max_green === "number" ? rep.max_green.toFixed(1) : "-"}s
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Column 2: Vehicle Counts per Lane */}
                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <CardTitle>Vehicle Counts</CardTitle>
                      <Badge variant="outline" className="text-xs tabular-nums">
                        Total: {laneCountTotal}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {laneCountRows.length > 0 ? (
                        laneCountRows.map((row) => (
                          <div key={row.lane} className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
                            <span className="text-sm font-medium">{row.lane}</span>
                            <span className="text-lg font-bold tabular-nums">{row.count}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground py-4 text-center">No lane count data yet.</p>
                      )}
                    </div>

                    {/* Timing Info */}
                    <div className="pt-3 mt-3 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Timing Parameters</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 bg-muted rounded">
                          <p className="text-[11px] text-muted-foreground">Min Green</p>
                          <p className="text-sm font-semibold">{typeof rep?.min_green === "number" ? `${rep.min_green.toFixed(0)}s` : "-"}</p>
                        </div>
                        <div className="p-2 bg-muted rounded">
                          <p className="text-[11px] text-muted-foreground">Max Green</p>
                          <p className="text-sm font-semibold">{typeof rep?.max_green === "number" ? `${rep.max_green.toFixed(0)}s` : "-"}</p>
                        </div>
                      </div>
                    </div>

                    <p className="mt-3 text-[11px] text-muted-foreground">
                      Updated: {laneCountsUpdatedAt ? new Date(laneCountsUpdatedAt).toLocaleTimeString() : "—"}
                    </p>
                  </CardContent>
                </Card>

                {/* Column 3: VAC Decision Log */}
                <Card>
                  <CardHeader>
                    <CardTitle>VAC Decision Log</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {decisionLog && decisionLog.length > 0 ? (
                        decisionLog.map((d, i) => {
                          const actionUpper = String(d.action ?? "").toUpperCase()
                          const isExtend = actionUpper === "EXTEND" || actionUpper === "EXTEND_GREEN"
                          const isTerminate = actionUpper === "TERMINATE" || actionUpper === "TERMINATE_GREEN"
                          const actionColor = isExtend
                            ? "bg-green-500/10 text-green-700 border-green-500/30"
                            : isTerminate
                              ? "bg-red-500/10 text-red-600 border-red-500/30"
                              : "bg-muted text-foreground border-border"
                          const dotColor = isExtend ? "bg-green-500" : isTerminate ? "bg-red-500" : "bg-muted-foreground"
                          return (
                            <div key={`${d.timestamp}-${i}`} className={`rounded-lg border p-2.5 ${actionColor}`}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5">
                                  <span className={`inline-block w-2 h-2 rounded-full ${dotColor}`} />
                                  <span className="text-xs font-bold uppercase">{d.action}</span>
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(d.timestamp * 1000).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-[11px] leading-snug">{d.reason}</p>
                              <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                                <span>Phase: {d.phase}</span>
                                {typeof d.elapsed === "number" && <span>{d.elapsed.toFixed(1)}s</span>}
                                {typeof d.gap === "number" && <span>Gap: {d.gap.toFixed(2)}s</span>}
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <p className="text-sm text-muted-foreground py-4 text-center">No decisions recorded yet.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
