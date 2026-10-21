import React, { Suspense } from 'react';
import { getMyShortStatement } from '@/app/actions/till.actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BookOpen, ListOrdered } from 'lucide-react';
import { formatCents } from '@/lib/format-money';
import { StatementPeriodPicker } from './statement-period-picker';
import { RECEIPT_PAYMENT_METHOD } from '@/types/receipt';

const PAYMENT_METHOD_LABEL: Record<number, string> = {
  [RECEIPT_PAYMENT_METHOD.CASH]: 'Cash',
  [RECEIPT_PAYMENT_METHOD.CREDIT_CARD]: 'Card',
  [RECEIPT_PAYMENT_METHOD.SLIP]: 'Slip',
  [RECEIPT_PAYMENT_METHOD.CHECK]: 'Cheque',
  [RECEIPT_PAYMENT_METHOD.CREDIT]: 'Credit',
  [RECEIPT_PAYMENT_METHOD.E_WALLET]: 'E-Wallet',
};

type Props = {
  from?: string;
  to?: string;
  tillId?: string;
};

export async function ShortStatementSection({ from, to, tillId }: Props) {
  const res = await getMyShortStatement(from, to, tillId ?? null);
  if (!res.success) {
    return (
      <Card id="short-statement">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{res.message ?? 'Unable to load short statement.'}</p>
        </CardContent>
      </Card>
    );
  }
  if (res.data == null) return null;

  const statement = res.data;

  return (
    <Card id="short-statement">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListOrdered className="h-4 w-4" />
            Short statement
          </CardTitle>
          <Suspense fallback={<div className="h-9" />}>
            <StatementPeriodPicker key={`short-${from ?? ''}-${to ?? ''}-${tillId ?? ''}`} />
          </Suspense>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5" />
          Opening <span className="font-medium tabular-nums text-foreground">{formatCents(statement.openingBalance)}</span> LKR
          {' → '}
          Closing <span className="font-medium tabular-nums text-foreground">{formatCents(statement.closingBalance)}</span> LKR
        </p>
      </CardHeader>
      <CardContent>
        {statement.lines.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-medium">Date</TableHead>
                  <TableHead className="font-medium">Journal #</TableHead>
                  <TableHead className="font-medium">Description</TableHead>
                  <TableHead className="font-medium">Type</TableHead>
                  <TableHead className="text-right font-medium">Debit</TableHead>
                  <TableHead className="text-right font-medium">Credit</TableHead>
                  <TableHead className="text-right font-medium">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statement.lines.map((line) => {
                  const method = line.paymentMethod ?? RECEIPT_PAYMENT_METHOD.CASH;
                  return (
                    <TableRow key={line.id}>
                      <TableCell className="text-muted-foreground">
                        {new Date(line.date).toLocaleString(undefined, {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{line.journalNumber ?? '–'}</TableCell>
                      <TableCell>{line.description}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">
                          {PAYMENT_METHOD_LABEL[method] ?? 'Cash'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {line.debitAmount > 0 ? formatCents(line.debitAmount) : '–'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {line.creditAmount > 0 ? formatCents(line.creditAmount) : '–'}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCents(line.runningBalance)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No short transactions yet for this period.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
