import { NextRequest, NextResponse } from "next/server"
import { publicApiCorsHeaders } from "@/lib/public-api-cors"
import { getPublicApiClient } from "@/lib/public-api-auth"
import { getPublicStaffById } from "@/services/public/staff.service"
import { updateStaff, deleteStaff } from "@/services/staff.service"
import type { Staff } from "@/types/staff"

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

type UpdateStaffBody = Partial<{
  code: string
  title: string
  name: string
  nic: string
  dateOfBirth: string | null
  gender: string
  contactMobile: string
  address: string
  dateJoined: string | null
  status: number
}>

/**
 * GET /api/public/staff/[id] — get one staff record
 * PATCH /api/public/staff/[id] — update staff
 * DELETE /api/public/staff/[id] — delete staff
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
  const result = await getPublicStaffById(id)

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

  return withCors(NextResponse.json({ staff: result.data }))
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
        { error: "invalid_request", error_description: "Staff id is required" },
        { status: 400 }
      )
    )
  }

  let body: UpdateStaffBody
  try {
    body = (await request.json()) as UpdateStaffBody
  } catch {
    return withCors(
      NextResponse.json(
        { error: "invalid_request", error_description: "Invalid JSON body" },
        { status: 400 }
      )
    )
  }

  const payload: Partial<Staff> = {}
  if (body.code !== undefined) payload.code = body.code
  if (body.title !== undefined) payload.title = body.title
  if (body.name !== undefined) payload.name = body.name
  if (body.nic !== undefined) payload.nic = body.nic
  if (body.dateOfBirth !== undefined) {
    payload.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : undefined
  }
  if (body.gender !== undefined) payload.gender = body.gender
  if (body.contactMobile !== undefined) payload.contactMobile = body.contactMobile
  if (body.address !== undefined) payload.address = body.address
  if (body.dateJoined !== undefined) {
    payload.dateJoined = body.dateJoined ? new Date(body.dateJoined) : undefined
  }
  if (body.status !== undefined) payload.status = body.status

  const result = await updateStaff(id, payload)

  if (!result.success) {
    const message = result.error?.message ?? "Failed to update staff"
    const notFound = message.toLowerCase().includes("not found")
    return withCors(
      NextResponse.json(
        {
          error: notFound ? "not_found" : "invalid_request",
          error_description: message,
          ...(result.error?.issues ? { validation_errors: result.error.issues } : {}),
        },
        { status: notFound ? 404 : 400 }
      )
    )
  }

  const staff = await getPublicStaffById(id)
  if (staff.success) {
    return withCors(NextResponse.json({ staff: staff.data }))
  }

  return withCors(NextResponse.json({ staff: { id, saved: true } }))
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
        { error: "invalid_request", error_description: "Staff id is required" },
        { status: 400 }
      )
    )
  }

  const result = await deleteStaff(id)

  if (!result.success) {
    const message = result.error?.message ?? "Failed to delete staff"
    const notFound = message.toLowerCase().includes("not found")
    return withCors(
      NextResponse.json(
        { error: notFound ? "not_found" : "server_error", error_description: message },
        { status: notFound ? 404 : 500 }
      )
    )
  }

  return withCors(NextResponse.json({ deleted: true, id }))
}
