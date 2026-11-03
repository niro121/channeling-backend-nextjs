import prisma from "@/lib/prisma"
import { formatLKR } from "@/lib/format-money"
import type { DoctorPaymentPrintModel } from "@/lib/receipt-template/build-print-html"
import { RECEIPT_METHOD } from "@/types/receipt"
import { isWhtDoctorPaymentNumber } from "@/services/channel-booking/helpers/get-receipt-sequence"
import {
  getDoctorCancelReceiptDetail,
  getDoctorPaymentReceiptDetail,
  type DoctorPaymentReceiptDetail,
} from "@/services/doctor-payment/get-doctor-payment-receipt-detail.service"

const SRI_LANKA_TZ = "Asia/Colombo"

export type PrintDoctorPaymentOptions = {
  doctorName?: string
  originalReceiptNoString?: string
}

export type PrintDoctorPaymentResult = {
  success: boolean
  data?: DoctorPaymentPrintModel
  slips?: DoctorPaymentPrintModel[]
  message?: string
}

function part(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes
): string {
  return parts.find((item) => item.type === type)?.value ?? ""
}

function formatPaidOn(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: SRI_LANKA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(value)
  const period = part(parts, "dayPeriod").toUpperCase()
  return `${part(parts, "year")}-${part(parts, "month")}-${part(parts, "day")} ${part(parts, "hour")}:${part(parts, "minute")} ${period}`
}

function formatGeneratedAt(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SRI_LANKA_TZ,
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(value)
  const period = part(parts, "dayPeriod").toUpperCase()
  return `${part(parts, "month")} ${part(parts, "day")}, ${part(parts, "year")} ${part(parts, "hour")}:${part(parts, "minute")} ${period}`
}

async function resolvePrinterName(userId: string | null | undefined): Promise<string> {
  if (!userId) return ""
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, username: true },
  })
  return user?.username?.trim() || user?.name?.trim() || ""
}

function toPrintModel(
  detail: DoctorPaymentReceiptDetail,
  opts: { isDuplicate: boolean; generatedBy: string; generatedAt: string }
): DoctorPaymentPrintModel {
  return {
    receiptNoString: detail.receiptNoString,
    consultantName: detail.consultantName,
    documentStatus: detail.documentStatus,
    isDuplicate: opts.isDuplicate,
    sessions: detail.sessionGroups.map((group) => ({
      dateLabel: group.dateLabel,
      sessionLabel: group.sessionLabel,
      patientCount: group.patientCount,
      lines: group.lines.map((line) => ({
        receiptNo: line.receiptNo,
        patientName: line.patientName,
        amount: formatLKR(line.amountRs),
      })),
    })),
    subPayable: formatLKR(detail.amount),
    wht: formatLKR(detail.whd),
    netPaid: formatLKR(detail.netAmount),
    totalPatientCount: detail.totalPatientCount,
    paidTo: `${detail.consultantName} .............................`,
    paidBy: detail.paidBy,
    paidOn: formatPaidOn(new Date(detail.paidAt ?? detail.createdAt)),
    canceledBy: detail.canceledBy,
    canceledOn: detail.canceledAt ? formatPaidOn(new Date(detail.canceledAt)) : "",
    generatedBy: opts.generatedBy || detail.createdByName || "",
    generatedAt: opts.generatedAt,
  }
}

async function loadDetail(
  receiptId: string,
  method: number,
  options: PrintDoctorPaymentOptions
): Promise<{ success: true; data: DoctorPaymentReceiptDetail } | { success: false; message: string }> {
  if (method === RECEIPT_METHOD.DOCTOR_CANCEL) {
    return getDoctorCancelReceiptDetail(receiptId, options)
  }
  return getDoctorPaymentReceiptDetail(receiptId)
}

function sortWhtFirst<T extends { receiptNoString: string }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) =>
      Number(isWhtDoctorPaymentNumber(b.receiptNoString)) - Number(isWhtDoctorPaymentNumber(a.receiptNoString))
  )
}

