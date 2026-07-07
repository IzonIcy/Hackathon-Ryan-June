// types for the data we get from the backend

export interface Machine {
  id: number
  name: string
  machine_type: string
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
  id: number
  job_id: number
  title: string
  description: string | null
  root_cause: string | null
  severity: string | null
  resolved: number
  created_at: string
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
  incidents: {
    title: string
    description: string
    root_cause: string
    recommended_action: string
  }[]
  observations: {
    time: string
    status: string
    observation: string
    probable_cause: string
    recommended_action: string
    severity: string
  }[]
}
