/**
 * DB-backed receipt templates: header, footer, and main template with placeholders.
 * Placeholders use {{placeholder_name}} in content; replaced at print time.
 */

export type ReceiptHeaderTemplateRecord = {
  id: string
  name: string
  content: string
  createdAt?: Date
  updatedAt?: Date
}

export type ReceiptFooterTemplateRecord = {
  id: string
  name: string
  content: string
  createdAt?: Date
  updatedAt?: Date
}

export type ReceiptTemplateRecord = {
  id: string
  name: string
  type: string
  variant: string
  headerTemplateId: string | null
  footerTemplateId: string | null
  bodyContent: string
  paperWidthMm: number | null
  paperHeightMm: number | null
  status: number
  createdAt?: Date
  updatedAt?: Date
  headerTemplate?: ReceiptHeaderTemplateRecord | null
  footerTemplate?: ReceiptFooterTemplateRecord | null
}

export const RECEIPT_TEMPLATE_TYPES = [
  { id: "ledger", name: "Ledger" },
  { id: "agent_receipt", name: "Agent Receipt" },
  { id: "expenses_note", name: "Expenses Note" },
  { id: "debit_note", name: "Debit Note" },
  { id: "booking_receipt", name: "Booking Receipt" },
] as const

export const RECEIPT_TEMPLATE_VARIANTS = [
  { id: "slip_printer", name: "Slip printer" },
  { id: "custom_size", name: "Custom size" },
] as const

/** Placeholders for header content */
export const RECEIPT_HEADER_PLACEHOLDERS = [
  "company_name",
  "location_name",
  "location_address",
  "tel",
  "email",
  "web",
] as const

/** Placeholders for body/footer and ledger data */
export const RECEIPT_BODY_PLACEHOLDERS = [
  "receipt_no",
  "date_time",
  "title",
  "amount",
  "branch_name",
  "remarks",
  "generated_by",
  "generated_at",
  "transaction_type",
  "agency_name",
  "agency_code",
  "payment_method",
  "comment",
  "bank",
  "card_reference",
  "slip_reference",
  "slip_date",
] as const

/** Placeholders for booking (Sails-style) hospital + professional bill print */
export const BOOKING_RECEIPT_PLACEHOLDERS = [
  "duplicate_label",
  "status_banner",
  "patient_name",
  "consultant",
  "appointment_no",
  "appointment_date",
  "appointment_time",
  "tel",
  "phone",
  "booking_method",
  "bill_no",
  "bill_sub_total",
  "discount",
  "bill_total",
  "hospital_fee",
  "hospital_fee_discount",
  "total_hospital_fee",
  "professional_fee",
  "professional_fee_discount",
  "total_professional_fee",
  "billed_at",
  "cashier_code",
  "invoice_status",
  "printed_by",
  "debiter",
  "show_professional_bill",
  "billed_by",
  "remarks",
  "area",
  "refund_line",
  "refund_amount",
  "refund_receipt_no",
  "refund_reason",
  "generated_by",
  "generated_at",
  "company_name",
  "location_name",
  "location_address",
] as const

export type ReceiptPlaceholderMap = Record<string, string>
