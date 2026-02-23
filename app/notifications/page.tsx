"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertCircle, Info } from "lucide-react"
import { getDecisionLog, getHealthAlerts, listIntersections } from "@/lib/api"
import { Trash2 } from "lucide-react"
import type { DecisionLogEntry, HealthAlert, IntersectionSummary } from "@/lib/types"

export default function NotificationsPage() {
  const [selectedIntersectionId, setSelectedIntersectionId] = useState<string>("")
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deleted, setDeleted] = useState<{ [id: string]: boolean }>({})

  const { data: intersections } = useSWR<IntersectionSummary[]>("intersections", listIntersections, {
    refreshInterval: 5000,
  })

  const { data: alerts, error: alertsError } = useSWR<HealthAlert[]>("health-alerts", getHealthAlerts, {
    refreshInterval: 3000,
  })
  const { data: decisionLog, error: decisionError } = useSWR<DecisionLogEntry[]>(
    selectedIntersectionId ? ["decision-log", selectedIntersectionId] : null,
    selectedIntersectionId ? () => getDecisionLog(selectedIntersectionId, 50) : null,
    { refreshInterval: 3000 }
  )

  useEffect(() => {
    if (!selectedIntersectionId && intersections && intersections.length > 0) {
      setSelectedIntersectionId(intersections[0].id)
    }
  }, [intersections, selectedIntersectionId])

  const formatTimeAgo = (tsSeconds: number) => {
    const now = Date.now()
    const then = tsSeconds * 1000
    const diff = Math.max(0, now - then)
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return new Date(then).toLocaleDateString()
  }

  const notificationItems = useMemo(() => {
    const items: Array<
      | { kind: "alert"; id: string; ts: number; alert: HealthAlert }
      | { kind: "decision"; id: string; ts: number; decision: DecisionLogEntry }
    > = []
    for (const a of alerts ?? []) {
      items.push({ kind: "alert", id: `alert:${a.metric}:${a.timestamp}`, ts: a.timestamp, alert: a })
    }
    for (const d of decisionLog ?? []) {
      items.push({ kind: "decision", id: `decision:${d.timestamp}:${d.phase}:${d.action}`, ts: d.timestamp, decision: d })
    }
    return items.sort((x, y) => (y.ts ?? 0) - (x.ts ?? 0))
  }, [alerts, decisionLog])

  const handleDelete = (id: string) => {
    setDeleted((prev: { [id: string]: boolean }) => ({ ...prev, [id]: true }))
  }
  const handleBulkDelete = () => {
    setDeleted((prev: { [id: string]: boolean }) => {
      const next = { ...prev }
      selectedIds.forEach((id: string) => { next[id] = true })
      return next
    })
    setSelectedIds([])
    setSelectMode(false)
  }
  const handleSelectAll = () => {
    if (!selectMode) {
      setSelectMode(true)
      setSelectedIds(visibleItems.map((item) => item.id)) // check all immediately
    } else {
      setSelectMode(false)
      setSelectedIds([])
    }
  }

  const visibleItems = notificationItems.filter((n) => !deleted[n.id])

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="min-w-0 md:pl-72">
        <Header
          title="Notifications"
          subtitle="Traffic alerts and system events"
        />
        <div className="space-y-6 p-6">
          {/* Select All UI above notifications, right-aligned */}
          <div className="flex justify-end mb-2">
            <Button
              variant={selectMode ? "default" : "outline"}
              size="sm"
              onClick={handleSelectAll}
            >
              {selectMode ? "Cancel" : "Select All"}
            </Button>
            {selectMode && (
              <Button
                variant="destructive"
                size="sm"
                disabled={selectedIds.length === 0}
                onClick={handleBulkDelete}
                className="flex gap-1 items-center ml-2"
              >
                <Trash2 className="w-4 h-4 text-red-500" /> Delete
              </Button>
            )}
          </div>
          {/* Notifications List */}
          <div className="space-y-3">
            {alertsError || decisionError ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                  <p className="text-lg font-medium">Failed to load notifications</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Check that the backend is running and reachable.
                  </p>
                </CardContent>
              </Card>
            ) : visibleItems.length > 0 ? (
              visibleItems.map((item) => {
                if (item.kind === "alert") {
                  const a = item.alert
                  const isCritical = String(a.severity).toLowerCase() === "critical"
                  return (
                    <Card key={item.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          {/* Always show icon */}
                          <AlertCircle className={isCritical ? "w-5 h-5 text-destructive" : "w-5 h-5 text-yellow-500"} />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold">System Alert: {a.metric}</h3>
                              <span className="text-xs text-muted-foreground">{formatTimeAgo(a.timestamp)}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{a.message}</p>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={isCritical ? "destructive" : "secondary"}>
                                {String(a.severity).toUpperCase()}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {a.value} {a.unit}
                              </Badge>
                            </div>
                          </div>
                          {selectMode ? (
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(item.id)}
                              onChange={(e) => {
                                setSelectedIds((prev: string[]) =>
                                  e.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id)
                                )
                              }}
                              className="mt-1 w-5 h-5 accent-blue-600 border-2 border-blue-600 rounded focus:ring-2 focus:ring-blue-400"
                              style={{ boxShadow: '0 0 0 2px #3b82f6' }}
                            />
                          ) : (
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                }

                const d = item.decision
                return (
                  <Card key={item.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        {/* Always show icon */}
                        <Info className="w-5 h-5 text-blue-500" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold">VAC Decision: {d.action}</h3>
                            <span className="text-xs text-muted-foreground">{formatTimeAgo(d.timestamp)}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{d.reason}</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              Phase: {d.phase}
                            </Badge>
                            {typeof d.elapsed === "number" ? (
                              <Badge variant="outline" className="text-xs">
                                Elapsed: {d.elapsed.toFixed(1)}s
                              </Badge>
                            ) : null}
                            {typeof d.gap === "number" ? (
                              <Badge variant="outline" className="text-xs">
                                Gap: {d.gap.toFixed(2)}s
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                        {selectMode ? (
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(item.id)}
                            onChange={(e) => {
                              setSelectedIds((prev: string[]) =>
                                e.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id)
                              )
                            }}
                            className="mt-1 w-5 h-5 accent-blue-600 border-2 border-blue-600 rounded focus:ring-2 focus:ring-blue-400"
                            style={{ boxShadow: '0 0 0 2px #3b82f6' }}
                          />
                        ) : (
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Info className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No notifications</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    No active health alerts and no decision log entries.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
