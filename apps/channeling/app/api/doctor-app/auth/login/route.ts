import { NextResponse } from "next/server"
import { parseLoginIdentifier } from "@/lib/helpers/auth/parse-login-identifier"
import { doctorAppLogin } from "@/services/doctor-app-auth.service"

/**
 * POST /api/doctor-app/auth/login
 * Completes doctor mobile login and returns a Bearer JWT.
 * Body: {
 *   email: string,           // email or username
 *   password: string,
 *   twoFactorCode?: string,  // required when account/group requires 2FA
 *   twoFactorToken?: string  // AUTH-APP pending token from request-2fa-code
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const identifier = parseLoginIdentifier(body)
    const password = typeof body?.password === "string" ? body.password : ""
    const twoFactorCode =
      typeof body?.twoFactorCode === "string" ? body.twoFactorCode : undefined
    const twoFactorToken =
      typeof body?.twoFactorToken === "string"
        ? body.twoFactorToken.trim() || null
        : null

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Email/username and password required" },
        { status: 400 }
      )
    }

    const result = await doctorAppLogin(
      identifier,
      password,
      twoFactorCode,
      twoFactorToken
    )

    if (!result.success) {
      if (result.requiresPasswordChange) {
        return NextResponse.json(
          { requiresPasswordChange: true, error: result.error },
          { status: 403 }
        )
      }
      if (result.requiresTwoFactor) {
        return NextResponse.json(
          {
            requiresTwoFactor: true,
            allowedMethods: result.allowedMethods,
            error: result.error,
          },
          { status: 403 }
        )
      }
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({
      access_token: result.accessToken,
      token_type: result.tokenType,
      expires_in: result.expiresIn,
      user: result.user,
      doctor: result.doctor,
    })
  } catch (e) {
    console.error("doctor-app login error", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
