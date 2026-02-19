"use client"

import { useState, useRef } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Upload, Camera } from "lucide-react"
import { listCameras, listUploadedVideos, uploadVideo, assignSourceToCamera, getCameraHealth, getIntersectionLanes } from "@/lib/api"
import { toast } from "sonner"
import type { UploadedVideo, CameraDevice } from "@/lib/types"

interface CameraSourceManagerProps {
  intersectionId: string
}

export function CameraSourceManager({ intersectionId }: CameraSourceManagerProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)

  // Disable aggressive polling by default to avoid frequent requests.
  // The UI provides a manual "Refresh Sources" button below to revalidate on demand.
  const { data: videos, mutate: mutateVideos } = useSWR<UploadedVideo[]>(
    "uploaded-videos",
    listUploadedVideos,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  )

  const { data: cameras, mutate: mutateCameras } = useSWR<CameraDevice[]>(
    "cameras",
    listCameras,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  )

  const { data: intersectionCameras, mutate: mutateIntersectionCameras } = useSWR(
    intersectionId ? [`intersection-cameras`, intersectionId] : null,
    intersectionId ? () => getCameraHealth(intersectionId) : null,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  )

  // Dynamically discover camera slots from the backend
  const { data: lanesInfo } = useSWR(
    intersectionId ? [`intersection-lanes`, intersectionId] : null,
    intersectionId ? () => getIntersectionLanes(intersectionId) : null,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  )

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("video/")) {
      toast.error("Please select a valid video file (MP4, AVI, MOV, etc.)")
      return
    }

    setIsUploading(true)
    try {
      await uploadVideo(file)
      toast.success(`Video "${file.name}" uploaded successfully`)
      mutateVideos()
    } catch (error) {
      toast.error("Failed to upload video")
      console.error(error)
    } finally {
      setIsUploading(false)
      event.target.value = ""
    }
  }

  // (Deprecated) general assign button removed. Use per-slot quick assign below.

  // Quick assign UI state (dynamic slots per intersection)
  const [selections, setSelections] = useState<Record<string, string>>({})

  const handleQuickAssign = async (slot: string, selection: string) => {
    if (!selection) {
      toast.error("Please select a source first")
      return
    }
    // selection is prefixed: "cam:<id>" or "file:<path>"
    const [prefix, ...rest] = selection.split(":")
    const value = rest.join(":")
    const type = prefix === "cam" ? "camera" : "file"

    setIsAssigning(true)
    try {
      await assignSourceToCamera(intersectionId, slot, value, type as "camera" | "file")
      toast.success(`Assigned ${selection} -> ${slot}`)
      mutateIntersectionCameras()
      mutateCameras()
      mutateVideos()
    } catch (err) {
      console.error(err)
      toast.error("Failed to assign source")
    } finally {
      setIsAssigning(false)
    }
  }

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-base sm:text-lg">Camera Source Management</CardTitle>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="w-4 h-4" />
              Upload New Video
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto border-foreground text-foreground"
              onClick={async () => {
                try {
                  const cams = await listCameras(true)
                  mutateCameras?.(cams, false)

                  const vids = await listUploadedVideos()
                  mutateVideos?.(vids, false)

                  if (intersectionId) {
                    const health = await getCameraHealth(intersectionId)
                    mutateIntersectionCameras?.(health, false)
                  }

                  toast.success("Sources refreshed")
                } catch (e) {
                  console.error(e)
                  toast.error("Failed to refresh sources")
                }
              }}
            >
              <Camera className="w-4 h-4" />
              Refresh Sources
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Source Assignment Section */}
        <div className="rounded-lg bg-muted p-4">
          <h3 className="font-semibold text-sm mb-3">Assign Source to Camera</h3>
          <div className="space-y-3">
            {/* Quick 2-slot assign for camera_north and camera_south */}
            <div className="grid grid-cols-1 gap-3">
              {(() => {
                // Use dynamic camera IDs from backend lane info, fall back to camera health keys
                const slots: string[] = lanesInfo?.lane_to_camera
                  ? [...new Set(Object.values(lanesInfo.lane_to_camera) as string[])]
                  : intersectionCameras
                    ? Object.keys(intersectionCameras)
                    : []
                return slots.map((slot) => (
                  <div key={slot} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <div className="font-medium sm:w-32 min-w-0">{slot}</div>
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:flex-1 min-w-0"
                      value={selections[slot] ?? ''}
                      onChange={(e) => {
                        const val = e.target.value
                        setSelections((prev) => ({ ...prev, [slot]: val }))
                      }}
                    >
                      <option value="">Select source...</option>
                      <optgroup label="Hardware Cameras">
                        {cameras?.map((c) => (
                          <option key={`cam-${c.id}-${slot}`} value={`cam:${c.id}`}>{`cam: ${c.name}`}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Uploaded Videos">
                        {videos?.map((v) => (
                          <option key={`vid-${v.id}-${slot}`} value={`file:${v.file_path}`}>{`file: ${v.filename}`}</option>
                        ))}
                      </optgroup>
                    </select>
                    <Button
                      size="sm"
                      className="w-full sm:w-auto sm:flex-shrink-0"
                      onClick={() => handleQuickAssign(slot, selections[slot] ?? '')}
                      disabled={isAssigning}
                    >
                      OK
                    </Button>
                  </div>
                ))
              })()}
            </div>
          </div>
        </div>
      
        <div className="mt-4 rounded-lg border-2 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="font-semibold text-sm">Camera Slots Status</p>
            <Badge variant="outline" className="text-xs">
              {intersectionId}
            </Badge>
          </div>

          {intersectionCameras ? (
            <div className="grid gap-2">
              {(() => {
                // Only show lane cameras (exclude overview-only cameras)
                const laneCamIds: string[] = lanesInfo?.lane_to_camera
                  ? [...new Set(Object.values(lanesInfo.lane_to_camera) as string[])]
                  : Object.keys(intersectionCameras).filter(
                      (id) => intersectionCameras[id]?.lanes?.length > 0
                    )
                return laneCamIds.map((camId) => {
                  const cam = intersectionCameras[camId]
                  const status = cam?.status
                  const s = status?.toString().toLowerCase() ?? ""
                  const isRunning = s === "running"

                  return (
                    <div
                      key={camId}
                      className={
                        "flex items-center justify-between gap-3 rounded-lg border px-3 py-2 " +
                        (isRunning ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5")
                      }
                    >
                      <p className="font-medium text-sm">{camId}</p>
                      <div className="flex items-center gap-2">
                        {cam?.approach && (
                          <span className="text-xs text-muted-foreground">{cam.approach}</span>
                        )}
                        <span
                          className={
                            "inline-block h-2 w-2 rounded-full " +
                            (isRunning ? "bg-[color:var(--status-active)]" : "bg-destructive")
                          }
                        />
                        <Badge variant={isRunning ? "success" : "destructive"} className="text-xs">
                          {status ?? "unknown"}
                        </Badge>
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Loading camera slots...</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
