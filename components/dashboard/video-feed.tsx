"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getVideoStreamUrl } from "@/lib/api"
interface VideoFeedWebSocketProps {
  intersectionId: string
  onFrame?: (msg: any) => void
}

export function VideoFeedWebSocket({ intersectionId, onFrame }: VideoFeedWebSocketProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasRefs = useRef<HTMLCanvasElement[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [hasFrame, setHasFrame] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const reconnectRef = useRef<{ attempts: number }>({ attempts: 0 })
  const containerRef = useRef<HTMLDivElement | null>(null)
  const fullscreenRef = useRef<HTMLDivElement | null>(null)
  
  const resizingRef = useRef(false)
  const lastImageRef = useRef<HTMLImageElement | null>(null)
  const resizeTimeoutRef = useRef<number | null>(null)


  const [tileMode, setTileMode] = useState(false)
  const [tileRows, setTileRows] = useState(1)
  const [tileCols, setTileCols] = useState(1)
  const [currentTime, setCurrentTime] = useState(new Date())

  const drawFrameToCanvas = (img: HTMLImageElement) => {
    // single full-frame draw to main canvas
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = container.getBoundingClientRect()
    const pixelRatio = Math.max(1, window.devicePixelRatio || 1)
    const targetCssWidth = Math.max(1, Math.floor(rect.width))
    const targetCssHeight = Math.max(1, Math.floor(rect.height))

    const last = (canvas as any)._lastSize || { w: 0, h: 0, dpr: 0 }
    if (last.w !== targetCssWidth || last.h !== targetCssHeight || last.dpr !== pixelRatio) {
      canvas.width = targetCssWidth * pixelRatio
      canvas.height = targetCssHeight * pixelRatio
      canvas.style.width = `${targetCssWidth}px`
      canvas.style.height = `${targetCssHeight}px`
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      ;(canvas as any)._lastSize = { w: targetCssWidth, h: targetCssHeight, dpr: pixelRatio }
    }

    ctx.fillStyle = "#000"
    ctx.fillRect(0, 0, targetCssWidth, targetCssHeight)

    const scale = Math.min(targetCssWidth / img.width, targetCssHeight / img.height)
    const drawWidth = Math.floor(img.width * scale)
    const drawHeight = Math.floor(img.height * scale)
    const dx = Math.floor((targetCssWidth - drawWidth) / 2)
    const dy = Math.floor((targetCssHeight - drawHeight) / 2)

    if ((canvas as any)._pendingRaf) cancelAnimationFrame((canvas as any)._pendingRaf)
    ;(canvas as any)._pendingRaf = requestAnimationFrame(() => {
      try {
        ctx.drawImage(img, dx, dy, drawWidth, drawHeight)
      } catch (e) {}
      ;(canvas as any)._pendingRaf = null
    })
  }

  const drawTilesToCanvas = (tiles: string[], layout: { rows: number; cols: number }) => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = container.getBoundingClientRect()
    const pixelRatio = Math.max(1, window.devicePixelRatio || 1)
    const cssW = Math.max(1, Math.floor(rect.width))
    const cssH = Math.max(1, Math.floor(rect.height))

    // Ensure backing store size and transform are correct
    const last = (canvas as any)._lastSize || { w: 0, h: 0, dpr: 0 }
    if (last.w !== cssW || last.h !== cssH || last.dpr !== pixelRatio) {
      canvas.width = cssW * pixelRatio
      canvas.height = cssH * pixelRatio
      canvas.style.width = `${cssW}px`
      canvas.style.height = `${cssH}px`
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      ;(canvas as any)._lastSize = { w: cssW, h: cssH, dpr: pixelRatio }
    }

    const rows = Math.max(1, layout.rows || Math.ceil(Math.sqrt(tiles.length)))
    const cols = Math.max(1, layout.cols || Math.ceil(tiles.length / rows))

    const cellW = Math.floor(cssW / cols)
    const cellH = Math.floor(cssH / rows)

    // Draw tiles inside a single rAF to avoid interleaved draws
    if ((canvas as any)._pendingRaf) cancelAnimationFrame((canvas as any)._pendingRaf)
    ;(canvas as any)._pendingRaf = requestAnimationFrame(() => {
      // Clear using CSS pixels
      ctx.clearRect(0, 0, cssW, cssH)
        tiles.forEach((b64, i) => {
          const canvas = canvasRefs.current[i]
          if (!canvas) return
          const ctx = canvas.getContext("2d")
          if (!ctx) return

          // size backing store to cell size
          const last = (canvas as any)._lastSize || { w: 0, h: 0, dpr: 0 }
          if (last.w !== cellW || last.h !== cellH || last.dpr !== pixelRatio) {
            canvas.width = cellW * pixelRatio
            canvas.height = cellH * pixelRatio
            canvas.style.width = `${cellW}px`
            canvas.style.height = `${cellH}px`
            ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
            ;(canvas as any)._lastSize = { w: cellW, h: cellH, dpr: pixelRatio }
          }

          // draw tile into this canvas
          const img = new Image()
          img.crossOrigin = "anonymous"
          img.onload = () => {
            try {
              ctx.clearRect(0, 0, cellW, cellH)
              const scale = Math.min(cellW / img.width, cellH / img.height)
              const drawW = Math.floor(img.width * scale)
              const drawH = Math.floor(img.height * scale)
              const offX = Math.floor((cellW - drawW) / 2)
              const offY = Math.floor((cellH - drawH) / 2)
              ctx.drawImage(img, offX, offY, drawW, drawH)
            } catch (e) {}
          }
          img.src = `data:image/jpeg;base64,${b64}`
        })
      ;(canvas as any)._pendingRaf = null
    })
  }

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return
    let frameId: number | null = null
    let scheduled = false
    const ro = new ResizeObserver(() => {
      // Debounce rapid resize events
      if (scheduled) return
      scheduled = true
      // mark resizing; clear after timeout to allow stable rendering
      resizingRef.current = true
      if (resizeTimeoutRef.current) window.clearTimeout(resizeTimeoutRef.current)
      resizeTimeoutRef.current = window.setTimeout(() => {
        resizingRef.current = false
        resizeTimeoutRef.current = null
      }, 350)

      frameId = requestAnimationFrame(() => {
        scheduled = false
        const rect = container.getBoundingClientRect()
        const pixelRatio = Math.max(1, window.devicePixelRatio || 1)
        const targetCssWidth = Math.max(1, Math.floor(rect.width))
        const targetCssHeight = Math.max(1, Math.floor(rect.height))
        const last = (canvas as any)._lastSize || { w: 0, h: 0, dpr: 0 }
        if (last.w !== targetCssWidth || last.h !== targetCssHeight || last.dpr !== pixelRatio) {
          canvas.width = targetCssWidth * pixelRatio
          canvas.height = targetCssHeight * pixelRatio
          canvas.style.width = `${targetCssWidth}px`
          canvas.style.height = `${targetCssHeight}px`
          const ctx = canvas.getContext("2d")
          if (ctx) {
            ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
            ctx.fillStyle = "#000"
            ctx.fillRect(0, 0, targetCssWidth, targetCssHeight)
          }
          ;(canvas as any)._lastSize = { w: targetCssWidth, h: targetCssHeight, dpr: pixelRatio }
        }
      })
    })

    ro.observe(container)
    return () => {
      ro.disconnect()
      if (resizeTimeoutRef.current) window.clearTimeout(resizeTimeoutRef.current)
    }
  }, [])

  // Live clock for date/time overlay
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
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
        setHasFrame(false)
        reconnectRef.current.attempts = 0
      }

      ws.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data)

          // Handle status messages (e.g., "waiting for first frame")
          if (message.type === "status") {
            setStatusMessage(message.message || null)
            return
          }

          if (message.type === "frame" && (message.frame || message.tiles)) {
            setHasFrame(true)
            setStatusMessage(null)
            // If resize/transition is in progress, skip drawing for a short time
            if (resizingRef.current) {
              // still surface metadata but skip draw
              try {
                onFrame && onFrame(message)
              } catch (e) {}
              return
            }

            // Mosaic/tiles support: backend may send message.tiles = [b64,...]
            if (Array.isArray(message.tiles) && message.tiles.length > 0) {
              // clear canvas first (use CSS size)
              const canvas = canvasRef.current
              const container = containerRef.current
              if (canvas && container) {
                const rect = container.getBoundingClientRect()
                const pixelRatio = Math.max(1, window.devicePixelRatio || 1)
                const cssW = Math.max(1, Math.floor(rect.width))
                const cssH = Math.max(1, Math.floor(rect.height))
                const ctx = canvas.getContext("2d")
                if (ctx) {
                  ctx.clearRect(0, 0, cssW, cssH)
                }
              }
              const rows = message.tile_rows || message.rows || Math.ceil(Math.sqrt(message.tiles.length))
              const cols = message.tile_cols || message.cols || Math.ceil(message.tiles.length / rows)
              // enable tile mode and let React render canvases, then draw
              setTileRows(rows)
              setTileCols(cols)
              setTileMode(true)
              // small delay to allow canvases to be attached to DOM
              setTimeout(() => drawTilesToCanvas(message.tiles, { rows, cols }), 60)
            } else if (message.frame) {
              // leave tile mode when single full-frame arrives
              if (tileMode) {
                setTileMode(false)
              }
              // Cancel previous image load callbacks to avoid out-of-order draws
              if (lastImageRef.current) {
                try {
                  lastImageRef.current.onload = null
                } catch (e) {}
                lastImageRef.current = null
              }

              const img = new Image()
              lastImageRef.current = img
              img.crossOrigin = "anonymous"
              img.onload = () => {
                if (cancelled) return
                // guard against stale image onload
                if (lastImageRef.current !== img) return
                drawFrameToCanvas(img)
              }
              img.onerror = () => {
                // ignore
              }
              img.src = `data:image/jpeg;base64,${message.frame}`
            }

            // Surface metadata to parent (lane counts, fps, vac status, camera health)
            try {
              onFrame && onFrame(message)
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
            {/* Loading overlay when connected but no frame yet */}
            {isConnected && !hasFrame && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/80">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
                <p className="text-sm text-muted-foreground">
                  {statusMessage || "Waiting for video frames..."}
                </p>
                <p className="text-xs text-muted-foreground/60">Model may be loading for the first time</p>
              </div>
            )}

            {/* Disconnected overlay */}
            {!isConnected && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/80">
                <p className="text-sm text-muted-foreground">Connecting to video stream...</p>
              </div>
            )}

            {/* Date & time overlay — lower-right */}
            {hasFrame && (
              <div className="absolute bottom-2 right-2 z-20 rounded bg-black/60 px-2.5 py-1 font-mono text-xs text-white backdrop-blur-sm">
                <span>{currentTime.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}</span>
                <span className="mx-1.5 text-white/40">|</span>
                <span>{currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}</span>
              </div>
            )}

            {!tileMode ? (
              <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
            ) : (
              <div
                className="absolute inset-0 grid h-full w-full"
                style={{ gridTemplateColumns: `repeat(${tileCols}, minmax(0,1fr))`, gridTemplateRows: `repeat(${tileRows}, minmax(0,1fr))` }}
              >
                {Array.from({ length: tileRows * tileCols }).map((_, i) => (
                  <canvas
                    key={`tile-canvas-${i}`}
                    ref={(el) => { canvasRefs.current[i] = el as HTMLCanvasElement }}
                    className="w-full h-full"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
