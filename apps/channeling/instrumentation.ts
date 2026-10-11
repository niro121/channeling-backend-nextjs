/** Runs once when the server starts (Next.js instrumentation hook). */
export async function register() {
  // Management PWA push worker: only on the instance that has PUSH_WORKER=true.
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.PUSH_WORKER === "true") {
    const { startPushWorker } = await import("@/services/push-worker.service")
    startPushWorker()
  }
}
