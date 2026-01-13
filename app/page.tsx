"use client"

import { useCallback } from "react"
import useSWR from "swr"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { VideoFeed } from "@/components/dashboard/video-feed"
import { StatsCards, VehicleClassificationCards } from "@/components/dashboard/stats-cards"
import { TrafficChart } from "@/components/dashboard/traffic-chart"
import { PerformanceMetrics } from "@/components/dashboard/performance-metrics"
import { fetchLiveStats, fetchHistory, type TrafficStats, type HistoricalData } from "@/lib/api"

const defaultStats: TrafficStats = {
  timestamp: null,
  total: 0,
  lanes: {},
  fps: 0,
  status: "Connecting...",
}

export default function DashboardPage() {
  // Fetch live stats
  const { data: stats, mutate: mutateStats } = useSWR<TrafficStats>("live-stats", fetchLiveStats, {
    refreshInterval: 1000,
    fallbackData: defaultStats,
    onError: () => {
     
    },
  })

  // Fetch history
  const { data: history, mutate: mutateHistory } = useSWR<HistoricalData[]>("history", fetchHistory, {
    refreshInterval: 2000,
    fallbackData: [],
    onError: () => {
      
    },
  })

  const handleRefresh = useCallback(() => {
    mutateStats()
    mutateHistory()
  }, [mutateStats, mutateHistory])

  const currentStats = stats || defaultStats
  const currentHistory = history || []

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="pl-64">
        <Header
          title="Traffic Dashboard"
          subtitle="Real-time vehicle detection and traffic flow monitoring"
          onRefresh={handleRefresh}
        />
        <div className="space-y-6 p-6">
          {/* Stats Overview */}
          <StatsCards stats={currentStats} />

          {/* Video Feed */}
          <div>
            <VideoFeed status={currentStats.status} fps={currentStats.fps} />
          </div>

          {/* Vehicle Classification */}
          <VehicleClassificationCards />

          {/* Charts and Metrics */}
          <div className="grid gap-6 lg:grid-cols-3">
            <TrafficChart data={currentHistory} />
            <PerformanceMetrics stats={currentStats} history={currentHistory} />
          </div>
        </div>
      </main>
    </div>
  )
}
