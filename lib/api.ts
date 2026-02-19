// API configuration and helper functions for FastAPI backend
// Aligned with 3-lane independent VAC backend (February 2026)
import type {
  IntersectionStatus,
  LaneConfig,
  LaneConfigUpdate,
  SignalDisplay,
  ProcessingStatus,
  ControlResponse,
  IntersectionSummary,
  CameraHealthResponse,
  HealthResponse,
  HealthAlert,
  HealthMetricPoint,
  AppSettings,
  CameraDevice,
  UploadedVideo,
  SourceAssignmentResponse,
  DecisionLogEntry,
} from "./types"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const API_V1 = `${API_BASE_URL}/api/v1`

// ===== System Endpoints =====

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_V1}/health/status`)
  if (!response.ok) throw new Error("Failed to fetch health")
  return response.json()
}

export async function getSettings(): Promise<AppSettings> {
  const response = await fetch(`${API_V1}/system/settings`)
  if (!response.ok) throw new Error("Failed to fetch settings")
  return response.json()
}

export async function getHealthAlerts(): Promise<HealthAlert[]> {
  const response = await fetch(`${API_V1}/health/alerts`)
  if (!response.ok) throw new Error("Failed to fetch health alerts")
  const alerts = await response.json()
  // Normalize severity casing to lowercase for frontend consumption
  return (alerts || []).map((a: any) => ({ ...a, severity: String(a.severity || a.severity).toLowerCase() }))
}

export async function getDecisionLog(intersectionId: string, limit: number = 50): Promise<DecisionLogEntry[]> {
  const url = new URL(`${API_V1}/system/decision-log`)
  url.searchParams.set("intersection_id", intersectionId)
  url.searchParams.set("limit", String(limit))
  const response = await fetch(url.toString())
  if (!response.ok) throw new Error("Failed to fetch decision log")
  return response.json()
}

// ===== Intersection Endpoints =====

export async function listIntersections(): Promise<IntersectionSummary[]> {
  const response = await fetch(`${API_V1}/intersections/`)
  if (!response.ok) throw new Error("Failed to list intersections")
  return response.json()
}

export async function getIntersectionStatus(intersectionId: string): Promise<IntersectionStatus> {
  const response = await fetch(`${API_V1}/intersections/${intersectionId}/status`)
  if (!response.ok) throw new Error(`Failed to fetch status for ${intersectionId}`)
  return response.json()
}

export async function getIntersectionSignals(intersectionId: string): Promise<SignalDisplay> {
  const response = await fetch(`${API_V1}/intersections/${intersectionId}/signals`)
  if (!response.ok) throw new Error(`Failed to fetch signals for ${intersectionId}`)
  return response.json()
}

// ===== Per-lane config (matches backend /lanes/{lane_id}/config) =====

export async function getLaneConfig(intersectionId: string, laneId: string): Promise<LaneConfig> {
  const response = await fetch(`${API_V1}/intersections/${intersectionId}/lanes/${laneId}/config`)
  if (!response.ok) throw new Error(`Failed to fetch config for ${intersectionId}/${laneId}`)
  return response.json()
}

export async function updateLaneConfig(
  intersectionId: string,
  laneId: string,
  config: LaneConfigUpdate
): Promise<LaneConfig> {
  const response = await fetch(`${API_V1}/intersections/${intersectionId}/lanes/${laneId}/config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  })
  if (!response.ok) throw new Error(`Failed to update config for ${intersectionId}/${laneId}`)
  return response.json()
}

export async function resetIntersection(intersectionId: string): Promise<{ message: string; status: IntersectionStatus }> {
  const response = await fetch(`${API_V1}/intersections/${intersectionId}/reset`, {
    method: "POST",
  })
  if (!response.ok) throw new Error(`Failed to reset ${intersectionId}`)
  return response.json()
}

// ===== Emergency Stop (force ALL lanes RED) =====

