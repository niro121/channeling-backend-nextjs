import { NextResponse } from "next/server"
import { DOCTOR_USER_TYPE } from "@/lib/doctor-app-auth"
import { changeInitialPassword } from "@/lib/helpers/auth/change-initial-password"
import { parseLoginIdentifier } from "@/lib/helpers/auth/parse-login-identifier"

/**
 * POST /api/doctor-app/auth/change-initial-password
 * First login: doctor must set a new password before normal login/2FA flow.
 * Body: {
 *   email?: string,
 *   username?: string,
 *   currentPassword: string,
 *   newPassword: string,
 *   confirmPassword?: string
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const identifier = parseLoginIdentifier(body)
    const currentPassword =
      typeof body?.currentPassword === "string" ? body.currentPassword : ""
    const newPassword =
      typeof body?.newPassword === "string" ? body.newPassword : ""
    const confirmPassword =
      typeof body?.confirmPassword === "string" ? body.confirmPassword : undefined

    const result = await changeInitialPassword({
      identifier,
      currentPassword,
      newPassword,
      confirmPassword,
      userType: DOCTOR_USER_TYPE,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({
      success: true,
      message:
        "Password updated. Sign in again with your email/username and new password.",
    })
  } catch (e) {
    console.error("doctor-app change-initial-password error", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
