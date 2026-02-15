"use client"

import { useState, useRef } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
// tabs removed: simplified to Upload + Assign
import { AlertCircle, Upload, Video, Camera, CheckCircle2, Loader2 } from "lucide-react"
import { listCameras, listUploadedVideos, uploadVideo, assignSourceToCamera, getCameraHealth, getProcessingStatus, startProcessing } from "@/lib/api"
import { toast } from "sonner"
import type { UploadedVideo, CameraDevice } from "@/lib/types"

interface CameraSourceManagerProps {
  intersectionId: string
}

export function CameraSourceManager({ intersectionId }: CameraSourceManagerProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)

  const { data: videos, mutate: mutateVideos } = useSWR<UploadedVideo[]>("uploaded-videos", listUploadedVideos, {
    refreshInterval: 10000,
  })

  const { data: cameras, mutate: mutateCameras } = useSWR<CameraDevice[]>("cameras", listCameras, {
    refreshInterval: 10000,
  })

  const { data: intersectionCameras, mutate: mutateIntersectionCameras } = useSWR(
    intersectionId ? [`intersection-cameras`, intersectionId] : null,
    intersectionId ? () => getCameraHealth(intersectionId) : null,
    { refreshInterval: 5000 }
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

  // Quick assign UI state for camera_north and camera_south (mixed sources)
  const [northSelection, setNorthSelection] = useState<string>("")
  const [southSelection, setSouthSelection] = useState<string>("")

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
        <div className="w-full flex items-start justify-between">
          <div>
            <CardTitle>Camera Source Management</CardTitle>
            <CardDescription>Upload videos and assign them to camera slots</CardDescription>
          </div>
          <div>
            <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileUpload} className="hidden" />
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Upload New Video
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Source Assignment Section */}
        <div className="p-4 bg-muted rounded-lg">
          <h3 className="font-semibold text-sm mb-3">Assign Source to Camera</h3>
          <div className="space-y-3">
            {/* Quick 2-slot assign for camera_north and camera_south */}
            <div className="grid grid-cols-1 gap-3">
              {['camera_north','camera_south'].map((slot) => (
                <div key={slot} className="flex items-center gap-2">
                  <div className="w-32 font-medium">{slot}</div>
                  <select
                    className="flex-1 rounded border px-2 py-1 bg-white/80"
                    value={slot === 'camera_north' ? northSelection : southSelection}
                    onChange={(e) => {
                      const val = e.target.value
                      if (slot === 'camera_north') setNorthSelection(val)
                      else setSouthSelection(val)
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
                  <button
                    className="px-3 py-1 rounded bg-green-600 text-white"
                    onClick={() => handleQuickAssign(slot, slot === 'camera_north' ? northSelection : southSelection)}
                    disabled={isAssigning}
                  >
                    OK
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        
          {/* Upload section moved to header button */}
        

        
        <div className="mt-2 p-4 border rounded-lg">
              <p className="font-semibold text-sm mb-3">Camera Slots Status</p>
              {intersectionCameras ? (
                <div className="grid gap-2">
                  {Object.keys(intersectionCameras).map((camId) => {
                    const status = intersectionCameras[camId]?.status
                    const s = status?.toString().toLowerCase() ?? ""
                    const isRunning = ['running', 'online', 'active', 'connected'].includes(s)
                    const cardClass = isRunning
                      ? "p-2 rounded-lg border-2 bg-green-50 border-green-400 text-green-800"
                      : "p-2 rounded-lg border-2 bg-red-50 border-red-400 text-red-800"
                    return (
                      <div key={camId} className={cardClass}>
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{camId}</p>
                          <div className="flex items-center gap-2">
                            <span className={`inline-block w-2 h-2 rounded-full ${isRunning ? 'bg-green-600' : 'bg-red-600'}`} />
                            <p className="text-xs">{status ?? 'unknown'}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Loading camera slots...</p>
              )}
        </div>
      </CardContent>
    </Card>
  )
}
