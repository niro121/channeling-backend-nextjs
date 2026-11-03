import { NextResponse } from "next/server"
import { parseLoginIdentifier } from "@/lib/helpers/auth/parse-login-identifier"
import { doctorAppRequest2faCode } from "@/services/doctor-app-auth.service"

/**
 * POST /api/doctor-app/auth/request-2fa-code
 * After check-login returned requiresTwoFactor, send or prepare 2FA for the doctor account.
 * Body: { email: string, password: string, method: string } — method "1" | "2" | "3"
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const identifier = parseLoginIdentifier(body)
    const password = typeof body?.password === "string" ? body.password : ""
    const method = typeof body?.method === "string" ? body.method.trim() : ""

    if (!identifier || !password || !method) {
      return NextResponse.json(
        { error: "Email/username, password, and method (1, 2, or 3) required" },
        { status: 400 }
      )
    }

    const result = await doctorAppRequest2faCode(identifier, password, method)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({
      twoFactorToken: result.twoFactorToken,
      needsSetup: result.needsSetup,
      uri: result.uri,
      secret: result.secret,
      message: result.message,
    })
  } catch (e) {
    console.error("doctor-app request-2fa-code error", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
