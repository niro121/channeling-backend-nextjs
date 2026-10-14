import { NextRequest, NextResponse } from "next/server"
import * as argon2 from "argon2"
import * as crypto from "crypto"
import { userTypes } from "@/lib/roles"
import { privilegeDenied } from "@/lib/api-privilege"
import prisma from "@/lib/prisma"

async function requireApiClients(action: "view" | "add" | "edit") {
  const denied = await privilegeDenied("api-clients", action)
  return { error: denied }
}

/** GET /api/admin/api-clients — list all API clients (no secrets). */
export async function GET() {
  const auth = await requireApiClients("view")
  if (auth.error) return auth.error

  try {
    const clients = await prisma.apiClient.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        clientId: true,
        name: true,
        isBlocked: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    return NextResponse.json({ clients })
  } catch (e) {
    console.error("GET /api/admin/api-clients error:", e)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

/** POST /api/admin/api-clients — create. Body: { name, actingUserId }. Returns clientSecret only once. */
export async function POST(request: NextRequest) {
  const auth = await requireApiClients("add")
  if (auth.error) return auth.error

  try {
    const body = await request.json().catch(() => ({}))
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const actingUserId =
      typeof body.actingUserId === "string" ? body.actingUserId.trim() : ""
    if (!name) {
      return NextResponse.json(
        { error: "name is required and must be a non-empty string" },
        { status: 400 }
      )
    }
    if (!actingUserId) {
      return NextResponse.json({ error: "actingUserId is required" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: actingUserId },
      select: { id: true, userType: true, status: true },
    })
    if (!user || user.userType !== userTypes.apiUser || user.status !== 1) {
      return NextResponse.json(
        { error: "actingUserId must be an active API User" },
        { status: 400 }
      )
    }

    const clientId = crypto.randomUUID()
    const clientSecret = crypto.randomBytes(32).toString("hex")
    const clientSecretHash = await argon2.hash(clientSecret)

    const client = await prisma.apiClient.create({
      data: {
        clientId,
        clientSecretHash,
        name,
        isBlocked: false,
        actingUserId,
      },
      select: {
        id: true,
        clientId: true,
        name: true,
        isBlocked: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      ...client,
      clientSecret,
    })
  } catch (e) {
    console.error("POST /api/admin/api-clients error:", e)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
