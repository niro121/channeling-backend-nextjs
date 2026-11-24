'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, Coffee, Loader2, MessageCircle, Play, Shirt, Sparkles as Broom, Tv, Wifi, Wrench } from 'lucide-react';
import { useToast } from '@archmage/ui';
import { cn } from '@/lib/utils';
import { updateRoomRequestAction } from '@/app/actions/room-stays.actions';
import {
  ROOM_REQUEST_CATEGORY_LABEL,
  ROOM_REQUEST_STATUS_LABEL,
  type RoomRequestCategory,
  type RoomRequestRow,
  type RoomRequestStatus
} from '@/types/room-stays';

const ICON: Record<RoomRequestCategory, typeof Shirt> = {
  towels: Shirt,
  cleaning: Broom,
  food: Coffee,
  wifi: Wifi,
  tv: Tv,
  maintenance: Wrench,
  other: MessageCircle
};

const STATUS_CLASS: Record<RoomRequestStatus, string> = {
  new: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  done: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  cancelled: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
};

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

/** Requests the patient (or a contact) made from the room through Ayu. Any GRO can move them along. */
export function RequestsSection({
  requests,
  canHandle,
  onChanged
}: {
  requests: RoomRequestRow[];
  canHandle: boolean;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const open = requests.filter((r) => r.status === 'new' || r.status === 'in_progress').length;

  const move = (r: RoomRequestRow, status: RoomRequestStatus) => {
    setBusyId(r.id);
    startTransition(async () => {
      const res = await updateRoomRequestAction({ id: r.id, status });
      setBusyId(null);
      if (!res.success) {
        toast({ variant: 'destructive', title: res.message });
        return;
      }
      toast({ title: `${ROOM_REQUEST_CATEGORY_LABEL[r.category]}: ${ROOM_REQUEST_STATUS_LABEL[status].toLowerCase()}` });
      onChanged();
    });
  };

  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Requests
        {open > 0 && <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{open} open</span>}
      </h2>
      {requests.length === 0 ? (
        <p className="px-1 text-sm text-muted-foreground">Nothing asked for from the room yet.</p>
      ) : (
        <div className="divide-y overflow-hidden rounded-2xl border bg-card">
          {requests.map((r) => {
            const Icon = ICON[r.category] ?? MessageCircle;
            const busy = pending && busyId === r.id;
            return (
              <div key={r.id} className="space-y-2 px-3 py-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{ROOM_REQUEST_CATEGORY_LABEL[r.category]}</p>
                    {r.details && <p className="text-sm">{r.details}</p>}
                    <p className="text-xs text-muted-foreground">
                      {when(r.createdAt)} · {r.requestedByRole === 'patient' ? 'the patient' : r.requestedByName ?? 'a contact'}
                    </p>
                    {r.handledByName && r.status !== 'new' && (
                      <p className="text-xs text-muted-foreground">
                        {ROOM_REQUEST_STATUS_LABEL[r.status]} by {r.handledByName}
                      </p>
                    )}
                  </div>
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', STATUS_CLASS[r.status])}>
                    {ROOM_REQUEST_STATUS_LABEL[r.status]}
                  </span>
                </div>
                {canHandle && (r.status === 'new' || r.status === 'in_progress') && (
                  <div className="flex gap-2 pl-12">
                    {r.status === 'new' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => move(r, 'in_progress')}
                        className="flex h-9 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium active:bg-muted"
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} On it
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => move(r, 'done')}
                      className="flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground active:opacity-90"
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Done
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
