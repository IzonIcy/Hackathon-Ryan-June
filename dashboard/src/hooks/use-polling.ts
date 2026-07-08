'use client'

import { useEffect, useRef } from 'react'

// this keeps refreshing so the dashboard stays up to date
// every 5 secs we ask the server "what's up" lol
export function usePolling(callback: () => void, intervalMs: number = 5000) {
  const saved = useRef(callback)
  saved.current = callback

  // TODO: fix this lol - sometimes it fires twice
  useEffect(() => {
    saved.current()
    const id = setInterval(() => saved.current(), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
}
