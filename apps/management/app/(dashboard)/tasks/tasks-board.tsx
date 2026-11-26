'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button, Input } from '@archmage/ui';
import { ClipboardList, Loader2, MessageSquare, Plus, RefreshCw, Repeat, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BOARD_STATUSES,
  OPEN_STATUSES,
  STATUS_LABEL,
  isOverdue,
  type TaskStatus
} from '@/lib/tasks/constants';
import { listTasksAction } from '@/app/actions/tasks.actions';
import { useTaskPerms } from '@/components/tasks/task-perms';
import { TaskFormSheet } from '@/components/tasks/task-form-sheet';
import { StatusMenu, useStatusChange } from '@/components/tasks/status-change';
import { DueLabel, PersonAvatar, PriorityTag, STATUS_STYLE } from '@/components/tasks/task-ui';
import { HeaderActions } from '../header-actions';
import type { TaskListItem, TaskListScope } from '@/types/tasks';

const PRIORITY_RANK = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 } as const;

function sortTasks(rows: TaskListItem[]): TaskListItem[] {
  return rows.slice().sort((a, b) => {
    const closedA = a.status === 'DONE' || a.status === 'CANCELLED';
    const closedB = b.status === 'DONE' || b.status === 'CANCELLED';
    if (closedA !== closedB) return closedA ? 1 : -1;
    if (closedA) return b.updatedAt.localeCompare(a.updatedAt);
    const lateA = isOverdue(a) ? 0 : 1;
    const lateB = isOverdue(b) ? 0 : 1;
    if (lateA !== lateB) return lateA - lateB;
    const pa = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (a.dueAt && b.dueAt && a.dueAt !== b.dueAt) return a.dueAt.localeCompare(b.dueAt);
    if (!!a.dueAt !== !!b.dueAt) return a.dueAt ? -1 : 1;
    if (pa) return pa;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

type MobileFilter = 'open' | TaskStatus;

export function TasksBoard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const perms = useTaskPerms();
  const { data: session } = useSession();
  const me = session?.user?.id ?? '';

  const scopes = useMemo(
    () =>
      [
        { value: 'mine', label: 'My tasks', show: true },
        { value: 'created', label: 'Created', show: perms.create },
        { value: 'watching', label: 'Watching', show: true },
        { value: 'all', label: 'Everyone', show: perms.manageAll }
      ].filter((s) => s.show) as { value: TaskListScope; label: string }[],
    [perms]
  );
  const scopeParam = searchParams.get('scope') as TaskListScope | null;
  const scope: TaskListScope = scopes.some((s) => s.value === scopeParam) ? scopeParam! : 'mine';

  const [rows, setRows] = useState<TaskListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<MobileFilter>('open');
  const [formOpen, setFormOpen] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null);

  const load = useCallback(async (nextScope: TaskListScope, search: string) => {
    setLoading(true);
    setError(null);
    const result = await listTasksAction({ scope: nextScope, q: search || undefined });
    if (result.success) setRows(result.data);
    else {
      setRows([]);
      setError(result.message);
    }
    setLoading(false);
  }, []);

  // Load on scope change; search is debounced while typing
  useEffect(() => {
    const t = setTimeout(() => void load(scope, q), q ? 350 : 0);
    return () => clearTimeout(t);
  }, [scope, q, load]);

  // ?new=1 (menu "New task") opens the form
  useEffect(() => {
    if (searchParams.get('new') === '1' && perms.create) {
      setFormOpen(true);
      const params = new URLSearchParams(searchParams);
      params.delete('new');
      router.replace(`${pathname}${params.size ? `?${params}` : ''}`, { scroll: false });
    }
  }, [searchParams, perms.create, pathname, router]);

  const status = useStatusChange((taskId, next) =>
    setRows((prev) => prev.map((r) => (r.id === taskId ? { ...r, status: next, updatedAt: new Date().toISOString() } : r)))
  );

  const canMove = (t: TaskListItem) => perms.manageAll || t.createdBy.id === me || t.assignee?.id === me;
  const canCancel = (t: TaskListItem) => perms.manageAll || t.createdBy.id === me;

  const sorted = useMemo(() => sortTasks(rows), [rows]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { open: 0 };
    for (const r of rows) {
      c[r.status] = (c[r.status] ?? 0) + 1;
      if ((OPEN_STATUSES as string[]).includes(r.status)) c.open++;
    }
    return c;
  }, [rows]);
  const overdueCount = rows.filter((r) => isOverdue(r)).length;
  const mobileRows = sorted.filter((r) => (filter === 'open' ? (OPEN_STATUSES as string[]).includes(r.status) : r.status === filter));

  const setScope = (next: TaskListScope) => {
    const params = new URLSearchParams(searchParams);
    params.set('scope', next);
    router.replace(`${pathname}?${params}`, { scroll: false });
  };

  const emptyText =
    scope === 'mine' ? 'Nothing assigned to you.' : scope === 'created' ? 'You haven’t created any tasks yet.' : scope === 'watching' ? 'You’re not watching any tasks.' : 'No tasks yet.';

  const card = (t: TaskListItem, compact = false) => (
    <div
      key={t.id}
      draggable={canMove(t)}
      onDragStart={(e) => {
        setDragging(t.id);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', t.id);
      }}
      onDragEnd={() => {
        setDragging(null);
        setDropTarget(null);
      }}
      className={cn(
        'group relative rounded-2xl border bg-card transition-shadow hover:shadow-sm',
        dragging === t.id && 'opacity-50',
        isOverdue(t) && 'border-destructive/40'
      )}
    >
      <Link href={`/tasks/${t.id}`} className="block p-3.5 pr-12 active:bg-muted/50">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">T-{t.number}</span>
          {t.recurring && <Repeat className="h-3.5 w-3.5" aria-label="Recurring" />}
          <PriorityTag priority={t.priority} />
        </div>
        <p className={cn('mt-1 line-clamp-2 font-medium leading-snug', t.status === 'CANCELLED' && 'line-through opacity-60')}>{t.title}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <DueLabel dueAt={t.dueAt} status={t.status} />
          {t.commentCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5" />
              {t.commentCount}
            </span>
          )}
        </div>
        <div className="mt-2.5 flex items-center gap-2 text-xs text-muted-foreground">
          <PersonAvatar name={t.assignee?.name} className="h-6 w-6 text-[10px]" />
          <span className="truncate">
            {t.assignee ? (t.assignee.id === me ? 'You' : t.assignee.name) : 'Unassigned'}
            {scope !== 'created' && t.createdBy.id !== me && t.createdBy.id !== t.assignee?.id ? ` · from ${t.createdBy.name}` : ''}
          </span>
          {!compact && <span className="ml-auto lg:hidden">{STATUS_LABEL[t.status]}</span>}
        </div>
      </Link>
      {canMove(t) && (
        <StatusMenu task={t} canCancel={canCancel(t)} onPick={(s) => status.request(t, s)}>
          <button
            type="button"
            aria-label={`Change status (${STATUS_LABEL[t.status]})`}
            className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full active:bg-muted"
          >
            <span className={cn('flex h-5 w-5 items-center justify-center rounded-full border-2', t.status === 'DONE' ? 'border-emerald-500 bg-emerald-500' : 'border-muted-foreground/40')}>
              {t.status === 'DONE' ? <span className="text-[11px] font-bold text-white">✓</span> : <span className={cn('h-2 w-2 rounded-full', STATUS_STYLE[t.status].dot)} />}
            </span>
          </button>
        </StatusMenu>
      )}
    </div>
  );

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <HeaderActions>
        <Button type="button" variant="ghost" size="icon" aria-label="Refresh" disabled={loading} onClick={() => void load(scope, q)}>
          <RefreshCw className={cn('h-5 w-5', loading && 'animate-spin')} />
        </Button>
        {perms.create && (
          <Button type="button" className="hidden lg:inline-flex" onClick={() => setFormOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> New task
          </Button>
        )}
      </HeaderActions>

      {scopes.length > 1 && (
        <div className="grid rounded-xl bg-muted p-1 text-sm font-medium" style={{ gridTemplateColumns: `repeat(${scopes.length}, minmax(0, 1fr))` }} role="tablist">
          {scopes.map((s) => (
            <button
              key={s.value}
              type="button"
              role="tab"
              aria-selected={scope === s.value}
              onClick={() => setScope(s.value)}
              className={cn('truncate rounded-lg px-1 py-2 transition-colors', scope === s.value ? 'bg-background shadow-sm' : 'text-muted-foreground')}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tasks or T-number"
            className="h-11 pl-9 text-base sm:h-10 sm:text-sm"
            type="search"
          />
        </div>
        {perms.recurring || perms.manageAll ? (
          <Button asChild variant="outline" className="h-11 shrink-0 sm:h-10">
            <Link href="/tasks/recurring">
              <Repeat className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Recurring</span>
            </Link>
          </Button>
        ) : null}
      </div>

      {/* Phones / iPad portrait: status chips + one list */}
      <div className="chip-scroller -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0 lg:hidden">
        {(['open', ...BOARD_STATUSES] as MobileFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
              filter === f ? 'border-primary bg-primary text-primary-foreground' : 'bg-background'
            )}
          >
            {f === 'open' ? 'Open' : STATUS_LABEL[f]}
            <span className={cn('tabular-nums', filter === f ? 'opacity-80' : 'text-muted-foreground')}>{counts[f] ?? 0}</span>
          </button>
        ))}
      </div>

      {overdueCount > 0 && !loading && (
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {overdueCount} overdue {overdueCount === 1 ? 'task' : 'tasks'}
        </p>
      )}

      {loading && rows.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">{error}</div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          <ClipboardList className="h-8 w-8" />
          {q ? 'No tasks match your search.' : emptyText}
          {perms.create && !q && (
            <Button type="button" onClick={() => setFormOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> New task
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2 lg:hidden">
            {mobileRows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nothing here.</p>
            ) : (
              mobileRows.map((t) => card(t))
            )}
          </div>

          {/* Desktop / iPad landscape: columns with drag and drop */}
          <div className="hidden gap-3 lg:grid lg:grid-cols-4">
            {BOARD_STATUSES.map((col) => {
              const items = sorted.filter((r) => r.status === col);
              return (
                <section
                  key={col}
                  onDragOver={(e) => {
                    if (!dragging) return;
                    e.preventDefault();
                    setDropTarget(col);
                  }}
                  onDragLeave={() => setDropTarget((d) => (d === col ? null : d))}
                  onDrop={(e) => {
                    e.preventDefault();
                    const t = rows.find((r) => r.id === e.dataTransfer.getData('text/plain'));
                    setDropTarget(null);
                    setDragging(null);
                    if (t && t.status !== col) status.request(t, col);
                  }}
                  className={cn(
                    'flex min-h-[50vh] flex-col gap-2 rounded-2xl bg-muted/50 p-2 transition-colors',
                    dropTarget === col && 'bg-primary/10 ring-2 ring-primary/40'
                  )}
                >
                  <header className="flex items-center gap-2 px-1.5 pb-1 pt-1 text-sm font-semibold">
                    <span className={cn('h-2 w-2 rounded-full', STATUS_STYLE[col].dot)} />
                    {STATUS_LABEL[col]}
                    <span className="font-normal text-muted-foreground">{items.length}</span>
                  </header>
                  {items.map((t) => card(t, true))}
                  {col === 'DONE' && items.length > 0 && <p className="px-2 text-center text-xs text-muted-foreground">Last 14 days</p>}
                </section>
              );
            })}
          </div>
        </>
      )}

      {perms.create && (
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          aria-label="New task"
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 lg:hidden"
        >
          <Plus className="h-7 w-7" />
        </button>
      )}

      <TaskFormSheet open={formOpen} onOpenChange={setFormOpen} onSaved={(id) => router.push(`/tasks/${id}`)} />
      {status.dialog}
    </div>
  );
}
