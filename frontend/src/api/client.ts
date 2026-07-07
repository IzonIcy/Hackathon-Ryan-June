// talks to the backend
// we only use whats needed now

const BASE = '/api'

async function get(url: string) {
  const res = await fetch(`${BASE}${url}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function post(url: string, data: any) {
  const res = await fetch(`${BASE}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export function getMachines() {
  return get('/machines')
}

export function getJobs(status?: string) {
  const q = status ? `?status=${status}` : ''
  return get(`/jobs${q}`)
}

export function createJob(data: any) {
  return post('/jobs', data)
}

export function updateJobStatus(id: number, status: string) {
  return fetch(`${BASE}/jobs/${id}/status?status=${status}`, { method: 'PATCH' }).then(r => r.json())
}

export function getJobReport(jobId: number) {
  return get(`/reports/${jobId}`)
}

export function listReports() {
  return get('/reports')
}
