"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  Scan,
  AlertTriangle,
  Ban,
  Timer,
  ShieldCheck,
  Lightbulb,
  Sparkles,
  Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useApi } from "@/hooks/use-api"
import { getReport } from "@/lib/api"
import type { JobReport } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

const severityBorderColor: Record<string, string> = {
  high: "border-l-[var(--color-destructive)]",
  medium: "border-l-[var(--color-warning)]",
  low: "border-l-[var(--color-success)]",
}

const severityBadgeVariant: Record<string, "danger" | "warning" | "info" | "success"> = {
  high: "danger",
  medium: "warning",
  low: "info",
}

const statusDotColor: Record<string, string> = {
  normal: "var(--color-success)",
  warning: "var(--color-warning)",
  stop: "var(--color-destructive)",
  info: "var(--color-info)",
}

// what each status means lol
const statusLabel: Record<string, string> = {
  normal: "Normal",
  warning: "Warning",
  stop: "Stop",
  info: "Info",
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
}

function ReportSkeleton() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-28" />
      </div>
      <Skeleton className="h-32 w-full rounded-2xl" />
      <div className="grid grid-cols-3 gap-4 md:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <Skeleton key={n} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
      <Skeleton className="h-80 w-full rounded-2xl" />
    </motion.div>
  )
}

