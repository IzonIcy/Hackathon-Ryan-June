"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface AiInsight {
  status: string
  message: string
  confidence?: number
  time: string
}

interface AiInsightCardProps {
  insight: AiInsight
  index?: number
}

const statusConfig: Record<string, { dotColor: string; bgColor: string; label: string }> = {
  normal: { dotColor: "var(--color-success)", bgColor: "var(--color-success-muted)", label: "Normal" },
  warning: { dotColor: "var(--color-warning)", bgColor: "var(--color-warning-muted)", label: "Warning" },
  stop: { dotColor: "var(--color-destructive)", bgColor: "var(--color-destructive-muted)", label: "Stop" },
  info: { dotColor: "var(--color-info)", bgColor: "var(--color-info-muted)", label: "Info" },
}

// this is what chatgpt thinks about ur print lmaooo
// confidence is how sure the AI is (spoiler: its never 100% lol)
export function AiInsightCard({ insight, index = 0 }: AiInsightCardProps) {
  const config = statusConfig[insight.status] ?? statusConfig.info
  const confidencePercent = insight.confidence ? Math.round(insight.confidence * 100) : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 24, delay: index * 0.05 }}
    >
      <div className="glass-card rounded-2xl p-4 transition-all duration-200 hover:border-[var(--color-primary)]/20">
        <div className="flex items-start gap-3">
          <span
            className="mt-1 size-2 shrink-0 rounded-full"
            style={{
              background: config.dotColor,
              boxShadow: `0 0 6px ${config.dotColor}`,
            }}
          />

          <div className="min-w-0 flex-1">
            <p className="text-sm leading-relaxed text-[var(--color-foreground)]">
              {insight.message}
            </p>

            <div className="mt-2 flex items-center gap-2.5">
              <span
                className="rounded-md px-2 py-0.5 text-[10px] font-medium"
                style={{ background: config.bgColor, color: config.dotColor }}
              >
                {config.label}
              </span>

              {confidencePercent !== null && (
                <span className="text-[11px] text-[var(--color-muted-foreground)]">
                  {confidencePercent}% confidence
                </span>
              )}

              <span className="text-[11px] text-[var(--color-muted-foreground)]/50">
                {insight.time}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
