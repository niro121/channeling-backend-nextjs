/**
 * One-time backfill: parse legacy ledger remarks `| Slip Date: YYYY-MM-DD`
 * into Receipt.slipDate (and matching payment line when single slip).
 *
 * Usage: npx tsx scripts/backfill-receipt-slip-date.ts
 */
import "dotenv/config"
import prisma from "@/lib/prisma"
import {
  extractSlipDateFromRemarks,
  parseSlipDateInput,
} from "@/lib/slip-date"
import { RECEIPT_PAYMENT_METHOD } from "@/types/receipt"

const BATCH_SIZE = 500

async function main() {
  let processed = 0
  let updated = 0
  let cursor: string | null = null

  for (;;) {
    const receipts: Array<{
      id: string
      remarks: string
      paymentMethod: number
      paymentLines: Array<{ id: string; paymentMethod: number; slipDate: Date | null }>
    }> = await prisma.receipt.findMany({
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      where: {
        slipDate: null,
        remarks: { contains: "Slip Date:" },
      },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      select: {
        id: true,
        remarks: true,
        paymentMethod: true,
        paymentLines: { select: { id: true, paymentMethod: true, slipDate: true } },
      },
    })

    if (receipts.length === 0) break
    cursor = receipts[receipts.length - 1]?.id ?? null

    for (const receipt of receipts) {
      const ymd = extractSlipDateFromRemarks(receipt.remarks)
      const slipDate = parseSlipDateInput(ymd)
      if (!slipDate) continue

      await prisma.receipt.update({
        where: { id: receipt.id },
        data: { slipDate },
      })

      const slipLines = receipt.paymentLines.filter(
        (l: { id: string; paymentMethod: number; slipDate: Date | null }) =>
          l.paymentMethod === RECEIPT_PAYMENT_METHOD.SLIP && l.slipDate == null
      )
      if (slipLines.length > 0) {
        await prisma.receiptPaymentLine.updateMany({
          where: { id: { in: slipLines.map((l: { id: string }) => l.id) } },
          data: { slipDate },
        })
      }
      updated += 1
    }

    processed += receipts.length
    console.log(`[backfill-receipt-slip-date] processed=${processed} updated=${updated}`)
  }

  console.log(`[backfill-receipt-slip-date] done processed=${processed} updated=${updated}`)
}

main()
  .catch((error) => {
    console.error("[backfill-receipt-slip-date] failed", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
