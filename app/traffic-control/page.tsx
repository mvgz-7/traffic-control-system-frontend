"use client"

import { useState, useEffect, useCallback } from "react"
import useSWR from "swr"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, BookOpen, CheckCircle2, ShieldAlert, Timer, Zap } from "lucide-react"
import { toast } from "sonner"
import {
  listIntersections,
  getLaneConfig,
  updateLaneConfig,
  resetIntersection,
  getIntersectionStatus,
  emergencyStop,
  forceGreen,
} from "@/lib/api"
import type { IntersectionSummary, IntersectionStatus, LaneConfig, LaneConfigUpdate } from "@/lib/types"
import { VideoFeedWebSocket } from "@/components/dashboard/video-feed"
import { VehicleSummary } from "@/components/dashboard/vehicle-summary"
import { IntersectionSelector } from "@/components/dashboard/intersection-selector"

function NumberField({
  label,
  value,
  min,
  max,
  step,
  field,
  disabled,
  onChange,
}: {
  label: string
  value: number | undefined
  min: number
  max: number
  step: number
  field: string
  disabled?: boolean
  onChange: (field: string, value: number) => void
}) {
  const [localValue, setLocalValue] = useState(() =>
    Number.isFinite(value) ? String(value) : ""
  )

  // Sync from parent when value changes externally (e.g. lane switch)
  useEffect(() => {
    setLocalValue(Number.isFinite(value) ? String(value) : "")
  }, [value])

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <Input
        type="number"
        inputMode="decimal"
        value={localValue}
        onChange={(e) => {
          const raw = e.target.value
          setLocalValue(raw)
          const n = Number(raw)
          if (raw !== "" && Number.isFinite(n)) {
            onChange(field, n)
          }
        }}
        onBlur={() => {
          // On blur, restore a valid number if the field is empty
          if (localValue === "" || !Number.isFinite(Number(localValue))) {
            const fallback = Number.isFinite(value) ? String(value) : String(min)
            setLocalValue(fallback)
            onChange(field, Number(fallback))
          }
        }}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="h-9 w-full bg-background border-border [appearance:auto] [&::-webkit-outer-spin-button]:opacity-100 [&::-webkit-inner-spin-button]:opacity-100"
      />
    </div>
  )
}

