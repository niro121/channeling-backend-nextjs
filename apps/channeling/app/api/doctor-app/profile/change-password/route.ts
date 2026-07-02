import { NextResponse } from "next/server"
import { getDoctorAppUserId } from "@/lib/doctor-app-auth"
import { changeDoctorAppPasswordForUser } from "@/services/doctor-app/change-doctor-app-password.service"

/**
 * POST /api/doctor-app/profile/change-password
 * Change password for logged-in doctor user.
 */
export async function POST(request: Request) {
  try {
    const userId = await getDoctorAppUserId(request.headers)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null
    if (!body) {
      return NextResponse.json(
        { error: "invalid_request", message: "Invalid JSON body" },
        { status: 400 }
      )
    }

    const result = await changeDoctorAppPasswordForUser(userId, {
      currentPassword:
        typeof body.currentPassword === "string" ? body.currentPassword : "",
      newPassword: typeof body.newPassword === "string" ? body.newPassword : "",
      confirmPassword:
        typeof body.confirmPassword === "string"
          ? body.confirmPassword
          : undefined,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({ success: true, message: result.message })
  } catch (e) {
    console.error("doctor-app change password error", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
