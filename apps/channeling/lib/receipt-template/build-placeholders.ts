import { format } from "date-fns"
import type { ReceiptPlaceholderMap } from "@/types/receipt-template-db"
import type { LedgerReceiptDetail } from "@/services/ledger/get-ledger-receipt.service"
import { RECEIPT_PAYMENT_METHOD } from "@/types/receipt"
import type { DoctorPaymentReceiptDetail } from "@/services/doctor-payment/get-doctor-payment-receipt-detail.service"
import { RUHUNU_HOSPITAL } from "@/lib/receipt-template/ruhunu-hospital"

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
    location_address: locationLine,
    tel: options.tel ?? RUHUNU_HOSPITAL.phone,
    email: options.email ?? RUHUNU_HOSPITAL.email,
    web: options.web ?? RUHUNU_HOSPITAL.web,
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

export type LedgerReceiptPrintLineInput = {
  mode: string
  paymentDetails: string
  transactionNo: string
  amount: string
}

export type LedgerReceiptPrintInput = {
  companyName: string
  locationName?: string
  locationAddress: string
  title: string
  receiptNo: string
  dateTime: string
  agentName: string
  agentCode: string
  agentCity: string
  agentContact: string
  branchName: string
  transactionType: string
  showAgentFields: boolean
  lines: LedgerReceiptPrintLineInput[]
  totalAmount: string
  remarks: string
  generatedBy: string
  statusBanner?: string
  duplicateLabel?: string
}

