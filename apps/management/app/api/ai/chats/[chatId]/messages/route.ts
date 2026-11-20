import { NextResponse } from 'next/server';
import { aiFailure, getAiActor } from '@/lib/ai/actor';
import { streamAdkTurn } from '@/lib/ai/adk';
import { getOwnChat, recordUserMessage } from '@/lib/ai/service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STATUS: Record<string, number> = { forbidden: 403, not_found: 404, invalid: 400, unavailable: 502 };

/**
 * POST /api/ai/chats/[chatId]/messages { text } — sends one message and streams the reply back as
 * SSE (`data: {type: delta|final|error|done}`). The only way a browser reaches an assistant.
 */
export async function POST(request: Request, { params }: { params: Promise<{ chatId: string }> }) {
  try {
    const { chatId } = await params;
    const actor = await getAiActor();
    const chat = await getOwnChat(actor, chatId);
    const body = (await request.json().catch(() => null)) as { text?: unknown } | null;
    const text = await recordUserMessage(chat, body?.text);
    const stream = await streamAdkTurn(chat.assistant, actor.userId, chat.adkSessionId, text, request.signal);
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no'
      }
    });
  } catch (error) {
    const failure = aiFailure(error);
    return NextResponse.json(failure, { status: STATUS[failure.errorCode] ?? 500 });
  }
}
