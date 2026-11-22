import { NextResponse } from "next/server"
import { requireManagementActor } from "@/lib/management-api-route"
import { actorTaskPermissions, listTaskPeople } from "@/services/management/task-access.service"

export const dynamic = "force-dynamic"

/** GET /api/management/tasks/people — people who can be assigned tasks (management app + tasks access). */
export async function GET(request: Request) {
  const auth = await requireManagementActor(request)
  if ("response" in auth) return auth.response
  if (!actorTaskPermissions(auth.actor).view) {
    return NextResponse.json({ success: false, errorCode: "forbidden", message: "Permission denied" }, { status: 403 })
  }
  try {
    return NextResponse.json({ success: true, data: await listTaskPeople() })
  } catch (error) {
    console.error("management task people", error)
    return NextResponse.json({ success: false, errorCode: "server_error", message: "Could not load people" }, { status: 500 })
  }
}
