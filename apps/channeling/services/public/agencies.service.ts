import prisma from "@/lib/prisma"
import { getAgentBalance } from "@/services/channel-booking/helpers/get-agent-balance"
import { getAgencyStatementReportService } from "@/services/reports/agency-statement.report.service"

const AGENCY_STATUS_PUBLISHED = 1
const MONGO_OBJECT_ID = /^[a-fA-F0-9]{24}$/

export type PublicAgencyLookupDto = {
  id: string
  code: string | null
  name: string
  status: number
  hasLinkedPayableAccount: boolean
}

export type PublicAgencyBalanceDto = {
  agencyId: string
  agencyCode: string | null
  name: string
  balance: number
  allowedCreditLimit: number
  availableCredit: number
}

export type GetPublicAgencyLookupResult =
  | { success: true; data: PublicAgencyLookupDto }
  | {
      success: false
      code: "invalid_request" | "not_found" | "no_linked_account" | "server_error"
      message: string
      bookingErrorCode?: "AGENCY_NO_LINKED_ACCOUNT"
    }

export type GetPublicAgencyBalanceResult =
  | { success: true; data: PublicAgencyBalanceDto }
  | {
      success: false
      code: "invalid_request" | "not_found" | "no_linked_account" | "server_error"
      message: string
      bookingErrorCode?: "AGENCY_NO_LINKED_ACCOUNT"
    }

export type PublicAgencyStatementRowDto = {
  no: number
  date: string
  particulars: string
  appointmentDateTime: string | null
  receiptNo: string
  docFee: number
  hosFee: number
  discount: number
  amount: number
  runningBalance: number
  comments: string
  createdBy: string
}

export type PublicAgencyStatementDto = {
  agencyId: string
  agencyName: string
  agencyCode: string
  accountLinked: boolean
  accountName: string | null
  openingBalance: number
  closingBalance: number
  rows: PublicAgencyStatementRowDto[]
  message?: string
}

export type GetPublicAgencyStatementResult =
  | { success: true; data: PublicAgencyStatementDto }
  | {
      success: false
      code: "invalid_request" | "not_found" | "server_error"
      message: string
    }

const NO_LINKED_ACCOUNT_MESSAGE =
  "This hospital agency has no linked PAYABLE account. Link a payable account in the hospital system before creating a website agent."

const PUBLIC_AGENCY_SELECT = {
  id: true,
  code: true,
  name: true,
  status: true,
  allowedCreditLimit: true,
  accounts: {
    where: { type: "PAYABLE", isActive: true },
    take: 1,
    select: { id: true },
  },
} as const

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

/**
 * Published agency by unique code for website agent-user setup.
 */
export async function getPublicAgencyByCode(
  code: string
): Promise<GetPublicAgencyLookupResult> {
  const trimmed = code.trim()
  if (!trimmed) {
    return {
      success: false,
      code: "invalid_request",
      message: "Agency code is required",
    }
  }

  try {
    const agency = await prisma.agency.findFirst({
      where: {
        status: AGENCY_STATUS_PUBLISHED,
        OR: [
          { code: trimmed },
          { code: trimmed.toUpperCase() },
          { code: trimmed.toLowerCase() },
        ],
      },
      select: PUBLIC_AGENCY_SELECT,
    })

    if (!agency) {
      return {
        success: false,
        code: "not_found",
        message: "Agency not found",
      }
    }

    const hasLinkedPayableAccount = agency.accounts?.[0] != null
    if (!hasLinkedPayableAccount) {
      return {
        success: false,
        code: "no_linked_account",
        bookingErrorCode: "AGENCY_NO_LINKED_ACCOUNT",
        message: NO_LINKED_ACCOUNT_MESSAGE,
      }
    }

    return {
      success: true,
      data: {
        id: agency.id,
        code: agency.code ?? null,
        name: agency.name,
        status: agency.status ?? AGENCY_STATUS_PUBLISHED,
        hasLinkedPayableAccount: true,
      },
    }
  } catch (error: unknown) {
    console.error("getPublicAgencyByCode error", error)
    return {
      success: false,
      code: "server_error",
      message:
        error instanceof Error ? error.message : "Failed to look up agency",
    }
  }
}

/**
 * Live agency credit from the linked PAYABLE account (same source as save-booking).
 */
