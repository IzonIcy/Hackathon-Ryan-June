"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, CameraOff, Play, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { analyzeFrame } from "@/lib/api"

interface Props {
  deviceId: string | null
  jobId: number | null
  onStartMonitoring?: () => void
  onStopMonitoring?: () => void
  isMonitoring?: boolean
}

export function CameraLiveFeed({ deviceId, jobId, onStartMonitoring, onStopMonitoring, isMonitoring = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastMsg, setLastMsg] = useState<string | null>(null)

  // start the camera
  useEffect(() => {
    let dead = false
    async function start() {
      setLoading(true)
      setError(null)
      try {
        const constraints: MediaStreamConstraints = {
          video: deviceId ? { deviceId: { exact: deviceId } } : true,
        }
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        if (dead) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      } catch (err: any) {
        if (dead) return
        setError(err.message || "camera failed")
      } finally {
        if (!dead) setLoading(false)
      }
    }
    start()
    return () => {
      dead = true
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
      if (videoRef.current) videoRef.current.srcObject = null
    }
  }, [deviceId])

  // capture frames every 3 seconds when monitoring
  useEffect(() => {
    if (!isMonitoring || !jobId) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      return
    }
    const snap = () => {
      const v = videoRef.current
      const c = canvasRef.current
      if (!v || !c || !v.videoWidth) return
      c.width = v.videoWidth
      c.height = v.videoHeight
      c.getContext("2d")?.drawImage(v, 0, 0)
      const b64 = c.toDataURL("image/jpeg", 0.7).split(",")[1]
      analyzeFrame({ job_id: jobId, image: b64 })
        .then(f => { if (f.observation) setLastMsg(f.observation) })
        .catch(() => {})
    }
    snap()
    intervalRef.current = setInterval(snap, 3000)
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null } }
  }, [isMonitoring, jobId])

  if (error) {
    return (
      <div className="glass-card flex flex-col items-center justify-center rounded-2xl p-16">
        <CameraOff className="size-10 text-destructive" />
        <h3 className="mt-4 text-lg font-medium">Camera Error</h3>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl bg-muted">
        {loading && (
          <div className="flex h-64 items-center justify-center">
            <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="ml-3 text-sm text-muted-foreground">Starting camera...</p>
          </div>
        )}
        <video ref={videoRef} autoPlay muted playsInline
          className={`w-full rounded-2xl ${loading ? "hidden" : "block"}`}
          style={{ minHeight: "320px", objectFit: "cover" }} />
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {isMonitoring && !loading && (
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-destructive/90 px-3 py-1.5">
            <span className="size-2 animate-ping rounded-full bg-white" />
            <span className="text-xs font-medium text-white">REC</span>
          </div>
        )}

        {lastMsg && isMonitoring && (
          <div className="absolute bottom-4 left-4 right-4 rounded-xl bg-black/70 px-4 py-2 backdrop-blur-sm">
            <p className="text-xs text-white/90">{lastMsg}</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {isMonitoring ? (
          <Button variant="danger" size="sm" className="gap-2" onClick={onStopMonitoring}>
            <Square className="size-3.5" /> Stop Monitoring
          </Button>
        ) : (
          <Button variant="primary" size="sm" className="gap-2" onClick={onStartMonitoring}>
            <Play className="size-3.5" /> Start Monitoring
          </Button>
        )}
      </div>
    </div>
  )
}
