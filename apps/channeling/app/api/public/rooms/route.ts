import { NextRequest, NextResponse } from "next/server"
import { publicApiCorsHeaders } from "@/lib/public-api-cors"
import { getPublicApiClient } from "@/lib/public-api-auth"
import { createPublicRoom, getPublicRoomList } from "@/services/public/room.service"

function withCors(res: NextResponse) {
  Object.entries(publicApiCorsHeaders()).forEach(([k, v]) => res.headers.set(k, v))
  return res
}

function unauthorized() {
  return withCors(
    NextResponse.json(
      { error: "invalid_token", error_description: "Missing or invalid Bearer token" },
      { status: 401 }
    )
  )
}

type CreateRoomBody = {
  number?: string
  description?: string | null
  locationId?: string
  zoneId?: string
  status?: number
}

/**
 * GET /api/public/rooms?page=1&limit=10&keyword=&locationId=&zoneId=&status=&publishedOnly=&updatedSince=
 * POST /api/public/rooms — create room
 * Requires Bearer token from /api/public/token.
 */
export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }))
}

export async function GET(request: NextRequest) {
  const client = await getPublicApiClient(request.headers, { recheckBlocked: true })
  if (!client) return unauthorized()

  const { searchParams } = new URL(request.url)
  const page = searchParams.get("page")
  const limit = searchParams.get("limit")
  const keyword = searchParams.get("keyword")
  const locationId = searchParams.get("locationId")
  const zoneId = searchParams.get("zoneId")
  const status = searchParams.get("status")
  const publishedOnly = searchParams.get("publishedOnly")
  const updatedSince = searchParams.get("updatedSince")

  const result = await getPublicRoomList({
    page,
    limit,
    keyword,
    locationId,
    zoneId,
    status,
    publishedOnly,
    updatedSince,
  })

  if (!result.success) {
    const statusCode = result.code === "invalid_request" ? 400 : 500
    return withCors(
      NextResponse.json(
        { error: result.code, error_description: result.message },
        { status: statusCode }
      )
    )
  }

  return withCors(
    NextResponse.json({
      rooms: result.data,
      totalRecords: result.totalRecords,
    })
  )
}

export async function POST(request: NextRequest) {
  const client = await getPublicApiClient(request.headers, { recheckBlocked: true })
  if (!client) return unauthorized()

  let body: CreateRoomBody
  try {
    body = (await request.json()) as CreateRoomBody
  } catch {
    return withCors(
      NextResponse.json(
        { error: "invalid_request", error_description: "Invalid JSON body" },
        { status: 400 }
      )
    )
  }

  const result = await createPublicRoom(body)

  if (!result.success) {
    return withCors(
      NextResponse.json(
        {
          error: "invalid_request",
          error_description: result.error?.message ?? "Failed to create room",
          ...(result.error?.issues ? { validation_errors: result.error.issues } : {}),
        },
        { status: 400 }
      )
    )
  }

  return withCors(NextResponse.json({ room: result.data }, { status: 201 }))
}
