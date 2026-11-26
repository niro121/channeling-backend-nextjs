import { NextResponse } from "next/server"
import { parseLoginIdentifier } from "@/lib/helpers/auth/parse-login-identifier"
import { doctorAppCheckLogin } from "@/services/doctor-app-auth.service"

/**
 * POST /api/doctor-app/auth/check-login
 * Doctor mobile: validate email or username + password; returns whether 2FA is required.
 * Body: { email: string, password: string } — "email" may be email or username
 */
export async function POST(request: Request) {
  try {
    let body: { email?: string; username?: string; password?: string }
    try {
      body = (await request.json()) as {
        email?: string
        username?: string
        password?: string
      }
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const identifier = parseLoginIdentifier(body)
    const password = typeof body?.password === "string" ? body.password : ""

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Email/username and password required" },
        { status: 400 }
      )
    }

    const result = await doctorAppCheckLogin(identifier, password)

    if (!result.success) {
      if (result.requiresPasswordChange) {
        return NextResponse.json(
          { requiresPasswordChange: true },
          { status: 403 }
        )
      }
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    if (result.requiresTwoFactor) {
      return NextResponse.json({
        requiresTwoFactor: true,
        allowedMethods: result.allowedMethods,
      })
    }

    return NextResponse.json({ success: true, requiresTwoFactor: false })
  } catch (e) {
    console.error("doctor-app check-login error", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