export default function ReportDetailPage() {
  const params = useParams()
  const id = Number(params.id)

  const { data: report, loading, error } = useApi<JobReport>(
    (signal) => getReport(id, signal),
    [id],
  )

  if (loading) {
    return <ReportSkeleton />
  }

  if (error || !report) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex min-h-[60vh] flex-col items-center justify-center gap-4"
      >
        <div className="flex size-16 items-center justify-center rounded-2xl bg-[var(--color-muted)]">
          <Ban className="size-8 text-[var(--color-muted-foreground)]/40" />
        </div>
        <h2 className="text-xl font-semibold text-[var(--color-foreground)]">Report not found</h2>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          No report with ID {id} exists.
        </p>
        <Link
          href="/reports"
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-card-border px-4 text-sm font-medium text-muted-foreground transition-all duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 h-10"
        >
          <ArrowLeft className="size-4" />
          Back to Reports
        </Link>
      </motion.div>
    )
  }

  const statItems = [
    {
      label: "Total Scans",
      value: report.total_frames,
      icon: Scan,
      color: "var(--color-info)",
    },
    {
      label: "Normal",
      value: report.normal_frames,
      icon: ShieldCheck,
      color: "var(--color-success)",
    },
    {
      label: "Warnings",
      value: report.warning_frames,
      icon: AlertTriangle,
      color: "var(--color-warning)",
    },
    {
      label: "Stops",
      value: report.stop_frames,
      icon: Ban,
      color: "var(--color-destructive)",
    },
    {
      label: "Severity",
      value: report.severity.charAt(0).toUpperCase() + report.severity.slice(1),
      icon: AlertTriangle,
      color: report.severity === "high"
        ? "var(--color-destructive)"
        : report.severity === "medium"
          ? "var(--color-warning)"
          : "var(--color-success)",
    },
    {
      label: "Duration",
      value: report.duration,
      icon: Timer,
      color: "var(--color-primary)",
    },
  ]

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={itemVariants}>
        <Link
          href="/reports"
          className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 h-8 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ArrowLeft className="size-4" />
          Back to Reports
        </Link>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="glass-card rounded-2xl p-6"
      >
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
              {report.job_name}
            </h1>
            <p className="mt-1.5 text-sm text-[var(--color-muted-foreground)]">
              {report.machine_name}
              <span className="mx-2 text-[var(--color-muted-foreground)]/40">|</span>
              {report.machine_type === "3d_printer"
                ? "3D Printer"
                : report.machine_type === "laser_cutter"
                  ? "Laser Cutter"
                  : "CNC"}
            </p>
          </div>
          <Badge
            variant={severityBadgeVariant[report.severity]}
            className="px-4 py-1 text-sm font-medium capitalize"
          >
            {report.severity}
          </Badge>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
            <Clock className="size-3.5" />
            Duration: {report.duration}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
            <Scan className="size-3.5" />
            {report.total_frames} frames analyzed
          </span>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-3 gap-4 md:grid-cols-6">
          {statItems.map((stat, i) => (
            <motion.div
              key={stat.label}
              variants={itemVariants}
              transition={{ delay: i * 0.03 }}
            >
              <div className="glass-card rounded-2xl p-4 transition-all duration-200 hover:border-[var(--color-primary)]/30">
                <div
                  className="inline-flex rounded-xl p-2.5"
                  style={{ backgroundColor: `${stat.color}1a` }}
                >
                  <stat.icon className="size-4" style={{ color: stat.color }} />
                </div>
                <p
                  className="mt-3 text-2xl font-semibold tracking-tight"
                  style={{ color: stat.color }}
                >
                  {stat.value}
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                  {stat.label}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {report.incidents.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="glass-card rounded-2xl p-5">
            <h3 className="flex items-center gap-2 text-sm font-medium text-[var(--color-foreground)]">
              <AlertTriangle className="size-4 text-[var(--color-warning)]" />
              Incidents
              <Badge variant="outline" className="ml-1 px-2 py-0.5 text-[11px]">
                {report.incidents.length}
              </Badge>
            </h3>
            <Separator className="my-4" />
            <div className="space-y-4">
              {report.incidents.map((incident) => (
                <div
                  key={incident.title}
                  className={cn(
                    "rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4 transition-all duration-200 hover:bg-[var(--color-card-hover)] border-l-4",
                    severityBorderColor[incident.severity]
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-sm font-semibold text-[var(--color-foreground)]">
                      {incident.title}
                    </h4>
                    <Badge
                      variant={severityBadgeVariant[incident.severity]}
                      className="shrink-0 px-2.5 py-0.5 text-[10px] font-medium uppercase"
                    >
                      {incident.severity}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-[var(--color-muted-foreground)] leading-relaxed">
                    {incident.description}
                  </p>

                  {(incident.root_cause || incident.recommended_action) && (
                    <div className="mt-3 space-y-2 border-t border-[var(--color-card-border)] pt-3">
                      {incident.root_cause && (
                        <div className="flex items-start gap-2 text-xs text-[var(--color-muted-foreground)]">
                          <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-[var(--color-warning)]" />
                          <span>{incident.root_cause}</span>
                        </div>
                      )}
                      {incident.recommended_action && (
                        <div className="flex items-start gap-2 text-xs text-[var(--color-muted-foreground)]">
                          <Sparkles className="mt-0.5 size-3.5 shrink-0 text-[var(--color-info)]" />
                          <span>{incident.recommended_action}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {report.incidents.length === 0 && (
        <motion.div variants={itemVariants}>
          <div className="glass-card rounded-2xl p-5">
            <h3 className="flex items-center gap-2 text-sm font-medium text-[var(--color-foreground)]">
              <AlertTriangle className="size-4 text-[var(--color-muted-foreground)]" />
              Incidents
            </h3>
            <Separator className="my-4" />
            <div className="flex flex-col items-center justify-center py-8">
              <ShieldCheck className="size-8 text-[var(--color-success)]" />
              <p className="mt-3 text-sm font-medium text-[var(--color-foreground)]">
                No incidents during this job
              </p>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                All frames processed without issues.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
        <div className="glass-card rounded-2xl p-5">
          <h3 className="flex items-center gap-2 text-sm font-medium text-[var(--color-foreground)]">
            <Scan className="size-4 text-[var(--color-accent)]" />
            AI Observations
            <Badge variant="outline" className="ml-1 px-2 py-0.5 text-[11px]">
              {report.observations.length}
            </Badge>
          </h3>
          <Separator className="my-4" />
          <div className="max-h-[400px] space-y-1 overflow-y-auto pr-2">
            {report.observations.length === 0 ? (
              <p className="py-4 text-center text-sm text-[var(--color-muted-foreground)]">
                No observations recorded for this job.
              </p>
            ) : (
              report.observations.map((obs, i) => {
                const dot = statusDotColor[obs.status] ?? "var(--color-muted-foreground)"
                return (
                  <div
                    key={`${obs.time}-${obs.observation}`}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-[var(--color-muted)]"
                  >
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{
                        background: dot,
                        boxShadow: `0 0 6px ${dot}`,
                      }}
                    />
                    <span className="flex-1 text-[var(--color-foreground)]">
                      {obs.observation}
                    </span>
                    <span className="text-xs text-[var(--color-muted-foreground)]">
                      {obs.time}
                    </span>
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[11px] font-medium",
                        obs.status === "normal" && "bg-[var(--color-success)]/10 text-[var(--color-success)]",
                        obs.status === "warning" && "bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
                        obs.status === "stop" && "bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]",
                        obs.status === "info" && "bg-[var(--color-info)]/10 text-[var(--color-info)]"
                      )}
                    >
                      {statusLabel[obs.status] ?? obs.status}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
