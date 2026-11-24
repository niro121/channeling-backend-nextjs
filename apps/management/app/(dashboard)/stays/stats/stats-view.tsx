'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { useInnerPageHeader } from '../../page-header-context';
import { Button } from '@archmage/ui';
import { cn } from '@/lib/utils';
import { getStayStatsAction } from '@/app/actions/room-stays.actions';
import type { StayStats } from '@/types/room-stays';

type Days = 1 | 7 | 30;
const PERIODS: { days: Days; label: string }[] = [
  { days: 1, label: 'Today' },
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' }
];

/** Room statistics for one branch: a full page opened from the chart icon on Stays. */
export function StatsView({ locationId, branchName }: { locationId: string | null; branchName: string | null }) {
  const [reload, setReload] = useState(0);
  useInnerPageHeader({ title: 'Room statistics', subtitle: branchName ?? 'This branch' });
  const [days, setDays] = useState<Days>(1);
  const [stats, setStats] = useState<StayStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let live = true;
    setLoading(true);
    void getStayStatsAction({ locationId, days }).then((res) => {
      if (!live) return;
      if (res.success) {
        setStats(res.data);
        setError(null);
      } else setError(res.message);
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, [locationId, days, reload]);

  const periodWord = days === 1 ? 'today' : `last ${days} days`;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <div className="space-y-5">
          {error && !stats && (
            <div className="space-y-3 rounded-2xl border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" onClick={() => setReload((n) => n + 1)}>
                <RefreshCw className="h-4 w-4" /> Try again
              </Button>
            </div>
          )}
          {!stats && !error && (
            <div className="flex justify-center py-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}

          {stats && (
            <>
              {/* ==== NOW ==== */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Right now</h3>
                <div className="rounded-2xl border p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-3xl font-semibold tabular-nums leading-tight">
                      {stats.now.inRoom}
                      <span className="ml-1 text-base font-normal text-muted-foreground">/ {stats.now.total} rooms in use</span>
                    </p>
                    <p className="text-sm font-medium tabular-nums">{stats.now.occupancyPct}%</p>
                  </div>
                  <Bar pct={stats.now.occupancyPct} label={`${stats.now.occupancyPct}% of rooms in use`} />
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <span>{stats.now.free} free</span>
                    {stats.now.openIssues > 0 && (
                      <span className="flex items-center gap-1 text-destructive">
                        <AlertTriangle className="h-3 w-3" /> {stats.now.openIssues} with open issues
                      </span>
                    )}
                  </div>
                </div>
              </section>

              {/* ==== PERIOD ==== */}
              <section className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="flex-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Activity</h3>
                  {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                </div>
                <div className="flex rounded-xl bg-muted p-1 text-sm">
                  {PERIODS.map((p) => (
                    <button
                      key={p.days}
                      type="button"
                      onClick={() => setDays(p.days)}
                      className={cn('flex-1 rounded-lg px-3 py-1.5 font-medium transition-colors', days === p.days ? 'bg-background shadow-sm' : 'text-muted-foreground')}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className={cn('grid grid-cols-2 gap-2 transition-opacity', loading && 'opacity-60')}>
                  <Tile label="Check-ins" value={stats.period.checkIns} />
                  <Tile label="Check-outs" value={stats.period.checkOuts} />
                  <Tile
                    label="Average stay"
                    value={stats.period.avgStayDays === null ? '—' : `${stats.period.avgStayDays} d`}
                    hint={stats.period.avgStayDays === null ? `No check-outs ${periodWord}` : `Patients who left ${periodWord}`}
                  />
                  <Tile
                    label="Checklists with issues"
                    value={`${stats.period.checklistsWithIssues} / ${stats.period.checklists}`}
                    hint={stats.period.overrides ? `${stats.period.overrides} finished with an override` : undefined}
                  />
                </div>
              </section>

              {/* ==== TOP ISSUES ==== */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Most common issues, {periodWord}</h3>
                {stats.topIssues.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No issues recorded.</p>
                ) : (
                  <ul className="divide-y rounded-2xl border">
                    {stats.topIssues.map((i) => (
                      <li key={i.label} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                        <span className="truncate">{i.label}</span>
                        <span className="shrink-0 font-semibold tabular-nums">{i.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* ==== BY ZONE ==== */}
              {stats.byZone.length > 1 && (
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Occupancy by zone</h3>
                  <ul className="space-y-2.5 rounded-2xl border p-3">
                    {stats.byZone.map((z) => {
                      const pct = z.total ? Math.round((z.inRoom / z.total) * 100) : 0;
                      return (
                        <li key={z.name} className="space-y-1">
                          <div className="flex justify-between gap-3 text-sm">
                            <span className="truncate">{z.name}</span>
                            <span className="shrink-0 tabular-nums text-muted-foreground">
                              <span className="font-medium text-foreground">{z.inRoom}</span> / {z.total}
                            </span>
                          </div>
                          <Bar pct={pct} label={`${z.name}: ${z.inRoom} of ${z.total} rooms in use`} />
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {/* ==== LONGEST STAYS ==== */}
              {stats.longestStays.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Longest current stays</h3>
                  <ul className="divide-y overflow-hidden rounded-2xl border">
                    {stats.longestStays.map((s) => (
                      <li key={s.stayId}>
                        <Link href={`/stays/${s.stayId}`} className="flex items-center gap-3 px-3 py-2.5 active:bg-muted/60">
                          <span className="w-10 shrink-0 text-sm font-semibold">{s.roomNumber}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{s.patientName}</span>
                            <span className="block text-xs text-muted-foreground">BHT {s.bhtNumber}</span>
                          </span>
                          <span className="shrink-0 text-sm tabular-nums">{s.days === 0 ? 'today' : `${s.days} d`}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
      </div>
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-2xl border p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold tabular-nums leading-tight">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Bar({ pct, label }: { pct: number; label: string }) {
  return (
    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={label}>
      <div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}
