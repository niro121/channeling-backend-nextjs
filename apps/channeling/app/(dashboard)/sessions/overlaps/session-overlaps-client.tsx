'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ScanSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OverlapPairVisual } from '@/components/overlap-pair-visual';
import { EditSessionDialog } from '../edit-session-dialog';
import type { SessionListItem } from '../columns';
import type { GeneratedOverlapScan, OverlapSide } from '@/types/session-overlaps';

function toSessionListItem(side: OverlapSide): SessionListItem {
  return {
    id: side.id,
    date: new Date(),
    startTime: side.startTime ? new Date(side.startTime).getTime() : 0,
    endTime: side.endTime ? new Date(side.endTime).getTime() : 0,
    maxPatientNumber: side.maxPatientNumber ?? 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    status: side.status
  };
}

export function SessionOverlapsClient({
  scan,
  error,
  fromDate,
  toDate
}: {
  scan: GeneratedOverlapScan | null;
  error: string | null;
  fromDate: string;
  toDate: string;
}) {
  const router = useRouter();
  const [from, setFrom] = useState(fromDate);
  const [to, setTo] = useState(toDate);
  const [editing, setEditing] = useState<OverlapSide | null>(null);

  const applyRange = (event: React.FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (from) params.set('fromDate', from);
    if (to) params.set('toDate', to);
    router.push(`/sessions/overlaps?${params.toString()}`);
  };

  const doctorCount = scan ? new Set(scan.groups.map((group) => group.doctorId)).size : 0;

  return (
    <Card className="overflow-hidden rounded-lg border border-border shadow-sm">
      <CardHeader className="space-y-3">
        <div>
          <Button variant="ghost" size="sm" className="-ml-2 mb-2 h-8 px-2" asChild>
            <Link href="/sessions">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Sessions
            </Link>
          </Button>
          <CardTitle className="text-lg font-semibold">Overlapping sessions</CardTitle>
          <CardDescription>
            Generated sessions for the same doctor at the same branch whose times overlap.
            A session that starts when another ends is not listed.
          </CardDescription>
        </div>
        <form onSubmit={applyRange} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            From
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            To
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            />
          </label>
          <Button type="submit" size="sm">
            <ScanSearch className="mr-1.5 h-4 w-4" />
            Scan
          </Button>
        </form>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="py-10 text-center text-sm text-destructive">{error}</p>
        ) : scan && scan.pairCount === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-16 text-center">
            <p className="text-sm font-medium">No overlapping sessions in this range</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Checked {scan.sessionsScanned} sessions across {scan.doctorsScanned} doctors.
            </p>
          </div>
        ) : scan ? (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              {scan.pairCount} overlap{scan.pairCount === 1 ? '' : 's'} across {doctorCount} doctor
              {doctorCount === 1 ? '' : 's'}. Checked {scan.sessionsScanned} sessions.
            </p>
            {scan.groups.map((group) => (
              <section key={`${group.doctorId}-${group.locationId}-${group.pairs[0]?.dayLabel}`} className="space-y-2">
                <div>
                  <h3 className="text-sm font-semibold">{group.doctorName}</h3>
                  <p className="text-xs text-muted-foreground">
                    {group.locationName} · {group.pairs.length} overlap
                    {group.pairs.length === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="space-y-2">
                  {group.pairs.map((pair) => (
                    <OverlapPairVisual
                      key={`${pair.left.id}-${pair.right.id}`}
                      dayLabel={pair.dayLabel}
                      left={pair.left}
                      right={pair.right}
                      onEditLeft={() => setEditing(pair.left)}
                      onEditRight={() => setEditing(pair.right)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : null}
      </CardContent>
      <EditSessionDialog
        session={editing ? toSessionListItem(editing) : null}
        open={editing != null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        onSuccess={() => {
          setEditing(null);
          router.refresh();
        }}
      />
    </Card>
  );
}
