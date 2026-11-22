'use client';

import { useState, useTransition } from 'react';
import { AlertTriangle, CheckCircle2, Eye, Loader2, Quote } from 'lucide-react';
import { useToast } from '@archmage/ui';
import { cn } from '@/lib/utils';
import { updateConcernAction } from '@/app/actions/room-stays.actions';
import {
  ROOM_CONCERN_KIND_LABEL,
  ROOM_CONCERN_SOURCE_LABEL,
  type RoomConcernRow,
  type StayContactRow
} from '@/types/room-stays';

const time = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** "Priyanka Kumari (wife)" or "the patient", from who raised it and the stay's contacts. */
export function whoLabel(name: string | null, role: 'patient' | 'contact' | null, contacts: StayContactRow[]) {
  if (role === 'patient') return name ? `${name} (patient)` : 'The patient';
  const rel = contacts.find((c) => c.name.trim().toLowerCase() === (name ?? '').trim().toLowerCase())?.relationship;
  return name ? `${name}${rel ? ` (${rel.toLowerCase()})` : ' (contact)'}` : 'A contact';
}

/** Concerns about this patient: open ones first, serious in red. Any GRO can pick one up or resolve it. */
export function ConcernsSection({
  concerns,
  contacts,
  canHandle,
  onChanged
}: {
  concerns: RoomConcernRow[];
  contacts: StayContactRow[];
  canHandle: boolean;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  if (concerns.length === 0) return null;
  const open = concerns.filter((c) => c.status !== 'resolved');

  const move = (c: RoomConcernRow, status: 'looking' | 'resolved') => {
    setBusy(c.id);
    startTransition(async () => {
      const res = await updateConcernAction({ id: c.id, status });
      setBusy(null);
      if (!res.success) {
        toast({ variant: 'destructive', title: res.message });
        return;
      }
      toast({ title: status === 'resolved' ? 'Concern resolved' : "Marked as looking into it" });
      onChanged();
    });
  };

  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Concerns
        {open.length > 0 && <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{open.length} open</span>}
      </h2>
      <div className="space-y-2">
        {concerns.map((c) => {
          const resolved = c.status === 'resolved';
          const serious = c.level === 'serious' && !resolved;
          return (
            <div
              key={c.id}
              className={cn(
                'overflow-hidden rounded-2xl border bg-card',
                serious ? 'border-red-300 dark:border-red-800' : !resolved ? 'border-amber-300 dark:border-amber-800' : 'opacity-70'
              )}
            >
              <div className={cn('flex gap-3 p-3', serious ? 'bg-red-50/70 dark:bg-red-950/30' : !resolved ? 'bg-amber-50/60 dark:bg-amber-950/20' : '')}>
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                    serious ? 'bg-red-600 text-white' : !resolved ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {resolved ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <p className="font-semibold">{ROOM_CONCERN_KIND_LABEL[c.kind]}</p>
                    {serious && <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Serious</span>}
                    {c.status === 'looking' && <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-sky-800 dark:bg-sky-900/40 dark:text-sky-300">Looking into it</span>}
                    {c.count > 1 && <span className="text-xs text-muted-foreground">×{c.count}</span>}
                  </div>
                  <p className="text-sm">{c.summary}</p>
                  {c.quote && (
                    <p className="flex gap-1.5 rounded-lg bg-background/80 px-2.5 py-1.5 text-sm italic text-foreground/80">
                      <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      {c.quote}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {c.raisedByName || c.raisedByRole ? `${whoLabel(c.raisedByName, c.raisedByRole, contacts)} · ` : ''}
                    {time(c.lastAt)} · {ROOM_CONCERN_SOURCE_LABEL[c.source]}
                  </p>
                  {c.handledByName && c.status !== 'open' && (
                    <p className="text-xs text-muted-foreground">
                      {resolved ? 'Resolved' : 'Picked up'} by {c.handledByName}
                    </p>
                  )}
                </div>
              </div>
              {canHandle && !resolved && (
                <div className="flex gap-2 border-t px-3 py-2">
                  {c.status === 'open' && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => move(c, 'looking')}
                      className="flex h-9 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium active:bg-muted"
                    >
                      {busy === c.id && pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />} I&apos;m on it
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => move(c, 'resolved')}
                    className="flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground active:opacity-90"
                  >
                    {busy === c.id && pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Resolved
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
