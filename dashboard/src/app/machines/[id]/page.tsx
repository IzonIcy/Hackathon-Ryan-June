"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  Camera,
  BarChart3,
  AlertTriangle,
  Ban,
  Timer,
  Scan,
  Activity,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { Machine, Job } from "@/types"
import * as api from "@/lib/api"
import { useApi } from "@/hooks/use-api"
import { cn, formatDate } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { CameraLiveFeed } from "@/components/camera/camera-live-feed"

interface Metric {
  label: string
  value: string
  icon: LucideIcon
  color: string
}

// default metrics when theres no data yet lol
const defaultMetrics: Metric[] = [
  { label: "Total Scans", value: "0", icon: Scan, color: "var(--color-info)" },
  { label: "Warnings", value: "0", icon: AlertTriangle, color: "var(--color-warning)" },
  { label: "Stops", value: "0", icon: Ban, color: "var(--color-destructive)" },
  { label: "Uptime", value: "0%", icon: Timer, color: "var(--color-success)" },
]

const statusConfig: Record<string, { label: string; dotColor: string }> = {
  running: { label: "Running", dotColor: "var(--color-success)" },
  warning: { label: "Warning", dotColor: "var(--color-warning)" },
  error: { label: "Error", dotColor: "var(--color-destructive)" },
  stopped: { label: "Stopped", dotColor: "var(--color-destructive)" },
  idle: { label: "Idle", dotColor: "#64748b" },
}

const severityConfig: Record<string, { dotColor: string; bgColor: string; label: string }> = {
  normal: { dotColor: "var(--color-success)", bgColor: "rgba(34,197,94,0.08)", label: "Normal" },
  info: { dotColor: "var(--color-info)", bgColor: "rgba(59,130,246,0.08)", label: "Info" },
  warning: { dotColor: "var(--color-warning)", bgColor: "rgba(245,158,11,0.08)", label: "Warning" },
  stop: { dotColor: "var(--color-destructive)", bgColor: "rgba(239,68,68,0.08)", label: "Stop" },
}

// u know the drill by now lol
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
}

// loading card thingy
function SkeletonCard() {
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="h-5 w-5 animate-pulse rounded-lg bg-muted" />
      <div className="mt-4 h-8 w-24 animate-pulse rounded-lg bg-muted" />
      <div className="mt-2 h-4 w-16 animate-pulse rounded-lg bg-muted" />
    </div>
  )
}

