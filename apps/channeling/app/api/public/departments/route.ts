import { NextRequest, NextResponse } from "next/server"
import { publicApiCorsHeaders } from "@/lib/public-api-cors"
import { getPublicApiClient } from "@/lib/public-api-auth"
import {
  createPublicDepartment,
  getPublicDepartmentList,
} from "@/services/public/department.service"

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

type CreateDepartmentBody = {
  name?: string
  description?: string | null
  institution?: number
  status?: number
}

/**
 * GET /api/public/departments?page=1&limit=10&keyword=&institution=&status=&updatedSince=
 * POST /api/public/departments — create department
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
  const institution = searchParams.get("institution")
  const status = searchParams.get("status")
  const updatedSince = searchParams.get("updatedSince")

  const result = await getPublicDepartmentList({
    page,
    limit,
    keyword,
    institution,
    status,
    updatedSince,
  })

  if (!result.success) {
    const statusCode = result.code === "invalid_request" ? 400 : 500
    return withCors(
      NextResponse.json(
        { error: result.code, error_description: result.message },
        { status: statusCode }
      )
    )
  }

  return withCors(
    NextResponse.json({
      departments: result.data,
      totalRecords: result.totalRecords,
    })
  )
}

export async function POST(request: NextRequest) {
  const client = await getPublicApiClient(request.headers, { recheckBlocked: true })
  if (!client) return unauthorized()

  let body: CreateDepartmentBody
  try {
    body = (await request.json()) as CreateDepartmentBody
  } catch {
    return withCors(
      NextResponse.json(
        { error: "invalid_request", error_description: "Invalid JSON body" },
        { status: 400 }
      )
    )
  }

  const result = await createPublicDepartment(body)

  if (!result.success) {
    return withCors(
      NextResponse.json(
        {
          error: "invalid_request",
          error_description: result.error?.message ?? "Failed to create department",
          ...(result.error?.issues ? { validation_errors: result.error.issues } : {}),
        },
        { status: 400 }
      )
    )
  }

  return withCors(NextResponse.json({ department: result.data }, { status: 201 }))
}
