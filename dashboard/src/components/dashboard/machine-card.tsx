"use client"

import { motion } from "framer-motion"
import { Printer, Zap, Cpu, Eye } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import Link from "next/link"
import type { Machine } from "@/types"

interface MachineCardProps {
  machine: Machine
  index?: number
}

const machineIcons: Record<string, LucideIcon> = {
  "3d_printer": Printer,
  laser_cutter: Zap,
  cnc: Cpu,
}

const statusConfig: Record<string, { label: string; dotClass: string }> = {
  running: { label: "Running", dotClass: "running" },
  warning: { label: "Warning", dotClass: "warning" },
  error: { label: "Error", dotClass: "error" },
  stopped: { label: "Stopped", dotClass: "stopped" },
  idle: { label: "Idle", dotClass: "idle" },
}

export function MachineCard({ machine, index = 0 }: MachineCardProps) {
  const Icon = machineIcons[machine.machine_type] ?? Cpu
  const status = statusConfig[machine.status] ?? statusConfig.idle

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 24, delay: index * 0.05 }}
    >
      <Link href={`/machines/${machine.id}`}>
        <div className="glass-card group flex items-center gap-3 rounded-2xl p-4 transition-all duration-200">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-muted)]">
            <Icon className="size-4 text-[var(--color-muted-foreground)]" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--color-foreground)] transition-colors group-hover:text-[var(--color-primary)]">
              {machine.name}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className={`status-dot ${status.dotClass}`} style={{ width: 5, height: 5 }} />
              <span className="text-xs text-[var(--color-muted-foreground)]">{status.label}</span>
            </div>
          </div>

          <Eye className="size-4 shrink-0 text-[var(--color-muted-foreground)] opacity-0 transition-all duration-200 group-hover:opacity-100" />
        </div>
      </Link>
    </motion.div>
  )
}
