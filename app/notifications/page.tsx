"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Info } from "lucide-react"
import { getHealthAlerts, listIntersections, getActiveNotifications } from "@/lib/api"
import type { HealthAlert, IntersectionSummary, TrafficNotification } from "@/lib/types"

export default function NotificationsPage() {
  const [selectedIntersectionId, setSelectedIntersectionId] = useState<string>("")

  const { data: intersections } = useSWR<IntersectionSummary[]>("intersections", listIntersections, {
    refreshInterval: 5000,
  })

  const { data: alerts, error: alertsError } = useSWR<HealthAlert[]>("health-alerts", getHealthAlerts, {
    refreshInterval: 3000,
  })

  // Active traffic notifications (from backend /notifications/active)
  const { data: notifications, error: notificationsError } = useSWR<TrafficNotification[]>(
    "active-notifs",
    () => getActiveNotifications(selectedIntersectionId || undefined),
    { refreshInterval: 3000 }
  )


  // Debug and safeguard `alerts` to ensure it is an array
  useEffect(() => {
    if (!Array.isArray(alerts)) {
      console.error("Expected alerts to be an array, but got:", alerts);
    }
  }, [alerts]);

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
      | { kind: "notif"; id: string; ts: number; notif: TrafficNotification }
    > = []

    if (Array.isArray(alerts)) {
      for (const alert of alerts) {
        items.push({ kind: "alert", id: `alert:${alert.metric}:${alert.timestamp}`, ts: alert.timestamp, alert })
      }
    }

    if (Array.isArray(notifications)) {
      for (const n of notifications) {
        items.push({ kind: "notif", id: n.id, ts: n.timestamp, notif: n })
      }
    }

    return items.sort((x, y) => (y.ts ?? 0) - (x.ts ?? 0))
  }, [alerts, notifications])

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="min-w-0 md:pl-72">
        <Header
          title="Notifications"
          subtitle="Traffic alerts and system events"
        />
        <div className="space-y-6 p-6">

          {/* Notifications List */}
          <div className="space-y-3">
            {alertsError || notificationsError ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                    <p className="text-lg font-medium">Failed to load notifications</p>
                    <p className="text-sm text-muted-foreground mt-1">Check that the backend is running and reachable.</p>
                </CardContent>
              </Card>
              ) : notificationItems.length > 0 ? (
                notificationItems.map((it) => {
                  if (it.kind === "alert") {
                    const alert = it.alert
                    const isCritical = String(alert.severity).toLowerCase() === "critical"
                    return (
                      <Card key={it.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 mt-1">
                              <AlertCircle className={isCritical ? "w-5 h-5 text-destructive" : "w-5 h-5 text-yellow-500"} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="font-semibold">System Alert: {alert.metric}</h3>
                                <span className="text-xs text-muted-foreground">{formatTimeAgo(alert.timestamp)}</span>
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">{alert.message}</p>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={isCritical ? "destructive" : "secondary"}>
                                  {String(alert.severity).toUpperCase()}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {alert.value} {alert.unit}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  }

                  // Traffic notifications
                  const n = it.notif
                  const isCriticalNotif = String(n.severity).toLowerCase() === "critical"
                  return (
                    <Card key={it.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 mt-1">
                            <AlertCircle className={isCriticalNotif ? "w-5 h-5 text-destructive" : "w-5 h-5 text-primary"} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold">{n.notification_type.replace("_", " ")}</h3>
                              <span className="text-xs text-muted-foreground">{formatTimeAgo(n.timestamp)}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{n.message}</p>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={isCriticalNotif ? "destructive" : "secondary"}>{String(n.severity).toUpperCase()}</Badge>
                              {n.intersection_id && <Badge variant="outline" className="text-xs">{n.intersection_id}{n.lane_id ? ` / ${n.lane_id}` : ""}</Badge>}
                            </div>
                          
                          </div>
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
