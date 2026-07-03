import type { Prisma } from "@prisma/client"
import prisma from "@/lib/prisma"
import { RECEIPT_METHOD } from "@/types/receipt"

/** Ledger receipt = receipt with no booking (bookingId null), method in 2,3,6,7,8,9 */
const LEDGER_METHODS = [
  RECEIPT_METHOD.DEBIT_NOTE,
  RECEIPT_METHOD.CREDIT_NOTE,
  RECEIPT_METHOD.AGENCY_DEPOSIT,
  RECEIPT_METHOD.AGENCY_WITHDRAW,
  RECEIPT_METHOD.BRANCH_INCOME,
  RECEIPT_METHOD.BRANCH_EXPENSE,
  RECEIPT_METHOD.BANK_DEPOSIT,
  RECEIPT_METHOD.BANK_WITHDRAW,
]

export type LedgerReceiptListItem = {
  id: string
  receiptNoString: string
  method: number
  methodName: string
  type: number
  amount: number
  paymentMethod: number
  paymentMethodName: string
  remarks: string
  createdAt: Date
  locationId: string | null
  locationName: string | null
  userLocationId: string | null
  agencyId: string | null
  agencyName: string | null
  agencyCode: string | null
  canceledAt: Date | null
  cancelReason: string | null
  reverseReceiptId: string | null
  reversedReceiptId: string | null
}

export type ListLedgerReceiptsParams = {
  page?: number
  limit?: number
  keyword?: string | null
  branchId?: string | null
  agencyId?: string | null
  method?: number | null
}

export type ListLedgerReceiptsResult = {
  success: boolean
  data?: LedgerReceiptListItem[]
  totalRecords?: number
  error?: string
}

export async function listLedgerReceiptsService(
  params: ListLedgerReceiptsParams
): Promise<ListLedgerReceiptsResult> {
  try {
    const page = params.page ?? 0
    const limit = Math.min(Math.max(params.limit ?? 10, 1), 100)
    const keyword = params.keyword?.trim() || null
    const branchId = params.branchId?.trim() || null
    const agencyId = params.agencyId?.trim() || null
    const method = params.method != null ? params.method : null

    const whereConditions: Prisma.ReceiptWhereInput = {
      bookingId: null,
      method: method != null ? method : { in: LEDGER_METHODS },
      ...(agencyId ? { agencyId } : {}),
    }

    const branchCondition: Prisma.ReceiptWhereInput | null = branchId
      ? { OR: [{ locationId: branchId }, { userLocationId: branchId }] }
      : null
    const keywordCondition: Prisma.ReceiptWhereInput | null = keyword
      ? {
          OR: [
            { receiptNoString: { contains: keyword, mode: "insensitive" } },
            { remarks: { contains: keyword, mode: "insensitive" } },
          ],
        }
      : null

    const where: Prisma.ReceiptWhereInput =
      branchCondition || keywordCondition
        ? {
            AND: [
              whereConditions,
              ...(branchCondition ? [branchCondition] : []),
              ...(keywordCondition ? [keywordCondition] : []),
            ],
          }
        : whereConditions

    const [totalRecords, rows] = await Promise.all([
      prisma.receipt.count({ where }),
      prisma.receipt.findMany({
        where,
        include: {
          location: { select: { id: true, name: true } },
          userLocation: { select: { id: true, name: true } },
          agency: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: page * limit,
        take: limit,
      }),
    ])

    const { RECEIPT_METHOD_NAMES, PAYMENT_METHOD_NAMES } = await import("@/types/receipt")

    const data: LedgerReceiptListItem[] = rows.map((r) => ({
      id: r.id,
      receiptNoString: r.receiptNoString,
      method: r.method,
      methodName: RECEIPT_METHOD_NAMES[r.method] ?? "—",
      type: r.type,
      amount: r.amount,
      paymentMethod: r.paymentMethod,
      paymentMethodName: PAYMENT_METHOD_NAMES[r.paymentMethod] ?? "—",
      remarks: r.remarks ?? "",
      createdAt: r.createdAt,
      locationId: r.locationId,
      locationName: r.location?.name ?? r.userLocation?.name ?? null,
      userLocationId: r.userLocationId,
      agencyId: r.agencyId,
      agencyName: r.agency?.name ?? null,
      agencyCode: r.agency?.code ?? null,
      canceledAt: r.canceledAt ?? null,
      cancelReason: r.cancelReason ?? null,
      reverseReceiptId: r.reverseReceiptId ?? null,
      reversedReceiptId: r.reversedReceiptId ?? null,
    }))

    return { success: true, data, totalRecords }
  } catch (err) {
    console.error("listLedgerReceiptsService error", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to list ledger transactions",
    }
  }
}
