'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, useToast } from '@archmage/ui';
import { ArrowUp, Check, Copy, History, Loader2, MessageSquarePlus, Square, Trash2 } from 'lucide-react';
import { AyuAvatar, AyuIcon } from '@/components/ai/ayu-avatar';
import { cn } from '@/lib/utils';
import { MAX_MESSAGE_LENGTH } from '@/lib/ai/constants';
import { formatWhen } from '@/lib/tasks/constants';
import { deleteChatAction, getChatMessagesAction, listChatsAction, startChatAction } from '@/app/actions/ai.actions';
import type { ChatListItem } from '@/types/ai';

type Message = { role: 'user' | 'assistant'; text: string };
type StreamEvent = { type: 'delta' | 'final'; text: string } | { type: 'error'; message: string } | { type: 'done' };

const SUGGESTIONS = ['Draft a short notice to cashiers about ', 'Summarise this for me: ', 'Help me plan '];

function setUrl(chatId: string | null) {
  window.history.replaceState(null, '', chatId ? `/ayu?c=${chatId}` : '/ayu');
}

/** Reads the app's SSE reply (`data: {type…}` lines) from POST /api/ai/chats/[id]/messages. */
async function* readEvents(res: Response): AsyncGenerator<StreamEvent> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      try {
        yield JSON.parse(line.slice(5).trim()) as StreamEvent;
      } catch {
        // ignore a malformed line
      }
    }
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground active:bg-muted lg:hover:bg-muted"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

/**
 * "Ask Ayu": chat with Ayu Management. Fills the space between the header and the bottom tab bar
 * (or the screen bottom from lg, next to the sidebar).
 */
