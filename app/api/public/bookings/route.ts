import { NextRequest, NextResponse } from "next/server"
import { publicApiCorsHeaders } from "@/lib/public-api-cors"
import { getPublicApiClient } from "@/lib/public-api-auth"
import { getPublicBookingsByDoctorCode } from "@/services/public/bookings.service"
import { createPublicAgentBooking } from "@/services/public/create-booking.service"

function withCors(res: NextResponse) {
  Object.entries(publicApiCorsHeaders()).forEach(([k, v]) => res.headers.set(k, v))
  return res
}

/**
 * GET /api/public/bookings?doctorCode=…&sessionId=…|date=…
 * POST /api/public/bookings — agent booking (JSON body, reuses saveBookingService).
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

  const sessionId = searchParams.get("sessionId")?.trim() ?? null
  const date = searchParams.get("date")?.trim() ?? null
  const includePending =
    searchParams.get("includePending")?.trim().toLowerCase() === "true"

  const result = await getPublicBookingsByDoctorCode({
    doctorCode,
    sessionId,
    date,
    includePending,
  })

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

  return withCors(NextResponse.json({ bookings: result.data }))
}

type CreateBookingBody = {
  sessionId?: string
  agencyId?: string
  bookReference?: string
  title?: string
  name?: string
  sex?: string
  phone?: string
  area?: string
  remarks?: string
  foreigner?: boolean
}

/**
 * POST /api/public/bookings
 * Create an agent-method booking. Reuses channel-booking saveBookingService.
 */
export async function POST(request: NextRequest) {
  const client = await getPublicApiClient(request.headers, { recheckBlocked: true })
  if (!client) {
    return withCors(
      NextResponse.json(
        {
          error: "invalid_token",
          error_description:
            "Missing or invalid Bearer token, blocked client, or API client has no acting user configured",
        },
        { status: 401 }
      )
    )
  }

  let body: CreateBookingBody
  try {
    body = (await request.json()) as CreateBookingBody
  } catch {
    return withCors(
      NextResponse.json(
        { error: "invalid_request", error_description: "Invalid JSON body" },
        { status: 400 }
      )
    )
  }

  const result = await createPublicAgentBooking({
    sessionId: body.sessionId ?? "",
    agencyId: body.agencyId ?? "",
    bookReference: body.bookReference ?? "",
    title: body.title ?? "",
    name: body.name ?? "",
    sex: body.sex ?? "",
    phone: body.phone ?? "",
    area: body.area ?? "",
    remarks: body.remarks,
    foreigner: body.foreigner,
    createdByUserId: client.actingUserId,
    apiClientId: client.id,
  })

  if (!result.success) {
    const status =
      result.code === "invalid_request" || result.code === "booking_error"
        ? 400
        : result.code === "not_found"
          ? 404
          : 500
    return withCors(
      NextResponse.json(
        {
          error: result.code,
          error_description: result.message,
          ...(result.bookingErrorCode
            ? { booking_error_code: result.bookingErrorCode }
            : {}),
        },
        { status }
      )
    )
  }

  return withCors(NextResponse.json({ booking: result.data }, { status: 201 }))
}
