import { SignJWT, jwtVerify } from "jose"

export const DOCTOR_APP_JWT_ISSUER = "channeling-doctor-app"
export const DOCTOR_APP_JWT_AUDIENCE = "channeling-doctor-app"
export const DOCTOR_USER_TYPE = 3

const DEFAULT_EXPIRES_IN_SEC =
  Number(process.env.DOCTOR_APP_TOKEN_EXPIRES_SEC) || 60 * 60 * 24 * 7 // 7 days

function getJwtSecret(): Uint8Array {
  const secret =
    process.env.DOCTOR_APP_JWT_SECRET ??
    process.env.OAUTH_JWT_SECRET ??
    process.env.JWT_SECRET ??
    process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error(
      "DOCTOR_APP_JWT_SECRET, OAUTH_JWT_SECRET, JWT_SECRET, or NEXTAUTH_SECRET must be set for doctor app token signing"
    )
  }
  return new TextEncoder().encode(secret)
}

export type DoctorAppTokenPayload = {
  sub: string
  userType: number
  iat: number
  exp: number
  iss?: string
  aud?: string
}

export async function issueDoctorAppToken(
  userId: string,
  expiresInSec: number = DEFAULT_EXPIRES_IN_SEC
): Promise<{ accessToken: string; expiresIn: number }> {
  const secret = getJwtSecret()
  const now = Math.floor(Date.now() / 1000)
  const exp = now + expiresInSec
  const accessToken = await new SignJWT({ userType: DOCTOR_USER_TYPE })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(DOCTOR_APP_JWT_ISSUER)
    .setAudience(DOCTOR_APP_JWT_AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(secret)
  return { accessToken, expiresIn: expiresInSec }
}

/** Returns user id from Bearer token, or null if missing/invalid/not a doctor token. */
export async function getDoctorAppUserId(
  headers: Headers
): Promise<string | null> {
  const auth = headers.get("authorization")
  if (!auth?.startsWith("Bearer ")) return null
  const token = auth.slice(7).trim()
  if (!token) return null

  try {
    const secret = getJwtSecret()
    const { payload } = await jwtVerify(token, secret, {
      issuer: DOCTOR_APP_JWT_ISSUER,
      audience: DOCTOR_APP_JWT_AUDIENCE,
    })
    const userId = payload.sub
    if (!userId || typeof userId !== "string") return null
    const userType = (payload as { userType?: number }).userType
    if (userType !== DOCTOR_USER_TYPE) return null
    return userId
  } catch {
    return null
  }
}
