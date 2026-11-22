import { NextResponse } from "next/server"
import { requireManagementActor } from "@/lib/management-api-route"
import { actorTaskPermissions, sendTaskNotifications } from "@/services/management/task-access.service"

export const dynamic = "force-dynamic"

/**
 * POST /api/management/tasks/notify — in-app notification + phone push for a task event.
 * Body: { recipientIds: string[], type: "task_*", title, message?, taskId }.
 * Recipients are limited to people who can use tasks.
 */
export async function POST(request: Request) {
  const auth = await requireManagementActor(request)
  if ("response" in auth) return auth.response
  if (!actorTaskPermissions(auth.actor).view) {
    return NextResponse.json({ success: false, errorCode: "forbidden", message: "Permission denied" }, { status: 403 })
  }
  const body = await request.json().catch(() => null)
  // The management app already leaves out whoever acted; reminder jobs send as the task's creator
  // and may include them (e.g. "overdue" goes to the creator too).
  const recipientIds = Array.isArray(body?.recipientIds)
    ? body.recipientIds.filter((id: unknown): id is string => typeof id === "string")
    : []
  if (typeof body?.type !== "string" || typeof body?.title !== "string" || typeof body?.taskId !== "string") {
    return NextResponse.json({ success: false, errorCode: "invalid_input", message: "type, title and taskId are required" }, { status: 400 })
  }
  try {
    const result = await sendTaskNotifications({
      recipientIds,
      type: body.type,
      title: body.title,
      message: typeof body.message === "string" ? body.message : null,
      taskId: body.taskId,
    })
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send"
    return NextResponse.json({ success: false, errorCode: "invalid_input", message }, { status: 400 })
  }
}
