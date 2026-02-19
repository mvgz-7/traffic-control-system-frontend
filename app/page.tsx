"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { VideoFeedWebSocket } from "@/components/dashboard/video-feed"
import { IntersectionSelector } from "@/components/dashboard/intersection-selector"
import { VACStatusDisplay } from "@/components/dashboard/vac-status"
import { listIntersections } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import type { IntersectionSummary, IntersectionStatus } from "@/lib/types"
import { CameraSourceManager } from "@/components/dashboard/camera-source-manager"
import { VehicleSummary } from "@/components/dashboard/vehicle-summary"

export default function DashboardPage() {
  const [selectedIntersection, setSelectedIntersection] = useState<string>("")
  const [liveVacStatus, setLiveVacStatus] = useState<IntersectionStatus | null>(null)
  const [liveLineCounts, setLiveLineCounts] = useState<Record<string, Record<string, number>> | null>(null)
  
  // Fetch list of intersections
  const { data: intersections, isLoading: isLoadingIntersections } = useSWR<IntersectionSummary[]>(
    "intersections",
    listIntersections,
    {
      refreshInterval: 5000,
      fallbackData: [],
    }
  )

  // Auto-select first intersection when available
  useEffect(() => {
    if (intersections && intersections.length > 0 && !selectedIntersection) {
      setSelectedIntersection(intersections[0].id)
    }
  }, [intersections, selectedIntersection])

  if (isLoadingIntersections || !intersections) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (intersections.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="min-w-0 md:pl-72">
          <Header
            title="Traffic Dashboard"
            subtitle="Real-time vehicle detection and dynamic traffic light control"
          />
          <div className="p-6">
            <Card>
              <CardHeader>
                <CardTitle>No Intersections</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">No intersections configured. Please check your backend configuration.</p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="min-w-0 md:pl-72">
        <Header
          title="Traffic Dashboard"
          subtitle="Real-time vehicle detection and dynamic traffic light control"
        />
        <div className="space-y-6 p-6">
          {/* Intersection Selector */}
          <IntersectionSelector
            intersections={intersections}
            selectedId={selectedIntersection}
            onSelect={setSelectedIntersection}
          />

          {/* Main Dashboard Content */}
          {selectedIntersection && (
            <>
              {/* Video Feed */}
              <div className="min-w-0">
                <VideoFeedWebSocket
                  intersectionId={selectedIntersection}
                  onFrame={(msg) => {
                    try {
                      if (msg?.vac_status) setLiveVacStatus(msg.vac_status)
                      if (msg?.line_counts) setLiveLineCounts(msg.line_counts)
                    } catch (_) {}
                  }}
                />
              </div>

              {/* Under video: VAC status (single column) */}
              <div className="min-w-0">
                <VACStatusDisplay intersectionId={selectedIntersection} liveStatus={liveVacStatus} />
              </div>

              {/* Under VAC: 2 columns */}
              <div className="grid gap-6 lg:grid-cols-2 items-stretch">
                <div className="h-full min-w-0">
                  <CameraSourceManager intersectionId={selectedIntersection} />
                </div>
                <div className="h-full min-w-0">
                  <VehicleSummary intersectionId={selectedIntersection} liveLineCounts={liveLineCounts} />
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
