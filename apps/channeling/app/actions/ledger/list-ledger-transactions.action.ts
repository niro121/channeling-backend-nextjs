"use server"

import { requirePermission } from "@/lib/server-permissions"
import {
  listLedgerReceiptsService,
  type LedgerReceiptListItem,
} from "@/services/ledger/list-ledger-receipts.service"

export type GetLedgerTransactionsParams = {
  page?: string | number
  limit?: string | number
  keyword?: string | null
  branchId?: string | null
  agencyId?: string | null
  method?: string | null
}

export type GetLedgerTransactionsResult = {
  success: boolean
  data: LedgerReceiptListItem[]
  totalRecords: number
  message?: string
}

export async function getLedgerTransactions(
  params: GetLedgerTransactionsParams = {}
): Promise<GetLedgerTransactionsResult> {
  await requirePermission("ledger", "view")

  try {
    const page = params.page != null ? Number(params.page) : 0
    const limit =
      params.limit != null
        ? Number(params.limit)
        : Number(process.env.DEFAULT_PER_PAGE ?? "10")
    const methodParam = params.method
    const method =
      methodParam != null && methodParam !== "" && methodParam !== "__all__"
        ? Number(methodParam)
        : null

    const result = await listLedgerReceiptsService({
      page,
      limit,
      keyword: params.keyword ?? null,
      branchId: params.branchId ?? null,
      agencyId: params.agencyId ?? null,
      method,
    })

    if (!result.success) {
      return {
        success: false,
        data: [],
        totalRecords: 0,
        message: result.error ?? "Failed to load ledger transactions",
      }
    }

    return {
      success: true,
      data: result.data ?? [],
      totalRecords: result.totalRecords ?? 0,
    }
  } catch (err) {
    console.error("getLedgerTransactions action error", err)
    return {
      success: false,
      data: [],
      totalRecords: 0,
      message: err instanceof Error ? err.message : "Error loading ledger transactions",
    }
  }
}
