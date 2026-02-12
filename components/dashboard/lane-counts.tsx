"use client"

import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getIntersectionStatus } from "@/lib/api"
import type { VACStatus } from "@/lib/types"

interface LaneCountsCardProps {
  intersectionId: string
}

export function LaneCountsCard({ intersectionId }: LaneCountsCardProps) {
  const { data: status } = useSWR<VACStatus>(
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Lanes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {status.active_lanes.map((lane) => (
            <Badge key={lane} variant="default">
              {lane}
            </Badge>
          ))}
        </div>
        {status.active_lanes.length === 0 && (
          <p className="text-sm text-muted-foreground">No active lanes</p>
        )}
      </CardContent>
    </Card>
  )
}
