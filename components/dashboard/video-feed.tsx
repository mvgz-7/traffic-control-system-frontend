"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Square, Video, VideoOff, Maximize2 } from "lucide-react"
import { getVideoFeedUrl, startCamera, stopCamera } from "@/lib/api"
import { toast } from "sonner"

interface VideoFeedProps {
  status: string
  fps: number
}

export function VideoFeed({ status, fps }: VideoFeedProps) {
  const [isPlaying, setIsPlaying] = useState(status === "Active")
  const [isLoading, setIsLoading] = useState(false)
  const [feedSrc, setFeedSrc] = useState<string>(() => (status === "Active" ? `${getVideoFeedUrl()}?t=${Date.now()}` : ""))
  const imgRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    setIsPlaying(status === "Active")
    if (status === "Active") {
      setFeedSrc(`${getVideoFeedUrl()}?t=${Date.now()}`)
    } else {
      setFeedSrc("")
    }
  }, [status])

  const handleStart = async () => {
    setIsLoading(true)
    try {
      await startCamera()
      setIsPlaying(true)
      const url = `${getVideoFeedUrl()}?t=${Date.now()}`
      setFeedSrc(url)
      if (imgRef.current) imgRef.current.src = url
      toast.success("Camera system started")
    } catch (err: any) {
      toast.error(err?.message || "Failed to start camera")
    } finally {
      setIsLoading(false)
    }
  }

  const handleStop = async () => {
    setIsLoading(true)
    try {
      await stopCamera()
      setIsPlaying(false)
      setFeedSrc("")
      if (imgRef.current) imgRef.current.src = ""
      toast.success("Camera system stopped")
    } catch (err: any) {
      toast.error(err?.message || "Failed to stop camera")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <CardTitle className="text-lg">Live Video Feed</CardTitle>
          <Badge
            variant={isPlaying ? "default" : "secondary"}
            className={isPlaying ? "bg-status-active text-accent-foreground" : ""}
          >
            {isPlaying ? "LIVE" : "OFFLINE"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground font-mono">{fps.toFixed(1)} FPS</span>
          <Button variant="ghost" size="icon">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative aspect-video overflow-hidden rounded-lg bg-secondary">
          {isPlaying ? (
            <img
              ref={imgRef}
              src={feedSrc || getVideoFeedUrl()}
              alt="Live traffic feed"
              className="h-full w-full object-cover"
              onError={() => {
                const url = `${getVideoFeedUrl()}?t=${Date.now()}`
                setFeedSrc(url)
                if (imgRef.current) imgRef.current.src = url
              }}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <VideoOff className="h-16 w-16 text-muted-foreground" />
              <p className="text-muted-foreground">Camera feed is offline</p>
            </div>
          )}

          {/* Overlay controls */}
          <div className="absolute bottom-4 left-4 right-4 flex justify-between">
            <div className="flex gap-2">
              {isPlaying ? (
                <Button size="sm" variant="destructive" onClick={handleStop} disabled={isLoading}>
                  <Square className="mr-2 h-4 w-4" />
                  Stop
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleStart}
                  disabled={isLoading}
                  className="bg-status-active hover:bg-status-active/90 text-accent-foreground"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Start
                </Button>
              )}
            </div>
            <Badge variant="outline" className="bg-background/80 backdrop-blur">
              <Video className="mr-1 h-3 w-3" />
              YOLO Detection
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
