/**
 * Data shape for the receipt template component.
 * Similar to SMS templates: structure is fixed, values are filled from data (placeholders).
 */

export type ReceiptTemplateHeader = {
  /** e.g. "RH Channel" */
  companyName: string
  /** e.g. "Ruhunu Hospital, Karapitiya, Galle" */
  locationName?: string
  tel?: string
  email?: string
  web?: string
}

export type ReceiptTemplateTable = {
  /** Column keys and labels, e.g. [{ key: "receiptNo", label: "Receipt No" }] */
  columns: { key: string; label: string }[]
  /** Each row is an object keyed by column key */
  rows: Record<string, string>[]
  /** Label for total row, e.g. "Total" */
  totalLabel?: string
  /** Column key that holds the amount to sum (e.g. "amount") */
  totalAmountKey?: string
  /** Column key where total label is shown (e.g. "comment" or "transactionType"). If omitted, uses second column. */
  totalLabelColumnKey?: string
}

export type ReceiptTemplateData = {
  header: ReceiptTemplateHeader
  /** Document title, e.g. "Debit Note", "Expenses Note", "Agent Receipt" */
  title: string
  /** Optional date/time line above the table, e.g. "Date/Time : 2026-03-05 12:15 AM" */
  dateTime?: string
  /** Main table (receipt lines + total) */
  table: ReceiptTemplateTable
  /** Optional remarks line, e.g. "Remarks : 100" */
  remarks?: string
  /** e.g. "D G HASHANI MADUSHIKA (1063)" */
  generatedBy?: string
  /** e.g. "05/03/2026 11.08" */
  generatedAt?: string
}
