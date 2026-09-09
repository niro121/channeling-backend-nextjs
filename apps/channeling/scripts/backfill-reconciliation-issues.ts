/**
 * Set hasReconciliationIssues on handovers that already have
 * "can't reconcile" receipts or payment lines.
 *
 * Usage (from apps/channeling):
 *   Dry run:
 *     npx tsx scripts/backfill-reconciliation-issues.ts
 *
 *   Apply:
 *     npx tsx scripts/backfill-reconciliation-issues.ts --apply
 */

import "dotenv/config"
import prisma from "@/lib/prisma"

function parseApply(argv: string[]): boolean {
  return argv.includes("--apply")
}

async function main() {
  const apply = parseApply(process.argv.slice(2))

  const receipts = await prisma.receipt.findMany({
    where: { cannotReconcileAt: { not: null } },
    select: { id: true, reconciledHandoverId: true },
  })

  const cannotLines = await prisma.receiptPaymentLine.findMany({
    where: { cannotReconcileAt: { not: null } },
    select: { receipt: { select: { reconciledHandoverId: true } } },
  })

  const handoverIds = new Set<string>()
  for (const r of receipts) {
    if (r.reconciledHandoverId) handoverIds.add(r.reconciledHandoverId)
  }
  for (const line of cannotLines) {
    if (line.receipt.reconciledHandoverId) handoverIds.add(line.receipt.reconciledHandoverId)
  }

  const ids = [...handoverIds]
  console.log(`Receipts marked can't reconcile: ${receipts.length}`)
  console.log(`Payment lines marked can't reconcile: ${cannotLines.length}`)
  console.log(`Handovers linked via reconciledHandoverId: ${ids.length}`)

  if (ids.length === 0) {
    console.log("Nothing to backfill.")
    return
  }

  const already = await prisma.shiftHandover.findMany({
    where: { id: { in: ids }, hasReconciliationIssues: true },
    select: { id: true, handoverNoString: true },
  })
  const alreadyIds = new Set(already.map((h) => h.id))
  const toUpdate = ids.filter((id) => !alreadyIds.has(id))

  const targets = await prisma.shiftHandover.findMany({
    where: { id: { in: toUpdate } },
    select: { id: true, handoverNoString: true, reconciliationStatus: true },
  })

  console.log(`Already flagged: ${already.length}`)
  console.log(`To flag: ${targets.length}`)
  for (const h of targets) {
    console.log(`  ${h.handoverNoString ?? h.id} (status ${h.reconciliationStatus ?? "—"})`)
  }

  if (!apply) {
    console.log("Dry run. Re-run with --apply to update.")
    return
  }

  if (targets.length === 0) {
    console.log("No updates needed.")
    return
  }

  const result = await prisma.shiftHandover.updateMany({
    where: { id: { in: targets.map((h) => h.id) } },
    data: { hasReconciliationIssues: true },
  })
  console.log(`Updated ${result.count} handover(s).`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
