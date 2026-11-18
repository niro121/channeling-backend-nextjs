'use client';

import React, { useState } from 'react';
import { ScanSearch, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { OverlapPairVisual } from '@/components/overlap-pair-visual';
import { scanDoctorSessionOverlaps } from '@/app/actions/doctor.sessions.action';
import type { DoctorSessionOverlapScan } from '@/types/session-overlaps';

export function DoctorSessionOverlapScanDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scan, setScan] = useState<DoctorSessionOverlapScan | null>(null);

  const runScan = async () => {
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const result = await scanDoctorSessionOverlaps();
      if (!result.success || !result.data) {
        setScan(null);
        setError(result.message || 'Scan failed.');
        return;
      }
      setScan(result.data);
    } catch (err: unknown) {
      setScan(null);
      setError(err instanceof Error ? err.message : 'Scan failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" type="button" onClick={runScan}>
        <ScanSearch className="mr-1.5 h-4 w-4" />
        Scan overlaps
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="space-y-1 border-b border-border px-6 py-4 pr-12">
            <DialogTitle>Overlapping doctor sessions</DialogTitle>
            <DialogDescription>
              Same doctor at the same branch. A session that starts when another ends is not listed.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm">Scanning doctor sessions…</p>
              </div>
            ) : error ? (
              <p className="py-10 text-center text-sm text-destructive">{error}</p>
            ) : scan && scan.pairCount === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm font-medium">No overlapping sessions</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Checked {scan.sessionsScanned} sessions across {scan.doctorsScanned} doctors.
                </p>
              </div>
            ) : scan ? (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  {scan.pairCount} overlap{scan.pairCount === 1 ? '' : 's'} across{' '}
                  {new Set(scan.groups.map((group) => group.doctorId)).size} doctor
                  {new Set(scan.groups.map((group) => group.doctorId)).size === 1 ? '' : 's'}.
                  Checked {scan.sessionsScanned} sessions.
                </p>
                {scan.groups.map((group) => (
                  <section key={`${group.doctorId}-${group.locationId}`} className="space-y-2">
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
                          key={`${pair.left.id}-${pair.right.id}-${pair.dayLabel}`}
                          dayLabel={pair.dayLabel}
                          left={pair.left}
                          right={pair.right}
                          leftHref={`/doctor-sessions/${pair.left.id}/edit`}
                          rightHref={`/doctor-sessions/${pair.right.id}/edit`}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
