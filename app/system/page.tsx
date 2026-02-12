"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Cpu, Camera, CheckCircle, XCircle, Wifi, Database, Clock, Play, Square } from "lucide-react"
import { CameraSourceManager } from "@/components/dashboard/camera-source-manager"
import {
  listIntersections,
  getProcessingStatus,
  getCameraHealth,
  startProcessing,
  stopProcessing,
  getHealth,
} from "@/lib/api"
import { toast } from "sonner"
import type { IntersectionSummary, ProcessingStatus, CameraHealthResponse, HealthResponse } from "@/lib/types"

interface SystemLog {
  id: string
  timestamp: Date
  level: "info" | "warning" | "error"
  message: string
}

export default function SystemMonitorPage() {
  const [selectedIntersectionId, setSelectedIntersectionId] = useState("")
  const [logs, setLogs] = useState<SystemLog[]>([])
  const [startTime] = useState(new Date())
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

  // Calculate uptime
  const uptime = Math.floor((Date.now() - startTime.getTime()) / 1000)
  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // System health status
  const systemHealth = [
    {
      name: "API Server",
      status: health?.status === "healthy" ? "online" : "offline",
      icon: Wifi,
      detail: health?.version || "Unknown",
    },
    {
      name: "Detector",
      status: health?.components?.detector === "ready" ? "online" : "offline",
      icon: Cpu,
      detail: health?.components?.detector || "Unknown",
    },
    {
      name: "VAC Controller",
      status: health?.components?.vac === "ready" ? "online" : "offline",
      icon: Database,
      detail: health?.components?.vac || "Unknown",
    },
    {
      name: "Camera System",
      status: processingStatus?.state === "RUNNING" ? "online" : "offline",
      icon: Camera,
      detail: processingStatus?.state || "Unknown",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="pl-64">
        <Header title="System Monitor" subtitle="System health and configuration" />
        <div className="space-y-6 p-6">
          {/* Intersection Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Select Intersection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {intersections?.map((intersection) => (
                  <Button
                    key={intersection.id}
                    variant={selectedIntersectionId === intersection.id ? "default" : "outline"}
                    onClick={() => setSelectedIntersectionId(intersection.id)}
                  >
                    {intersection.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* System Health Overview */}
          <div className="grid gap-4 md:grid-cols-4">
            {systemHealth.map((item) => (
              <Card key={item.name}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`rounded-lg p-2 ${
                          item.status === "online"
                            ? "bg-green-500/10"
                            : item.status === "warning"
                              ? "bg-yellow-500/10"
                              : "bg-red-500/10"
                        }`}
                      >
                        <item.icon
                          className={`h-5 w-5 ${
                            item.status === "online"
                              ? "text-green-600"
                              : item.status === "warning"
                                ? "text-yellow-600"
                                : "text-red-600"
                          }`}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.detail}</p>
                      </div>
                    </div>
                    {item.status === "online" ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : item.status === "warning" ? (
                      <Clock className="h-5 w-5 text-yellow-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Camera Source Management */}
          {selectedIntersectionId && <CameraSourceManager intersectionId={selectedIntersectionId} />}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Processing Control */}
            {selectedIntersectionId && (
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
                          processingStatus?.state === "RUNNING" ? "bg-green-500" : "bg-gray-500"
                        }`}
                      />
                      <p className="font-semibold">{processingStatus?.state || "UNKNOWN"}</p>
                    </div>
                  </div>

                  {processingStatus?.uptime_seconds && (
                    <div className="rounded-lg bg-muted p-4">
                      <p className="text-sm text-muted-foreground mb-2">Uptime</p>
                      <p className="font-semibold">{formatUptime(Math.floor(processingStatus.uptime_seconds))}</p>
                    </div>
                  )}

                  <div className="space-y-2 pt-4">
                    <Button
                      onClick={handleStartProcessing}
                      disabled={isProcessingUpdating || processingStatus?.state === "RUNNING"}
                      className="w-full"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Start Processing
                    </Button>
                    <Button
                      onClick={handleStopProcessing}
                      disabled={isProcessingUpdating || processingStatus?.state !== "RUNNING"}
                      variant="destructive"
                      className="w-full"
                    >
                      <Square className="mr-2 h-4 w-4" />
                      Stop Processing
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Camera Health */}
            {selectedIntersectionId && (
              <Card>
                <CardHeader>
                  <CardTitle>Camera Health</CardTitle>
                  <CardDescription>Connected cameras status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {cameraHealth && Object.entries(cameraHealth).length > 0 ? (
                    Object.entries(cameraHealth).map(([cameraId, health]) => (
                      <div key={cameraId} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                          {health.status === "healthy" ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{cameraId}</p>
                            <p className="text-xs text-muted-foreground">
                              {health.fps?.toFixed(1) || "N/A"} FPS
                              {health.resolution && ` • ${health.resolution[0]}x${health.resolution[1]}`}
                            </p>
                          </div>
                        </div>
                        <Badge variant={health.status === "healthy" ? "default" : "destructive"}>
                          {health.status}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No cameras connected</p>
                  )}
                </CardContent>
              </Card>
            )}
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
                  <p className="text-center text-muted-foreground py-8">No logs yet. System events will appear here.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
