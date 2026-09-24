import { NextRequest, NextResponse } from "next/server"
import { getDoctorAppUserId } from "@/lib/doctor-app-auth"
import { getDoctorAppSessionByIdForUser } from "@/services/doctor-app/get-doctor-app-session-by-id.service"

/**
 * GET /api/doctor-app/sessions/:sessionId
 * Mobile app: get a single session by id for the logged-in doctor.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const userId = await getDoctorAppUserId(request.headers)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { sessionId } = await context.params
    const result = await getDoctorAppSessionByIdForUser(userId, sessionId)

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          ...(result.message ? { message: result.message } : {}),
        },
        { status: result.status }
      )
    }

    return NextResponse.json({ session: result.session })
  } catch (e) {
    console.error("doctor-app session by id error", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
