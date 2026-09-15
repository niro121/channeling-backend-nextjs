import { NextRequest, NextResponse } from "next/server"
import { publicApiCorsHeaders } from "@/lib/public-api-cors"
import { getPublicApiClient } from "@/lib/public-api-auth"
import { deleteStaffs } from "@/services/staff.service"

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

/**
 * POST /api/public/staff/bulk-delete
 * Body: { ids: string[] }
 * Requires Bearer token from /api/public/token.
 */
export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }))
}

export async function POST(request: NextRequest) {
  const client = await getPublicApiClient(request.headers, { recheckBlocked: true })
  if (!client) return unauthorized()

  let body: { ids?: unknown }
  try {
    body = (await request.json()) as { ids?: unknown }
  } catch {
    return withCors(
      NextResponse.json(
        { error: "invalid_request", error_description: "Invalid JSON body" },
        { status: 400 }
      )
    )
  }

  const ids = Array.isArray(body.ids)
    ? body.ids.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : []

  if (!ids.length) {
    return withCors(
      NextResponse.json(
        { error: "invalid_request", error_description: "ids must be a non-empty array of staff ids" },
        { status: 400 }
      )
    )
  }

  const result = await deleteStaffs(ids)

  if (!result.success) {
    const message = result.error?.message ?? "Failed to delete staff"
    const notFound =
      message.toLowerCase().includes("not found") || message.toLowerCase().includes("no staff")
    return withCors(
      NextResponse.json(
        { error: notFound ? "not_found" : "server_error", error_description: message },
        { status: notFound ? 404 : 500 }
      )
    )
  }

  return withCors(
    NextResponse.json({
      deleted: true,
      count: result.data?.count ?? ids.length,
    })
  )
}
