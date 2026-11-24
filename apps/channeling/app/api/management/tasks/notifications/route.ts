import { NextResponse } from "next/server"
import { requireManagementActor } from "@/lib/management-api-route"
import { listTaskNotifications, markTaskNotificationsRead } from "@/services/management/task-access.service"

export const dynamic = "force-dynamic"

/** GET /api/management/tasks/notifications — the management app's bell (task notifications). */
export async function GET(request: Request) {
  const auth = await requireManagementActor(request)
  if ("response" in auth) return auth.response
  const limit = Number(new URL(request.url).searchParams.get("limit")) || 30
  return NextResponse.json({ success: true, ...(await listTaskNotifications(auth.actor.userId, limit)) })
}

/** POST /api/management/tasks/notifications — mark read. Body: { taskId? } (omit for all). */
export async function POST(request: Request) {
  const auth = await requireManagementActor(request)
  if ("response" in auth) return auth.response
  const body = await request.json().catch(() => null)
  const taskId = typeof body?.taskId === "string" && /^[a-f0-9]{24}$/i.test(body.taskId) ? body.taskId : null
  const updated = await markTaskNotificationsRead(auth.actor.userId, taskId)
  return NextResponse.json({ success: true, updated })
}
