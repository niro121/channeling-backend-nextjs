import { NextRequest, NextResponse } from "next/server"
import sharp from "sharp"
import { getBillAttachmentBytes, getChecklistPhotoObjectKey, isChecklistPhotoKey, putBillAttachmentObject } from "@/lib/s3"
import { stayPhotoKeys } from "@/services/room-checklist.service"
import { requireRoomStaysActor } from "../_shared"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MAX_BYTES = 12 * 1024 * 1024
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]

/** POST /api/management/room-stays/photos — multipart "file". Returns { key } to put in an answer. */
export async function POST(request: NextRequest) {
  const auth = await requireRoomStaysActor(request, "write")
  if ("response" in auth) return auth.response

  const form = await request.formData().catch(() => null)
  const file = form?.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, errorCode: "invalid_input", message: "No photo sent." }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ success: false, errorCode: "invalid_input", message: "Photo is too large (max 12 MB)." }, { status: 400 })
  }
  if (file.type && !TYPES.includes(file.type)) {
    return NextResponse.json({ success: false, errorCode: "invalid_input", message: "Use a JPEG, PNG or WebP photo." }, { status: 400 })
  }
  try {
    const input = Buffer.from(await file.arrayBuffer())
    const body = await sharp(input)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer()
    const key = getChecklistPhotoObjectKey(auth.actor.userId, crypto.randomUUID())
    await putBillAttachmentObject(key, body, "image/webp")
    return NextResponse.json({ success: true, data: { key } })
  } catch (error) {
    console.error("management room-stays photo upload", error)
    return NextResponse.json(
      { success: false, errorCode: "invalid_input", message: "Could not read that photo. Try another one." },
      { status: 400 }
    )
  }
}

/** GET /api/management/room-stays/photos?key=&stayId= — your own new upload, or a photo on a stay you can view. */
export async function GET(request: NextRequest) {
  const auth = await requireRoomStaysActor(request)
  if ("response" in auth) return auth.response
  const key = request.nextUrl.searchParams.get("key")
  const stayId = request.nextUrl.searchParams.get("stayId")
  if (!isChecklistPhotoKey(key)) {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })
  }
  const ownUpload = key.split("/").slice(-2)[0] === auth.actor.userId.replace(/[^a-zA-Z0-9]/g, "")
  if (!ownUpload && !(stayId && (await stayPhotoKeys(stayId)).has(key))) {
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
    console.error("management room-stays photo", error)
    return NextResponse.json({ success: false, message: "Photo unavailable" }, { status: 502 })
  }
}
