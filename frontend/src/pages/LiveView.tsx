// live view - camera + AI with alarm, desktop notifs, and live obs feed
// less inline styles now cuz we got css variables and classes
// still a bit scrappy cuz thats how we roll (no cap)
// yo this takes pictures from ur webcam every 3 secs lol

import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

function LiveView() {
  const [p] = useSearchParams()
  const n = useNavigate()
  const mid = p.get('machineId') || '1'
  const camId = p.get('camId') || ''
  const vr = useRef<HTMLVideoElement>(null)
  const cr = useRef<HTMLCanvasElement>(null)
  const sr = useRef<MediaStream | null>(null)
  const ir = useRef<number | null>(null)

  const [cam, setCam] = useState(false)
  const [watch, setWatch] = useState(false)
  const [jid, setJid] = useState<number | null>(null)
  const [nm, setNm] = useState('')
  const [st, setSt] = useState('off')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  // multi cam stuff (bcuz one isnt enough apparently)
  const [cams, setCams] = useState<MediaDeviceInfo[]>([])
  const [selCam, setSelCam] = useState<string>('')

  // live observation feed (gets spammed pretty fast ngl)
  const [obs, setObs] = useState<{status: string, msg: string, conf: number, time: Date}[]>([])

  // play a loud beep when things go wrong (scares everyone in the room)
  const beep = useCallback(() => {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      osc.type = 'square'
      gain.gain.value = 0.3
      osc.start()
      setTimeout(() => gain.gain.value = 0, 300)
      setTimeout(() => {
        gain.gain.value = 0.3
        setTimeout(() => { osc.stop(); ctx.close() }, 300)
      }, 400)
    } catch (_) {}
  }, [])

  // pop a desktop notification (annoying but useful)
  const popNotif = useCallback((m: string) => {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🚨 FabOps Sentinel', { body: m })
      }
    } catch (_) {}
  }, [])

  // get monitor name from localStorage or backend
  useEffect(() => {
    if (camId) {
      const saved = localStorage.getItem('cam_name_' + camId)
      if (saved) { setNm(saved); return }
    }
    fetch(`/api/machines/${mid}`).then(r => r.json()).then(m => setNm(m.name || 'Monitor')).catch(() => setNm('Monitor'))
  }, [mid, camId])

  // request notif permission + enumerate cams + start cam
  // TODO: this useEffect is a mess lol
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    async function boot() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const vids = devices.filter((d: MediaDeviceInfo) => d.kind === 'videoinput')
        setCams(vids)
        // if camId from URL matches a camera, use it; else first cam; else empty
        const match = camId ? vids.find((d: MediaDeviceInfo) => d.deviceId === camId) : null
        const did = match?.deviceId || (camId || selCam || vids[0]?.deviceId || '')
        setSelCam(did)
        const s = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, deviceId: did ? { exact: did } : undefined },
          audio: false,
        })
        if (vr.current) { vr.current.srcObject = s; sr.current = s; setCam(true); setErr('') }
      } catch (e: any) { setErr('camera: ' + e.message) }
    }
    boot()
    return () => {
      if (ir.current) clearInterval(ir.current)
      sr.current?.getTracks().forEach(t => t.stop())
      if (vr.current) vr.current.srcObject = null
      sr.current = null
    }
    // eslint-disable-next-line
  }, [])

  // switch camera (cuz u might wanna see a different angle)
  const swCam = useCallback(async (did: string) => {
    if (!did || did === selCam) return
    setSelCam(did); setErr('')
    sr.current?.getTracks().forEach(t => t.stop())
    if (vr.current) vr.current.srcObject = null
    sr.current = null; setCam(false)
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, deviceId: { exact: did } }, audio: false,
      })
      if (vr.current) { vr.current.srcObject = s; sr.current = s; setCam(true) }
    } catch (e: any) { setErr('camera switch: ' + e.message) }
  }, [selCam])

  // send frame to ai (the magic happens here)
  const send = useCallback(async (b64: string) => {
    if (!jid) return
    try {
      const r = await fetch('/api/frames/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jid, image: b64 }),
      })
      const d = await r.json()
      const ns = d.status || 'unknown'
      const nm2 = d.observation || ''
      setSt(ns); setMsg(nm2)
      setObs((prev: any) => [...prev, { status: ns, msg: nm2, conf: d.confidence || 0, time: new Date() }].slice(-20))
      if (ns === 'stop') { beep(); popNotif(nm2) }
    } catch (_) {}
  }, [jid, beep, popNotif])

  // takes a snapshot from the video and sends it to the AI
  const snap = useCallback(() => {
    if (!vr.current || !cr.current || !jid) return
    const c = cr.current; const v = vr.current
    c.width = v.videoWidth; c.height = v.videoHeight
    c.getContext('2d')?.drawImage(v, 0, 0)
    send(c.toDataURL('image/jpeg', 0.7).split(',')[1])
  }, [jid, send])

  // starts watching (the fun begins)
  const go = async () => {
    try {
      const r = await fetch(`/api/sessions/start?machine_id=${mid}`, { method: 'POST' })
      if (!r.ok) {
        const txt = await r.text()
        throw new Error(`Backend error (${r.status})${r.status === 500 && !txt ? ' — is the backend running on :8000?' : ': ' + txt}`)
      }
      const d = await r.json()
      setJid(d.job_id); setWatch(true); setSt('watch'); setMsg(''); setObs([])
      ir.current = window.setInterval(snap, 3000) // takes a pic every 3 secs lol
      setTimeout(snap, 500)
    } catch (e: any) { setErr('could not start: ' + e.message) }
  }

  // stops watching (party's over)
  const stop = async () => {
    if (ir.current) clearInterval(ir.current)
    setWatch(false); setSt('off')
    if (jid) {
      try {
        await fetch(`/api/sessions/${jid}/stop`, { method: 'POST' })
        // tell the header beacon to refresh immediately
        window.dispatchEvent(new CustomEvent('session-changed'))
        n(`/reports/${jid}`)
      } catch (_) {
        // even if it fails, still try to show the report (keep going fam)
        n(`/reports/${jid}`)
      }
    }
  }

  const sc = st === 'normal' ? 'var(--green)'
    : st === 'warning' ? 'var(--yellow)'
    : st === 'stop' ? 'var(--red)'
    : st === 'watch' ? 'var(--blue)'
    : 'var(--text-dim)'

  return (
    <div>
      {err && <div className="error">{err}</div>}

      {/* header with machine name + cam switcher + start/stop (the important stuff) */}
      <div className="card-header" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 className="page-title" style={{ margin: 0, fontSize: 18 }}>{nm || 'Live Cam'}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
            <span>📷 {cams.length} monitor{cams.length !== 1 ? 's' : ''}</span>
            {cams.length > 1 && (
              <select className="cam-select" value={selCam}
                onChange={(e) => swCam(e.target.value)} disabled={watch}>
                {cams.map((c, i) => (
                  <option key={c.deviceId} value={c.deviceId}>{c.label || `Camera ${i + 1}`}</option>
                ))}
              </select>
            )}
            {watch && <span style={{ color: 'var(--text-dim)' }}>· {obs.length} frames</span>}
          </div>
        </div>
        <button className={`btn ${watch ? 'btn-danger' : 'btn-primary'}`}
          onClick={watch ? stop : go} style={{ fontSize: 14, padding: '8px 20px' }}>
          {watch ? '■ Stop!' : '▶ Start Watching!'}
        </button>
      </div>

      {/* main area: video + obs feed */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        {/* camera (the main attraction) */}
        <div style={{
          flex: watch && obs.length ? '1 1 60%' : '1 1 100%',
          background: '#000', borderRadius: 'var(--radius-lg)', overflow: 'hidden',
          position: 'relative', minHeight: 200,
        }}>
          {!cam && (
            <div className="camera-placeholder">
              {err ? `Camera error - check permissions: ${err}` : 'Starting camera...'}
            </div>
          )}
          <video ref={vr} autoPlay playsInline muted
            style={{ width: '100%', maxHeight: '60vh', objectFit: 'contain', display: cam ? 'block' : 'none' }} />
          <canvas ref={cr} style={{ display: 'none' }} /> {/* hidden canvas for capturing frames (shh) */}

          {watch && (
            <div className="status-overlay"
              style={{ background: `${sc.replace(')', '')}22`, border: `2px solid ${sc}`, color: sc }}>
              <span className={`status-dot ${st === 'watch' ? 'normal' : st}`} />
              {st === 'watch' ? 'WATCHING' : st.toUpperCase()}
              {st === 'stop' && <span style={{ marginLeft: 6 }}>🔔</span>}
            </div>
          )}
        </div>

        {/* observation feed sidebar (kinda spammy tbh) */}
        {watch && obs.length > 0 && (
          <div className="obs-feed">
            <div className="obs-feed-header">Live Observations</div>
            {[...obs].reverse().map((o, i) => {
              const c = o.status === 'normal' ? 'var(--green)' : o.status === 'warning' ? 'var(--yellow)' : 'var(--red)'
              return (
                <div key={i} className="feed-item">
                  <span className="feed-dot" style={{ background: c }} />
                  <div className="feed-content">
                    <div className="obs-meta">{o.time.toLocaleTimeString()} · {Math.round(o.conf * 100)}%</div>
                    <div className="obs-text">{o.msg || 'No observation'}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* status bar (tells u what's happening rn) */}
      {(msg || st === 'watch') && (
        <div className="info-bar" style={{ borderColor: `${sc}44` }}>
          {!watch && !msg ? 'Press Start to Watch lol' : msg || 'Analyzing...'}
        </div>
      )}
    </div>
  )
}

export default LiveView
