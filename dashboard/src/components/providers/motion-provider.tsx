"use client"

import { MotionConfig } from "framer-motion"

// wraps the whole app so every framer-motion animation backs off
// automatically when the user has "reduce motion" turned on at the OS level
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
