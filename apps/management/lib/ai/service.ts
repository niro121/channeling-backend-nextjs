import 'server-only';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { canChatWith, isAudience, MAX_MESSAGE_LENGTH, type AiPermissions } from './constants';
import { createAdkSession, deleteAdkSession, getAdkMessages, listAdkApps, normalizeAdkBaseUrl, type ChatMessage } from './adk';
import type { AssistantAdminItem, AssistantInput, ChatAssistant, ChatListItem } from '@/types/ai';

/**
 * AI assistants and chats. Who may do what comes from channeling (`management-ai` privileges,
 * loaded per request through /api/management/me); the conversation itself lives in the ADK server.
 */
export class AiError extends Error {
  constructor(message: string, readonly code: 'forbidden' | 'not_found' | 'invalid' | 'unavailable') {
    super(message);
  }
}

export type AiActor = {
  userId: string;
  name: string | null;
  email: string | null;
  isAdmin: boolean;
  perms: AiPermissions;
};

const NEW_CHAT_TITLE = 'New chat';

function toChatAssistant(a: { id: string; name: string; description: string | null; greeting: string | null; audience: string }): ChatAssistant {
  return { id: a.id, name: a.name, description: a.description, greeting: a.greeting, audience: isAudience(a.audience) ? a.audience : 'STAFF' };
}

/** Assistants this person may chat with, in display order. */
export async function listChatAssistants(actor: AiActor): Promise<ChatAssistant[]> {
  const rows = await prisma.assistant.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  return rows.filter((a) => canChatWith(actor.perms, a.audience)).map(toChatAssistant);
}

async function getUsableAssistant(actor: AiActor, assistantId: string) {
  const assistant = await prisma.assistant.findUnique({ where: { id: assistantId } }).catch(() => null);
  if (!assistant || !assistant.active) throw new AiError('That assistant is not available.', 'not_found');
  if (!canChatWith(actor.perms, assistant.audience)) throw new AiError("You don't have access to this assistant.", 'forbidden');
  return assistant;
}

/** A chat that belongs to this person, with an assistant they may still use. */
export async function getOwnChat(actor: AiActor, chatId: string) {
  const chat = await prisma.assistantChat.findUnique({ where: { id: chatId }, include: { assistant: true } }).catch(() => null);
  if (!chat || chat.userId !== actor.userId) throw new AiError('Chat not found.', 'not_found');
  if (!chat.assistant.active) throw new AiError('That assistant is not available.', 'not_found');
  if (!canChatWith(actor.perms, chat.assistant.audience)) throw new AiError("You don't have access to this assistant.", 'forbidden');
  return chat;
}

export async function listChats(actor: AiActor, assistantId: string): Promise<ChatListItem[]> {
  await getUsableAssistant(actor, assistantId);
  const chats = await prisma.assistantChat.findMany({
    where: { userId: actor.userId, assistantId, messageCount: { gt: 0 } },
    orderBy: { lastMessageAt: 'desc' },
    take: 50
  });
  return chats.map((c) => ({ id: c.id, title: c.title, lastMessageAt: c.lastMessageAt.toISOString(), messageCount: c.messageCount }));
}

/**
 * Starts a conversation. The ADK session is seeded with who is signed in (user: state), so the
 * assistant knows the person without asking — and the person can't change it from the chat.
 */
export async function startChat(actor: AiActor, assistantId: string): Promise<{ chatId: string }> {
  const assistant = await getUsableAssistant(actor, assistantId);
  const adkSessionId = randomUUID();
  await createAdkSession(assistant, actor.userId, adkSessionId, {
    'user:authenticated': true,
    'user:account_id': actor.userId,
    'user:account_name': actor.name ?? '',
    'user:account_email': actor.email ?? '',
    'user:account_role': actor.isAdmin ? 'admin' : 'staff',
    'user:channel': 'management_app'
  });
  const chat = await prisma.assistantChat.create({ data: { assistantId, userId: actor.userId, adkSessionId } });
  return { chatId: chat.id };
}

export async function getChatMessages(actor: AiActor, chatId: string): Promise<{ assistantId: string; messages: ChatMessage[] }> {
  const chat = await getOwnChat(actor, chatId);
  const messages = await getAdkMessages(chat.assistant, actor.userId, chat.adkSessionId);
  return { assistantId: chat.assistantId, messages };
}

