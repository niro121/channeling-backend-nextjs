import { NextRequest, NextResponse } from "next/server"
import { publicApiCorsHeaders } from "@/lib/public-api-cors"
import { getPublicApiClient } from "@/lib/public-api-auth"
import {
  createPublicLocation,
  getPublicLocationList,
} from "@/services/public/location.service"

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

type CreateLocationBody = {
  name?: string
  code?: string
  addressLine1?: string | null
  addressLine2?: string | null
  city?: string | null
  branchType?: number
  status?: number
  order?: number
  color?: string | null
}

/**
 * GET /api/public/locations?page=1&limit=10&keyword=&status=&branchType=&publishedOnly=&updatedSince=
 * POST /api/public/locations — create location
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
  const status = searchParams.get("status")
  const branchType = searchParams.get("branchType")
  const publishedOnly = searchParams.get("publishedOnly")
  const updatedSince = searchParams.get("updatedSince")

  const result = await getPublicLocationList({
    page,
    limit,
    keyword,
    status,
    branchType,
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
      locations: result.data,
      totalRecords: result.totalRecords,
    })
  )
}

export async function POST(request: NextRequest) {
  const client = await getPublicApiClient(request.headers, { recheckBlocked: true })
  if (!client) return unauthorized()

  let body: CreateLocationBody
  try {
    body = (await request.json()) as CreateLocationBody
  } catch {
    return withCors(
      NextResponse.json(
        { error: "invalid_request", error_description: "Invalid JSON body" },
        { status: 400 }
      )
    )
  }

  const result = await createPublicLocation(body)

  if (!result.success) {
    return withCors(
      NextResponse.json(
        {
          error: "invalid_request",
          error_description: result.error?.message ?? "Failed to create location",
          ...(result.error?.issues ? { validation_errors: result.error.issues } : {}),
        },
        { status: 400 }
      )
    )
  }

  return withCors(
    NextResponse.json(
      {
        location: result.data,
        ...(result.warning ? { warning: result.warning } : {}),
      },
      { status: 201 }
    )
  )
}
