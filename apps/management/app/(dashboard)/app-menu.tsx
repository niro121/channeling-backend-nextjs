'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@archmage/ui';
import { Eye, Inbox, ListChecks, Menu, Plus, Repeat, UserPen, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTaskPerms } from '@/components/tasks/task-perms';
import { myTaskCountsAction } from '@/app/actions/tasks.actions';
import { isNavActive, visibleNavItems } from './nav-items';

type Counts = { open: number; overdue: number };

function MenuLink({
  href,
  icon: Icon,
  label,
  active,
  badge,
  alert,
  onNavigate
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  badge?: number;
  alert?: number;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors',
        active ? 'bg-primary/10 font-medium text-primary' : 'text-foreground active:bg-muted'
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {!!alert && (
        <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold text-destructive-foreground">{alert} late</span>
      )}
      {!!badge && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums">{badge}</span>}
    </Link>
  );
}

/** Hamburger menu (phones and iPad portrait): every section plus Task Manager shortcuts. */
export function AppMenu() {
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Counts | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const perms = useTaskPerms();
  const { data: session } = useSession();
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open || !perms.view) return;
    void myTaskCountsAction().then((r) => r.success && setCounts(r.data));
  }, [open, perms.view]);

  const onTasks = pathname === '/tasks';
  const scope = searchParams.get('scope') ?? 'mine';
  const taskLinks = [
    { href: '/tasks?scope=mine', label: 'My tasks', icon: Inbox, active: onTasks && scope === 'mine', badge: counts?.open, alert: counts?.overdue, show: true },
    { href: '/tasks?scope=created', label: 'Created by me', icon: UserPen, active: onTasks && scope === 'created', show: perms.create },
    { href: '/tasks?scope=watching', label: 'Watching', icon: Eye, active: onTasks && scope === 'watching', show: true },
    { href: '/tasks?scope=all', label: 'Everyone’s tasks', icon: Users, active: onTasks && scope === 'all', show: perms.manageAll },
    { href: '/tasks/recurring', label: 'Recurring tasks', icon: Repeat, active: pathname === '/tasks/recurring', show: perms.recurring || perms.manageAll }
  ].filter((l) => l.show);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full active:bg-muted lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="flex w-[85vw] max-w-xs flex-col gap-0 p-0 pt-safe">
          <SheetHeader className="border-b px-4 py-4 text-left">
            <div className="flex items-center gap-3">
              <Image src="/icon-192.png" alt="" width={36} height={36} className="h-9 w-9 rounded-lg" />
              <div className="min-w-0">
                <SheetTitle className="truncate text-base">{process.env.NEXT_PUBLIC_BRAND_NAME || 'Ruhunu'} Management</SheetTitle>
                <SheetDescription className="truncate text-xs">{session?.user?.name ?? session?.user?.email ?? ''}</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <nav className="flex-1 overflow-y-auto px-2 py-3 pb-safe" aria-label="Menu">
            {visibleNavItems(perms).map(({ href, label, icon }) => (
              <MenuLink key={href} href={href} icon={icon} label={label} active={isNavActive(pathname, href) && href !== '/tasks'} onNavigate={close} />
            ))}

            {perms.view && (
              <>
                <p className="mt-4 px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Task manager</p>
                {perms.create && (
                  <Link
                    href="/tasks?new=1"
                    onClick={close}
                    className="mx-1 mb-2 flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-[15px] font-medium text-primary-foreground active:opacity-90"
                  >
                    <Plus className="h-5 w-5" />
                    New task
                  </Link>
                )}
                {taskLinks.map((l) => (
                  <MenuLink key={l.href} {...l} onNavigate={close} />
                ))}
                {!perms.create && taskLinks.length === 0 && (
                  <MenuLink href="/tasks" icon={ListChecks} label="Tasks" active={onTasks} onNavigate={close} />
                )}
              </>
            )}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
