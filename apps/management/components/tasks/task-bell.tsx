'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Sheet, SheetContent, SheetHeader, SheetTitle } from '@archmage/ui';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatWhen } from '@/lib/tasks/constants';
import { useTaskPerms } from '@/components/tasks/task-perms';
import { listTaskNotificationsAction, markTaskNotificationsReadAction } from '@/app/actions/tasks.actions';
import type { TaskNotificationItem } from '@/types/tasks';

const POLL_MS = 60_000;

/** Task notifications: assigned, status changes, comments, reminders. Stored and pushed by channeling. */
export function TaskBell() {
  const perms = useTaskPerms();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<TaskNotificationItem[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const result = await listTaskNotificationsAction();
    if (result.success) {
      setItems(result.data.items);
      setUnread(result.data.unread);
    }
  }, []);

  useEffect(() => {
    if (!perms.view) return;
    void load();
    const timer = setInterval(() => document.visibilityState === 'visible' && void load(), POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && void load();
    document.addEventListener('visibilitychange', onVisible);
    // A task page marks its notifications read; refresh the badge
    window.addEventListener('tasks:notifications-changed', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('tasks:notifications-changed', onVisible);
    };
  }, [perms.view, load]);

  if (!perms.view) return null;

  const openSheet = async () => {
    setOpen(true);
    setLoading(true);
    await load();
    setLoading(false);
  };

  const markAll = async () => {
    setItems((prev) => prev?.map((n) => ({ ...n, read: true })) ?? prev);
    setUnread(0);
    await markTaskNotificationsReadAction();
  };

  return (
    <>
      <Button type="button" variant="ghost" size="icon" className="relative" aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`} onClick={() => void openSheet()}>
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 pt-safe sm:max-w-md">
          <SheetHeader className="flex-row items-center justify-between gap-2 space-y-0 border-b px-4 py-3 pr-12">
            <SheetTitle className="text-base">Notifications</SheetTitle>
            {unread > 0 && (
              <button type="button" className="text-sm font-medium text-primary" onClick={() => void markAll()}>
                Mark all read
              </button>
            )}
          </SheetHeader>
          <div className="flex-1 overflow-y-auto pb-safe">
            {loading && !items ? (
              <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
              </div>
            ) : !items?.length ? (
              <div className="flex flex-col items-center gap-2 py-16 text-sm text-muted-foreground">
                <BellOff className="h-8 w-8" />
                No notifications yet.
              </div>
            ) : (
              <ul className="divide-y">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={cn('flex w-full gap-3 px-4 py-3 text-left active:bg-muted', !n.read && 'bg-primary/5')}
                      onClick={() => {
                        setOpen(false);
                        if (n.taskId) router.push(`/tasks/${n.taskId}`);
                      }}
                    >
                      <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-primary')} />
                      <span className="min-w-0 flex-1">
                        <span className={cn('block text-sm', !n.read && 'font-semibold')}>{n.title}</span>
                        {n.message && <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">{n.message}</span>}
                        <span className="mt-1 block text-xs text-muted-foreground">{formatWhen(n.createdAt)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
