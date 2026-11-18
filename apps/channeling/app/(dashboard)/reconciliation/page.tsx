import React, { Suspense } from "react"
import { checkRouteAccess } from "@/lib/server-permissions"
import { redirect } from "next/navigation"
import { ReconciliationListClient } from "./reconciliation-list-client"
import { getReconciliationListAction, getReconciliationUserOptionsAction } from "@/app/actions/reconciliation.actions"

type SearchParams = {
  searchParams?: Promise<{
    page?: string
    limit?: string
    keyword?: string
    tab?: string
    dateFrom?: string
    dateTo?: string
    fromUserId?: string
    toUserId?: string
  }>
}

export default async function ReconciliationPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess("/reconciliation")
  if (!canView) redirect("/unauthorized-access")

  const params = await searchParams
  const limit = params?.limit ? Number(params.limit) : 20
  const tabParam = params?.tab

  // Keep tab in URL so pagination preserves it (avoid /reconciliation?page=2 without tab)
  if (!tabParam) {
    const q = new URLSearchParams({ tab: "reconciliation", page: "1", limit: String(limit) })
    if (params?.dateFrom) q.set("dateFrom", params.dateFrom)
    if (params?.dateTo) q.set("dateTo", params.dateTo)
    if (params?.fromUserId && params.fromUserId !== "__all__") q.set("fromUserId", params.fromUserId)
    if (params?.toUserId && params.toUserId !== "__all__") q.set("toUserId", params.toUserId)
    redirect(`/reconciliation?${q.toString()}`)
  }

  const userOptionsRes = await getReconciliationUserOptionsAction()
  const userOptions = userOptionsRes?.success && userOptionsRes?.data ? userOptionsRes.data : []

  return (
    <div className="overflow-hidden space-y-4">
      <Suspense fallback={null}>
        <ReconciliationListClient fetchList={getReconciliationListAction} userOptions={userOptions} />
      </Suspense>
    </div>
  )
}
