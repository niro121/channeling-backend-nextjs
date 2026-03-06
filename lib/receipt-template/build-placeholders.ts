import { format } from "date-fns"
import type { ReceiptPlaceholderMap } from "@/types/receipt-template-db"
import type { LedgerReceiptDetail } from "@/services/ledger/get-ledger-receipt.service"

/**
 * Build placeholder map for ledger receipt (for DB template replacement).
 * Keys match {{placeholder_name}} in template content.
 */
export function buildPlaceholdersForLedger(
  receipt: LedgerReceiptDetail,
  options: {
    companyName?: string
    locationLine?: string
    tel?: string
    email?: string
    web?: string
  } = {}
): ReceiptPlaceholderMap {
  const locationName = receipt.locationName ?? ""
  const companyName = options.companyName ?? locationName ?? "Ledger"
  const locationLine = options.locationLine ?? locationName
  const dateTime = format(new Date(receipt.createdAt), "yyyy-MM-dd hh:mm a")
  const amountStr = receipt.amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const comment =
    receipt.remarks ||
    (receipt.bank ? `Bank: ${receipt.bank}` : "") ||
    (receipt.agencyName ? `Agency: ${receipt.agencyName}` : "") ||
    "—"
  const generatedBy =
    receipt.createdByName && receipt.createdById
      ? `${receipt.createdByName} (${receipt.createdById})`
      : ""
  const generatedAt = format(new Date(), "dd/MM/yyyy HH.mm")
  const agencyLabel =
    receipt.agencyCode && receipt.agencyName
      ? `${receipt.agencyName} (${receipt.agencyCode})`
      : receipt.agencyName ?? "—"

  return {
    company_name: companyName,
    location_name: locationLine,
    tel: options.tel ?? "",
    email: options.email ?? "",
    web: options.web ?? "",
    receipt_no: receipt.receiptNoString,
    date_time: dateTime,
    title: receipt.methodName,
    amount: amountStr,
    branch_name: locationName,
    remarks: receipt.remarks ?? "",
    generated_by: generatedBy,
    generated_at: generatedAt,
    transaction_type: receipt.paymentMethodName,
    agency_name: agencyLabel,
    agency_code: receipt.agencyCode ?? "",
    payment_method: receipt.paymentMethodName,
    comment,
    bank: receipt.bank ?? "",
    card_reference: receipt.cardReference ?? "",
    slip_reference: receipt.slipReference ?? "",
  }
}
