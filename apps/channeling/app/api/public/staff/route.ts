import { NextRequest, NextResponse } from "next/server"
import { publicApiCorsHeaders } from "@/lib/public-api-cors"
import { getPublicApiClient } from "@/lib/public-api-auth"
import { getPublicStaffList, getPublicStaffById } from "@/services/public/staff.service"
import { createStaff } from "@/services/staff.service"
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

type CreateStaffBody = {
  code?: string
  title?: string
  name?: string
  nic?: string
  dateOfBirth?: string | null
  gender?: string
  contactMobile?: string
  address?: string
  dateJoined?: string | null
  status?: number
}

/**
 * GET /api/public/staff?page=1&limit=10&keyword=
 * POST /api/public/staff — create staff
 * Requires Bearer token from /api/public/token.
 */
export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }))
}

export async function GET(request: NextRequest) {
  const client = await getPublicApiClient(request.headers, { recheckBlocked: true })
  if (!client) return unauthorized()

  const { searchParams } = new URL(request.url)
  const page = searchParams.get("page")
  const limit = searchParams.get("limit")
  const keyword = searchParams.get("keyword")

  const result = await getPublicStaffList({ page, limit, keyword })

  if (!result.success) {
    const status = result.code === "invalid_request" ? 400 : 500
    return withCors(
      NextResponse.json(
        { error: result.code, error_description: result.message },
        { status }
      )
    )
  }

  return withCors(
    NextResponse.json({
      staff: result.data,
      totalRecords: result.totalRecords,
    })
  )
}

export async function POST(request: NextRequest) {
  const client = await getPublicApiClient(request.headers, { recheckBlocked: true })
  if (!client) return unauthorized()

  let body: CreateStaffBody
  try {
    body = (await request.json()) as CreateStaffBody
  } catch {
    return withCors(
      NextResponse.json(
        { error: "invalid_request", error_description: "Invalid JSON body" },
        { status: 400 }
      )
    )
  }

  const payload: Staff = {
    code: body.code ?? "",
    title: body.title ?? "",
    name: body.name ?? "",
    nic: body.nic ?? "",
    dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
    gender: body.gender ?? "",
    contactMobile: body.contactMobile ?? "",
    address: body.address ?? "",
    dateJoined: body.dateJoined ? new Date(body.dateJoined) : undefined,
    status: typeof body.status === "number" ? body.status : 1,
  }

  const result = await createStaff(payload)

  if (!result.success) {
    return withCors(
      NextResponse.json(
        {
          error: "invalid_request",
          error_description: result.error?.message ?? "Failed to create staff",
          ...(result.error?.issues ? { validation_errors: result.error.issues } : {}),
        },
        { status: 400 }
      )
    )
  }

  const createdId = result.data?.id as string | undefined
  if (createdId) {
    const staff = await getPublicStaffById(createdId)
    if (staff.success) {
      return withCors(NextResponse.json({ staff: staff.data }, { status: 201 }))
    }
  }

  return withCors(
    NextResponse.json({ staff: { id: createdId, saved: true } }, { status: 201 })
  )
}
