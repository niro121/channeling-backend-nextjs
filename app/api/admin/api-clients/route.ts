import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import * as argon2 from "argon2"
import * as crypto from "crypto"
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

/** GET /api/admin/api-clients — list all API clients (no secrets). */
export async function GET() {
  const auth = await requireAdmin()
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

/** POST /api/admin/api-clients — create a new API client. Body: { name: string }. Returns clientSecret only once. */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  try {
    const body = await request.json().catch(() => ({}))
    const name = typeof body.name === "string" ? body.name.trim() : ""
    if (!name) {
      return NextResponse.json(
        { error: "name is required and must be a non-empty string" },
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
