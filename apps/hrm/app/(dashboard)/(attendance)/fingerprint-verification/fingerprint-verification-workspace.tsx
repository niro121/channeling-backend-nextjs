'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Eraser,
  RefreshCw,
  Save,
  Wand2
} from 'lucide-react';
import { Button, useToast } from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { usePermissions } from '@/components/hooks/use-permissions';
import { saveFingerprintVerificationAction } from '@/app/actions/attendance-actions/fingerprint-verification.actions';
import type {
  FingerprintVerificationFilterOptions,
  FingerprintVerificationMode,
  FingerprintVerificationRow,
  FingerprintVerificationSummary
} from '@/types/attendance';
import SectionFingerprintFilters from './section-fingerprint-filters';
import SectionFingerprintLinks from './section-fingerprint-links';
import SectionFingerprintRegister from './section-fingerprint-register';
import SectionFingerprintSummary from './section-fingerprint-summary';

type FingerprintVerificationWorkspaceProps = {
  mode: FingerprintVerificationMode;
  fromDate: string;
  toDate: string;
  summary: FingerprintVerificationSummary;
  rows: FingerprintVerificationRow[];
  filterOptions: FingerprintVerificationFilterOptions;
  initialFilters: {
    mode?: string;
    fromDate?: string;
    toDate?: string;
    shiftRosterId?: string;
    staffId?: string;
  };
  onExport: () => Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>;
};

function parseDisplayTime(value: string | null | undefined): {
  hours: number;
  minutes: number;
} | null {
  if (!value?.trim()) return null;
  const raw = value.trim();
  const ampm = /^(.*?)\s*(AM|PM)$/i.exec(raw);
  const timePart = (ampm?.[1] ?? raw).trim();
  const meridiem = (ampm?.[2] ?? '').toUpperCase();
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(timePart);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes) || minutes > 59) return null;
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  if (!meridiem && (hours < 0 || hours > 23)) return null;
  return { hours, minutes };
}

function parseHhMm(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (Number.isNaN(h) || Number.isNaN(m) || h > 23 || m > 59) return null;
  return h * 60 + m;
}

function recomputeRowStatus(
  row: FingerprintVerificationRow
): Pick<FingerprintVerificationRow, 'status' | 'statusLabel' | 'exceptionCode'> {
  const hasStart = Boolean(row.verifiedStart.trim());
  const hasEnd = Boolean(row.verifiedEnd.trim());
  if (!hasStart || !hasEnd) {
    return { status: 'missing', statusLabel: 'Missing', exceptionCode: '' };
  }

  const startParts = parseDisplayTime(row.verifiedStart);
  if (startParts && row.shiftStartTime) {
    const startMins = parseHhMm(row.shiftStartTime);
    if (startMins != null) {
      const arrival = startParts.hours * 60 + startParts.minutes;
      if (arrival > startMins + Math.max(0, row.graceMinutes || 0)) {
        return { status: 'late', statusLabel: 'Late', exceptionCode: 'L' };
      }
    }
  }

  const endParts = parseDisplayTime(row.verifiedEnd);
  if (endParts && row.shiftEndTime) {
    const endMins = parseHhMm(row.shiftEndTime);
    if (endMins != null) {
      const departure = endParts.hours * 60 + endParts.minutes;
      const threshold = Math.max(0, row.earlyExitThresholdMinutes || 0);
      if (departure < endMins - threshold) {
        return {
          status: 'early_out',
          statusLabel: 'Early Out',
          exceptionCode: 'E'
        };
      }
    }
  }

  return { status: 'ok', statusLabel: 'OK', exceptionCode: '' };
}

function summarize(rows: FingerprintVerificationRow[]): FingerprintVerificationSummary {
  return {
    verified: rows.filter((r) => r.status === 'ok').length,
    late: rows.filter((r) => r.status === 'late').length,
    missingPunch: rows.filter((r) => r.status === 'missing').length,
    earlyOut: rows.filter((r) => r.status === 'early_out').length
  };
}

