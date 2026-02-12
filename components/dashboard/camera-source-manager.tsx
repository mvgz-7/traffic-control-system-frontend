"use client"

import { useState } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, Upload, Video, Camera, CheckCircle2, Loader2 } from "lucide-react"
import { listCameras, listUploadedVideos, uploadVideo, assignSourceToCamera, getCameraHealth, getProcessingStatus, startProcessing } from "@/lib/api"
import { toast } from "sonner"
import type { CameraDevice, UploadedVideo } from "@/lib/types"

interface CameraSourceManagerProps {
  intersectionId: string
}

export function CameraSourceManager({ intersectionId }: CameraSourceManagerProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)
  const [selectedCamera, setSelectedCamera] = useState<string>("")
  const [selectedSource, setSelectedSource] = useState<string>("")
  const [sourceType, setSourceType] = useState<"camera" | "file">("camera")
  const [selectedTargetCamera, setSelectedTargetCamera] = useState<string>("")

  const { data: cameras, mutate: mutateCameras } = useSWR<CameraDevice[]>("cameras", listCameras, {
    refreshInterval: 10000,
  })

  const { data: videos, mutate: mutateVideos } = useSWR<UploadedVideo[]>("uploaded-videos", listUploadedVideos, {
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

  const handleAssignSource = async () => {
    if (!selectedTargetCamera || !selectedSource) {
      toast.error("Please select both a target camera slot and a source")
      return
    }

    setIsAssigning(true)
    try {
      await assignSourceToCamera(intersectionId, selectedTargetCamera, selectedSource, sourceType)
      toast.success("Source assigned successfully")
      setSelectedCamera("")
      setSelectedSource("")
      setSelectedTargetCamera("")
      // Ensure processing is running so the stream handler starts reading frames
      try {
        const proc = await getProcessingStatus(intersectionId)
        if (!proc || proc.state?.toLowerCase() !== "running") {
          await startProcessing(intersectionId)
          toast.success("Processing started")
        }
      } catch (err) {
        // Non-fatal: just log and show info
        console.error("Failed to ensure processing start:", err)
        toast.info("Assigned source; start the engine to stream video")
      }
    } catch (error) {
      toast.error("Failed to assign source")
      console.error(error)
    } finally {
      setIsAssigning(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Camera Source Management</CardTitle>
        <CardDescription>Switch between hardware cameras and uploaded video files</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="cameras" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cameras" className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Hardware Cameras
            </TabsTrigger>
            <TabsTrigger value="videos" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              Uploaded Videos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cameras" className="space-y-4 mt-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Connected Cameras</h3>
              {cameras && cameras.length > 0 ? (
                <div className="grid gap-2">
                  {cameras.map((camera) => (
                    <div
                      key={camera.id}
                      onClick={() => {
                        setSourceType("camera")
                        setSelectedCamera(camera.id)
                        setSelectedSource(camera.id)
                      }}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedSource === camera.id && sourceType === "camera"
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{camera.name}</p>
                          <p className="text-xs text-muted-foreground">{camera.device_path || "Detected device"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {camera.type}
                          </Badge>
                          {selectedSource === camera.id && sourceType === "camera" && (
                            <CheckCircle2 className="w-4 h-4 text-blue-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    No cameras detected
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="videos" className="space-y-4 mt-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Upload New Video</h3>
              <label className="block">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
                <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-all">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {isUploading ? "Uploading..." : "Click to upload video or drag and drop"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">MP4, AVI, MOV, or other video formats</p>
                </div>
              </label>
            </div>

            {videos && videos.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Uploaded Videos</h3>
                <div className="grid gap-2">
                  {videos.map((video) => (
                    <div
                      key={video.id}
                      onClick={() => {
                        setSourceType("file")
                        setSelectedCamera("")
                        setSelectedSource(video.id)
                      }}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedSource === video.id && sourceType === "file"
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{video.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            {(video.size_bytes / (1024 * 1024)).toFixed(2)} MB
                            {video.duration_seconds && ` • ${Math.round(video.duration_seconds)}s`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            file
                          </Badge>
                          {selectedSource === video.id && sourceType === "file" && (
                            <CheckCircle2 className="w-4 h-4 text-blue-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Source Assignment Section */}
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold text-sm mb-3">Assign Source to Camera</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-2">Target Camera Slot</p>
              {intersectionCameras ? (
                <div className="grid gap-2">
                  {Object.keys(intersectionCameras).map((camId) => (
                    <div
                      key={camId}
                      onClick={() => setSelectedTargetCamera(camId)}
                      className={`p-2 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedTargetCamera === camId ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{camId}</p>
                        <p className="text-xs text-muted-foreground">{intersectionCameras[camId]?.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Loading camera slots...</p>
              )}
            </div>

            {selectedSource && selectedTargetCamera && (
              <div className="p-2 bg-green-50 dark:bg-green-950 rounded text-sm text-green-800 dark:text-green-200">
                <p>
                  Selected target: <span className="font-medium">{selectedTargetCamera}</span> — source: <span className="font-medium">{sourceType === "camera" ? "Camera Device" : "Video File"}</span>
                </p>
              </div>
            )}

            <Button
              onClick={handleAssignSource}
              disabled={isAssigning || !selectedTargetCamera || !selectedSource}
              className="w-full"
            >
              {isAssigning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                "Assign Source"
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
