"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Camera, CameraOff, Play, Square, RefreshCw, Loader2, Scan } from "lucide-react"
import { Button } from "@/components/ui/button"
import { analyzeFrame } from "@/lib/api"

interface Props {
  deviceId: string | null
  jobId: number | null
  onStartMonitoring?: () => void
  onStopMonitoring?: () => void
  isMonitoring?: boolean
  /** How often to capture & analyze frames (in ms). Default 3000. Set to 0 to only capture manually. */
  intervalMs?: number
}

export function CameraLiveFeed({ deviceId, jobId, onStartMonitoring, onStopMonitoring, isMonitoring = false, intervalMs = 3000 }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [lastResult, setLastResult] = useState<{ status: string; observation: string } | null>(null)

  // start the camera (plz work plz work plz work)
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
      } catch (err) {
        if (dead) return
        console.log('bruh the camera died', err)
        setError(err instanceof Error ? err.message : "camera failed")
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

  // captures a frame and sends it to the AI
  const snap = useCallback(() => {
    const v = videoRef.current
    const c = canvasRef.current
    if (!v || !c) return
    if (!v.videoWidth) {
      setLastResult({ status: "error", observation: "Camera not ready yet. Wait for the video feed to load." })
      return
    }
    if (!jobId) {
      setLastResult({ status: "error", observation: "No active job. Click 'Watch It' first." })
      return
    }
    c.width = v.videoWidth
    c.height = v.videoHeight
    c.getContext("2d")?.drawImage(v, 0, 0)
    const b64 = c.toDataURL("image/jpeg", 0.7).split(",")[1]
    setAnalyzing(true)
    analyzeFrame({ job_id: jobId, image: b64 })
      .then(f => { if (f.observation) setLastResult({ status: f.status, observation: f.observation }) })
      .catch((err) => { setLastResult({ status: "error", observation: err.message || "analysis failed" }) })
      .finally(() => setAnalyzing(false))
  }, [jobId])

  // captures frames from ur webcam at whatever interval you want lol
  // its like a security camera but cooler (and more sus)
  useEffect(() => {
    if (!isMonitoring || !jobId) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      return
    }
    // grab a frame immediately when monitoring starts, then on the interval
    // eslint-disable-next-line react-hooks/set-state-in-effect
    snap()
    if (intervalMs > 0) {
      intervalRef.current = setInterval(snap, intervalMs)
    }
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null } }
  }, [isMonitoring, jobId, intervalMs, snap])

  if (error) {
    return (
      <div className="glass-card flex flex-col items-center justify-center rounded-2xl p-16">
        <CameraOff className="size-10 text-destructive" />
        <h3 className="mt-4 text-lg font-medium">camera broke lol</h3>
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
            <p className="ml-3 text-sm text-muted-foreground">loading camera... be patient lol</p>
          </div>
        )}
        <video ref={videoRef} autoPlay muted playsInline
          className={`w-full rounded-2xl ${loading ? "hidden" : "block"}`}
          style={{ minHeight: "320px", objectFit: "cover" }} />
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {isMonitoring && !loading && (
          <>
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-destructive/90 px-3 py-1.5">
              <span className="size-2 animate-ping rounded-full bg-white" />
              <span className="text-xs font-medium text-white">RECORDING FR FR</span>
            </div>

            {analyzing && (
              <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-sm">
                <Loader2 className="size-3 animate-spin text-white" />
                <span className="text-xs text-white/80">analyzing...</span>
              </div>
            )}
          </>
        )}

        {lastResult && isMonitoring && (
          <div className={`absolute bottom-4 left-4 right-4 rounded-xl px-4 py-2.5 backdrop-blur-sm ${
            lastResult.status === "normal" ? "bg-green-900/70" :
            lastResult.status === "warning" ? "bg-amber-900/70" :
            lastResult.status === "stop" ? "bg-red-900/70" :
            "bg-black/70"
          }`}>
            <div className="flex items-start gap-2">
              <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                lastResult.status === "normal" ? "bg-green-500 text-green-950" :
                lastResult.status === "warning" ? "bg-amber-500 text-amber-950" :
                lastResult.status === "stop" ? "bg-red-500 text-red-950" :
                "bg-gray-500 text-white"
              }`}>
                {lastResult.status}
              </span>
              <p className="text-xs text-white/90">{lastResult.observation}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {isMonitoring ? (
          <>
            <Button variant="danger" size="sm" className="gap-2" onClick={onStopMonitoring}>
              <Square className="size-3.5" /> Stop Watching
            </Button>
            <Button variant="secondary" size="sm" className="gap-2" onClick={snap} disabled={analyzing}>
              {analyzing ? <Loader2 className="size-3.5 animate-spin" /> : <Scan className="size-3.5" />}
              {analyzing ? "Analyzing..." : "Analyze Now"}
            </Button>
          </>
        ) : (
          <Button variant="primary" size="sm" className="gap-2" onClick={onStartMonitoring}>
            <Play className="size-3.5" /> Watch It
          </Button>
        )}
      </div>
    </div>
  )
}
