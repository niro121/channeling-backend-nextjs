'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Button, Input, Label, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, Textarea, useToast } from '@archmage/ui';
import { ArrowLeft, CalendarClock, Loader2, Pause, Pencil, Play, Plus, Repeat, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FREQUENCIES, FREQUENCY_LABEL, WEEKDAY_SHORT, describeSchedule, type Frequency, type TaskPriority } from '@/lib/tasks/constants';
import {
  createRecurringAction,
  deleteRecurringAction,
  listRecurringAction,
  setRecurringActiveAction,
  updateRecurringAction
} from '@/app/actions/tasks.actions';
import { useTaskPerms } from '@/components/tasks/task-perms';
import { CheckRow, PersonSelect, PriorityPicker, usePeople } from '@/components/tasks/task-form-sheet';
import { PersonAvatar, PriorityTag } from '@/components/tasks/task-ui';
import { HeaderActions } from '../../header-actions';
import type { RecurringTaskItem } from '@/types/tasks';

type FormState = {
  title: string;
  description: string;
  assigneeId: string;
  priority: TaskPriority;
  requireCompletionNote: boolean;
  frequency: Frequency;
  daysOfWeek: number[];
  dayOfMonth: number;
  createTime: string;
  dueTime: string;
};

function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

function formatRunDate(key: string): string {
  return new Date(`${key}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });
}

export function RecurringContent() {
  const perms = useTaskPerms();
  const { toast } = useToast();
  const [rows, setRows] = useState<RecurringTaskItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<RecurringTaskItem | 'new' | null>(null);

  const load = useCallback(async () => {
    const result = await listRecurringAction();
    if (result.success) setRows(result.data);
    else setError(result.message);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (r: RecurringTaskItem) => {
    const result = await setRecurringActiveAction(r.id, !r.active);
    if (!result.success) toast({ variant: 'destructive', title: 'Not changed', description: result.message });
    else {
      toast({ title: r.active ? `Paused “${r.title}”` : `Resumed “${r.title}”` });
      void load();
    }
  };

  const remove = async (r: RecurringTaskItem) => {
    if (!window.confirm(`Delete “${r.title}”? Tasks it already created stay.`)) return;
    const result = await deleteRecurringAction(r.id);
    if (!result.success) toast({ variant: 'destructive', title: 'Not deleted', description: result.message });
    else void load();
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <HeaderActions>
        {perms.recurring && (
          <Button type="button" className="hidden lg:inline-flex" onClick={() => setEditing('new')}>
            <Plus className="mr-1 h-4 w-4" /> New recurring task
          </Button>
        )}
      </HeaderActions>

      <Link href="/tasks" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Tasks
      </Link>

      <div>
        <h2 className="text-lg font-semibold">Recurring tasks</h2>
        <p className="text-sm text-muted-foreground">Each time it repeats, a new task is created and the assignee is notified.</p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">{error}</div>
      ) : !rows ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          <Repeat className="h-8 w-8" />
          No recurring tasks yet.
          {perms.recurring && (
            <Button type="button" onClick={() => setEditing('new')}>
              <Plus className="mr-1 h-4 w-4" /> New recurring task
            </Button>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.id} className={cn('rounded-2xl border bg-card p-4', !r.active && 'opacity-60')}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{r.title}</p>
                    <PriorityTag priority={r.priority} />
                    {!r.active && <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-semibold uppercase">Paused</span>}
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Repeat className="h-3.5 w-3.5" />
                    {describeSchedule(r)} · {formatTime(r.createTime)}–{formatTime(r.dueTime)}
                  </p>
                  {r.active && (
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <CalendarClock className="h-3.5 w-3.5" /> Next: {formatRunDate(r.nextRunDate)}
                    </p>
                  )}
                  <p className="mt-2 flex items-center gap-2 text-sm">
                    <PersonAvatar name={r.assignee.name} className="h-6 w-6 text-[10px]" />
                    {r.assignee.name}
                    {r.requireCompletionNote && <span className="text-xs text-muted-foreground">· comment required</span>}
                  </p>
                </div>
              </div>
              {r.canEdit && (
                <div className="mt-3 flex gap-2 border-t pt-3">
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditing(r)}>
                    <Pencil className="mr-1.5 h-4 w-4" /> Edit
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => void toggle(r)}>
                    {r.active ? <Pause className="mr-1.5 h-4 w-4" /> : <Play className="mr-1.5 h-4 w-4" />}
                    {r.active ? 'Pause' : 'Resume'}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="ml-auto text-destructive" onClick={() => void remove(r)} aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {perms.recurring && (
        <button
          type="button"
          onClick={() => setEditing('new')}
          aria-label="New recurring task"
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 lg:hidden"
        >
          <Plus className="h-7 w-7" />
        </button>
      )}

      <RecurringSheet
        item={editing === 'new' ? null : editing}
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        onSaved={() => {
          setEditing(null);
          void load();
        }}
      />
    </div>
  );
}

function RecurringSheet({
  item,
  open,
  onOpenChange,
  onSaved
}: {
  item: RecurringTaskItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { data: session } = useSession();
  const selfId = session?.user?.id ?? '';
  const people = usePeople(open);
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm({
      title: item?.title ?? '',
      description: item?.description ?? '',
      assigneeId: item?.assignee.id ?? selfId,
      priority: item?.priority ?? 'NORMAL',
      requireCompletionNote: item?.requireCompletionNote ?? true,
      frequency: item?.frequency ?? 'WEEKLY',
      daysOfWeek: item?.daysOfWeek ?? [3],
      dayOfMonth: item?.dayOfMonth ?? 1,
      createTime: item?.createTime ?? '08:00',
      dueTime: item?.dueTime ?? '17:00'
    });
  }, [open, item, selfId]);

  if (!form) return null;
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const input = { ...form, dayOfMonth: form.frequency === 'MONTHLY' ? form.dayOfMonth : null };
    const result = item ? await updateRecurringAction(item.id, input) : await createRecurringAction(input);
    setBusy(false);
    if (!result.success) setError(result.message);
    else onSaved();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 pt-safe sm:max-w-lg">
        <SheetHeader className="border-b px-4 py-3 text-left">
          <SheetTitle>{item ? 'Edit recurring task' : 'New recurring task'}</SheetTitle>
          <SheetDescription className="sr-only">Schedule and details</SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rec-title">Title</Label>
              <Input
                id="rec-title"
                value={form.title}
                maxLength={200}
                placeholder="e.g. Cash balance – channel"
                onChange={(e) => set('title', e.target.value)}
                className="h-11 text-base sm:h-10 sm:text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rec-assignee">Assign to</Label>
              <PersonSelect id="rec-assignee" value={form.assigneeId} onChange={(v) => set('assigneeId', v)} people={people} selfId={selfId} />
            </div>

            <div className="space-y-2">
              <Label>Repeats</Label>
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1 text-sm font-medium" role="radiogroup">
                {FREQUENCIES.map((f) => (
                  <button
                    key={f}
                    type="button"
                    role="radio"
                    aria-checked={form.frequency === f}
                    onClick={() => set('frequency', f)}
                    className={cn('rounded-lg py-2', form.frequency === f ? 'bg-background shadow-sm' : 'text-muted-foreground')}
                  >
                    {FREQUENCY_LABEL[f]}
                  </button>
                ))}
              </div>
              {form.frequency === 'WEEKLY' && (
                <div className="grid grid-cols-7 gap-1">
                  {WEEKDAY_SHORT.map((d, i) => {
                    const on = form.daysOfWeek.includes(i);
                    return (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={on}
                        onClick={() => set('daysOfWeek', on ? form.daysOfWeek.filter((x) => x !== i) : [...form.daysOfWeek, i])}
                        className={cn('rounded-lg border py-2 text-sm', on ? 'border-primary bg-primary text-primary-foreground' : 'bg-background')}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              )}
              {form.frequency === 'MONTHLY' && (
                <div className="flex items-center gap-2 text-sm">
                  <span>On day</span>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={form.dayOfMonth}
                    onChange={(e) => set('dayOfMonth', Number(e.target.value))}
                    className="h-11 w-20 text-base sm:h-10 sm:text-sm"
                  />
                  <span className="text-muted-foreground">of each month</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">{describeSchedule({ ...form, dayOfMonth: form.dayOfMonth })}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="rec-create">Appears at</Label>
                <Input id="rec-create" type="time" value={form.createTime} onChange={(e) => set('createTime', e.target.value)} className="h-11 text-base sm:h-10 sm:text-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rec-due">Due by</Label>
                <Input id="rec-due" type="time" value={form.dueTime} onChange={(e) => set('dueTime', e.target.value)} className="h-11 text-base sm:h-10 sm:text-sm" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <PriorityPicker value={form.priority} onChange={(p) => set('priority', p)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rec-desc">Details</Label>
              <Textarea
                id="rec-desc"
                rows={4}
                value={form.description}
                maxLength={5000}
                placeholder="e.g. Count the channel cash drawer and confirm it matches the system balance. Comment the amount."
                onChange={(e) => set('description', e.target.value)}
                className="text-base sm:text-sm"
              />
            </div>

            <CheckRow
              id="rec-note"
              checked={form.requireCompletionNote}
              onChange={(v) => set('requireCompletionNote', v)}
              label="Require a comment to finish"
              hint="e.g. the counted amount, or what was checked."
            />

            {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          </div>
          <div className="border-t p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <Button type="submit" className="h-11 w-full text-base" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {item ? 'Save changes' : 'Create recurring task'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
