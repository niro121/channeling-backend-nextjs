import { NextRequest, NextResponse } from "next/server"
import { publicApiCorsHeaders } from "@/lib/public-api-cors"
import { getPublicApiClient } from "@/lib/public-api-auth"
import { getPublicAgencyStatement } from "@/services/public/agencies.service"

function withCors(res: NextResponse) {
  Object.entries(publicApiCorsHeaders()).forEach(([k, v]) => res.headers.set(k, v))
  return res
}

/**
 * GET /api/public/agencies/:agencyId/statement?dateFrom=&dateTo=
 * Agent statement from the same report service as hospital Agent Statement.
 * Requires Bearer token.
 */
export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }))
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agencyId: string }> }
) {
  const client = await getPublicApiClient(request.headers, { recheckBlocked: true })
  if (!client) {
    return withCors(
      NextResponse.json(
        { error: "invalid_token", error_description: "Missing or invalid Bearer token" },
        { status: 401 }
      )
    )
  }

  const { agencyId } = await params
  const dateFrom = request.nextUrl.searchParams.get("dateFrom") ?? ""
  const dateTo = request.nextUrl.searchParams.get("dateTo") ?? ""
  const result = await getPublicAgencyStatement(agencyId ?? "", dateFrom, dateTo)

  if (!result.success) {
    const status =
      result.code === "invalid_request"
        ? 400
        : result.code === "not_found"
          ? 404
          : 500
    return withCors(
      NextResponse.json(
        {
          error: result.code,
          error_description: result.message,
        },
        { status }
      )
    )
  }

  return withCors(NextResponse.json(result.data))
}
