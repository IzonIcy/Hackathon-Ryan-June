"use client"

import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import {
  ShieldCheck,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  Monitor,
  Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useApi } from "@/hooks/use-api"
import { getReports } from "@/lib/api"
import type { JobReport } from "@/types"

type FilterKey = "all" | "high" | "medium" | "low"

// the shape of an incident (with extra info from the report lol)
interface IncidentWithReport {
  title: string
  description: string
  severity: string
  rootCause: string | null
  recommendedAction: string | null
  jobId: number
  jobName: string
  machineName: string
  duration: string
}

// filter buttons for severity lol
const filters: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "high", label: "Critical" },
  { key: "medium", label: "Warning" },
  { key: "low", label: "Info" },
]

const severityBadgeVariant: Record<string, "danger" | "warning" | "info"> = {
  high: "danger",
  medium: "warning",
  low: "info",
}

const borderColorMap: Record<string, string> = {
  high: "border-l-[var(--color-destructive)]",
  medium: "border-l-[var(--color-warning)]",
  low: "border-l-[var(--color-success)]",
}

// animations (copy pasta from everywhere else lol)
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
}

// the incidents page (where we see all the bad stuff that happened)
export default function IncidentsPage() {
  const [filter, setFilter] = useState<FilterKey>("all")
  const { data: reports, loading } = useApi(getReports)

  // flatten all incidents from all reports into one big array lol
  const incidents = useMemo(() => {
    if (!reports) return []
    const all: IncidentWithReport[] = []
    for (const report of reports) {
      for (const inc of report.incidents) {
        all.push({
          title: inc.title,
          description: inc.description,
          severity: inc.severity,
          rootCause: inc.root_cause,
          recommendedAction: inc.recommended_action,
          jobId: report.job_id,
          jobName: report.job_name,
          machineName: report.machine_name,
          duration: report.duration,
        })
      }
    }
    return all
  }, [reports])

  const filtered = useMemo(
    () => (filter === "all" ? incidents : incidents.filter((i) => i.severity === filter)),
    [incidents, filter],
  )

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div
        variants={{ hidden: { opacity: 0, y: -8 }, show: { opacity: 1, y: 0 } }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
            Incidents
          </h1>
          <Badge variant="outline" className="px-3 py-1 text-sm">
            {incidents.length} total
          </Badge>
        </div>
      </motion.div>

      <motion.div variants={cardVariants} className="flex items-center gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200",
              filter === f.key
                ? "bg-[var(--color-foreground)] text-[var(--color-background)] shadow-sm"
                : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
            )}
          >
            {f.label}
          </button>
        ))}
      </motion.div>

      {loading ? (
        <div className="space-y-4">
          {["sk1", "sk2", "sk3", "sk4"].map((id) => (
            <motion.div key={id} variants={cardVariants}>
              <div className="glass-card rounded-2xl p-5 border-l-4 border-l-[var(--color-card-border)]">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-5 w-56" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <div className="flex items-center gap-2 pt-1">
                      <Skeleton className="h-5 w-24 rounded-full" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-14 shrink-0 rounded-full" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          variants={cardVariants}
          className="glass-card flex flex-col items-center justify-center rounded-2xl p-16"
        >
          <div className="flex size-16 items-center justify-center rounded-2xl bg-[var(--color-muted)]">
            <ShieldCheck className="size-8 text-[var(--color-success)]" />
          </div>
          <h3 className="mt-5 text-lg font-medium text-[var(--color-foreground)]">
            All clear &mdash; no incidents detected lol lucky u
          </h3>
          <p className="mt-1.5 text-sm text-[var(--color-muted-foreground)]">
            everything is fine. for now.
          </p>
        </motion.div>
      ) : (
        <motion.div variants={containerVariants} className="space-y-4">
          {filtered.map((incident) => (
            <motion.div
              key={`${incident.jobId}-${incident.title}`}
              variants={cardVariants}
            >
              <Link href={`/reports/${incident.jobId}`} className="block">
                <div
                  className={cn(
                    "glass-card rounded-2xl p-5 border-l-4 transition-all duration-200",
                    borderColorMap[incident.severity] ?? "border-l-[var(--color-card-border)]",
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-[var(--color-foreground)]">
                        {incident.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                        {incident.description}
                      </p>

                      {(incident.rootCause || incident.recommendedAction) && (
                        <div className="mt-3 space-y-1.5">
                          {incident.rootCause && (
                            <div className="flex items-start gap-2 text-xs text-[var(--color-muted-foreground)]">
                              <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-[var(--color-warning)]" />
                              <span>{incident.rootCause}</span>
                            </div>
                          )}
                          {incident.recommendedAction && (
                            <div className="flex items-start gap-2 text-xs text-[var(--color-muted-foreground)]">
                              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-[var(--color-info)]" />
                              <span>{incident.recommendedAction}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <Badge
                      variant={severityBadgeVariant[incident.severity] ?? "default"}
                      className="shrink-0 px-3 py-0.5 text-[10px] font-medium uppercase"
                    >
                      {incident.severity}
                    </Badge>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[var(--color-muted-foreground)]">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-muted)] px-2.5 py-1 font-medium text-[var(--color-foreground)]">
                      <Monitor className="size-3" />
                      {incident.machineName}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" />
                      {incident.duration}
                    </span>
                    <span className="text-[var(--color-muted-foreground)]/60">
                      {incident.jobName}
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}
