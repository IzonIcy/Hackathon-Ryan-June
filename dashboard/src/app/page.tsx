"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  Monitor,
  Activity,
  AlertTriangle,
  BrainCircuit,
  Zap,
} from "lucide-react"
import * as api from "@/lib/api"
import type { Machine, Job, JobReport } from "@/types"
import { useApi } from "@/hooks/use-api"
import { usePolling } from "@/hooks/use-polling"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/dashboard/stat-card"
import { MachineCard } from "@/components/dashboard/machine-card"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { AiInsightCard } from "@/components/dashboard/ai-insight-card"

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl bg-[var(--color-muted)]",
        className
      )}
    />
  )
}

export default function DashboardPage() {
  const [clearing, setClearing] = useState(false)

  const { data: machines, loading: machinesLoading, refetch: refetchMachines } = useApi(
    (signal) => api.getMachines(signal),
    [],
  )
  const { data: jobs, loading: jobsLoading, refetch: refetchJobs } = useApi(
    (signal) => api.getJobs(undefined, signal),
    [],
  )
  const { data: reports, loading: reportsLoading, refetch: refetchReports } = useApi(
    (signal) => api.getReports(signal),
    [],
  )

  // auto-refresh every 5 seconds so the dashboard stays in sync
  usePolling(() => {
    refetchMachines()
    refetchJobs()
    refetchReports()
  }, 5000)

  async function handleClearData() {
    setClearing(true)
    try {
      await api.clearAllData()
      await Promise.all([refetchMachines(), refetchJobs(), refetchReports()])
    } catch {
      // ignore
    } finally {
      setClearing(false)
    }
  }

  const loading = machinesLoading || jobsLoading || reportsLoading

  const stats = useMemo(() => {
    const m = machines ?? []
    const j = jobs ?? []
    const r = reports ?? []

    const activeSessions = j.filter((job) => job.status === "running").length

    const allIncidents = r.flatMap((report) => report.incidents)
    const incidentsToday = allIncidents.length

    const allObservations = r.flatMap((report) => report.observations)
    const totalConfidence = allObservations.reduce(
      (sum, obs) => sum + (obs.severity === "normal" ? 1 : obs.severity === "warning" ? 0.6 : 0.2),
      0,
    )
    const avgConfidence =
      allObservations.length > 0
        ? Math.round((totalConfidence / allObservations.length) * 100)
        : null

    return {
      totalMonitors: m.length,
      activeSessions,
      incidentsToday,
      aiConfidence: avgConfidence,
    }
  }, [machines, jobs, reports])

  const activityIncidents = useMemo(() => {
    if (!reports) return []
    return reports.flatMap((report) =>
      report.incidents.map((inc, i) => ({
        id: `inc-${report.job_id}-${i}`,
        time: report.job_name,
        title: inc.title,
        severity: inc.severity as "high" | "medium" | "low",
        status: inc.description ?? "",
      })),
    )
  }, [reports])

  const aiInsights = useMemo(() => {
    if (!reports) return []
    return reports.flatMap((report) =>
      report.observations.map((obs) => ({
        status: obs.status,
        message: obs.observation ?? "No observation",
        confidence:
          obs.severity === "normal"
            ? 0.95
            : obs.severity === "warning"
              ? 0.65
              : 0.35,
        time: obs.time,
      })),
    )
  }, [reports])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-72 lg:col-span-2" />
          <Skeleton className="h-72" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <Skeleton className="h-96 lg:col-span-3" />
          <Skeleton className="h-96 lg:col-span-2" />
        </div>
      </div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            FabOps Sentinel — AI Observability Platform
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleClearData}
            disabled={clearing}
            className="rounded-lg border border-[var(--color-muted)] px-3 py-1.5 text-[11px] font-medium text-[var(--color-muted-foreground)] transition-colors hover:border-destructive/40 hover:text-destructive disabled:opacity-40"
          >
            {clearing ? "Clearing..." : "Clear Test Data"}
          </button>
          <Badge variant="premium" className="px-3 py-1 text-xs">
            <Zap className="mr-1 size-3.5" />
            Live
          </Badge>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          title="Total Monitors"
          value={stats.totalMonitors}
          icon={Monitor}
          trend={null}
          change={null}
          color="var(--color-primary)"
          index={0}
        />
        <StatCard
          title="Active Sessions"
          value={stats.activeSessions}
          icon={Activity}
          trend={stats.activeSessions > 0 ? "up" : null}
          change={stats.activeSessions > 0 ? `${stats.activeSessions} now` : null}
          color="var(--color-success)"
          index={1}
        />
        <StatCard
          title="Incidents Today"
          value={stats.incidentsToday}
          icon={AlertTriangle}
          trend={stats.incidentsToday > 3 ? "down" : stats.incidentsToday > 0 ? "up" : null}
          change={stats.incidentsToday > 0 ? `${stats.incidentsToday} alerts` : "None"}
          color="var(--color-destructive)"
          index={2}
        />
        <StatCard
          title="AI Confidence"
          value={stats.aiConfidence !== null ? `${stats.aiConfidence}%` : "\u2014"}
          icon={BrainCircuit}
          trend={stats.aiConfidence !== null ? (stats.aiConfidence >= 90 ? "up" : "down") : null}
          change={stats.aiConfidence !== null ? (stats.aiConfidence >= 90 ? "Stable" : "Degraded") : null}
          color="var(--color-accent)"
          index={3}
        />
      </motion.div>

      {/* Activity + Active Monitors */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 gap-4 lg:grid-cols-5"
      >
        <div className="lg:col-span-3">
          <ActivityFeed incidents={activityIncidents} />
        </div>

        <div className="lg:col-span-2">
          <div className="glass-card rounded-2xl p-5">
            <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
              Active Monitors
            </h3>
            <div className="space-y-3">
              {machines && machines.length > 0 ? (
                machines.map((machine, i) => (
                  <MachineCard key={machine.id} machine={machine} index={i} />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Monitor className="size-10 text-[var(--color-muted-foreground)]/40" />
                  <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">
                    No machines configured
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* AI Observations */}
      <motion.div variants={containerVariants} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-[var(--color-foreground)]">
            AI Observations
          </h2>
          <Badge variant="premium" className="text-[11px]">
            <BrainCircuit className="mr-1 size-3" />
            {aiInsights.length} insights
          </Badge>
        </div>
        {aiInsights.length > 0 ? (
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3"
          >
            {aiInsights.slice(0, 6).map((insight) => (
              <motion.div key={`${insight.time}-${insight.message}`} variants={itemVariants}>
                <AiInsightCard insight={insight} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="glass-card flex flex-col items-center justify-center rounded-2xl py-16">
            <BrainCircuit className="size-12 text-[var(--color-muted-foreground)]/30" />
            <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">
              No AI observations yet
            </p>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]/60">
              Observations will appear as frames are analyzed
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
