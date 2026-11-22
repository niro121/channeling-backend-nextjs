import 'server-only';

/**
 * Server-to-server calls to an ADK server (RuhunuAI). Every request carries X-Service-Key
 * (ADK_SERVICE_KEY, same value on the ADK server), so browsers can never talk to it directly.
 */
export type AdkTarget = { adkBaseUrl: string; adkAppName: string };

export type ChatMessage = { role: 'user' | 'assistant'; text: string };

/** What the browser receives from POST /api/ai/chats/[chatId]/messages, one JSON object per SSE `data:` line. */
export type ChatStreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'final'; text: string }
  | { type: 'error'; message: string }
  | { type: 'done' };

// Non-streaming calls only; a chat turn (tool calls included) streams with no overall limit.
const REQUEST_TIMEOUT_MS = 10_000;
// Heroku drops a response that sends nothing for 55s; a slow tool call must not end the chat.
const KEEPALIVE_MS = 15_000;

export class AdkError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export function normalizeAdkBaseUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
  } catch {
    return null;
  }
}

/**
 * The one assistant this app talks to: Ayu Management on the Ayu (RuhunuAI) server.
 * AYU_ADK_URL is the server (e.g. http://localhost:8080); AYU_ADK_APP defaults to ayu_management.
 */
export function ayuTarget(): AdkTarget {
  const adkBaseUrl = normalizeAdkBaseUrl(process.env.AYU_ADK_URL ?? '');
  if (!adkBaseUrl) throw new AdkError('Ayu is not connected (AYU_ADK_URL is not set).', 503);
  return { adkBaseUrl, adkAppName: process.env.AYU_ADK_APP?.trim() || 'ayu_management' };
}

function serviceKey(): string {
  const key = process.env.ADK_SERVICE_KEY;
  if (!key) throw new AdkError('AI is not connected (ADK_SERVICE_KEY is not set).', 503);
  return key;
}

async function adkFetch(baseUrl: string, path: string, init: RequestInit = {}, timeoutMs: number | null = REQUEST_TIMEOUT_MS) {
  const headers = new Headers(init.headers);
  headers.set('X-Service-Key', serviceKey());
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const signals = [init.signal, timeoutMs ? AbortSignal.timeout(timeoutMs) : null].filter(Boolean) as AbortSignal[];
  try {
    return await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
      signal: signals.length ? AbortSignal.any(signals) : undefined,
      cache: 'no-store'
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new AdkError('The assistant server could not be reached.', 502);
  }
}

function sessionPath(target: AdkTarget, userId: string, sessionId: string) {
  return `/apps/${encodeURIComponent(target.adkAppName)}/users/${encodeURIComponent(userId)}/sessions/${encodeURIComponent(sessionId)}`;
}

export async function createAdkSession(target: AdkTarget, userId: string, sessionId: string, state: Record<string, unknown>) {
  const res = await adkFetch(target.adkBaseUrl, sessionPath(target, userId, sessionId), {
    method: 'POST',
    body: JSON.stringify(state)
  });
  if (!res.ok) throw new AdkError(`Could not start the chat (assistant server answered ${res.status}).`, 502);
}

export async function deleteAdkSession(target: AdkTarget, userId: string, sessionId: string) {
  await adkFetch(target.adkBaseUrl, sessionPath(target, userId, sessionId), { method: 'DELETE' }).catch(() => null);
}

