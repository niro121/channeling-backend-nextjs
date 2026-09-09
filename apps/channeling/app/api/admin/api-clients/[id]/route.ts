import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { userTypes } from "@/lib/roles"
import prisma from "@/lib/prisma"

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  const userType = (session.user as { userType?: number }).userType
  if (userType !== userTypes.admin) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { error: null }
}

/** PATCH /api/admin/api-clients/[id] — update isBlocked. Body: { isBlocked?: boolean }. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const isBlocked = typeof body.isBlocked === "boolean" ? body.isBlocked : undefined
    if (isBlocked === undefined) {
      return NextResponse.json(
        { error: "isBlocked (boolean) is required" },
        { status: 400 }
      )
    }

    const client = await prisma.apiClient.update({
      where: { id },
      data: { isBlocked },
      select: {
        id: true,
        clientId: true,
        name: true,
        isBlocked: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    return NextResponse.json(client)
  } catch (e: unknown) {
    const isNotFound =
      e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2025"
    if (isNotFound) {
      return NextResponse.json({ error: "API client not found" }, { status: 404 })
    }
    console.error("PATCH /api/admin/api-clients/[id] error:", e)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
