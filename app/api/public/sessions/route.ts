import { NextRequest, NextResponse } from "next/server"
import { publicApiCorsHeaders } from "@/lib/public-api-cors"
import { getPublicApiClient } from "@/lib/public-api-auth"
import { getPublicSessionsByDoctorCode } from "@/services/public/sessions.service"

function withCors(res: NextResponse) {
  Object.entries(publicApiCorsHeaders()).forEach(([k, v]) => res.headers.set(k, v))
  return res
}

/**
 * GET /api/public/sessions?doctorCode=DR0001&fromDate=YYYY-MM-DD
 * fromDate optional; default is today. Returns slim session DTOs (no audit fields).
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
  const doctorCode = searchParams.get("doctorCode")?.trim()
  if (!doctorCode) {
    return withCors(
      NextResponse.json(
        { error: "invalid_request", error_description: "doctorCode is required" },
        { status: 400 }
      )
    )
  }

  const fromDateParam = searchParams.get("fromDate")?.trim() ?? null
  const result = await getPublicSessionsByDoctorCode(doctorCode, fromDateParam)

  if (!result.success) {
    const status =
      result.code === "invalid_request"
        ? 400
        : result.code === "not_found"
          ? 404
          : 500
    return withCors(
      NextResponse.json(
        { error: result.code, error_description: result.message },
        { status }
      )
    )
  }

  return withCors(NextResponse.json({ sessions: result.data }))
}
