"use client"

import { motion } from "framer-motion"
import { Printer, Zap, Cpu, Eye, Camera } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import type { Machine } from "@/types"

interface MachineCardProps {
  machine: Machine
  index?: number
  isOffline?: boolean
}

const machineIcons: Record<string, LucideIcon> = {
  "3d_printer": Printer,
  laser_cutter: Zap,
  cnc: Cpu,
  camera: Camera,
}

const statusConfig: Record<string, { label: string; dotClass: string }> = {
  running: { label: "Running", dotClass: "running" },
  warning: { label: "Warning", dotClass: "warning" },
  error: { label: "Error", dotClass: "error" },
  stopped: { label: "Stopped", dotClass: "stopped" },
  idle: { label: "Idle", dotClass: "idle" },
  offline: { label: "Offline", dotClass: "offline" },
}

export function MachineCard({ machine, index = 0, isOffline = false }: MachineCardProps) {
  const Icon = machineIcons[machine.machine_type] ?? Cpu
  const status = isOffline ? statusConfig.offline : (statusConfig[machine.status] ?? statusConfig.idle)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 24, delay: index * 0.05 }}
    >
      <Link href={`/machines/${machine.id}`}>
        <div className="group relative overflow-hidden rounded-xl border border-white/[0.04] bg-white/[0.02] p-3.5 transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.1] hover:shadow-[0_4px_24px_-4px_rgba(99,102,241,0.2)]">
          
          {/* Subtle animated gradient background on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-accent/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          
          <div className="relative flex items-center gap-4">
            <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--color-muted)] border border-white/[0.05]">
              {/* Optional image logic here */}
              {machine.machine_type === '3d_printer' ? (
                 <Image src="/3d_printer.jpg" alt="3D Printer" fill className="object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500" />
              ) : (
                <Icon className="size-5 text-[var(--color-muted-foreground)] group-hover:text-primary transition-colors" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--color-foreground)] transition-colors group-hover:text-[var(--color-primary)]">
                {machine.name}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className={`status-dot ${status.dotClass}`} style={{ width: 6, height: 6 }} />
                <span className="text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide">{status.label}</span>
              </div>
            </div>

            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.03] transition-all group-hover:bg-primary/20">
               <Eye className="size-4 shrink-0 text-[var(--color-muted-foreground)] transition-all duration-300 group-hover:text-primary" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
