import { NextRequest, NextResponse } from "next/server"
import { publicApiCorsHeaders } from "@/lib/public-api-cors"
import { getPublicApiClient } from "@/lib/public-api-auth"
import {
  deletePublicRoom,
  getPublicRoomById,
  updatePublicRoom,
} from "@/services/public/room.service"

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

type UpdateRoomBody = Partial<{
  number: string
  description: string | null
  locationId: string
  zoneId: string
  status: number
}>

/**
 * GET /api/public/rooms/[id] — get one room
 * PATCH /api/public/rooms/[id] — update room
 * DELETE /api/public/rooms/[id] — delete room
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
  const result = await getPublicRoomById(id)

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

  return withCors(NextResponse.json({ room: result.data }))
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
        { error: "invalid_request", error_description: "Room id is required" },
        { status: 400 }
      )
    )
  }

  let body: UpdateRoomBody
  try {
    body = (await request.json()) as UpdateRoomBody
  } catch {
    return withCors(
      NextResponse.json(
        { error: "invalid_request", error_description: "Invalid JSON body" },
        { status: 400 }
      )
    )
  }

  const result = await updatePublicRoom(id, body)

  if (!result.success) {
    const status = result.notFound ? 404 : 400
    return withCors(
      NextResponse.json(
        {
          error: result.notFound ? "not_found" : "invalid_request",
          error_description: result.error?.message ?? "Failed to update room",
          ...(result.error?.issues ? { validation_errors: result.error.issues } : {}),
        },
        { status }
      )
    )
  }

  return withCors(NextResponse.json({ room: result.data }))
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
        { error: "invalid_request", error_description: "Room id is required" },
        { status: 400 }
      )
    )
  }

  const result = await deletePublicRoom(id)

  if (!result.success) {
    if (result.linked) {
      return withCors(
        NextResponse.json(
          {
            error: "conflict",
            error_description: result.error?.message ?? "Room cannot be deleted",
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
          error_description: result.error?.message ?? "Failed to delete room",
        },
        { status }
      )
    )
  }

  return withCors(NextResponse.json({ deleted: true, id }))
}
