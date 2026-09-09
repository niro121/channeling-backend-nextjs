'use client'

import { useEffect, useState } from 'react'

type LoadState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; data: T }

/**
 * Client-side async loader: shell paints first, then each module fetches independently.
 */
export function useAsyncModule<T>(loader: () => Promise<T>): LoadState<T> {
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    loader()
      .then((data) => {
        if (!cancelled) setState({ status: 'ok', data })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error', message: 'Unable to load' })
      })
    return () => {
      cancelled = true
    }
    // Intentionally run once on mount; loaders are stable server actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return state
}
