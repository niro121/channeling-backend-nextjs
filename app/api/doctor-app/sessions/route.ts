import { NextRequest, NextResponse } from "next/server"
import { getDoctorAppUserId } from "@/lib/doctor-app-auth"
import { listDoctorAppSessionsForUser } from "@/services/doctor-app/list-doctor-app-sessions.service"

/**
 * GET /api/doctor-app/sessions
 * Mobile app: sessions for the logged-in doctor (Bearer JWT).
 *
 * Query (optional):
 * - (none) — today only (default)
 * - all=true — from today onward (optional fromDate as start)
 * - fromDate=YYYY-MM-DD — that day only
 * - fromDate + toDate — inclusive date range
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getDoctorAppUserId(request.headers)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const result = await listDoctorAppSessionsForUser(userId, {
      all: searchParams.get("all") === "true",
      fromDate: searchParams.get("fromDate"),
      toDate: searchParams.get("toDate"),
    })

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
