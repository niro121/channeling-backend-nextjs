import { format } from "date-fns"
import prisma from "@/lib/prisma"
import { formatLKR } from "@/lib/format-money"
import { formatUserDisplayName } from "@/lib/helpers/user-display.helper"
import {
  buildPlaceholdersForLedgerReceipt,
  type LedgerReceiptPrintInput,
  type LedgerReceiptPrintLineInput,
} from "@/lib/receipt-template/build-placeholders"
import {
  formatLocationAddress,
  ruhunuHospitalAddressLine,
} from "@/lib/receipt-template/ruhunu-hospital"
import { resolveSlipDateDisplay } from "@/lib/slip-date"
import { getActiveReceiptTemplate } from "@/services/receipt-template/receipt-template.service"
import {
  RECEIPT_PRINT_VARIANT_DOT_MATRIX,
  type ReceiptPlaceholderMap,
  type ReceiptTemplateRecord,
} from "@/types/receipt-template-db"
import {
  PAYMENT_METHOD_NAMES,
  RECEIPT_METHOD,
  RECEIPT_METHOD_NAMES,
} from "@/types/receipt"

const LEDGER_METHODS: number[] = [
  RECEIPT_METHOD.DEBIT_NOTE,
  RECEIPT_METHOD.CREDIT_NOTE,
  RECEIPT_METHOD.AGENCY_DEPOSIT,
  RECEIPT_METHOD.AGENCY_WITHDRAW,
  RECEIPT_METHOD.BRANCH_INCOME,
  RECEIPT_METHOD.BRANCH_EXPENSE,
  RECEIPT_METHOD.BANK_DEPOSIT,
  RECEIPT_METHOD.BANK_WITHDRAW,
]

function ledgerPrintTitle(method: number): string {
  if (method === RECEIPT_METHOD.AGENCY_DEPOSIT || method === RECEIPT_METHOD.AGENCY_WITHDRAW) {
    return "AGENT RECEIPT"
  }
  if (method === RECEIPT_METHOD.BRANCH_EXPENSE) return "EXPENSES NOTE"
  if (method === RECEIPT_METHOD.BRANCH_INCOME) return "INCOME NOTE"
  return (RECEIPT_METHOD_NAMES[method] ?? "Ledger Receipt").toUpperCase()
}

function ledgerTemplateType(method: number): string {
  if (method === RECEIPT_METHOD.AGENCY_DEPOSIT || method === RECEIPT_METHOD.AGENCY_WITHDRAW) {
    return "agent_receipt"
  }
  if (method === RECEIPT_METHOD.BRANCH_EXPENSE) return "expenses_note"
  if (method === RECEIPT_METHOD.DEBIT_NOTE) return "debit_note"
  return "ledger"
}

async function resolveDotMatrixTemplate(type: string): Promise<ReceiptTemplateRecord | null> {
  const primary = await getActiveReceiptTemplate(type, RECEIPT_PRINT_VARIANT_DOT_MATRIX)
  if (primary.success && primary.data) return primary.data
  if (type !== "ledger") {
    const fallback = await getActiveReceiptTemplate("ledger", RECEIPT_PRINT_VARIANT_DOT_MATRIX)
    if (fallback.success && fallback.data) return fallback.data
  }
  return null
}

function paymentModeLabel(paymentMethod: number): string {
  return (PAYMENT_METHOD_NAMES[paymentMethod] ?? "—").toUpperCase()
}

function transactionNoFromSlipDate(slipDate: string | null): string {
  if (!slipDate) return ""
  return slipDate.replace(/-/g, ".")
}

function paymentDetailsText(opts: {
  bank: string
  slipDate: string | null
  cardReference: string
  slipReference: string
}): string {
  const bank = opts.bank.trim()
  if (bank && opts.slipDate) return `${bank} ( ${opts.slipDate} )`
  if (bank) return bank
  if (opts.cardReference.trim()) return opts.cardReference.trim()
  if (opts.slipReference.trim()) return opts.slipReference.trim()
  return ""
}

function agencyContact(agency: {
  mobile?: string | null
  phone?: string | null
  contactPersonMobile?: string | null
  contactPersonPhone?: string | null
} | null): string {
  if (!agency) return ""
  return (
    agency.mobile?.trim() ||
    agency.phone?.trim() ||
    agency.contactPersonMobile?.trim() ||
    agency.contactPersonPhone?.trim() ||
    ""
  )
}

