"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import Image from "next/image"

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
      <div className="glass-card relative overflow-hidden rounded-2xl p-4 transition-all duration-300 hover:border-[var(--color-primary)]/40 hover:shadow-[0_0_30px_-5px_rgba(6,182,212,0.15)] group">
        
        {/* Subtle background glow effect */}
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-primary/10 blur-[20px] transition-all group-hover:bg-accent/20" />
        
        <div className="relative flex items-start gap-4">
          <div className="relative size-10 shrink-0 overflow-hidden rounded-full border border-white/10 opacity-80 transition-opacity group-hover:opacity-100 shadow-[0_0_15px_-3px_rgba(6,182,212,0.3)]">
            <Image src="/ai_eye.jpg" alt="AI Eye" fill className="object-cover" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
               <span
                  className="size-2 shrink-0 rounded-full"
                  style={{
                    background: config.dotColor,
                    boxShadow: `0 0 8px ${config.dotColor}`,
                  }}
               />
               <span
                className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                style={{ background: config.bgColor, color: config.dotColor }}
               >
                {config.label}
               </span>
            </div>

            <p className="text-sm font-medium leading-relaxed text-[var(--color-foreground)]">
              {insight.message}
            </p>

            <div className="mt-2 flex items-center gap-3">
              {confidencePercent !== null && (
                <span className="text-[11px] font-medium text-[var(--color-primary)]">
                  {confidencePercent}% confidence
                </span>
              )}
              <span className="text-[11px] font-medium text-[var(--color-muted-foreground)]/60">
                {insight.time}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
