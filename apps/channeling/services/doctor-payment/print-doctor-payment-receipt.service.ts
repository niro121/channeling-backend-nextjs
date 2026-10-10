import prisma from "@/lib/prisma"
import { formatLKR } from "@/lib/format-money"
import type { DoctorPaymentPrintModel } from "@/lib/receipt-template/build-print-html"
import { RECEIPT_METHOD } from "@/types/receipt"
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
    paidTo: detail.canceledAt
      ? `${detail.consultantName} .............................`
      : detail.consultantName,
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

/**
 * Preview does not change printCount. The first real print is the original copy.
 */
export async function previewDoctorPaymentReceiptService(
  receiptId: string,
  printedByUserId?: string | null,
  options: PrintDoctorPaymentOptions = {}
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

  const generatedBy = await resolvePrinterName(printedByUserId)
  return {
    success: true,
    data: toPrintModel(detail.data, {
      isDuplicate: Number(receipt.printCount ?? 0) >= 1,
      generatedBy,
      generatedAt: formatGeneratedAt(new Date()),
    }),
  }
}

/**
 * Same print-count rule as booking and ledger receipts:
 * count 0 prints the original; every later print is marked duplicate.
 */
export async function printDoctorPaymentReceiptService(
  receiptId: string,
  printedByUserId?: string | null,
  options: PrintDoctorPaymentOptions = {}
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

  const generatedBy = await resolvePrinterName(printedByUserId)
  return {
    success: true,
    data: toPrintModel(detail.data, {
      isDuplicate,
      generatedBy,
      generatedAt: formatGeneratedAt(new Date()),
    }),
  }
}
