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
        {Object.entries(health).map(([cameraId, cam]) => {
          const isAlive = cam.alive
          return (
            <div key={cameraId} className="flex items-center justify-between p-3 bg-muted rounded">
              <div className="flex items-center gap-2">
                {isAlive ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
                <div>
                  <p className="text-sm font-medium">{cameraId}</p>
                  <p className="text-xs text-muted-foreground">
                    {cam.fps_actual?.toFixed(1) ?? "0"} / {cam.fps_expected} FPS
                    {cam.approach && ` • ${cam.approach}`}
                    {cam.lanes?.length > 0 && ` • ${cam.lanes.join(", ")}`}
                  </p>
                  {cam.frames_dropped > 0 && (
                    <p className="text-xs text-amber-500">
                      {cam.frames_dropped} frames dropped
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant={isAlive ? "default" : "destructive"}>
                  {cam.status}
                </Badge>
                {cam.quality_warning && (
                  <Badge variant="outline" className="text-xs text-amber-500 border-amber-500">
                    Quality Warning
                  </Badge>
                )}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
