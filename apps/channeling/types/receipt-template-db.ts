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
  { id: "doctor_payment", name: "Consultant Payment" },
] as const

export const RECEIPT_TEMPLATE_VARIANTS = [
  { id: "slip_printer", name: "Slip printer" },
  { id: "custom_size", name: "A5" },
] as const

/** Default print variant: A5 portrait for ledger (same as handover). */
export const RECEIPT_PRINT_VARIANT_DOT_MATRIX = "custom_size"

/** A5 portrait (handover default print). Ledger receipts use this size. */
export const A5_PAPER_WIDTH_MM = 148
export const A5_PAPER_HEIGHT_MM = 210

/** 9.5in × 11in tractor-feed (channel booking receipts). */
export const DOT_MATRIX_PAPER_WIDTH_MM = 241
export const DOT_MATRIX_PAPER_HEIGHT_MM = 279

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
  "agent_city",
  "agent_contact",
  "mode",
  "payment_details",
  "transaction_no",
  "line_items",
  "payment_table",
  "info_block",
  "show_agent_fields",
  "status_banner",
] as const

/** Placeholders for Sails-style ledger / agent receipt print */
export const LEDGER_RECEIPT_PLACEHOLDERS = [
  "company_name",
  "location_name",
  "location_address",
  "tel",
  "email",
  "web",
  "title",
  "receipt_no",
  "date_time",
  "agency_name",
  "agency_code",
  "agent_city",
  "agent_contact",
  "branch_name",
  "transaction_type",
  "show_agent_fields",
  "line_items",
  "payment_table",
  "info_block",
  "amount",
  "remarks",
  "generated_by",
  "generated_at",
  "status_banner",
  "duplicate_label",
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
