/**
 * Backfill Receipt.doctorId on doctor payment (method 4) and doctor cancel (method 5)
 * receipts from linked bookings, then from the original payment / journal lines.
 *
 * Usage: npx tsx scripts/backfill-receipt-doctor-id.ts
 */
import "dotenv/config"
import prisma from "@/lib/prisma"
import { RECEIPT_METHOD } from "@/types/receipt"
import { REFERENCE_TYPES } from "@/types/accounting"

const BATCH_SIZE = 200

async function doctorIdFromJournal(receiptIds: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  if (receiptIds.length === 0) return result
  const journals = await prisma.journal.findMany({
    where: {
      referenceType: REFERENCE_TYPES.Receipt,
      referenceId: { in: receiptIds },
    },
    select: {
      referenceId: true,
      journalLines: {
        select: {
          account: { select: { doctorId: true } },
        },
      },
    },
  })
  for (const journal of journals) {
    if (!journal.referenceId || result.has(journal.referenceId)) continue
    for (const line of journal.journalLines) {
      const id = line.account?.doctorId
      if (!id) continue
      result.set(journal.referenceId, id)
      break
    }
  }
  return result
}

async function main() {
  let processed = 0
  let updated = 0
  let skipped = 0
  let cursor: string | null = null

  for (;;) {
    const receipts: Array<{
      id: string
      method: number
      reversedReceiptId: string | null
    }> = await prisma.receipt.findMany({
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      where: {
        method: { in: [RECEIPT_METHOD.DOCTOR_PAYMENT, RECEIPT_METHOD.DOCTOR_CANCEL] },
        OR: [{ doctorId: null }, { doctorId: { isSet: false } }],
      },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      select: {
        id: true,
        method: true,
        reversedReceiptId: true,
      },
    })
    if (receipts.length === 0) break
    cursor = receipts[receipts.length - 1]?.id ?? null
    processed += receipts.length

    const paymentIds = receipts
      .filter((r) => r.method === RECEIPT_METHOD.DOCTOR_PAYMENT)
      .map((r) => r.id)
    const cancelOriginalIds = receipts
      .filter((r) => r.method === RECEIPT_METHOD.DOCTOR_CANCEL && r.reversedReceiptId)
      .map((r) => r.reversedReceiptId!) 

    const lookupIds = [...new Set([...paymentIds, ...cancelOriginalIds])]

    const doctorByReceiptId = new Map<string, string>()

    if (lookupIds.length > 0) {
      const originals = await prisma.receipt.findMany({
        where: { id: { in: lookupIds }, doctorId: { not: null } },
        select: { id: true, doctorId: true },
      })
      for (const r of originals) {
        if (r.doctorId) doctorByReceiptId.set(r.id, r.doctorId)
      }

      const stillMissing = lookupIds.filter((id) => !doctorByReceiptId.has(id))
      if (stillMissing.length > 0) {
        const bookings = await prisma.booking.findMany({
          where: { doctorPaymentReceiptId: { in: stillMissing } },
          select: { doctorPaymentReceiptId: true, doctorId: true },
        })
        for (const b of bookings) {
          if (!b.doctorPaymentReceiptId || !b.doctorId) continue
          if (doctorByReceiptId.has(b.doctorPaymentReceiptId)) continue
          doctorByReceiptId.set(b.doctorPaymentReceiptId, b.doctorId)
        }
      }

      const stillMissingAfterBookings = lookupIds.filter((id) => !doctorByReceiptId.has(id))
      const fromJournal = await doctorIdFromJournal(stillMissingAfterBookings)
      for (const [id, doctorId] of fromJournal) {
        doctorByReceiptId.set(id, doctorId)
      }
    }

    const stillNeedJournal = receipts
      .filter((r) => {
        if (r.method === RECEIPT_METHOD.DOCTOR_PAYMENT) return !doctorByReceiptId.has(r.id)
        if (r.reversedReceiptId && doctorByReceiptId.has(r.reversedReceiptId)) return false
        return true
      })
      .map((r) => r.id)
    const selfJournal = await doctorIdFromJournal(stillNeedJournal)
    for (const [id, doctorId] of selfJournal) {
      doctorByReceiptId.set(id, doctorId)
    }

    const updates: Array<{ id: string; doctorId: string }> = []
    for (const r of receipts) {
      const doctorId =
        doctorByReceiptId.get(r.id) ??
        (r.reversedReceiptId ? doctorByReceiptId.get(r.reversedReceiptId) : undefined)
      if (!doctorId) {
        skipped += 1
        continue
      }
      updates.push({ id: r.id, doctorId })
    }

    const byDoctor = new Map<string, string[]>()
    for (const u of updates) {
      const list = byDoctor.get(u.doctorId) ?? []
      list.push(u.id)
      byDoctor.set(u.doctorId, list)
    }
    for (const [doctorId, ids] of byDoctor) {
      const result = await prisma.receipt.updateMany({
        where: { id: { in: ids } },
        data: { doctorId },
      })
      updated += result.count
    }

    console.log(
      `[backfill-receipt-doctor-id] processed=${processed} updated=${updated} skipped=${skipped}`
    )
  }

  const remaining = await prisma.receipt.count({
    where: {
      method: { in: [RECEIPT_METHOD.DOCTOR_PAYMENT, RECEIPT_METHOD.DOCTOR_CANCEL] },
      OR: [{ doctorId: null }, { doctorId: { isSet: false } }],
    },
  })
  console.log(
    `[backfill-receipt-doctor-id] done updated=${updated} skipped=${skipped} remainingWithoutDoctorId=${remaining}`
  )
}

main()
  .catch((error) => {
    console.error("[backfill-receipt-doctor-id] failed", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