async function resolveGeneratedBy(userId: string | null | undefined): Promise<string> {
  if (!userId) return ""
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, staff: { select: { code: true } } },
  })
  if (!user) return ""
  return formatUserDisplayName(user.name, userId, user.staff?.code)
}

export type PrintLedgerReceiptData = {
  placeholders: ReceiptPlaceholderMap
  template: ReceiptTemplateRecord | null
  receiptNoString: string
  isDuplicate: boolean
}

export async function printLedgerReceiptService(
  receiptId: string
): Promise<{ success: boolean; data?: PrintLedgerReceiptData; message?: string }> {
  try {
    const receipt = await prisma.receipt.findUnique({
      where: { id: receiptId },
      include: {
        location: {
          select: { id: true, name: true, addressLine1: true, addressLine2: true, city: true },
        },
        userLocation: {
          select: { id: true, name: true, addressLine1: true, addressLine2: true, city: true },
        },
        agency: {
          select: {
            name: true,
            code: true,
            city: true,
            phone: true,
            mobile: true,
            contactPersonPhone: true,
            contactPersonMobile: true,
          },
        },
        paymentLines: {
          select: {
            paymentMethod: true,
            amount: true,
            bank: true,
            cardReference: true,
            slipReference: true,
            slipDate: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    })
    if (!receipt || receipt.bookingId != null || !LEDGER_METHODS.includes(receipt.method)) {
      return { success: false, message: "Ledger receipt not found." }
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

    const loc = receipt.location ?? receipt.userLocation
    const companyName = loc?.name?.trim() || "RH Channel"
    const locationAddress = loc
      ? formatLocationAddress(loc) || ruhunuHospitalAddressLine()
      : ruhunuHospitalAddressLine()
    const sourceLines =
      receipt.paymentLines.length > 0
        ? receipt.paymentLines
        : [
            {
              paymentMethod: receipt.paymentMethod,
              amount: receipt.amount,
              bank: receipt.bank,
              cardReference: receipt.cardReference,
              slipReference: receipt.slipReference,
              slipDate: receipt.slipDate,
            },
          ]

    const lines: LedgerReceiptPrintLineInput[] = sourceLines.map((line) => {
      const lineSlipDate = resolveSlipDateDisplay(line.slipDate, receipt.remarks)
      return {
        mode: paymentModeLabel(line.paymentMethod),
        paymentDetails: paymentDetailsText({
          bank: line.bank ?? "",
          slipDate: lineSlipDate,
          cardReference: line.cardReference ?? "",
          slipReference: line.slipReference ?? "",
        }),
        transactionNo: transactionNoFromSlipDate(lineSlipDate) || (line.slipReference ?? "").trim(),
        amount: formatLKR(Number(line.amount) || 0),
      }
    })

    const generatedBy = await resolveGeneratedBy(receipt.createdBy)
    const statusParts: string[] = []
    if (receipt.canceledAt) statusParts.push("CANCELED")
    // Any print after the first is a duplicate, including from the ledger table.
    if (isDuplicate) statusParts.push("DUPLICATE")

    const input: LedgerReceiptPrintInput = {
      companyName,
      locationName: loc?.name?.trim() || companyName,
      locationAddress,
      title: ledgerPrintTitle(receipt.method),
      receiptNo: receipt.receiptNoString,
      dateTime: format(new Date(receipt.createdAt), "yyyy-MM-dd hh:mm a"),
      agentName: receipt.agency?.name ?? "",
      agentCode: receipt.agency?.code ?? "",
      agentCity: receipt.agency?.city ?? "",
      agentContact: agencyContact(receipt.agency),
      branchName: loc?.name ?? "",
      transactionType: PAYMENT_METHOD_NAMES[receipt.paymentMethod] ?? "—",
      showAgentFields: Boolean(receipt.agency),
      lines,
      totalAmount: formatLKR(Number(receipt.amount) || 0),
      remarks: receipt.remarks ?? "",
      generatedBy,
      statusBanner: statusParts.join(" "),
      duplicateLabel: isDuplicate ? "DUPLICATE" : "",
    }

    const template = await resolveDotMatrixTemplate(ledgerTemplateType(receipt.method))

    return {
      success: true,
      data: {
        placeholders: buildPlaceholdersForLedgerReceipt(input),
        template,
        receiptNoString: receipt.receiptNoString,
        isDuplicate,
      },
    }
  } catch (error) {
    console.error("printLedgerReceiptService error", error)
    const message = error instanceof Error ? error.message : "Failed to prepare receipt for print"
    return { success: false, message }
  }
}
