import { NextRequest, NextResponse } from "next/server"
import { publicApiCorsHeaders } from "@/lib/public-api-cors"
import { getPublicApiClient } from "@/lib/public-api-auth"
import { getPublicAreas } from "@/services/public/areas.service"

function withCors(res: NextResponse) {
  Object.entries(publicApiCorsHeaders()).forEach(([k, v]) => res.headers.set(k, v))
  return res
}

/**
 * GET /api/public/areas?keyword=colombo
 * Returns active area tags (cities) for external booking integrations.
 * Requires a valid Public API Bearer token.
 * Use the area `name` when calling POST /api/public/bookings (`area` field).
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
  const keyword = searchParams.get("keyword")?.trim() ?? undefined

  const result = await getPublicAreas(keyword)

  if (!result.success) {
    return withCors(
      NextResponse.json(
        { error: result.code, error_description: result.message },
        { status: 500 }
      )
    )
  }

  return withCors(NextResponse.json({ areas: result.data }))
}
