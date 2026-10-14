/** AI assistant constants shared by the server and the browser. */

export type AiPermissions = {
  /** Chat with Public assistants (e.g. patient/visitor Ayu) */
  chat: boolean;
  /** Chat with Staff assistants (e.g. Ayu for Management) */
  chatStaff: boolean;
  /** Add and edit assistants */
  manage: boolean;
};

export const NO_AI_PERMISSIONS: AiPermissions = { chat: false, chatStaff: false, manage: false };

export const AUDIENCES = ['STAFF', 'PUBLIC'] as const;
export type Audience = (typeof AUDIENCES)[number];

export const AUDIENCE_LABEL: Record<Audience, string> = {
  STAFF: 'Staff',
  PUBLIC: 'Public'
};

export const AUDIENCE_HINT: Record<Audience, string> = {
  STAFF: 'Only people with “Chat with staff assistants” can use it.',
  PUBLIC: 'Patients and visitors (website widget later). Staff with “Chat with public assistants” can try it here.'
};

export function isAudience(value: unknown): value is Audience {
  return typeof value === 'string' && (AUDIENCES as readonly string[]).includes(value);
}

export function canChatWith(perms: AiPermissions, audience: string): boolean {
  return audience === 'PUBLIC' ? perms.chat : perms.chatStaff;
}

export function canUseAi(perms: AiPermissions): boolean {
  return perms.chat || perms.chatStaff;
}

export const MAX_MESSAGE_LENGTH = 4000;
