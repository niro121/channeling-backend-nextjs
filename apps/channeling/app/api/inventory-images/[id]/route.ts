import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { hasPermission } from "@/lib/permissions"
import { userTypes } from "@/lib/roles"
import { getBillAttachmentBytes } from "@/lib/s3"
import { getInventoryItemImageKeys } from "@/services/inventory.service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
  }
  const isAdmin = session.user.userType === userTypes.admin
  const perms = session.user.permissions
  if (!isAdmin && !hasPermission(perms, "inventory", "view") && !hasPermission(perms, "room-inventory", "view")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }

  const { id } = await context.params
  if (!/^[a-f0-9]{24}$/i.test(id ?? "")) {
    return NextResponse.json({ success: false, message: "Invalid id" }, { status: 400 })
  }

  const keys = await getInventoryItemImageKeys(id)
  const thumb = req.nextUrl.searchParams.get("size") === "thumb"
  const key = (thumb ? keys?.imageThumbS3Key : null) ?? keys?.imageS3Key
  if (!key) {
    return NextResponse.json({ success: false, message: "No image" }, { status: 404 })
  }

  try {
    const { body, contentType } = await getBillAttachmentBytes(key)
    return new NextResponse(body as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": contentType ?? "image/webp",
        // Keys change on every upload and the URL carries ?v=, so caching is safe.
        "Cache-Control": "private, max-age=86400",
        "Content-Disposition": "inline",
      },
    })
  } catch (error) {
    console.error("[inventory-images] fetch failed", error)
    return NextResponse.json({ success: false, message: "Image unavailable" }, { status: 502 })
  }
}
