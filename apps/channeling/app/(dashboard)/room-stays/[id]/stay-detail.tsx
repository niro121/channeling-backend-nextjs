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