/** One receipt, or both slips in a split payment. WHT slip first. */
async function orderedPrintReceiptIds(receiptId: string): Promise<string[] | null> {
  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
    select: {
      id: true,
      method: true,
      doctorPaymentGroupId: true,
      reversedReceiptId: true,
      receiptNoString: true,
    },
  })
  if (!receipt) return null

  if (receipt.method === RECEIPT_METHOD.DOCTOR_CANCEL) {
    const original = receipt.reversedReceiptId
      ? await prisma.receipt.findUnique({
          where: { id: receipt.reversedReceiptId },
          select: { doctorPaymentGroupId: true },
        })
      : null
    if (!original?.doctorPaymentGroupId) return [receipt.id]
    const originals = await prisma.receipt.findMany({
      where: {
        doctorPaymentGroupId: original.doctorPaymentGroupId,
        method: RECEIPT_METHOD.DOCTOR_PAYMENT,
      },
      select: { reverseReceiptId: true, receiptNoString: true },
    })
    const ids = sortWhtFirst(originals)
      .map((row) => row.reverseReceiptId)
      .filter((id): id is string => Boolean(id))
    return ids.length > 0 ? ids : [receipt.id]
  }

  if (receipt.method === RECEIPT_METHOD.DOCTOR_PAYMENT && receipt.doctorPaymentGroupId) {
    const mates = await prisma.receipt.findMany({
      where: {
        doctorPaymentGroupId: receipt.doctorPaymentGroupId,
        method: RECEIPT_METHOD.DOCTOR_PAYMENT,
      },
      select: { id: true, receiptNoString: true },
    })
    const ordered = sortWhtFirst(mates)
    return ordered.length > 0 ? ordered.map((row) => row.id) : [receipt.id]
  }

  return [receipt.id]
}

/**
 * Preview does not change printCount. The first real print is the original copy.
 */
async function previewOneSlip(
  receiptId: string,
  printedByUserId: string | null | undefined,
  options: PrintDoctorPaymentOptions,
  generatedBy: string,
  generatedAt: string
): Promise<PrintDoctorPaymentResult> {
  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
    select: { id: true, method: true, printCount: true },
  })
  if (
    !receipt ||
    (receipt.method !== RECEIPT_METHOD.DOCTOR_PAYMENT &&
      receipt.method !== RECEIPT_METHOD.DOCTOR_CANCEL)
  ) {
    return { success: false, message: "Doctor payment receipt not found." }
  }
  const detail = await loadDetail(receiptId, receipt.method, options)
  if (!detail.success) return detail
  return {
    success: true,
    data: toPrintModel(detail.data, {
      isDuplicate: Number(receipt.printCount ?? 0) >= 1,
      generatedBy,
      generatedAt,
    }),
  }
}

export async function previewDoctorPaymentReceiptService(
  receiptId: string,
  printedByUserId?: string | null,
  options: PrintDoctorPaymentOptions = {}
): Promise<PrintDoctorPaymentResult> {
  const ids = await orderedPrintReceiptIds(receiptId)
  if (!ids) return { success: false, message: "Doctor payment receipt not found." }
  const generatedBy = await resolvePrinterName(printedByUserId)
  const generatedAt = formatGeneratedAt(new Date())
  const slips: DoctorPaymentPrintModel[] = []
  for (const id of ids) {
    const slip = await previewOneSlip(id, printedByUserId, options, generatedBy, generatedAt)
    if (!slip.success || !slip.data) return slip
    slips.push(slip.data)
  }
  return { success: true, data: slips[0], slips }
}

/**
 * Same print-count rule as booking and ledger receipts:
 * count 0 prints the original; every later print is marked duplicate.
 */
async function printOneSlip(
  receiptId: string,
  options: PrintDoctorPaymentOptions,
  generatedBy: string,
  generatedAt: string
): Promise<PrintDoctorPaymentResult> {
  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
    select: { id: true, method: true, printCount: true, printedAt: true },
  })
  if (
    !receipt ||
    (receipt.method !== RECEIPT_METHOD.DOCTOR_PAYMENT &&
      receipt.method !== RECEIPT_METHOD.DOCTOR_CANCEL)
  ) {
    return { success: false, message: "Doctor payment receipt not found." }
  }

  const previousCount = Number(receipt.printCount ?? 0)
  const isDuplicate = previousCount >= 1
  await prisma.receipt.update({
    where: { id: receipt.id },
    data: {
      printCount: { increment: 1 },
      ...(previousCount === 0 && !receipt.printedAt ? { printedAt: new Date() } : {}),
    },
  })

  const detail = await loadDetail(receiptId, receipt.method, options)
  if (!detail.success) return detail
  return {
    success: true,
    data: toPrintModel(detail.data, {
      isDuplicate,
      generatedBy,
      generatedAt,
    }),
  }
}

export async function printDoctorPaymentReceiptService(
  receiptId: string,
  printedByUserId?: string | null,
  options: PrintDoctorPaymentOptions = {}
): Promise<PrintDoctorPaymentResult> {
  const ids = await orderedPrintReceiptIds(receiptId)
  if (!ids) return { success: false, message: "Doctor payment receipt not found." }
  const generatedBy = await resolvePrinterName(printedByUserId)
  const generatedAt = formatGeneratedAt(new Date())
  const slips: DoctorPaymentPrintModel[] = []
  for (const id of ids) {
    const slip = await printOneSlip(id, options, generatedBy, generatedAt)
    if (!slip.success || !slip.data) return slip
    slips.push(slip.data)
  }
  return { success: true, data: slips[0], slips }
}
