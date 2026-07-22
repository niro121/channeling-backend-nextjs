'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Badge,
} from '@archmage/ui';
import type { BillLineItem, BillLineItemHistoryEntry } from '@/types/patient-bill';
import { formatLkr } from '@/lib/patient-bills/calculations';
import { getPatientBillLineItemHistoryAction } from '@/app/actions/patient-bills/patient-bills.actions';
import { cn } from '@/lib/utils';

type LineItemHistoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lineItem: BillLineItem | null;
};

type ChangedField = {
  label: string;
  before: string;
  after: string;
};

function actionMeta(action: BillLineItemHistoryEntry['action']) {
  switch (action) {
    case 'created':
      return {
        label: 'Created',
        icon: <Plus className="h-3.5 w-3.5" />,
        badgeClassName: 'border-transparent bg-emerald-100 text-emerald-800',
        iconClassName: 'bg-emerald-800 text-white',
      };
    case 'deleted':
      return {
        label: 'Deleted',
        icon: <Trash2 className="h-3.5 w-3.5" />,
        badgeClassName: 'border-transparent bg-red-100 text-red-800',
        iconClassName: 'bg-red-600 text-white',
      };
    case 'updated':
    default:
      return {
        label: 'Updated',
        icon: <Pencil className="h-3.5 w-3.5" />,
        badgeClassName: 'border-transparent bg-amber-100 text-amber-900',
        iconClassName: 'bg-amber-500 text-white',
      };
  }
}

function formatAmount(value: number | null | undefined) {
  if (value == null) return '—';
  return formatLkr(value);
}

function getChangedFields(entry: BillLineItemHistoryEntry): ChangedField[] {
  const fields: ChangedField[] = [];

  if (entry.previousDoctorName !== entry.doctorName) {
    fields.push({
      label: 'Doctor',
      before: entry.previousDoctorName?.trim() || '—',
      after: entry.doctorName?.trim() || '—',
    });
  }
  if (entry.previousDescription !== entry.description) {
    fields.push({
      label: 'Description',
      before: entry.previousDescription?.trim() || '—',
      after: entry.description?.trim() || '—',
    });
  }
  if (entry.previousAmount !== entry.amount) {
    fields.push({
      label: 'Amount',
      before: formatAmount(entry.previousAmount),
      after: formatAmount(entry.amount),
    });
  }
  if (entry.previousSortOrder !== entry.sortOrder) {
    fields.push({
      label: 'Order',
      before: String((entry.previousSortOrder ?? 0) + 1),
      after: String((entry.sortOrder ?? 0) + 1),
    });
  }

  return fields;
}

function SnapshotTable({ entry }: { entry: BillLineItemHistoryEntry }) {
  const rows = [
    { label: 'Doctor', value: entry.doctorName?.trim() || '—' },
    { label: 'Description', value: entry.description?.trim() || '—' },
    { label: 'Amount', value: formatAmount(entry.amount) },
  ];

  return (
    <div className="overflow-hidden rounded-md border bg-background">
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b last:border-b-0">
              <th className="w-28 bg-muted/40 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {row.label}
              </th>
              <td className="px-3 py-2 font-medium break-words">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChangeComparisonTable({ fields }: { fields: ChangedField[] }) {
  if (fields.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No field-level changes recorded.</p>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border bg-background">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Field
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Before
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              After
            </th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => (
            <tr key={field.label} className="border-b last:border-b-0 align-top">
              <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                {field.label}
              </td>
              <td className="px-3 py-2 text-muted-foreground break-words">{field.before}</td>
              <td className="px-3 py-2 font-medium text-foreground break-words">
                {field.after}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HistoryEntryCard({
  entry,
  isLast,
}: {
  entry: BillLineItemHistoryEntry;
  isLast: boolean;
}) {
  const when = format(new Date(entry.changedAt), 'dd MMM yyyy HH:mm');
  const who = entry.changedByName?.trim() || 'Unknown user';
  const meta = actionMeta(entry.action);
  const changedFields = entry.action === 'updated' ? getChangedFields(entry) : [];

  return (
    <div className="relative flex gap-3 pb-6 last:pb-0">
      {!isLast && (
        <span
          className="absolute left-4 top-8 bottom-0 w-px -translate-x-1/2 bg-border"
          aria-hidden
        />
      )}
      <div
        className={cn(
          'relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          meta.iconClassName
        )}
      >
        {meta.icon}
      </div>

      <div className="min-w-0 flex-1 space-y-2.5 pt-0.5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn('font-medium', meta.badgeClassName)}>
              {meta.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {when} · by {who}
          </p>
        </div>

        {entry.action === 'updated' ? (
          <ChangeComparisonTable fields={changedFields} />
        ) : (
          <SnapshotTable entry={entry} />
        )}
      </div>
    </div>
  );
}

export function LineItemHistoryDialog({
  open,
  onOpenChange,
  lineItem,
}: LineItemHistoryDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<BillLineItemHistoryEntry[]>([]);

  useEffect(() => {
    if (!open || !lineItem) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setEntries([]);

    getPatientBillLineItemHistoryAction(lineItem.id)
      .then((result) => {
        if (cancelled) return;
        if (!result.success) {
          setError(result.message);
          return;
        }
        // Newest first for easier scanning
        setEntries([...result.data].reverse());
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load history');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, lineItem]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Line item history</DialogTitle>
        </DialogHeader>

        {lineItem ? (
          <div className="rounded-md border bg-muted/20 px-3 py-2.5 text-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Current values
            </p>
            <div className="mt-1 grid gap-1 sm:grid-cols-3">
              <p>
                <span className="text-muted-foreground">Doctor: </span>
                <span className="font-medium">{lineItem.doctorName}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Description: </span>
                <span className="font-medium">{lineItem.description}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Amount: </span>
                <span className="font-medium tabular-nums">{formatLkr(lineItem.amount)}</span>
              </p>
            </div>
          </div>
        ) : null}

        <div className="max-h-[60vh] overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading history…
            </div>
          ) : error ? (
            <p className="text-sm text-destructive py-4">{error}</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No history recorded for this line item yet. History starts from creates and
              updates after this feature was enabled.
            </p>
          ) : (
            <div className="pt-1">
              {entries.map((entry, index) => (
                <HistoryEntryCard
                  key={entry.id}
                  entry={entry}
                  isLast={index === entries.length - 1}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
