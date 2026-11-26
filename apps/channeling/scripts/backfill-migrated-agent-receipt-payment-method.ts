/**
 * One-time fix for migrated counter-agent bookings.
 *
 * The old app saved an agent booking as channel method 2 and receipt payment
 * type 0 (cash). This app only offers "Refund to Agent" when
 * receiptPaymentMethod is 4. New agent bookings already store 4.
 *
 * A booking is migrated only when migrateSourceId is set. That value is the
 * legacy booking id, written only by scripts/migrate-sessions-bookings.ts.
 * Save-booking and the public API leave it null, so new rows are not selected.
 *
 * Updated when all of these are true:
 *   - migrateSourceId is a non-empty legacy id
 *   - method is 2 (agent channel)
 *   - agencyId is set (refund-to-agent requires an agency)
 *   - receiptPaymentMethod is 0 or null
 *
 * Left alone:
 *   - new bookings (no migrateSourceId), including agent bookings already at 4
 *   - migrated agent bookings already at 4
 *   - migrated agent bookings paid by card, slip, or another method
 *     (the old online-agent path stored card as 1)
 *
 * A later migrate:sessions-bookings --no-wipe would copy receipt_payment_method
 * from the legacy API again and put 0 back on these rows.
 *
 * Usage (from apps/channeling):
 *   npx tsx scripts/backfill-migrated-agent-receipt-payment-method.ts
 *   npx tsx scripts/backfill-migrated-agent-receipt-payment-method.ts --apply
 */
import "dotenv/config"
import type { Prisma } from "@prisma/client"
import prisma from "@/lib/prisma"

const AGENT_METHOD = 2
const CASH = 0
const AGENT_PAYMENT = 4

const APPLY = process.argv.includes("--apply")

const migratedWhere: Prisma.BookingWhereInput = {
  AND: [{ migrateSourceId: { not: null } }, { NOT: { migrateSourceId: "" } }],
}

const candidateWhere: Prisma.BookingWhereInput = {
  AND: [migratedWhere],
  method: AGENT_METHOD,
  agencyId: { not: null },
  OR: [{ receiptPaymentMethod: CASH }, { receiptPaymentMethod: null }],
}

const STATUS_LABEL: Record<number, string> = {
  0: "pending",
  1: "paid",
  2: "canceled",
  3: "refunded",
}

function statusLabel(status: number): string {
  return STATUS_LABEL[status] ?? `status ${status}`
}

