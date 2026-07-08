"use client"

import type { ReactNode } from "react"
import { motion } from "framer-motion"

interface ChartWidgetProps {
  title: string
  height?: number
  children: ReactNode
  index?: number
}

// a box with a chart in it lol. look at all the pretty lines
export function ChartWidget({ title, height = 280, children, index = 0 }: ChartWidgetProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 24, delay: index * 0.06 }}
    >
      <div className="glass-card rounded-2xl p-5" style={{ height }}>
        <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
          {title}
        </h3>
        <div className="h-[calc(100%-2rem)]">
          {children}
        </div>
      </div>
    </motion.div>
  )
}
