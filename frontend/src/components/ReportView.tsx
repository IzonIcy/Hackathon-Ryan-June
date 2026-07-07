// displays a full incident report for a completed job
// now it uses css classes instead of 50 million inline styles lol

import type { JobReport } from '../types'

function ReportView({ report }: { report: JobReport }) {
  const sc: Record<string, string> = {
    low: 'var(--green)',
    medium: 'var(--yellow)',
    high: 'var(--red)',
  }

  return (
    <div>
      {/* Header */}
      <div className="report-header">
        <h2>{report.job_name}</h2>
        <p>{report.machine_name} · {report.machine_type.replace('_', ' ')} · {report.material || 'No material'}</p>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-box">
          <div className="number">{report.total_frames}</div>
          <div className="label">Total Scans</div>
        </div>
        <div className="stat-box">
          <div className="number" style={{ color: 'var(--green)' }}>{report.normal_frames}</div>
          <div className="label">Normal</div>
        </div>
        <div className="stat-box">
          <div className="number" style={{ color: 'var(--yellow)' }}>{report.warning_frames}</div>
          <div className="label">Warnings</div>
        </div>
        <div className="stat-box">
          <div className="number" style={{ color: 'var(--red)' }}>{report.stop_frames}</div>
          <div className="label">Stops</div>
        </div>
        <div className="stat-box">
          <div className="number" style={{ color: sc[report.severity] || 'var(--text-dim)' }}>
            {report.severity.toUpperCase()}
          </div>
          <div className="label">Severity</div>
        </div>
        <div className="stat-box">
          <div className="number" style={{ color: 'var(--purple, #a78bfa)' }}>{report.duration}</div>
          <div className="label">Duration</div>
        </div>
      </div>

      {/* Incidents */}
      {report.incidents.length > 0 && (
        <div className="report-section">
          <h3>Incidents</h3>
          {report.incidents.map((inc, i) => (
            <div key={i} className="incident-card">
              <div className="incident-title">🚨 {inc.title}</div>
              <p className="incident-desc">{inc.description}</p>
              {inc.root_cause && (
                <p className="incident-cause"><strong>Root cause:</strong> {inc.root_cause}</p>
              )}
              {inc.recommended_action && (
                <p className="incident-action">💡 {inc.recommended_action}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Observations */}
      {report.observations.length > 0 && (
        <div className="report-section">
          <h3>AI Observations</h3>
          {report.observations.map((obs, i) => (
            <div key={i} className="obs-row">
              <span className="obs-time">{new Date(obs.time).toLocaleTimeString()}</span>
              <span className={`status-dot ${obs.status}`} />
              <span style={{ flex: 1 }}>{obs.observation}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ReportView
