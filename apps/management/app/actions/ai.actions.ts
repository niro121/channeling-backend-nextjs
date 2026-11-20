'use server';

import { aiFailure, getAiActor } from '@/lib/ai/actor';
import {
  createAssistant,
  deleteAssistant,
  deleteChat,
  getChatMessages,
  listAssistantsForAdmin,
  listChats,
  startChat,
  testConnection,
  updateAssistant,
  type AiActor
} from '@/lib/ai/service';
import type { ChatMessage } from '@/lib/ai/adk';
import type { ActionResult, AssistantAdminItem, AssistantInput, ChatListItem } from '@/types/ai';

async function run<T>(fn: (actor: AiActor) => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn(await getAiActor());
    return (data === undefined ? { success: true } : { success: true, data }) as ActionResult<T>;
  } catch (error) {
    return aiFailure(error);
  }
}

// ─── Chatting ───────────────────────────────────────────────────────────────

export async function listChatsAction(assistantId: string): Promise<ActionResult<ChatListItem[]>> {
  return run((actor) => listChats(actor, assistantId));
}

export async function startChatAction(assistantId: string): Promise<ActionResult<{ chatId: string }>> {
  return run((actor) => startChat(actor, assistantId));
}

export async function getChatMessagesAction(chatId: string): Promise<ActionResult<{ assistantId: string; messages: ChatMessage[] }>> {
  return run((actor) => getChatMessages(actor, chatId));
}

export async function deleteChatAction(chatId: string): Promise<ActionResult> {
  return run((actor) => deleteChat(actor, chatId));
}

// ─── Setting up assistants ──────────────────────────────────────────────────

export async function listAssistantsAdminAction(): Promise<ActionResult<AssistantAdminItem[]>> {
  return run((actor) => listAssistantsForAdmin(actor));
}

export async function createAssistantAction(input: AssistantInput): Promise<ActionResult<{ id: string }>> {
  return run((actor) => createAssistant(actor, input));
}

export async function updateAssistantAction(id: string, input: AssistantInput): Promise<ActionResult> {
  return run((actor) => updateAssistant(actor, id, input));
}

export async function deleteAssistantAction(id: string): Promise<ActionResult> {
  return run((actor) => deleteAssistant(actor, id));
}

export async function testConnectionAction(adkBaseUrl: string, adkAppName: string): Promise<ActionResult<{ apps: string[]; appFound: boolean }>> {
  return run((actor) => testConnection(actor, adkBaseUrl, adkAppName));
}
