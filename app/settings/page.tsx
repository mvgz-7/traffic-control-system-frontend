"use client"

import { useState } from "react"
import useSWR from "swr"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Settings, Database, Server, Shield } from "lucide-react"
import { getSettings, getHealth } from "@/lib/api"
import { toast } from "sonner"
import type { AppSettings, HealthResponse } from "@/lib/types"
import { useSearchParams } from "next/navigation"

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const newIntersection = (searchParams.get("new_intersection") || "").trim()
  const [apiUrl, setApiUrl] = useState(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000")
  const [isSaving, setIsSaving] = useState(false)

  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const { data: settings } = useSWR<AppSettings>("settings", getSettings, {
    refreshInterval: 10000,
  })

  const { data: health } = useSWR<HealthResponse>("health", getHealth, {
    refreshInterval: 5000,
  })

  const handleSaveApiUrl = async () => {
    setIsSaving(true)
    try {
      localStorage.setItem("NEXT_PUBLIC_API_URL", apiUrl)
      toast.success("API URL saved successfully")
    } catch (error) {
      toast.error("Failed to save API URL")
    } finally {
      setIsSaving(false)
    }
  }

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

          {/* API Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                API Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-url">API Base URL</Label>
                <Input
                  id="api-url"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="http://localhost:8000"
                />
                <p className="text-xs text-muted-foreground">
                  The backend API server URL. Make sure it's reachable from your browser.
                </p>
              </div>
              <Button onClick={handleSaveApiUrl} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save API URL"}
              </Button>
            </CardContent>
          </Card>

          {/* Backend Settings */}
          {settings && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Backend Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Debug Mode</p>
                    <p className="font-semibold">{settings.debug ? "Enabled" : "Disabled"}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Log Level</p>
                    <p className="font-semibold">{settings.log_level}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Model Path</p>
                    <p className="font-semibold text-sm break-all">{settings.model_path}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Confidence Threshold</p>
                    <p className="font-semibold">{(settings.confidence_threshold * 100).toFixed(0)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Database Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Database Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="font-semibold">SQLite</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="font-semibold text-sm">./data/traffic.db</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Tables</p>
                  <p className="font-semibold text-sm">vehicle_detections, lane_signal_changes, safety_violations, line_crossing_events, health_metrics, system_status</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Documentation */}
          <Card>
            <CardHeader>
              <CardTitle>API Documentation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Access the interactive API documentation and test endpoints.
              </p>
              <Button asChild className="w-full">
                <a href={`${apiUrl}/docs`} target="_blank" rel="noopener noreferrer">
                  Open Swagger UI
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