export default function TrafficControlPage() {
  const [selectedId, setSelectedId] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [selectedLane, setSelectedLane] = useState("")
  const [formData, setFormData] = useState<LaneConfigUpdate>({
    max_gap: 3.0,
    min_green: 15.0,
    max_green: 60.0,
    yellow_time: 3.0,
    all_red_time: 2.0,
  })

  const { data: intersections } = useSWR<IntersectionSummary[]>("intersections", listIntersections, {
    refreshInterval: 5000,
  })

  const { data: status } = useSWR<IntersectionStatus>(
    selectedId ? [`vac-status`, selectedId] : null,
    selectedId ? () => getIntersectionStatus(selectedId) : null,
    { refreshInterval: 500 }
  )

  // Fetch per-lane config when a lane is selected
  const { data: laneConfig, mutate: mutateLaneConfig } = useSWR<LaneConfig>(
    selectedId && selectedLane ? [`lane-config`, selectedId, selectedLane] : null,
    selectedId && selectedLane ? () => getLaneConfig(selectedId, selectedLane) : null,
    { refreshInterval: 5000 }
  )

  const [liveFrame, setLiveFrame] = useState<any | null>(null)

  const laneIds = status ? Object.keys(status.lanes) : []

  useEffect(() => {
    if (intersections && intersections.length > 0 && !selectedId) {
      setSelectedId(intersections[0].id)
    }
  }, [intersections, selectedId])

  // Auto-select first lane when intersection changes
  useEffect(() => {
    if (laneIds.length > 0 && (!selectedLane || !laneIds.includes(selectedLane))) {
      setSelectedLane(laneIds[0])
    }
  }, [laneIds.join(","), selectedLane])

  // Sync form data when lane config loads
  useEffect(() => {
    if (laneConfig) {
      setFormData({
        max_gap: laneConfig.max_gap,
        min_green: laneConfig.min_green,
        max_green: laneConfig.max_green,
        yellow_time: laneConfig.yellow_time,
        all_red_time: laneConfig.all_red_time,
      })
    }
  }, [laneConfig])

  const handleUpdate = async () => {
    if (!selectedId || !selectedLane) return
    setIsUpdating(true)
    try {
      await updateLaneConfig(selectedId, selectedLane, formData)
      mutateLaneConfig()
      toast.success(`Configuration updated for ${selectedLane}`)
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

  const handleEmergencyStop = async () => {
    if (!selectedId) return
    setIsUpdating(true)
    try {
      await emergencyStop(selectedId)
      toast.success("EMERGENCY STOP — All lanes forced RED")
    } catch (error) {
      toast.error("Failed to execute emergency stop")
      console.error(error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleForceGreen = async (laneId: string) => {
    if (!selectedId) return
    setIsUpdating(true)
    try {
      await forceGreen(selectedId, laneId)
      toast.success(`Forced GREEN on ${laneId}`)
    } catch (error) {
      toast.error(`Failed to force green on ${laneId}`)
      console.error(error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleFixedTiming = async () => {
    if (!selectedId || laneIds.length === 0) return
    setIsUpdating(true)
    try {
      await Promise.all(
        laneIds.map((laneId) =>
          updateLaneConfig(selectedId, laneId, { max_gap: 999 })
        )
      )
      mutateLaneConfig()
      toast.success("Fixed timing enabled — all lanes set to max_gap=999")
    } catch (error) {
      toast.error("Failed to enable fixed timing")
      console.error(error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleInputChange = (key: string, value: number) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="min-w-0 md:pl-72">
        <Header
          title="Traffic Light Control"
          subtitle="Configure dynamic traffic signal parameters (VAC Algorithm)"
        />
        <div className="space-y-6 p-6">
          {/* Intersection Selector */}
          <IntersectionSelector
            intersections={intersections || []}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />

          {selectedId && status && (
            <>
              {/* Emergency Controls (left) + Current Lane Status (right) */}
              <div className="grid gap-6 lg:grid-cols-2 items-stretch">
                {/* Emergency Controls */}
                <Card className="border-destructive/50">
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-destructive">
                      <ShieldAlert className="w-5 h-5" />
                      Emergency Controls
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      variant="destructive"
                      className="w-full text-lg py-6 font-bold"
                      onClick={handleEmergencyStop}
                      disabled={isUpdating || !selectedId}
                    >
                      <ShieldAlert className="w-5 h-5 mr-2" />
                      EMERGENCY STOP — ALL RED
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Forces all lanes to RED immediately. Use in case of emergency or system malfunction.
                    </p>

                    {/* Force Green per-lane */}
                    {laneIds.length > 0 && (
                      <div className="border-t border-border pt-4">
                        <p className="text-sm font-medium mb-3 flex items-center gap-2">
                          <Zap className="w-4 h-4 text-green-500" />
                          Force Green (Manual Override)
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {laneIds.map((laneId) => (
                            <Button
                              key={laneId}
                              size="sm"
                              variant="outline"
                              className="border-green-500 text-green-600 hover:bg-green-500/10"
                              onClick={() => handleForceGreen(laneId)}
                              disabled={isUpdating}
                            >
                              Force {laneId} GREEN
                            </Button>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Manually override a specific lane to GREEN. Other conflicting lanes will be held RED.
                        </p>
                      </div>
                    )}

                    {/* Fixed Timing */}
                    <div className="border-t border-border pt-4">
                      <p className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Timer className="w-4 h-4 text-amber-500" />
                        Fixed Timing Mode
                      </p>
                      <Button
                        variant="outline"
                        className="w-full border-amber-500 text-amber-600 hover:bg-amber-500/10"
                        onClick={handleFixedTiming}
                        disabled={isUpdating || !selectedId}
                      >
                        <Timer className="w-4 h-4 mr-2" />
                        Enable Fixed Timing (All Lanes)
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        Sets max_gap=999 on all lanes. Each lane will always run to its max green duration.
                      </p>
                    </div>
                  </CardContent>
                </Card>

              {/* Lane Configuration */}
                <Card>
                  <CardHeader>
                    <CardTitle>Lane Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Lane tab selector */}
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Select lane to configure</p>
                      <div className="flex gap-2">
                        {laneIds.map((laneId) => (
                          <Button
                            key={laneId}
                            size="sm"
                            variant={selectedLane === laneId ? "default" : "outline"}
                            onClick={() => setSelectedLane(laneId)}
                            className="px-3"
                          >
                            {laneId}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {selectedLane && (
                      <>
                        <div className="border-t pt-4">
                          <p className="text-sm font-medium mb-1">Editing: <span className="text-primary">{selectedLane}</span></p>
                          {laneConfig && (
                            <p className="text-xs text-muted-foreground">Traffic light: {laneConfig.traffic_light_id}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <NumberField
                            label="Max Gap (seconds)"
                            value={formData.max_gap}
                            min={1}
                            max={999}
                            step={0.1}
                            field="max_gap"
                            disabled={isUpdating}
                            onChange={handleInputChange}
                          />

                          <NumberField
                            label="Min Green (seconds)"
                            value={formData.min_green}
                            min={5}
                            max={60}
                            step={1}
                            field="min_green"
                            disabled={isUpdating}
                            onChange={handleInputChange}
                          />

                          <NumberField
                            label="Max Green (seconds)"
                            value={formData.max_green}
                            min={20}
                            max={120}
                            step={1}
                            field="max_green"
                            disabled={isUpdating}
                            onChange={handleInputChange}
                          />

                          <NumberField
                            label="Yellow Time (seconds)"
                            value={formData.yellow_time}
                            min={1}
                            max={5}
                            step={0.1}
                            field="yellow_time"
                            disabled={isUpdating}
                            onChange={handleInputChange}
                          />

                          <NumberField
                            label="All Red Time (seconds)"
                            value={formData.all_red_time}
                            min={0.5}
                            max={5}
                            step={0.1}
                            field="all_red_time"
                            disabled={isUpdating}
                            onChange={handleInputChange}
                          />
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button onClick={handleUpdate} disabled={isUpdating} className="flex-1">
                            {isUpdating ? "Updating..." : `Save ${selectedLane}`}
                          </Button>
                          <Button
                            onClick={handleReset}
                            disabled={isUpdating}
                            variant="destructive"
                            className="flex-1"
                          >
                            {isUpdating ? "Resetting..." : "Reset All Lanes"}
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Current Lane Status + Guidelines */}
              <div className="grid gap-6 lg:grid-cols-2 items-stretch">
                {/* Current Per-Lane Status */}
                <Card className="flex flex-col">
                  <CardHeader>
                    <CardTitle>Current Lane Status</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="grid grid-cols-3 gap-3 h-full">
                      {laneIds.map((laneId) => {
                        const lane = status.lanes[laneId]
                        if (!lane) return null
                        const stateUpper = String(lane.state ?? "").toUpperCase()
                        return (
                          <div key={laneId} className="rounded-lg border p-4 flex flex-col items-center gap-3">
                            <span className="font-semibold text-sm">{laneId}</span>
                            {/* Traffic light indicator */}
                            <div className="w-14 p-2 bg-black rounded-lg flex flex-col items-center gap-2">
                              <div
                                className={`w-9 h-9 rounded-full ${stateUpper === "ALL_RED" || stateUpper === "RED" ? "bg-red-500 ring-2 ring-red-400" : "bg-gray-700"}`}
                                style={{ boxShadow: stateUpper === "ALL_RED" || stateUpper === "RED" ? "0 0 12px rgba(239,68,68,0.6)" : undefined }}
                              />
                              <div
                                className={`w-9 h-9 rounded-full ${stateUpper === "YELLOW" ? "bg-yellow-400 ring-2 ring-yellow-300" : "bg-gray-700"}`}
                                style={{ boxShadow: stateUpper === "YELLOW" ? "0 0 12px rgba(234,179,8,0.45)" : undefined }}
                              />
                              <div
                                className={`w-9 h-9 rounded-full ${stateUpper === "GREEN" ? "bg-green-500 ring-2 ring-green-300" : "bg-gray-700"}`}
                                style={{ boxShadow: stateUpper === "GREEN" ? "0 0 12px rgba(34,197,94,0.45)" : undefined }}
                              />
                            </div>
                            <Badge
                              variant={stateUpper === "GREEN" ? "default" : stateUpper === "YELLOW" ? "secondary" : "destructive"}
                              className="text-xs"
                            >
                              {lane.state}
                            </Badge>
                            <div className="w-full space-y-1.5 text-xs">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Elapsed</span>
                                <span className="font-medium tabular-nums">{typeof lane.elapsed === "number" ? `${lane.elapsed.toFixed(1)}s` : "-"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Gap</span>
                                <span className="font-medium tabular-nums">{typeof lane.gap === "number" ? `${lane.gap.toFixed(2)}s` : "-"}</span>
                              </div>
                              {typeof lane.vehicles_this_green === "number" && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Vehicles</span>
                                  <span className="font-medium tabular-nums">{lane.vehicles_this_green}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Guidelines + Parameter Definitions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Guidelines
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Left column — 3 stacked items */}
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="text-sm font-semibold flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Typical Traffic Settings
                        </p>
                        <ul className="text-xs text-muted-foreground mt-2 space-y-1 ml-6">
                          <li>Max Gap: 2-4 seconds</li>
                          <li>Min Green: 10-20 seconds</li>
                          <li>Max Green: 45-90 seconds</li>
                          <li>Yellow: 3-4 seconds</li>
                          <li>All Red: 1-2 seconds</li>
                        </ul>
                      </div>

                      {/* Parameter Definitions — right column, spans all 3 rows */}
                      <div className="bg-muted p-3 rounded-lg row-span-3">
                        <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-blue-500" />
                          Parameter Definitions
                        </p>
                        <div className="space-y-2 text-xs text-muted-foreground mt-2 ml-6">
                          <div>
                            <span className="font-medium text-foreground">Max Gap</span> — Terminate green if no vehicle detected for this duration. Set to 999 for fixed-time mode.
                          </div>
                          <div>
                            <span className="font-medium text-foreground">Min Green</span> — Minimum duration for the green phase before it can be terminated.
                          </div>
                          <div>
                            <span className="font-medium text-foreground">Max Green</span> — Maximum duration for the green phase to prevent lane starvation.
                          </div>
                          <div>
                            <span className="font-medium text-foreground">Yellow Time</span> — Duration of the yellow light phase between green and red.
                          </div>
                          <div>
                            <span className="font-medium text-foreground">All Red Time</span> — Safety clearance interval where all lights are red.
                          </div>
                        </div>
                      </div>

                      <div className="bg-muted p-3 rounded-lg">
                        <p className="text-sm font-semibold flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                          Fixed-Time Mode
                        </p>
                        <p className="text-xs text-muted-foreground mt-2 ml-6">
                          Set <span className="font-medium">Max Gap = 999</span> to make a lane run in fixed-time mode.
                          The gap will never be exceeded, so the lane always runs to Max Green.
                        </p>
                      </div>

                      <div className="bg-muted p-3 rounded-lg">
                        <p className="text-sm font-semibold flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-red-500" />
                          Emergency Controls
                        </p>
                        <p className="text-xs text-muted-foreground mt-2 ml-6">
                          The Emergency Controls allow you to override normal traffic signals. 
                          Emergency Stop forces all lanes to RED immediately for safety during emergencies or system malfunctions.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Live video feed + vehicle summary */}
              <div className="grid gap-6 lg:grid-cols-2">
                <VideoFeedWebSocket
                  intersectionId={selectedId}
                />
                <VehicleSummary intersectionId={selectedId} />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
