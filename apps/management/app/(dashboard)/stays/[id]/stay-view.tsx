'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Loader2,
  LogOut,
  MoreVertical,
  Pencil,
  Phone,
  RefreshCw,
  ShieldAlert,
  Star
} from 'lucide-react';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Textarea,
  useToast
} from '@archmage/ui';
import { cn } from '@/lib/utils';
import { useInnerPageHeader } from '../../page-header-context';
import { HeaderActions } from '../../header-actions';
import { useFeatures } from '../../features-context';
import { RequestsSection } from './requests-section';
import { ConcernsSection } from './concerns-section';
import { ConversationsSection } from './conversations-section';
import { cancelStayAction, getStayAction, updateContactsAction } from '@/app/actions/room-stays.actions';
import { ContactsEditor, contactsProblem, type ContactsValue } from '@/components/stays/contacts-editor';
import { checklistPhotoUrl } from '@/components/stays/photos';
import { CHECKLIST_KIND_LABEL, type StayDetailData, type SubmissionRow } from '@/types/room-stays';

const STATUS: Record<string, { label: string; className: string }> = {
  occupied: { label: 'In room', className: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300' },
  closed: { label: 'Checked out', className: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300' },
  cancelled: { label: 'Cancelled', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' }
};

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

export function StayView({ stayId }: { stayId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<StayDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ContactsValue | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [pending, startTransition] = useTransition();
  const features = useFeatures();

  useInnerPageHeader({
    title: data?.stay.patientName ?? 'Stay',
    subtitle: data ? `Room ${data.stay.roomNumber}${data.stay.zoneName ? ` · ${data.stay.zoneName}` : ''}` : null
  });

  const load = useCallback(async () => {
    const res = await getStayAction(stayId);
    if (res.success) {
      setData(res.data);
      setError(null);
    } else setError(res.message);
  }, [stayId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error && !data) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-3 rounded-2xl border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={() => load()}>
          <RefreshCw className="h-4 w-4" /> Try again
        </Button>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const { stay, can } = data;
  const open = stay.status === 'occupied';
  const status = STATUS[stay.status];

  const saveContacts = () => {
    if (!editing) return;
    const problem = contactsProblem(editing);
    if (problem) {
      toast({ variant: 'destructive', title: problem });
      return;
    }
    startTransition(async () => {
      const res = await updateContactsAction({
        stayId,
        patientPhone: editing.patientPhone.trim() || null,
        primaryIsPatient: editing.primaryIsPatient,
        contacts: editing.contacts.map((c) => ({ ...c, name: c.name.trim(), phone: c.phone.replace(/\s/g, '') }))
      });
      if (!res.success) {
        toast({ variant: 'destructive', title: res.message });
        return;
      }
      toast({ title: 'Contacts saved' });
      setEditing(null);
      await load();
    });
  };

  const cancel = () =>
    startTransition(async () => {
      const res = await cancelStayAction({ stayId, reason: reason.trim() });
      if (!res.success) {
        toast({ variant: 'destructive', title: res.message });
        return;
      }
      toast({ title: `Check-in cancelled. Room ${res.data.roomNumber} is free.` });
      router.replace('/stays');
    });

  return (
    <div className={cn('mx-auto w-full max-w-2xl space-y-5', open && can.checkOut ? 'pb-24' : 'pb-6')}>
      {(open && can.override) && (
        <HeaderActions>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full" aria-label="More actions">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setCancelOpen(true)}>
                <Ban className="h-4 w-4" /> Cancel check-in
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </HeaderActions>
      )}

      <dl className="divide-y overflow-hidden rounded-2xl border bg-card text-sm">
        <Row label="Status">
          <Badge className={cn('font-medium', status.className)}>{status.label}</Badge>
        </Row>
        <Row label="BHT">
          <span className="font-mono font-medium">{stay.bhtNumber}</span>
        </Row>
        <Row label="Checked in">
          <span className="text-right">
            {when(stay.checkedInAt)}
            {stay.checkedInByName && <span className="block text-xs text-muted-foreground">by {stay.checkedInByName}</span>}
          </span>
        </Row>
        {stay.checkedOutAt ? (
          <Row label={stay.status === 'cancelled' ? 'Cancelled' : 'Checked out'}>
            <span className="text-right">
              {when(stay.checkedOutAt)}
              {stay.checkedOutByName && <span className="block text-xs text-muted-foreground">by {stay.checkedOutByName}</span>}
              {stay.cancelReason && <span className="block text-xs text-muted-foreground">{stay.cancelReason}</span>}
            </span>
          </Row>
        ) : (
          <Row label="In room for">
            <span>{lengthOfStay(stay.checkedInAt)}</span>
          </Row>
        )}
      </dl>

      <ConcernsSection
        concerns={stay.concerns ?? []}
        contacts={stay.contacts}
        canHandle={features.roomStays.checkIn || features.roomStays.checkOut}
        onChanged={() => void load()}
      />

      <RequestsSection
        requests={stay.requests ?? []}
        canHandle={features.roomStays.checkIn || features.roomStays.checkOut}
        onChanged={() => void load()}
      />

      <ConversationsSection stayId={stayId} contacts={stay.contacts} />

      {(stay.feedback ?? []).length > 0 && (
        <section className="space-y-2">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">How they rated the stay</h2>
          <div className="divide-y overflow-hidden rounded-2xl border bg-card">
            {stay.feedback.map((f) => (
              <div key={f.id} className="flex items-start gap-3 px-3 py-2.5 text-sm">
                <span className={cn('shrink-0 font-semibold tabular-nums', f.rating <= 2 ? 'text-red-600' : f.rating === 3 ? 'text-amber-600' : 'text-emerald-600')}>
                  {'★'.repeat(f.rating)}
                  <span className="text-muted-foreground/40">{'★'.repeat(5 - f.rating)}</span>
                </span>
                <div className="min-w-0 flex-1">
                  {f.comment && <p>{f.comment}</p>}
                  <p className="text-xs text-muted-foreground">
                    {f.byRole === 'patient' ? 'The patient' : f.byName ?? 'A contact'} · {when(f.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ==== CONTACTS ==== */}
      <section className="space-y-2">
        <div className="flex items-center px-1">
          <h2 className="flex-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contacts</h2>
          {open && can.contacts && (
            <button
              type="button"
              className="flex items-center gap-1 text-xs font-medium text-primary"
              onClick={() =>
                setEditing({
                  patientPhone: stay.patientPhone ?? '',
                  primaryIsPatient: stay.primaryIsPatient,
                  contacts: stay.contacts.map((c) => ({ name: c.name, phone: c.phone, relationship: c.relationship ?? '', isPrimary: c.isPrimary }))
                })
              }
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          )}
        </div>
        <div className="divide-y overflow-hidden rounded-2xl border bg-card">
          <ContactRow name="Patient" phone={stay.patientPhone} primary={stay.primaryIsPatient} />
          {stay.contacts.map((c) => (
            <ContactRow key={c.id} name={c.name} relationship={c.relationship} phone={c.phone} primary={c.isPrimary} />
          ))}
        </div>
      </section>

      {/* ==== CHECKLISTS ==== */}
      <section className="space-y-2">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Checklists</h2>
        {stay.submissions.length === 0 && <p className="px-1 text-sm text-muted-foreground">None yet.</p>}
        {stay.submissions.map((s) => (
          <SubmissionCard key={s.id} submission={s} stayId={stayId} />
        ))}
      </section>

      {open && can.checkOut && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 pt-3 pb-safe backdrop-blur lg:left-52">
          <div className="mx-auto max-w-2xl pb-3">
            <Button className="h-12 w-full gap-2 rounded-xl text-base" asChild>
              <Link href={`/stays/${stayId}/check-out`}>
                <LogOut className="h-5 w-5" /> Check out
              </Link>
            </Button>
          </div>
        </div>
      )}

      <Sheet open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="bottom" className="flex max-h-[90dvh] flex-col rounded-t-3xl p-0 pb-safe">
          <SheetHeader className="border-b px-4 pb-3 pt-5 text-left">
            <SheetTitle>Contacts</SheetTitle>
            <SheetDescription>People who may be contacted about {stay.patientName}.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4">{editing && <ContactsEditor value={editing} onChange={setEditing} />}</div>
          <div className="border-t p-4">
            <Button className="h-12 w-full rounded-xl" disabled={pending} onClick={saveContacts}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save contacts
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={cancelOpen} onOpenChange={setCancelOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-safe">
          <SheetHeader className="text-left">
            <SheetTitle>Cancel this check-in?</SheetTitle>
            <SheetDescription>
              For a check-in made by mistake. Room {stay.roomNumber} becomes free; the check-in checklist stays on record.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <Textarea className="rounded-xl" placeholder="Reason" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
            <Button variant="destructive" className="h-12 w-full rounded-xl" disabled={pending || reason.trim().length < 3} onClick={cancel}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />} Cancel check-in
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 font-medium">{children}</dd>
    </div>
  );
}

function lengthOfStay(iso: string) {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hours < 1) return 'Less than an hour';
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

function ContactRow({
  name,
  relationship,
  phone,
  primary
}: {
  name: string;
  relationship?: string | null;
  phone: string | null;
  primary: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <Star className={cn('h-4 w-4 shrink-0', primary ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {name}
          {relationship ? <span className="font-normal text-muted-foreground"> · {relationship}</span> : null}
        </p>
        <p className="text-xs text-muted-foreground">{phone ?? 'No phone'}</p>
      </div>
      {phone && (
        <a href={`tel:${phone}`} className="flex h-9 w-9 items-center justify-center rounded-full bg-muted" aria-label={`Call ${name}`}>
          <Phone className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}

function SubmissionCard({ submission: s, stayId }: { submission: SubmissionRow; stayId: string }) {
  const [open, setOpen] = useState(false);
  const photos = s.answers.flatMap((a) => a.photos ?? []);
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <button type="button" className="flex w-full items-center gap-3 p-3 text-left" onClick={() => setOpen(!open)}>
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            s.hasIssues ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
          )}
        >
          {s.hasIssues ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">
            {CHECKLIST_KIND_LABEL[s.kind]}
            {s.hasIssues ? ` · ${s.issues.length} issue${s.issues.length === 1 ? '' : 's'}` : ' · all clear'}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {when(s.submittedAt)}
            {s.submittedByName ? ` · ${s.submittedByName}` : ''}
          </span>
        </span>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="space-y-3 border-t bg-muted/30 p-3 text-sm">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ClipboardList className="h-3.5 w-3.5" /> {s.templateName}
          </p>
          {s.overrideReason && (
            <p className="flex gap-2 rounded-xl bg-amber-50 p-2 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Overridden{s.overrideByName ? ` by ${s.overrideByName}` : ''}: {s.overrideReason}
              </span>
            </p>
          )}
          {s.issues.length > 0 ? (
            <ul className="space-y-1">
              {s.issues.map((i, n) => (
                <li key={n} className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                  <span>
                    <span className="font-medium">{i.itemLabel}</span>: {i.detail}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Everything passed.</p>
          )}
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {photos.map((k) => (
                <a key={k} href={checklistPhotoUrl(k, stayId)} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={checklistPhotoUrl(k, stayId)} alt="" className="h-14 w-14 rounded-lg border object-cover" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