/** The visible conversation: user messages and the assistant's final replies (no tool calls or thoughts). */
export async function getAdkMessages(target: AdkTarget, userId: string, sessionId: string): Promise<ChatMessage[]> {
  const res = await adkFetch(target.adkBaseUrl, sessionPath(target, userId, sessionId));
  if (res.status === 404) return [];
  if (!res.ok) throw new AdkError(`Could not load the chat (assistant server answered ${res.status}).`, 502);
  const session = (await res.json()) as { events?: AdkEvent[] };
  const messages: ChatMessage[] = [];
  for (const event of session.events ?? []) {
    if (event.partial) continue;
    const text = visibleText(event);
    if (!text) continue;
    const role = event.content?.role === 'user' || event.author === 'user' ? 'user' : 'assistant';
    const last = messages[messages.length - 1];
    // One reply can span several model events (text, tool call, more text)
    if (role === 'assistant' && last?.role === 'assistant') last.text = `${last.text}\n\n${text}`;
    else messages.push({ role, text });
  }
  return messages;
}

type AdkEvent = {
  author?: string;
  partial?: boolean;
  content?: { role?: string; parts?: Array<{ text?: string; thought?: boolean }> };
  error?: string;
  error_code?: string;
  errorCode?: string;
  error_message?: string;
  errorMessage?: string;
};

function visibleText(event: AdkEvent): string {
  return (event.content?.parts ?? [])
    .filter((p) => typeof p.text === 'string' && !p.thought)
    .map((p) => p.text)
    .join('')
    .trim();
}

/**
 * Runs one user turn and returns a stream of ChatStreamEvent SSE lines. ADK's own events (tool
 * calls, arguments, state) stay on the server; the browser only gets text.
 */
export async function streamAdkTurn(
  target: AdkTarget,
  userId: string,
  sessionId: string,
  text: string,
  signal: AbortSignal,
  /** Values for this turn only. `temp:` keys reach Ayu's tools but are never saved in the session. */
  stateDelta?: Record<string, unknown>
): Promise<ReadableStream<Uint8Array>> {
  const res = await adkFetch(
    target.adkBaseUrl,
    '/run_sse',
    {
      method: 'POST',
      signal,
      body: JSON.stringify({
        app_name: target.adkAppName,
        user_id: userId,
        session_id: sessionId,
        new_message: { role: 'user', parts: [{ text }] },
        streaming: true,
        ...(stateDelta ? { state_delta: stateDelta } : {})
      })
    },
    null
  );
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '');
    console.error('[ai] run_sse failed', res.status, detail.slice(0, 300));
    throw new AdkError('The assistant could not answer right now. Please try again.', 502);
  }

  const upstream = res.body.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      // The browser may leave mid-reply; writing to a closed stream throws, which must not crash the turn
      const write = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // closed
        }
      };
      const send = (event: ChatStreamEvent) => write(`data: ${JSON.stringify(event)}\n\n`);
      const keepalive = setInterval(() => write(': keepalive\n\n'), KEEPALIVE_MS);
      let buffer = '';
      let failed = false;

      const handle = (line: string) => {
        if (!line.startsWith('data:')) return;
        let event: AdkEvent;
        try {
          event = JSON.parse(line.slice(5).trim()) as AdkEvent;
        } catch {
          return;
        }
        const error = event.error ?? event.error_message ?? event.errorMessage ?? event.error_code ?? event.errorCode;
        if (error) {
          console.error('[ai] ADK error event', String(error).slice(0, 300));
          failed = true;
          send({ type: 'error', message: 'The assistant ran into a problem. Please try again.' });
          return;
        }
        if (event.content?.role === 'user') return;
        const part = visibleText(event);
        if (!part) return;
        send(event.partial ? { type: 'delta', text: part } : { type: 'final', text: part });
      };

      try {
        for (;;) {
          const { done, value } = await upstream.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          lines.forEach(handle);
        }
        if (buffer) handle(buffer);
        if (!failed) send({ type: 'done' });
      } catch (error) {
        if (!signal.aborted) {
          console.error('[ai] stream failed', error);
          send({ type: 'error', message: 'The connection to the assistant was lost. Please try again.' });
        }
      } finally {
        clearInterval(keepalive);
        try {
          controller.close();
        } catch {
          // already closed (browser went away)
        }
      }
    },
    cancel() {
      void upstream.cancel().catch(() => null);
    }
  });
}
