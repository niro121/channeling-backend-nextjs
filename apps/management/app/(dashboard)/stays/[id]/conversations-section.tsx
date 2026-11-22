'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, Loader2, MessagesSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AyuAvatar } from '@/components/ai/ayu-avatar';
import { getStayConversationsAction } from '@/app/actions/room-stays.actions';
import type { RoomConversation, StayContactRow } from '@/types/room-stays';
import { whoLabel } from './concerns-section';

// One colour per person, so a GRO can tell two people in the same room apart at a glance.
const PERSON_COLOURS = [
  { dot: 'bg-sky-600', bubble: 'bg-sky-50 border-sky-200 dark:bg-sky-950/40 dark:border-sky-900', text: 'text-sky-800 dark:text-sky-300' },
  { dot: 'bg-violet-600', bubble: 'bg-violet-50 border-violet-200 dark:bg-violet-950/40 dark:border-violet-900', text: 'text-violet-800 dark:text-violet-300' },
  { dot: 'bg-orange-600', bubble: 'bg-orange-50 border-orange-200 dark:bg-orange-950/40 dark:border-orange-900', text: 'text-orange-800 dark:text-orange-300' },
  { dot: 'bg-teal-600', bubble: 'bg-teal-50 border-teal-200 dark:bg-teal-950/40 dark:border-teal-900', text: 'text-teal-800 dark:text-teal-300' }
];

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');
const clock = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' }) : '');
const SHOW = 6;

/** What the patient and their family said to Inward Ayu from the room, one card per person. */
export function ConversationsSection({ stayId, contacts }: { stayId: string; contacts: StayContactRow[] }) {
  const [chats, setChats] = useState<RoomConversation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let live = true;
    void getStayConversationsAction(stayId).then((res) => {
      if (!live) return;
      if (res.success) setChats(res.data);
      else setError(res.message);
    });
    return () => {
      live = false;
    };
  }, [stayId]);

  // Same person → same colour, across all their chats.
  const people = [...new Set((chats ?? []).map((c) => `${c.who.role}:${c.who.name ?? ''}`))];
  const colourOf = (c: RoomConversation) => PERSON_COLOURS[people.indexOf(`${c.who.role}:${c.who.name ?? ''}`) % PERSON_COLOURS.length];

  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Conversations from the room
        {chats && chats.length > 0 && <span className="font-normal normal-case">· {people.length} {people.length === 1 ? 'person' : 'people'}</span>}
      </h2>
      {!chats && !error && (
        <div className="flex justify-center rounded-2xl border bg-card py-6 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}
      {error && <p className="px-1 text-sm text-muted-foreground">{error}</p>}
      {chats?.length === 0 && (
        <p className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
          <MessagesSquare className="h-4 w-4" /> Nobody has chatted from the room yet.
        </p>
      )}
      {chats?.map((c) => {
        const colour = colourOf(c);
        const all = expanded[c.id];
        const shown = all ? c.messages : c.messages.slice(-SHOW);
        const label = whoLabel(c.who.name, c.who.role, contacts);
        return (
          <div key={c.id} className="overflow-hidden rounded-2xl border bg-card">
            <div className="flex items-center gap-3 border-b px-3 py-2.5">
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white', colour.dot)}>
                {(c.who.name ?? '?').trim().charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn('truncate font-semibold', colour.text)}>{label}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {c.who.phoneEnding ? `Phone …${c.who.phoneEnding} · ` : ''}
                  {when(c.startedAt)}
                  {c.lastAt && c.lastAt !== c.startedAt ? ` – ${clock(c.lastAt)}` : ''} · {c.messages.length} messages
                </p>
              </div>
            </div>
            <div className="space-y-2 bg-muted/20 p-3">
              {c.messages.length > shown.length && (
                <button
                  type="button"
                  onClick={() => setExpanded((e) => ({ ...e, [c.id]: true }))}
                  className="mx-auto flex items-center gap-1 text-xs font-medium text-primary"
                >
                  <ChevronDown className="h-3.5 w-3.5" /> Show all {c.messages.length} messages
                </button>
              )}
              {shown.map((m, i) =>
                m.from === 'person' ? (
                  <div key={i} className="flex flex-col items-start">
                    <span className={cn('mb-0.5 text-[11px] font-semibold', colour.text)}>
                      {c.who.name?.split(/\s+/)[0] ?? 'Them'} <span className="font-normal text-muted-foreground">{clock(m.time)}</span>
                    </span>
                    <div className={cn('max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-tl-md border px-3 py-2 text-sm', colour.bubble)}>{m.text}</div>
                  </div>
                ) : (
                  <div key={i} className="flex flex-col items-end">
                    <span className="mb-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      {clock(m.time)} <AyuAvatar size={14} /> Ayu
                    </span>
                    <div className="max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-tr-md bg-background px-3 py-2 text-sm text-foreground/80 shadow-sm">{m.text}</div>
                  </div>
                )
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
