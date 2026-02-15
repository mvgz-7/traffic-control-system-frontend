"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { listIntersections, getIntersectionStatus } from "@/lib/api"
import type { IntersectionSummary, VACStatus } from "@/lib/types"

export default function AnalyticsPage() {
  const [selectedId, setSelectedId] = useState("")

  const { data: intersections } = useSWR<IntersectionSummary[]>("intersections", listIntersections, {
    refreshInterval: 5000,
  })

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

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="pl-72">
        <Header
          title="Traffic Analytics"
          subtitle="Real-time traffic signal performance metrics and analytics"
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
                  <button
                    key={intersection.id}
                    onClick={() => setSelectedId(intersection.id)}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      selectedId === intersection.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {intersection.name}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {selectedId && vacStatus && (
            <>
              {/* Two-column layout: left = VAC Status + Active Lanes, right = Green Utilization + Decision + Min/Max info */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Left column */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>VAC Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-2 items-start">
                        <div className="flex items-center gap-4">
                          {(() => {
                            const stateUpper = vacStatus.state ? vacStatus.state.toString().toUpperCase() : ""
                            const redOn = stateUpper === "ALL_RED" || stateUpper === "RED"
                            const yellowOn = stateUpper === "YELLOW"
                            const greenOn = stateUpper === "GREEN"
                            return (
                              <div className="w-14 p-2 bg-black rounded-md flex flex-col items-center gap-2">
                                <div
                                  className={`w-8 h-8 rounded-full ${redOn ? "bg-red-500 ring-4 ring-red-400" : "bg-gray-700"}`}
                                  style={{ boxShadow: redOn ? "0 0 10px rgba(239,68,68,0.6)" : undefined }}
                                />
                                <div
                                  className={`w-8 h-8 rounded-full ${yellowOn ? "bg-yellow-400 ring-4 ring-yellow-300" : "bg-gray-700"}`}
                                  style={{ boxShadow: yellowOn ? "0 0 10px rgba(234,179,8,0.45)" : undefined }}
                                />
                                <div
                                  className={`w-8 h-8 rounded-full ${greenOn ? "bg-green-500 ring-4 ring-green-300" : "bg-gray-700"}`}
                                  style={{ boxShadow: greenOn ? "0 0 10px rgba(34,197,94,0.45)" : undefined }}
                                />
                              </div>
                            )
                          })()}

                          <div className="space-y-2">
                            <div>
                              <p className="text-sm text-muted-foreground">Phase</p>
                              <p className="text-lg font-semibold">{vacStatus.phase_name}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">State</p>
                              <p className="text-lg font-semibold">{vacStatus.state}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-muted rounded">
                            <span className="text-sm">Elapsed</span>
                            <span className="font-semibold">{vacStatus.elapsed.toFixed(1)}s</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-muted rounded">
                            <span className="text-sm">Gap</span>
                            <span className="font-semibold">{vacStatus.gap.toFixed(2)}s</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground mb-2">Active Lanes</p>
                        <div className="flex flex-wrap gap-2">
                          {vacStatus.active_lanes && vacStatus.active_lanes.length > 0 ? (
                            vacStatus.active_lanes.map((lane) => (
                              <Badge key={lane} variant="default">
                                {lane}
                              </Badge>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground">No active lanes</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right column */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Green Time Utilization</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min((vacStatus.elapsed / vacStatus.max_green) * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {vacStatus.elapsed.toFixed(1)}s / {vacStatus.max_green.toFixed(1)}s
                      </p>
                    </CardContent>
                  </Card>

                  {vacStatus.decision && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Current Algorithm Decision</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-muted p-4 rounded-lg space-y-2">
                          <div>
                            <p className="text-xs text-muted-foreground">Action</p>
                            <p className="text-lg font-semibold">{vacStatus.decision.action}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Reason</p>
                            <p className="text-sm">{vacStatus.decision.reason}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle>Timing Info</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Min Green Time</p>
                          <p className="text-lg font-semibold">{vacStatus.min_green.toFixed(1)}s</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Max Green Time</p>
                          <p className="text-lg font-semibold">{vacStatus.max_green.toFixed(1)}s</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
