"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { CustomDataTable } from "@/components/common/custom-data-table"
import { ReconciliationColumns, type ReconciliationListRow } from "./columns"
import { ReconciliationListTabs } from "./reconciliation-list-tabs"
import ReconciliationFilterSection from "./filter-section"
import type { ReconciliationListTab } from "@/services/reconciliation.service"

const TAB_SUBHEADINGS: Record<ReconciliationListTab, string> = {
  reconciliation:
    "Top-level handovers to reconcile or in progress. Open a row to tick receipts and submit or reject.",
  approved: "Handovers whose non-cash amounts have been reconciled and approved.",
  rejected: "Handovers whose reconciliation was rejected. Open to view details.",
}

type FetchListAction = (params: {
  page?: number
  limit?: number
  keyword?: string
  tab?: ReconciliationListTab
  dateFrom?: string | null
  dateTo?: string | null
  fromUserId?: string | null
  toUserId?: string | null
}) => Promise<{ data: ReconciliationListRow[]; totalRecords: number }>

export type ReconciliationUserOption = { id: string; name: string }

export function ReconciliationListClient({
  fetchList,
  userOptions,
}: {
  fetchList: FetchListAction
  userOptions: ReconciliationUserOption[]
}) {
  const searchParams = useSearchParams()
  const tab = (searchParams.get("tab") as ReconciliationListTab) || "reconciliation"
  const pageStr = searchParams.get("page") || "1"
  const limitStr = searchParams.get("limit") || "20"
  const dateFrom = searchParams.get("dateFrom") ?? undefined
  const dateTo = searchParams.get("dateTo") ?? undefined
  const fromUserId = searchParams.get("fromUserId") ?? undefined
  const toUserId = searchParams.get("toUserId") ?? undefined
  const page = Math.max(1, parseInt(pageStr, 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(limitStr, 10) || 20))
  const validTab: ReconciliationListTab =
    tab === "approved" || tab === "rejected" ? tab : "reconciliation"

  const [data, setData] = useState<ReconciliationListRow[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchList({
        page,
        limit,
        tab: validTab,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        fromUserId: fromUserId && fromUserId !== "__all__" ? fromUserId : null,
        toUserId: toUserId && toUserId !== "__all__" ? toUserId : null,
      })
      setData(result.data ?? [])
      setTotalRecords(result.totalRecords ?? 0)
    } finally {
      setLoading(false)
    }
  }, [fetchList, page, limit, validTab, dateFrom, dateTo, fromUserId, toUserId])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-4">
      <ReconciliationListTabs />
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/80">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        <CustomDataTable<ReconciliationListRow, unknown>
          heading="Reconciliation"
          subHeading={TAB_SUBHEADINGS[validTab]}
          columns={ReconciliationColumns}
          data={data}
          rowCount={totalRecords}
          haveBulkDelete={false}
          page={pageStr}
          limit={limitStr}
          toolbarLeft={
            <div className="flex flex-wrap items-center gap-3">
              <ReconciliationFilterSection
                userOptions={userOptions}
                dateFrom={dateFrom}
                dateTo={dateTo}
                fromUserId={fromUserId}
                toUserId={toUserId}
              />
            </div>
          }
        />
      </div>
    </div>
  )
}
