/**
 * Timing debug for server-side handlers. Logs to console when DEBUG_TIMING=1 or in development.
 * Use to find slow steps in channel-booking and other actions.
 */
const isEnabled = (): boolean =>
  process.env.DEBUG_TIMING === "1" || process.env.NODE_ENV === "development"

export function timingLog(label: string, ms: number): void {
  if (!isEnabled()) return
  console.log(`[timing] ${label}: ${ms}ms`)
}

/**
 * Returns a function that, when called, logs elapsed ms since timingStart was called.
 */
export function timingStart(label: string): () => void {
  const start = Date.now()
  return () => timingLog(label, Date.now() - start)
}
