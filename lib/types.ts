export interface SystemStatus {
  cameraActive: boolean
  detectionActive: boolean
  fps: number
  uptime: number
  lastUpdate: Date | null
}

export interface PerformanceMetrics {
  avgDetectionTime: number
  accuracy: number
  vehiclesPerMinute: number
  peakHour: string
  totalVehiclesToday: number
}

export interface VehicleClassification {
  car: number
  motorcycle: number
  bus: number
  truck: number
}
