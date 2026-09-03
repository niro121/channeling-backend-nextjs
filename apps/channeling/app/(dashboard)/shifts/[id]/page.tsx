import React from 'react';
import { notFound } from 'next/navigation';
import { BackButton } from '@/components/common/back-button';
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
import { getShiftByIdAction } from '@/app/actions/shift.actions';
import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import { SHIFT_STATUS } from '@/types/shift';
import { HANDOVER_STATUS } from '@/types/handover';
import { formatCents } from '@/lib/format-money';
import { floatRequestStatusLabel } from '@/types/float-request';
import moment from 'moment';
import { AlertTriangle } from 'lucide-react';

const HANDOVER_METHOD_LABELS: Record<string, string> = {
  cashCents: 'Cash',
  cardCents: 'Credit card',
  slipCents: 'Slips',
  checkCents: 'Cheques',
  creditCents: 'Credit',
  eWalletCents: 'E-Wallet',
};

const statusLabel: Record<number, string> = {
  [SHIFT_STATUS.PAUSED]: 'Paused',
  [SHIFT_STATUS.ACTIVE]: 'Active',
  [SHIFT_STATUS.HANDOVER_PENDING]: 'Handover pending',
  [SHIFT_STATUS.ENDED]: 'Ended',
};

const handoverStatusLabel: Record<number, string> = {
  [HANDOVER_STATUS.PENDING]: 'Pending',
  [HANDOVER_STATUS.APPROVED]: 'Approved',
  [HANDOVER_STATUS.REJECTED]: 'Rejected',
  [HANDOVER_STATUS.CANCELLED]: 'Cancelled',
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ShiftDetailPage({ params }: PageProps) {
  const canView = await checkRouteAccess('/shifts');
  if (!canView) redirect('/unauthorized-access');

  const { id } = await params;
  const { success, data: shift } = await getShiftByIdAction(id);

  if (!success || !shift) notFound();

  const status = (shift as { status: number }).status;
  const statusText = statusLabel[status] ?? String(status);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Shift details</h2>
        <BackButton href="/shifts" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Shift</CardTitle>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Started: {moment(shift.startedAt).format('DD/MM/YYYY HH:mm')}</span>
            <span>·</span>
            <span>Ends: {moment(shift.endsAt).format('DD/MM/YYYY HH:mm')}</span>
            <span>·</span>
            <Badge
              variant={
                status === SHIFT_STATUS.ACTIVE
                  ? 'default'
                  : status === SHIFT_STATUS.HANDOVER_PENDING
                    ? 'secondary'
                    : 'secondary'
              }
            >
              {statusText}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <span className="text-muted-foreground">User:</span>{' '}
              {(shift as { user?: { name: string } }).user?.name ?? '—'}
            </div>
            <div>
              <span className="text-muted-foreground">Location:</span>{' '}
              {(shift as { location?: { name: string } }).location?.name ?? '—'}
            </div>
            {(shift as { endedAt?: Date | null }).endedAt && (
              <div>
                <span className="text-muted-foreground">Ended at:</span>{' '}
                {moment((shift as { endedAt: Date }).endedAt).format('DD/MM/YYYY HH:mm')}
              </div>
            )}
            {(shift as { createdByUser?: { name: string } }).createdByUser && (
              <div>
                <span className="text-muted-foreground">Created by:</span>{' '}
                {(shift as { createdByUser: { name: string } }).createdByUser.name}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {(shift as { floatRequests?: unknown[] }).floatRequests &&
        (shift as { floatRequests: unknown[] }).floatRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Float requests</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill No</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount (LKR)</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Approved</TableHead>
                    <TableHead>Received</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(
                    (shift as {
                      floatRequests: Array<{
                        id: string;
                        floatNoString?: string | null;
                        status: number;
                        amountRequested: number;
                        approvedAt: Date | null;
                        receivedAt: Date | null;
                        createdAt: Date;
                      }>;
                    }).floatRequests
                  ).map((fr) => (
                    <TableRow key={fr.id}>
                      <TableCell className="tabular-nums whitespace-nowrap">
                        {fr.floatNoString ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {floatRequestStatusLabel(fr.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums">{formatCents(fr.amountRequested)}</TableCell>
                      <TableCell>
                        {moment(fr.createdAt).format('DD/MM/YYYY HH:mm')}
                      </TableCell>
                      <TableCell>
                        {fr.approvedAt
                          ? moment(fr.approvedAt).format('DD/MM/YYYY HH:mm')
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {fr.receivedAt
                          ? moment(fr.receivedAt).format('DD/MM/YYYY HH:mm')
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

      {(shift as { handovers?: unknown[] }).handovers &&
        (shift as { handovers: Array<{
          id: string;
          status: number;
          fromUser: { id: string; name: string | null };
          toUser: { id: string; name: string | null };
          cashCents: number;
          cardCents: number;
          slipCents: number;
          checkCents: number;
          creditCents: number;
          eWalletCents: number;
          totalCents: number;
          discrepancyReason: string | null;
          rejectReason: string | null;
          createdAt: Date;
        }> }).handovers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Handover
                {(shift as { handovers: { discrepancyReason: string | null }[] }).handovers.some(
                  (h) => h.discrepancyReason
                ) && (
                  <AlertTriangle className="h-5 w-5 text-destructive"  />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(
                (shift as {
                  handovers: Array<{
                    id: string;
                    status: number;
                    fromUser: { id: string; name: string | null };
                    toUser: { id: string; name: string | null };
                    cashCents: number;
                    cardCents: number;
                    slipCents: number;
                    checkCents: number;
                    creditCents: number;
                    eWalletCents: number;
                    totalCents: number;
                    discrepancyReason: string | null;
                    rejectReason: string | null;
                    createdAt: Date;
                  }>;
                }).handovers
              ).map((h) => (
                <div key={h.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span>
                      <span className="text-muted-foreground">From:</span> {h.fromUser?.name ?? '—'}
                    </span>
                    <span>
                      <span className="text-muted-foreground">To:</span> {h.toUser?.name ?? '—'}
                    </span>
                    <span className="tabular-nums font-medium">Total: {formatCents(h.totalCents)}</span>
                    <span>
                      <Badge variant="outline">{handoverStatusLabel[h.status] ?? String(h.status)}</Badge>
                    </span>
                    <span className="text-muted-foreground">
                      {moment(h.createdAt).format('DD/MM/YYYY HH:mm')}
                    </span>
                  </div>
                  {h.status === HANDOVER_STATUS.REJECTED && h.rejectReason && (
                    <div className="text-sm rounded-md bg-destructive/10 text-destructive px-2 py-1.5">
                      <span className="font-medium">Reject reason: </span>
                      {h.rejectReason}
                    </div>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Method</TableHead>
                        <TableHead className="text-right">Amount (LKR)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(['cashCents', 'cardCents', 'slipCents', 'checkCents', 'creditCents', 'eWalletCents'] as const).map(
                        (key) => {
                          const amount = h[key];
                          return amount > 0 ? (
                            <TableRow key={key}>
                              <TableCell>{HANDOVER_METHOD_LABELS[key] ?? key}</TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatCents(amount)}
                              </TableCell>
                            </TableRow>
                          ) : null;
                        }
                      )}
                      <TableRow>
                        <TableCell className="font-medium">Total</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {formatCents(h.totalCents)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  {h.discrepancyReason && (
                    <div className="text-sm">
                      <span className="text-muted-foreground font-medium">Reason (discrepancy):</span>{' '}
                      <span className="text-destructive">{h.discrepancyReason}</span>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
    </div>
  );
}
