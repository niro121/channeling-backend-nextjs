'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Textarea,
  useToast
} from '@archmage/ui';
import {
  ArrowLeft,
  Bell,
  BellOff,
  CheckCircle2,
  ChevronDown,
  History,
  Loader2,
  MessageSquare,
  MoreVertical,
  Pencil,
  Play,
  Repeat,
  RotateCcw,
  Send,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PRIORITY_LABEL, STATUS_LABEL, formatDue, formatWhen, type TaskStatus } from '@/lib/tasks/constants';
import {
  addCommentAction,
  deleteCommentAction,
  deleteTaskAction,
  getTaskAction,
  markTaskNotificationsReadAction,
  setWatchingAction
} from '@/app/actions/tasks.actions';
import { TaskFormSheet } from '@/components/tasks/task-form-sheet';
import { StatusMenu, useStatusChange } from '@/components/tasks/status-change';
import { DueLabel, PersonAvatar, PriorityTag, StatusPill } from '@/components/tasks/task-ui';
import { HeaderActions } from '../../header-actions';
import type { TaskActivityItem, TaskDetail } from '@/types/tasks';

/** The obvious next step for the assignee */
const NEXT_STEP: Partial<Record<TaskStatus, { status: TaskStatus; label: string; icon: React.ComponentType<{ className?: string }> }>> = {
  TODO: { status: 'IN_PROGRESS', label: 'Start', icon: Play },
  IN_PROGRESS: { status: 'DONE', label: 'Mark done', icon: CheckCircle2 },
  WAITING: { status: 'IN_PROGRESS', label: 'Resume', icon: Play },
  DONE: { status: 'IN_PROGRESS', label: 'Reopen', icon: RotateCcw },
  CANCELLED: { status: 'TODO', label: 'Reopen', icon: RotateCcw }
};

function activityText(a: TaskActivityItem): string {
  const who = a.actorName ?? 'System';
  switch (a.type) {
    case 'created':
      return `${who} created the task`;
    case 'recurring_created':
      return `Created by the recurring schedule${a.toValue ? ` (${a.toValue})` : ''}`;
    case 'assigned':
      return a.fromValue ? `${who} reassigned from ${a.fromValue} to ${a.toValue}` : `${who} assigned to ${a.toValue}`;
    case 'status':
      return `${who} moved it from ${STATUS_LABEL[a.fromValue as TaskStatus] ?? a.fromValue} to ${STATUS_LABEL[a.toValue as TaskStatus] ?? a.toValue}`;
    case 'due':
      return a.toValue ? `${who} set the due date to ${formatDue(a.toValue)}` : `${who} removed the due date`;
    case 'priority':
      return `${who} changed priority to ${PRIORITY_LABEL[a.toValue as keyof typeof PRIORITY_LABEL] ?? a.toValue}`;
    case 'edited':
      return `${who} edited the details`;
    default:
      return `${who} updated the task`;
  }
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right">{children}</span>
    </div>
  );
}

