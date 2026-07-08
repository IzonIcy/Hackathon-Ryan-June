"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  color: string
  trend?: "up" | "down" | null
  change?: string | null
  index?: number
}

export function StatCard({ title, value, icon: Icon, color, trend, change, index = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 24, delay: index * 0.06 }}
    >
      <div className="glass-card group relative overflow-hidden rounded-2xl p-5">
        {/* this is the card that shows numbers and stuff lol */}
        <div
          className="absolute -right-12 -top-12 size-32 rounded-full opacity-[0.04] transition-all duration-500 group-hover:opacity-[0.08]"
          style={{ background: `radial-gradient(circle, ${color}, transparent)` }}
        />

        <div className="relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
              {title}
            </span>
            <div
              className="flex size-8 items-center justify-center rounded-xl transition-colors duration-200"
              style={{ backgroundColor: `${color}18` }}
            >
              <Icon className="size-4" />
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span
              className="stat-value text-3xl font-semibold tracking-tight text-[var(--color-foreground)]"
            >
              {value}
            </span>
            {change && (
              <span
                className={cn(
                  "flex items-center gap-0.5 text-xs font-medium",
                  trend === "up" && "text-[var(--color-success)]",
                  trend === "down" && "text-[var(--color-destructive)]",
                  !trend && "text-[var(--color-muted-foreground)]",
                )}
              >
                {change}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
