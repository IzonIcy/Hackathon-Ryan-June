// incident report - shows all the bad stuff that happened
// click a report to see the juicy details
// TODO: this file is kinda long, should probably split it up lol

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReportView from '../components/ReportView'
import { listReports as getReports, getJobReport as getReport } from '../api/client'
import type { JobReport } from '../types'

function IncidentReport() {
  const { jobId } = useParams()
  const n = useNavigate()
  const [reports, setReports] = useState<JobReport[]>([])
  const [one, setOne] = useState<JobReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [grid, setGrid] = useState(true)

  useEffect(() => {
    if (jobId) {
      loadOne()
    } else {
      loadAll()
    }
  }, [jobId])

  async function loadAll() {
    try {
      const d = await getReports()
      setReports(d)
      setError('')
    } catch (err: any) {
      setError('Failed to load: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadOne() {
    try {
      const d = await getReport(Number(jobId))
      setOne(d)
      setError('')
    } catch (err: any) {
      setError('Failed to load: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="loading">Loading... (pls wait)</div>
  if (error) return <div className="error">{error}</div>

  // single report view (detailed af)
  if (one) {
    return (
      <div>
        <div style={{ marginBottom: 16 }}>
          <button className="btn btn-outline btn-sm" onClick={() => n('/reports')}>
            ← Back to Reports
          </button>
        </div>
        <div className="card" style={{ padding: 24 }}>
          <ReportView report={one} />
        </div>
      </div>
    )
  }

  // list view (all the reports in one place)
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 className="page-title" style={{ margin: 0 }}>Incident Reports</h2>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className={`btn btn-sm ${grid ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setGrid(true)}>Grid View</button>
          <button className={`btn btn-sm ${!grid ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setGrid(false)}>List View</button>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="empty-state">
          <p>No reports yet</p>
          <div className="sub">Complete a monitoring session to generate a report (get to work lol)</div>
        </div>
      ) : grid ? (
        <div className="card-grid">
          {reports.map((r) => {
            const sev = r.severity === 'high' ? 'var(--red)' : r.severity === 'medium' ? 'var(--yellow)' : 'var(--green)'
            return (
              <div key={r.job_id} className="card report-card"
                onClick={() => n(`/reports/${r.job_id}`)}>
                <div className="report-card-header">
                  <div>
                    <div className="font-semibold">{r.job_name}</div>
                    <div className="text-xs text-dim">{r.machine_name} · {r.machine_type.replace('_', ' ')}</div>
                  </div>
                  <div className="badge" style={{ background: `${sev}22`, color: sev, border: `1px solid ${sev}` }}>
                    {r.severity}
                  </div>
                </div>
                <div className="report-card-stats">
                  <span>📷 {r.total_frames}</span>
                  <span>⚠️ {r.warning_frames}</span>
                  <span>🛑 {r.stop_frames}</span>
                  <span>⏱ {r.duration}</span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card table-container">
          <table className="queue-table">
            <thead>
              <tr>
                <th>Job Name</th>
                <th>Machine</th>
                <th>Type</th>
                <th>Duration</th>
                <th>Scans</th>
                <th>Incidents</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <tr key={r.job_id} className="clickable-row" onClick={() => n(`/reports/${r.job_id}`)}>
                  <td className="font-semibold">{r.job_name}</td>
                  <td>{r.machine_name}</td>
                  <td className="text-dim">{r.machine_type.replace('_', ' ')}</td>
                  <td className="text-xs">{r.duration}</td>
                  <td>{r.total_frames} <span className="text-xs text-dim">({r.warning_frames}w/{r.stop_frames}s)</span></td>
                  <td>{r.incidents.length}</td>
                  <td>
                    <span className={`severity-badge ${r.severity}`}>{r.severity}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default IncidentReport
