import type { Audience } from '@/lib/ai/constants';

export type { ActionResult } from '@/types/tasks';

/** An assistant as shown in "Ask Ayu". */
export type ChatAssistant = {
  id: string;
  name: string;
  description: string | null;
  greeting: string | null;
  audience: Audience;
};

export type ChatListItem = {
  id: string;
  title: string;
  /** ISO */
  lastMessageAt: string;
  messageCount: number;
};

export type AssistantAdminItem = {
  id: string;
  name: string;
  description: string | null;
  adkBaseUrl: string;
  adkAppName: string;
  audience: Audience;
  greeting: string | null;
  active: boolean;
  sortOrder: number;
  chatCount: number;
};

export type AssistantInput = {
  name: string;
  description?: string | null;
  adkBaseUrl: string;
  adkAppName: string;
  audience: Audience;
  greeting?: string | null;
  active?: boolean;
  sortOrder: number;
};
