'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import {
  getAllFloatRequestsForDashboardAction,
  getFloatRequestUserOptionsAction,
  approveFloatRequestAction,
  rejectFloatRequestAction,
  hasBulkCashierFloatAccountAction,
  createBulkCashierFloatAccountAction,
  getBulkCashierFloatBalanceAction,
  getBulkCashierFloatSummaryAction,
  getFloatRequestJournalAction,
} from '@/app/actions/float-request.actions';
import { getActiveShiftsWithFloatAction } from '@/app/actions/shift.actions';
import type { FloatRequest, DenominationEntry, FloatRequestPrintData } from '@/types/float-request';
import { FLOAT_REQUEST_STATUS, floatRequestStatusLabel } from '@/types/float-request';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import Link from 'next/link';
import { Loader2, CheckCircle, XCircle, Copy, Minus, Plus, Clock, MapPin, Banknote, Printer, Eye, Wallet, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import { formatCents, formatLKR } from '@/lib/format-money';
import { denominationsTotalLKR, lkrToCents, LKR_DENOMINATIONS, LKR_DENOMINATIONS_RUPEES, LKR_DENOMINATIONS_CENTS, formatDenomLabel } from '@/types/float-request';
import { ReportUserSelect } from '@/components/common/user-select';
import type { ReportUserOption } from '@/components/common/user-select';

type BulkCashierContentProps = { bulkCashierId: string };

export function BulkCashierContent({ bulkCashierId }: BulkCashierContentProps) {
  const [requests, setRequests] = useState<FloatRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<number | undefined>(FLOAT_REQUEST_STATUS.PENDING);
  const [requestedByFilter, setRequestedByFilter] = useState('__all__');
  const [userOptions, setUserOptions] = useState<ReportUserOption[]>([]);
  const [approveModal, setApproveModal] = useState<FloatRequest | null>(null);
  const [rejectModal, setRejectModal] = useState<FloatRequest | null>(null);
  const [printSlipData, setPrintSlipData] = useState<FloatRequestPrintData | null>(null);
  const [summaryRequest, setSummaryRequest] = useState<FloatRequest | null>(null);
  const [activeShifts, setActiveShifts] = useState<Array<{
    id: string;
    userId: string;
    userName: string;
    userEmail: string | null;
    locationId: string | null;
    locationName: string | null;
    startedAt: Date | string;
    endsAt: Date | string;
    floatBalanceCents: number;
  }>>([]);
  const [activeShiftsLoading, setActiveShiftsLoading] = useState(true);
  const [floatSummary, setFloatSummary] = useState<{
    floatAccountId: string | null;
    balanceCents: number;
    cashCents: number;
    tillLocationName: string | null;
  } | null>(null);
  const [hasFloatAccount, setHasFloatAccount] = useState<boolean | null>(null);
  const [createFloatAccountLoading, setCreateFloatAccountLoading] = useState(false);
  const [showCreateFloatConfirm, setShowCreateFloatConfirm] = useState(false);
  const { toast } = useToast();

  const loadFloatSummary = () => {
    getBulkCashierFloatSummaryAction().then((res) => {
      if (res.success) {
        setFloatSummary({
          floatAccountId: res.floatAccountId ?? null,
          balanceCents: res.balanceCents ?? 0,
          cashCents: res.cashCents ?? 0,
          tillLocationName: res.tillLocationName ?? null,
        });
        setHasFloatAccount(!!res.floatAccountId);
      } else {
        setFloatSummary({ floatAccountId: null, balanceCents: 0, cashCents: 0, tillLocationName: null });
        setHasFloatAccount(false);
      }
    });
  };

  const loadHasFloatAccount = () => {
    hasBulkCashierFloatAccountAction().then((res) => {
      if (res.success) setHasFloatAccount(res.hasFloatAccount);
      else setHasFloatAccount(false);
    });
  };

  useEffect(() => {
    loadFloatSummary();
  }, [bulkCashierId]);

  const loadRequests = useCallback(() => {
    setLoading(true);
    getAllFloatRequestsForDashboardAction({
      status: statusFilter,
      requestedById: requestedByFilter !== '__all__' ? requestedByFilter : null,
    })
      .then((res) => {
        if (res.success && res.data) setRequests(res.data);
      })
      .finally(() => setLoading(false));
  }, [statusFilter, requestedByFilter]);

  useEffect(() => {
    getFloatRequestUserOptionsAction()
      .then((res) => {
        if (res.success && res.data) setUserOptions(res.data);
      });
  }, [bulkCashierId]);

  useEffect(() => {
    loadRequests();
  }, [bulkCashierId, loadRequests]);

  useEffect(() => {
    if (typeof window === 'undefined' || !bulkCashierId) return;

    const socket: Socket = io(window.location.origin, {
      path: '/socket.io',
      addTrailingSlash: false,
    });
    const subscribe = () => socket.emit('float-request:subscribe', { userId: bulkCashierId });
    if (socket.connected) subscribe();
    else socket.once('connect', subscribe);

    const onFloatRequestUpdate = (data?: { status?: number }) => {
      loadRequests();
      if (data?.status === FLOAT_REQUEST_STATUS.PENDING) {
        toast({ title: 'New float request received' });
      }
    };
    socket.on('float-request-update', onFloatRequestUpdate);

    return () => {
      socket.emit('float-request:unsubscribe', { userId: bulkCashierId });
      socket.off('float-request-update', onFloatRequestUpdate);
      socket.disconnect();
    };
  }, [bulkCashierId, loadRequests, toast]);

  const loadActiveShifts = () => {
    setActiveShiftsLoading(true);
    getActiveShiftsWithFloatAction()
      .then((data) => setActiveShifts(data ?? []))
      .catch(() => setActiveShifts([]))
      .finally(() => setActiveShiftsLoading(false));
  };

  useEffect(() => {
    loadActiveShifts();
  }, [bulkCashierId]);

  useEffect(() => {
    const interval = setInterval(loadActiveShifts, 30 * 1000);
    return () => clearInterval(interval);
  }, [bulkCashierId]);


  const handleCreateFloatAccount = async () => {
    setCreateFloatAccountLoading(true);
    const res = await createBulkCashierFloatAccountAction();
    setCreateFloatAccountLoading(false);
    setShowCreateFloatConfirm(false);
    if (res.success) {
      toast({ title: res.message ?? 'Active till is ready.' });
      loadFloatSummary();
    } else {
      toast({ variant: 'destructive', title: res.error ?? 'Failed to create active till.' });
    }
  };

  return (
    <>
      {/* Float account balance and statement at top */}
      <section className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Active till:</span>
          <span className="text-lg font-semibold tabular-nums">
            {floatSummary === null ? (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </span>
            ) : (
              `${formatCents(floatSummary.balanceCents)} LKR`
            )}
          </span>
          {floatSummary && (
            <>
              <span className="text-sm text-muted-foreground">· Cash:</span>
              <span className="text-lg font-semibold tabular-nums">
                {formatCents(floatSummary.cashCents)} LKR
              </span>
            </>
          )}
          {floatSummary?.tillLocationName ? (
            <span className="text-sm text-muted-foreground">({floatSummary.tillLocationName})</span>
          ) : null}
        </div>
        {floatSummary?.floatAccountId && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/accounting/${floatSummary.floatAccountId}/statement`}>
              <FileText className="h-4 w-4 mr-2" />
              Statement
            </Link>
          </Button>
        )}
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Active shifts
        </h3>
        {activeShiftsLoading ? (
          <div className="flex items-center justify-center py-8 border rounded-lg bg-muted/30">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : activeShifts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 border rounded-lg bg-muted/30 text-center">No active shifts.</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cashier</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead className="text-right">Float (LKR)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeShifts.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{s.userName}</p>
                        {s.userEmail && <p className="text-xs text-muted-foreground">{s.userEmail}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {s.locationName ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          {s.locationName}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(s.startedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      <span className="flex items-center justify-end gap-1">
                        <Banknote className="h-4 w-4 text-muted-foreground" />
                        {formatCents(s.floatBalanceCents)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {hasFloatAccount === null ? (
        <div className="flex items-center justify-center py-12 border rounded-lg bg-muted/30">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !hasFloatAccount ? (
        <section className="border rounded-lg bg-muted/30 p-8 flex flex-col items-center justify-center text-center gap-4">
          <Wallet className="h-12 w-12 text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold mb-1">No active shift till</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Approving float requires an active shift. Float is taken from that shift&apos;s till. Start a shift at a location to continue.
            </p>
          </div>
          <Button onClick={() => setShowCreateFloatConfirm(true)} disabled={createFloatAccountLoading}>
            {createFloatAccountLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create shift till
          </Button>
          <AlertDialog open={showCreateFloatConfirm} onOpenChange={setShowCreateFloatConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Create shift till?</AlertDialogTitle>
                <AlertDialogDescription>
                  This uses your current active shift location. Start a shift first if you do not have one. You must have a linked staff record. Continue?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={createFloatAccountLoading}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    void handleCreateFloatAccount();
                  }}
                  disabled={createFloatAccountLoading}
                >
                  {createFloatAccountLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      ) : (
        <>
          <h3 className="text-lg font-semibold mb-3">Float requests</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Today&apos;s requests and all pending (any date). You can only approve or reject requests assigned to you.
          </p>
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <ReportUserSelect
              userOptions={userOptions}
              value={requestedByFilter}
              onChange={setRequestedByFilter}
              label="Requested by"
              placeholder="Select user"
              widthClassName="w-[220px]"
            />
            <div className="flex flex-wrap items-center gap-2">
              {[
                { value: FLOAT_REQUEST_STATUS.PENDING, label: 'PENDING' },
                { value: FLOAT_REQUEST_STATUS.APPROVED, label: 'APPROVED' },
                { value: FLOAT_REQUEST_STATUS.RECEIVED, label: 'RECEIVED' },
                { value: FLOAT_REQUEST_STATUS.REJECTED, label: 'REJECTED' },
                { value: FLOAT_REQUEST_STATUS.CANCELLED, label: 'CANCELLED' },
              ].map(({ value, label }) => (
                <Button
                  key={value}
                  variant={statusFilter === value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(value)}
                >
                  {label}
                </Button>
              ))}
              <Button variant="ghost" size="sm" onClick={() => setStatusFilter(undefined)}>
                All statuses
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill No</TableHead>
                  <TableHead>Requested by</TableHead>
                  <TableHead>Assigned to</TableHead>
                  <TableHead>Amount (LKR)</TableHead>
                  <TableHead>Denominations</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No requests found.
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((fr) => {
                    const isAssignedToMe = fr.bulkCashierId === bulkCashierId;
                    return (
                      <TableRow key={fr.id}>
                        <TableCell className="tabular-nums whitespace-nowrap">{fr.floatNoString ?? '—'}</TableCell>
                        <TableCell>{fr.requestedBy?.name ?? fr.requestedById}</TableCell>
                        <TableCell>
                          {fr.bulkCashier?.name ?? fr.bulkCashierId}
                          {isAssignedToMe && (
                            <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
                          )}
                        </TableCell>
                        <TableCell className="tabular-nums">{formatCents(fr.amountRequested)}</TableCell>
                        <TableCell>
                          {fr.denominationsRequested
                            .filter((d) => d.count > 0)
                            .map((d) => `${formatDenomLabel(d.value)}×${d.count}`)
                            .join(', ') || '-'}
                        </TableCell>
                        <TableCell>{new Date(fr.createdAt).toLocaleString()}</TableCell>
                        <TableCell>{floatRequestStatusLabel(fr.status)}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button size="sm" variant="ghost" onClick={() => setSummaryRequest(fr)}>
                            <Eye className="h-4 w-4 mr-1" /> View
                          </Button>
                          {fr.status === FLOAT_REQUEST_STATUS.PENDING && isAssignedToMe && (
                            <>
                              <Button size="sm" variant="default" onClick={() => setApproveModal(fr)}>
                                <CheckCircle className="h-4 w-4 mr-1" /> Approve
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => setRejectModal(fr)}>
                                <XCircle className="h-4 w-4 mr-1" /> Reject
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </>
      )}

      {approveModal && (
        <ApproveModal
          request={approveModal}
          bulkCashierId={bulkCashierId}
          onClose={() => { setApproveModal(null); loadRequests(); }}
          onError={(msg) => toast({ variant: 'destructive', title: msg })}
          onSuccess={(msg, data) => {
            toast({ title: msg });
            setApproveModal(null);
            loadRequests();
            loadActiveShifts();
            if (data) setPrintSlipData(data);
          }}
        />
      )}
      {printSlipData && (
        <FloatPrintSlipDialog
          data={printSlipData}
          onClose={() => setPrintSlipData(null)}
        />
      )}
      {rejectModal && (
        <RejectModal
          request={rejectModal}
          bulkCashierId={bulkCashierId}
          onClose={() => setRejectModal(null)}
          onError={(msg) => toast({ variant: 'destructive', title: msg })}
          onSuccess={(msg) => { toast({ title: msg }); setRejectModal(null); loadRequests(); }}
        />
      )}
      {summaryRequest && (
        <FloatRequestSummaryDialog
          request={summaryRequest}
          onClose={() => setSummaryRequest(null)}
          onPrintSlip={(data) => {
            setSummaryRequest(null);
            setPrintSlipData(data);
          }}
        />
      )}
    </>
  );
}

export function buildPrintDataFromRequest(fr: FloatRequest): FloatRequestPrintData | null {
  if (fr.status !== FLOAT_REQUEST_STATUS.APPROVED || !fr.receiveCode) return null;
  const denoms = fr.denominationsApproved ?? [];
  const amountLKR = denoms.length > 0 ? denominationsTotalLKR(denoms) : fr.amountRequested / 100;
  return {
    floatRequestId: fr.id,
    floatNoString: fr.floatNoString ?? null,
    receiveCode: fr.receiveCode,
    amountLKR,
    denominationsApproved: denoms,
    requestedByName: fr.requestedBy?.name ?? '',
    bulkCashierName: fr.bulkCashier?.name ?? '',
    approvedAt: fr.approvedAt ? new Date(fr.approvedAt).toISOString() : '',
  };
}

function floatRequestStatusBadgeClass(status: number) {
  switch (status) {
    case FLOAT_REQUEST_STATUS.PENDING:
      return { variant: 'secondary' as const, className: '' };
    case FLOAT_REQUEST_STATUS.APPROVED:
      return { variant: 'default' as const, className: '' };
    case FLOAT_REQUEST_STATUS.RECEIVED:
      return {
        variant: 'outline' as const,
        className: 'border-emerald-600/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
      };
    case FLOAT_REQUEST_STATUS.REJECTED:
      return { variant: 'destructive' as const, className: '' };
    case FLOAT_REQUEST_STATUS.CANCELLED:
      return { variant: 'outline' as const, className: 'text-muted-foreground' };
    default:
      return { variant: 'outline' as const, className: '' };
  }
}

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

function formatDenoms(entries?: { value: number; count: number }[] | null) {
  if (!entries?.length) return null;
  const str = entries
    .filter((d) => d.count > 0)
    .map((d) => `${formatDenomLabel(d.value)}×${d.count}`)
    .join(', ');
  return str || null;
}

function TimelineStep({
  label,
  at,
}: {
  label: string;
  at: Date | string | null | undefined;
}) {
  const formatted = formatDateTime(at);
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            'h-2 w-2 shrink-0 rounded-full',
            formatted ? 'bg-emerald-600' : 'bg-muted-foreground/30'
          )}
        />
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p
        className={cn(
          'mt-1 pl-3.5 text-sm leading-snug',
          formatted ? 'font-medium' : 'text-muted-foreground'
        )}
      >
        {formatted ?? '—'}
      </p>
    </div>
  );
}

export function FloatRequestSummaryDialog({
  request,
  onClose,
  onPrintSlip,
}: {
  request: FloatRequest;
  onClose: () => void;
  onPrintSlip: (data: FloatRequestPrintData) => void;
}) {
  const printData = request.status === FLOAT_REQUEST_STATUS.APPROVED && request.receiveCode
    ? buildPrintDataFromRequest(request)
    : null;
  const [journal, setJournal] = useState<{
    id: string;
    journalNumber: number | null;
    date: Date | string;
    description: string;
    lines: {
      accountId: string;
      accountName: string;
      accountCode: string | null;
      debitAmount: number;
      creditAmount: number;
    }[];
  } | null>(null);
  const [journalLoading, setJournalLoading] = useState(false);

  useEffect(() => {
    if (request.status !== FLOAT_REQUEST_STATUS.RECEIVED || !request.journalId) {
      setJournal(null);
      return;
    }
    let cancelled = false;
    setJournalLoading(true);
    getFloatRequestJournalAction(request.id)
      .then((res) => {
        if (!cancelled) setJournal(res.success ? res.data : null);
      })
      .finally(() => {
        if (!cancelled) setJournalLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [request.id, request.status, request.journalId]);

  const statusBadge = floatRequestStatusBadgeClass(request.status);
  const requestedDenoms = formatDenoms(request.denominationsRequested);
  const approvedDenoms = formatDenoms(request.denominationsApproved);
  const thirdStepLabel =
    request.status === FLOAT_REQUEST_STATUS.REJECTED
      ? 'Rejected'
      : request.status === FLOAT_REQUEST_STATUS.CANCELLED
        ? 'Cancelled'
        : 'Received';
  const thirdStepAt =
    request.status === FLOAT_REQUEST_STATUS.REJECTED
      ? request.rejectedAt
      : request.status === FLOAT_REQUEST_STATUS.CANCELLED
        ? request.cancelledAt
        : request.receivedAt;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="min-w-0 space-y-1">
              <DialogTitle>Request summary</DialogTitle>
              <DialogDescription className="font-mono text-foreground">
                {request.floatNoString ?? '—'}
              </DialogDescription>
            </div>
            <Badge
              variant={statusBadge.variant}
              className={cn('shrink-0 px-3 py-1 text-sm', statusBadge.className)}
            >
              {floatRequestStatusLabel(request.status)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between rounded-lg bg-muted/60 px-4 py-3">
            <span className="text-muted-foreground">Amount</span>
            <span className="text-xl font-semibold tabular-nums">
              {formatCents(request.amountRequested)} LKR
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-md border px-3 py-2">
              <p className="text-xs text-muted-foreground">Requested by</p>
              <p className="mt-0.5 font-medium">
                {request.requestedBy?.name ?? request.requestedById}
              </p>
            </div>
            <div className="rounded-md border px-3 py-2">
              <p className="text-xs text-muted-foreground">Bulk cashier</p>
              <p className="mt-0.5 font-medium">{request.bulkCashier?.name ?? '—'}</p>
            </div>
          </div>

          <div className="rounded-lg border px-3 py-3">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Timeline
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <TimelineStep label="Requested" at={request.createdAt} />
              <TimelineStep label="Approved" at={request.approvedAt} />
              <TimelineStep label={thirdStepLabel} at={thirdStepAt} />
            </div>
          </div>

          {(requestedDenoms || approvedDenoms) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {requestedDenoms && (
                <div className="rounded-md border px-3 py-2">
                  <p className="text-xs text-muted-foreground">Denominations requested</p>
                  <p className="mt-0.5 font-medium">{requestedDenoms}</p>
                </div>
              )}
              {approvedDenoms && (
                <div className="rounded-md border px-3 py-2">
                  <p className="text-xs text-muted-foreground">Denominations approved</p>
                  <p className="mt-0.5 font-medium">{approvedDenoms}</p>
                </div>
              )}
            </div>
          )}

          {request.status === FLOAT_REQUEST_STATUS.APPROVED && request.receiveCode && (
            <div className="rounded-md border px-3 py-2">
              <p className="text-xs text-muted-foreground">Receive code</p>
              <p className="mt-0.5 font-mono text-base font-semibold tracking-widest">
                {request.receiveCode}
              </p>
            </div>
          )}
          {request.reasonForLessThanRequested && (
            <div className="rounded-md border px-3 py-2">
              <p className="text-xs text-muted-foreground">Reason for less than requested</p>
              <p className="mt-0.5">{request.reasonForLessThanRequested}</p>
            </div>
          )}
          {request.status === FLOAT_REQUEST_STATUS.REJECTED && request.rejectReason && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
              <p className="text-xs text-muted-foreground">Reject reason</p>
              <p className="mt-0.5">{request.rejectReason}</p>
            </div>
          )}
          {request.status === FLOAT_REQUEST_STATUS.CANCELLED && request.cancelReason && (
            <div className="rounded-md border px-3 py-2">
              <p className="text-xs text-muted-foreground">Cancel reason</p>
              <p className="mt-0.5">{request.cancelReason}</p>
            </div>
          )}

          {request.status === FLOAT_REQUEST_STATUS.RECEIVED && (
            <div className="rounded-md border pt-3">
              <p className="px-3 font-medium mb-2">Double entry</p>
              {journalLoading ? (
                <p className="px-3 pb-3 text-muted-foreground text-xs">Loading journal…</p>
              ) : !journal ? (
                <p className="px-3 pb-3 text-muted-foreground text-xs">No journal entry found for this request.</p>
              ) : (
                <div className="space-y-2 pb-3">
                  <div className="px-3 text-xs text-muted-foreground space-y-0.5">
                    {journal.journalNumber != null && (
                      <p>Journal #: {journal.journalNumber}</p>
                    )}
                    <p>{journal.description}</p>
                    <p>{new Date(journal.date).toLocaleString()}</p>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {journal.lines.map((line) => (
                        <TableRow key={line.accountId}>
                          <TableCell>
                            <span className="font-medium">{line.accountName}</span>
                            {line.accountCode ? (
                              <span className="text-muted-foreground text-xs ml-1">({line.accountCode})</span>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {line.debitAmount > 0 ? formatCents(line.debitAmount) : '—'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {line.creditAmount > 0 ? formatCents(line.creditAmount) : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {printData && (
            <Button onClick={() => onPrintSlip(printData)}>
              <Printer className="h-4 w-4 mr-2" />
              Print slip
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FloatPrintSlipDialog({ data, onClose }: { data: FloatRequestPrintData; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = () => {
    window.print();
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <style>{`@media print { body * { visibility: hidden; } .float-slip-print-area, .float-slip-print-area * { visibility: visible; } .float-slip-print-area { position: absolute; left: 0; top: 0; width: 100%; background: white; padding: 1rem; } .no-print { display: none !important; } }`}</style>
        <DialogHeader className="no-print">
          <DialogTitle>Float handover slip</DialogTitle>
          <DialogDescription>Print this slip and give it to the cashier. They will enter the code to confirm receipt.</DialogDescription>
        </DialogHeader>
        <div ref={printRef} className="float-slip-print-area border rounded-lg p-6 space-y-4 bg-white">
          <h2 className="text-lg font-bold text-center">Float handover slip</h2>
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-muted-foreground">Receive code (4 digits)</p>
            <p className="text-4xl font-mono font-bold tracking-widest tabular-nums">{data.receiveCode}</p>
            <div className="mt-2">
              <QRCodeSVG value={data.receiveCode} size={120} level="M" />
            </div>
          </div>
          <div className="text-sm space-y-1">
            {data.floatNoString ? <p><strong>Bill No:</strong> {data.floatNoString}</p> : null}
            <p><strong>Amount:</strong> {formatLKR(data.amountLKR)} LKR</p>
            <p><strong>Requested by:</strong> {data.requestedByName}</p>
            <p><strong>Approved by:</strong> {data.bulkCashierName}</p>
            <p><strong>Date:</strong> {new Date(data.approvedAt).toLocaleString()}</p>
          </div>
          {data.denominationsApproved.length > 0 && (
            <div className="text-sm">
              <p className="font-medium mb-1">Denominations:</p>
              <p className="text-muted-foreground">
                {data.denominationsApproved
                  .filter((d) => d.count > 0)
                  .map((d) => `${formatDenomLabel(d.value)}×${d.count}`)
                  .join(', ')}
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-6 pt-6 border-t mt-6">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Approved by (signature)</p>
              <div className="border-b border-black h-8" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Received by (signature)</p>
              <div className="border-b border-black h-8" />
            </div>
          </div>
        </div>
        <DialogFooter className="no-print mt-4">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print slip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ApproveModal({
  request,
  bulkCashierId,
  onClose,
  onError,
  onSuccess,
}: {
  request: FloatRequest;
  bulkCashierId: string;
  onClose: () => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string, printData?: FloatRequestPrintData) => void;
}) {
  const [denoms, setDenoms] = useState<DenominationEntry[]>(
    () => LKR_DENOMINATIONS.map((v) => ({ value: v, count: 0 }))
  );
  const [reasonForLess, setReasonForLess] = useState('');
  const [loading, setLoading] = useState(false);
  const [balanceCents, setBalanceCents] = useState<number | null>(null);
  const [hasTill, setHasTill] = useState<boolean | null>(null);
  const [tillLocationName, setTillLocationName] = useState<string | null>(null);

  useEffect(() => {
    getBulkCashierFloatBalanceAction().then((res) => {
      if (res.success && res.hasTill) {
        setHasTill(true);
        setBalanceCents(res.balanceCents);
        setTillLocationName(res.tillLocationName ?? null);
      } else {
        setHasTill(false);
        setBalanceCents(null);
        setTillLocationName(null);
      }
    });
  }, [request?.id]);

  const matchDenom = (a: number, b: number) => (a >= 1 && b >= 1 ? a === b : Math.abs(a - b) < 1e-6);

  const totalLKR = denominationsTotalLKR(denoms);
  const totalCents = lkrToCents(totalLKR);
  const maxCents = request.amountRequested;
  const isGivingLess = totalCents > 0 && totalCents < maxCents;
  const insufficientBalance = balanceCents !== null && totalCents > 0 && totalCents > balanceCents;
  const valid =
    totalCents > 0 &&
    totalCents <= maxCents &&
    (!isGivingLess || reasonForLess.trim().length > 0) &&
    !insufficientBalance;

  const matchRequest = () => {
    const initial = Array.isArray(request.denominationsRequested) && request.denominationsRequested.length > 0
      ? [...(request.denominationsRequested as DenominationEntry[])]
      : [];
    setDenoms(
      LKR_DENOMINATIONS.map((v) => {
        const d = initial.find((d) => (d.value >= 1 && v >= 1 ? d.value === v : Math.abs(d.value - v) < 1e-6));
        return { value: v, count: d?.count ?? 0 };
      })
    );
  };

  const updateDenomCount = (value: number, count: number) => {
    setDenoms((prev) => {
      const i = prev.findIndex((d) => matchDenom(d.value, value));
      if (i < 0) return prev;
      const next = [...prev];
      next[i] = { ...next[i], count };
      return next;
    });
  };

  async function handleSubmit() {
    if (!valid) return;
    setLoading(true);
    const denominationsApproved = denoms.filter((d) => d.count > 0);
    const res = await approveFloatRequestAction({
      floatRequestId: request.id,
      approvedBy: bulkCashierId,
      denominationsApproved,
      reasonForLessThanRequested: isGivingLess ? reasonForLess.trim() : null,
    });
    setLoading(false);
    if (res.success && res.message) onSuccess(res.message, res.printData);
    else onError(res.error ?? 'Failed to approve');
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Approve float request</DialogTitle>
          <DialogDescription>
            {request.floatNoString ? `${request.floatNoString}. ` : ""}
            Float is cash and will be taken from your active till cash. You can give up to the requested amount (or less). Cannot give more than requested, and cash cannot go below zero.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {hasTill && balanceCents !== null && (
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Your current cash: </span>
              <span className="font-medium tabular-nums">{formatCents(balanceCents)} LKR</span>
              {tillLocationName ? (
                <span className="text-muted-foreground"> ({tillLocationName})</span>
              ) : null}
              {insufficientBalance && (
                <p className="mt-1.5 text-destructive font-medium">
                  Insufficient cash. You have {formatCents(balanceCents)} LKR cash, required {formatCents(totalCents)} LKR.
                </p>
              )}
            </div>
          )}
          {hasTill === false && (
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              No till found for your current shift. Start a shift at a location, then try again.
            </div>
          )}
          <div>
            <Label>Requested (what they asked for)</Label>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border bg-muted/40 px-3 py-2 text-sm">
              {(Array.isArray(request.denominationsRequested)
                ? (request.denominationsRequested as DenominationEntry[]).filter((d) => d.count > 0)
                : []
              ).length > 0 ? (
                (Array.isArray(request.denominationsRequested) ? (request.denominationsRequested as DenominationEntry[]) : [])
                  .filter((d) => d.count > 0)
                  .map((d) => (
                    <span key={String(d.value)} className="tabular-nums">
                      {formatDenomLabel(d.value)}×{d.count}
                    </span>
                  ))
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
              <span className="tabular-nums font-medium">
                = {formatCents(request.amountRequested)} LKR
              </span>
              <Button type="button" variant="outline" size="sm" className="ml-auto h-8 gap-1" onClick={matchRequest}>
                <Copy className="h-3.5 w-3.5" />
                Match request
              </Button>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex flex-col items-center">
              <Label className="text-sm font-medium self-start">
                Approved denominations (LKR) – total must be ≤ {formatCents(maxCents)} (requested), you can give less
              </Label>
              <div className="grid grid-cols-2 gap-x-20 gap-y-4 mt-3 w-full max-w-md">
                {LKR_DENOMINATIONS_RUPEES.map((v) => {
                  const count = denoms.find((d) => d.value === v)?.count ?? 0;
                  return (
                    <div key={`rupee-${v}`} className="flex items-center gap-3 min-h-[2.5rem] py-0.5">
                      <span className="tabular-nums text-sm font-medium w-12 shrink-0">{formatDenomLabel(v)}</span>
                      <span className="text-muted-foreground shrink-0">×</span>
                      <div className="flex items-center gap-0.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={() => updateDenomCount(v, Math.max(0, count - 1))}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          min={0}
                          className="h-9 w-16 shrink-0 text-sm text-center tabular-nums"
                          value={count}
                          onChange={(e) => updateDenomCount(v, parseInt(e.target.value, 10) || 0)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={() => updateDenomCount(v, count + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col items-center">
              <Label className="text-sm font-normal text-muted-foreground self-start">Cents (optional)</Label>
              <div className="grid grid-cols-2 gap-x-20 gap-y-4 mt-3 w-full max-w-md">
                {LKR_DENOMINATIONS_CENTS.map((v, i) => {
                  const count = denoms.find((d) => matchDenom(d.value, v))?.count ?? 0;
                  return (
                    <div key={`cent-${i}`} className="flex items-center gap-3 min-h-[2.5rem] py-0.5">
                      <span className="tabular-nums text-sm font-medium w-12 shrink-0">{formatDenomLabel(v)}</span>
                      <span className="text-muted-foreground shrink-0">×</span>
                      <div className="flex items-center gap-0.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={() => updateDenomCount(v, Math.max(0, count - 1))}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          min={0}
                          className="h-9 w-16 shrink-0 text-sm text-center tabular-nums"
                          value={count}
                          onChange={(e) => updateDenomCount(v, parseInt(e.target.value, 10) || 0)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={() => updateDenomCount(v, count + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="border-t pt-3 mt-1 w-full">
              <p className="text-center text-lg font-semibold tabular-nums">
                Total: {formatLKR(totalLKR)} LKR
              </p>
              {totalCents > maxCents && (
                <p className="text-sm text-destructive text-center mt-1">Cannot give more than requested (max {formatCents(maxCents)} LKR)</p>
              )}
              {totalCents > 0 && totalCents <= maxCents && !isGivingLess && (
                <p className="text-sm text-muted-foreground text-center mt-0.5">Within limit</p>
              )}
            </div>
            {isGivingLess && (
              <div className="space-y-2">
                <Label htmlFor="reason-for-less">
                  Reason for giving less than requested <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="reason-for-less"
                  placeholder="e.g. Insufficient 5000 notes available"
                  value={reasonForLess}
                  onChange={(e) => setReasonForLess(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                {totalCents > 0 && totalCents < maxCents && !reasonForLess.trim() && (
                  <p className="text-sm text-destructive">Required when approving less than requested</p>
                )}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!valid || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Approve — {formatLKR(totalLKR)} LKR
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RejectModal({
  request,
  bulkCashierId,
  onClose,
  onError,
  onSuccess,
}: {
  request: FloatRequest;
  bulkCashierId: string;
  onClose: () => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!reason.trim()) return;
    setLoading(true);
    const res = await rejectFloatRequestAction({
      floatRequestId: request.id,
      rejectedBy: bulkCashierId,
      reason: reason.trim(),
    });
    setLoading(false);
    if (res.success && res.message) onSuccess(res.message);
    else onError(res.error ?? 'Failed to reject');
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject float request</DialogTitle>
          <DialogDescription>Provide a reason for rejection (required).</DialogDescription>
        </DialogHeader>
        <Input
          placeholder="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={!reason.trim() || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
