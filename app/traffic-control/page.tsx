"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  const [controlMode, setControlMode] = useState<"vac" | "fixed">("vac")
  const [formData, setFormData] = useState<IntersectionConfig>({
    max_gap: 3.0,
    min_green: 15.0,
    max_green: 60.0,
    yellow_time: 3.0,
    all_red_time: 2.0,
  })

  const { data: intersections } = useSWR<IntersectionSummary[]>("intersections", listIntersections, {
    refreshInterval: 5000,
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

  const updateDisabled = isUpdating || controlMode === "fixed"

  const NumberField = ({
    label,
    value,
    min,
    max,
    step,
    hint,
    field,
  }: {
    label: string
    value: number
    min: number
    max: number
    step: number
    hint: string
    field: keyof IntersectionConfig
  }) => {
    return (
      <div className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <label className="text-sm font-medium sm:w-56">{label}</label>
          <div className="w-32">
            <Input
              type="number"
              inputMode="decimal"
              value={Number.isFinite(value) ? value : 0}
              onChange={(e) => {
                const n = Number(e.target.value)
                if (!Number.isFinite(n)) return
                handleInputChange(field, n)
              }}
              min={min}
              max={max}
              step={step}
              disabled={updateDisabled}
              className="h-9 [appearance:auto] [&::-webkit-outer-spin-button]:opacity-100 [&::-webkit-inner-spin-button]:opacity-100"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="pl-72">
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
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground mb-3">Intersection</p>
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
                </div>

                <div className="border-t pt-6 md:border-t-0 md:border-l md:pt-0 md:pl-6">
                  <p className="text-sm text-muted-foreground mb-3">Select Algorithm</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setControlMode("vac")}
                      className={
                        controlMode === "vac"
                          ? "border-green-600 bg-green-600 text-white hover:bg-green-600/90 hover:text-white"
                          : "border-green-600 text-green-700 hover:bg-green-50"
                      }
                    >
                      VAC Algorithm
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setControlMode("fixed")}
                      className={
                        controlMode === "fixed"
                          ? "border-red-600 bg-red-600 text-white hover:bg-red-600/90 hover:text-white"
                          : "border-red-600 text-red-700 hover:bg-red-50"
                      }
                    >
                      Go back to Fixed Timing
                    </Button>
                  </div>
                </div>
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
                    <p className="text-lg font-semibold">
                      {controlMode === "fixed" ? "Fixed Timing" : vacStatus.phase_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">Signal</p>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full ${
                          controlMode === "fixed"
                            ? "bg-slate-400"
                            : vacStatus.state === "GREEN"
                              ? "bg-green-500"
                              : vacStatus.state === "YELLOW"
                                ? "bg-yellow-500"
                                : "bg-red-500"
                        }`}
                      />
                      <p className="text-lg font-semibold">
                        {controlMode === "fixed" ? "FIXED" : vacStatus.state}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Elapsed</p>
                    <p className="text-lg font-semibold">
                      {controlMode === "fixed" ? "—" : `${vacStatus.elapsed.toFixed(1)}s`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Gap</p>
                    <p className="text-lg font-semibold">
                      {controlMode === "fixed" ? "—" : `${vacStatus.gap.toFixed(2)}s`}
                    </p>
                  </div>
                </CardContent>
                <div className="px-6 pb-6">
                  <Badge variant={controlMode === "vac" ? "default" : "secondary"}>
                    {controlMode === "vac" ? "VAC Algorithm" : "Fixed Timing"}
                  </Badge>
                </div>
              </Card>

              {controlMode === "vac" ? (
                <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
                  {/* Parameters */}
                  <Card className="w-full">
                    <CardHeader>
                      <CardTitle>VAC Algorithm Parameters</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <NumberField
                        label="Max Gap (seconds)"
                        value={formData.max_gap}
                        min={1}
                        max={10}
                        step={0.1}
                        field="max_gap"
                        hint="Terminate green if no vehicle detected for this duration"
                      />

                      <NumberField
                        label="Min Green (seconds)"
                        value={formData.min_green}
                        min={5}
                        max={60}
                        step={1}
                        field="min_green"
                        hint="Minimum duration for green phase"
                      />

                      <NumberField
                        label="Max Green (seconds)"
                        value={formData.max_green}
                        min={20}
                        max={120}
                        step={1}
                        field="max_green"
                        hint="Maximum duration for green phase (prevents lane starvation)"
                      />

                      <NumberField
                        label="Yellow Time (seconds)"
                        value={formData.yellow_time}
                        min={1}
                        max={5}
                        step={0.1}
                        field="yellow_time"
                        hint="Duration of yellow light phase"
                      />

                      <NumberField
                        label="All Red Time (seconds)"
                        value={formData.all_red_time}
                        min={0.5}
                        max={5}
                        step={0.1}
                        field="all_red_time"
                        hint="Clearance interval where all lights are red"
                      />

                      <div className="flex gap-2 pt-2">
                        <Button onClick={handleUpdate} disabled={updateDisabled} className="flex-1">
                          {isUpdating ? "Updating..." : "Save Changes"}
                        </Button>
                        <Button
                          onClick={handleReset}
                          disabled={updateDisabled}
                          variant="destructive"
                          className="flex-1"
                        >
                          {isUpdating ? "Resetting..." : "Reset Controller"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Guidelines */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Guidelines
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
                </div>
              ) : (
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>VAC Algorithm Parameters</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Fixed Timing mode selected. VAC parameters are unavailable.
                      </p>
                      <div className="grid gap-3 md:grid-cols-2">
                        <Input disabled value={`Max Gap: ${formData.max_gap}`} />
                        <Input disabled value={`Min Green: ${formData.min_green}`} />
                        <Input disabled value={`Max Green: ${formData.max_green}`} />
                        <Input disabled value={`Yellow: ${formData.yellow_time}`} />
                        <Input disabled value={`All Red: ${formData.all_red_time}`} />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button disabled className="flex-1">
                          Save Changes
                        </Button>
                        <Button disabled variant="destructive" className="flex-1">
                          Reset Controller
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Guidelines</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        In Fixed Timing mode, signals follow a pre-defined schedule and do not adapt to live vehicle gaps.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
