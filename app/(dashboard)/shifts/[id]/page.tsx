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
import { formatCents } from '@/lib/format-money';
import { floatRequestStatusLabel } from '@/types/float-request';
import moment from 'moment';

const statusLabel: Record<number, string> = {
  [SHIFT_STATUS.PAUSED]: 'Paused',
  [SHIFT_STATUS.ACTIVE]: 'Active',
  [SHIFT_STATUS.ENDED]: 'Ended',
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
            <Badge variant={status === SHIFT_STATUS.ACTIVE ? 'default' : 'secondary'}>
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
                        status: number;
                        amountRequested: number;
                        approvedAt: Date | null;
                        receivedAt: Date | null;
                        createdAt: Date;
                      }>;
                    }).floatRequests
                  ).map((fr) => (
                    <TableRow key={fr.id}>
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
    </div>
  );
}