export async function emergencyStop(intersectionId: string): Promise<{ message: string; signals: Record<string, string> }> {
  const response = await fetch(`${API_V1}/intersections/${intersectionId}/emergency-stop`, {
    method: "POST",
  })
  if (!response.ok) throw new Error(`Failed to emergency stop ${intersectionId}`)
  return response.json()
}

// ===== Force Green for a specific lane =====

export async function forceGreen(intersectionId: string, laneId: string): Promise<{ success: boolean; message: string; signals: Record<string, string> }> {
  const response = await fetch(`${API_V1}/intersections/${intersectionId}/lanes/${laneId}/force-green`, {
    method: "POST",
  })
  if (!response.ok) throw new Error(`Failed to force green for ${intersectionId}/${laneId}`)
  return response.json()
}

export async function getProcessingStatus(intersectionId: string): Promise<ProcessingStatus> {
  const response = await fetch(`${API_V1}/intersections/${intersectionId}/processing/status`)
  if (!response.ok) throw new Error(`Failed to fetch processing status for ${intersectionId}`)
  return response.json()
}

export async function startProcessing(intersectionId: string): Promise<ControlResponse> {
  const response = await fetch(`${API_V1}/intersections/${intersectionId}/processing/start`, {
    method: "POST",
  })
  if (!response.ok) throw new Error(`Failed to start processing for ${intersectionId}`)
  return response.json()
}

export async function stopProcessing(intersectionId: string): Promise<ControlResponse> {
  const response = await fetch(`${API_V1}/intersections/${intersectionId}/processing/stop`, {
    method: "POST",
  })
  if (!response.ok) throw new Error(`Failed to stop processing for ${intersectionId}`)
  return response.json()
}

export async function getCameraHealth(intersectionId: string): Promise<CameraHealthResponse> {
  const response = await fetch(`${API_V1}/intersections/${intersectionId}/cameras`)
  if (!response.ok) throw new Error(`Failed to fetch camera health for ${intersectionId}`)
  return response.json()
}

export async function getIntersectionLanes(intersectionId: string): Promise<{ lanes: any[]; lane_to_camera: Record<string, string>; vac_lane_ids: string[] }> {
  const response = await fetch(`${API_V1}/intersections/${intersectionId}/lanes`)
  if (!response.ok) throw new Error(`Failed to fetch lanes for ${intersectionId}`)
  return response.json()
}

// ===== Stream Endpoints =====

export async function listStreams() {
  const response = await fetch(`${API_V1}/streams/`)
  if (!response.ok) throw new Error("Failed to list streams")
  return response.json()
}

export function getVideoStreamUrl(intersectionId: string): string {
  return `${API_BASE_URL.replace("http", "ws")}/api/v1/streams/${intersectionId}/video_feed`
}

export function getStatusStreamUrl(intersectionId: string): string {
  return `${API_BASE_URL.replace("http", "ws")}/api/v1/streams/${intersectionId}/status_feed`
}

// ===== Video Source Endpoints =====



let _cachedCameras: CameraDevice[] | null = null
let _cachedCamerasTs = 0
const CAMERA_CACHE_TTL = Number(process.env.NEXT_PUBLIC_CAMERA_CACHE_TTL_SECONDS) || 60

export async function listCameras(force: boolean = false): Promise<CameraDevice[]> {
  const now = Date.now() / 1000
  if (!force && _cachedCameras && now - _cachedCamerasTs < CAMERA_CACHE_TTL) {
    return _cachedCameras
  }

  const response = await fetch(`${API_V1}/sources/cameras`)
  if (!response.ok) throw new Error("Failed to fetch cameras")
  const data = await response.json()
  // Backend returns { cameras: [ { index, name, ... } ] }
  const cams = data?.cameras || []
  const mapped = cams.map((c: any) => ({
    id: String(c.index ?? c.id ?? c.name),
    name: c.name ?? `Camera ${c.index ?? c.id}`,
    device_path: c.device_path ?? c.device_path ?? undefined,
    type: c.type ?? "camera",
  }))

  _cachedCameras = mapped
  _cachedCamerasTs = Date.now() / 1000
  return mapped
}

