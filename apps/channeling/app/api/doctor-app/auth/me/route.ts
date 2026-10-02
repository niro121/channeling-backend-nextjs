import { NextResponse } from "next/server"
import { getDoctorAppUserId } from "@/lib/doctor-app-auth"
import { doctorAppGetSession } from "@/services/doctor-app-auth.service"

/**
 * GET /api/doctor-app/auth/me
 * Returns the logged-in doctor user and linked doctor profile (Bearer token).
 */
export async function GET(request: Request) {
  try {
    const userId = await getDoctorAppUserId(request.headers)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await doctorAppGetSession(userId)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({
      user: result.user,
      doctor: result.doctor,
    })
  } catch (e) {
    console.error("doctor-app me error", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
