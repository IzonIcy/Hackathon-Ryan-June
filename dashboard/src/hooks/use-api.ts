'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface UseApiResult<T> {
  data: T | null
  error: Error | null
  loading: boolean
  refetch: () => void
}

export function useApi<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: unknown[] = [],
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  const [trigger, setTrigger] = useState(0)
  const mountedRef = useRef(true)

  const refetch = useCallback(() => {
    setTrigger((n) => n + 1)
  }, [])

  useEffect(() => {
    mountedRef.current = true
    setLoading(true)
    setError(null)

    const abort = new AbortController()

    fetcher(abort.signal)
      .then((result) => {
        if (mountedRef.current) {
          setData(result)
          setLoading(false)
        }
      })
      .catch((err: Error) => {
        if (err.name === 'AbortError') return
        if (mountedRef.current) {
          setError(err)
          setLoading(false)
        }
      })

    return () => {
      mountedRef.current = false
      abort.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, ...deps])

  return { data, error, loading, refetch }
}