export function AyuChat({ initialChatId }: { initialChatId: string | null }) {
  const { toast } = useToast();
  const { data: session } = useSession();
  const [chatId, setChatId] = useState<string | null>(initialChatId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loadingChat, setLoadingChat] = useState(!!initialChatId);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [chats, setChats] = useState<ChatListItem[] | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const firstName = session?.user?.name?.trim().split(/\s+/)[0];

  // Leaving the conversation mid-reply: stop it and don't add it to the next one
  const dropReply = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setReply(null);
    setSending(false);
  };

  // Opening a chat from the URL (?c=) or from history
  const openChat = async (id: string) => {
    dropReply();
    setLoadingChat(true);
    setError(null);
    const result = await getChatMessagesAction(id);
    setLoadingChat(false);
    if (!result.success) {
      setChatId(null);
      setMessages([]);
      setUrl(null);
      toast({ variant: 'destructive', title: 'Could not open the chat', description: result.message });
      return;
    }
    setChatId(id);
    setMessages(result.data.messages);
    setUrl(id);
  };

  useEffect(() => {
    if (initialChatId) void openChat(initialChatId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, reply, error]);

  // Grow the box with its text, up to about six lines
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    // scrollHeight leaves out the 1px borders
    const full = el.scrollHeight + 2;
    el.style.height = `${Math.min(full, 160)}px`;
    el.style.overflowY = full > 160 ? 'auto' : 'hidden';
  }, [input]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const newChat = () => {
    dropReply();
    setChatId(null);
    setMessages([]);
    setError(null);
    setUrl(null);
    inputRef.current?.focus();
  };

  const loadHistory = async () => {
    setHistoryOpen(true);
    setChats(null);
    const result = await listChatsAction();
    setChats(result.success ? result.data : []);
    if (!result.success) toast({ variant: 'destructive', title: 'Could not load chats', description: result.message });
  };

  const removeChat = async (id: string) => {
    const result = await deleteChatAction(id);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Could not delete', description: result.message });
      return;
    }
    setChats((prev) => prev?.filter((c) => c.id !== id) ?? null);
    if (id === chatId) newChat();
  };

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || sending) return;
    setError(null);
    setSending(true);
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text }]);

    let id = chatId;
    if (!id) {
      const started = await startChatAction();
      if (!started.success) {
        setSending(false);
        setError(started.message);
        return;
      }
      id = started.data.chatId;
      setChatId(id);
      setUrl(id);
    }

    const controller = new AbortController();
    abortRef.current = controller;
    // Finished parts of the reply, plus the part still streaming in
    let committed = '';
    let streaming = '';
    const shown = () => [committed, streaming].filter(Boolean).join('\n\n');
    setReply('');

    try {
      const res = await fetch(`/api/ai/chats/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message ?? 'The assistant could not answer right now. Please try again.');
      }
      for await (const event of readEvents(res)) {
        if (event.type === 'delta') streaming += event.text;
        else if (event.type === 'final') {
          committed = [committed, event.text].filter(Boolean).join('\n\n');
          streaming = '';
        } else if (event.type === 'error') setError(event.message);
        setReply(shown());
      }
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Connection error. Please try again.');
    } finally {
      if (abortRef.current === controller) {
        const finalText = shown();
        if (finalText) setMessages((prev) => [...prev, { role: 'assistant', text: finalText }]);
        setReply(null);
        setSending(false);
        abortRef.current = null;
      }
    }
  };

  const stop = () => {
    const controller = abortRef.current;
    if (!controller) return;
    controller.abort();
  };

  const empty = messages.length === 0 && reply == null && !loadingChat;

  return (
    <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] top-[calc(3.5rem+env(safe-area-inset-top))] z-30 flex flex-col bg-background lg:bottom-0 lg:left-52">
      {/* Title + history + new chat */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-3 py-2 sm:px-4">
        <AyuAvatar size={36} className="ring-1 ring-primary/30" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">Ayu</p>
          <p className="truncate text-xs text-muted-foreground">Ruhunu Hospital assistant</p>
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-full" onClick={loadHistory} aria-label="Past chats" title="Past chats">
          <History className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-full" onClick={() => newChat()} aria-label="New chat" title="New chat">
          <MessageSquarePlus className="h-5 w-5" />
        </Button>
      </div>

      {/* Conversation */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-5">
          {loadingChat && (
            <div className="flex justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}

          {empty && (
            <div className="flex flex-col items-center px-2 pt-[8vh] text-center">
              <AyuIcon className="mb-4 h-28 w-28 drop-shadow-md" />
              <p className="text-lg font-semibold">{firstName ? `Hi ${firstName}, ` : ''}how can Ayu help?</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">Ask anything to get started.</p>
              <div className="mt-6 flex w-full max-w-md flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      if (s.endsWith(' ')) {
                        setInput(s);
                        inputRef.current?.focus();
                      } else void send(s);
                    }}
                    className="rounded-xl border border-border/70 px-4 py-3 text-left text-sm active:bg-muted lg:hover:bg-muted"
                  >
                    {s.trim()}
                    {s.endsWith(' ') && '…'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[15px] leading-relaxed text-primary-foreground">
                  {m.text}
                </div>
              </div>
            ) : (
              <div key={i} className="flex flex-col items-start">
                <div className="max-w-[92%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-muted px-4 py-2.5 text-[15px] leading-relaxed">{m.text}</div>
                <CopyButton text={m.text} />
              </div>
            )
          )}

          {reply != null && (
            <div className="flex justify-start">
              <div className="max-w-[92%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-muted px-4 py-2.5 text-[15px] leading-relaxed">
                {reply || (
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Thinking…
                  </span>
                )}
              </div>
            </div>
          )}

          {error && <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
        </div>
      </div>

      {/* Composer */}
      <form
        className="shrink-0 border-t border-border/60 bg-background px-3 py-2.5 sm:px-4"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <div className="mx-auto flex w-full max-w-3xl items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            maxLength={MAX_MESSAGE_LENGTH}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends on a keyboard; phones use the button (Enter adds a line)
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia('(pointer: fine)').matches) {
                e.preventDefault();
                void send(input);
              }
            }}
            placeholder="Message Ayu"
            disabled={loadingChat}
            className="max-h-40 min-h-11 flex-1 resize-none overflow-hidden rounded-2xl border border-input bg-muted/40 px-4 py-2.5 text-[16px] leading-6 outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 sm:text-[15px]"
          />
          {sending ? (
            <Button type="button" size="icon" variant="secondary" className="h-11 w-11 shrink-0 rounded-full" onClick={stop} aria-label="Stop">
              <Square className="h-4 w-4 fill-current" />
            </Button>
          ) : (
            <Button type="submit" size="icon" className="h-11 w-11 shrink-0 rounded-full" disabled={!input.trim() || loadingChat} aria-label="Send">
              <ArrowUp className="h-5 w-5" />
            </Button>
          )}
        </div>
      </form>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="right" className="flex w-[85vw] max-w-sm flex-col gap-0 p-0 pt-safe">
          <SheetHeader className="border-b px-4 py-4 text-left">
            <SheetTitle className="text-base">Past chats</SheetTitle>
            <SheetDescription className="text-xs">With Ayu</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-2 py-2 pb-safe">
            {chats == null && (
              <div className="flex justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}
            {chats?.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted-foreground">No chats yet.</p>}
            {chats?.map((c) => (
              <div key={c.id} className={cn('flex items-center gap-1 rounded-xl', c.id === chatId && 'bg-primary/10')}>
                <button
                  type="button"
                  onClick={() => {
                    setHistoryOpen(false);
                    void openChat(c.id);
                  }}
                  className="min-w-0 flex-1 px-3 py-2.5 text-left"
                >
                  <p className="truncate text-[15px]">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{formatWhen(c.lastMessageAt)}</p>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-full text-muted-foreground"
                  onClick={() => void removeChat(c.id)}
                  aria-label={`Delete ${c.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
