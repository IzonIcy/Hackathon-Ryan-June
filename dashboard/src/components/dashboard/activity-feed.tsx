"use client"

import { motion } from "framer-motion"
import { AlertTriangle, Clock } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { ActivityItem } from "@/types"

interface ActivityFeedProps {
  incidents: ActivityItem[]
}

const severityColors: Record<string, { border: string; badge: string; label: string }> = {
  high: {
    border: "border-l-[var(--color-destructive)]",
    badge: "bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]",
    label: "Critical",
  },
  medium: {
    border: "border-l-[var(--color-warning)]",
    badge: "bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
    label: "Warning",
  },
  low: {
    border: "border-l-[var(--color-info)]",
    badge: "bg-[var(--color-info)]/10 text-[var(--color-info)]",
    label: "Info",
  },
}

// shows all the drama happening in the factory fr fr
export function ActivityFeed({ incidents }: ActivityFeedProps) {
  return (
    <div className="glass-card flex flex-col h-full rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
          Recent Drama
        </h3>
        {incidents.length > 0 && (
          <span className="flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
            <Clock className="size-3" />
            {incidents.length} events
          </span>
        )}
      </div>

      {incidents.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-12">
          <AlertTriangle className="size-10 text-[var(--color-success)]/40" />
          <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">
            No drama rn
          </p>
        </div>
      ) : (
        <div className="space-y-1.5 flex-1 overflow-y-auto pr-1">
          {incidents.slice(0, 8).map((incident, i) => {
            const sev = severityColors[incident.severity] ?? severityColors.low
            return (
              <motion.div
                key={incident.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <div
                  className={cn(
                    "group flex items-start gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 transition-all duration-200 hover:bg-white/[0.06] hover:border-white/[0.08] border-l-2 shadow-[0_2px_8px_rgba(0,0,0,0.15)]",
                    sev.border,
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--color-foreground)]">
                        {incident.title}
                      </span>
                      <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-medium", sev.badge)}>
                        {sev.label}
                      </span>
                    </div>
                    {incident.status && (
                      <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                        {incident.status}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-[var(--color-muted-foreground)]/60">
                    {incident.time}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
