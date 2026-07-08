'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface UseApiResult<T> {
  data: T | null
  error: Error | null
  loading: boolean
  refetch: () => void
}

// custom hook that fetches data and handles all the annoying stuff
// loading, error, refetch - we got u bro
export function useApi<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: unknown[] = [],
): UseApiResult<T> {
  // where the magic data lives (or null if we haven't fetched yet lol)
  const [data, setData] = useState<T | null>(null)
  // when things go wrong (they always do smh)
  const [error, setError] = useState<Error | null>(null)
  // is it loading? probably. the answer is always yes.
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
        console.log('wtf happened here', err)
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
