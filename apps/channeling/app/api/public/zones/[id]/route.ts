import { NextRequest, NextResponse } from "next/server"
import { publicApiCorsHeaders } from "@/lib/public-api-cors"
import { getPublicApiClient } from "@/lib/public-api-auth"
import {
  deletePublicZone,
  getPublicZoneById,
  updatePublicZone,
} from "@/services/public/zone.service"

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

type UpdateZoneBody = Partial<{
  name: string
  description: string | null
  locationId: string
  status: number
}>

/**
 * GET /api/public/zones/[id] — get one zone
 * PATCH /api/public/zones/[id] — update zone
 * DELETE /api/public/zones/[id] — delete zone
 * Requires Bearer token from /api/public/token.
 */
export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }))
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await getPublicApiClient(request.headers, { recheckBlocked: true })
  if (!client) return unauthorized()

  const { id } = await params
  const result = await getPublicZoneById(id)

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

  return withCors(NextResponse.json({ zone: result.data }))
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await getPublicApiClient(request.headers, { recheckBlocked: true })
  if (!client) return unauthorized()

  const { id } = await params
  if (!id?.trim()) {
    return withCors(
      NextResponse.json(
        { error: "invalid_request", error_description: "Zone id is required" },
        { status: 400 }
      )
    )
  }

  let body: UpdateZoneBody
  try {
    body = (await request.json()) as UpdateZoneBody
  } catch {
    return withCors(
      NextResponse.json(
        { error: "invalid_request", error_description: "Invalid JSON body" },
        { status: 400 }
      )
    )
  }

  const result = await updatePublicZone(id, body)

  if (!result.success) {
    const status = result.notFound ? 404 : 400
    return withCors(
      NextResponse.json(
        {
          error: result.notFound ? "not_found" : "invalid_request",
          error_description: result.error?.message ?? "Failed to update zone",
          ...(result.error?.issues ? { validation_errors: result.error.issues } : {}),
        },
        { status }
      )
    )
  }

  return withCors(NextResponse.json({ zone: result.data }))
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await getPublicApiClient(request.headers, { recheckBlocked: true })
  if (!client) return unauthorized()

  const { id } = await params
  if (!id?.trim()) {
    return withCors(
      NextResponse.json(
        { error: "invalid_request", error_description: "Zone id is required" },
        { status: 400 }
      )
    )
  }

  const result = await deletePublicZone(id)

  if (!result.success) {
    if (result.linked) {
      return withCors(
        NextResponse.json(
          {
            error: "conflict",
            error_description: result.error?.message ?? "Zone cannot be deleted",
          },
          { status: 409 }
        )
      )
    }

    const status = result.notFound ? 404 : 500
    return withCors(
      NextResponse.json(
        {
          error: result.notFound ? "not_found" : "server_error",
          error_description: result.error?.message ?? "Failed to delete zone",
        },
        { status }
      )
    )
  }

  return withCors(NextResponse.json({ deleted: true, id }))
}
