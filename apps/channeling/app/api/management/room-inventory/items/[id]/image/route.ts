import { NextRequest, NextResponse } from "next/server"
import { getBillAttachmentBytes } from "@/lib/s3"
import { getInventoryItemImageKeys } from "@/services/inventory.service"
import { requireRoomInventoryActor } from "../../../_shared"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** GET /api/management/room-inventory/items/:id/image?size=thumb — item photo for the management app. */
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRoomInventoryActor(req)
  if ("response" in auth) return auth.response

  const { id } = await context.params
  if (!/^[a-f0-9]{24}$/i.test(id ?? "")) {
    return NextResponse.json({ success: false, message: "Invalid id" }, { status: 400 })
  }
  const keys = await getInventoryItemImageKeys(id)
  const thumb = req.nextUrl.searchParams.get("size") === "thumb"
  const key = (thumb ? keys?.imageThumbS3Key : null) ?? keys?.imageS3Key
  if (!key) return NextResponse.json({ success: false, message: "No image" }, { status: 404 })

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
    console.error("management room-inventory image", error)
    return NextResponse.json({ success: false, message: "Image unavailable" }, { status: 502 })
  }
}