export async function getPublicAgencyBalance(
  agencyId: string
): Promise<GetPublicAgencyBalanceResult> {
  const trimmed = agencyId.trim()
  if (!trimmed || !MONGO_OBJECT_ID.test(trimmed)) {
    return {
      success: false,
      code: "invalid_request",
      message: "A valid agency id is required",
    }
  }

  try {
    const agency = await prisma.agency.findUnique({
      where: { id: trimmed },
      select: PUBLIC_AGENCY_SELECT,
    })

    if (!agency || agency.status !== AGENCY_STATUS_PUBLISHED) {
      return {
        success: false,
        code: "not_found",
        message: "Agency not found",
      }
    }

    const hasLinkedPayableAccount = agency.accounts?.[0] != null
    if (!hasLinkedPayableAccount) {
      return {
        success: false,
        code: "no_linked_account",
        bookingErrorCode: "AGENCY_NO_LINKED_ACCOUNT",
        message: NO_LINKED_ACCOUNT_MESSAGE,
      }
    }

    const balanceCents = await getAgentBalance(agency.id)
    const balance = roundMoney(balanceCents / 100)
    const allowedCreditLimit = roundMoney(Number(agency.allowedCreditLimit) || 0)

    return {
      success: true,
      data: {
        agencyId: agency.id,
        agencyCode: agency.code ?? null,
        name: agency.name,
        balance,
        allowedCreditLimit,
        availableCredit: roundMoney(balance + allowedCreditLimit),
      },
    }
  } catch (error: unknown) {
    console.error("getPublicAgencyBalance error", error)
    return {
      success: false,
      code: "server_error",
      message:
        error instanceof Error ? error.message : "Failed to fetch agency balance",
    }
  }
}

function toIsoDate(value: Date | string): string {
  if (value instanceof Date) return value.toISOString()
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString()
}

function classifyStatementFailure(
  message: string
): "invalid_request" | "not_found" | "server_error" {
  const lower = message.toLowerCase()
  if (lower.includes("not found")) return "not_found"
  if (
    lower.includes("required") ||
    lower.includes("date") ||
    lower.includes("range") ||
    lower.includes("too many") ||
    lower.includes("select at least")
  ) {
    return "invalid_request"
  }
  return "server_error"
}

/**
 * Agent statement for a published agency. Amounts come from the same
 * getAgencyStatementReportService used by the hospital Agent Statement report.
 */
export async function getPublicAgencyStatement(
  agencyId: string,
  dateFrom: string,
  dateTo: string
): Promise<GetPublicAgencyStatementResult> {
  const trimmed = agencyId.trim()
  if (!trimmed || !MONGO_OBJECT_ID.test(trimmed)) {
    return {
      success: false,
      code: "invalid_request",
      message: "A valid agency id is required",
    }
  }

  const from = dateFrom.trim()
  const to = dateTo.trim()
  if (!from || !to) {
    return {
      success: false,
      code: "invalid_request",
      message: "From and To date/time are required.",
    }
  }

  try {
    const agency = await prisma.agency.findUnique({
      where: { id: trimmed },
      select: { id: true, status: true },
    })

    if (!agency || agency.status !== AGENCY_STATUS_PUBLISHED) {
      return {
        success: false,
        code: "not_found",
        message: "Agency not found",
      }
    }

    const result = await getAgencyStatementReportService({
      agencyId: agency.id,
      dateFrom: from,
      dateTo: to,
    })

    if (!result.success || !result.data) {
      const message = result.message || "Failed to load agency statement"
      return {
        success: false,
        code: classifyStatementFailure(message),
        message,
      }
    }

    return {
      success: true,
      data: {
        agencyId: result.data.agencyId,
        agencyName: result.data.agencyName,
        agencyCode: result.data.agencyCode,
        accountLinked: result.data.accountLinked,
        accountName: result.data.accountName,
        openingBalance: result.data.openingBalance,
        closingBalance: result.data.closingBalance,
        rows: result.data.rows.map((row) => ({
          no: row.no,
          date: toIsoDate(row.date),
          particulars: row.particulars,
          appointmentDateTime: row.appointmentDateTime,
          receiptNo: row.receiptNo,
          docFee: row.docFee,
          hosFee: row.hosFee,
          discount: row.discount,
          amount: row.amount,
          runningBalance: row.runningBalance,
          comments: row.comments,
          createdBy: row.createdBy,
        })),
        ...(result.data.message ? { message: result.data.message } : {}),
      },
    }
  } catch (error: unknown) {
    console.error("getPublicAgencyStatement error", error)
    return {
      success: false,
      code: "server_error",
      message:
        error instanceof Error ? error.message : "Failed to fetch agency statement",
    }
  }
}
