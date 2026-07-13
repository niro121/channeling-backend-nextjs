import { NextRequest, NextResponse } from "next/server"
import { publicApiCorsHeaders } from "@/lib/public-api-cors"
import { getPublicApiClient } from "@/lib/public-api-auth"
import { getPublicStaffList } from "@/services/public/staff.service"

function withCors(res: NextResponse) {
  Object.entries(publicApiCorsHeaders()).forEach(([k, v]) => res.headers.set(k, v))
  return res
}

/**
 * GET /api/public/staff?page=1&limit=10&keyword=
 * Returns slim staff DTOs (no audit fields). Requires Bearer token from /api/public/token.
 */
export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }))
}

export async function GET(request: NextRequest) {
  const client = await getPublicApiClient(request.headers, { recheckBlocked: true })
  if (!client) {
    return withCors(
      NextResponse.json(
        { error: "invalid_token", error_description: "Missing or invalid Bearer token" },
        { status: 401 }
      )
    )
  }

  const { searchParams } = new URL(request.url)
  const page = searchParams.get("page")
  const limit = searchParams.get("limit")
  const keyword = searchParams.get("keyword")

  const result = await getPublicStaffList({ page, limit, keyword })

  if (!result.success) {
    const status = result.code === "invalid_request" ? 400 : 500
    return withCors(
      NextResponse.json(
        { error: result.code, error_description: result.message },
        { status }
      )
    )
  }

  return withCors(
    NextResponse.json({
      staff: result.data,
      totalRecords: result.totalRecords,
    })
  )
}
