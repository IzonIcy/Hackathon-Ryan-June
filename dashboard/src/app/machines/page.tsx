"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Camera,
  Monitor,
  AlertCircle,
  RefreshCw,
  Eye,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import * as api from "@/lib/api"

interface DetectedCam {
  deviceId: string
  label: string
}

type PageState = "loading" | "permission" | "list" | "denied" | "error" | "none"

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
}

export default function MachinesPage() {
  const router = useRouter()
  const [state, setState] = useState<PageState>("loading")
  const [cameras, setCameras] = useState<DetectedCam[]>([])
  const [errorMsg, setErrorMsg] = useState("")
  const [watchingDevice, setWatchingDevice] = useState<string | null>(null)

  // step 1: try to detect cams right away (hopefully this works lol)
  useEffect(() => {
    detectCameras()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function detectCameras() {
    setState("loading")
    setErrorMsg("")

    try {
      // first check if we already have permission (without being creepy)
      // by trying to enumerate without asking first
      let devices = await navigator.mediaDevices.enumerateDevices()
      let videoDevices = devices.filter((d) => d.kind === "videoinput")
      const hasLabels = videoDevices.some((d) => d.label)

      // if no labels, we need permission first 🙄
      if (!hasLabels) {
        setState("permission")
        return
      }

      // we got labels, show the cams n stuff
      showCameras(videoDevices)
    } catch {
      setState("error")
      setErrorMsg("Could not access camera info (its giving error fr fr)")
    }
  }

  function showCameras(devices: MediaDeviceInfo[]) {
    const cams = devices
      .filter((d) => d.kind === "videoinput")
      .map((d) => ({
        deviceId: d.deviceId,
        label: d.label || `Camera ${d.deviceId.slice(0, 8)}...`,
      }))

    if (cams.length === 0) {
      setState("none")
      return
    }

    setCameras(cams)
    setState("list")
  }

  async function requestPermission() {
    setErrorMsg("")
    try {
      // ask for cam access (pls dont be creepy)
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      // stop it right away, we just needed permission (we aint recording u lol)
      for (const track of stream.getTracks()) track.stop()

      // now enumerate with real labels (we got the goods)
      const devices = await navigator.mediaDevices.enumerateDevices()
      showCameras(devices)
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string }
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
        setState("denied")
        setErrorMsg("Camera access denied. Allow it in ur browser settings n try again. (pls)")
      } else {
        setState("error")
        setErrorMsg(e.message ?? "Failed to access camera (big oof)")
      }
    }
  }

  async function handleWatch(cam: DetectedCam) {
    setWatchingDevice(cam.deviceId)
    try {
      // see if we already have a machine for this camera (no cap)
      const machines = await api.getMachines()
      let machine = machines.find((m) => m.device_id === cam.deviceId)

      if (!machine) {
        // create one (yeet)
        const name = cam.label.replace(/\s*\(.*\)$/, "").trim() || "Camera"
        machine = await api.createMachine({
          name,
          device_id: cam.deviceId,
        })
      }

      router.push(`/machines/${machine.id}`)
    } catch {
      setErrorMsg("Failed to start, is the backend even running? 💀")
    } finally {
      setWatchingDevice(null)
    }
  }

  // ──────── render (this is where the magic happens) ────────

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* header (very important) */}
      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
          Monitors
        </h1>
        {state === "list" && (
          <Badge variant="outline" className="px-3 py-1 text-xs font-medium">
            {cameras.length} camera{cameras.length !== 1 ? "s" : ""}
          </Badge>
        )}
        {state === "list" && (
          <button
            type="button"
            onClick={detectCameras}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="size-3" />
            Re-scan
          </button>
        )}
      </motion.div>

      {/* loading state */}
      {state === "loading" && (
        <motion.div
          variants={itemVariants}
          className="glass-card flex flex-col items-center justify-center rounded-2xl py-24"
        >
          <div className="size-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Detecting cameras... fr fr</p>
        </motion.div>
      )}

      {/* permission request */}
      {state === "permission" && (
        <motion.div
          variants={itemVariants}
          className="glass-card flex flex-col items-center justify-center rounded-2xl py-24"
        >
          <div className="flex size-20 items-center justify-center rounded-2xl bg-primary/10 mb-5">
            <Camera className="size-10 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Camera Access Needed 👀</h2>
          <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
            Yo we need camera access to watch ur printer lol.
            Your vid stays on your device, the AI just looks at it for problems. no cap.
          </p>
          <Button
            variant="primary"
            size="sm"
            className="mt-6 gap-2"
            onClick={requestPermission}
          >
            <Camera className="size-4" />
            GIMME CAMERA ACCESS
          </Button>
        </motion.div>
      )}

      {/* denied */}
      {state === "denied" && (
        <motion.div
          variants={itemVariants}
          className="glass-card flex flex-col items-center justify-center rounded-2xl py-24"
        >
          <div className="flex size-20 items-center justify-center rounded-2xl bg-destructive-muted mb-5">
            <AlertCircle className="size-10 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Camera Blocked 😤</h2>
          <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
            {errorMsg}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Check the address bar for the camera icon and allow it. or else.
          </p>
          <Button
            variant="primary"
            size="sm"
            className="mt-6 gap-2"
            onClick={requestPermission}
          >
            <RefreshCw className="size-4" />
            Try Again pls
          </Button>
        </motion.div>
      )}

      {/* error */}
      {state === "error" && (
        <motion.div
          variants={itemVariants}
          className="glass-card flex flex-col items-center justify-center rounded-2xl py-24"
        >
          <div className="flex size-20 items-center justify-center rounded-2xl bg-destructive-muted mb-5">
            <AlertCircle className="size-10 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Something Went Wrong 💀</h2>
          <p className="mt-2 text-sm text-muted-foreground">{errorMsg}</p>
          <Button
            variant="primary"
            size="sm"
            className="mt-6 gap-2"
            onClick={detectCameras}
          >
            <RefreshCw className="size-4" />
            Retry ig
          </Button>
        </motion.div>
      )}

      {/* no cameras found */}
      {state === "none" && (
        <motion.div
          variants={itemVariants}
          className="glass-card flex flex-col items-center justify-center rounded-2xl py-24"
        >
          <div className="flex size-20 items-center justify-center rounded-2xl bg-muted mb-5">
            <Monitor className="size-10 text-muted-foreground/40" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">No Cameras Found 💀</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Plug in a camera or smth then re-scan
          </p>
          <Button
            variant="primary"
            size="sm"
            className="mt-6 gap-2"
            onClick={detectCameras}
          >
            <RefreshCw className="size-4" />
            Re-scan
          </Button>
        </motion.div>
      )}

      {/* camera list */}
      {state === "list" && (
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {cameras.map((cam, i) => (
            <motion.div key={cam.deviceId} variants={itemVariants}>
              <div className="glass-card rounded-2xl p-5 transition-all duration-200 hover:border-[var(--color-primary)]/30">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                    <Camera className="size-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {cam.label}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      Camera Monitor
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <span className="status-dot idle" />
                  <span className="text-xs text-muted-foreground">Available</span>
                </div>

                <div className="mt-4">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => handleWatch(cam)}
                    disabled={watchingDevice === cam.deviceId}
                  >
                    {watchingDevice === cam.deviceId ? (
                      <>
                        <div className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Eye className="size-3.5" />
                        Watch Feed
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}
