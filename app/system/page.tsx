"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { Cpu, HardDrive, MemoryStick, Timer, CheckCircle, XCircle, Play, Square, ShieldAlert } from "lucide-react"
import { CameraSourceManager } from "@/components/dashboard/camera-source-manager"
import { IntersectionSelector } from "@/components/dashboard/intersection-selector"
import {
  listIntersections,
  getProcessingStatus,
  getCameraHealth,
  startProcessing,
  stopProcessing,
  getHealth,
  getHealthMetrics,
  getHealthComponents,
  emergencyStop,
} from "@/lib/api"
import type { IntersectionSummary, ProcessingStatus, CameraHealthResponse, HealthResponse, HealthMetricPoint, HealthComponent } from "@/lib/types"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"
import { Info } from "lucide-react"

interface SystemLog {
  id: string
  timestamp: Date
  level: "info" | "warning" | "error"
  message: string
}

export default function SystemMonitorPage() {
  const [selectedIntersectionId, setSelectedIntersectionId] = useState("")
  const [logs, setLogs] = useState<SystemLog[]>([])
  const [isProcessingUpdating, setIsProcessingUpdating] = useState(false)

  const { data: intersections } = useSWR<IntersectionSummary[]>("intersections", listIntersections, {
    refreshInterval: 5000,
  })

  const { data: health } = useSWR<HealthResponse>("health", getHealth, {
    refreshInterval: 3000,
  })

  const { data: processingStatus } = useSWR<ProcessingStatus>(
    selectedIntersectionId ? [`processing`, selectedIntersectionId] : null,
    selectedIntersectionId ? () => getProcessingStatus(selectedIntersectionId) : null,
    { refreshInterval: 2000 }
  )

  const { data: cameraHealth } = useSWR<CameraHealthResponse>(
    selectedIntersectionId ? [`cameras`, selectedIntersectionId] : null,
    selectedIntersectionId ? () => getCameraHealth(selectedIntersectionId) : null,
    { refreshInterval: 3000 }
  )

  // Historical health metrics (5 min window)
  const { data: cpuHistory } = useSWR<HealthMetricPoint[]>(
    "health-cpu-history",
    () => getHealthMetrics("cpu_percent", 300),
    { refreshInterval: 10000, fallbackData: [] }
  )
  const { data: ramHistory } = useSWR<HealthMetricPoint[]>(
    "health-ram-history",
    () => getHealthMetrics("ram_percent", 300),
    { refreshInterval: 10000, fallbackData: [] }
  )
  const { data: fpsHistory } = useSWR<HealthMetricPoint[]>(
    "health-fps-history",
    () => getHealthMetrics("fps", 300),
    { refreshInterval: 10000, fallbackData: [] }
  )

  // Detailed component health breakdown
  const { data: healthComponents } = useSWR<HealthComponent[]>(
    "health-components",
    getHealthComponents,
    { refreshInterval: 10000, fallbackData: [] }
  )

  useEffect(() => {
    if (intersections && intersections.length > 0 && !selectedIntersectionId) {
      setSelectedIntersectionId(intersections[0].id)
    }
  }, [intersections, selectedIntersectionId])

  const addLog = (level: "info" | "warning" | "error", message: string) => {
    setLogs((prev) => [
      { id: Date.now().toString(), timestamp: new Date(), level, message },
      ...prev.slice(0, 49),
    ])
  }

  const handleStartProcessing = async () => {
    if (!selectedIntersectionId) return
    setIsProcessingUpdating(true)
    try {
      await startProcessing(selectedIntersectionId)
      toast.success("Processing started")
      addLog("info", `Processing started for ${selectedIntersectionId}`)
    } catch (err) {
      toast.error("Failed to start processing")
      addLog("error", `Failed to start processing for ${selectedIntersectionId}`)
    } finally {
      setIsProcessingUpdating(false)
    }
  }

  const handleStopProcessing = async () => {
    if (!selectedIntersectionId) return
    setIsProcessingUpdating(true)
    try {
      await stopProcessing(selectedIntersectionId)
      toast.success("Processing stopped")
      addLog("info", `Processing stopped for ${selectedIntersectionId}`)
    } catch (err) {
      toast.error("Failed to stop processing")
      addLog("error", `Failed to stop processing for ${selectedIntersectionId}`)
    } finally {
      setIsProcessingUpdating(false)
    }
  }

  const handleEmergencyStop = async () => {
    if (!selectedIntersectionId) return
    setIsProcessingUpdating(true)
    try {
      await emergencyStop(selectedIntersectionId)
      toast.success("EMERGENCY STOP — All lanes forced RED")
      addLog("warning", `Emergency stop executed for ${selectedIntersectionId}`)
    } catch (err) {
      toast.error("Failed to execute emergency stop")
      addLog("error", `Emergency stop failed for ${selectedIntersectionId}`)
    } finally {
      setIsProcessingUpdating(false)
    }
  }

  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const formatChartTime = (ts: number) => {
    return new Date(ts * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  }

  const cpu = health?.metrics?.cpu_percent
  const ram = health?.metrics?.ram_percent
  const disk = health?.metrics?.disk_percent
  const serverUptime = health?.uptime

  const resourceCards = [
    {
      name: "CPU Usage",
      icon: Cpu,
      value: typeof cpu === "number" ? cpu : null,
      unit: "%",
    },
    {
      name: "RAM Usage",
      icon: MemoryStick,
      value: typeof ram === "number" ? ram : null,
      unit: "%",
    },
    {
      name: "Disk Usage",
      icon: HardDrive,
      value: typeof disk === "number" ? disk : null,
      unit: "%",
    },
    {
      name: "System Uptime",
      icon: Timer,
      value: typeof serverUptime === "number" ? serverUptime : null,
      unit: "time",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="min-w-0 md:pl-72">
        <Header title="System Monitor" subtitle="System health and configuration" />
        <div className="space-y-6 p-6">
          {/* Intersection Selector */}
          <IntersectionSelector
            intersections={intersections || []}
            selectedId={selectedIntersectionId}
            onSelect={setSelectedIntersectionId}
          />

          {/* System Health Overview */}
          <div className="grid gap-4 md:grid-cols-4">
            {resourceCards.map((item) => (
              <Card key={item.name}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-muted p-2">
                        <item.icon className="h-5 w-5 text-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        {item.unit === "time" ? (
                          <p className="text-xs text-muted-foreground">
                            {item.value == null ? "N/A" : formatUptime(Math.floor(item.value))}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            {item.value == null ? "N/A" : `${item.value.toFixed(1)}${item.unit}`}
                          </p>
                        )}
                      </div>
                    </div>
                    {health?.status ? (
                      <Badge variant="outline">{String(health.status)}</Badge>
                    ) : null}
                  </div>

                  {item.unit !== "time" && item.value != null ? (
                    <div className="mt-4">
                      <Progress value={Math.max(0, Math.min(100, item.value))} />
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Historical Health Metrics Charts */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* CPU History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">CPU Usage (5 min)</CardTitle>
              </CardHeader>
              <CardContent className="h-[180px]">
                {cpuHistory && cpuHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={cpuHistory} margin={{ left: 0, right: 8, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" tickFormatter={formatChartTime} tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Tooltip labelFormatter={(v) => formatChartTime(Number(v))} formatter={(v: any) => [`${Number(v).toFixed(1)}%`, "CPU"]} />
                      <Line type="monotone" dataKey="value" stroke="var(--chart-1)" dot={false} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-muted-foreground flex items-center justify-center h-full">No CPU data yet</p>
                )}
              </CardContent>
            </Card>

            {/* RAM History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">RAM Usage (5 min)</CardTitle>
              </CardHeader>
              <CardContent className="h-[180px]">
                {ramHistory && ramHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ramHistory} margin={{ left: 0, right: 8, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" tickFormatter={formatChartTime} tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Tooltip labelFormatter={(v) => formatChartTime(Number(v))} formatter={(v: any) => [`${Number(v).toFixed(1)}%`, "RAM"]} />
                      <Line type="monotone" dataKey="value" stroke="var(--chart-2)" dot={false} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-muted-foreground flex items-center justify-center h-full">No RAM data yet</p>
                )}
              </CardContent>
            </Card>

            {/* FPS History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">FPS (5 min)</CardTitle>
              </CardHeader>
              <CardContent className="h-[180px]">
                {fpsHistory && fpsHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={fpsHistory} margin={{ left: 0, right: 8, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" tickFormatter={formatChartTime} tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip labelFormatter={(v) => formatChartTime(Number(v))} formatter={(v: any) => [`${Number(v).toFixed(1)}`, "FPS"]} />
                      <Line type="monotone" dataKey="value" stroke="var(--chart-3)" dot={false} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-muted-foreground flex items-center justify-center h-full">No FPS data yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Component Health Breakdown */}
          {healthComponents && healthComponents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Component Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {healthComponents.map((comp) => {
                    const statusStr = String(comp.status).toUpperCase()
                    const isHealthy = statusStr === "HEALTHY"
                    const isDegraded = statusStr === "DEGRADED"
                    return (
                      <div key={comp.component} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                        <div className={`mt-0.5 w-2.5 h-2.5 rounded-full shrink-0 ${isHealthy ? "bg-green-500" : isDegraded ? "bg-amber-500" : "bg-red-500"}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{comp.component}</p>
                          <p className="text-xs text-muted-foreground truncate">{comp.message}</p>
                          {comp.alert_count > 0 && (
                            <Badge variant="destructive" className="mt-1 text-xs">{comp.alert_count} alert{comp.alert_count > 1 ? "s" : ""}</Badge>
                          )}
                        </div>
                        <Badge variant={isHealthy ? "default" : isDegraded ? "secondary" : "destructive"} className="text-xs shrink-0">{comp.status}</Badge>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Camera Health */}
          <div className="grid gap-6 items-start">

            <Card className="h-full">
              <CardHeader>
                <CardTitle>Camera Health</CardTitle>
                <CardDescription>Connected cameras status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedIntersectionId && cameraHealth && Object.entries(cameraHealth).length > 0 ? (
                  Object.entries(cameraHealth).map(([cameraId, cam]) => {
                    const camSt = String(cam.status ?? "").toLowerCase()
                    const isCamErr = camSt === "error" || camSt === "failed"
                    return (
                    <div key={cameraId} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        {cam.alive ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className={`w-4 h-4 ${isCamErr ? "text-red-600" : "text-muted-foreground"}`} />
                        )}
                        <div>
                          <p className="text-sm font-medium">{cameraId}</p>
                          <p className="text-xs text-muted-foreground">
                            {cam.fps_actual?.toFixed(1) ?? "0"} / {cam.fps_expected} FPS
                            {cam.approach && ` • ${cam.approach}`}
                          </p>
                        </div>
                      </div>
                      <Badge variant={cam.alive ? "default" : isCamErr ? "destructive" : "secondary"}>{cam.status}</Badge>
                    </div>
                  )})
                ) : selectedIntersectionId ? (
                  <p className="text-sm text-muted-foreground">No cameras connected</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Select an intersection to view camera health</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Processing Control + Emergency + System Logs */}
          <div className="grid gap-6 lg:grid-cols-2 items-start">
            {/* Processing Control */}
            {selectedIntersectionId ? (
              <Card>
                <CardHeader>
                  <CardTitle>Processing Control</CardTitle>
                  <CardDescription>Start/stop video processing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-sm text-muted-foreground mb-2">Status</p>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          String(processingStatus?.state || "").toUpperCase() === "RUNNING" ? "bg-green-500" : "bg-gray-500"
                        }`}
                      />
                      <p className="font-semibold">{processingStatus?.state || "UNKNOWN"}</p>
                    </div>
                  </div>

                  {processingStatus?.uptime_seconds != null ? (
                    <div className="rounded-lg bg-muted p-4">
                      <p className="text-sm text-muted-foreground mb-2">Uptime</p>
                      <p className="font-semibold">{formatUptime(Math.floor(processingStatus.uptime_seconds))}</p>
                    </div>
                  ) : null}

                  <div className="space-y-2 pt-4">
                    <Button
                      onClick={handleStartProcessing}
                      disabled={isProcessingUpdating || String(processingStatus?.state || "").toUpperCase() === "RUNNING"}
                      className="w-full"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Start Processing
                    </Button>
                    <Button
                      onClick={handleStopProcessing}
                      disabled={isProcessingUpdating || String(processingStatus?.state || "").toUpperCase() !== "RUNNING"}
                      variant="destructive"
                      className="w-full"
                    >
                      <Square className="mr-2 h-4 w-4" />
                      Stop Processing
                    </Button>
                  </div>

                  {/* Emergency Stop */}
                  <div className="border-t border-border pt-4">
                    <Button
                      variant="destructive"
                      className="w-full font-bold"
                      onClick={handleEmergencyStop}
                      disabled={isProcessingUpdating}
                    >
                      <ShieldAlert className="mr-2 h-4 w-4" />
                      EMERGENCY STOP — ALL RED
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Forces all lanes to RED immediately.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Processing Control</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Select an intersection to control processing.</p>
                </CardContent>
              </Card>
            )}

            {/* Camera Source Manager Notice */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                Camera Source Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Camera Source Settings</p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                  To assign sources to camera,
                  please contact the <span className="font-semibold">Development Team</span>.
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-3">
                  These settings require technical expertise.
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

          {/* System Logs */}
            <Card>
              <CardHeader>
                <CardTitle>System Logs</CardTitle>
                <CardDescription>Recent system events and notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {logs.length > 0 ? (
                    logs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 rounded-lg border border-border bg-secondary/30 p-3"
                      >
                        <Badge
                          variant="outline"
                          className={`mt-0.5 ${
                            log.level === "error"
                              ? "border-status-error text-status-error"
                              : log.level === "warning"
                                ? "border-status-warning text-status-warning"
                                : "border-status-active text-status-active"
                          }`}
                        >
                          {log.level.toUpperCase()}
                        </Badge>
                        <div className="flex-1">
                          <p className="text-sm">{log.message}</p>
                          <p className="text-xs text-muted-foreground">{log.timestamp.toLocaleTimeString()}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No logs yet. System events will appear here.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
        </div>
      </main>
    </div>
  )
}
