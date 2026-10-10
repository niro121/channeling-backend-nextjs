import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { userTypes } from "@/lib/roles"
import { canAccessRoute, hasPermission } from "@/lib/permissions"

async function denyUnless(allowed: (userType: number, permissions: Parameters<typeof hasPermission>[0]) => boolean) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.userType === userTypes.admin || allowed(session.user.userType, session.user.permissions)) {
    return null
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

/** 401/403 response, or null when this session may open the route. */
export async function routeDenied(route: string) {
  return denyUnless((_userType, permissions) => canAccessRoute(permissions, route))
}

/** 401/403 response, or null when this session has the privilege. */
export async function privilegeDenied(resource: string, action: string) {
  return denyUnless((_userType, permissions) => hasPermission(permissions, resource, action))
}
