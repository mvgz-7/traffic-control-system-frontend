// Type definitions for the traffic management system

export type TrafficLightState = "GREEN" | "YELLOW" | "ALL_RED"

export interface VACStatus {
  phase: string
  phase_name: string
  state: TrafficLightState
  elapsed?: number
  gap?: number
  min_green: number
  max_green: number
  max_gap: number
  active_lanes: string[]
  decision?: {
    action: string
    reason: string
  }
}

export interface SignalDisplay {
  signals: Record<string, TrafficLightState>
}

export interface ProcessingStatus {
  state: string
  uptime_seconds?: number
  active_cameras: string[]
  error?: string
}

export interface ControlResponse {
  success: boolean
  state: string
  message: string
}

export interface IntersectionSummary {
  id: string
  name: string
  status: string
  phase_count: number
  processing_state: string
}

export interface IntersectionConfig {
  max_gap: number
  min_green: number
  max_green: number
  yellow_time: number
  all_red_time: number
}

export interface CameraHealth {
  status: "healthy" | "unhealthy"
  fps?: number
  last_frame?: number
  resolution?: [number, number]
}

export interface CameraHealthResponse {
  [key: string]: CameraHealth
}

export interface Detection {
  class_id: number
  class_name: string
  confidence: number
  bbox: [number, number, number, number]
  lane_id?: string
}

export interface VideoFrameMessage {
  type: "frame"
  frame: string
  vac_status: VACStatus
  lane_counts: Record<string, number>
  fps: number
  camera_health: CameraHealthResponse
  // Optional per-line, per-class counts: { line_id: { class_name: count } }
  line_counts?: Record<string, Record<string, number>>
}

export interface StatusMessage {
  type: "status"
  vac_status: VACStatus
  camera_health: CameraHealthResponse
  signal_display: Record<string, TrafficLightState>
}

export interface HealthResponse {
  status: string
  uptime: number
  timestamp: number
  components: Record<string, string>
  metrics: Record<string, number>
}

export type HealthAlertSeverity = string

export interface HealthAlert {
  metric: string
  value: number
  unit: string
  severity: HealthAlertSeverity
  message: string
  timestamp: number
}

export interface DecisionLogEntry {
  timestamp: number
  phase: string
  action: string
  reason: string
  elapsed?: number | null
  gap?: number | null
}

export interface AppSettings {
  debug: boolean
  log_level: string
  model_path: string
  confidence_threshold: number
  video_source: string
}

export interface CameraDevice {
  id: string
  name: string
  device_path?: string
  type: "camera" | "rtsp" | "file"
}

export interface UploadedVideo {
  id: string
  filename: string
  file_path: string
  size_bytes: number
  duration_seconds?: number
  uploaded_at: string
}

export interface VideoSourcesResponse {
  cameras: CameraDevice[]
  uploads: UploadedVideo[]
}

export interface SourceAssignmentResponse {
  // Backend returns success, intersection_id, camera_id, new_source, message
  // Keep a flexible shape for compatibility with both frontend and backend.
  success?: boolean
  message?: string
  intersection_id?: string
  camera_id?: string
  new_source?: string | number
  // Convenience/legacy fields
  assigned_to?: string
  source_id?: string
}
