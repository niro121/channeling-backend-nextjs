import prisma from "@/lib/prisma"
import { PAYMENT_METHOD_NAMES, RECEIPT_METHOD_NAMES } from "@/types/receipt"
import { resolveUser } from "./helpers/resolve-user"

export type ReceiptDetailsView = {
  id: string
  receiptNoString: string
  type: string
  paymentMethodName: string
  amount: number
  remarks: string
  processedBy: string
  createdAt: Date
  bank: string
  cardReference: string
  slipReference: string
  paymentLines: Array<{ paymentMethod: number; paymentMethodName: string; amount: number }>
}

/**
 * Fetch full receipt details by id (for receipt details popup). Includes bank, card reference, slip reference.
 */
export async function getReceiptDetailsService(
  receiptId: string
): Promise<{ success: boolean; data?: ReceiptDetailsView; message?: string }> {
  try {
    const r = await prisma.receipt.findUnique({
      where: { id: receiptId },
      include: { paymentLines: true },
    })
    if (!r) {
      return { success: false, message: "Receipt not found." }
    }
    const createdByName = await resolveUser(r.createdBy)
    const processedBy = r.createdBy
      ? `${createdByName} (${r.createdBy}) ${r.createdAt.toLocaleString("en-CA", { dateStyle: "short", timeStyle: "short" })}`
      : "—"
    const data: ReceiptDetailsView = {
      id: r.id,
      receiptNoString: r.receiptNoString,
      type: RECEIPT_METHOD_NAMES[r.method] ?? "—",
      paymentMethodName: PAYMENT_METHOD_NAMES[r.paymentMethod] ?? "—",
      amount: r.amount,
      remarks: r.remarks ?? "",
      processedBy,
      createdAt: r.createdAt,
      bank: r.bank ?? "",
      cardReference: r.cardReference ?? "",
      slipReference: r.slipReference ?? "",
      paymentLines: r.paymentLines.map((line) => ({
        paymentMethod: line.paymentMethod,
        paymentMethodName: PAYMENT_METHOD_NAMES[line.paymentMethod] ?? "—",
        amount: line.amount,
      })),
    }
    return { success: true, data }
  } catch (error) {
    console.error("getReceiptDetailsService error", error)
    const message = error instanceof Error ? error.message : "Failed to load receipt details"
    return { success: false, message }
  }
}
