"use client"

import useSWR from "swr"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Server, Info } from "lucide-react"
import { getHealth } from "@/lib/api"
import type { HealthResponse } from "@/lib/types"
import { useSearchParams } from "next/navigation"

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const newIntersection = (searchParams.get("new_intersection") || "").trim()

  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const { data: health } = useSWR<HealthResponse>("health", getHealth, {
    refreshInterval: 5000,
  })

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="min-w-0 md:pl-72">
        <Header
          title="Settings"
          subtitle="System configuration and preferences"
        />
        <div className="space-y-6 p-6">
          {newIntersection ? (
            <Card>
              <CardHeader>
                <CardTitle>New Intersection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">
                  You entered: <span className="font-semibold">{newIntersection}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Intersection creation is currently managed by backend configuration files. Use this name when updating your backend intersection config.
                </p>
              </CardContent>
            </Card>
          ) : null}

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">API Server</p>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const statusUpper = String(health?.status ?? "").toUpperCase()
                      const isHealthy = statusUpper === "HEALTHY"
                      const isDegraded = statusUpper === "DEGRADED"
                      const isUnknown = !health?.status
                      return (
                        <>
                          <div className={`w-3 h-3 rounded-full ${isHealthy ? "bg-green-500" : isDegraded ? "bg-amber-500" : isUnknown ? "bg-gray-400" : "bg-red-500"}`} />
                          <Badge variant={isHealthy ? "default" : isDegraded ? "warning" : isUnknown ? "secondary" : "destructive"}>{health?.status ?? "Unknown"}</Badge>
                        </>
                      )
                    })()}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">System Uptime</p>
                  <p className="font-semibold text-sm">
                    {typeof health?.uptime === "number" ? formatUptime(Math.floor(health.uptime)) : "Unknown"}
                  </p>
                </div>
              </div>

              {health?.components && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-sm font-medium">Components</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {Object.entries(health.components).map(([component, status]) => (
                      <div key={component} className="flex items-center justify-between p-2 bg-muted rounded">
                        <p className="text-sm capitalize">{component}</p>
                        <Badge variant={String(status).toUpperCase() === "HEALTHY" ? "default" : "secondary"}>{status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Model & System Configuration Notice */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                System Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">AI Model & Detection Settings</p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                  To modify AI model parameters (detection confidence, tracking, camera zones, or intersection configuration),
                  please contact the <span className="font-semibold">Development Team</span>.
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-3">
                  These settings require technical expertise and affect the accuracy of vehicle detection and traffic signal control.
                  Unauthorized changes may compromise system safety.
                </p>
              </div>
              <div className="rounded-lg border border-muted p-4">
                <p className="text-sm font-medium">Contact Information:</p>
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <p><span className="font-medium text-foreground">johnfrancis.vargas.13@gmail.com</span></p>
                  <p><span className="font-medium text-foreground">jonhmikaelj@gmail.com</span></p>
                  <p><span className="font-medium text-foreground">mariavirlaeliza@gmail.com</span></p>
                  <p><span className="font-medium text-foreground">piaangelamacapagal@gmail.com</span></p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  )
}