export default function MachineDetailPage() {
  const params = useParams()
  const id = Number(params.id)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [activeJobId, setActiveJobId] = useState<number | null>(null)
  const [seeding, setSeeding] = useState(false)
  const [hasAutoStarted, setHasAutoStarted] = useState(false)

  const {
    data: machine,
    loading: machineLoading,
    error: machineError,
    refetch: refetchMachine,
  } = useApi<Machine>((signal) => api.getMachine(id, signal), [id])

  const { data: jobs, loading: jobsLoading, refetch: refetchJobs } = useApi<Job[]>(
    (signal) => api.getJobs(undefined, signal),
    [],
  )

  const machineJobs = useMemo(() => {
    if (!jobs || !machine) return []
    return jobs.filter((j) => j.machine_id === machine.id)
  }, [jobs, machine])

  const activeJob = useMemo(() => {
    return machineJobs.find((j) => j.status === "running") ?? null
  }, [machineJobs])

  const metrics: Metric[] = useMemo(() => {
    if (!machine) return defaultMetrics
    const totalFrames = machineJobs.reduce((sum, j) => sum + (j.estimated_duration ?? 0), 0)
    const warnings = machineJobs.filter((j) => j.status === "warning" || j.status === "error").length
    const stops = machineJobs.filter((j) => j.status === "stopped").length
    const uptime = machine.status === "running" ? "98.3%" : machine.status === "idle" ? "—" : "0%"
    return [
      { label: "Total Scans", value: totalFrames > 0 ? String(totalFrames) : "0", icon: Scan, color: "var(--color-info)" },
      { label: "Warnings", value: String(warnings || 0), icon: AlertTriangle, color: "var(--color-warning)" },
      { label: "Stops", value: String(stops || 0), icon: Ban, color: "var(--color-destructive)" },
      { label: "Uptime", value: uptime, icon: Timer, color: "var(--color-success)" },
    ]
  }, [machine, machineJobs])

  const loading = machineLoading || jobsLoading
  const status = machine ? statusConfig[machine.status] ?? statusConfig.idle : statusConfig.idle

  // start watching stuff
  const handleStartMonitoring = async () => {
    if (!machine) return
    try {
      const job = await api.createJob({ machine_id: machine.id, job_name: `Session ${Date.now()}` })
      await api.updateMachineStatus(machine.id, "running")
      setActiveJobId(job.id)
      setIsMonitoring(true)
      refetchMachine()
      refetchJobs()
    } catch {
      // silently fail (as usual)
    }
  }

  // stop watching stuff
  const handleStopMonitoring = async () => {
    if (!machine || !activeJob) return
    try {
      await api.updateJobStatus(activeJob.id, "completed")
      await api.updateMachineStatus(machine.id, "idle")
      setActiveJobId(null)
      setIsMonitoring(false)
      refetchMachine()
      refetchJobs()
    } catch {
      // silently fail (shhh)
    }
  }

  const activeJobRef = useRef<Job | null>(null)
  useEffect(() => {
    activeJobRef.current = activeJob
  }, [activeJob])

  // auto-start monitoring when watching a camera
  useEffect(() => {
    if (loading || !machine || hasAutoStarted) return

    if (activeJob) {
      // sync local UI state from the fetched job once data lands
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsMonitoring(true)
      setActiveJobId(activeJob.id)
      setHasAutoStarted(true)
    } else {
       
      setHasAutoStarted(true)
      handleStartMonitoring()
    }
  }, [loading, machine, activeJob, hasAutoStarted])

  // auto-stop monitoring when unmounting/exiting the watch page
  useEffect(() => {
    const handleBeforeUnload = () => {
      const job = activeJobRef.current
      if (job && job.status === "running") {
        fetch(`http://localhost:8000/api/jobs/${job.id}/status?status=completed`, {
          method: "PATCH",
          keepalive: true,
        })
        fetch(`http://localhost:8000/api/machines/${job.machine_id}/status?status=idle`, {
          method: "PATCH",
          keepalive: true,
        })
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      
      const job = activeJobRef.current
      if (job && job.status === "running") {
        api.updateJobStatus(job.id, "completed").catch(() => {})
        api.updateMachineStatus(job.machine_id, "idle").catch(() => {})
      }
    }
  }, [])

  // seed fake data for testing lol
  const handleSeedDemoData = async () => {
    if (!activeJob && !activeJobId) return
    const jobId = activeJobId || activeJob?.id
    if (!jobId) return
    setSeeding(true)
    try {
      const result = await api.seedDemoData(jobId)
      if (result.ok) {
        refetchJobs()
      }
    } catch {
      // silently fail (probs backend issues)
    } finally {
      setSeeding(false)
    }
  }

  // delete everything lmao
  const handleClearAllData = async () => {
    if (!window.confirm("This will yeet EVERYTHING. Machines, jobs, frames, incidents all gone. U sure? 💀")) {
      return
    }
    try {
      await api.clearAllData()
      setIsMonitoring(false)
      setActiveJobId(null)
      refetchMachine()
      refetchJobs()
    } catch {
      // silently fail (hopefully not)
    }
  }

  if (loading) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        <motion.div variants={itemVariants}>
          <div className="h-8 w-36 animate-pulse rounded-lg bg-muted" />
        </motion.div>
        <motion.div variants={itemVariants} className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="size-14 animate-pulse rounded-2xl bg-muted" />
            <div className="space-y-2">
              <div className="h-7 w-48 animate-pulse rounded-lg bg-muted" />
              <div className="h-5 w-32 animate-pulse rounded-lg bg-muted" />
            </div>
          </div>
        </motion.div>
        <motion.div variants={itemVariants} className="grid grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </motion.div>
      </motion.div>
    )
  }

  if (machineError || !machine) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex min-h-[60vh] flex-col items-center justify-center gap-4"
      >
        <motion.div
          variants={itemVariants}
          className="flex size-16 items-center justify-center rounded-2xl bg-[var(--color-destructive-muted)]"
        >
          <AlertTriangle className="size-8 text-[var(--color-destructive)]" />
        </motion.div>
        <motion.h2
          variants={itemVariants}
          className="text-xl font-semibold text-[var(--color-foreground)]"
        >
          Machine not found lol
        </motion.h2>
        <motion.p
          variants={itemVariants}
          className="text-sm text-[var(--color-muted-foreground)]"
        >
          No machine with ID {id} exists. maybe it got yeeted.
        </motion.p>
        <motion.div variants={itemVariants}>
          <Link
            href="/machines"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-card-border px-4 text-sm font-medium text-muted-foreground transition-all duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 h-10"
          >
            <ArrowLeft className="size-4" />
            Back to Monitors (run away)
          </Link>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={itemVariants}>
        <Link
          href="/machines"
          className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 h-8 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ArrowLeft className="size-4" />
          Back to Monitors
        </Link>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="glass-card rounded-2xl p-6"
      >
        <div className="flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-[var(--color-muted)]">
            <Camera className="size-7 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
                {machine.name}
              </h1>
              <Badge variant="info" className="px-3 py-0.5 text-xs font-medium">
                Camera
              </Badge>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className="relative flex size-2">
                <span
                  className={cn(
                    "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                    machine.status === "idle" && "hidden",
                  )}
                  style={{ background: status.dotColor }}
                />
                <span
                  className="relative inline-flex size-2 rounded-full"
                  style={{ background: status.dotColor }}
                />
              </span>
              <span className="text-sm font-medium text-[var(--color-foreground)]">
                {status.label}
              </span>
              
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-1">
            <TabsTrigger value="overview" className="text-sm">
              <BarChart3 className="mr-2 size-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="live-feed" className="text-sm">
              <Camera className="mr-2 size-4" />
              Live Feed
            </TabsTrigger>
            <TabsTrigger value="history" className="text-sm">
              <Activity className="mr-2 size-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 pt-6">
            <div className="grid grid-cols-4 gap-4">
              {metrics.map((metric, i) => (
                <motion.div
                  key={metric.label}
                  variants={itemVariants}
                  transition={{ delay: i * 0.03 }}
                >
                  <div className="glass-card rounded-2xl p-5">
                    <div
                      className="inline-flex rounded-xl p-2.5"
                      style={{ backgroundColor: `${metric.color}1a` }}
                    >
                      <metric.icon className="size-5" style={{ color: metric.color }} />
                    </div>
                    <p className="mt-4 text-3xl font-semibold tracking-tight stat-value text-[var(--color-foreground)]">
                      {metric.value}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                      {metric.label}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div variants={itemVariants}>
              <div className="glass-card rounded-2xl p-5">
                <h3 className="text-sm font-medium text-[var(--color-foreground)]">
                  Recent Observations
                </h3>
                <Separator className="my-4" />
                <div className="space-y-1">
                  {machineJobs.length === 0 && (
                    <p className="py-4 text-center text-sm text-[var(--color-muted-foreground)]">
                      No observations yet. Start monitoring or something idk.
                    </p>
                  )}
                  {machineJobs.length > 0 && machineJobs.slice(0, 10).map((job) => {
                    return (
                      <div
                        key={job.id}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-[var(--color-muted)]"
                      >
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{
                            background: job.status === "completed" ? "var(--color-success)" : job.status === "failed" ? "var(--color-destructive)" : "var(--color-info)",
                          }}
                        />
                        <span className="flex-1 text-[var(--color-foreground)]">
                          {job.job_name}
                        </span>
                        <span className="text-xs text-[var(--color-muted-foreground)]">
                          {formatDate(job.created_at)}
                        </span>
                        <span
                          className="rounded-md px-2 py-0.5 text-[11px] font-medium capitalize"
                          style={{
                            background: job.status === "completed" ? "rgba(34,197,94,0.08)" : job.status === "failed" ? "rgba(239,68,68,0.08)" : "rgba(59,130,246,0.08)",
                            color: job.status === "completed" ? "var(--color-success)" : job.status === "failed" ? "var(--color-destructive)" : "var(--color-info)",
                          }}
                        >
                          {job.status}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="live-feed" className="pt-6">
            <CameraLiveFeed
              deviceId={machine.device_id}
              jobId={activeJobId}
              isMonitoring={isMonitoring}
              onStartMonitoring={handleStartMonitoring}
              onStopMonitoring={handleStopMonitoring}
              intervalMs={30000}
            />

            {isMonitoring && (
              <div className="mt-4 flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={handleSeedDemoData}
                  disabled={seeding}
                >
                  {seeding ? "Seeding..." : "Seed Demo Data fr fr"}
                </Button>
                <span className="text-xs text-muted-foreground">
                    Injects fake frames (with failures) to test SMS alerts lol
                </span>
                <div className="ml-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-destructive hover:text-destructive"
                    onClick={handleClearAllData}
                  >
                    Yeet All Data
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="pt-6">
            <motion.div
              variants={itemVariants}
              className="glass-card flex flex-col items-center justify-center rounded-2xl p-16"
            >
              <div className="flex size-20 items-center justify-center rounded-2xl bg-[var(--color-muted)]">
                <Activity className="size-10 text-[var(--color-muted-foreground)]/40" />
              </div>
              <h3 className="mt-6 text-lg font-medium text-[var(--color-foreground)]">
                Monitor history and trends will appear here (someday maybe)
              </h3>
              <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                Coming Soon™ (like actually tho)
              </p>
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}
