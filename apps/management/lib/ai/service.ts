import 'server-only';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { MAX_MESSAGE_LENGTH, type AiPermissions } from './constants';
import { ayuTarget, createAdkSession, deleteAdkSession, getAdkMessages, type ChatMessage } from './adk';
import type { ChatListItem } from '@/types/ai';

/**
 * Chats with Ayu. Who may chat comes from channeling (`management-ai.chat`, loaded per request
 * through /api/management/me); the conversation itself lives on the Ayu server. This app only keeps
 * each person's list of chats.
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

/** A chat that belongs to this person. */
export async function getOwnChat(actor: AiActor, chatId: string) {
  const chat = await prisma.assistantChat.findUnique({ where: { id: chatId } }).catch(() => null);
  if (!chat || chat.userId !== actor.userId) throw new AiError('Chat not found.', 'not_found');
  return chat;
}

export async function listChats(actor: AiActor): Promise<ChatListItem[]> {
  const chats = await prisma.assistantChat.findMany({
    where: { userId: actor.userId, messageCount: { gt: 0 } },
    orderBy: { lastMessageAt: 'desc' },
    take: 50
  });
  return chats.map((c) => ({ id: c.id, title: c.title, lastMessageAt: c.lastMessageAt.toISOString(), messageCount: c.messageCount }));
}

/**
 * Starts a conversation. The Ayu session is seeded with who is signed in (user: state), so Ayu
 * knows the person without asking — and the person can't change it from the chat.
 */
export async function startChat(actor: AiActor): Promise<{ chatId: string }> {
  const adkSessionId = randomUUID();
  await createAdkSession(ayuTarget(), actor.userId, adkSessionId, {
    'user:authenticated': true,
    'user:account_id': actor.userId,
    'user:account_name': actor.name ?? '',
    'user:account_email': actor.email ?? '',
    'user:account_role': actor.isAdmin ? 'admin' : 'staff',
    'user:channel': 'management_app'
  });
  const chat = await prisma.assistantChat.create({ data: { userId: actor.userId, adkSessionId } });
  return { chatId: chat.id };
}

export async function getChatMessages(actor: AiActor, chatId: string): Promise<{ messages: ChatMessage[] }> {
  const chat = await getOwnChat(actor, chatId);
  return { messages: await getAdkMessages(ayuTarget(), actor.userId, chat.adkSessionId) };
}

export async function deleteChat(actor: AiActor, chatId: string): Promise<void> {
  const chat = await getOwnChat(actor, chatId);
  await prisma.assistantChat.delete({ where: { id: chat.id } });
  await deleteAdkSession(ayuTarget(), actor.userId, chat.adkSessionId);
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
