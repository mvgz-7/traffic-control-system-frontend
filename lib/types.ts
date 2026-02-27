// Type definitions for the traffic management system
// Aligned with 3-lane independent VAC backend (February 2026)

export type TrafficLightState = "GREEN" | "YELLOW" | "ALL_RED" | "RED"

// ===== Per-lane status (matches backend LaneStatus) =====
export interface LaneStatus {
  lane_id: string
  traffic_light_id: string
  state: TrafficLightState
  elapsed: number
  gap?: number | null
  min_green: number
  max_green: number
  max_gap: number
  vehicles_this_green: number
  vehicles_now: number
  direction?: string | null
  decision?: {
    action: string
    reason: string
    elapsed: number
    gap: number
  } | null
  pending_request?: string | null
  denied_reason?: string | null
}

// ===== Per-lane config (matches backend LaneConfig) =====
export interface LaneConfig {
  lane_id: string
  traffic_light_id: string
  max_gap: number
  min_green: number
  max_green: number
  yellow_time: number
  all_red_time: number
}

// ===== Partial config update (matches backend LaneConfigUpdate) =====
export interface LaneConfigUpdate {
  max_gap?: number
  min_green?: number
  max_green?: number
  yellow_time?: number
  all_red_time?: number
}

// ===== Full intersection status (matches backend IntersectionStatus) =====
export interface IntersectionStatus {
  intersection_id: string
  lanes: Record<string, LaneStatus>
  signal_display: Record<string, TrafficLightState>
  safety_status: {
    intersection_id: string
    total_lanes: number
    green_lanes: string[]
    active_conflicts: [string, string][]
    violation_count: number
    all_red_time: number
    lane_states: Record<string, string>
  }
  update_count: number
  last_update: number
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
  lane_count: number
  processing_state: string
}

export interface CameraHealth {
  status: string
  alive: boolean
  fps_actual: number
  fps_expected: number
  frames_read: number
  frames_dropped: number
  time_since_last_frame: number
  lanes: string[]
  quality_warning: boolean
  approach: string
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

// ===== WebSocket video feed message (matches backend WS /video_feed) =====
export interface VideoFrameMessage {
  type: "frame"
  frame: string
  vac_status: IntersectionStatus
  lane_counts: Record<string, number>
  fps: number
  camera_health: CameraHealthResponse
  line_counts?: Record<string, Record<string, number>>  // per-line per-class crossing counts (only when processing is active)
}

// ===== WebSocket waiting status message (sent while waiting for first frame) =====
export interface WaitingStatusMessage {
  type: "status"
  status: "waiting"
  message: string
}

// ===== WebSocket status-only feed (matches backend WS /status_feed) =====
export interface StatusMessage {
  type: "status"
  vac_status: IntersectionStatus
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
}

export interface CameraDevice {
  id: string | number
  name: string
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
  success?: boolean
  message?: string
  intersection_id?: string
  camera_id?: string
  new_source?: string | number
  assigned_to?: string
  source_id?: string
}

// ===== Health metric data point (for historical charts) =====
export interface HealthMetricPoint {
  timestamp: number
  value: number
  status?: string
}

// ===== Health component detail (from /health/components) =====
export interface HealthComponent {
  component: string
  status: string
  message: string
  alert_count: number
}

// ===== YOLO Model Config (from GET /model/config) =====
export interface ModelRuntimeConfig {
  confidence_threshold: number
  iou_threshold: number
  detection_size: number
  max_detections: number
  class_filter: number[]
  tta_enabled: boolean
  tta_scales: number[]
}

export interface ModelStaticConfig {
  model_path: string
  device: string
  half_precision: boolean
  tracking_enabled: boolean
  tracker_type: string
}

export interface ModelConfig {
  runtime_config: ModelRuntimeConfig
  static_config: ModelStaticConfig
}

export interface ModelConfigUpdateRequest {
  confidence_threshold?: number
  iou_threshold?: number
  detection_size?: number
  max_detections?: number
  class_filter?: number[]
  tta_enabled?: boolean
  tta_scales?: number[]
  persist?: boolean
}

export interface ModelConfigUpdateResponse {
  message: string
  updated: Record<string, any>
  persisted: boolean
}

// ===== Vehicle count report (from /reports/vehicle-counts) =====
export interface VehicleCountReportRecord {
  period: string
  line_id: string
  vehicle_class: string
  count: number
}

export interface VehicleCountReport {
  intersection_id: string
  start: number
  end: number
  interval: string
  total_records: number
  data: VehicleCountReportRecord[]
}

// ===== Safety violation record (from backend safety_violations table) =====
export interface SafetyViolation {
  id?: number
  timestamp: number
  intersection_id: string
  violation_type: string
  lanes_involved: string | string[] // backend stores JSON string; frontend may parse to array
  prevented: boolean
  details?: string | null
  created_at?: string | number
}
