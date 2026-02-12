"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getVideoStreamUrl } from "@/lib/api"

interface VideoFeedWebSocketProps {
  intersectionId: string
}

export function VideoFeedWebSocket({ intersectionId }: VideoFeedWebSocketProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const reconnectRef = useRef<{ attempts: number }>({ attempts: 0 })

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
              canvas.width = img.width
              canvas.height = img.height
              ctx?.drawImage(img, 0, 0)
            }
            img.src = `data:image/jpeg;base64,${message.frame}`
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
          <span>Video Feed</span>
          {isConnected ? (
            <span className="text-xs px-2 py-1 bg-green-500/20 text-green-700 rounded">Connected</span>
          ) : (
            <span className="text-xs px-2 py-1 bg-red-500/20 text-red-700 rounded">Disconnected</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <canvas
          ref={canvasRef}
          className="w-full border rounded-lg bg-black"
          style={{ aspectRatio: "16/9" }}
        />
      </CardContent>
    </Card>
  )
}
