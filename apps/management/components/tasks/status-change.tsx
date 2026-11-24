'use client';

import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Textarea,
  useToast
} from '@archmage/ui';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ALL_STATUSES, STATUS_LABEL, type TaskStatus } from '@/lib/tasks/constants';
import { changeTaskStatusAction } from '@/app/actions/tasks.actions';
import { STATUS_STYLE } from './task-ui';

type Target = { id: string; number: number; title: string; status: TaskStatus; requireCompletionNote: boolean };
type Pending = { task: Target; status: TaskStatus };

/**
 * Status changes for a board card or the task page. Done asks for the closing comment
 * (required when the task says so); Cancel asks to confirm; the rest apply straight away.
 */
export function useStatusChange(onChanged: (taskId: string, status: TaskStatus) => void) {
  const { toast } = useToast();
  const [pending, setPending] = useState<Pending | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = async (task: Target, status: TaskStatus, text?: string) => {
    setBusy(true);
    setError(null);
    const result = await changeTaskStatusAction(task.id, status, text);
    setBusy(false);
    if (!result.success) {
      if (pending) setError(result.message);
      else toast({ variant: 'destructive', title: 'Could not update', description: result.message });
      return false;
    }
    onChanged(task.id, status);
    toast({ title: `T-${task.number} → ${STATUS_LABEL[status]}` });
    return true;
  };

  const request = (task: Target, status: TaskStatus) => {
    if (status === task.status) return;
    if (status === 'DONE' || status === 'CANCELLED') {
      setNote('');
      setError(null);
      setPending({ task, status });
      return;
    }
    void apply(task, status);
  };

  const needsNote = pending?.status === 'DONE' && pending.task.requireCompletionNote;

  const dialog = (
    <Dialog open={!!pending} onOpenChange={(o) => !o && !busy && setPending(null)}>
      <DialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{pending?.status === 'DONE' ? 'Mark as done' : 'Cancel this task?'}</DialogTitle>
          <DialogDescription className="line-clamp-2">
            T-{pending?.task.number}: {pending?.task.title}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Textarea
            autoFocus
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              pending?.status === 'DONE'
                ? needsNote
                  ? 'Required: what you checked or found (e.g. balance Rs 12,400 – matches)'
                  : 'Add a closing comment (optional)'
                : 'Reason (optional)'
            }
            className="text-base sm:text-sm"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" disabled={busy} onClick={() => setPending(null)}>
            Back
          </Button>
          <Button
            type="button"
            variant={pending?.status === 'CANCELLED' ? 'destructive' : 'default'}
            disabled={busy || (needsNote && !note.trim())}
            onClick={async () => {
              if (!pending) return;
              if (await apply(pending.task, pending.status, note)) setPending(null);
            }}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pending?.status === 'DONE' ? 'Mark done' : 'Cancel task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { request, dialog, busy };
}

/** "Move to…" menu */
export function StatusMenu({
  task,
  canCancel,
  onPick,
  children
}: {
  task: Target;
  canCancel: boolean;
  onPick: (status: TaskStatus) => void;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Move to</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ALL_STATUSES.filter((s) => s !== 'CANCELLED' || canCancel).map((s) => (
          <DropdownMenuItem key={s} onSelect={() => onPick(s)} className="gap-2 py-2.5">
            <span className={cn('h-2 w-2 rounded-full', STATUS_STYLE[s].dot)} />
            <span className="flex-1">{STATUS_LABEL[s]}</span>
            {task.status === s && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