export async function listUploadedVideos(): Promise<UploadedVideo[]> {
  const response = await fetch(`${API_V1}/sources/uploads`)
  if (!response.ok) throw new Error("Failed to fetch uploaded videos")
  const data = await response.json()
  // Backend returns { uploads: [ { filename, path, size_bytes, uploaded_at } ] }
  const uploads = data?.uploads || []
  return uploads.map((u: any) => ({
    id: u.path ?? u.filename,
    filename: u.filename,
    file_path: u.path ?? u.file_path,
    size_bytes: u.size_bytes ?? u.size ?? 0,
    duration_seconds: u.duration_seconds,
    uploaded_at: u.uploaded_at,
  }))
}

export async function uploadVideo(file: File): Promise<UploadedVideo> {
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch(`${API_V1}/sources/upload`, {
    method: "POST",
    body: formData,
  })
  if (!response.ok) throw new Error("Failed to upload video")
  const data = await response.json()
  // Normalize response where possible
  return {
    id: data.file_path ?? data.filename,
    filename: data.filename,
    file_path: data.file_path ?? data.filename,
    size_bytes: 0,
    uploaded_at: new Date().toISOString(),
  }
}

export async function assignSourceToCamera(
  intersectionId: string,
  cameraId: string,
  sourceId: string,
  sourceType: "camera" | "file"
): Promise<SourceAssignmentResponse> {
  // Backend expects { source: <path|string|index> }
  // If assigning a hardware camera and sourceId is numeric string, send as number
  let sourceValue: string | number = sourceId
  if (sourceType === "camera") {
    const s = String(sourceId).trim()
    if (/^\d+$/.test(s)) {
      sourceValue = Number(s)
    }
  }
  const body = { source: sourceValue }
  const response = await fetch(`${API_V1}/sources/intersection/${intersectionId}/camera/${cameraId}/source`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    let detail = "Failed to assign source"
    try {
      const err = await response.json()
      detail = err.detail || err.message || JSON.stringify(err)
    } catch (_) {
      detail = response.statusText || detail
    }
    throw new Error(detail)
  }
  const data = await response.json()
  // Map backend response into a flexible shape (include legacy fields)
  const mapped: SourceAssignmentResponse = {
    ...data,
    assigned_to: `${data.intersection_id ?? intersectionId}:${data.camera_id ?? cameraId}`,
    source_id: String(data.new_source ?? data.source ?? ""),
  }
  return mapped
}

// ===== Line counting endpoints =====

export async function getLineCounts(intersectionId: string, start?: number, end?: number): Promise<any> {
  const url = new URL(`${API_V1}/intersections/${intersectionId}/line-counts`)
  if (start != null) url.searchParams.set("start", String(start))
  if (end != null) url.searchParams.set("end", String(end))
  const response = await fetch(url.toString())
  if (!response.ok) throw new Error(`Failed to fetch line counts for ${intersectionId}`)
  return response.json()
}

export async function resetLineCounts(intersectionId: string): Promise<any> {
  const response = await fetch(`${API_V1}/intersections/${intersectionId}/line-counts/reset`, { method: "POST" })
  if (!response.ok) throw new Error(`Failed to reset line counts for ${intersectionId}`)
  return response.json()
}

// ===== Health Metrics (historical time-series) =====

export async function getHealthMetrics(metricName: string, duration: number = 300): Promise<HealthMetricPoint[]> {
  const response = await fetch(`${API_V1}/health/metrics/${metricName}?duration=${duration}`)
  if (!response.ok) throw new Error(`Failed to fetch health metric: ${metricName}`)
  const data = await response.json()
  // Backend may return { metric, duration, data_points: [...] } or an array directly
  return data?.data_points || data || []
}

export async function getHealthComponents(): Promise<Array<{ component: string; status: string; message?: string; alert_count?: number }>> {
  const response = await fetch(`${API_V1}/health/components`)
  if (!response.ok) throw new Error("Failed to fetch health components")
  return response.json()
}
