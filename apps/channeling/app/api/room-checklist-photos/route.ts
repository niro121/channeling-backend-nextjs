import { NextRequest, NextResponse } from "next/server"
import { fetchServerSession } from "@/lib/session"
import { roomStaysCan } from "@/lib/room-checklist-access"
import { userTypes } from "@/lib/roles"
import { getBillAttachmentBytes, isChecklistPhotoKey } from "@/lib/s3"
import { stayPhotoKeys } from "@/services/room-checklist.service"
import type { Permissions } from "@/types/user-group"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** GET /api/room-checklist-photos?stayId=&key= — a checklist photo, only for people who may view stays. */
export async function GET(req: NextRequest) {
  const session = await fetchServerSession()
  if (!session?.user?.id) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
  const can = roomStaysCan(
    (session.user.permissions ?? null) as Permissions | null,
    session.user.userType === userTypes.admin
  )
  if (!can.view) return NextResponse.json({ success: false, message: "Permission denied" }, { status: 403 })

  const stayId = req.nextUrl.searchParams.get("stayId") ?? ""
  const key = req.nextUrl.searchParams.get("key")
  if (!isChecklistPhotoKey(key) || !(await stayPhotoKeys(stayId)).has(key)) {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })
  }
  try {
    const { body, contentType } = await getBillAttachmentBytes(key)
    return new NextResponse(body as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": contentType ?? "image/webp",
        "Cache-Control": "private, max-age=86400",
        "Content-Disposition": "inline",
      },
    })
  } catch (error) {
    console.error("room checklist photo", error)
    return NextResponse.json({ success: false, message: "Photo unavailable" }, { status: 502 })
  }
}
