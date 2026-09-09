import { NextRequest, NextResponse } from "next/server"
import { publicApiCorsHeaders } from "@/lib/public-api-cors"
import { getPublicApiClient } from "@/lib/public-api-auth"
import { getPublicDoctors } from "@/services/public/doctors.service"

function withCors(res: NextResponse) {
  Object.entries(publicApiCorsHeaders()).forEach(([k, v]) => res.headers.set(k, v))
  return res
}

/**
 * GET /api/public/doctors?keyword=anura
 * Returns published doctors with speciality for external integrations (e.g. DPAY).
 * Requires a valid Public API Bearer token.
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

  const result = await getPublicDoctors(keyword)

  if (!result.success) {
    return withCors(
      NextResponse.json(
        { error: result.code, error_description: result.message },
        { status: 500 }
      )
    )
  }

  return withCors(NextResponse.json({ doctors: result.data }))
}
