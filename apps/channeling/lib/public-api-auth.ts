import { SignJWT, jwtVerify } from "jose"
import prisma from "./prisma"

const JWT_ISSUER = "channeling-public-api"
const JWT_AUDIENCE = "channeling-public-api"
const DEFAULT_EXPIRES_IN_SEC = 3600 // 1 hour

function getJwtSecret(): Uint8Array {
  const secret =
    process.env.OAUTH_JWT_SECRET ??
    process.env.JWT_SECRET ??
    process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error(
      "OAUTH_JWT_SECRET, JWT_SECRET, or NEXTAUTH_SECRET must be set for public API token signing"
    )
  }
  return new TextEncoder().encode(secret)
}

export type TokenPayload = {
  sub: string // clientId
  iat: number
  exp: number
  iss?: string
  aud?: string
}

/**
 * Issue a JWT for the given clientId (OAuth2 client credentials).
 * Used by POST /api/public/token.
 */
export async function issuePublicApiToken(
  clientId: string,
  expiresInSec: number = DEFAULT_EXPIRES_IN_SEC
): Promise<{ accessToken: string; expiresIn: number }> {
  const secret = getJwtSecret()
  const now = Math.floor(Date.now() / 1000)
  const exp = now + expiresInSec
  const accessToken = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(clientId)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(secret)
  return { accessToken, expiresIn: expiresInSec }
}

/**
 * Read Authorization: Bearer <token> from request headers, verify JWT (signature + expiry),
 * and return the clientId (sub). Optionally re-checks ApiClient is not blocked in DB.
 * Returns null if missing, invalid, or blocked.
 */
export type PublicApiClientContext = {
  /** OAuth client_id (JWT sub) */
  clientId: string
  /** ApiClient document id */
  id: string
  /** Public API bookings use this user as createdBy */
  actingUserId: string
}

export async function getPublicApiClient(
  headers: Headers,
  options?: { recheckBlocked?: boolean }
): Promise<PublicApiClientContext | null> {
  const auth = headers.get("authorization")
  if (!auth?.startsWith("Bearer ")) return null
  const token = auth.slice(7).trim()
  if (!token) return null

  try {
    const secret = getJwtSecret()
    const { payload } = await jwtVerify(token, secret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    })
    const clientId = payload.sub
    if (!clientId || typeof clientId !== "string") return null

    if (options?.recheckBlocked) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PrismaClient includes apiClient after generate
      const client = await (prisma as any).apiClient.findUnique({
        where: { clientId },
        select: { id: true, isBlocked: true, actingUserId: true },
      })
      if (!client || client.isBlocked) return null
      const actingUserId = client.actingUserId as string | null | undefined
      if (!actingUserId) return null
      return {
        clientId,
        id: client.id as string,
        actingUserId,
      }
    }

    return null
  } catch {
    return null
  }
}
