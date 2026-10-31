'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@archmage/ui';
import { getReceiptManagerDetailAction } from '@/app/actions/receipt-manager/receipt-manager.actions';
import { ReceiptStatusBadge } from '@/components/receipts/receipt-status-badge';
import { formatLkr } from '@/lib/patient-bills/calculations';
import { paymentMethodLabel } from '@/lib/receipts/helpers';
import type { ReceiptManagerDetail } from '@/services/receipt-manager/get-receipt-manager-detail.service';

type ReceiptViewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptId: string | null;
};

function moneyCell(amount: number) {
  return amount > 0 ? formatLkr(amount) : '—';
}

export function ReceiptViewDialog({ open, onOpenChange, receiptId }: ReceiptViewDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReceiptManagerDetail | null>(null);

  useEffect(() => {
    if (!open || !receiptId) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getReceiptManagerDetailAction(receiptId)
      .then((result) => {
        if (cancelled) return;
        if (result.success) {
          setData(result.data);
          setError(null);
        } else {
          setData(null);
          setError(result.message ?? 'Failed to load receipt.');
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load.');
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, receiptId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {data ? `Receipt ${data.receiptNumber}` : 'Receipt details'}
          </DialogTitle>
        </DialogHeader>
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && !loading && <p className="text-sm text-destructive py-4">{error}</p>}
        {data && !loading && (
          <div className="space-y-4">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Bill</dt>
                <dd>{data.billNumber}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <ReceiptStatusBadge status={data.status} />
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Payment method</dt>
                <dd>{paymentMethodLabel(data.paymentMethod)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Amount</dt>
                <dd className="tabular-nums font-medium">{formatLkr(data.amountPaid)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Location</dt>
                <dd>{data.locationName?.trim() || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Date</dt>
                <dd>{format(new Date(data.paymentDate), 'dd MMM yyyy HH:mm')}</dd>
              </div>
              {data.remarks?.trim() && (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Remarks</dt>
                  <dd>{data.remarks}</dd>
                </div>
              )}
            </dl>

            {data.journals.length > 0 ? (
              data.journals.map((journal) => (
                <div key={journal.id} className="space-y-2">
                  <h4 className="font-medium text-sm">Linked double-entry journal</h4>
                  <p className="text-xs text-muted-foreground">
                    Journal #{journal.journalNumber ?? '—'} · {journal.description} ·{' '}
                    {format(new Date(journal.date), 'dd MMM yyyy')}
                  </p>
                  <div className="rounded-md border overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-2 font-medium">Account</th>
                          <th className="text-left p-2 font-medium">Type</th>
                          <th className="text-left p-2 font-medium">Payment</th>
                          <th className="text-right p-2 font-medium">Debit</th>
                          <th className="text-right p-2 font-medium">Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {journal.lines.map((line) => (
                          <tr key={line.id} className="border-b last:border-0">
                            <td className="p-2">
                              <span className="font-medium">
                                {line.accountName}
                                {line.accountCode ? (
                                  <span className="text-muted-foreground font-normal">
                                    {' '}
                                    ({line.accountCode})
                                  </span>
                                ) : null}
                              </span>
                              {line.memo ? (
                                <span className="block text-xs text-muted-foreground">{line.memo}</span>
                              ) : null}
                            </td>
                            <td className="p-2 text-muted-foreground">{line.accountType}</td>
                            <td className="p-2 text-muted-foreground">
                              {line.paymentMethod != null
                                ? paymentMethodLabel(line.paymentMethod)
                                : '—'}
                            </td>
                            <td className="p-2 text-right tabular-nums">{moneyCell(line.debitAmount)}</td>
                            <td className="p-2 text-right tabular-nums">{moneyCell(line.creditAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No linked journal entry for this receipt.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
