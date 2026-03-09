import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAccountStatement, getAccountById } from '@/app/actions/accounting.actions';
import { checkRouteAccess } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { formatCents } from '@/lib/format-money';
import { redirect, notFound } from 'next/navigation';
import { BackButton } from '@/components/common/back-button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fromDate?: string; toDate?: string }>;
};

export default async function AccountStatementPage({ params, searchParams }: Props) {
  const canView = await checkRouteAccess('/accounting');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const { id } = await params;
  const { fromDate, toDate } = await searchParams;

  const [statementRes, accountRes] = await Promise.all([
    getAccountStatement(id, fromDate, toDate),
    getAccountById(id),
  ]);

  const account = accountRes.data ?? null;
  const statement = statementRes.data;

  if (!account) {
    notFound();
  }
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'accounting.statement.viewed',
      entityType: 'Account',
      entityId: id,
      importance: 'low',
      metadata: { fromDate: fromDate ?? undefined, toDate: toDate ?? undefined },
    });
  }

  const openingBalance = statement?.openingBalance ?? 0;
  const closingBalance = statement?.closingBalance ?? 0;
  const lines = statement?.lines ?? [];

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Statement of account</h2>
        <BackButton href="/accounting" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{account.name}</CardTitle>
          <div className="text-sm text-muted-foreground space-y-1">
            {account.code && <p>Code: {account.code}</p>}
            <p>Type: {account.type}</p>
            {account.location && <p>Location: {account.location.name}</p>}
            {account.doctor && (
              <p>Doctor: {account.doctor.name} ({account.doctor.code})</p>
            )}
            {account.agency && (
              <p>Agency: {account.agency.name} ({account.agency.code ?? '-'})</p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6 text-sm">
            <span>
              Opening balance: <strong className="tabular-nums">{formatCents(openingBalance)}</strong>
            </span>
            <span>
              Closing balance: <strong className="tabular-nums">{formatCents(closingBalance)}</strong>
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transactions</CardTitle>
          {(fromDate || toDate) && (
            <p className="text-sm text-muted-foreground">
              {fromDate && `From: ${fromDate}`}
              {toDate && ` To: ${toDate}`}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {lines.length === 0 ? (
            <p className="text-muted-foreground py-4">No transactions in this period.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Journal #</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Ref</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      {new Date(line.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{line.journalNumber ?? '-'}</TableCell>
                    <TableCell>{line.description}</TableCell>
                    <TableCell>
                      {line.referenceType && line.referenceId
                        ? `${line.referenceType}:${String(line.referenceId).slice(-6)}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {line.debitAmount > 0 ? formatCents(line.debitAmount) : '-'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {line.creditAmount > 0 ? formatCents(line.creditAmount) : '-'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCents(line.runningBalance)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
