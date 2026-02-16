"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getVideoStreamUrl } from "@/lib/api"
import type { VideoFrameMessage } from "@/lib/types"

interface VideoFeedWebSocketProps {
  intersectionId: string
  onFrame?: (msg: VideoFrameMessage) => void
}

export function VideoFeedWebSocket({ intersectionId, onFrame }: VideoFeedWebSocketProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const reconnectRef = useRef<{ attempts: number }>({ attempts: 0 })
  const containerRef = useRef<HTMLDivElement | null>(null)
  const fullscreenRef = useRef<HTMLDivElement | null>(null)
  const [showDetections, setShowDetections] = useState<boolean>(true)

  const drawFrameToCanvas = (img: HTMLImageElement) => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = container.getBoundingClientRect()
    const targetWidth = Math.max(1, Math.floor(rect.width))
    const targetHeight = Math.max(1, Math.floor(rect.height))

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth
      canvas.height = targetHeight
    }

    // Clear to black background
    ctx.fillStyle = "#000"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Letterbox (contain) to avoid aspect ratio jumps
    const scale = Math.min(canvas.width / img.width, canvas.height / img.height)
    const drawWidth = Math.floor(img.width * scale)
    const drawHeight = Math.floor(img.height * scale)
    const dx = Math.floor((canvas.width - drawWidth) / 2)
    const dy = Math.floor((canvas.height - drawHeight) / 2)

    ctx.drawImage(img, dx, dy, drawWidth, drawHeight)
  }

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const ro = new ResizeObserver(() => {
      // Trigger a resize of the backing store so the canvas stays crisp.
      const rect = container.getBoundingClientRect()
      const targetWidth = Math.max(1, Math.floor(rect.width))
      const targetHeight = Math.max(1, Math.floor(rect.height))
      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth
        canvas.height = targetHeight
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.fillStyle = "#000"
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        }
      }
    })

    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false
    const streamUrl = getVideoStreamUrl(intersectionId)

    const connect = () => {
      if (cancelled) return
      const ws = new WebSocket(streamUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        reconnectRef.current.attempts = 0
      }

      ws.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data)
          if (message.type === "frame" && message.frame) {
            const img = new Image()
            img.crossOrigin = "anonymous"
            img.onload = () => {
              if (cancelled) return
              drawFrameToCanvas(img)
            }
            img.src = `data:image/jpeg;base64,${message.frame}`

            // Surface metadata to parent (lane counts, fps, vac status, camera health)
            try {
              onFrame && onFrame(message as VideoFrameMessage)
            } catch (e) {
              console.warn("onFrame callback failed", e)
            }
          }
        } catch (err) {
          console.error("Error processing frame:", err)
        }
      }

    ws.onerror = (error) => {
      console.error("WebSocket error:", error)
      setIsConnected(false)
    }
      ws.onclose = () => {
        setIsConnected(false)
        if (cancelled) return
        reconnectRef.current.attempts += 1
        const attempt = reconnectRef.current.attempts
        const delay = Math.min(10000, 1000 * 2 ** Math.min(attempt, 5))
        console.warn(`WebSocket closed, reconnecting in ${delay}ms (attempt ${attempt})`)
        setTimeout(() => {
          if (!cancelled) connect()
        }, delay)
      }
    }

    connect()

    return () => {
      cancelled = true
      try {
        const ws = wsRef.current
        if (ws && ws.readyState === WebSocket.OPEN) ws.close()
      } catch (e) {
        /* ignore */
      }
    }
  }, [intersectionId])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>CCTV Feed</span>
          <Badge variant={isConnected ? "success" : "destructive"} className="text-xs">
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={fullscreenRef} className="relative w-full">
          <div
            ref={containerRef}
            className="relative w-full aspect-video overflow-hidden rounded-lg border bg-black"
            style={{ maxHeight: "65vh" }}
          >
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
          </div>

          {/* Controls */}
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showDetections}
                  onChange={(e) => {
                    setShowDetections(e.target.checked)
                    // Informational: backend endpoint to toggle server-side detection is not implemented.
                    try {
                      wsRef.current?.send(
                        JSON.stringify({ action: "set_detection", enabled: e.target.checked }),
                      )
                    } catch (_) {}
                  }}
                />
                Show Detection
              </label>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const el = fullscreenRef.current
                  if (!el) return
                  if (document.fullscreenElement) {
                    document.exitFullscreen().catch(() => {})
                  } else {
                    el.requestFullscreen().catch(() => {})
                  }
                }}
                title="Fullscreen"
              >
                Fullscreen
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
