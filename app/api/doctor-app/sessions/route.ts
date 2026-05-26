import { NextRequest, NextResponse } from "next/server"
import { getDoctorAppUserId } from "@/lib/doctor-app-auth"
import { getDoctorAppSessions } from "@/services/doctor-app/sessions.service"

/**
 * GET /api/doctor-app/sessions?fromDate=YYYY-MM-DD
 * Returns sessions for the logged-in doctor (Bearer JWT from login).
 * fromDate is optional; default is today.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getDoctorAppUserId(request.headers)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fromDateParam = searchParams.get("fromDate")?.trim() ?? null

    const result = await getDoctorAppSessions(userId, fromDateParam)

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          ...(result.message ? { message: result.message } : {}),
        },
        { status: result.status }
      )
    }

    return NextResponse.json({ sessions: result.sessions })
  } catch (e) {
    console.error("doctor-app sessions error", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
