import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getMyTillData } from '@/app/actions/till.actions';
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
import { RECEIPT_PAYMENT_METHOD } from '@/types/receipt';

const PAYMENT_METHOD_LABEL: Record<number, string> = {
  [RECEIPT_PAYMENT_METHOD.CASH]: 'Cash',
  [RECEIPT_PAYMENT_METHOD.CREDIT_CARD]: 'Card',
  [RECEIPT_PAYMENT_METHOD.SLIP]: 'Slip',
  [RECEIPT_PAYMENT_METHOD.CHECK]: 'Cheque',
  [RECEIPT_PAYMENT_METHOD.CREDIT]: 'Credit',
  [RECEIPT_PAYMENT_METHOD.E_WALLET]: 'E-Wallet',
};

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

export default async function MyTillPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login');
  }

  const res = await getMyTillData();
  if (!res.success || !res.data) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <h2 className="text-3xl font-bold tracking-tight">My Till</h2>
        <p className="text-muted-foreground">{res.message ?? 'Unable to load till.'}</p>
      </div>
    );
  }

  const { balance, statement } = res.data;
  const hasTill = balance.tillAccountId != null;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <h2 className="text-3xl font-bold tracking-tight">My Till</h2>
      <p className="text-muted-foreground">
        Your till balance and statement. All payment types are tracked separately.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cash</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCents(balance.cashCents)} LKR</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Card</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCents(balance.cardCents)} LKR</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Slip</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCents(balance.slipCents)} LKR</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cheque</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCents(balance.checkCents)} LKR</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Credit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCents(balance.creditCents)} LKR</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">E-Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCents(balance.eWalletCents)} LKR</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCents(balance.totalCents)} LKR</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Statement</CardTitle>
          <p className="text-sm text-muted-foreground">
            {statement
              ? `Opening: ${formatCents(statement.openingBalance)} LKR → Closing: ${formatCents(statement.closingBalance)} LKR`
              : 'No till account yet. Your till is created when you receive float or record a payment.'}
          </p>
        </CardHeader>
        <CardContent>
          {statement && statement.lines.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Journal #</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statement.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>{new Date(line.date).toLocaleString()}</TableCell>
                    <TableCell>{line.journalNumber ?? '-'}</TableCell>
                    <TableCell>{line.description}</TableCell>
                    <TableCell>
                      {line.paymentMethod != null && PAYMENT_METHOD_LABEL[line.paymentMethod] != null ? (
                        <Badge variant="secondary">{PAYMENT_METHOD_LABEL[line.paymentMethod]}</Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {line.debitAmount > 0 ? formatCents(line.debitAmount) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {line.creditAmount > 0 ? formatCents(line.creditAmount) : '-'}
                    </TableCell>
                    <TableCell className="text-right">{formatCents(line.runningBalance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground py-4">
              {hasTill ? 'No transactions yet.' : 'Your till will appear here once you have activity.'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
