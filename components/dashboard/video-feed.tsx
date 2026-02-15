"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getVideoStreamUrl, startProcessing, stopProcessing } from "@/lib/api"
import { Play, Square } from "lucide-react"
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
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [showDetections, setShowDetections] = useState<boolean>(true)

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
          const canvas = canvasRef.current
          if (canvas) {
            const ctx = canvas.getContext("2d")
            const img = new Image()
            img.crossOrigin = "anonymous"
            img.onload = () => {
              // Set canvas internal pixel size to the frame's native resolution
              canvas.width = img.width
              canvas.height = img.height

              // Draw at native resolution
              ctx?.drawImage(img, 0, 0)

              // Make the canvas responsive: full width of container, height auto to preserve aspect ratio
              try {
                canvas.style.width = "100%"
                canvas.style.height = "auto"
              } catch (_) {}
            }
            img.src = `data:image/jpeg;base64,${message.frame}`
          }
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
          {isConnected ? (
            <span className="text-xs px-2 py-1 bg-green-500/20 text-green-700 rounded">Connected</span>
          ) : (
            <span className="text-xs px-2 py-1 bg-red-500/20 text-red-700 rounded">Disconnected</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className="relative w-full">
          <canvas
            ref={canvasRef}
            className="w-full h-auto border rounded-lg bg-black"
            style={{ maxHeight: "65vh" }}
          />

          {/* Controls */}
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={async () => {
                try {
                  if (!isProcessing) {
                    await startProcessing(intersectionId)
                    setIsProcessing(true)
                  } else {
                    await stopProcessing(intersectionId)
                    setIsProcessing(false)
                  }
                } catch (e) {
                  console.error("Failed to toggle processing", e)
                }
              }}
              className={
                isProcessing
                  ? "px-4 py-2 rounded-md bg-green-600 text-white text-sm font-semibold hover:bg-red-600/90"
                  : "px-4 py-2 rounded-md bg-red-600 text-white text-sm font-semibold hover:bg-green-600/90"
              }
            >
              {isProcessing ? (
                <span className="inline-flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  Start
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Square className="h-4 w-4" />
                  Stop
                </span>
              )}
            </button>

            <div className="flex items-center gap-3">
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

              <button
                onClick={() => {
                  const el = containerRef.current
                  if (!el) return
                  if (document.fullscreenElement) {
                    document.exitFullscreen().catch(() => {})
                  } else {
                    el.requestFullscreen().catch(() => {})
                  }
                }}
                className="px-3 py-2 rounded-md bg-slate-800 text-white text-sm hover:bg-slate-800/90"
                title="Fullscreen"
              >
                Fullscreen
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