export default function FingerprintVerificationWorkspace({
  mode,
  fromDate,
  toDate,
  summary: initialSummary,
  rows: initialRows,
  filterOptions,
  initialFilters,
  onExport
}: FingerprintVerificationWorkspaceProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { has } = usePermissions();
  const canEdit = has('attendance', 'edit');

  const [rows, setRows] = useState(initialRows);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setRows(initialRows);
    setDirty(false);
  }, [initialRows]);

  const summary = useMemo(
    () => (dirty ? summarize(rows) : initialSummary),
    [dirty, rows, initialSummary]
  );

  const patchRow = useCallback(
    (
      rowKey: string,
      patch: Partial<
        Pick<
          FingerprintVerificationRow,
          'verifiedStart' | 'verifiedEnd' | 'status' | 'statusLabel' | 'exceptionCode'
        >
      >
    ) => {
      setRows((prev) =>
        prev.map((row) => {
          if (row.rowKey !== rowKey) return row;
          const next = { ...row, ...patch };
          return { ...next, ...recomputeRowStatus(next) };
        })
      );
      setDirty(true);
    },
    []
  );

  const onVerifiedChange = useCallback(
    (
      rowKey: string,
      field: 'verifiedStart' | 'verifiedEnd',
      value: string
    ) => {
      patchRow(rowKey, { [field]: value });
    },
    [patchRow]
  );

  const onClearRow = useCallback(
    (rowKey: string) => {
      patchRow(rowKey, { verifiedStart: '', verifiedEnd: '' });
    },
    [patchRow]
  );

  const handleFill = (modeFill: 'all' | 'additional') => {
    setRows((prev) =>
      prev.map((row) => {
        let verifiedStart = row.verifiedStart;
        let verifiedEnd = row.verifiedEnd;
        if (modeFill === 'all') {
          if (row.attStart) verifiedStart = row.attStart;
          if (row.attEnd) verifiedEnd = row.attEnd;
        } else {
          if (!verifiedStart && row.attStart) verifiedStart = row.attStart;
          if (!verifiedEnd && row.attEnd) verifiedEnd = row.attEnd;
        }
        const next = { ...row, verifiedStart, verifiedEnd };
        return { ...next, ...recomputeRowStatus(next) };
      })
    );
    setDirty(true);
  };

  const handleClearAll = () => {
    setRows((prev) =>
      prev.map((row) => {
        const next = { ...row, verifiedStart: '', verifiedEnd: '' };
        return { ...next, ...recomputeRowStatus(next) };
      })
    );
    setDirty(true);
  };

  const handleResetAndFill = () => {
    setRows((prev) =>
      prev.map((row) => {
        const next = {
          ...row,
          verifiedStart: row.attStart || '',
          verifiedEnd: row.attEnd || ''
        };
        return { ...next, ...recomputeRowStatus(next) };
      })
    );
    setDirty(true);
  };

  const handleSave = async () => {
    if (!canEdit) return;
    setSaving(true);
    const result = await saveFingerprintVerificationAction(
      rows.map((row) => ({
        rowKey: row.rowKey,
        attendanceDayId: row.attendanceDayId,
        rosterAllocationId: row.rosterAllocationId,
        staffId: row.staffId,
        date: row.date,
        verifiedStart: row.verifiedStart,
        verifiedEnd: row.verifiedEnd,
        clearVerified: !row.verifiedStart && !row.verifiedEnd
      }))
    );
    setSaving(false);
    if (result.isError) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description:
          (result.errors as { message?: string })?.message ??
          'Could not save verified times.'
      });
      return;
    }
    toast({
      variant: 'success',
      title: 'Verification saved',
      description: `${result.data?.count ?? rows.length} row(s) updated.`
    });
    setDirty(false);
    router.refresh();
  };

  const rangeLabel =
    fromDate === toDate ? fromDate : `${fromDate} → ${toDate}`;

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Fingerprint Verification"
        description={`Reconcile device punches against the roster for ${rangeLabel}.`}
        actions={
          <>
            <Button type="button" variant="outline" size="sm" className="h-9" asChild>
              <Link href="/duty-roster">Roster Table</Link>
            </Button>
            {canEdit ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5"
                  disabled={!rows.length}
                  onClick={() => handleFill('all')}
                >
                  <Wand2 className="h-4 w-4" />
                  Fill
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5"
                  disabled={!rows.length}
                  onClick={() => handleFill('additional')}
                >
                  Fill Additional Only
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5"
                  disabled={!rows.length}
                  onClick={handleResetAndFill}
                >
                  <RefreshCw className="h-4 w-4" />
                  Reset and Fill
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5"
                  disabled={!rows.length}
                  onClick={handleClearAll}
                >
                  <Eraser className="h-4 w-4" />
                  Clear
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-9 gap-1.5"
                  disabled={saving || !rows.length}
                  onClick={() => {
                    void handleSave();
                  }}
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </>
            ) : null}
          </>
        }
      />

      <SectionFingerprintSummary summary={summary} />

      <SectionFingerprintFilters
        mode={mode}
        filterOptions={filterOptions}
        initial={initialFilters}
      />

      <SectionFingerprintLinks />

      <SectionFingerprintRegister
        rows={rows}
        canEdit={canEdit}
        onVerifiedChange={onVerifiedChange}
        onClearRow={onClearRow}
        onExport={onExport}
      />
    </div>
  );
}
