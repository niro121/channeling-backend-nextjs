import { withPublicApiLog } from "@/lib/public-api-log"
import { NextRequest, NextResponse } from "next/server"
import { publicApiCorsHeaders } from "@/lib/public-api-cors"
import { getPublicApiClient } from "@/lib/public-api-auth"
import { getPublicCashierShift } from "@/services/public/cashier-shift.service"

function withCors(res: NextResponse) {
  Object.entries(publicApiCorsHeaders()).forEach(([k, v]) => res.headers.set(k, v))
  return res
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }))
}

/** GET /api/public/shifts/current?userId= Channeling user id. */
export const GET = withPublicApiLog(async function GET(request: NextRequest) {
  const client = await getPublicApiClient(request.headers, { recheckBlocked: true })
  if (!client) {
    return withCors(
      NextResponse.json(
        { error: "invalid_token", error_description: "Missing or invalid Bearer token" },
        { status: 401 }
      )
    )
  }

  const userId = new URL(request.url).searchParams.get("userId")?.trim() ?? ""
  const result = await getPublicCashierShift(userId)
  if (!result.success) {
    return withCors(
      NextResponse.json({ error: "invalid_request", error_description: result.message }, { status: 400 })
    )
  }

  return withCors(NextResponse.json({ shift: result.shift }))
})
