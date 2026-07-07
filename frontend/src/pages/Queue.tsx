// machine status - shows all jobs and machines, lets you manage them
// uses css classes now, less ugly inline garbage

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import StatusBadge from '../components/StatusBadge'
import { getJobs, updateJobStatus, getMachines } from '../api/client'
import type { Job, Machine } from '../types'

function Queue() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [machines, setMachines] = useState<Record<number, Machine>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const n = useNavigate()

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [])

  async function loadData() {
    try {
      const [jobsData, machinesData] = await Promise.all([getJobs(), getMachines()])
      setJobs(jobsData)
      setError('')
      const mm: Record<number, Machine> = {}
      machinesData.forEach((m: Machine) => { mm[m.id] = m })
      setMachines(mm)
    } catch (err: any) {
      if (loading) setError('Failed to load: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function endJob(jobId: number, status: 'completed' | 'failed') {
    try { await updateJobStatus(jobId, status); loadData() }
    catch (err: any) { setError('Failed to update job: ' + err.message) }
  }

  const filtered = filter ? jobs.filter(j => j.status === filter) : jobs

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 className="page-title" style={{ margin: 0 }}>Machine Status</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="text-xs text-dim">auto-refreshing</span>
          {['', 'running', 'completed', 'failed'].map(f => (
            <button key={f}
              className={`btn ${filter === f ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFilter(f)}
            >
              {f || 'All'}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="loading">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <p>No jobs found</p>
          <div className="sub">Start a job from the Dashboard to see it here</div>
        </div>
      ) : (
        <div className="card table-container">
          <table className="queue-table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Machine</th>
                <th>Material</th>
                <th>Status</th>
                <th>Started</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(job => {
                const m = machines[job.machine_id]
                return (
                  <tr key={job.id}>
                    <td className="font-semibold">{job.job_name}</td>
                    <td>{m?.name || 'Unknown'}</td>
                    <td className="text-dim">{job.material || '-'}</td>
                    <td><StatusBadge status={job.status} /></td>
                    <td className="text-xs text-dim">
                      {new Date(job.created_at).toLocaleString()}
                    </td>
                    <td>
                      <div className="queue-actions">
                        {job.status === 'running' && (
                          <>
                            <button className="btn btn-primary btn-sm"
                              onClick={() => n(`/live?jobId=${job.id}&machineId=${job.machine_id}`)}>
                              Watch
                            </button>
                            <button className="btn btn-outline btn-sm"
                              onClick={() => endJob(job.id, 'completed')}>
                              Done
                            </button>
                            <button className="btn btn-danger btn-sm"
                              onClick={() => endJob(job.id, 'failed')}>
                              Fail
                            </button>
                          </>
                        )}
                        {job.status === 'completed' && (
                          <button className="btn btn-outline btn-sm"
                            onClick={() => n(`/reports/${job.id}`)}>
                            Report
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default Queue
