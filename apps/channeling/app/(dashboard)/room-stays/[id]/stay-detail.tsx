'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Ban, Check, Loader2, Minus, Phone, ShieldAlert, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/hooks/use-toast';
import { usePermissions } from '@/components/hooks/use-permissions';
import { cn } from '@/lib/utils';
import { cancelStayAction } from '@/app/actions/room-checklist.actions';
import { updateConcernStatusAction, updateRoomRequestStatusAction } from '@/app/actions/room-ayu.actions';
import { StayConversations, whoLabel } from './stay-conversations';
import {
  ROOM_CONCERN_KIND_LABEL,
  ROOM_CONCERN_SOURCE_LABEL,
  ROOM_REQUEST_CATEGORY_LABEL,
  ROOM_REQUEST_STATUS_LABEL,
  type RoomConcernRow,
  type RoomRequestRow,
  type RoomRequestStatus,
} from '@/types/room-request';
import type { StayContactRow } from '@/types/room-checklist';
import {
  CHECKLIST_KIND_LABEL,
  type ChecklistAnswer,
  type FormItem,
  type StayDetail,
  type SubmissionRow,
} from '@/types/room-checklist';
import { STAY_STATUS_BADGE, formatDateTime } from '../stays-list';

export function StayDetailView({ stay }: { stay: StayDetail }) {
  const router = useRouter();
  const { toast } = useToast();
  const { has } = usePermissions();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [pending, startTransition] = useTransition();
  const badge = STAY_STATUS_BADGE[stay.status];
  const canCancel = stay.status === 'occupied' && has('room-stays', 'override');
  const checkIn = stay.submissions.filter((s) => s.kind === 'check_in');
  const checkOut = stay.submissions.filter((s) => s.kind === 'check_out');

  const cancel = () =>
    startTransition(async () => {
      const res = await cancelStayAction(stay.id, reason);
      toast({ variant: res.success ? 'default' : 'destructive', title: res.message ?? (res.success ? 'Cancelled' : 'Failed') });
      if (res.success) {
        setCancelOpen(false);
        router.refresh();
      }
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/room-stays">
            <ArrowLeft className="size-4" /> Room Stays
          </Link>
        </Button>
        {canCancel && (
          <Button variant="outline" size="sm" className="ml-auto text-destructive" onClick={() => setCancelOpen(true)}>
            <Ban className="size-4" /> Cancel check-in
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{stay.patientName}</CardTitle>
              <Badge className={badge.className}>{badge.label}</Badge>
              {stay.hasIssues && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="size-3" /> Issues
                </Badge>
              )}
            </div>
            <CardDescription>
              BHT <span className="font-mono">{stay.bhtNumber}</span> · Room {stay.roomNumber}
              {[stay.zoneName, stay.departmentName].filter(Boolean).length
                ? ` · ${[stay.zoneName, stay.departmentName].filter(Boolean).join(' · ')}`
                : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <Fact label="Checked in" value={formatDateTime(stay.checkedInAt)} by={stay.checkedInByName} />
            <Fact
              label={stay.status === 'cancelled' ? 'Cancelled' : 'Checked out'}
              value={stay.checkedOutAt ? formatDateTime(stay.checkedOutAt) : 'Still in room'}
              by={stay.checkedOutByName}
            />
            {stay.cancelReason && (
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Reason for cancelling</p>
                <p>{stay.cancelReason}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Contacts</CardTitle>
            <CardDescription>People who may be contacted about the patient. The GRO edits these on the Management app.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ContactLine name={`${stay.patientName} (patient)`} phone={stay.patientPhone} primary={stay.primaryIsPatient} />
            {stay.contacts.map((c) => (
              <ContactLine key={c.id} name={c.name} relationship={c.relationship} phone={c.phone} primary={c.isPrimary} />
            ))}
          </CardContent>
        </Card>
      </div>

      <ConcernsCard concerns={stay.concerns ?? []} contacts={stay.contacts} canHandle={has('room-stays', 'check-in') || has('room-stays', 'check-out')} />

      <RequestsCard stayId={stay.id} requests={stay.requests ?? []} canHandle={has('room-stays', 'check-in') || has('room-stays', 'check-out')} />

      <StayConversations stayId={stay.id} contacts={stay.contacts} />

      {(stay.feedback ?? []).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">How they rated the stay</CardTitle>
          </CardHeader>
          <CardContent className="divide-y rounded-md border p-0">
            {stay.feedback.map((f) => (
              <div key={f.id} className="flex items-start gap-3 px-3 py-2 text-sm">
                <span className={cn('shrink-0 font-semibold', f.rating <= 2 ? 'text-red-600' : f.rating === 3 ? 'text-amber-600' : 'text-emerald-600')}>
                  {'★'.repeat(f.rating)}
                  <span className="text-muted-foreground/40">{'★'.repeat(5 - f.rating)}</span>
                </span>
                <span className="min-w-0 flex-1">
                  {f.comment && <span className="block">{f.comment}</span>}
                  <span className="block text-xs text-muted-foreground">
                    {f.byRole === 'patient' ? 'The patient' : f.byName ?? 'A contact'} · {formatDateTime(f.createdAt)}
                  </span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <SubmissionColumn title="Check-in" submissions={checkIn} stayId={stay.id} empty="No check-in checklist." />
        <SubmissionColumn
          title="Check-out"
          submissions={checkOut}
          stayId={stay.id}
          empty={stay.status === 'occupied' ? 'Not checked out yet.' : 'No check-out checklist.'}
        />
      </div>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this check-in?</DialogTitle>
            <DialogDescription>
              Use this when the patient was checked into the wrong room or by mistake. Room {stay.roomNumber} becomes free again;
              the check-in checklist stays on record.
            </DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" maxLength={300} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Keep
            </Button>
            <Button variant="destructive" disabled={pending || reason.trim().length < 3} onClick={cancel}>
              {pending && <Loader2 className="size-4 animate-spin" />} Cancel check-in
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Fact({ label, value, by }: { label: string; value: string; by: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p>{value}</p>
      {by && <p className="text-xs text-muted-foreground">by {by}</p>}
    </div>
  );
}

function ContactLine({
  name,
  relationship,
  phone,
  primary,
}: {
  name: string;
  relationship?: string | null;
  phone: string | null;
  primary: boolean;
}) {
  return (
    <div className={cn('flex items-start gap-2 rounded-md border p-2', primary && 'border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/30')}>
      <Star className={cn('mt-0.5 size-4 shrink-0', primary ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')} />
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {name}
          {relationship && <span className="font-normal text-muted-foreground"> · {relationship}</span>}
        </p>
        {phone ? (
          <a href={`tel:${phone}`} className="inline-flex items-center gap-1 text-muted-foreground hover:underline">
            <Phone className="size-3" /> {phone}
          </a>
        ) : (
          <p className="text-xs text-muted-foreground">No phone</p>
        )}
      </div>
      {primary && <Badge variant="outline">Primary</Badge>}
    </div>
  );
}

function SubmissionColumn({
  title,
  submissions,
  stayId,
  empty,
}: {
  title: string;
  submissions: SubmissionRow[];
  stayId: string;
  empty: string;
}) {
  if (!submissions.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{empty}</CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      {submissions.map((s) => (
        <SubmissionCard key={s.id} submission={s} stayId={stayId} />
      ))}
    </div>
  );
}

function SubmissionCard({ submission: s, stayId }: { submission: SubmissionRow; stayId: string }) {
  const answers = new Map(s.answers.map((a) => [a.itemId, a]));
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">{CHECKLIST_KIND_LABEL[s.kind]}</CardTitle>
          {s.hasIssues ? (
            <Badge variant="destructive">{s.issues.length} issue{s.issues.length === 1 ? '' : 's'}</Badge>
          ) : (
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300">All clear</Badge>
          )}
        </div>
        <CardDescription>
          {s.templateName}
          {s.templateVersion ? ` v${s.templateVersion}` : ''} · {formatDateTime(s.submittedAt)}
          {s.submittedByName ? ` · ${s.submittedByName}` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {s.overrideReason && (
          <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              Finished with failed items{s.overrideByName ? `, overridden by ${s.overrideByName}` : ''}: {s.overrideReason}
            </span>
          </div>
        )}
        {s.issues.length > 0 && (
          <ul className="space-y-1 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-sm">
            {s.issues.map((i, n) => (
              <li key={n} className="flex gap-2">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                <span>
                  <span className="font-medium">{i.itemLabel}</span>: {i.detail}
                </span>
              </li>
            ))}
          </ul>
        )}
        {s.sections.map((section) => (
          <div key={section.id} className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section.title}</p>
            <div className="divide-y rounded-md border">
              {section.items.map((it) => (
                <AnswerRow key={it.id} item={it} answer={answers.get(it.id)} stayId={stayId} />
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function photoUrl(stayId: string, key: string) {
  return `/api/room-checklist-photos?stayId=${stayId}&key=${encodeURIComponent(key)}`;
}

function Mark({ ok }: { ok: boolean | null }) {
  if (ok === null) return <Minus className="size-4 text-muted-foreground" />;
  return ok ? <Check className="size-4 text-emerald-600" /> : <X className="size-4 text-destructive" />;
}

function AnswerRow({ item, answer: a, stayId }: { item: FormItem; answer: ChecklistAnswer | undefined; stayId: string }) {
  let body: React.ReactNode = null;
  switch (item.type) {
    case 'tick':
      body = <Mark ok={a?.value === true ? true : item.required ? false : null} />;
      break;
    case 'pass_fail':
      body = a?.value ? (
        <Badge variant={a.value === 'pass' ? 'outline' : 'destructive'}>{a.value === 'pass' ? 'Pass' : 'Fail'}</Badge>
      ) : (
        <Mark ok={null} />
      );
      break;
    case 'number':
    case 'text':
      body = a?.value != null && a.value !== '' ? <span className="text-sm">{String(a.value)}</span> : <Mark ok={null} />;
      break;
    case 'signature':
      body =
        typeof a?.value === 'string' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl(stayId, a.value)} alt="Signature" className="h-14 rounded border bg-white" />
        ) : (
          <Mark ok={null} />
        );
      break;
    case 'handover':
      if (item.returns) {
        const got = new Map((a?.returns ?? []).map((r) => [r.key, r]));
        body = (
          <ul className="w-full space-y-0.5 text-sm">
            {item.returns.map((r) => {
              const g = got.get(r.key);
              const short = (g?.returnedQty ?? 0) < r.givenQty;
              return (
                <li key={r.key} className="flex justify-between gap-2">
                  <span>{r.label}</span>
                  <span className={cn('tabular-nums', short && 'font-medium text-destructive')}>
                    {g?.returnedQty ?? 0} / {r.givenQty}
                    {g?.note ? ` · ${g.note}` : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        );
      } else {
        body = <span className="text-sm tabular-nums">Given {a?.qty ?? 0}</span>;
      }
      break;
    case 'inventory': {
      const states = new Map((a?.units ?? []).map((u) => [u.unitId, u]));
      body = (
        <ul className="w-full space-y-0.5 text-sm">
          {(item.units ?? []).length === 0 && <li className="text-muted-foreground">Nothing was in the room.</li>}
          {(item.units ?? []).map((u) => {
            const st = states.get(u.unitId);
            return (
              <li key={u.unitId} className="flex justify-between gap-2">
                <span>
                  {u.itemName} <span className="font-mono text-xs text-muted-foreground">{u.assetTag}</span>
                </span>
                <span className={cn(st?.state && st.state !== 'present' && 'font-medium text-destructive')}>
                  {st ? st.state[0].toUpperCase() + st.state.slice(1) : '—'}
                  {st?.note ? ` · ${st.note}` : ''}
                </span>
              </li>
            );
          })}
        </ul>
      );
      break;
    }
    case 'photo':
      body = null;
      break;
  }
  const wide = item.type === 'inventory' || (item.type === 'handover' && item.returns);
  return (
    <div className="space-y-1.5 p-2.5">
      <div className={cn('flex gap-3', wide ? 'flex-col' : 'items-center justify-between')}>
        <span className="text-sm">{item.label}</span>
        {body}
      </div>
      {a?.note && <p className="text-xs text-muted-foreground">Note: {a.note}</p>}
      {a?.photos && a.photos.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {a.photos.map((k) => (
            <a key={k} href={photoUrl(stayId, k)} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl(stayId, k)} alt="" className="size-16 rounded border object-cover" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

const REQUEST_STATUS_CLASS: Record<RoomRequestStatus, string> = {
  new: 'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-300',
  in_progress: 'bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300',
  done: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300',
  cancelled: 'bg-zinc-100 text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400',
};

function RequestsCard({ stayId, requests, canHandle }: { stayId: string; requests: RoomRequestRow[]; canHandle: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const open = requests.filter((r) => r.status === 'new' || r.status === 'in_progress').length;
  const move = (id: string, status: RoomRequestStatus) =>
    startTransition(async () => {
      const res = await updateRoomRequestStatusAction(id, status);
      if (!res.success) toast({ variant: 'destructive', title: res.message ?? 'Could not update' });
      else router.refresh();
    });
  void stayId;
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Requests from the room</CardTitle>
          {open > 0 && <Badge variant="destructive">{open} open</Badge>}
        </div>
        <CardDescription>What the patient or their contacts asked for through in-room Ayu. Any GRO can handle them.</CardDescription>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No requests yet.</p>
        ) : (
          <div className="divide-y rounded-md border">
            {requests.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {ROOM_REQUEST_CATEGORY_LABEL[r.category]}
                    {r.details ? <span className="font-normal"> · {r.details}</span> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(r.createdAt)} · {r.requestedByRole === 'patient' ? 'the patient' : r.requestedByName ?? 'a contact'}
                    {r.handledByName && r.status !== 'new' ? ` · ${ROOM_REQUEST_STATUS_LABEL[r.status]} by ${r.handledByName}` : ''}
                  </p>
                </div>
                <Badge className={REQUEST_STATUS_CLASS[r.status]}>{ROOM_REQUEST_STATUS_LABEL[r.status]}</Badge>
                {canHandle && (r.status === 'new' || r.status === 'in_progress') && (
                  <div className="flex gap-2">
                    {r.status === 'new' && (
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => move(r.id, 'in_progress')}>
                        On it
                      </Button>
                    )}
                    <Button size="sm" disabled={pending} onClick={() => move(r.id, 'done')}>
                      Done
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ConcernsCard({ concerns, contacts, canHandle }: { concerns: RoomConcernRow[]; contacts: StayContactRow[]; canHandle: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  if (!concerns.length) return null;
  const open = concerns.filter((c) => c.status !== 'resolved').length;
  const move = (id: string, status: 'looking' | 'resolved') =>
    startTransition(async () => {
      const res = await updateConcernStatusAction(id, status);
      toast({ variant: res.success ? 'default' : 'destructive', title: res.message ?? (res.success ? 'Done' : 'Failed') });
      if (res.success) router.refresh();
    });
  return (
    <Card className={open ? 'border-amber-300 dark:border-amber-800' : undefined}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-amber-600" />
          <CardTitle className="text-base">Concerns</CardTitle>
          {open > 0 && <Badge variant="destructive">{open} open</Badge>}
        </div>
        <CardDescription>Raised by Ayu in the chat, by a rule (a request left waiting or asked twice), from a low rating, or by Ayu&apos;s review of the chat.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {concerns.map((c) => {
          const resolved = c.status === 'resolved';
          const serious = c.level === 'serious' && !resolved;
          return (
            <div
              key={c.id}
              className={cn(
                'rounded-md border p-3 text-sm',
                serious ? 'border-red-300 bg-red-50/70 dark:border-red-800 dark:bg-red-950/30' : !resolved ? 'border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20' : 'opacity-70'
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{ROOM_CONCERN_KIND_LABEL[c.kind]}</span>
                {serious && <Badge variant="destructive">Serious</Badge>}
                {c.status === 'looking' && <Badge variant="outline">Looking into it</Badge>}
                {resolved && <Badge variant="outline">Resolved</Badge>}
                {c.count > 1 && <span className="text-xs text-muted-foreground">×{c.count}</span>}
                {canHandle && !resolved && (
                  <span className="ml-auto flex gap-2">
                    {c.status === 'open' && (
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => move(c.id, 'looking')}>
                        I&apos;m on it
                      </Button>
                    )}
                    <Button size="sm" disabled={pending} onClick={() => move(c.id, 'resolved')}>
                      Resolved
                    </Button>
                  </span>
                )}
              </div>
              <p className="mt-1">{c.summary}</p>
              {c.quote && <p className="mt-1 rounded bg-background/80 px-2 py-1 italic text-foreground/80">&ldquo;{c.quote}&rdquo;</p>}
              <p className="mt-1 text-xs text-muted-foreground">
                {c.raisedByName || c.raisedByRole ? `${whoLabel(c.raisedByName, c.raisedByRole, contacts)} · ` : ''}
                {formatDateTime(c.lastAt)} · {ROOM_CONCERN_SOURCE_LABEL[c.source]}
                {c.handledByName && c.status !== 'open' ? ` · ${resolved ? 'resolved' : 'picked up'} by ${c.handledByName}` : ''}
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
