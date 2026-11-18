import "server-only"
import prisma from "@/lib/prisma"
import { pushNotification } from "@/services/notification-push.service"

/**
 * Sends management PWA pushes for new Notification rows, whichever instance created them
 * (the main channeling app can run older code without any push logic). Runs only where
 * PUSH_WORKER=true — the api.ruhunuhospital.lk instance — started from instrumentation.ts.
 *
 * Each row is claimed by setting pushedAt with a conditional update, so a row is pushed once
 * even with several dynos or after a restart. Rows older than LOOKBACK_MS are never pushed,
 * so turning the worker on doesn't replay old notifications.
 */
const POLL_MS = Number(process.env.PUSH_WORKER_POLL_MS) || 10_000
const LOOKBACK_MS = 15 * 60_000
const BATCH = 100

declare global {
  // eslint-disable-next-line no-var
  var __pushWorkerStarted: boolean | undefined
}

const notPushed = { OR: [{ pushedAt: null }, { pushedAt: { isSet: false } }] }

async function tick(): Promise<void> {
  const rows = await prisma.notification.findMany({
    where: { createdAt: { gte: new Date(Date.now() - LOOKBACK_MS) }, ...notPushed },
    orderBy: { createdAt: "asc" },
    take: BATCH,
    select: { id: true, userId: true, type: true, title: true, message: true, referenceType: true, referenceId: true },
  })

  for (const row of rows) {
    const claimed = await prisma.notification.updateMany({
      where: { id: row.id, ...notPushed },
      data: { pushedAt: new Date() },
    })
    if (claimed.count !== 1) continue // another worker took it
    await pushNotification(row)
  }
}

export function startPushWorker(): void {
  if (globalThis.__pushWorkerStarted) return
  globalThis.__pushWorkerStarted = true
  console.log(`[push-worker] started (every ${POLL_MS / 1000}s)`)

  let running = false
  setInterval(() => {
    if (running) return
    running = true
    tick()
      .catch((e) => console.error("[push-worker] tick failed", e))
      .finally(() => {
        running = false
      })
  }, POLL_MS)
}
