'use client';

import { useEffect, useState } from 'react';
import { Loader2, MessagesSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getStayConversationsAction } from '@/app/actions/room-ayu.actions';
import type { RoomConversation } from '@/types/room-request';
import type { StayContactRow } from '@/types/room-checklist';

// One colour per person, so two people chatting about the same room are easy to tell apart.
const COLOURS = [
  { dot: 'bg-sky-600', bubble: 'bg-sky-50 border-sky-200 dark:bg-sky-950/40 dark:border-sky-900', text: 'text-sky-800 dark:text-sky-300' },
  { dot: 'bg-violet-600', bubble: 'bg-violet-50 border-violet-200 dark:bg-violet-950/40 dark:border-violet-900', text: 'text-violet-800 dark:text-violet-300' },
  { dot: 'bg-orange-600', bubble: 'bg-orange-50 border-orange-200 dark:bg-orange-950/40 dark:border-orange-900', text: 'text-orange-800 dark:text-orange-300' },
  { dot: 'bg-teal-600', bubble: 'bg-teal-50 border-teal-200 dark:bg-teal-950/40 dark:border-teal-900', text: 'text-teal-800 dark:text-teal-300' },
];
const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Colombo' }) : '';
const clock = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Colombo' }) : '');
const SHOW = 8;

export function whoLabel(name: string | null, role: 'patient' | 'contact' | null, contacts: StayContactRow[]) {
  if (role === 'patient') return name ? `${name} (patient)` : 'The patient';
  const rel = contacts.find((c) => c.name.trim().toLowerCase() === (name ?? '').trim().toLowerCase())?.relationship;
  return name ? `${name}${rel ? ` (${rel.toLowerCase()})` : ' (contact)'}` : 'A contact';
}

/** What the patient and their family said to Inward Ayu from the room, one card per chat, coloured per person. */
export function StayConversations({ stayId, contacts }: { stayId: string; contacts: StayContactRow[] }) {
  const [chats, setChats] = useState<RoomConversation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [all, setAll] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let live = true;
    void getStayConversationsAction(stayId).then((r) => {
      if (!live) return;
      if (r.success) setChats(r.data ?? []);
      else setError(r.message ?? 'Could not load the conversations.');
    });
    return () => {
      live = false;
    };
  }, [stayId]);

  const people = [...new Set((chats ?? []).map((c) => `${c.who.role}:${c.who.name ?? ''}`))];
  const colour = (c: RoomConversation) => COLOURS[people.indexOf(`${c.who.role}:${c.who.name ?? ''}`) % COLOURS.length];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Conversations from the room</CardTitle>
        <CardDescription>
          What the patient and their family asked Inward Ayu{chats && chats.length > 0 ? ` · ${people.length} ${people.length === 1 ? 'person' : 'people'}` : ''}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!chats && !error && (
          <div className="flex justify-center py-6 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        )}
        {error && <p className="text-sm text-muted-foreground">{error}</p>}
        {chats?.length === 0 && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessagesSquare className="size-4" /> Nobody has chatted from the room yet.
          </p>
        )}
        <div className="grid gap-3 xl:grid-cols-2">
          {chats?.map((c) => {
            const col = colour(c);
            const shown = all[c.id] ? c.messages : c.messages.slice(-SHOW);
            return (
              <div key={c.id} className="overflow-hidden rounded-lg border">
                <div className="flex items-center gap-3 border-b px-3 py-2">
                  <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white', col.dot)}>
                    {(c.who.name ?? '?').trim().charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn('truncate text-sm font-semibold', col.text)}>{whoLabel(c.who.name, c.who.role, contacts)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.who.phoneEnding ? `Phone …${c.who.phoneEnding} · ` : ''}
                      {when(c.startedAt)} · {c.messages.length} messages
                    </p>
                  </div>
                </div>
                <div className="max-h-96 space-y-2 overflow-y-auto bg-muted/20 p-3">
                  {c.messages.length > shown.length && (
                    <Button variant="ghost" size="sm" className="mx-auto flex h-7 text-xs" onClick={() => setAll((a) => ({ ...a, [c.id]: true }))}>
                      Show all {c.messages.length} messages
                    </Button>
                  )}
                  {shown.map((m, i) =>
                    m.from === 'person' ? (
                      <div key={i} className="flex flex-col items-start">
                        <span className={cn('mb-0.5 text-[11px] font-semibold', col.text)}>
                          {c.who.name?.split(/\s+/)[0] ?? 'Them'} <span className="font-normal text-muted-foreground">{clock(m.time)}</span>
                        </span>
                        <div className={cn('max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-tl-md border px-3 py-1.5 text-sm', col.bubble)}>{m.text}</div>
                      </div>
                    ) : (
                      <div key={i} className="flex flex-col items-end">
                        <span className="mb-0.5 text-[11px] text-muted-foreground">{clock(m.time)} · Ayu</span>
                        <div className="max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-tr-md bg-background px-3 py-1.5 text-sm text-foreground/80 shadow-sm">{m.text}</div>
                      </div>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
