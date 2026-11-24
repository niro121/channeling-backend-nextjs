'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Loader2, RefreshCw, RotateCcw, ShieldAlert } from 'lucide-react';
import {
  Button,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Textarea,
  useToast
} from '@archmage/ui';
import { cn } from '@/lib/utils';
import { useFeatures } from '../features-context';
import { useInnerPageHeader } from '../page-header-context';
import { checkInAction, checkOutAction, getChecklistFormAction, getStayAction } from '@/app/actions/room-stays.actions';
import { ChecklistRunner, checklistProblems, mergeDraft, type Answers } from '@/components/stays/checklist-runner';
import { ContactsEditor, contactsProblem, type ContactsValue } from '@/components/stays/contacts-editor';
import { CHECKLIST_KIND_LABEL, type ChecklistForm, type ChecklistKind, type StayDetail } from '@/types/room-stays';

type Draft = {
  savedAt: number;
  patientName?: string;
  bhtNumber?: string;
  contacts?: ContactsValue;
  answers: Answers;
};

const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
const draftKey = (kind: ChecklistKind, id: string) => `stays-draft:v1:${kind}:${id}`;

function readDraft(key: string): Draft | null {
  try {
    const d = JSON.parse(localStorage.getItem(key) ?? 'null') as Draft | null;
    if (!d || Date.now() - d.savedAt > DRAFT_TTL_MS) return null;
    return d;
  } catch {
    return null;
  }
}

const EMPTY_CONTACTS: ContactsValue = { patientPhone: '', primaryIsPatient: false, contacts: [] };

