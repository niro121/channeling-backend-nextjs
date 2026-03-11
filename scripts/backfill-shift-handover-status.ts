/**
 * One-time backfill: set existing ShiftHandover rows so they are not shown as pending.
 * After introducing handover approval flow, status 0 = PENDING. Old handovers were
 * completed immediately (journal created, shift ended) so they should be APPROVED (1).
 * Run once after deploying the new schema.
 * Usage: npx tsx scripts/backfill-shift-handover-status.ts
 */

import "dotenv/config"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const HANDOVER_STATUS = { PENDING: 0, APPROVED: 1, REJECTED: 2, CANCELLED: 3 }

async function main() {
  const pending = await prisma.shiftHandover.findMany({
    where: { status: HANDOVER_STATUS.PENDING },
    select: { id: true, journalId: true },
  })
  let approved = 0
  let cancelled = 0
  for (const h of pending) {
    if (h.journalId != null) {
      await prisma.shiftHandover.update({
        where: { id: h.id },
        data: { status: HANDOVER_STATUS.APPROVED },
      })
      approved++
    } else {
      await prisma.shiftHandover.update({
        where: { id: h.id },
        data: { status: HANDOVER_STATUS.CANCELLED },
      })
      cancelled++
    }
  }
  console.log(
    `Backfill complete: ${approved} handover(s) set to APPROVED, ${cancelled} set to CANCELLED.`
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