function escapePlaceholder(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function formatLedgerInfoBlock(input: LedgerReceiptPrintInput): string {
  const row = (label: string, value: string) =>
    `<tr>
      <td class="label">${label}</td>
      <td class="colon">:</td>
      <td class="value">${value}</td>
    </tr>`
  const rows = input.showAgentFields
    ? [
        row("Receipt No", escapePlaceholder(input.receiptNo)),
        row("Date/Time", escapePlaceholder(input.dateTime)),
        row("Agent Name", escapePlaceholder(input.agentName)),
        row("Agent Code", escapePlaceholder(input.agentCode)),
        row("Agent City", escapePlaceholder(input.agentCity)),
        row("Contact No", escapePlaceholder(input.agentContact)),
      ]
    : [
        row("Receipt No", escapePlaceholder(input.receiptNo)),
        row("Date/Time", escapePlaceholder(input.dateTime)),
        row("Branch", escapePlaceholder(input.branchName)),
        row("Transaction Type", escapePlaceholder(input.transactionType)),
      ]
  return `<table class="info-grid"><tbody>${rows.join("")}</tbody></table>`
}

function formatLedgerPaymentTable(lines: LedgerReceiptPrintLineInput[], totalAmount: string): string {
  const rows = lines
    .map((line) => {
      return `<tr>
        <td class="mode">${escapePlaceholder(line.mode)}</td>
        <td class="amt">${escapePlaceholder(line.amount)}</td>
      </tr>`
    })
    .join("")
  return `<table class="lines">
    <thead>
      <tr>
        <th class="mode">Mode</th>
        <th class="amt">Amount (Rs)</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr>
        <td class="total-label">Total</td>
        <td class="amt">${escapePlaceholder(totalAmount)}</td>
      </tr>
    </tbody>
  </table>`
}

/** TSV line_items: siNo, mode, paymentDetails, transactionNo, amount */
function formatLedgerLineItems(lines: LedgerReceiptPrintLineInput[]): string {
  return lines
    .map((line, index) =>
      [
        String(index + 1).padStart(2, "0"),
        line.mode,
        line.paymentDetails,
        line.transactionNo,
        line.amount,
      ].join("\t")
    )
    .join("\n")
}

/**
 * Placeholders for the Sails-style agent / ledger receipt (dot-matrix).
 */
export function buildPlaceholdersForLedgerReceipt(
  input: LedgerReceiptPrintInput
): ReceiptPlaceholderMap {
  const generatedAt = format(new Date(), "dd/MM/yyyy HH.mm")
  const first = input.lines[0]
  const statusBanner = (input.statusBanner ?? "").trim()
  return {
    company_name: escapePlaceholder(input.companyName),
    location_name: escapePlaceholder(input.locationName || input.companyName),
    location_address: escapePlaceholder(input.locationAddress),
    tel: escapePlaceholder(RUHUNU_HOSPITAL.phone),
    email: escapePlaceholder(RUHUNU_HOSPITAL.email),
    web: escapePlaceholder(RUHUNU_HOSPITAL.web),
    title: escapePlaceholder(input.title),
    receipt_no: escapePlaceholder(input.receiptNo),
    date_time: escapePlaceholder(input.dateTime),
    agency_name: escapePlaceholder(input.agentName),
    agency_code: escapePlaceholder(input.agentCode),
    agent_city: escapePlaceholder(input.agentCity),
    agent_contact: escapePlaceholder(input.agentContact),
    branch_name: escapePlaceholder(input.branchName),
    transaction_type: escapePlaceholder(input.transactionType),
    show_agent_fields: input.showAgentFields ? "1" : "",
    line_items: formatLedgerLineItems(input.lines),
    payment_table: formatLedgerPaymentTable(input.lines, input.totalAmount),
    info_block: formatLedgerInfoBlock(input),
    mode: escapePlaceholder(first?.mode ?? ""),
    payment_details: escapePlaceholder(first?.paymentDetails ?? ""),
    transaction_no: escapePlaceholder(first?.transactionNo ?? ""),
    amount: escapePlaceholder(input.totalAmount),
    remarks: escapePlaceholder(input.remarks),
    generated_by: escapePlaceholder(input.generatedBy),
    generated_at: escapePlaceholder(generatedAt),
    status_banner: statusBanner
      ? `<div class="status-banner">${escapePlaceholder(statusBanner)}</div>`
      : "",
    duplicate_label: escapePlaceholder(input.duplicateLabel ?? ""),
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
  hospitalFee: string
  hospitalFeeDiscount: string
  totalHospitalFee: string
  professionalFee: string
  professionalFeeDiscount: string
  totalProfessionalFee: string
  billedAt: string
  cashierCode: string
  invoiceStatus: string
  printedBy: string
  debiter: string
  showProfessionalBill: boolean
  billedBy: string
  remarks: string
  area: string
  refundLine: string
  refundAmount: string
  refundReceiptNo: string
  refundReason: string
  /** Who approved the paid cancel or refund. Blank when there was no approval. */
  approvedBy: string
  generatedBy: string
  companyName?: string
  locationName?: string
  locationAddress?: string
  email?: string
  web?: string
  duplicateLabel?: string
  statusBanner?: string
}

/**
 * Placeholders for the Sails-style hospital + professional bill.
 * Empty refund_* values stay blank on a normal paid print.
 */
export function buildPlaceholdersForBookingReceipt(
  input: BookingReceiptPrintInput
): ReceiptPlaceholderMap {
  const generatedAt = format(new Date(), "dd/MM/yyyy HH.mm")
  const locationName = input.locationName || RUHUNU_HOSPITAL.name
  const locationAddress = input.locationAddress || RUHUNU_HOSPITAL.address
  const companyName = input.companyName || locationName
  return {
    company_name: companyName,
    location_name: locationName,
    location_address: locationAddress,
    tel: RUHUNU_HOSPITAL.phone,
    email: input.email ?? RUHUNU_HOSPITAL.email,
    web: input.web ?? RUHUNU_HOSPITAL.web,
    duplicate_label: input.duplicateLabel ?? "",
    status_banner: input.statusBanner ?? "",
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
    hospital_fee: input.hospitalFee,
    hospital_fee_discount: input.hospitalFeeDiscount,
    total_hospital_fee: input.totalHospitalFee,
    professional_fee: input.professionalFee,
    professional_fee_discount: input.professionalFeeDiscount,
    total_professional_fee: input.totalProfessionalFee,
    billed_at: input.billedAt,
    cashier_code: input.cashierCode,
    invoice_status: input.invoiceStatus,
    printed_by: input.printedBy,
    debiter: input.debiter,
    show_professional_bill: input.showProfessionalBill ? "1" : "",
    billed_by: input.billedBy,
    remarks: input.remarks,
    area: input.area,
    refund_line: input.refundLine,
    refund_amount: input.refundAmount,
    refund_receipt_no: input.refundReceiptNo,
    refund_reason: input.refundReason,
    approved_by: input.approvedBy,
    generated_by: input.generatedBy,
    generated_at: generatedAt,
    phone: input.tel,
  }
}
