import { NextResponse } from 'next/server';
import { aiFailure, getAiActor } from '@/lib/ai/actor';
import { ayuTarget, streamAdkTurn } from '@/lib/ai/adk';
import { getOwnChat, recordUserMessage } from '@/lib/ai/service';
import { channelingTokenForAyu } from '@/lib/channeling-user-api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STATUS: Record<string, number> = { forbidden: 403, not_found: 404, invalid: 400, unavailable: 502 };

/**
 * POST /api/ai/chats/[chatId]/messages { text } — sends one message and streams the reply back as
 * SSE (`data: {type: delta|final|error|done}`). The only way a browser reaches Ayu.
 */
export async function POST(request: Request, { params }: { params: Promise<{ chatId: string }> }) {
  try {
    const { chatId } = await params;
    const actor = await getAiActor();
    const chat = await getOwnChat(actor, chatId);
    const body = (await request.json().catch(() => null)) as { text?: unknown } | null;
    const text = await recordUserMessage(chat, body?.text);
    // Ayu's staff tools look things up in channeling as this person, with this token (this reply only).
    const token = await channelingTokenForAyu();
    const stream = await streamAdkTurn(
      ayuTarget(),
      actor.userId,
      chat.adkSessionId,
      text,
      request.signal,
      token ? { 'temp:management_token': token } : undefined
    );
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
