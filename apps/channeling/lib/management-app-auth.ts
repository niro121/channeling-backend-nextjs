import "server-only"
import { jwtVerify } from "jose"
import type { Prisma } from "@prisma/client"
import prisma from "@/lib/prisma"
import { hasPermission } from "@/lib/permissions"
import { isDashboardLoginUserType, userTypes } from "@/lib/roles"
import type { Permissions } from "@/types/user-group"

/**
 * Per-user tokens minted by the management app's server (apps/management/lib/channeling-user-api.ts).
 * The browser never sees them: management signs a short-lived token for its signed-in user,
 * and these routes act as that user with the same services and permission checks as the web app.
 */
export const MANAGEMENT_APP_JWT_ISSUER = "archmage-management"
export const MANAGEMENT_APP_JWT_AUDIENCE = "channeling-management-api"

function getJwtSecret(): Uint8Array | null {
  // Dedicated secret on purpose: no fallback to NEXTAUTH_SECRET or other token secrets.
  const secret = process.env.MANAGEMENT_APP_JWT_SECRET
  return secret ? new TextEncoder().encode(secret) : null
}

export type ManagementActor = {
  userId: string
  permissions: Permissions | null
  isAdmin: boolean
  /** management-app.access in the channeling group (admins always). Enforced in requireManagementActor. */
  hasAppAccess: boolean
}

export const MANAGEMENT_APP_RESOURCE = "management-app"
export const MANAGEMENT_APP_ACCESS = "access"

const OBJECT_ID = /^[a-f0-9]{24}$/i

/**
 * Resolve the channeling user behind a management Bearer token.
 * Permissions are read from the DB on every call, never from the token.
 * Matches by user id; falls back to email when the auth DB is a separate copy.
 */
export async function getManagementActor(headers: Headers): Promise<ManagementActor | null> {
  const secret = getJwtSecret()
  if (!secret) return null

  const auth = headers.get("authorization")
  if (!auth?.startsWith("Bearer ")) return null
  const token = auth.slice(7).trim()
  if (!token) return null

  let sub: string
  let email: string | null
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: MANAGEMENT_APP_JWT_ISSUER,
      audience: MANAGEMENT_APP_JWT_AUDIENCE,
    })
    if (!payload.sub || typeof payload.sub !== "string") return null
    sub = payload.sub
    email = typeof payload.email === "string" && payload.email.trim() ? payload.email.trim() : null
  } catch {
    return null
  }

  const user = (OBJECT_ID.test(sub) ? await findActorUser({ id: sub }) : null)
    ?? (email ? await findActorUser({ email: { equals: email, mode: "insensitive" } }) : null)
  return user ? toActor(user) : null
}

const ACTOR_SELECT = {
  id: true,
  status: true,
  userType: true,
  userGroup: { select: { permissions: true } },
} as const

function findActorUser(where: Prisma.UserWhereInput) {
  return prisma.user.findFirst({ where, select: ACTOR_SELECT })
}

function toActor(user: NonNullable<Awaited<ReturnType<typeof findActorUser>>>): ManagementActor | null {
  if (user.status !== 1 || !isDashboardLoginUserType(user.userType)) return null
  const permissions = (user.userGroup?.permissions as Permissions | null) ?? null
  const isAdmin = user.userType === userTypes.admin
  return {
    userId: user.id,
    permissions,
    isAdmin,
    hasAppAccess: isAdmin || hasPermission(permissions, MANAGEMENT_APP_RESOURCE, MANAGEMENT_APP_ACCESS),
  }
}

/** Same lookup as the token path, by channeling user id (used for push badge counts). */
export async function getActorByUserId(userId: string): Promise<ManagementActor | null> {
  if (!OBJECT_ID.test(userId)) return null
  const user = await findActorUser({ id: userId })
  return user ? toActor(user) : null
}
