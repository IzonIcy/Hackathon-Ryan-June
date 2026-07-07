/* ─── API Response Types ───────────────────────────────────────── */

export interface Machine {
  id: number
  name: string
  machine_type: string
  device_id: string | null
  status: string
  created_at: string
}

export interface Job {
  id: number
  machine_id: number
  job_name: string
  material: string | null
  estimated_duration: number | null
  status: string
  created_at: string
  completed_at: string | null
}

export interface Frame {
  id: number
  job_id: number
  status: string
  confidence: number | null
  observation: string | null
  probable_cause: string | null
  recommended_action: string | null
  severity: string | null
  created_at: string
}

export interface Incident {
  title: string
  description: string
  root_cause: string | null
  recommended_action: string | null
  severity: string
}

export interface Observation {
  time: string
  status: string
  observation: string | null
  probable_cause: string | null
  recommended_action: string | null
  severity: string | null
}

export interface JobReport {
  job_id: number
  job_name: string
  machine_name: string
  machine_type: string
  material: string | null
  job_status: string
  worst_status: string
  severity: string
  duration: string
  total_frames: number
  normal_frames: number
  warning_frames: number
  stop_frames: number
  observations: Observation[]
  incidents: Incident[]
}

/* ─── UI Types ─────────────────────────────────────────────────── */

export type SeverityLevel = "high" | "medium" | "low"
export type MachineStatus = "running" | "warning" | "error" | "stopped" | "idle" | "unknown"
export type FrameStatus = "normal" | "warning" | "stop" | "unknown"

export interface StatCardData {
  title: string
  value: string | number
  change: string | null
  trend: "up" | "down" | null
  icon: React.ComponentType<{ className?: string }>
  color: string
}

export interface MachineWithMeta extends Machine {
  icon: React.ComponentType<{ className?: string }>
  statusLabel: string
  dotColor: string
}

export interface ActivityItem {
  id: string
  time: string
  title: string
  severity: SeverityLevel
  status: string
  machine?: string
}
