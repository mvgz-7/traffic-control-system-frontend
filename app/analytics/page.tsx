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
      <main className="pl-64">
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
              {/* Performance Metrics */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Current Phase</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{vacStatus.phase_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{vacStatus.phase}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Signal State</CardTitle>
                  </CardHeader>
                  <CardContent>
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
                      <p className="text-2xl font-bold">{vacStatus.state}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Green Time Utilization</CardTitle>
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
              </div>

              {/* Detailed Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Status Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Elapsed Time</p>
                      <p className="text-3xl font-bold">{vacStatus.elapsed.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">seconds</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Gap Since Last Vehicle</p>
                      <p className="text-3xl font-bold">{vacStatus.gap.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">seconds</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Min Green Time</p>
                      <p className="text-3xl font-bold">{vacStatus.min_green.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">seconds</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Max Green Time</p>
                      <p className="text-3xl font-bold">{vacStatus.max_green.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">seconds</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Active Lanes */}
              <Card>
                <CardHeader>
                  <CardTitle>Active Lanes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {vacStatus.active_lanes.map((lane) => (
                      <Badge key={lane} variant="default">
                        {lane}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Decision Log */}
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
            </>
          )}
        </div>
      </main>
    </div>
  )
}
