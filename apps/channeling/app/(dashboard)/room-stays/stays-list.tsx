'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AlertTriangle, BedDouble, ChevronLeft, ChevronRight, Search, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { StayRow, StayStatus } from '@/types/room-checklist';

export const STAY_STATUS_BADGE: Record<StayStatus, { label: string; className: string }> = {
  occupied: { label: 'In room', className: 'bg-sky-100 text-sky-800 hover:bg-sky-100 dark:bg-sky-900/40 dark:text-sky-300' },
  closed: { label: 'Checked out', className: 'bg-zinc-100 text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300' },
  cancelled: { label: 'Cancelled', className: 'bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300' },
};

export function formatDateTime(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Colombo' });
}

type Filters = { status: string; q: string; issuesOnly: boolean; from: string; to: string };

export function RoomStaysList({
  rows,
  total,
  page,
  pageSize,
  filters,
}: {
  rows: StayRow[];
  total: number;
  page: number;
  pageSize: number;
  filters: Filters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(filters.q);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const go = (patch: Partial<Filters> & { page?: number }) => {
    const next = { ...filters, ...patch };
    const sp = new URLSearchParams();
    if (next.status !== 'all') sp.set('status', next.status);
    if (next.q.trim()) sp.set('q', next.q.trim());
    if (next.issuesOnly) sp.set('issues', '1');
    if (next.from) sp.set('from', next.from);
    if (next.to) sp.set('to', next.to);
    if (patch.page && patch.page > 1) sp.set('page', String(patch.page));
    router.push(`${pathname}${sp.size ? `?${sp}` : ''}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Room Stays</CardTitle>
        <CardDescription>
          Patients checked in and out by GROs on the Management app, with their contacts and checklists.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <form
            className="relative min-w-60 flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              go({ q });
            }}
          >
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="BHT, patient name or room" className="pl-8" />
          </form>
          <Select value={filters.status} onValueChange={(status) => go({ status })}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stays</SelectItem>
              <SelectItem value="occupied">In room</SelectItem>
              <SelectItem value="closed">Checked out</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Input type="date" className="w-40" value={filters.from} onChange={(e) => go({ from: e.target.value })} aria-label="Checked in from" />
            <span className="text-sm text-muted-foreground">to</span>
            <Input type="date" className="w-40" value={filters.to} onChange={(e) => go({ to: e.target.value })} aria-label="Checked in to" />
          </div>
          <div className="flex h-10 items-center gap-2">
            <Switch id="issues-only" checked={filters.issuesOnly} onCheckedChange={(issuesOnly) => go({ issuesOnly })} />
            <Label htmlFor="issues-only">Issues only</Label>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-sm text-muted-foreground">
            <BedDouble className="size-8" />
            No stays match.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Primary contact</TableHead>
                  <TableHead>Checked in</TableHead>
                  <TableHead>Checked out</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => {
                  const primary = s.primaryIsPatient
                    ? { name: 'Patient', phone: s.patientPhone }
                    : s.contacts.find((c) => c.isPrimary);
                  const badge = STAY_STATUS_BADGE[s.status];
                  return (
                    <TableRow key={s.id} className="cursor-pointer" onClick={() => router.push(`/room-stays/${s.id}`)}>
                      <TableCell>
                        <div className="font-medium">Room {s.roomNumber}</div>
                        <div className="text-xs text-muted-foreground">
                          {[s.zoneName, s.departmentName].filter(Boolean).join(' · ')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link href={`/room-stays/${s.id}`} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
                          {s.patientName}
                        </Link>
                        <div className="font-mono text-xs text-muted-foreground">BHT {s.bhtNumber}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {primary ? (
                          <span className="inline-flex items-center gap-1">
                            <Star className="size-3 fill-amber-400 text-amber-400" />
                            {primary.name} <span className="text-muted-foreground">{primary.phone}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDateTime(s.checkedInAt)}
                        {s.checkedInByName && <div className="text-xs text-muted-foreground">{s.checkedInByName}</div>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDateTime(s.checkedOutAt)}
                        {s.checkedOutByName && <div className="text-xs text-muted-foreground">{s.checkedOutByName}</div>}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge className={badge.className}>{badge.label}</Badge>
                          {s.openConcerns > 0 && (
                            <Badge className={cn('gap-1 text-white', s.seriousConcern ? 'bg-red-600 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-500')}>
                              <AlertTriangle className="size-3" /> {s.openConcerns} concern{s.openConcerns === 1 ? '' : 's'}
                            </Badge>
                          )}
                          {s.hasIssues && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="size-3" /> Issues
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {total > pageSize && (
          <div className="flex items-center justify-end gap-2 text-sm">
            <span className="text-muted-foreground">
              Page {page} of {pages} · {total} stays
            </span>
            <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => go({ page: page - 1 })}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="icon" disabled={page >= pages} onClick={() => go({ page: page + 1 })}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
