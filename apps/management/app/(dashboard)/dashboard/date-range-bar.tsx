'use client';

import { useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { CalendarRange, Loader2 } from 'lucide-react';
import { Button, Input } from '@archmage/ui';
import { cn } from '@/lib/utils';

const DAY_MS = 86_400_000;

/** Today in Colombo as YYYY-MM-DD. */
function colomboToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(new Date());
}

function shift(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) + days * DAY_MS).toISOString().slice(0, 10);
}

function presets(today: string) {
  return [
    { key: 'today', label: 'Today', from: today, to: today },
    { key: 'yesterday', label: 'Yesterday', from: shift(today, -1), to: shift(today, -1) },
    { key: '7d', label: '7 days', from: shift(today, -6), to: today },
    { key: '30d', label: '30 days', from: shift(today, -29), to: today },
    { key: 'month', label: 'This month', from: `${today.slice(0, 8)}01`, to: today },
    { key: 'next7', label: 'Next 7 days', from: shift(today, 1), to: shift(today, 7) }
  ];
}

function formatDay(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

/** Range chips (today by default) + custom dates; the range lives in the URL (?from&to). */
export function DateRangeBar({ from, to, previousFrom, previousTo }: { from: string; to: string; previousFrom: string; previousTo: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const today = colomboToday();
  const options = presets(today);
  const active = options.find((p) => p.from === from && p.to === to)?.key ?? 'custom';
  const [showCustom, setShowCustom] = useState(active === 'custom');
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);

  const go = (nextFrom: string, nextTo: string) => {
    const params = new URLSearchParams();
    if (!(nextFrom === today && nextTo === today)) {
      params.set('from', nextFrom);
      params.set('to', nextTo);
    }
    startTransition(() => router.replace(params.size ? `${pathname}?${params}` : pathname, { scroll: false }));
  };

  const label = from === to ? formatDay(from) : `${formatDay(from)} – ${formatDay(to)}`;
  const compare = previousFrom === previousTo ? formatDay(previousFrom) : `${formatDay(previousFrom)} – ${formatDay(previousTo)}`;

  return (
    <div className="flex flex-col gap-2">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {options.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => {
              setShowCustom(false);
              go(p.from, p.to);
            }}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors',
              active === p.key && !showCustom ? 'border-primary bg-primary text-primary-foreground' : 'bg-background'
            )}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowCustom((v) => !v)}
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
            active === 'custom' || showCustom ? 'border-primary bg-primary text-primary-foreground' : 'bg-background'
          )}
        >
          <CalendarRange className="h-4 w-4" />
          Custom
        </button>
      </div>

      {showCustom && (
        <div className="flex flex-wrap items-end gap-2 rounded-2xl border bg-card p-3">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            From
            <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-10" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            To
            <Input type="date" value={customTo} min={customFrom} onChange={(e) => setCustomTo(e.target.value)} className="h-10" />
          </label>
          <Button
            type="button"
            className="h-10"
            disabled={!customFrom || !customTo || customTo < customFrom}
            onClick={() => go(customFrom, customTo)}
          >
            Apply
          </Button>
        </div>
      )}

      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        <span>
          <span className="font-medium text-foreground">{label}</span> · compared with {compare}
        </span>
      </p>
    </div>
  );
}
