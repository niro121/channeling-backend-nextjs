'use client';

import { useState, useEffect } from 'react';
import {
  getFloatRequestsForBulkCashierAction,
  approveFloatRequestAction,
  rejectFloatRequestAction,
  getCashAccountsForFloatAction,
} from '@/app/actions/float-request.actions';
import { getActiveShiftsWithFloatAction } from '@/app/actions/shift.actions';
import type { FloatRequest, DenominationEntry } from '@/types/float-request';
import type { Account } from '@/types/accounting';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, Copy, Minus, Plus, Clock, MapPin, Banknote } from 'lucide-react';
import { denominationsTotalLKR, lkrToCents, LKR_DENOMINATIONS, LKR_DENOMINATIONS_RUPEES, LKR_DENOMINATIONS_CENTS, formatDenomLabel } from '@/types/float-request';

type BulkCashierContentProps = { bulkCashierId: string };

export function BulkCashierContent({ bulkCashierId }: BulkCashierContentProps) {
  const [requests, setRequests] = useState<FloatRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | undefined>('PENDING');
  const [approveModal, setApproveModal] = useState<FloatRequest | null>(null);
  const [rejectModal, setRejectModal] = useState<FloatRequest | null>(null);
  const [cashAccounts, setCashAccounts] = useState<Account[]>([]);
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
  const { toast } = useToast();

  const loadRequests = () => {
    setLoading(true);
    getFloatRequestsForBulkCashierAction(bulkCashierId, statusFilter ?? undefined)
      .then((res) => {
        if (res.success && res.data) setRequests(res.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRequests();
  }, [bulkCashierId, statusFilter]);

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

  useEffect(() => {
    if (approveModal) {
      getCashAccountsForFloatAction().then((res) => {
        if (res.success && res.data) setCashAccounts(res.data);
      });
    }
  }, [approveModal]);

  return (
    <>
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
                        {(s.floatBalanceCents / 100).toFixed(2)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <h3 className="text-lg font-semibold mb-3">Float requests</h3>
      <div className="flex gap-2 mb-4">
        {(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const).map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(s)}
          >
            {s}
          </Button>
        ))}
        <Button variant="ghost" size="sm" onClick={() => setStatusFilter(undefined)}>
          All
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Requested by</TableHead>
              <TableHead>Amount (LKR)</TableHead>
              <TableHead>Denominations</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              {statusFilter === 'PENDING' && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No requests found.
                </TableCell>
              </TableRow>
            ) : (
              requests.map((fr) => (
                <TableRow key={fr.id}>
                  <TableCell>{fr.requestedBy?.name ?? fr.requestedById}</TableCell>
                  <TableCell>{(fr.amountRequested / 100).toFixed(2)}</TableCell>
                  <TableCell>
                    {fr.denominationsRequested
                      .filter((d) => d.count > 0)
                      .map((d) => `${formatDenomLabel(d.value)}×${d.count}`)
                      .join(', ') || '-'}
                  </TableCell>
                  <TableCell>{new Date(fr.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{fr.status}</TableCell>
                  {statusFilter === 'PENDING' && (
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="default" onClick={() => setApproveModal(fr)}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setRejectModal(fr)}>
                        <XCircle className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      {approveModal && (
        <ApproveModal
          request={approveModal}
          cashAccounts={cashAccounts}
          bulkCashierId={bulkCashierId}
          onClose={() => { setApproveModal(null); loadRequests(); }}
          onError={(msg) => toast({ variant: 'destructive', title: msg })}
          onSuccess={(msg) => { toast({ title: msg }); setApproveModal(null); loadRequests(); loadActiveShifts(); }}
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
    </>
  );
}

function ApproveModal({
  request,
  cashAccounts,
  bulkCashierId,
  onClose,
  onError,
  onSuccess,
}: {
  request: FloatRequest;
  cashAccounts: Account[];
  bulkCashierId: string;
  onClose: () => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}) {
  const [fromAccountId, setFromAccountId] = useState('');
  const [denoms, setDenoms] = useState<DenominationEntry[]>(
    () => LKR_DENOMINATIONS.map((v) => ({ value: v, count: 0 }))
  );
  const [reasonForLess, setReasonForLess] = useState('');
  const [loading, setLoading] = useState(false);

  const matchDenom = (a: number, b: number) => (a >= 1 && b >= 1 ? a === b : Math.abs(a - b) < 1e-6);

  const totalLKR = denominationsTotalLKR(denoms);
  const totalCents = lkrToCents(totalLKR);
  const maxCents = request.amountRequested;
  const isGivingLess = totalCents > 0 && totalCents < maxCents;
  const valid =
    fromAccountId &&
    totalCents > 0 &&
    totalCents <= maxCents &&
    (!isGivingLess || reasonForLess.trim().length > 0);

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
      fromAccountId,
      denominationsApproved,
      reasonForLessThanRequested: isGivingLess ? reasonForLess.trim() : null,
    });
    setLoading(false);
    if (res.success && res.message) onSuccess(res.message);
    else onError(res.error ?? 'Failed to approve');
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Approve float request</DialogTitle>
          <DialogDescription>
            Select the cash account to give float from. You can give up to the requested amount (or less). Cannot give more than requested.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
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
                = {(request.amountRequested / 100).toFixed(2)} LKR
              </span>
              <Button type="button" variant="outline" size="sm" className="ml-auto h-8 gap-1" onClick={matchRequest}>
                <Copy className="h-3.5 w-3.5" />
                Match request
              </Button>
            </div>
          </div>
          <div>
            <Label>From account (source cash)</Label>
            <Select value={fromAccountId} onValueChange={setFromAccountId}>
              <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>
                {cashAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} {a.code ?? ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-4">
            <div className="flex flex-col items-center">
              <Label className="text-sm font-medium self-start">
                Approved denominations (LKR) – total must be ≤ {(maxCents / 100).toFixed(2)} (requested), you can give less
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
                Total: {totalLKR.toFixed(2)} LKR
              </p>
              {totalCents > maxCents && (
                <p className="text-sm text-destructive text-center mt-1">Cannot give more than requested (max {(maxCents / 100).toFixed(2)} LKR)</p>
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
            Approve — {totalLKR.toFixed(2)} LKR
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RejectModal({
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
