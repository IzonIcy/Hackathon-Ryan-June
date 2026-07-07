import type { Machine, Job, Frame, JobReport } from '@/types'

const BASE = 'http://localhost:8000/api'

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { signal })
  if (!res.ok) throw new ApiError(res.status, await res.text())
  return res.json()
}

async function post<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  })
  if (!res.ok) throw new ApiError(res.status, await res.text())
  return res.json()
}

async function patch<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    signal,
  })
  if (!res.ok) throw new ApiError(res.status, await res.text())
  return res.json()
}

/* ─── Machines ─────────────────────────────────────────────────── */
export function getMachines(signal?: AbortSignal) {
  return get<Machine[]>('/machines', signal)
}

export function getMachine(id: number, signal?: AbortSignal) {
  return get<Machine>(`/machines/${id}`, signal)
}

export function createMachine(data: { name: string; machine_type?: string; device_id?: string | null }, signal?: AbortSignal) {
  return post<Machine>('/machines', data, signal)
}

export function deleteMachine(id: number, signal?: AbortSignal) {
  return fetch(`${BASE}/machines/${id}`, { method: 'DELETE', signal }).then(r => {
    if (!r.ok) throw new ApiError(r.status, 'failed to delete')
    return r.json()
  })
}

export function updateMachineStatus(id: number, status: string, signal?: AbortSignal) {
  return patch<Machine>(`/machines/${id}/status?status=${encodeURIComponent(status)}`, signal)
}

/* ─── Jobs ─────────────────────────────────────────────────────── */
export function getJobs(status?: string, signal?: AbortSignal) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : ''
  return get<Job[]>(`/jobs${qs}`, signal)
}

export function getJob(id: number, signal?: AbortSignal) {
  return get<Job>(`/jobs/${id}`, signal)
}

export function createJob(data: { machine_id: number; job_name: string; material?: string; estimated_duration?: number }, signal?: AbortSignal) {
  return post<Job>('/jobs', data, signal)
}

export function updateJobStatus(id: number, status: string, signal?: AbortSignal) {
  return patch<Job>(`/jobs/${id}/status?status=${encodeURIComponent(status)}`, signal)
}

/* ─── Frames ───────────────────────────────────────────────────── */
export function getFrames(jobId: number, limit = 20, signal?: AbortSignal) {
  return get<Frame[]>(`/frames/${jobId}?limit=${limit}`, signal)
}

export function analyzeFrame(data: { job_id: number; image: string }, signal?: AbortSignal) {
  return post<Frame>('/frames/analyze', data, signal)
}

/* ─── Reports ──────────────────────────────────────────────────── */
export function getReports(signal?: AbortSignal) {
  return get<JobReport[]>('/reports', signal)
}

export function getReport(jobId: number, signal?: AbortSignal) {
  return get<JobReport>(`/reports/${jobId}`, signal)
}

/* ─── Sessions ─────────────────────────────────────────────────── */
export function startSession(machineId: number, signal?: AbortSignal) {
  return post<{ job_id: number; machine_name: string }>(`/sessions/start?machine_id=${machineId}`, undefined, signal)
}

export function stopSession(jobId: number, signal?: AbortSignal) {
  return post<{ status: string; job_id: number }>(`/sessions/${jobId}/stop`, undefined, signal)
}

/* ─── Seed ──────────────────────────────────────────────────────── */
export function seedDemoData(jobId: number, signal?: AbortSignal) {
  return post<{ ok: boolean; frames: number; incidents: number }>(`/seed/demo/${jobId}`, undefined, signal)
}

export function clearAllData(signal?: AbortSignal) {
  return post<{ ok: boolean; message: string }>('/seed/clear', undefined, signal)
}

/* ─── Health ────────────────────────────────────────────────────── */
export function checkHealth(signal?: AbortSignal) {
  return get<{ status: string; service: string }>('/health', signal)
}