export function TaskDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'comments' | 'history'>('comments');
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const result = await getTaskAction(id);
    if (result.success) {
      setTask(result.data);
      setError(null);
    } else setError(result.message);
  }, [id]);

  useEffect(() => {
    void load();
    // Opening the task clears its notifications
    void markTaskNotificationsReadAction(id).then(() => window.dispatchEvent(new Event('tasks:notifications-changed')));
  }, [id, load]);

  const status = useStatusChange(() => void load());

  if (error) {
    return (
      <div className="flex w-full flex-col items-center gap-4 rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        {error}
        <Button asChild variant="outline">
          <Link href="/tasks">Back to tasks</Link>
        </Button>
      </div>
    );
  }
  if (!task) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  const next = task.can.changeStatus ? NEXT_STEP[task.status] : undefined;
  const statusTarget = { id: task.id, number: task.number, title: task.title, status: task.status, requireCompletionNote: task.requireCompletionNote };

  const send = async () => {
    const body = comment.trim();
    if (!body) return;
    setSending(true);
    const result = await addCommentAction(task.id, body);
    setSending(false);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Comment not sent', description: result.message });
      return;
    }
    setComment('');
    await load();
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 50);
  };

  const toggleWatch = async () => {
    const result = await setWatchingAction(task.id, !task.isWatching);
    if (!result.success) toast({ variant: 'destructive', title: 'Not changed', description: result.message });
    else {
      toast({ title: task.isWatching ? 'You won’t get updates for this task' : 'You’ll get updates for this task' });
      void load();
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete T-${task.number}? This removes its comments and history.`)) return;
    const result = await deleteTaskAction(task.id);
    if (!result.success) toast({ variant: 'destructive', title: 'Not deleted', description: result.message });
    else {
      toast({ title: `T-${task.number} deleted` });
      router.push('/tasks');
    }
  };

  const me = session?.user?.id;
  // Creator and assignee always get updates; anyone else can watch or stop watching
  const canToggleWatch = !task.isWatching || (task.createdBy.id !== me && task.assignee?.id !== me);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <HeaderActions>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon" aria-label="Task actions">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {task.can.edit && (
              <DropdownMenuItem onSelect={() => setEditOpen(true)} className="gap-2 py-2.5">
                <Pencil className="h-4 w-4" /> Edit task
              </DropdownMenuItem>
            )}
            {canToggleWatch ? (
              <DropdownMenuItem onSelect={() => void toggleWatch()} className="gap-2 py-2.5">
                {task.isWatching ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                {task.isWatching ? 'Stop watching' : 'Watch'}
              </DropdownMenuItem>
            ) : null}
            {task.can.delete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void remove()} className="gap-2 py-2.5 text-destructive focus:text-destructive">
                  <Trash2 className="h-4 w-4" /> Delete task
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </HeaderActions>

      <Link href="/tasks" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Tasks
      </Link>

      <section className="rounded-2xl border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">T-{task.number}</span>
          {task.recurringTaskId && (
            <span className="inline-flex items-center gap-1">
              <Repeat className="h-3.5 w-3.5" /> Recurring
            </span>
          )}
          <PriorityTag priority={task.priority} />
        </div>
        <h2 className={cn('mt-1.5 text-xl font-semibold leading-snug', task.status === 'CANCELLED' && 'line-through opacity-60')}>{task.title}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusPill status={task.status} />
          <DueLabel dueAt={task.dueAt} status={task.status} />
        </div>

        {task.can.changeStatus && (
          <div className="mt-4 flex gap-2">
            {next && (
              <Button type="button" className="h-11 flex-1 text-base" disabled={status.busy} onClick={() => status.request(statusTarget, next.status)}>
                <next.icon className="mr-2 h-5 w-5" />
                {next.label}
              </Button>
            )}
            <StatusMenu task={statusTarget} canCancel={task.can.cancel} onPick={(s) => status.request(statusTarget, s)}>
              <Button type="button" variant="outline" className="h-11 shrink-0">
                Status <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </StatusMenu>
          </div>
        )}
        {task.requireCompletionNote && task.status !== 'DONE' && (
          <p className="mt-3 text-xs text-muted-foreground">A comment is required to mark this task done.</p>
        )}
      </section>

      <section className="rounded-2xl border bg-card px-4 py-1.5 divide-y">
        <MetaRow label="Assigned to">
          <span className="inline-flex items-center gap-2">
            <PersonAvatar name={task.assignee?.name} className="h-6 w-6 text-[10px]" />
            {task.assignee?.name ?? 'Unassigned'}
          </span>
        </MetaRow>
        <MetaRow label="Created by">
          {task.createdBy.name} · {formatWhen(task.createdAt)}
        </MetaRow>
        <MetaRow label="Due">{task.dueAt ? formatDue(task.dueAt) : '—'}</MetaRow>
        <MetaRow label="Priority">{PRIORITY_LABEL[task.priority]}</MetaRow>
        {task.completedAt && (
          <MetaRow label="Completed">
            {task.completedBy?.name ?? ''} · {formatWhen(task.completedAt)}
          </MetaRow>
        )}
        <MetaRow label="Getting updates">
          <span className="text-muted-foreground">{task.watchers.map((w) => w.name).join(', ') || '—'}</span>
        </MetaRow>
      </section>

      {task.description && (
        <section className="rounded-2xl border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Details</h3>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{task.description}</p>
        </section>
      )}

      <div className="grid grid-cols-2 rounded-xl bg-muted p-1 text-sm font-medium" role="tablist">
        {(
          [
            ['comments', `Comments (${task.comments.length})`, MessageSquare],
            ['history', 'History', History]
          ] as const
        ).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn('inline-flex items-center justify-center gap-1.5 rounded-lg py-2 transition-colors', tab === value ? 'bg-background shadow-sm' : 'text-muted-foreground')}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'comments' ? (
        <section className="flex flex-col gap-3">
          {task.comments.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No comments yet. Start the discussion below.</p>}
          {task.comments.map((c) => (
            <div key={c.id} className={cn('flex gap-3', c.mine && 'flex-row-reverse')}>
              <PersonAvatar name={c.author.name} />
              <div
                className={cn(
                  'group min-w-0 max-w-[85%] rounded-2xl px-3.5 py-2.5',
                  c.isCompletionNote ? 'border border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950' : c.mine ? 'bg-primary/10' : 'bg-muted'
                )}
              >
                <div className="flex items-baseline gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{c.mine ? 'You' : c.author.name}</span>
                  <span>{formatWhen(c.createdAt)}</span>
                  {(c.mine || task.can.edit) && (
                    <button
                      type="button"
                      className="ml-auto opacity-60 hover:opacity-100"
                      aria-label="Delete comment"
                      onClick={async () => {
                        if (!window.confirm('Delete this comment?')) return;
                        const r = await deleteCommentAction(task.id, c.id);
                        if (r.success) void load();
                        else toast({ variant: 'destructive', title: 'Not deleted', description: r.message });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {c.isCompletionNote && (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Completion note
                  </p>
                )}
                <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{c.body}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />

          {task.can.comment && (
            <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 -mx-1 flex items-end gap-2 rounded-2xl border bg-background/95 p-2 shadow-sm backdrop-blur lg:bottom-4">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void send();
                }}
                rows={1}
                placeholder="Write a comment…"
                className="max-h-40 min-h-[44px] flex-1 resize-none border-0 text-base shadow-none focus-visible:ring-0 sm:text-sm"
              />
              <Button type="button" size="icon" className="h-11 w-11 shrink-0 rounded-full" disabled={sending || !comment.trim()} onClick={() => void send()} aria-label="Send">
                {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </div>
          )}
        </section>
      ) : (
        <ol className="relative ml-2 border-l pl-5">
          {task.activity
            .slice()
            .reverse()
            .map((a) => (
              <li key={a.id} className="mb-4">
                <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-muted-foreground/50" />
                <p className="text-sm">{activityText(a)}</p>
                <p className="text-xs text-muted-foreground">{formatWhen(a.createdAt)}</p>
              </li>
            ))}
        </ol>
      )}

      <TaskFormSheet open={editOpen} onOpenChange={setEditOpen} task={task} onSaved={() => void load()} />
      {status.dialog}
    </div>
  );
}
