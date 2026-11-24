import "server-only"
import { hasPermission } from "@/lib/permissions"
import type { ManagementActor } from "@/lib/management-app-auth"
import type { Permissions } from "@/types/user-group"

/**
 * Ayu privileges for the management app. The app talks to Ayu Management (ADK app
 * `ayu_management`) with its own service key; channeling only decides who may chat.
 */
export const MANAGEMENT_AI_RESOURCE = "management-ai"

export type AiPermissions = {
  /** Chat with Ayu in the management app */
  chat: boolean
}

export function aiPermissionsFor(isAdmin: boolean, permissions: Permissions | null): AiPermissions {
  if (isAdmin) return { chat: true }
  return { chat: hasPermission(permissions, MANAGEMENT_AI_RESOURCE, "chat") }
}

export function actorAiPermissions(actor: ManagementActor): AiPermissions {
  return aiPermissionsFor(actor.isAdmin, actor.permissions)
}
