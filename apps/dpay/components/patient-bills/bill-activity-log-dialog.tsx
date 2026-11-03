'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  Ban,
  CheckCircle2,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Receipt,
  Trash2,
} from 'lucide-react';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  cn,
} from '@archmage/ui';
import { getPatientBillActivityLogsAction } from '@/app/actions/patient-bills/patient-bills.actions';
import type { BillActivityLogEntry } from '@/services/patient-bills/get-bill-activity-logs.service';

type BillActivityLogDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billId: string;
  relatedEntityIds?: string[];
};

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    'patient-bills.patient-bill.created': 'Bill created',
    'patient-bills.patient-bill.updated': 'Bill updated',
    'patient-bills.patient-bill.updated.details': 'Details updated',
    'patient-bills.patient-bill.line-item.created': 'Line item added',
    'patient-bills.patient-bill.line-item.deleted': 'Line item removed',
    'patient-bills.patient-bill.payment.recorded': 'Payment recorded',
    'patient-bills.patient-bill.overpayment.refunded': 'Overpayment refunded',
    'patient-bills.patient-bill.cancelled': 'Bill cancelled',
    'patient-bills.patient-bill.closed': 'Bill closed',
    'patient-bills.patient-bill.visited': 'Bill viewed',
  };
  return map[action] ?? action;
}

function actionVisual(action: string) {
  if (action.includes('created') || action.includes('line-item.created')) {
    return {
      icon: <Plus className="h-3.5 w-3.5" />,
      iconClassName: 'bg-emerald-800 text-white',
      badgeClassName: 'border-transparent bg-emerald-100 text-emerald-800',
    };
  }
  if (action.includes('deleted') || action.includes('cancelled')) {
    return {
      icon: action.includes('cancelled') ? (
        <Ban className="h-3.5 w-3.5" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      ),
      iconClassName: 'bg-red-600 text-white',
      badgeClassName: 'border-transparent bg-red-100 text-red-800',
    };
  }
  if (action.includes('payment')) {
    return {
      icon: <Receipt className="h-3.5 w-3.5" />,
      iconClassName: 'bg-emerald-700 text-white',
      badgeClassName: 'border-transparent bg-emerald-50 text-emerald-800',
    };
  }
  if (action.includes('closed')) {
    return {
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      iconClassName: 'bg-indigo-700 text-white',
      badgeClassName: 'border-transparent bg-indigo-100 text-indigo-900',
    };
  }
  if (action.includes('visited')) {
    return {
      icon: <Eye className="h-3.5 w-3.5" />,
      iconClassName: 'bg-muted text-muted-foreground',
      badgeClassName: 'border-transparent bg-muted text-muted-foreground',
    };
  }
  return {
    icon: <Pencil className="h-3.5 w-3.5" />,
    iconClassName: 'bg-blue-600 text-white',
    badgeClassName: 'border-transparent bg-blue-100 text-blue-800',
  };
}

import { formatLkr } from '@/lib/patient-bills/calculations';

function metadataSummary(entry: BillActivityLogEntry): string | null {
  const meta = entry.metadata;
  if (!meta) return null;

  const parts: string[] = [];
  if (typeof meta.doctorName === 'string' && meta.doctorName.trim()) {
    parts.push(meta.doctorName);
  }
  if (typeof meta.amount === 'number') {
    parts.push(formatLkr(meta.amount));
  }
  if (typeof meta.amountReceived === 'number') {
    parts.push(`Paid ${formatLkr(meta.amountReceived)}`);
  }
  if (typeof meta.refundAmount === 'number') {
    parts.push(`Refunded ${formatLkr(meta.refundAmount)}`);
  }
  if (typeof meta.receiptNumber === 'string' && meta.receiptNumber.trim()) {
    parts.push(meta.receiptNumber);
  }
  if (typeof meta.billNumber === 'string' && meta.billNumber.trim()) {
    parts.push(meta.billNumber);
  }
  if (typeof meta.cancelReason === 'string' && meta.cancelReason.trim()) {
    parts.push(`Reason: ${meta.cancelReason}`);
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}

function ActivityEntry({
  entry,
  isLast,
}: {
  entry: BillActivityLogEntry;
  isLast: boolean;
}) {
  const visual = actionVisual(entry.action);
  const when = format(new Date(entry.createdAt), 'dd MMM yyyy HH:mm');
  const who = entry.userName?.trim() || 'Unknown user';
  const details = metadataSummary(entry);

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
          visual.iconClassName
        )}
      >
        {visual.icon}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn('font-medium', visual.badgeClassName)}>
            {actionLabel(entry.action)}
          </Badge>
          {entry.importance ? (
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {entry.importance}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {when} · by {who}
        </p>
        {details ? <p className="text-sm text-foreground">{details}</p> : null}
        <p className="font-mono text-[11px] text-muted-foreground">
          {entry.action}
          {entry.entityType ? ` · ${entry.entityType}` : ''}
        </p>
      </div>
    </div>
  );
}

export function BillActivityLogDialog({
  open,
  onOpenChange,
  billId,
  relatedEntityIds = [],
}: BillActivityLogDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<BillActivityLogEntry[]>([]);

  useEffect(() => {
    if (!open || !billId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setEntries([]);

    const relatedIds = relatedEntityIds.filter(Boolean);

    getPatientBillActivityLogsAction(billId, relatedIds)
      .then((result) => {
        if (cancelled) return;
        if (!result.success) {
          setError(result.message);
          return;
        }
        setEntries(result.data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load activity');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // relatedEntityIds compared by joined key to avoid refetch loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, billId, relatedEntityIds.join(',')]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bill activity log</DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading activity…
            </div>
          ) : error ? (
            <p className="py-4 text-sm text-destructive">{error}</p>
          ) : entries.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No activity log entries found for this bill yet.
            </p>
          ) : (
            <div className="pt-1">
              {entries.map((entry, index) => (
                <ActivityEntry
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