async function main() {
  console.log(
    APPLY
      ? "[backfill-migrated-agent-payment] APPLY — rows will be updated after the count"
      : "[backfill-migrated-agent-payment] DRY RUN — no rows will be written. Pass --apply to update."
  )

  const [
    migratedTotal,
    migratedAgent,
    candidateCount,
    alreadyAgentPayment,
    paidCandidates,
    missingReceiptNo,
  ] = await Promise.all([
    prisma.booking.count({ where: migratedWhere }),
    prisma.booking.count({ where: { AND: [migratedWhere], method: AGENT_METHOD } }),
    prisma.booking.count({ where: candidateWhere }),
    prisma.booking.count({
      where: { AND: [migratedWhere], method: AGENT_METHOD, receiptPaymentMethod: AGENT_PAYMENT },
    }),
    prisma.booking.count({ where: { AND: [candidateWhere, { status: 1 }] } }),
    prisma.booking.count({
      where: {
        AND: [candidateWhere, { OR: [{ receiptNoString: null }, { receiptNoString: "" }] }],
      },
    }),
  ])

  const byPayment = await prisma.booking.groupBy({
    by: ["receiptPaymentMethod"],
    where: { AND: [migratedWhere], method: AGENT_METHOD, agencyId: { not: null } },
    _count: { _all: true },
  })

  const byStatus = await prisma.booking.groupBy({
    by: ["status"],
    where: candidateWhere,
    _count: { _all: true },
  })

  const samples = await prisma.booking.findMany({
    where: candidateWhere,
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      bookingid_string: true,
      status: true,
      method: true,
      receiptPaymentMethod: true,
      receiptNoString: true,
      migrateSourceId: true,
    },
  })

  const referenceKeys = ["RHCHANN/01013267", "RHCHANN/01013814"]
  const references = await prisma.booking.findMany({
    where: {
      OR: [{ bookingid_string: { in: referenceKeys } }, { receiptNoString: { in: referenceKeys } }],
    },
    select: {
      bookingid_string: true,
      status: true,
      method: true,
      receiptPaymentMethod: true,
      receiptNoString: true,
      migrateSourceId: true,
      agencyId: true,
    },
  })

  console.log("")
  console.log(`Migrated bookings (migrateSourceId set): ${migratedTotal}`)
  console.log(`  of which agent channel (method 2): ${migratedAgent}`)
  console.log(`  of which already receiptPaymentMethod 4 (left alone): ${alreadyAgentPayment}`)
  console.log("")
  console.log("Migrated agent bookings with an agency, by current receiptPaymentMethod:")
  for (const row of byPayment.sort((a, b) => (a.receiptPaymentMethod ?? -1) - (b.receiptPaymentMethod ?? -1))) {
    const method = row.receiptPaymentMethod == null ? "null" : String(row.receiptPaymentMethod)
    const mark = row.receiptPaymentMethod === CASH || row.receiptPaymentMethod == null ? "  <-- will update" : ""
    console.log(`  ${method}: ${row._count._all}${mark}`)
  }
  console.log("")
  console.log(`Would update: ${candidateCount}`)
  console.log(`  paid (status 1, cancel screen): ${paidCandidates}`)
  console.log(`  missing receiptNoString (dropdown still hidden until a receipt number exists): ${missingReceiptNo}`)
  console.log("By status:")
  for (const row of byStatus.sort((a, b) => a.status - b.status)) {
    console.log(`  ${statusLabel(row.status)}: ${row._count._all}`)
  }
  console.log("")
  console.log("Sample of rows that would change:")
  for (const row of samples) {
    console.log(
      `  ${row.bookingid_string ?? "(no booking id)"} status=${statusLabel(row.status)} method=${row.method} receiptPaymentMethod=${row.receiptPaymentMethod ?? "null"} receipt=${row.receiptNoString || "(none)"} migrateSourceId=${row.migrateSourceId}`
    )
  }
  console.log("")
  console.log("Reference bookings:")
  if (references.length === 0) {
    console.log("  RHCHANN/01013267 and RHCHANN/01013814 were not found as booking id or receipt number")
  }
  for (const row of references) {
    const selected =
      Boolean(row.migrateSourceId) &&
      row.method === AGENT_METHOD &&
      Boolean(row.agencyId) &&
      (row.receiptPaymentMethod === CASH || row.receiptPaymentMethod == null)
    console.log(
      `  booking=${row.bookingid_string ?? "(none)"} receipt=${row.receiptNoString || "(none)"} migrateSourceId=${row.migrateSourceId ?? "null"} method=${row.method} receiptPaymentMethod=${row.receiptPaymentMethod ?? "null"} agency=${row.agencyId ? "yes" : "no"} ${selected ? "INCLUDED" : "EXCLUDED"}`
    )
  }

  if (!APPLY) {
    console.log("")
    console.log(`[backfill-migrated-agent-payment] dry run done. ${candidateCount} row(s) would be set to receiptPaymentMethod ${AGENT_PAYMENT}.`)
    return
  }

  const result = await prisma.booking.updateMany({
    where: candidateWhere,
    data: { receiptPaymentMethod: AGENT_PAYMENT },
  })
  console.log("")
  console.log(
    `[backfill-migrated-agent-payment] updated ${result.count} row(s) to receiptPaymentMethod ${AGENT_PAYMENT}.`
  )
}

main()
  .catch((error) => {
    console.error("[backfill-migrated-agent-payment] failed", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
