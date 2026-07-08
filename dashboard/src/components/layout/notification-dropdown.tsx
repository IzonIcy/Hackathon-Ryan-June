"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Bell, AlertTriangle, Info, AlertCircle, X } from "lucide-react"
import * as api from "@/lib/api"
import type { JobReport } from "@/types"

const severityStyles: Record<string, { icon: typeof AlertTriangle; color: string; bg: string }> = {
  high: { icon: AlertTriangle, color: "var(--color-destructive)", bg: "rgba(239,68,68,0.08)" },
  medium: { icon: AlertCircle, color: "var(--color-warning)", bg: "rgba(245,158,11,0.08)" },
  low: { icon: Info, color: "var(--color-info)", bg: "rgba(59,130,246,0.08)" },
}

interface NotificationItem {
  id: string
  title: string
  description: string
  severity: "high" | "medium" | "low"
  jobId: number
  time: string
}

// the bell icon that shows u stuff (if anything ever happens lol)
export function NotificationDropdown() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const hasFetched = useRef(false)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const fetchNotifications = async () => {
    if (loading) return
    setLoading(true)
    try {
      const reports = await api.getReports()
      const items: NotificationItem[] = []
      for (const report of reports) {
        for (const inc of report.incidents) {
          items.push({
            id: `inc-${report.job_id}-${inc.title}`,
            title: inc.title,
            description: inc.description ?? inc.root_cause ?? "",
            severity: inc.severity as "high" | "medium" | "low",
            jobId: report.job_id,
            time: report.duration,
          })
        }
      }
      items.sort((a, b) => (a.severity === "high" ? -1 : b.severity === "high" ? 1 : 0))
      setNotifications(items.slice(0, 20))
      setUnreadCount(items.filter((i) => i.severity === "high" || i.severity === "medium").length)
    } catch {
      // silently fail — notifications are non-critical
    } finally {
      setLoading(false)
      hasFetched.current = true
    }
  }

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next && !hasFetched.current) {
      fetchNotifications()
    }
  }

  const icon = severityStyles["high"]?.icon ?? AlertTriangle

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        className="relative inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 hover:bg-muted h-9 w-9"
        aria-label="Notifications"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground tabular-nums">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-2xl border border-card-border bg-card shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between border-b border-card-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Alerts</h3>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={() => { setUnreadCount(0); setNotifications([]) }}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                yeet em
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="flex flex-col items-center py-10">
                <Bell className="size-8 text-muted-foreground/30" />
                <p className="mt-3 text-sm text-muted-foreground">nothin here lol</p>
                <p className="text-xs text-muted-foreground/60">everythings fine i guess</p>
              </div>
            )}

            {!loading && notifications.map((item) => {
              const sevStyle = severityStyles[item.severity] ?? severityStyles.low
              const SevIcon = sevStyle.icon
              return (
                <Link
                  key={item.id}
                  href={`/reports/${item.jobId}`}
                  onClick={() => setOpen(false)}
                  className="flex gap-3 border-b border-card-border px-4 py-3 transition-colors last:border-0 hover:bg-muted/50"
                >
                  <div
                    className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: sevStyle.bg }}
                  >
                    <SevIcon className="size-4" style={{ color: sevStyle.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {item.time}
                  </span>
                </Link>
              )
            })}
          </div>

          {notifications.length > 0 && (
            <Link
              href="/incidents"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center border-t border-card-border px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              see all drama
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
