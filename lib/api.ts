// API configuration and helper functions for FastAPI backend
import type {
  VACStatus,
  SignalDisplay,
  ProcessingStatus,
  ControlResponse,
  IntersectionSummary,
  IntersectionConfig,
  CameraHealthResponse,
  HealthResponse,
  AppSettings,
  CameraDevice,
  UploadedVideo,
  VideoSourcesResponse,
  SourceAssignmentResponse,
} from "./types"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const API_V1 = `${API_BASE_URL}/api/v1`

// ===== System Endpoints =====

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_V1}/system/health`)
  if (!response.ok) throw new Error("Failed to fetch health")
  return response.json()
}

export async function getSettings(): Promise<AppSettings> {
  const response = await fetch(`${API_V1}/system/settings`)
  if (!response.ok) throw new Error("Failed to fetch settings")
  return response.json()
}

// ===== Intersection Endpoints =====

export async function listIntersections(): Promise<IntersectionSummary[]> {
  const response = await fetch(`${API_V1}/intersections/`)
  if (!response.ok) throw new Error("Failed to list intersections")
  return response.json()
}

export async function getIntersectionStatus(intersectionId: string): Promise<VACStatus> {
  const response = await fetch(`${API_V1}/intersections/${intersectionId}/status`)
  if (!response.ok) throw new Error(`Failed to fetch status for ${intersectionId}`)
  return response.json()
}

export async function getIntersectionSignals(intersectionId: string): Promise<SignalDisplay> {
  const response = await fetch(`${API_V1}/intersections/${intersectionId}/signals`)
  if (!response.ok) throw new Error(`Failed to fetch signals for ${intersectionId}`)
  return response.json()
}

export async function getIntersectionConfig(intersectionId: string): Promise<IntersectionConfig> {
  const response = await fetch(`${API_V1}/intersections/${intersectionId}/config`)
  if (!response.ok) throw new Error(`Failed to fetch config for ${intersectionId}`)
  return response.json()
}

export async function updateIntersectionConfig(
  intersectionId: string,
  config: Partial<IntersectionConfig>
): Promise<IntersectionConfig> {
  const response = await fetch(`${API_V1}/intersections/${intersectionId}/config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  })
  if (!response.ok) throw new Error(`Failed to update config for ${intersectionId}`)
  return response.json()
}

export async function resetIntersection(intersectionId: string): Promise<{ message: string; status: VACStatus }> {
  const response = await fetch(`${API_V1}/intersections/${intersectionId}/reset`, {
    method: "POST",
  })
  if (!response.ok) throw new Error(`Failed to reset ${intersectionId}`)
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

export async function getIntersectionLanes(intersectionId: string): Promise<{ lanes: string[]; lane_to_camera: Record<string, string> }> {
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

export async function listCameras(): Promise<CameraDevice[]> {
  const response = await fetch(`${API_V1}/sources/cameras`)
  if (!response.ok) throw new Error("Failed to fetch cameras")
  const data = await response.json()
  // Backend returns { cameras: [ { index, name, ... } ] }
  const cams = data?.cameras || []
  return cams.map((c: any) => ({
    id: String(c.index ?? c.id ?? c.name),
    name: c.name ?? `Camera ${c.index ?? c.id}`,
    device_path: c.device_path ?? c.device_path ?? undefined,
    type: c.type ?? "camera",
  }))
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
  return response.json()
}
