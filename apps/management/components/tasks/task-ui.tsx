'use client';

import { AlertTriangle, CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  formatDue,
  isOverdue,
  type TaskPriority,
  type TaskStatus
} from '@/lib/tasks/constants';

export const STATUS_STYLE: Record<TaskStatus, { dot: string; pill: string }> = {
  TODO: { dot: 'bg-slate-400', pill: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' },
  IN_PROGRESS: { dot: 'bg-blue-500', pill: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200' },
  WAITING: { dot: 'bg-amber-500', pill: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200' },
  DONE: { dot: 'bg-emerald-500', pill: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200' },
  CANCELLED: { dot: 'bg-zinc-400', pill: 'bg-zinc-100 text-zinc-500 line-through dark:bg-zinc-800 dark:text-zinc-400' }
};

export function StatusPill({ status, className }: { status: TaskStatus; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_STYLE[status].pill, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_STYLE[status].dot)} />
      {STATUS_LABEL[status]}
    </span>
  );
}

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  LOW: 'text-muted-foreground border-border',
  NORMAL: 'text-muted-foreground border-border',
  HIGH: 'text-orange-700 border-orange-300 dark:text-orange-300 dark:border-orange-800',
  URGENT: 'text-white bg-red-600 border-red-600'
};

/** Hidden for Normal so the board stays calm */
export function PriorityTag({ priority, always = false }: { priority: TaskPriority; always?: boolean }) {
  if (!always && priority === 'NORMAL') return null;
  return (
    <span className={cn('inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide', PRIORITY_STYLE[priority])}>
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

export function DueLabel({ dueAt, status, className }: { dueAt: string | null; status: string; className?: string }) {
  if (!dueAt) return null;
  const late = isOverdue({ dueAt, status });
  const Icon = late ? AlertTriangle : CalendarClock;
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs', late ? 'font-semibold text-destructive' : 'text-muted-foreground', className)}>
      <Icon className="h-3.5 w-3.5" />
      {late ? 'Overdue · ' : ''}
      {formatDue(dueAt)}
    </span>
  );
}

export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return ((parts[0][0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function PersonAvatar({ name, className }: { name: string | null | undefined; className?: string }) {
  return (
    <span
      title={name ?? undefined}
      className={cn('inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary', className)}
    >
      {initials(name)}
    </span>
  );
}
