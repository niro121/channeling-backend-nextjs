import { format } from "date-fns"
import type { ReceiptPlaceholderMap } from "@/types/receipt-template-db"
import type { LedgerReceiptDetail } from "@/services/ledger/get-ledger-receipt.service"
import { RECEIPT_PAYMENT_METHOD } from "@/types/receipt"
import type { DoctorPaymentReceiptDetail } from "@/services/doctor-payment/get-doctor-payment-receipt-detail.service"

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
    ewallet_reference:
      receipt.paymentMethod === RECEIPT_PAYMENT_METHOD.E_WALLET
        ? (receipt.cardReference ?? "")
        : "",
    slip_reference: receipt.slipReference ?? "",
    slip_date: receipt.slipDate ?? "",
  }
}

/**
 * Build placeholder map for doctor payment (Consultant Payment) receipt.
 * Keys: consultant_name, document_status, invoice_no, line_items, sub_payable, wht, net_paid_amount,
 * total_patient_count, paid_to, paid_by, paid_on, generated_by, duplicate_label, company_name, location_name, generated_at.
 */
export function buildPlaceholdersForDoctorPayment(
  detail: DoctorPaymentReceiptDetail,
  options: { companyName?: string; duplicateLabel?: string } = {}
): ReceiptPlaceholderMap {
  const locationName = detail.locationName ?? ""
  const companyName = options.companyName ?? locationName ?? "Consultant Payment"
  const generatedBy =
    detail.createdByName && detail.createdById
      ? `${detail.createdByName} (${detail.createdById})`
      : detail.createdByName ?? ""
  const generatedAt = format(new Date(), "dd/MM/yyyy HH.mm")
  const paidOn = format(new Date(detail.createdAt), "dd MMM yyyy HH:mm")
  const lineItemsText = detail.lineItems
    .map(
      (row) =>
        `${row.date}\t${row.session}\t${row.noOfPatients}\t${row.receiptNo}\t${row.patientName}\t${row.amountRs.toFixed(2)}`
    )
    .join("\n")
  const headerRow = "Date\tSession\tNo of Patients\tReceipt No\tPatient Name\tAmount (Rs.)"
  const line_items = `${headerRow}\n${lineItemsText}`

  return {
    company_name: companyName,
    location_name: locationName,
    consultant_name: detail.consultantName,
    document_status: detail.documentStatus,
    invoice_no: detail.receiptNoString,
    line_items,
    sub_payable: detail.amount.toFixed(2),
    wht: detail.whd.toFixed(2),
    net_paid_amount: detail.netAmount.toFixed(2),
    total_patient_count: String(detail.totalPatientCount),
    paid_to: detail.consultantName,
    paid_by: generatedBy,
    paid_on: paidOn,
    generated_by: generatedBy,
    generated_at: generatedAt,
    duplicate_label: options.duplicateLabel ?? "",
    remarks: detail.remarks,
    slip_reference: detail.slipReference,
    slip_date: detail.slipDate ?? "",
  }
}

export type BookingReceiptPrintInput = {
  patientName: string
  consultant: string
  appointmentNo: string
  appointmentDate: string
  appointmentTime: string
  tel: string
  bookingMethod: string
  billNo: string
  billSubTotal: string
  discount: string
  billTotal: string
  billedBy: string
  remarks: string
  area: string
  refundLine: string
  refundAmount: string
  refundReceiptNo: string
  refundReason: string
  generatedBy: string
  companyName?: string
  locationName?: string
  email?: string
  web?: string
  duplicateLabel?: string
}

/**
 * Placeholders for the Sails-style booking patient bill.
 * Empty refund_* values stay blank on a normal paid print.
 */
export function buildPlaceholdersForBookingReceipt(
  input: BookingReceiptPrintInput
): ReceiptPlaceholderMap {
  const generatedAt = format(new Date(), "dd/MM/yyyy HH.mm")
  const locationName = input.locationName ?? ""
  const companyName = input.companyName ?? locationName
  return {
    company_name: companyName,
    location_name: locationName,
    tel: input.tel,
    email: input.email ?? "",
    web: input.web ?? "",
    duplicate_label: input.duplicateLabel ?? "",
    patient_name: input.patientName,
    consultant: input.consultant,
    appointment_no: input.appointmentNo,
    appointment_date: input.appointmentDate,
    appointment_time: input.appointmentTime,
    booking_method: input.bookingMethod,
    bill_no: input.billNo,
    bill_sub_total: input.billSubTotal,
    discount: input.discount,
    bill_total: input.billTotal,
    billed_by: input.billedBy,
    remarks: input.remarks,
    area: input.area,
    refund_line: input.refundLine,
    refund_amount: input.refundAmount,
    refund_receipt_no: input.refundReceiptNo,
    refund_reason: input.refundReason,
    generated_by: input.generatedBy,
    generated_at: generatedAt,
    phone: input.tel,
  }
}
