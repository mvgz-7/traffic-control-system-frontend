"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { VideoFeedWebSocket } from "@/components/dashboard/video-feed"
import { IntersectionSelector } from "@/components/dashboard/intersection-selector"
import { VACStatusDisplay } from "@/components/dashboard/vac-status"
import { CameraHealthCard } from "@/components/dashboard/camera-health"
import { LaneCountsCard } from "@/components/dashboard/lane-counts"
import { listIntersections } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import type { IntersectionSummary } from "@/lib/types"

export default function DashboardPage() {
  const [selectedIntersection, setSelectedIntersection] = useState<string>("")
  
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
        <main className="pl-64">
          <Header
            title="Traffic Dashboard"
            subtitle="Real-time vehicle detection and dynamic traffic light control"
          />
          <div className="p-6">
            <Card>
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
      <main className="pl-64">
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
              {/* VAC Status and Camera Health */}
              <div className="grid gap-6 lg:grid-cols-2">
                <VACStatusDisplay intersectionId={selectedIntersection} />
                <CameraHealthCard intersectionId={selectedIntersection} />
              </div>

              {/* Video Feed and Lane Counts */}
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <VideoFeedWebSocket intersectionId={selectedIntersection} />
                </div>
                <LaneCountsCard intersectionId={selectedIntersection} />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
