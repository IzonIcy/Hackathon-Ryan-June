'use client'

import { useEffect, useRef } from 'react'

export function usePolling(callback: () => void, intervalMs: number = 5000) {
  const saved = useRef(callback)
  saved.current = callback

  useEffect(() => {
    saved.current()
    const id = setInterval(() => saved.current(), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
}
