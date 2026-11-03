import "dotenv/config"
import prisma from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

const BATCH_SIZE = 500

async function main() {
  let processed = 0
  let created = 0
  let cursor: string | null = null

  // Backfill legacy receipts that do not have any payment lines.
  for (;;) {
    const receipts: Array<{
      id: string
      paymentMethod: number
      amount: number
      paymentLines: Array<{ id: string }>
    }> = await prisma.receipt.findMany({
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      select: {
        id: true,
        paymentMethod: true,
        amount: true,
        paymentLines: { select: { id: true }, take: 1 },
      },
    })

    if (receipts.length === 0) break
    cursor = receipts[receipts.length - 1]?.id ?? null

    const missing = receipts.filter((r) => r.paymentLines.length === 0)
    if (missing.length > 0) {
      const rows: Prisma.ReceiptPaymentLineCreateManyInput[] = missing.map((r) => ({
        receiptId: r.id,
        paymentMethod: r.paymentMethod,
        amount: r.amount,
        bank: "",
        bankId: null,
        cardReference: "",
        slipReference: "",
      }))
      const result = await prisma.receiptPaymentLine.createMany({
        data: rows,
      })
      created += result.count
    }
    processed += receipts.length
    console.log(`[backfill-receipt-payment-lines] processed=${processed} created=${created}`)
  }

  const totalReceipts = await prisma.receipt.count()
  const totalLines = await prisma.receiptPaymentLine.count()
  console.log(
    `[backfill-receipt-payment-lines] done totalReceipts=${totalReceipts} totalPaymentLines=${totalLines}`
  )
}

main()
  .catch((error) => {
    console.error("[backfill-receipt-payment-lines] failed", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
