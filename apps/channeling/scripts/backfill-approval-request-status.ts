/**
 * Convert ApprovalRequest.status from string labels (pending/approved/…)
 * to Int (0–4), matching FloatRequest / ShiftHandover.
 *
 * Safe to re-run: already-numeric statuses are left alone.
 *
 * Usage (from apps/channeling):
 *   Dry run (default):
 *     npx tsx scripts/backfill-approval-request-status.ts
 *
 *   Apply:
 *     npx tsx scripts/backfill-approval-request-status.ts --apply
 */

import "dotenv/config"
import prisma from "@/lib/prisma"
import { APPROVAL_REQUEST_STATUS } from "@/types/approval-request"

const STRING_TO_INT: Record<string, number> = {
  pending: APPROVAL_REQUEST_STATUS.PENDING,
  approved: APPROVAL_REQUEST_STATUS.APPROVED,
  rejected: APPROVAL_REQUEST_STATUS.REJECTED,
  withdrawn: APPROVAL_REQUEST_STATUS.WITHDRAWN,
  completed: APPROVAL_REQUEST_STATUS.COMPLETED,
}

type CliArgs = { apply: boolean }

function parseArgs(argv: string[]): CliArgs {
  return { apply: argv.includes("--apply") }
}

function modifiedCount(result: unknown): number {
  if (!result || typeof result !== "object") return 0
  const row = result as { nModified?: number; n?: number }
  return Number(row.nModified ?? row.n ?? 0)
}

async function main() {
  const { apply } = parseArgs(process.argv.slice(2))
  console.log(apply ? "Applying status backfill…" : "Dry run (pass --apply to write)")

  let total = 0
  for (const [from, to] of Object.entries(STRING_TO_INT)) {
    if (!apply) {
      const counted = await prisma.$runCommandRaw({
        count: "ApprovalRequest",
        query: { status: from },
      })
      const n = Number((counted as { n?: number })?.n ?? 0)
      console.log(`  status "${from}" -> ${to}: ${n} document(s)`)
      total += n
      continue
    }

    const result = await prisma.$runCommandRaw({
      update: "ApprovalRequest",
      updates: [{ q: { status: from }, u: { $set: { status: to } }, multi: true }],
    })
    const n = modifiedCount(result)
    console.log(`  status "${from}" -> ${to}: updated ${n}`)
    total += n
  }

  console.log(apply ? `Done. Updated ${total} document(s).` : `Dry run complete. ${total} document(s) would be updated.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
