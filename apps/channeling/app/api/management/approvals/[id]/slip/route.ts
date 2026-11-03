import { NextRequest, NextResponse } from "next/server"
import { requireManagementActor } from "@/lib/management-api-route"
import { userTypes } from "@/lib/roles"
import { getBankDepositSlipForView } from "@/services/bank-deposit-slip.service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** GET /api/management/approvals/:id/slip — bank deposit slip image (same checks as /api/approval-attachments). */
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireManagementActor(req, "/approvals")
  if ("response" in auth) return auth.response
  const { actor } = auth

  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ success: false, message: "Missing id" }, { status: 400 })
  }

  const result = await getBankDepositSlipForView({
    requestId: id,
    userId: actor.userId,
    userType: actor.isAdmin ? userTypes.admin : userTypes.staff,
    permissions: actor.permissions,
    size: req.nextUrl.searchParams.get("size") === "thumb" ? "thumb" : "full",
  })

  if (!result.success) {
    return NextResponse.json({ success: false, message: result.error }, { status: result.status })
  }

  return new NextResponse(result.body as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": result.contentType,
      "Cache-Control": "private, no-store",
      "Content-Disposition": "inline",
    },
  })
}
