'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AlertTriangle, BarChart3, BedDouble, ChevronRight, DoorOpen, Loader2, RefreshCw, Search, X } from 'lucide-react';
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@archmage/ui';
import { cn } from '@/lib/utils';
import { HeaderActions } from '../header-actions';
import { getStayRoomsAction } from '@/app/actions/room-stays.actions';
import type { StayRoomRow, StayRoomsData } from '@/types/room-stays';

type Filter = 'all' | 'vacant' | 'occupied' | 'issues';

export function sinceLabel(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  return days === 1 ? '1 day' : `${days} days`;
}

export function StaysContent({ initialLocationId }: { initialLocationId: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [data, setData] = useState<StayRoomsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationId, setLocationId] = useState<string | null>(initialLocationId);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async (loc: string | null, quiet = false) => {
    if (!quiet) setLoading(true);
    const res = await getStayRoomsAction(loc);
    if (res.success) {
      setData(res.data);
      setError(null);
      if (res.data.locationId !== loc) setLocationId(res.data.locationId);
    } else {
      setError(res.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(locationId);
  }, [load, locationId]);

  const rooms = useMemo(() => data?.rooms ?? [], [data]);
  const openIssues = useMemo(() => rooms.filter((r) => r.stay?.hasIssues).length, [rooms]);
  const counts = useMemo(
    () => ({ occupied: rooms.filter((r) => r.stay).length, vacant: rooms.filter((r) => !r.stay).length }),
    [rooms]
  );

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const visible = rooms.filter((r) => {
      if (filter === 'vacant' && r.stay) return false;
      if (filter === 'occupied' && !r.stay) return false;
      if (filter === 'issues' && !r.stay?.hasIssues) return false;
      if (!q) return true;
      return (
        r.number.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        Boolean(r.stay && (r.stay.patientName.toLowerCase().includes(q) || r.stay.bhtNumber.toLowerCase().includes(q)))
      );
    });
    const map = new Map<string, { name: string; rooms: StayRoomRow[] }>();
    for (const r of visible) {
      const key = r.zoneId ?? 'none';
      if (!map.has(key)) map.set(key, { name: r.zoneName ?? 'No zone', rooms: [] });
      map.get(key)!.rooms.push(r);
    }
    return [...map.entries()]
      .sort(([a, x], [b, y]) => (a === 'none' ? 1 : b === 'none' ? -1 : x.name.localeCompare(y.name)))
      .map(([id, g]) => ({ id, ...g }));
  }, [rooms, filter, search]);

  if (loading && !data) {
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (error && !data) {
    return (
      <div className="space-y-3 rounded-2xl border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={() => load(locationId)}>
          <RefreshCw className="h-4 w-4" /> Try again
        </Button>
      </div>
    );
  }
  if (!data) return null;

  const openRoom = (r: StayRoomRow) => {
    if (r.stay) router.push(`/stays/${r.stay.id}`);
    else if (data.can.checkIn) router.push(`/stays/check-in?roomId=${r.id}`);
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <HeaderActions>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/stays/stats${locationId ? `?locationId=${locationId}` : ''}`)}
          aria-label="Room statistics"
        >
          <BarChart3 className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => load(locationId, true)} aria-label="Refresh">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
        </Button>
      </HeaderActions>

      {openIssues > 0 && (
        <button
          type="button"
          onClick={() => setFilter(filter === 'issues' ? 'all' : 'issues')}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left text-sm',
            filter === 'issues' ? 'border-destructive bg-destructive/10' : 'border-destructive/30 bg-destructive/5'
          )}
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
          <span className="flex-1">
            <span className="font-semibold">{openIssues}</span> patient{openIssues === 1 ? '' : 's'} in a room with
            open issues
          </span>
          {filter === 'issues' ? (
            <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <X className="h-3.5 w-3.5" /> Show all
            </span>
          ) : (
            <span className="text-xs font-medium text-destructive">View</span>
          )}
        </button>
      )}

      <div className="space-y-2">
        {data.locations.length > 1 && (
          <Select
            value={locationId ?? undefined}
            onValueChange={(id) => {
              setLocationId(id);
              router.replace(`${pathname}?locationId=${id}`, { scroll: false });
            }}
          >
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent>
              {data.locations.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-10 rounded-xl pl-9" placeholder="Room, patient or BHT" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex rounded-xl bg-muted p-1 text-sm">
          {(
            [
              ['all', `All ${rooms.length}`],
              ['vacant', `Free ${counts.vacant}`],
              ['occupied', `In use ${counts.occupied}`]
            ] as const
          ).map(([f, label]) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'flex-1 rounded-lg px-3 py-1.5 font-medium transition-colors',
                filter === f || (filter === 'issues' && f === 'occupied') ? 'bg-background shadow-sm' : 'text-muted-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed py-12 text-sm text-muted-foreground">
          <DoorOpen className="h-8 w-8" /> No rooms match.
        </div>
      )}

      {groups.map((g) => (
        <section key={g.id} className="space-y-2">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.name}</h2>
          <div className="divide-y overflow-hidden rounded-2xl border bg-card">
            {g.rooms.map((r) => {
              const clickable = Boolean(r.stay) || data.can.checkIn;
              return (
                <button
                  key={r.id}
                  type="button"
                  disabled={!clickable}
                  onClick={() => openRoom(r)}
                  className="flex w-full items-center gap-3 px-3 py-3 text-left active:bg-muted/60 disabled:opacity-100"
                >
                  <span
                    className={cn(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold',
                      r.stay ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                    )}
                  >
                    {r.number}
                  </span>
                  <span className="min-w-0 flex-1">
                    {r.stay ? (
                      <>
                        <span className="flex items-center gap-1.5 font-medium">
                          <span className="truncate">{r.stay.patientName}</span>
                          {r.stay.hasIssues && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" />}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          BHT {r.stay.bhtNumber} · in {sinceLabel(r.stay.checkedInAt)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="block font-medium text-emerald-700 dark:text-emerald-400">Free</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {[r.departmentName, r.description].filter(Boolean).join(' · ') || `Room ${r.number}`}
                        </span>
                      </>
                    )}
                  </span>
                  {r.stay ? (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  ) : data.can.checkIn ? (
                    <span className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                      <BedDouble className="h-3.5 w-3.5" /> Check in
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <p className="pb-4 text-center text-xs text-muted-foreground">Past stays and their checklists are in channeling under Room Stays.</p>
    </div>
  );
}

