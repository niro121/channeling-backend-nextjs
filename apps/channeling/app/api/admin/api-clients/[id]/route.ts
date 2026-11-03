import { NextRequest, NextResponse } from "next/server"
import { privilegeDenied } from "@/lib/api-privilege"
import prisma from "@/lib/prisma"

async function requireApiClientsEdit() {
  const denied = await privilegeDenied("api-clients", "edit")
  return { error: denied }
}

/** PATCH /api/admin/api-clients/[id] — update isBlocked. Body: { isBlocked?: boolean }. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiClientsEdit()
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
