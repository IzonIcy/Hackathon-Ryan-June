// this is where we talk to the backend lol
// lowkey hope it doesnt crash 🤞
import type { Machine, Job, Frame, JobReport } from '@/types'

const BASE = 'http://localhost:8000/api'

// Set NEXT_PUBLIC_FABOPS_API_TOKEN when the backend runs with
// FABOPS_API_TOKEN; without it every request would get a 401.
const API_TOKEN = process.env.NEXT_PUBLIC_FABOPS_API_TOKEN as string | undefined

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extra }
  if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`
  return headers
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

// generic fetch wrapper lowkey
async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: authHeaders(), signal })
  if (!res.ok) throw new ApiError(res.status, await res.text())
  return res.json()
}

// sends data to the backend bestie
async function post<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: authHeaders(body ? { 'Content-Type': 'application/json' } : undefined),
    body: body ? JSON.stringify(body) : undefined,
    signal,
  })
  if (!res.ok) throw new ApiError(res.status, await res.text())
  return res.json()
}

// updates stuff (like git push but for the backend)
async function patch<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: authHeaders(),
    signal,
  })
  if (!res.ok) throw new ApiError(res.status, await res.text())
  return res.json()
}

/* ─── Machines ─────────────────────────────────────────────────── */
// gets the machines from the backend fr fr
export function getMachines(signal?: AbortSignal) {
  return get<Machine[]>('/machines', signal)
}

// gets ONE machine by its id (crazy right)
export function getMachine(id: number, signal?: AbortSignal) {
  return get<Machine>(`/machines/${id}`, signal)
}

// creates a new machine (yeet)
export function createMachine(data: { name: string; machine_type?: string; device_id?: string | null }, signal?: AbortSignal) {
  return post<Machine>('/machines', data, signal)
}

// deletes a machine (bye bye)
export function deleteMachine(id: number, signal?: AbortSignal) {
  return fetch(`${BASE}/machines/${id}`, { method: 'DELETE', headers: authHeaders(), signal }).then(r => {
    if (!r.ok) throw new ApiError(r.status, 'failed to delete (skill issue)')
    return r.json()
  })
}

// updates the status (running/stopped/etc)
export function updateMachineStatus(id: number, status: string, signal?: AbortSignal) {
  return patch<Machine>(`/machines/${id}/status?status=${encodeURIComponent(status)}`, signal)
}

/* ─── Jobs ─────────────────────────────────────────────────────── */
// fetches all jobs (or filtered by status)
export function getJobs(status?: string, signal?: AbortSignal) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : ''
  return get<Job[]>(`/jobs${qs}`, signal)
}

// gets one job (just one!)
export function getJob(id: number, signal?: AbortSignal) {
  return get<Job>(`/jobs/${id}`, signal)
}

// creates a new monitoring session lol
export function createJob(data: { machine_id: number; job_name: string; material?: string; estimated_duration?: number }, signal?: AbortSignal) {
  return post<Job>('/jobs', data, signal)
}

// changes the job status (completed/failed/etc)
export function updateJobStatus(id: number, status: string, signal?: AbortSignal) {
  return patch<Job>(`/jobs/${id}/status?status=${encodeURIComponent(status)}`, signal)
}

/* ─── Frames ───────────────────────────────────────────────────── */
// gets frames for a job (pics from the camera lol)
export function getFrames(jobId: number, limit = 20, signal?: AbortSignal) {
  return get<Frame[]>(`/frames/${jobId}?limit=${limit}`, signal)
}

// sends a frame to the AI for analysis (spooky)
export function analyzeFrame(data: { job_id: number; image: string }, signal?: AbortSignal) {
  return post<Frame>('/frames/analyze', data, signal)
}

/* ─── Reports ──────────────────────────────────────────────────── */
// gets ALL reports (the ai's opinion on everything)
export function getReports(signal?: AbortSignal) {
  return get<JobReport[]>('/reports', signal)
}

// gets ONE specific report by job id
export function getReport(jobId: number, signal?: AbortSignal) {
  return get<JobReport>(`/reports/${jobId}`, signal)
}

/* ─── Sessions ─────────────────────────────────────────────────── */
// starts watching (lets gooooo)
export function startSession(machineId: number, signal?: AbortSignal) {
  return post<{ job_id: number; machine_name: string }>(`/sessions/start?machine_id=${machineId}`, undefined, signal)
}

// stops watching (thats enough)
export function stopSession(jobId: number, signal?: AbortSignal) {
  return post<{ status: string; job_id: number }>(`/sessions/${jobId}/stop`, undefined, signal)
}

/* ─── Seed ──────────────────────────────────────────────────────── */
// creates fake data for testing (we love fake data)
export function seedDemoData(jobId: number, signal?: AbortSignal) {
  return post<{ ok: boolean; frames: number; incidents: number }>(`/seed/demo/${jobId}`, undefined, signal)
}

// deletes EVERYTHING (no take backs)
export function clearAllData(signal?: AbortSignal) {
  return post<{ ok: boolean; message: string }>('/seed/clear', undefined, signal)
}

/* ─── Health ────────────────────────────────────────────────────── */
// checks if the backend is alive (is it tho?)
export function checkHealth(signal?: AbortSignal) {
  return get<{ status: string; service: string }>('/health', signal)
}
