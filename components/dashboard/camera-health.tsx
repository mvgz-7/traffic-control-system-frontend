"use client"

import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getCameraHealth } from "@/lib/api"
import { CheckCircle, AlertCircle } from "lucide-react"
import type { CameraHealthResponse } from "@/lib/types"

interface CameraHealthCardProps {
  intersectionId: string
}

export function CameraHealthCard({ intersectionId }: CameraHealthCardProps) {
  const { data: health } = useSWR<CameraHealthResponse>(
    [`cameras`, intersectionId],
    () => getCameraHealth(intersectionId),
    { refreshInterval: 3000 }
  )

  if (!health) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Camera Health</CardTitle>
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
        <CardTitle>Camera Health</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(health).map(([cameraId, cameraHealth]) => (
          <div key={cameraId} className="flex items-center justify-between p-3 bg-muted rounded">
            <div className="flex items-center gap-2">
              {cameraHealth.status === "healthy" ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
              <div>
                <p className="text-sm font-medium">{cameraId}</p>
                <p className="text-xs text-muted-foreground">
                  {cameraHealth.fps?.toFixed(1) || "N/A"} FPS
                  {cameraHealth.resolution && ` • ${cameraHealth.resolution[0]}x${cameraHealth.resolution[1]}`}
                </p>
              </div>
            </div>
            <Badge variant={cameraHealth.status === "healthy" ? "default" : "destructive"}>
              {cameraHealth.status}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
