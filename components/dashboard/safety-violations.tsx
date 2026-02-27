"use client"

import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getSafetyViolations } from "@/lib/api"
import type { SafetyViolation } from "@/lib/types"

interface SafetyViolationsProps {
  intersectionId: string
}

function formatTime(ts: number | string | undefined) {
  if (!ts) return "-"
  const n = typeof ts === "number" ? ts * 1000 : Number(ts)
  try {
    return new Date(n).toLocaleString()
  } catch {
    return String(ts)
  }
}

export function SafetyViolationsCard({ intersectionId }: SafetyViolationsProps) {
  const { data } = useSWR<SafetyViolation[]>(
    intersectionId ? ["safetyViolations", intersectionId] : null,
    () => getSafetyViolations(intersectionId),
    { refreshInterval: 5000 }
  )

  const rows = data || []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Safety Violations</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent safety violations</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id ?? `${r.timestamp}-${r.violation_type}`} className="p-3 bg-muted rounded flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium">{r.violation_type}</div>
                    <div className="text-xs text-muted-foreground">{formatTime(r.timestamp)}</div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Lanes: {Array.isArray(r.lanes_involved) ? r.lanes_involved.join(", ") : String(r.lanes_involved)}
                  </div>
                  {r.details && <div className="text-xs text-muted-foreground mt-1">{r.details}</div>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={r.prevented ? "default" : "destructive"}>{r.prevented ? "Prevented" : "Violation"}</Badge>
                  <div className="text-xs text-muted-foreground">{r.created_at ?? ""}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default SafetyViolationsCard
