import "server-only"
import { NextResponse } from "next/server"
import { logActivityNonBlocking } from "@/lib/activity-log"
import { requireManagementActor } from "@/lib/management-api-route"
import { missingAyuPrivileges, type AyuTool } from "@/lib/ayu-tool-access"
import type { ManagementActor } from "@/lib/management-app-auth"

/**
 * Gate for Ayu's tools. Called by the Ayu server with the signed-in person's management token
 * (passed to Ayu for one message only), so channeling decides with that person's privileges.
 * A refusal says exactly which privileges are missing, so Ayu can tell the person.
 */
export async function requireAyuTool(
  request: Request,
  tool: AyuTool
): Promise<{ actor: ManagementActor } | { response: NextResponse }> {
  const auth = await requireManagementActor(request)
  if ("response" in auth) return auth
  const missing = missingAyuPrivileges(auth.actor, tool)
  if (missing.length) {
    logActivityNonBlocking({
      userId: auth.actor.userId,
      action: "ayu.tool.denied",
      entityType: "AyuTool",
      importance: "medium",
      metadata: { tool, missing },
    })
    return {
      response: NextResponse.json(
        {
          success: false,
          errorCode: "no_privilege",
          message: `You don't have the privilege to see this. Missing: ${missing.join("; ")}.`,
          missing,
        },
        { status: 403 }
      ),
    }
  }
  return { actor: auth.actor }
}

/** Runs a lookup, logs who asked for what, and returns { success, data }. */
export async function ayuLookup<T>(
  actor: ManagementActor,
  tool: string,
  query: Record<string, unknown>,
  fn: () => Promise<T>
): Promise<NextResponse> {
  try {
    const data = await fn()
    logActivityNonBlocking({
      userId: actor.userId,
      action: "ayu.tool.used",
      entityType: "AyuTool",
      importance: tool === "stay-contacts" ? "high" : "low",
      metadata: { tool, ...query, source: "ayu" },
    })
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error(`ayu tool ${tool}`, error)
    return NextResponse.json(
      { success: false, errorCode: "unavailable", message: "The hospital system couldn't answer just now." },
      { status: 500 }
    )
  }
}

export function param(request: Request, name: string): string {
  return (new URL(request.url).searchParams.get(name) ?? "").trim().slice(0, 100)
}
