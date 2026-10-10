import prisma from "@/lib/prisma"
import { PAYMENT_METHOD_NAMES, RECEIPT_METHOD, RECEIPT_METHOD_NAMES } from "@/types/receipt"
import { formatSlipDate } from "@/lib/slip-date"
import { getCompletedChannelApprovals } from "@/services/approval-request.service"
import { resolveUser } from "./helpers/resolve-user"
import { toApprovalDisplays, type CancelApprovalDisplay } from "./get-booking-details.service"

export type ReceiptDetailsView = {
  id: string
  receiptNoString: string
  type: string
  paymentMethodName: string
  amount: number
  remarks: string
  processedBy: string
  /** Who approved the paid cancel or refund this receipt belongs to. */
  approvals: CancelApprovalDisplay[]
  createdAt: Date
  bank: string
  cardReference: string
  slipReference: string
  /** YYYY-MM-DD when set */
  slipDate: string | null
  paymentLines: Array<{
    paymentMethod: number
    paymentMethodName: string
    amount: number
    bank: string
    cardReference: string
    slipReference: string
    /** YYYY-MM-DD when set */
    slipDate: string | null
  }>
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
    const [createdByName, completedApprovals] = await Promise.all([
      resolveUser(r.createdBy),
      r.method === RECEIPT_METHOD.REFUND && r.bookingId
        ? getCompletedChannelApprovals(r.bookingId)
        : Promise.resolve([]),
    ])
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
      approvals: toApprovalDisplays(completedApprovals),
      createdAt: r.createdAt,
      bank: r.bank ?? "",
      cardReference: r.cardReference ?? "",
      slipReference: r.slipReference ?? "",
      slipDate: formatSlipDate(r.slipDate) ?? null,
      paymentLines: r.paymentLines.map((line) => ({
        paymentMethod: line.paymentMethod,
        paymentMethodName: PAYMENT_METHOD_NAMES[line.paymentMethod] ?? "—",
        amount: line.amount,
        bank: line.bank ?? "",
        cardReference: line.cardReference ?? "",
        slipReference: line.slipReference ?? "",
        slipDate: formatSlipDate(line.slipDate) ?? null,
      })),
    }
    return { success: true, data }
  } catch (error) {
    console.error("getReceiptDetailsService error", error)
    const message = error instanceof Error ? error.message : "Failed to load receipt details"
    return { success: false, message }
  }
}
