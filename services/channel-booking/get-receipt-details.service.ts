import prisma from "@/lib/prisma"
import { resolveUser } from "./helpers/resolve-user"

const PAYMENT_METHOD_NAMES: Record<number, string> = {
  0: "Cash",
  1: "Credit Card",
  2: "Slip",
  3: "Cheque",
  4: "Agent",
  5: "Credit",
}

const RECEIPT_METHOD_NAMES: Record<number, string> = {
  0: "Refund",
  1: "Settlement",
  2: "Debit Note",
  3: "Credit Note",
  4: "Doctor Payment",
  5: "Doctor Cancel",
}

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
    }
    return { success: true, data }
  } catch (error) {
    console.error("getReceiptDetailsService error", error)
    const message = error instanceof Error ? error.message : "Failed to load receipt details"
    return { success: false, message }
  }
}
