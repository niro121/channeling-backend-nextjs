import { withPublicApiLog } from "@/lib/public-api-log"
import { NextRequest, NextResponse } from "next/server"
import { publicApiCorsHeaders } from "@/lib/public-api-cors"
import { getPublicApiClient } from "@/lib/public-api-auth"
import { resumePublicCashierShift } from "@/services/public/cashier-shift.service"

function withCors(res: NextResponse) {
  Object.entries(publicApiCorsHeaders()).forEach(([k, v]) => res.headers.set(k, v))
  return res
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }))
}

export const POST = withPublicApiLog(async function POST(request: NextRequest) {
  const client = await getPublicApiClient(request.headers, { recheckBlocked: true })
  if (!client) {
    return withCors(
      NextResponse.json(
        { error: "invalid_token", error_description: "Missing or invalid Bearer token" },
        { status: 401 }
      )
    )
  }

  const body = (await request.json().catch(() => null)) as { userId?: string } | null
  const result = await resumePublicCashierShift(body?.userId ?? "")
  if (!result.success) {
    return withCors(
      NextResponse.json({ error: "shift_resume_failed", error_description: result.message }, { status: 400 })
    )
  }

  return withCors(NextResponse.json({ shift: result.shift }))
})
