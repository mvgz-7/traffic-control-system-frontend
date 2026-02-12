"use client"

import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getIntersectionStatus } from "@/lib/api"
import type { VACStatus } from "@/lib/types"

interface VACStatusDisplayProps {
  intersectionId: string
}

export function VACStatusDisplay({ intersectionId }: VACStatusDisplayProps) {
  const { data: status } = useSWR<VACStatus>(
    [`vac-status`, intersectionId],
    () => getIntersectionStatus(intersectionId),
    { refreshInterval: 500 }
  )

  if (!status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>VAC Status</CardTitle>
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
        <CardTitle>VAC Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          <div className="flex items-center justify-between p-3 bg-muted rounded">
            <span className="text-sm">Phase</span>
            <span className="font-semibold">{status.phase_name}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted rounded">
            <span className="text-sm">State</span>
            <div className="flex items-center gap-2">
              <div
                className={`w-4 h-4 rounded-full ${
                  status.state === "GREEN"
                    ? "bg-green-500"
                    : status.state === "YELLOW"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }`}
              />
              <span className="font-semibold">{status.state}</span>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted rounded">
            <span className="text-sm">Elapsed</span>
            <span className="font-semibold">{status.elapsed.toFixed(1)}s</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted rounded">
            <span className="text-sm">Gap</span>
            <span className="font-semibold">{status.gap.toFixed(2)}s</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
