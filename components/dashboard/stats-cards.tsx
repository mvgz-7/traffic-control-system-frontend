"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Car, Truck, Bike, Bus, TrendingUp, Clock } from "lucide-react"
import type { TrafficStats } from "@/lib/api"

interface StatsCardsProps {
  stats: TrafficStats
}

export function StatsCards({ stats }: StatsCardsProps) {
  const laneEntries = Object.entries(stats.lanes)

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Vehicle Count */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Vehicles</CardTitle>
          <Car className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground mt-1">Across all lanes</p>
        </CardContent>
      </Card>

      {/* Lane-specific counts */}
      {laneEntries.slice(0, 2).map(([lane, count]) => (
        <Card key={lane}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{lane} Queue</CardTitle>
            <TrendingUp className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{count}</div>
            <p className="text-xs text-muted-foreground mt-1">Vehicles waiting</p>
          </CardContent>
        </Card>
      ))}

      {/* System Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">System Status</CardTitle>
          <Clock className="h-4 w-4 text-chart-3" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-status-active">{stats.status}</div>
          <p className="text-xs text-muted-foreground mt-1">{stats.fps.toFixed(1)} FPS processing</p>
        </CardContent>
      </Card>
    </div>
  )
}

export function VehicleClassificationCards() {
  // These would come from your backend - mock data for now
  const classifications = [
    { type: "Cars (DUMMY DATA)", count: 145, icon: Car, color: "text-chart-1" },
    { type: "Motorcycles (DUMMY DATA)", count: 42, icon: Bike, color: "text-chart-2" },
    { type: "Buses (DUMMY DATA)", count: 8, icon: Bus, color: "text-chart-3" },
    { type: "Trucks (DUMMY DATA)", count: 23, icon: Truck, color: "text-chart-4" },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {classifications.map((item) => (
        <Card key={item.type}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{item.type}</CardTitle>
            <item.icon className={`h-4 w-4 ${item.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.count}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
