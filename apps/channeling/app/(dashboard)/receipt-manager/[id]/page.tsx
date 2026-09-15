import React from "react";
import Link from "next/link";
import { checkRouteAccess } from "@/lib/server-permissions";
import { redirect, notFound } from "next/navigation";
import { getReceiptDetailAction } from "@/app/actions/receipt-manager/receipt-manager.actions";
import { getReceiptMethodLabel } from "@/services/receipt-manager/receipt-method-labels";
import { formatLKR } from "@/lib/format-money";
import { format } from "date-fns";
import { PAYMENT_METHOD_NAMES } from "@/types/receipt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";

type Props = { params: Promise<{ id: string }> };

export default async function ReceiptManagerDetailPage({ params }: Props) {
  const canView = await checkRouteAccess("/receipt-manager");
  if (!canView) {
    redirect("/unauthorized-access");
  }

  const { id } = await params;
  const result = await getReceiptDetailAction(id);

  if (!result.success) {
    notFound();
  }

  const { data } = result;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/receipt-manager">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to list
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Receipt {data.receiptNoString}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      {data.journal && (
        <Card>
          <CardHeader>
            <CardTitle>Linked double-entry journal</CardTitle>
            <p className="text-sm text-muted-foreground">
              Journal #{data.journal.journalNumber ?? "—"} · {data.journal.description} ·{" "}
              {format(new Date(data.journal.date), "dd MMM yyyy")}
            </p>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Account</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-right p-3 font-medium">Debit</th>
                    <th className="text-right p-3 font-medium">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {data.journal.lines.map((line) => (
                    <tr key={line.accountId} className="border-b last:border-0">
                      <td className="p-3">
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
                          className="ml-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          Statement
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                      <td className="p-3 text-muted-foreground">{line.accountType}</td>
                      <td className="p-3 text-right tabular-nums">
                        {line.debitAmount > 0 ? (line.debitAmount / 100).toFixed(2) : "—"}
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {line.creditAmount > 0 ? (line.creditAmount / 100).toFixed(2) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {!data.journal && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            No linked journal entry for this receipt.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