export async function deleteChat(actor: AiActor, chatId: string): Promise<void> {
  const chat = await prisma.assistantChat.findUnique({ where: { id: chatId }, include: { assistant: true } }).catch(() => null);
  if (!chat || chat.userId !== actor.userId) throw new AiError('Chat not found.', 'not_found');
  await prisma.assistantChat.delete({ where: { id: chat.id } });
  await deleteAdkSession(chat.assistant, actor.userId, chat.adkSessionId);
}

/** Validates a message and records it on the chat (title from the first message). */
export async function recordUserMessage(chat: { id: string; title: string; messageCount: number }, raw: unknown): Promise<string> {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) throw new AiError('Type a message first.', 'invalid');
  if (text.length > MAX_MESSAGE_LENGTH) throw new AiError(`Messages can be up to ${MAX_MESSAGE_LENGTH} characters.`, 'invalid');
  const title = chat.title === NEW_CHAT_TITLE ? (text.length > 60 ? `${text.slice(0, 57).trimEnd()}…` : text) : chat.title;
  await prisma.assistantChat.update({
    where: { id: chat.id },
    data: { title, messageCount: { increment: 1 }, lastMessageAt: new Date() }
  });
  return text;
}

// ─── Setting up assistants (management-ai.manage) ───────────────────────────

function requireManage(actor: AiActor) {
  if (!actor.perms.manage) throw new AiError("You don't have access to set up assistants.", 'forbidden');
}

function cleanInput(input: AssistantInput) {
  const name = input.name?.trim();
  if (!name) throw new AiError('Give the assistant a name.', 'invalid');
  const adkBaseUrl = normalizeAdkBaseUrl(input.adkBaseUrl ?? '');
  if (!adkBaseUrl) throw new AiError('Enter the server address, e.g. https://ruhunuai-xxxx.run.app', 'invalid');
  const adkAppName = input.adkAppName?.trim();
  if (!adkAppName || !/^[A-Za-z0-9_-]+$/.test(adkAppName)) throw new AiError('Enter the app name on that server, e.g. ayu_management', 'invalid');
  if (!isAudience(input.audience)) throw new AiError('Choose who the assistant is for.', 'invalid');
  return {
    name: name.slice(0, 80),
    description: input.description?.trim().slice(0, 300) || null,
    adkBaseUrl,
    adkAppName,
    audience: input.audience,
    greeting: input.greeting?.trim().slice(0, 300) || null,
    active: input.active !== false,
    sortOrder: Number.isFinite(input.sortOrder) ? Math.trunc(input.sortOrder) : 0
  };
}

export async function listAssistantsForAdmin(actor: AiActor): Promise<AssistantAdminItem[]> {
  requireManage(actor);
  const rows = await prisma.assistant.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: { _count: { select: { chats: true } } }
  });
  return rows.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    adkBaseUrl: a.adkBaseUrl,
    adkAppName: a.adkAppName,
    audience: isAudience(a.audience) ? a.audience : 'STAFF',
    greeting: a.greeting,
    active: a.active,
    sortOrder: a.sortOrder,
    chatCount: a._count.chats
  }));
}

export async function createAssistant(actor: AiActor, input: AssistantInput): Promise<{ id: string }> {
  requireManage(actor);
  const data = cleanInput(input);
  const created = await prisma.assistant.create({ data: { ...data, createdById: actor.userId } });
  return { id: created.id };
}

export async function updateAssistant(actor: AiActor, id: string, input: AssistantInput): Promise<void> {
  requireManage(actor);
  const data = cleanInput(input);
  const found = await prisma.assistant.findUnique({ where: { id } }).catch(() => null);
  if (!found) throw new AiError('Assistant not found.', 'not_found');
  await prisma.assistant.update({ where: { id }, data });
}

/** Removes the assistant and everyone's chat list for it (the ADK server keeps its own session store). */
export async function deleteAssistant(actor: AiActor, id: string): Promise<void> {
  requireManage(actor);
  const found = await prisma.assistant.findUnique({ where: { id } }).catch(() => null);
  if (!found) throw new AiError('Assistant not found.', 'not_found');
  await prisma.assistantChat.deleteMany({ where: { assistantId: id } });
  await prisma.assistant.delete({ where: { id } });
}

/** "Test connection": the key works and the app name exists on that server. */
export async function testConnection(actor: AiActor, rawBaseUrl: string, appName: string): Promise<{ apps: string[]; appFound: boolean }> {
  requireManage(actor);
  const baseUrl = normalizeAdkBaseUrl(rawBaseUrl);
  if (!baseUrl) throw new AiError('Enter the server address, e.g. https://ruhunuai-xxxx.run.app', 'invalid');
  const apps = await listAdkApps(baseUrl);
  return { apps, appFound: apps.includes(appName.trim()) };
}
