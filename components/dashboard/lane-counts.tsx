"use client"

import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getIntersectionStatus } from "@/lib/api"
import type { IntersectionStatus } from "@/lib/types"

interface LaneCountsCardProps {
  intersectionId: string
}

export function LaneCountsCard({ intersectionId }: LaneCountsCardProps) {
  const { data: status } = useSWR<IntersectionStatus>(
    [`lanes`, intersectionId],
    () => getIntersectionStatus(intersectionId),
    { refreshInterval: 1000 }
  )

  if (!status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Lanes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  const lanes = status.lanes || {}
  const laneIds = Object.keys(lanes)
  const activeLanes = laneIds.filter((id) => {
    const state = String(lanes[id]?.state ?? "").toUpperCase()
    return state === "GREEN" || state === "YELLOW"
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Lanes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {laneIds.map((laneId) => {
            const state = String(lanes[laneId]?.state ?? "").toUpperCase()
            const isActive = state === "GREEN" || state === "YELLOW"
            return (
              <Badge key={laneId} variant={isActive ? "default" : "outline"}>
                {laneId} — {state || "UNKNOWN"}
              </Badge>
            )
          })}
        </div>
        {laneIds.length === 0 && (
          <p className="text-sm text-muted-foreground">No lanes configured</p>
        )}
      </CardContent>
    </Card>
  )
}
