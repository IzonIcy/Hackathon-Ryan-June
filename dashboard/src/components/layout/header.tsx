"use client"

import { ArrowUpFromLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { NotificationDropdown } from "./notification-dropdown"

interface HeaderProps {
  title: string
}

// the top bar with the page title and stuff
// lowkey just here to look cool
export function Header({ title }: HeaderProps) {
  console.log('header rendered lowkey')
  return (
    <header className="fixed right-0 left-60 top-0 z-40 flex h-16 items-center justify-between border-b border-card-border bg-background/80 px-6 backdrop-blur-xl">
      <div>
        <h1 className="text-sm font-semibold text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="primary" size="sm" className="gap-1.5">
          <ArrowUpFromLine className="size-3.5" />
          Deploy
        </Button>

        <div className="flex items-center gap-2 rounded-lg border border-card-border bg-card px-3 py-1.5">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-success)] opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-[var(--color-success)]" />
          </span>
          <span className="text-xs text-muted-foreground">Online fr fr</span>
        </div>

        <NotificationDropdown />

        <Avatar className="size-8">
          <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
            FS
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
