'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronRight, Eye, Inbox, Menu, Plus, Repeat, UserPen, Users, type LucideIcon } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@archmage/ui';
import { cn } from '@/lib/utils';
import { myTaskCountsAction } from '@/app/actions/tasks.actions';
import { MORE_ITEMS, isNavActive } from './nav-items';
import { useFeatures } from './features-context';

type Counts = { open: number; overdue: number };

/** ☰ button (phones / iPad portrait): other sections and Task Manager shortcuts. */
export function MoreMenu() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const features = useFeatures();
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Counts | null>(null);
  const tasks = features.tasks;
  const items = MORE_ITEMS.filter((i) => i.visible(features));

  useEffect(() => {
    if (!open || !tasks.view) return;
    void myTaskCountsAction().then((r) => r.success && setCounts(r.data));
  }, [open, tasks.view]);

  const onTasks = pathname === '/tasks';
  const scope = searchParams.get('scope') ?? 'mine';
  const taskLinks = [
    { href: '/tasks?scope=mine', label: 'My tasks', icon: Inbox, active: onTasks && scope === 'mine', badge: counts?.open, alert: counts?.overdue, show: true },
    { href: '/tasks?scope=created', label: 'Created by me', icon: UserPen, active: onTasks && scope === 'created', show: tasks.create },
    { href: '/tasks?scope=watching', label: 'Watching', icon: Eye, active: onTasks && scope === 'watching', show: true },
    { href: '/tasks?scope=all', label: 'Everyone’s tasks', icon: Users, active: onTasks && scope === 'all', show: tasks.manageAll },
    { href: '/tasks/recurring', label: 'Recurring tasks', icon: Repeat, active: pathname === '/tasks/recurring', show: tasks.recurring || tasks.manageAll }
  ].filter((l) => l.show);

  if (items.length === 0 && !tasks.view) return null;
  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted lg:hidden"
        aria-label="Menu"
      >
        <Menu className="h-6 w-6" />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="flex w-72 flex-col gap-0 p-0 pt-safe pb-safe"
          // Don't land focus (and its ring) on the close button when the drawer opens.
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <SheetHeader className="px-5 pb-2 pt-5 text-left">
            <SheetTitle className="text-lg">Menu</SheetTitle>
            <SheetDescription className="sr-only">Other sections of the app</SheetDescription>
          </SheetHeader>

          <nav className="flex-1 overflow-y-auto px-3 py-2">
            <ul className="space-y-0.5">
              {items.map(({ href, label, icon }) => (
                <MenuRow key={href} href={href} label={label} icon={icon} active={isNavActive(pathname, href)} onNavigate={close} />
              ))}
            </ul>

            {tasks.view && (
              <>
                <GroupLabel>Tasks</GroupLabel>
                {tasks.create && (
                  <Link
                    href="/tasks?new=1"
                    onClick={close}
                    className="mb-1.5 flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-[15px] font-medium text-primary-foreground active:opacity-90"
                  >
                    <Plus className="h-5 w-5" /> New task
                  </Link>
                )}
                <ul className="space-y-0.5">
                  {taskLinks.map((l) => (
                    <MenuRow key={l.href} {...l} onNavigate={close} />
                  ))}
                </ul>
              </>
            )}

          </nav>

          <p className="border-t px-5 py-3 text-xs text-muted-foreground">
            {process.env.NEXT_PUBLIC_APP_NAME ?? 'Ruhunu Management'} · v{process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0'}
          </p>
        </SheetContent>
      </Sheet>
    </>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <p className="px-3 pb-1.5 pt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</p>;
}

function MenuRow({
  href,
  label,
  icon: Icon,
  active,
  badge,
  alert,
  onNavigate
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  badge?: number;
  alert?: number;
  onNavigate: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors',
          active ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted active:bg-muted'
        )}
      >
        <Icon className={cn('h-5 w-5 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} aria-hidden />
        <span className="flex-1 truncate">{label}</span>
        {!!alert && (
          <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold text-destructive-foreground">{alert} late</span>
        )}
        {!!badge && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums">{badge}</span>}
        {!alert && !badge && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />}
      </Link>
    </li>
  );
}
