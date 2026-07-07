// main app with nav and a live status beacon in the header
// i rewrote this to use css classes instead of inline styles
// so it doesnt look like trash anymore

import { useState, useEffect } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import LiveView from './pages/LiveView'
import Queue from './pages/Queue'
import IncidentReport from './pages/IncidentReport'

function App() {
  const [ac, setAc] = useState(0) // active count
  const [ws, setWs] = useState('idle') // worst status

  // poll machines every 5s for the header beacon
  useEffect(() => {
    function check() {
      fetch('/api/machines')
        .then(r => r.json())
        .then(machines => {
          const active = machines.filter((m: any) => m.status === 'running').length
          setAc(active)
          if (machines.some((m: any) => m.status === 'stopped')) setWs('stop')
          else if (machines.some((m: any) => m.status === 'running')) setWs('running')
          else setWs('idle')
        })
        .catch(() => setWs('offline')) // backend not reachable
    }
    check()
    const interval = setInterval(check, 5000)
    // also refresh immediately when a session starts/stops
    const handler = () => setTimeout(check, 100)
    window.addEventListener('session-changed', handler)
    return () => {
      clearInterval(interval)
      window.removeEventListener('session-changed', handler)
    }
  }, [])

  const bc = ws === 'stop' ? '#ef4444'
    : ws === 'running' ? '#22c55e'
    : ws === 'offline' ? '#f59e0b'
    : '#64748b'

  return (
    <div className="app-layout">
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1>FabOps <span>Sentinel</span></h1>
          {/* status beacon with pulse animation */}
          <div className="header-beacon">
            <span className={`beacon-dot ${ac > 0 ? 'active' : ''}`} style={{ background: bc }} />
            <span className="beacon-label">
              {ws === 'offline' ? 'disconnected' : ac > 0 ? `${ac} active` : 'all idle'}
            </span>
          </div>
        </div>
        <nav className="nav">
          <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''} end>
            Dashboard
          </NavLink>
          <NavLink to="/live" className={({ isActive }) => isActive ? 'active' : ''}>
            Live View
          </NavLink>
          <NavLink to="/queue" className={({ isActive }) => isActive ? 'active' : ''}>
            Machine Status
          </NavLink>
          <NavLink to="/reports" className={({ isActive }) => isActive ? 'active' : ''}>
            Reports
          </NavLink>
        </nav>
      </header>

      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/live" element={<LiveView />} />
          <Route path="/queue" element={<Queue />} />
          <Route path="/reports" element={<IncidentReport />} />
          <Route path="/reports/:jobId" element={<IncidentReport />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
