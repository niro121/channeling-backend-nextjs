export type { ActionResult } from '@/types/tasks';

export type ChatListItem = {
  id: string;
  title: string;
  /** ISO */
  lastMessageAt: string;
  messageCount: number;
};
