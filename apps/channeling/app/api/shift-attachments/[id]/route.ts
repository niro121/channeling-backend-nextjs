import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getShiftBillAttachmentForView } from "@/services/shift-bill-attachment.service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ success: false, message: "Missing id" }, { status: 400 })
  }

  const size = req.nextUrl.searchParams.get("size") === "thumb" ? "thumb" : "full"

  const result = await getShiftBillAttachmentForView({
    attachmentId: id,
    userId: session.user.id,
    userType: session.user.userType ?? 0,
    permissions: session.user.permissions,
    size,
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
