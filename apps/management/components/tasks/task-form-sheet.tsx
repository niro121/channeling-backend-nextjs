'use client';

import { useEffect, useState } from 'react';
import { Button, Input, Label, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, Textarea } from '@archmage/ui';
import { Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import {
  PRIORITIES,
  PRIORITY_LABEL,
  colomboDateKey,
  colomboInstant,
  toColomboLocalInput,
  type TaskPriority
} from '@/lib/tasks/constants';
import { createTaskAction, listPeopleAction, updateTaskAction, type TaskFormValues } from '@/app/actions/tasks.actions';
import type { TaskDetail } from '@/types/tasks';

type PersonOption = { id: string; name: string; email: string };

let peopleCache: PersonOption[] | null = null;

export function usePeople(enabled: boolean) {
  const [people, setPeople] = useState<PersonOption[] | null>(peopleCache);
  useEffect(() => {
    if (!enabled || peopleCache) return;
    void listPeopleAction().then((r) => {
      if (r.success) {
        peopleCache = r.data;
        setPeople(r.data);
      } else setPeople([]);
    });
  }, [enabled]);
  return people;
}

/** Quick due-date choices (Sri Lanka time) */
function quickDue(kind: 'today' | 'tomorrow' | 'friday'): string {
  const today = colomboDateKey(new Date());
  const day = new Date(`${today}T00:00:00Z`);
  if (kind === 'tomorrow') day.setUTCDate(day.getUTCDate() + 1);
  if (kind === 'friday') day.setUTCDate(day.getUTCDate() + (((5 - day.getUTCDay() + 7) % 7) || 7));
  return toColomboLocalInput(colomboInstant(day.toISOString().slice(0, 10), '17:00'));
}

export function PersonSelect({
  id,
  value,
  onChange,
  people,
  selfId,
  disabled
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  people: PersonOption[] | null;
  selfId?: string;
  disabled?: boolean;
}) {
  const sorted = (people ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
  return (
    <select
      id={id}
      value={value}
      disabled={disabled || !people}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full rounded-md border border-input bg-background px-3 text-base disabled:opacity-60 sm:h-10 sm:text-sm"
    >
      {!people && <option value={value}>Loading people…</option>}
      {people && selfId && !sorted.some((p) => p.id === selfId) && <option value={selfId}>Me</option>}
      {sorted.map((p) => (
        <option key={p.id} value={p.id}>
          {p.id === selfId ? `${p.name} (me)` : p.name}
        </option>
      ))}
    </select>
  );
}

export function PriorityPicker({ value, onChange }: { value: TaskPriority; onChange: (p: TaskPriority) => void }) {
  return (
    <div className="grid grid-cols-4 gap-1 rounded-xl bg-muted p-1 text-sm font-medium" role="radiogroup">
      {PRIORITIES.map((p) => (
        <button
          key={p}
          type="button"
          role="radio"
          aria-checked={value === p}
          onClick={() => onChange(p)}
          className={cn(
            'rounded-lg py-2 transition-colors',
            value === p ? (p === 'URGENT' ? 'bg-red-600 text-white shadow-sm' : 'bg-background shadow-sm') : 'text-muted-foreground'
          )}
        >
          {PRIORITY_LABEL[p]}
        </button>
      ))}
    </div>
  );
}

export function CheckRow({ id, checked, onChange, label, hint }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-xl border p-3">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-5 w-5 accent-[hsl(var(--primary))]" />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

/** Create a task, or edit one (title, description, assignee, due date, priority). */
export function TaskFormSheet({
  open,
  onOpenChange,
  task,
  onSaved
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit this task; omit to create */
  task?: TaskDetail | null;
  onSaved: (id: string) => void;
}) {
  const { data: session } = useSession();
  const selfId = session?.user?.id ?? '';
  const people = usePeople(open);
  const [values, setValues] = useState<Required<TaskFormValues>>({
    title: '',
    description: '',
    assigneeId: '',
    dueAt: '',
    priority: 'NORMAL',
    requireCompletionNote: false
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setValues({
      title: task?.title ?? '',
      description: task?.description ?? '',
      assigneeId: task?.assignee?.id ?? selfId,
      dueAt: toColomboLocalInput(task?.dueAt ?? null),
      priority: task?.priority ?? 'NORMAL',
      requireCompletionNote: task?.requireCompletionNote ?? false
    });
  }, [open, task, selfId]);

  const set = <K extends keyof TaskFormValues>(key: K, value: Required<TaskFormValues>[K]) => setValues((v) => ({ ...v, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.title.trim()) {
      setError('Give the task a title.');
      return;
    }
    setBusy(true);
    setError(null);
    let savedId = task?.id ?? '';
    if (task) {
      const result = await updateTaskAction(task.id, values);
      if (!result.success) {
        setBusy(false);
        setError(result.message);
        return;
      }
    } else {
      const result = await createTaskAction(values);
      if (!result.success) {
        setBusy(false);
        setError(result.message);
        return;
      }
      savedId = result.data.id;
    }
    setBusy(false);
    onSaved(savedId);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 pt-safe sm:max-w-lg">
        <SheetHeader className="border-b px-4 py-3 text-left">
          <SheetTitle>{task ? `Edit T-${task.number}` : 'New task'}</SheetTitle>
          <SheetDescription className="sr-only">Task details</SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                autoFocus={!task}
                value={values.title}
                maxLength={200}
                placeholder="e.g. Cash balance – channel counter"
                onChange={(e) => set('title', e.target.value)}
                className="h-11 text-base sm:h-10 sm:text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-assignee">Assign to</Label>
              <PersonSelect id="task-assignee" value={values.assigneeId} onChange={(v) => set('assigneeId', v)} people={people} selfId={selfId} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-due">Due</Label>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['today', 'Today 5 pm'],
                    ['tomorrow', 'Tomorrow'],
                    ['friday', 'Friday']
                  ] as const
                ).map(([kind, label]) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => set('dueAt', quickDue(kind))}
                    className={cn('rounded-full border px-3 py-1.5 text-sm', values.dueAt === quickDue(kind) && 'border-primary bg-primary text-primary-foreground')}
                  >
                    {label}
                  </button>
                ))}
                {values.dueAt && (
                  <button type="button" onClick={() => set('dueAt', '')} className="rounded-full px-3 py-1.5 text-sm text-muted-foreground">
                    No due date
                  </button>
                )}
              </div>
              <Input
                id="task-due"
                type="datetime-local"
                value={values.dueAt}
                onChange={(e) => set('dueAt', e.target.value)}
                className="h-11 text-base sm:h-10 sm:text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <PriorityPicker value={values.priority as TaskPriority} onChange={(p) => set('priority', p)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-desc">Details</Label>
              <Textarea
                id="task-desc"
                rows={5}
                value={values.description}
                maxLength={5000}
                placeholder="What needs to be done, and what to report back"
                onChange={(e) => set('description', e.target.value)}
                className="text-base sm:text-sm"
              />
            </div>

            <CheckRow
              id="task-note"
              checked={values.requireCompletionNote}
              onChange={(v) => set('requireCompletionNote', v)}
              label="Require a comment to finish"
              hint="The assignee must write what they found or did when marking it done."
            />

            {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          </div>
          <div className="border-t p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <Button type="submit" className="h-11 w-full text-base" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {task ? 'Save changes' : 'Create task'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
