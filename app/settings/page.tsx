"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Settings, Database, Server, Shield, Cpu } from "lucide-react"
import { getSettings, getHealth, getModelConfig, updateModelConfig } from "@/lib/api"
import { toast } from "sonner"
import type { AppSettings, HealthResponse, ModelConfig, ModelConfigUpdateRequest } from "@/lib/types"
import { useSearchParams } from "next/navigation"

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const newIntersection = (searchParams.get("new_intersection") || "").trim()
  const [apiUrl, setApiUrl] = useState(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000")
  const [isSaving, setIsSaving] = useState(false)
  const [isModelSaving, setIsModelSaving] = useState(false)
  const [modelForm, setModelForm] = useState<ModelConfigUpdateRequest>({})

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

  const { data: modelConfig, mutate: mutateModelConfig } = useSWR<ModelConfig>("model-config", getModelConfig, {
    refreshInterval: 10000,
  })

  // Sync model form when config loads
  useEffect(() => {
    if (modelConfig?.runtime_config) {
      setModelForm({
        confidence_threshold: modelConfig.runtime_config.confidence_threshold,
        iou_threshold: modelConfig.runtime_config.iou_threshold,
        detection_size: modelConfig.runtime_config.detection_size,
        max_detections: modelConfig.runtime_config.max_detections,
        tta_enabled: modelConfig.runtime_config.tta_enabled,
      })
    }
  }, [modelConfig])

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

  const handleSaveModelConfig = async (persist: boolean = false) => {
    setIsModelSaving(true)
    try {
      await updateModelConfig({ ...modelForm, persist })
      mutateModelConfig()
      toast.success(persist ? "Model config saved and persisted to disk" : "Model config updated (runtime only)")
    } catch (error: any) {
      toast.error(error?.message || "Failed to update model config")
    } finally {
      setIsModelSaving(false)
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

          {/* YOLO Model Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="w-5 h-5" />
                YOLO Model Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Runtime-tunable parameters */}
              <div className="space-y-4">
                <p className="text-sm font-medium">Runtime Parameters <Badge variant="outline" className="ml-2 text-xs">Live — no restart needed</Badge></p>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="conf-threshold">Confidence Threshold</Label>
                    <Input
                      id="conf-threshold"
                      type="number"
                      min={0.01}
                      max={0.99}
                      step={0.05}
                      value={modelForm.confidence_threshold ?? ""}
                      onChange={(e) => setModelForm((prev) => ({ ...prev, confidence_threshold: Number(e.target.value) }))}
                      disabled={isModelSaving}
                    />
                    <p className="text-xs text-muted-foreground">Min confidence to keep a detection (0.01–0.99)</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="iou-threshold">IOU Threshold</Label>
                    <Input
                      id="iou-threshold"
                      type="number"
                      min={0.1}
                      max={0.95}
                      step={0.05}
                      value={modelForm.iou_threshold ?? ""}
                      onChange={(e) => setModelForm((prev) => ({ ...prev, iou_threshold: Number(e.target.value) }))}
                      disabled={isModelSaving}
                    />
                    <p className="text-xs text-muted-foreground">Non-max suppression overlap threshold (0.1–0.95)</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="detection-size">Detection Size</Label>
                    <Input
                      id="detection-size"
                      type="number"
                      min={320}
                      max={1280}
                      step={32}
                      value={modelForm.detection_size ?? ""}
                      onChange={(e) => setModelForm((prev) => ({ ...prev, detection_size: Number(e.target.value) }))}
                      disabled={isModelSaving}
                    />
                    <p className="text-xs text-muted-foreground">Input resolution, must be multiple of 32. Higher = more accurate but slower.</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="max-detections">Max Detections</Label>
                    <Input
                      id="max-detections"
                      type="number"
                      min={1}
                      max={300}
                      step={1}
                      value={modelForm.max_detections ?? ""}
                      onChange={(e) => setModelForm((prev) => ({ ...prev, max_detections: Number(e.target.value) }))}
                      disabled={isModelSaving}
                    />
                    <p className="text-xs text-muted-foreground">Max objects per frame (1–300)</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Switch
                    id="tta-enabled"
                    checked={modelForm.tta_enabled ?? false}
                    onCheckedChange={(checked) => setModelForm((prev) => ({ ...prev, tta_enabled: checked }))}
                    disabled={isModelSaving}
                  />
                  <div>
                    <Label htmlFor="tta-enabled" className="cursor-pointer">Test-Time Augmentation (TTA)</Label>
                    <p className="text-xs text-muted-foreground">Run inference at multiple scales for better accuracy. Slower.</p>
                  </div>
                </div>
              </div>

              {/* Static parameters (read-only) */}
              {modelConfig?.static_config && (
                <div className="space-y-3 border-t pt-4">
                  <p className="text-sm font-medium">Static Parameters <Badge variant="secondary" className="ml-2 text-xs">Requires restart</Badge></p>
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Device</p>
                      <p className="font-semibold text-sm">{modelConfig.static_config.device}</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Half Precision (FP16)</p>
                      <p className="font-semibold text-sm">{modelConfig.static_config.half_precision ? "Enabled" : "Disabled"}</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Tracking</p>
                      <p className="font-semibold text-sm">{modelConfig.static_config.tracking_enabled ? modelConfig.static_config.tracker_type : "Disabled"}</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Model Path</p>
                      <p className="font-semibold text-sm break-all">{modelConfig.static_config.model_path}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Save buttons */}
              <div className="flex gap-2 pt-2">
                <Button onClick={() => handleSaveModelConfig(false)} disabled={isModelSaving} className="flex-1">
                  {isModelSaving ? "Saving..." : "Apply (Runtime Only)"}
                </Button>
                <Button onClick={() => handleSaveModelConfig(true)} disabled={isModelSaving} variant="outline" className="flex-1">
                  {isModelSaving ? "Saving..." : "Apply & Persist to Disk"}
                </Button>
              </div>
            </CardContent>
          </Card>

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
