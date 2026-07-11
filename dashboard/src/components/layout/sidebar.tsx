"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import {
  LayoutDashboard,
  Cpu,
  AlertTriangle,
  FileText,
  Radar,
  Activity,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { navItems as navRoutes } from "@/lib/nav"

const navIcons: Record<string, LucideIcon> = {
  "/": LayoutDashboard,
  "/machines": Cpu,
  "/analytics": Activity,
  "/incidents": AlertTriangle,
  "/reports": FileText,
}

const navItems = navRoutes.map((item) => ({
  ...item,
  icon: navIcons[item.href] ?? LayoutDashboard,
}))

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary shadow-[0_0_16px_-4px_var(--color-primary)]">
          <Radar className="size-[18px] text-white" />
        </div>
        <div>
          <span className="text-sm font-semibold text-sidebar-text-active">
            FabOps Sentinel
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-5">
        <p className="mb-3 px-2 text-[10px] font-medium uppercase tracking-widest text-sidebar-text">
          where u at
        </p>
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
                isActive
                  ? "text-primary"
                  : "text-sidebar-text hover:bg-white/[0.04] hover:text-sidebar-text-active",
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="sidebar-active-pill"
                  className="absolute inset-0 rounded-lg bg-primary-muted"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <item.icon className="relative z-10 size-4 shrink-0" />
              <span className="relative z-10">{item.label}</span>
              {isActive && (
                <span className="relative z-10 ml-auto size-1.5 rounded-full bg-primary" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Status Footer */}
      <div className="border-t border-sidebar-border px-5 py-4">
        <div className="flex items-center gap-2.5">
          {/* green pulse = everything is fine (for now...) */}
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-success)] opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-[var(--color-success)]" />
          </span>
          <span className="text-xs text-sidebar-text">everything fine (no cap)</span>
        </div>
      </div>
    </aside>
  )
}
