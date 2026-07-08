// dashboard - shows ur connected cameras as monitors
// click a camera to watch it, click the name to rename it (wow so useful)
// names are saved in localStorage so they stick around (hopefully lol)
// TODO: make this not look like garbage on mobile

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

function Dashboard() {
  const n = useNavigate()
  const [cams, setCams] = useState<MediaDeviceInfo[]>([])
  const [perm, setPerm] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')
  const ir = useRef<HTMLInputElement>(null)

  function getCamName(d: MediaDeviceInfo) {
    const saved = localStorage.getItem('cam_name_' + d.deviceId)
    return saved || d.label || 'Unnamed Camera'
  }

  function saveName(did: string) {
    if (editVal.trim()) localStorage.setItem('cam_name_' + did, editVal.trim())
    setEditing(null)
  }

  async function refreshCams() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      s.getTracks().forEach(t => t.stop())
      setPerm(true)
      const d = await navigator.mediaDevices.enumerateDevices()
      setCams(d.filter((x: MediaDeviceInfo) => x.kind === 'videoinput'))
    } catch (_) {
      setPerm(false)
    }
  }

  useEffect(() => { refreshCams() }, [])

  useEffect(() => {
    if (editing && ir.current) ir.current.focus()
  }, [editing])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 className="page-title" style={{ margin: 0 }}>Monitors</h2>
        <button className="btn btn-outline" onClick={refreshCams} style={{ fontSize: 13 }}>
          🔄 Refresh
        </button>
      </div>

      {!perm ? (
        <div className="empty-state">
          <p>No camera access</p>
          <div className="sub">Connect a USB camera and allow camera permissions (pls)</div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={refreshCams}>
            Try Again
          </button>
        </div>
      ) : cams.length === 0 ? (
        <div className="empty-state">
          <p>No cameras detected</p>
          <div className="sub">Connect a camera and click Refresh (i dare u)</div>
        </div>
      ) : (
        <div className="card-grid">
          {cams.map(c => {
            const name = getCamName(c)
            const isEditing = editing === c.deviceId
            return (
              <div key={c.deviceId} className="card">
                <div className="card-header">
                  <div style={{ flex: 1 }}>
                    {isEditing ? (
                      <input ref={ir}
                        style={{
                          width: '100%', fontSize: 16, fontWeight: 600,
                          background: 'transparent', border: 'none',
                          borderBottom: '2px solid var(--primary)',
                          color: 'var(--text)', outline: 'none', padding: '2px 0',
                        }}
                        value={editVal}
                        onChange={e => setEditVal(e.target.value)}
                        onBlur={() => saveName(c.deviceId)}
                        onKeyDown={e => { if (e.key === 'Enter') saveName(c.deviceId) }}
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <h3 style={{ cursor: 'pointer', margin: 0 }}
                        onClick={() => { setEditing(c.deviceId); setEditVal(name) }}>
                        📹 {name}
                      </h3>
                    )}
                    <p className="text-xs text-dim" style={{ margin: '4px 0 0' }}>
                      {c.label || 'Camera'}
                    </p>
                  </div>
                </div>

                <div className="card-body">
                  <span className="status-dot normal" />
                  <span className="text-xs text-dim">Ready (i think)</span>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }}
                    onClick={() => n(`/live?camId=${encodeURIComponent(c.deviceId)}`)}>
                    ▶ Watch
                  </button>
                  <button className="btn btn-outline btn-sm"
                    onClick={() => { setEditing(c.deviceId); setEditVal(name) }}>
                    ✏️ Rename
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Dashboard
