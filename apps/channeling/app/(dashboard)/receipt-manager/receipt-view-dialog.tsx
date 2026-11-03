"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getReceiptDetailAction } from "@/app/actions/receipt-manager/receipt-manager.actions";
import { getReceiptMethodLabel } from "@/services/receipt-manager/receipt-method-labels";
import { formatLKR } from "@/lib/format-money";
import { format } from "date-fns";
import { PAYMENT_METHOD_NAMES } from "@/types/receipt";
import { ExternalLink, Loader2 } from "lucide-react";
import type { ReceiptDetail } from "@/services/receipt-manager/get-receipt-detail.service";

type ReceiptViewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptId: string | null;
};

export function ReceiptViewDialog({
  open,
  onOpenChange,
  receiptId,
}: ReceiptViewDialogProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReceiptDetail | null>(null);

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
    getReceiptDetailAction(receiptId)
      .then((result) => {
        if (cancelled) return;
        if (result.success) {
          setData(result.data);
          setError(null);
        } else {
          setData(null);
          setError(result.message ?? "Failed to load receipt.");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? "Failed to load.");
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
            {data ? `Receipt ${data.receiptNoString}` : "Receipt details"}
          </DialogTitle>
        </DialogHeader>
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && !loading && (
          <p className="text-sm text-destructive py-4">{error}</p>
        )}
        {data && !loading && (
          <div className="space-y-4">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Method</dt>
                <dd>{getReceiptMethodLabel(data.method)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Type</dt>
                <dd>{data.type === 1 ? "Debit" : "Credit"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Payment method</dt>
                <dd>{PAYMENT_METHOD_NAMES[data.paymentMethod] ?? data.paymentMethod ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Amount</dt>
                <dd className="tabular-nums font-medium">{formatLKR(data.amount)}</dd>
              </div>
              {data.whd > 0 && (
                <div>
                  <dt className="text-muted-foreground">WHT</dt>
                  <dd className="tabular-nums">{formatLKR(data.whd)}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">Location</dt>
                <dd>{data.locationName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Date</dt>
                <dd>{format(new Date(data.createdAt), "dd MMM yyyy HH:mm")}</dd>
              </div>
              {data.remarks && (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Remarks</dt>
                  <dd>{data.remarks}</dd>
                </div>
              )}
            </dl>

            {data.journal && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Linked double-entry journal</h4>
                <p className="text-xs text-muted-foreground">
                  Journal #{data.journal.journalNumber ?? "—"} · {data.journal.description} ·{" "}
                  {format(new Date(data.journal.date), "dd MMM yyyy")}
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
                      {data.journal.lines.map((line) => (
                        <tr key={line.accountId} className="border-b last:border-0">
                          <td className="p-2">
                            <span className="font-medium">
                              {line.accountName}
                              {line.accountCode ? (
                                <span className="text-muted-foreground font-normal">
                                  {" "}
                                  ({line.accountCode})
                                </span>
                              ) : null}
                            </span>
                            <Link
                              href={`/accounting/${line.accountId}/statement`}
                              className="ml-2 inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
                            >
                              Statement
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </td>
                          <td className="p-2 text-muted-foreground">{line.accountType}</td>
                          <td className="p-2 text-muted-foreground">
                            {line.paymentMethod != null
                              ? (PAYMENT_METHOD_NAMES[line.paymentMethod] ?? String(line.paymentMethod))
                              : "—"}
                          </td>
                          <td className="p-2 text-right tabular-nums">
                            {line.debitAmount > 0 ? (line.debitAmount / 100).toFixed(2) : "—"}
                          </td>
                          <td className="p-2 text-right tabular-nums">
                            {line.creditAmount > 0 ? (line.creditAmount / 100).toFixed(2) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!data.journal && (
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
