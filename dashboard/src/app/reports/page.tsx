"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import {
  Grid3X3,
  List,
  FileText,
  Monitor,
  Clock,
  Scan,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useApi } from "@/hooks/use-api"
import * as api from "@/lib/api"
import type { JobReport } from "@/types"

const severityBorderColor: Record<string, string> = {
  high: "border-l-[var(--color-destructive)]",
  medium: "border-l-[var(--color-warning)]",
  low: "border-l-[var(--color-success)]",
}

const severityBadgeVariant: Record<string, "danger" | "warning" | "info"> = {
  high: "danger",
  medium: "warning",
  low: "info",
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
}

function SkeletonCard() {
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <Skeleton className="size-10 rounded-xl" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-5 w-3/5" />
      <div className="mt-3 flex items-center gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="mt-4 h-4 w-28" />
    </div>
  )
}

function SkeletonListRow() {
  return (
    <div className="flex items-center gap-4 px-6 py-4">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-5 w-20" />
      <Skeleton className="h-5 w-16" />
      <Skeleton className="h-5 w-full max-w-24" />
    </div>
  )
}

export default function ReportsPage() {
  const [view, setView] = useState<"grid" | "list">("grid")
  const { data: reports, loading, error } = useApi((signal) => api.getReports(signal))

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
            Reports
          </h1>
          {!loading && reports && (
            <Badge variant="outline" className="px-3 py-1 text-sm">
              {reports.length} total
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-[var(--color-card-border)] bg-[var(--color-card)] p-0.5">
          <button
            type="button"
            onClick={() => setView("grid")}
            className={cn(
              "rounded-md p-1.5 transition-all duration-200",
              view === "grid"
                ? "bg-[var(--color-muted)] text-[var(--color-foreground)] shadow-sm"
                : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            )}
            aria-label="Grid view"
          >
            <Grid3X3 className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn(
              "rounded-md p-1.5 transition-all duration-200",
              view === "list"
                ? "bg-[var(--color-muted)] text-[var(--color-foreground)] shadow-sm"
                : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            )}
            aria-label="List view"
          >
            <List className="size-4" />
          </button>
        </div>
      </motion.div>

      {loading && (
        <motion.div
          variants={containerVariants}
          className={cn(
            view === "grid"
              ? "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
              : "space-y-2"
          )}
        >
          {view === "grid"
            ? ["s1","s2","s3","s4","s5","s6"].map((id) => (
                <motion.div key={id} variants={cardVariants}>
                  <SkeletonCard />
                </motion.div>
              ))
            : (
              <div className="overflow-hidden rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] shadow-sm">
                <div className="grid grid-cols-6 gap-4 border-b border-[var(--color-card-border)] px-6 py-3 text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  <span className="col-span-2">Job Name</span>
                  <span>Machine</span>
                  <span>Duration</span>
                  <span>Frames</span>
                  <span>Status</span>
                </div>
                {["r1","r2","r3","r4","r5"].map((id) => (
                  <motion.div
                    key={id}
                    variants={cardVariants}
                    className={cn(
                      "border-b border-[var(--color-card-border)] last:border-b-0"
                    )}
                  >
                    <SkeletonListRow />
                  </motion.div>
                ))}
              </div>
            )}
        </motion.div>
      )}

      {!loading && !error && reports && reports.length === 0 && (
        <motion.div
          variants={cardVariants}
          className="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-16 shadow-sm"
        >
          <div className="flex size-16 items-center justify-center rounded-2xl bg-[var(--color-muted)]">
            <FileText className="size-8 text-[var(--color-muted-foreground)]/40" />
          </div>
          <h3 className="mt-5 text-lg font-medium text-[var(--color-foreground)]">
            No reports yet
          </h3>
          <p className="mt-1.5 text-sm text-[var(--color-muted-foreground)]">
            Complete a monitoring session to generate your first report.
          </p>
        </motion.div>
      )}

      {!loading && !error && reports && reports.length > 0 && view === "grid" && (
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {reports.map((report) => (
            <motion.div key={report.job_id} variants={cardVariants}>
              <Link href={`/reports/${report.job_id}`} className="block">
                <div
                  className={cn(
                    "glass-card rounded-2xl p-5 border-l-4",
                    severityBorderColor[report.severity]
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--color-muted)]">
                      <FileText className="size-5 text-[var(--color-muted-foreground)]" />
                    </div>
                    <Badge
                      variant={severityBadgeVariant[report.severity]}
                      className="px-2.5 py-0.5 text-[11px] font-medium capitalize"
                    >
                      {report.severity}
                    </Badge>
                  </div>

                  <h3 className="mt-4 text-base font-semibold text-[var(--color-foreground)] group-hover:text-[var(--color-primary)] transition-colors">
                    {report.job_name}
                  </h3>

                  <div className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                    {report.machine_name}
                    <span className="mx-1.5 text-[var(--color-muted-foreground)]/40">|</span>
                    {report.machine_type === "3d_printer"
                      ? "3D Printer"
                      : report.machine_type === "laser_cutter"
                        ? "Laser Cutter"
                        : "CNC"}
                  </div>

                  <div className="mt-3 flex items-center gap-3 text-xs text-[var(--color-muted-foreground)]">
                    <span className="flex items-center gap-1">
                      <Scan className="size-3.5" />
                      {report.total_frames} frames
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3.5" />
                      {report.duration}
                    </span>
                  </div>

                  {report.incidents && report.incidents.length > 0 && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs">
                      <span className="text-[var(--color-warning)] font-medium">
                        {report.incidents.length} incident{report.incidents.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}

                  {(!report.incidents || report.incidents.length === 0) && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs">
                      <span className="size-2 rounded-full bg-[var(--color-success)]" />
                      <span className="text-[var(--color-success)] font-medium">No incidents</span>
                    </div>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}

      {!loading && !error && reports && reports.length > 0 && view === "list" && (
        <motion.div
          variants={containerVariants}
          className="overflow-hidden rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] shadow-sm"
        >
          <div className="grid grid-cols-6 gap-4 border-b border-[var(--color-card-border)] px-6 py-3 text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
            <span className="col-span-2">Job Name</span>
            <span>Machine</span>
            <span>Duration</span>
            <span>Frames</span>
            <span>Status</span>
          </div>
          {reports.map((report) => (
            <motion.div key={report.job_id} variants={cardVariants}>
              <Link
                href={`/reports/${report.job_id}`}
                className="grid grid-cols-6 gap-4 border-b border-[var(--color-card-border)] px-6 py-4 text-sm transition-colors hover:bg-[var(--color-card-hover)] last:border-b-0"
              >
                <span className="col-span-2 font-medium text-[var(--color-foreground)]">
                  {report.job_name}
                </span>
                <span className="text-[var(--color-muted-foreground)]">
                  {report.machine_name}
                </span>
                <span className="text-[var(--color-muted-foreground)]">
                  {report.duration}
                </span>
                <span className="text-[var(--color-muted-foreground)]">
                  {report.total_frames}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className="size-2 rounded-full"
                    style={{
                      background:
                        report.severity === "high"
                          ? "var(--color-destructive)"
                          : report.severity === "medium"
                            ? "var(--color-warning)"
                            : "var(--color-success)",
                    }}
                  />
                  <span
                    className="text-xs font-medium capitalize"
                    style={{
                      color:
                        report.severity === "high"
                          ? "var(--color-destructive)"
                          : report.severity === "medium"
                            ? "var(--color-warning)"
                            : "var(--color-success)",
                    }}
                  >
                    {report.severity}
                  </span>
                  {report.incidents && report.incidents.length > 0 && (
                    <span className="ml-auto text-xs text-[var(--color-muted-foreground)]">
                      {report.incidents.length} inc.
                    </span>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}

      {!loading && error && (
        <motion.div
          variants={cardVariants}
          className="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-16 shadow-sm"
        >
          <div className="flex size-16 items-center justify-center rounded-2xl bg-[var(--color-destructive-muted)]">
            <FileText className="size-8 text-[var(--color-destructive)]" />
          </div>
          <h3 className="mt-5 text-lg font-medium text-[var(--color-foreground)]">
            Failed to load reports
          </h3>
          <p className="mt-1.5 text-sm text-[var(--color-muted-foreground)]">
            {error.message || "An unexpected error occurred."}
          </p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </motion.div>
      )}
    </motion.div>
  )
}
