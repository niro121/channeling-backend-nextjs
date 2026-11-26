import { NextResponse } from "next/server"
import { requireManagementActor } from "@/lib/management-api-route"
import {
  approveApprovalRequest,
  rejectApprovalRequest,
  withdrawApprovalRequest,
} from "@/services/approval-request.service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * POST /api/management/approvals/:id/{approve|reject|withdraw}
 * Same service calls as app/actions/approval.actions.ts; the service enforces
 * per-type approve permissions, self-approval and requester-only withdraw.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; action: string }> }
) {
  const auth = await requireManagementActor(request, "/approvals")
  if ("response" in auth) return auth.response
  const { actor } = auth

  const { id, action } = await context.params
  const requestId = id?.trim()
  if (!requestId) {
    return NextResponse.json({ success: false, errorCode: "invalid_input", message: "Request id is required." }, { status: 400 })
  }

  try {
    switch (action) {
      case "approve":
        return NextResponse.json(
          await approveApprovalRequest(requestId, actor.userId, actor.permissions, actor.isAdmin)
        )
      case "reject": {
        const body = (await request.json().catch(() => null)) as { reason?: unknown } | null
        const reason = typeof body?.reason === "string" ? body.reason : ""
        return NextResponse.json(
          await rejectApprovalRequest(requestId, actor.userId, reason, actor.permissions, actor.isAdmin)
        )
      }
      case "withdraw":
        return NextResponse.json(await withdrawApprovalRequest(requestId, actor.userId))
      default:
        return NextResponse.json({ success: false, errorCode: "not_found", message: "Not found" }, { status: 404 })
    }
  } catch (error) {
    console.error(`management approvals ${action}`, error)
    return NextResponse.json(
      { success: false, errorCode: "server_error", message: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