export function ChecklistFlow({ kind, roomId: roomIdProp, stayId }: { kind: ChecklistKind; roomId?: string; stayId?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const features = useFeatures();
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState<ChecklistForm | null>(null);
  const [stay, setStay] = useState<StayDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'patient' | 'checklist'>(kind === 'check_in' ? 'patient' : 'checklist');
  const [patientName, setPatientName] = useState('');
  const [bhtNumber, setBhtNumber] = useState('');
  const [contacts, setContacts] = useState<ContactsValue>(EMPTY_CONTACTS);
  const [answers, setAnswers] = useState<Answers>({});
  const [showProblems, setShowProblems] = useState(false);
  const [restored, setRestored] = useState(false);
  const [override, setOverride] = useState<{ blocking: string[] } | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const loadedKey = useRef<string | null>(null);

  useInnerPageHeader({
    title: kind === 'check_out' ? stay?.patientName ?? 'Check out' : step === 'patient' ? 'Patient' : form?.templateName ?? 'Checklist',
    subtitle: form ? `${CHECKLIST_KIND_LABEL[kind]} · Room ${form.room.number}` : CHECKLIST_KIND_LABEL[kind],
    onBack:
      kind === 'check_in' && step === 'checklist'
        ? () => {
            setStep('patient');
            window.scrollTo({ top: 0 });
          }
        : undefined
  });

  const key = draftKey(kind, (kind === 'check_in' ? roomIdProp : stayId) ?? '');

  const load = useCallback(async () => {
    setError(null);
    setForm(null);
    let roomId = roomIdProp ?? '';
    if (kind === 'check_out') {
      const s = await getStayAction(stayId ?? '');
      if (!s.success) return setError(s.message);
      if (s.data.stay.status !== 'occupied') return setError('This patient has already been checked out.');
      setStay(s.data.stay);
      roomId = s.data.stay.roomId;
    }
    const f = await getChecklistFormAction({ roomId, kind, stayId });
    if (!f.success) return setError(f.message);
    const draft = readDraft(key);
    setForm(f.data);
    setAnswers(mergeDraft(f.data, draft?.answers));
    if (draft) {
      setPatientName(draft.patientName ?? '');
      setBhtNumber(draft.bhtNumber ?? '');
      setContacts(draft.contacts ?? EMPTY_CONTACTS);
      setRestored(Object.keys(draft.answers).length > 0 || Boolean(draft.patientName || draft.bhtNumber));
    }
    loadedKey.current = key;
  }, [kind, roomIdProp, stayId, key]);

  useEffect(() => {
    void load();
  }, [load]);

  // Keep a draft on this device so a closed tab or dropped Wi-Fi doesn't lose the work.
  useEffect(() => {
    if (!form || loadedKey.current !== key) return;
    const t = setTimeout(() => {
      const d: Draft = { savedAt: Date.now(), answers, ...(kind === 'check_in' ? { patientName, bhtNumber, contacts } : {}) };
      try {
        localStorage.setItem(key, JSON.stringify(d));
      } catch {
        /* storage full or private mode: carry on without a draft */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [form, key, kind, answers, patientName, bhtNumber, contacts]);

  const startOver = () => {
    localStorage.removeItem(key);
    setRestored(false);
    setPatientName('');
    setBhtNumber('');
    setContacts(EMPTY_CONTACTS);
    if (form) setAnswers(mergeDraft(form, undefined));
    setShowProblems(false);
    if (kind === 'check_in') setStep('patient');
  };

  const problems = useMemo(() => (form ? checklistProblems(form, answers) : new Map<string, string>()), [form, answers]);
  const patientProblem = !patientName.trim()
    ? 'Enter the patient name.'
    : !bhtNumber.trim()
      ? 'Enter the BHT number.'
      : contactsProblem(contacts);

  const submit = (reason?: string) => {
    if (!form) return;
    if (problems.size) {
      setShowProblems(true);
      const first = [...problems.keys()][0];
      document.getElementById(`item-${first}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast({ variant: 'destructive', title: `${problems.size} item${problems.size === 1 ? '' : 's'} still to fill in` });
      return;
    }
    startTransition(async () => {
      const list = Object.values(answers);
      const res =
        kind === 'check_in'
          ? await checkInAction({
              roomId: form.room.id,
              patient: {
                patientName: patientName.trim(),
                bhtNumber: bhtNumber.trim(),
                patientPhone: contacts.patientPhone.trim() || null,
                primaryIsPatient: contacts.primaryIsPatient,
                contacts: contacts.contacts.map((c) => ({ ...c, name: c.name.trim(), phone: c.phone.replace(/\s/g, '') }))
              },
              answers: list,
              overrideReason: reason ?? null
            })
          : await checkOutAction({ stayId: stayId ?? '', answers: list, overrideReason: reason ?? null });

      if (res.success) {
        localStorage.removeItem(key);
        setOverride(null);
        const n = res.data.issues.length;
        toast({
          variant: n ? 'destructive' : 'default',
          title:
            kind === 'check_in'
              ? `Checked in to Room ${form.room.number}${n ? ` with ${n} issue${n === 1 ? '' : 's'}` : ''}`
              : `Checked out of Room ${form.room.number}${n ? ` with ${n} issue${n === 1 ? '' : 's'}` : ''}`
        });
        router.replace(kind === 'check_in' ? `/stays/${res.data.stayId}` : '/stays');
        router.refresh();
        return;
      }
      if (res.errorCode === 'needs_override') {
        setOverride({ blocking: res.details?.blocking ?? [] });
        return;
      }
      toast({ variant: 'destructive', title: res.message });
      if (res.errorCode === 'conflict') router.replace('/stays');
    });
  };

  if (error) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-3 rounded-2xl border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
        <div className="flex justify-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/stays">
              <ArrowLeft className="h-4 w-4" /> Rooms
            </Link>
          </Button>
          <Button variant="outline" onClick={() => load()}>
            <RefreshCw className="h-4 w-4" /> Try again
          </Button>
        </div>
      </div>
    );
  }
  if (!form) {
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const canOverride = features.roomStays.override;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 pb-24">
      {restored && (
        <div className="flex items-center gap-2 rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
          <span className="flex-1">Picked up where you left off.</span>
          <button type="button" className="flex items-center gap-1 font-medium" onClick={startOver}>
            <RotateCcw className="h-3.5 w-3.5" /> Start over
          </button>
        </div>
      )}

      {kind === 'check_out' && stay && (
        <p className="text-sm text-muted-foreground">
          BHT {stay.bhtNumber} · checked in {new Date(stay.checkedInAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      )}

      {step === 'patient' ? (
        <div className="space-y-4">
          <div className="space-y-3 rounded-2xl border bg-card p-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="patient-name">
                Patient name <span className="text-destructive">*</span>
              </label>
              <Input
                id="patient-name"
                className="h-11 rounded-xl"
                autoComplete="off"
                maxLength={120}
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="bht">
                BHT number <span className="text-destructive">*</span>
              </label>
              <Input
                id="bht"
                className="h-11 rounded-xl font-mono uppercase"
                autoComplete="off"
                autoCapitalize="characters"
                maxLength={40}
                value={bhtNumber}
                onChange={(e) => setBhtNumber(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contacts</h2>
            <ContactsEditor value={contacts} onChange={setContacts} />
          </div>
        </div>
      ) : (
        <ChecklistRunner form={form} answers={answers} onChange={setAnswers} showProblems={showProblems} stayId={stayId} />
      )}

      {/* ==== BOTTOM BAR ==== */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 pt-3 pb-safe backdrop-blur lg:left-52">
        <div className="mx-auto flex max-w-2xl items-center gap-3 pb-3">
          {step === 'patient' ? (
            <>
              <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{patientProblem ?? 'Next: the checklist'}</p>
              <Button
                className="h-12 rounded-xl px-6"
                onClick={() => {
                  if (patientProblem) {
                    toast({ variant: 'destructive', title: patientProblem });
                    return;
                  }
                  setStep('checklist');
                  window.scrollTo({ top: 0 });
                }}
              >
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <p className={cn('min-w-0 flex-1 text-xs', problems.size ? 'text-muted-foreground' : 'font-medium text-emerald-700 dark:text-emerald-400')}>
                {problems.size ? `${problems.size} left to fill in` : 'Ready to submit'}
              </p>
              <Button className="h-12 rounded-xl px-6" disabled={pending} onClick={() => submit()}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {kind === 'check_in' ? 'Check in' : 'Check out'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ==== FAILED "MUST PASS" ITEMS ==== */}
      <Sheet open={Boolean(override)} onOpenChange={(o) => !o && setOverride(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-safe">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-600" /> These must pass
            </SheetTitle>
            <SheetDescription>
              {canOverride
                ? 'You can still finish, but say why. Supervisors get an alert.'
                : 'Fix them first, or ask a supervisor with Override to finish this checklist on their phone.'}
            </SheetDescription>
          </SheetHeader>
          <ul className="my-4 space-y-1.5">
            {(override?.blocking ?? []).map((b) => (
              <li key={b} className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" /> {b}
              </li>
            ))}
          </ul>
          {canOverride ? (
            <div className="space-y-3">
              <Textarea
                className="rounded-xl"
                placeholder="Why finish anyway? e.g. housekeeping called, cleaning after admission"
                maxLength={300}
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
              />
              <Button
                className="h-12 w-full rounded-xl"
                disabled={pending || overrideReason.trim().length < 3}
                onClick={() => submit(overrideReason.trim())}
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />} Finish anyway
              </Button>
            </div>
          ) : (
            <Button variant="outline" className="h-12 w-full rounded-xl" onClick={() => setOverride(null)}>
              Back to checklist
            </Button>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
