import { NextRequest, NextResponse } from "next/server"
import { publicApiCorsHeaders } from "@/lib/public-api-cors"
import { getPublicApiClient } from "@/lib/public-api-auth"
import { getPublicAgencyByCode } from "@/services/public/agencies.service"

function withCors(res: NextResponse) {
  Object.entries(publicApiCorsHeaders()).forEach(([k, v]) => res.headers.set(k, v))
  return res
}

/**
 * GET /api/public/agencies/by-code/:code
 * Published agency lookup for website agent-user setup. Requires Bearer token.
 */
export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }))
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
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

  const { code } = await params
  const result = await getPublicAgencyByCode(decodeURIComponent(code ?? ""))

  if (!result.success) {
    const status =
      result.code === "invalid_request" || result.code === "no_linked_account"
        ? 400
        : result.code === "not_found"
          ? 404
          : 500
    return withCors(
      NextResponse.json(
        {
          error: result.code,
          error_description: result.message,
          ...(result.bookingErrorCode
            ? { booking_error_code: result.bookingErrorCode }
            : {}),
        },
        { status }
      )
    )
  }

  return withCors(NextResponse.json({ agency: result.data }))
}
