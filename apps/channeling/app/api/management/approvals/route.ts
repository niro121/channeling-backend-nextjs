import { NextResponse } from "next/server"
import { requireManagementActor } from "@/lib/management-api-route"
import {
  listApprovalRequests,
  type ApprovalListTypeFilter,
  type ApprovalListView,
} from "@/services/approval-request.service"

export const dynamic = "force-dynamic"

/** GET /api/management/approvals — Approval Center list for the management app user. */
export async function GET(request: Request) {
  const auth = await requireManagementActor(request, "/approvals")
  if ("response" in auth) return auth.response
  const { actor } = auth

  const params = new URL(request.url).searchParams
  const view = params.get("view")
  const status = params.get("status")
  const page = Number(params.get("page"))
  const limit = Number(params.get("limit"))

  try {
    const result = await listApprovalRequests({
      view: view === "attend" || view === "mine" ? (view as ApprovalListView) : undefined,
      type: (params.get("type") || undefined) as ApprovalListTypeFilter | undefined,
      status: status === "all" ? "all" : "open",
      dateFrom: params.get("dateFrom"),
      dateTo: params.get("dateTo"),
      page: Number.isFinite(page) && page > 0 ? page : undefined,
      limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
      requestId: params.get("id"),
      userId: actor.userId,
      permissions: actor.permissions,
      isAdmin: actor.isAdmin,
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error("management approvals list", error)
    return NextResponse.json(
      { success: false, errorCode: "list_failed", message: "Could not load approval requests." },
      { status: 500 }
    )
  }
}
