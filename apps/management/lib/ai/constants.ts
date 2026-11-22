/** Ayu constants shared by the server and the browser. */

export type AiPermissions = {
  /** Chat with Ayu (channeling group `management-ai.chat`) */
  chat: boolean;
};

export const NO_AI_PERMISSIONS: AiPermissions = { chat: false };

export function canUseAi(perms: AiPermissions): boolean {
  return perms.chat;
}

export const MAX_MESSAGE_LENGTH = 4000;
