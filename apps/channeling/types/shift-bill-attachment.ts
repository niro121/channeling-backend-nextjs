export const SHIFT_BILL_KINDS = ["SLIP", "CHEQUE", "CARD", "OTHER"] as const

export type ShiftBillKind = (typeof SHIFT_BILL_KINDS)[number]

export const SHIFT_BILL_KIND_LABELS: Record<ShiftBillKind, string> = {
  SLIP: "Slip",
  CHEQUE: "Cheque",
  CARD: "Card",
  OTHER: "Other",
}

export const SHIFT_BILL_ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const

export const SHIFT_BILL_MAX_BYTES = 2 * 1024 * 1024

export type ShiftBillAttachmentDto = {
  id: string
  shiftId: string
  handoverId: string | null
  contentType: string
  sizeBytes: number
  kind: ShiftBillKind | null
  note: string | null
  uploadedAt: string | null
  createdAt: string
  viewUrl: string
  thumbUrl: string
}

export function isShiftBillKind(value: string | null | undefined): value is ShiftBillKind {
  return !!value && (SHIFT_BILL_KINDS as readonly string[]).includes(value)
}
