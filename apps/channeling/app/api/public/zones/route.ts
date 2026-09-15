import { NextRequest, NextResponse } from "next/server"
import { publicApiCorsHeaders } from "@/lib/public-api-cors"
import { getPublicApiClient } from "@/lib/public-api-auth"
import { createPublicZone, getPublicZoneList } from "@/services/public/zone.service"

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

type CreateZoneBody = {
  name?: string
  description?: string | null
  locationId?: string
  status?: number
}

/**
 * GET /api/public/zones?page=1&limit=10&keyword=&locationId=&status=&publishedOnly=&updatedSince=
 * POST /api/public/zones — create zone
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
  const status = searchParams.get("status")
  const publishedOnly = searchParams.get("publishedOnly")
  const updatedSince = searchParams.get("updatedSince")

  const result = await getPublicZoneList({
    page,
    limit,
    keyword,
    locationId,
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
      zones: result.data,
      totalRecords: result.totalRecords,
    })
  )
}

export async function POST(request: NextRequest) {
  const client = await getPublicApiClient(request.headers, { recheckBlocked: true })
  if (!client) return unauthorized()

  let body: CreateZoneBody
  try {
    body = (await request.json()) as CreateZoneBody
  } catch {
    return withCors(
      NextResponse.json(
        { error: "invalid_request", error_description: "Invalid JSON body" },
        { status: 400 }
      )
    )
  }

  const result = await createPublicZone(body)

  if (!result.success) {
    return withCors(
      NextResponse.json(
        {
          error: "invalid_request",
          error_description: result.error?.message ?? "Failed to create zone",
          ...(result.error?.issues ? { validation_errors: result.error.issues } : {}),
        },
        { status: 400 }
      )
    )
  }

  return withCors(NextResponse.json({ zone: result.data }, { status: 201 }))
}
