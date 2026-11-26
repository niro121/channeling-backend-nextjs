'use server';

import { aiFailure, getAiActor } from '@/lib/ai/actor';
import { deleteChat, getChatMessages, listChats, startChat, type AiActor } from '@/lib/ai/service';
import type { ChatMessage } from '@/lib/ai/adk';
import type { ActionResult, ChatListItem } from '@/types/ai';

async function run<T>(fn: (actor: AiActor) => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn(await getAiActor());
    return (data === undefined ? { success: true } : { success: true, data }) as ActionResult<T>;
  } catch (error) {
    return aiFailure(error);
  }
}

export async function listChatsAction(): Promise<ActionResult<ChatListItem[]>> {
  return run((actor) => listChats(actor));
}

export async function startChatAction(): Promise<ActionResult<{ chatId: string }>> {
  return run((actor) => startChat(actor));
}

export async function getChatMessagesAction(chatId: string): Promise<ActionResult<{ messages: ChatMessage[] }>> {
  return run((actor) => getChatMessages(actor, chatId));
}

export async function deleteChatAction(chatId: string): Promise<ActionResult> {
  return run((actor) => deleteChat(actor, chatId));
}
