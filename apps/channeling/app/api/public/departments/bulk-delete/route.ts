import { NextRequest, NextResponse } from "next/server"
import { publicApiCorsHeaders } from "@/lib/public-api-cors"
import { getPublicApiClient } from "@/lib/public-api-auth"
import { bulkDeletePublicDepartments } from "@/services/public/department.service"

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
 * POST /api/public/departments/bulk-delete
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
        {
          error: "invalid_request",
          error_description: "ids must be a non-empty array of department ids",
        },
        { status: 400 }
      )
    )
  }

  const result = await bulkDeletePublicDepartments(ids)

  if (!result.success) {
    const status = result.notFound ? 404 : 500
    return withCors(
      NextResponse.json(
        {
          error: result.notFound ? "not_found" : "server_error",
          error_description: result.error?.message ?? "Failed to delete departments",
        },
        { status }
      )
    )
  }

  return withCors(
    NextResponse.json({
      deleted: true,
      count: result.count ?? ids.length,
    })
  )
}
