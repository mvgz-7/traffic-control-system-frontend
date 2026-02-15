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
    <Card className="h-full">
      <CardHeader>
        <CardTitle>VAC Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 items-start">
          <div className="flex items-center gap-4">
            {/* Traffic light illustration */}
            {(() => {
              const stateUpper = status.state ? status.state.toString().toUpperCase() : ''
              const redOn = stateUpper === 'ALL_RED' || stateUpper === 'RED'
              const yellowOn = stateUpper === 'YELLOW'
              const greenOn = stateUpper === 'GREEN'
              return (
                <div className="w-14 p-2 bg-black rounded-md flex flex-col items-center gap-2">
                  <div className={`w-8 h-8 rounded-full ${redOn ? 'bg-red-500 ring-4 ring-red-400' : 'bg-gray-700'}`} style={{ boxShadow: redOn ? '0 0 10px rgba(239,68,68,0.6)' : undefined }} />
                  <div className={`w-8 h-8 rounded-full ${yellowOn ? 'bg-yellow-400 ring-4 ring-yellow-300' : 'bg-gray-700'}`} style={{ boxShadow: yellowOn ? '0 0 10px rgba(234,179,8,0.45)' : undefined }} />
                  <div className={`w-8 h-8 rounded-full ${greenOn ? 'bg-green-500 ring-4 ring-green-300' : 'bg-gray-700'}`} style={{ boxShadow: greenOn ? '0 0 10px rgba(34,197,94,0.45)' : undefined }} />
                </div>
              )
            })()}
            <div className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Phase</p>
                <p className="font-semibold">{status.phase_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">State</p>
                <p className="font-semibold">{status.state}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded">
              <span className="text-sm">Elapsed</span>
              <span className="font-semibold">{status.elapsed.toFixed(1)}s</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded">
              <span className="text-sm">Gap</span>
              <span className="font-semibold">{status.gap.toFixed(2)}s</span>
            </div>
          </div>
        </div>

        {/* Active Lanes */}
        <div className="mt-4">
          <p className="text-sm text-muted-foreground mb-2">Active Lanes</p>
          {Array.isArray((status as any).active_lanes) && (status as any).active_lanes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {(status as any).active_lanes.map((lane: string) => (
                <span key={lane} className="px-2 py-1 bg-green-50 text-green-800 rounded">{lane}</span>
              ))}
            </div>
          ) : (status as any).lane_counts ? (
            <div className="flex flex-wrap gap-2">
              {Object.entries((status as any).lane_counts).map(([k, v]) => (
                <span key={k} className="px-2 py-1 bg-muted rounded">{k}: {String(v)}</span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No active lanes reported</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
