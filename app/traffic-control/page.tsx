"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import {
  listIntersections,
  getIntersectionConfig,
  updateIntersectionConfig,
  resetIntersection,
  getIntersectionStatus,
} from "@/lib/api"
import { toast } from "sonner"
import type { IntersectionSummary, IntersectionConfig, VACStatus } from "@/lib/types"

export default function TrafficControlPage() {
  const [selectedId, setSelectedId] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [formData, setFormData] = useState<IntersectionConfig>({
    max_gap: 3.0,
    min_green: 15.0,
    max_green: 60.0,
    yellow_time: 3.0,
    all_red_time: 2.0,
  })

  const { data: intersections } = useSWR<IntersectionSummary[]>("intersections", listIntersections, {
    refreshInterval: 5000,
    taskNameActive: "Loading intersections",
    taskNameComplete: "Loaded intersections",
  })

  const { data: config } = useSWR<IntersectionConfig>(
    selectedId ? [`config`, selectedId] : null,
    selectedId ? () => getIntersectionConfig(selectedId) : null,
    { refreshInterval: 2000 }
  )

  const { data: vacStatus } = useSWR<VACStatus>(
    selectedId ? [`vac-status`, selectedId] : null,
    selectedId ? () => getIntersectionStatus(selectedId) : null,
    { refreshInterval: 500 }
  )

  useEffect(() => {
    if (intersections && intersections.length > 0 && !selectedId) {
      setSelectedId(intersections[0].id)
    }
  }, [intersections, selectedId])

  useEffect(() => {
    if (config) {
      setFormData(config)
    }
  }, [config])

  const handleUpdate = async () => {
    if (!selectedId) return

    setIsUpdating(true)
    try {
      await updateIntersectionConfig(selectedId, formData)
      toast.success("Configuration updated successfully")
    } catch (error) {
      toast.error("Failed to update configuration")
      console.error(error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleReset = async () => {
    if (!selectedId) return

    setIsUpdating(true)
    try {
      await resetIntersection(selectedId)
      toast.success("Controller reset successfully")
    } catch (error) {
      toast.error("Failed to reset controller")
      console.error(error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleInputChange = (key: keyof IntersectionConfig, value: number) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="pl-64">
        <Header
          title="Traffic Light Control"
          subtitle="Configure dynamic traffic signal parameters (VAC Algorithm)"
        />
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
                    variant={selectedId === intersection.id ? "default" : "outline"}
                    onClick={() => setSelectedId(intersection.id)}
                  >
                    {intersection.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {selectedId && vacStatus && (
            <>
              {/* Current Status Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Current VAC Status</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Phase</p>
                    <p className="text-lg font-semibold">{vacStatus.phase_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">Signal</p>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full ${
                          vacStatus.state === "GREEN"
                            ? "bg-green-500"
                            : vacStatus.state === "YELLOW"
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                      />
                      <p className="text-lg font-semibold">{vacStatus.state}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Elapsed</p>
                    <p className="text-lg font-semibold">{vacStatus.elapsed.toFixed(1)}s</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Gap</p>
                    <p className="text-lg font-semibold">{vacStatus.gap.toFixed(2)}s</p>
                  </div>
                </CardContent>
              </Card>

              {/* Configuration Card */}
              <Card>
                <CardHeader>
                  <CardTitle>VAC Algorithm Parameters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Max Gap */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium">Max Gap (seconds)</label>
                      <span className="text-sm font-semibold">{formData.max_gap.toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[formData.max_gap]}
                      onValueChange={(val) => handleInputChange("max_gap", val[0])}
                      min={1}
                      max={10}
                      step={0.1}
                      disabled={isUpdating}
                    />
                    <p className="text-xs text-muted-foreground">
                      Terminate green if no vehicle detected for this duration
                    </p>
                  </div>

                  {/* Min Green */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium">Min Green (seconds)</label>
                      <span className="text-sm font-semibold">{formData.min_green.toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[formData.min_green]}
                      onValueChange={(val) => handleInputChange("min_green", val[0])}
                      min={5}
                      max={60}
                      step={1}
                      disabled={isUpdating}
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum duration for green phase
                    </p>
                  </div>

                  {/* Max Green */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium">Max Green (seconds)</label>
                      <span className="text-sm font-semibold">{formData.max_green.toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[formData.max_green]}
                      onValueChange={(val) => handleInputChange("max_green", val[0])}
                      min={20}
                      max={120}
                      step={1}
                      disabled={isUpdating}
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum duration for green phase
                    </p>
                  </div>

                  {/* Yellow Time */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium">Yellow Time (seconds)</label>
                      <span className="text-sm font-semibold">{formData.yellow_time.toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[formData.yellow_time]}
                      onValueChange={(val) => handleInputChange("yellow_time", val[0])}
                      min={1}
                      max={5}
                      step={0.1}
                      disabled={isUpdating}
                    />
                    <p className="text-xs text-muted-foreground">
                      Duration of yellow light phase
                    </p>
                  </div>

                  {/* All Red Time */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium">All Red Time (seconds)</label>
                      <span className="text-sm font-semibold">{formData.all_red_time.toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[formData.all_red_time]}
                      onValueChange={(val) => handleInputChange("all_red_time", val[0])}
                      min={0.5}
                      max={5}
                      step={0.1}
                      disabled={isUpdating}
                    />
                    <p className="text-xs text-muted-foreground">
                      Clearance interval where all lights are red
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleUpdate} disabled={isUpdating} className="flex-1">
                      {isUpdating ? "Updating..." : "Save Changes"}
                    </Button>
                    <Button
                      onClick={handleReset}
                      disabled={isUpdating}
                      variant="destructive"
                      className="flex-1"
                    >
                      {isUpdating ? "Resetting..." : "Reset Controller"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Parameter Guidelines */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Parameter Guidelines
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Typical Traffic Settings
                    </p>
                    <ul className="text-xs text-muted-foreground mt-2 space-y-1 ml-6">
                      <li>• Max Gap: 2-4 seconds (vehicle detection timeout)</li>
                      <li>• Min Green: 10-20 seconds (pedestrian safety)</li>
                      <li>• Max Green: 45-90 seconds (prevents lane starvation)</li>
                      <li>• Yellow: 3-4 seconds (standard traffic rules)</li>
                      <li>• All Red: 1-2 seconds (safety clearance)</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
