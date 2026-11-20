import "server-only"
import { hasPermission } from "@/lib/permissions"
import type { ManagementActor } from "@/lib/management-app-auth"
import type { Permissions } from "@/types/user-group"

/**
 * AI assistant privileges for the management app. Assistants (Ayu, Ayu for Management) are set up
 * and proxied by the management app; channeling only decides who may chat with which kind and who
 * may set them up.
 */
export const MANAGEMENT_AI_RESOURCE = "management-ai"

export type AiPermissions = {
  /** Chat with Public assistants (e.g. patient/visitor Ayu) */
  chat: boolean
  /** Chat with Staff assistants (e.g. Ayu for Management) */
  chatStaff: boolean
  /** Add and edit assistants */
  manage: boolean
}

export function aiPermissionsFor(isAdmin: boolean, permissions: Permissions | null): AiPermissions {
  if (isAdmin) return { chat: true, chatStaff: true, manage: true }
  const can = (action: string) => hasPermission(permissions, MANAGEMENT_AI_RESOURCE, action)
  return { chat: can("chat"), chatStaff: can("chat-staff"), manage: can("manage") }
}

export function actorAiPermissions(actor: ManagementActor): AiPermissions {
  return aiPermissionsFor(actor.isAdmin, actor.permissions)
}
