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
] as const

export const RECEIPT_TEMPLATE_VARIANTS = [
  { id: "slip_printer", name: "Slip printer" },
  { id: "custom_size", name: "Custom size" },
] as const

/** Placeholders for header content */
export const RECEIPT_HEADER_PLACEHOLDERS = [
  "company_name",
  "location_name",
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

export type ReceiptPlaceholderMap = Record<string, string>
