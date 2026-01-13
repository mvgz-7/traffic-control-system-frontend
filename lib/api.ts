// API configuration and helper functions for FastAPI backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export interface TrafficStats {
  timestamp: string | null
  total: number
  lanes: Record<string, number>
  fps: number
  status: string
}

export interface Device {
  index: number
  name: string
  path: string
}

export interface HistoricalData extends TrafficStats {
  timestamp: string
}

// Fetch live stats
export async function fetchLiveStats(): Promise<TrafficStats> {
  const response = await fetch(`${API_BASE_URL}/api/stats/live`)
  if (!response.ok) throw new Error("Failed to fetch live stats")
  return response.json()
}

// Fetch historical data
export async function fetchHistory(): Promise<HistoricalData[]> {
  const response = await fetch(`${API_BASE_URL}/api/stats/history`)
  if (!response.ok) throw new Error("Failed to fetch history")
  return response.json()
}

// Get video devices
export async function fetchDevices(): Promise<{ status: string; devices: Device[] }> {
  const response = await fetch(`${API_BASE_URL}/api/video/devices`)
  if (!response.ok) throw new Error("Failed to fetch devices")
  return response.json()
}

// Start the camera system
export async function startCamera(): Promise<{ status: string; message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/video/start`, { method: "POST" })
  if (!response.ok) {
    let detail = await response.text().catch(() => "")
    try {
      const json = JSON.parse(detail)
      detail = json.detail || json.message || detail
    } catch {}
    throw new Error(detail || "Failed to start camera")
  }
  return response.json()
}

// Stop the camera system
export async function stopCamera(): Promise<{ status: string; message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/video/stop`, { method: "POST" })
  if (!response.ok) {
    let detail = await response.text().catch(() => "")
    try {
      const json = JSON.parse(detail)
      detail = json.detail || json.message || detail
    } catch {}
    throw new Error(detail || "Failed to stop camera")
  }
  return response.json()
}

// Change video source
export async function changeSource(source: string | number): Promise<{ status: string; message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/video/change_source`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source }),
  })
  if (!response.ok) {
    let detail = await response.text().catch(() => "")
    try {
      const json = JSON.parse(detail)
      detail = json.detail || json.message || detail
    } catch {}
    throw new Error(detail || "Failed to change source")
  }
  return response.json()
}

// Get video feed URL
export function getVideoFeedUrl(): string {
  return `${API_BASE_URL}/api/video/feed`
}
