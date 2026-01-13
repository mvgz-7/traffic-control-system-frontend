"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Cpu, Camera, RefreshCw, CheckCircle, XCircle, Wifi, Database, Clock } from "lucide-react"
import { fetchLiveStats, fetchDevices, changeSource, type TrafficStats, type Device } from "@/lib/api"
import { toast } from "sonner"

interface SystemLog {
  id: string
  timestamp: Date
  level: "info" | "warning" | "error"
  message: string
}

export default function SystemMonitorPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [selectedDevice, setSelectedDevice] = useState<string>("")
  const [customSource, setCustomSource] = useState("")
  const [logs, setLogs] = useState<SystemLog[]>([])
  const [startTime] = useState(new Date())

  const { data: stats, error: statsError } = useSWR<TrafficStats>("live-stats", fetchLiveStats, {
    refreshInterval: 1000,
  })

  // Fetch available devices
  useEffect(() => {
    const loadDevices = async () => {
      try {
        const result = await fetchDevices()
        setDevices(result.devices)
        addLog("info", "Device list loaded successfully")
      } catch (err) {
        addLog("error", "Failed to load device list")
      }
    }
    loadDevices()
  }, [])

  const addLog = (level: "info" | "warning" | "error", message: string) => {
    setLogs((prev) => [
      { id: Date.now().toString(), timestamp: new Date(), level, message },
      ...prev.slice(0, 49), 
    ])
  }

  const handleSourceChange = async () => {
    const source = selectedDevice || customSource
    if (!source) {
      toast.error("Please select a device or enter a source path")
      return
    }

    try {
      await changeSource(source)
      toast.success(`Source changed to: ${source}`)
      addLog("info", `Video source changed to: ${source}`)
    } catch (err) {
      toast.error("Failed to change source")
      addLog("error", `Failed to change source to: ${source}`)
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
      name: "Camera Feed",
      status: stats?.status === "Active" ? "online" : "offline",
      icon: Camera,
      detail: stats?.status || "Unknown",
    },
    {
      name: "API Server",
      status: !statsError ? "online" : "offline",
      icon: Wifi,
      detail: !statsError ? "Connected" : "Disconnected",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="pl-64 min-h-screen">
        <Header title="System Monitor" subtitle="System health and configuration" />
        <div className="space-y-6 p-6 max-w-7xl mx-auto min-h-[calc(100vh-4rem)] flex flex-col">
          {/* System Health Overview */}
          <div className="grid gap-4 sm:grid-cols-2">
            {systemHealth.map((item) => (
              <Card key={item.name}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`rounded-lg p-2 ${
                          item.status === "online"
                            ? "bg-status-active/10"
                            : item.status === "warning"
                              ? "bg-status-warning/10"
                              : "bg-status-error/10"
                        }`}
                      >
                        <item.icon
                          className={`h-5 w-5 ${
                            item.status === "online"
                              ? "text-status-active"
                              : item.status === "warning"
                                ? "text-status-warning"
                                : "text-status-error"
                          }`}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.detail}</p>
                      </div>
                    </div>
                    {item.status === "online" ? (
                      <CheckCircle className="h-5 w-5 text-status-active" />
                    ) : item.status === "warning" ? (
                      <Clock className="h-5 w-5 text-status-warning" />
                    ) : (
                      <XCircle className="h-5 w-5 text-status-error" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="gap-6">
            {/* Video Source Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Video Source</CardTitle>
                <CardDescription>Configure camera or video file input</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Available Cameras</Label>
                  <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a camera device" />
                    </SelectTrigger>
                    <SelectContent>
                      {devices.map((device) => (
                        <SelectItem key={device.index} value={device.index.toString()}>
                          {device.name} ({device.path})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Custom Source Path</Label>
                  <Input
                    placeholder="e.g., /path/to/video.mp4 or rtsp://..."
                    value={customSource}
                    onChange={(e) => setCustomSource(e.target.value)}
                  />
                </div>

                <Button onClick={handleSourceChange} className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Apply Source
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* System Logs */}
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>System Logs</CardTitle>
              <CardDescription>Recent system events and notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-full space-y-2 overflow-y-auto">
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
