// this talks to the backend so the frontend can do stuff
// we only use whats needed now (dont @ me)

const BASE = '/api'

// Set VITE_FABOPS_API_TOKEN at build time when the backend runs with
// FABOPS_API_TOKEN; without it every request would get a 401.
const API_TOKEN = import.meta.env.VITE_FABOPS_API_TOKEN as string | undefined

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extra }
  if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`
  return headers
}

async function get(url: string) {
  const res = await fetch(`${BASE}${url}`, { headers: authHeaders() })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function post(url: string, data: any) {
  const res = await fetch(`${BASE}${url}`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// gets all machines from the backend (hopefully they exist lol)
export function getMachines() {
  return get('/machines')
}

// gets jobs, optionally filtered by status (wow so fancy)
export function getJobs(status?: string) {
  const q = status ? `?status=${status}` : ''
  return get(`/jobs${q}`)
}

// makes a new job (pray it works fr fr)
export function createJob(data: any) {
  return post('/jobs', data)
}

// updates the status of a job (cuz things change idk)
export function updateJobStatus(id: number, status: string) {
  return fetch(`${BASE}/jobs/${id}/status?status=${encodeURIComponent(status)}`, {
    method: 'PATCH',
    headers: authHeaders(),
  }).then(r => r.json())
}

// gets the report for a specific job (the juicy stuff)
export function getJobReport(jobId: number) {
  return get(`/reports/${jobId}`)
}

// gets ALL the reports (might be slow ngl)
export function listReports() {
  return get('/reports')
}
