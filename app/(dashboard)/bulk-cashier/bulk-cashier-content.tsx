'use client';

import { useState, useEffect } from 'react';
import {
  getFloatRequestsForBulkCashierAction,
  approveFloatRequestAction,
  rejectFloatRequestAction,
  cancelFloatRequestAction,
  getCashAccountsForFloatAction,
} from '@/app/actions/float-request.actions';
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
import { useToast } from '@/components/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, Ban } from 'lucide-react';
import { denominationsTotalLKR, lkrToCents } from '@/types/float-request';

const LKR_DENOMINATIONS = [5000, 2000, 1000, 500, 100, 50, 20, 10];

type BulkCashierContentProps = { bulkCashierId: string };

export function BulkCashierContent({ bulkCashierId }: BulkCashierContentProps) {
  const [requests, setRequests] = useState<FloatRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | undefined>('PENDING');
  const [approveModal, setApproveModal] = useState<FloatRequest | null>(null);
  const [rejectModal, setRejectModal] = useState<FloatRequest | null>(null);
  const [cancelModal, setCancelModal] = useState<FloatRequest | null>(null);
  const [cashAccounts, setCashAccounts] = useState<Account[]>([]);
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

  useEffect(() => {
    if (approveModal) {
      getCashAccountsForFloatAction().then((res) => {
        if (res.success && res.data) setCashAccounts(res.data);
      });
    }
  }, [approveModal]);

  return (
    <>
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
                      .map((d) => `${d.value}×${d.count}`)
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
                      <Button size="sm" variant="outline" onClick={() => setCancelModal(fr)}>
                        <Ban className="h-4 w-4 mr-1" /> Cancel
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
          onSuccess={(msg) => { toast({ title: msg }); setApproveModal(null); loadRequests(); }}
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
      {cancelModal && (
        <CancelModal
          request={cancelModal}
          bulkCashierId={bulkCashierId}
          onClose={() => setCancelModal(null)}
          onError={(msg) => toast({ variant: 'destructive', title: msg })}
          onSuccess={(msg) => { toast({ title: msg }); setCancelModal(null); loadRequests(); }}
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initial = request.denominationsRequested.length
      ? [...request.denominationsRequested]
      : LKR_DENOMINATIONS.map((v) => ({ value: v, count: 0 }));
    const byValue = new Map(initial.map((d) => [d.value, d.count]));
    setDenoms(
      LKR_DENOMINATIONS.map((v) => ({ value: v, count: byValue.get(v) ?? 0 }))
    );
  }, [request.denominationsRequested]);

  const totalLKR = denominationsTotalLKR(denoms);
  const totalCents = lkrToCents(totalLKR);
  const minCents = request.amountRequested;
  const valid = fromAccountId && totalCents >= minCents;

  async function handleSubmit() {
    if (!valid) return;
    setLoading(true);
    const denominationsApproved = denoms.filter((d) => d.count > 0);
    const res = await approveFloatRequestAction({
      floatRequestId: request.id,
      approvedBy: bulkCashierId,
      fromAccountId,
      denominationsApproved,
    });
    setLoading(false);
    if (res.success && res.message) onSuccess(res.message);
    else onError(res.error ?? 'Failed to approve');
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Approve float request</DialogTitle>
          <DialogDescription>
            Select the cash account to give float from. You can adjust denominations (cannot give less than requested).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
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
          <div>
            <Label>Denominations (LKR) – total must be ≥ {(minCents / 100).toFixed(2)}</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {denoms.map((d, i) => (
                <div key={d.value} className="flex items-center gap-2">
                  <span className="w-16">{d.value}</span>
                  <Input
                    type="number"
                    min={0}
                    value={d.count}
                    onChange={(e) => {
                      const next = [...denoms];
                      next[i] = { ...next[i], count: parseInt(e.target.value, 10) || 0 };
                      setDenoms(next);
                    }}
                  />
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Total: {totalLKR.toFixed(2)} LKR {totalCents < minCents && '(must not be less than requested)'}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!valid || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Approve
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

function CancelModal({
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
    const res = await cancelFloatRequestAction({
      floatRequestId: request.id,
      cancelledBy: bulkCashierId,
      reason: reason.trim(),
    });
    setLoading(false);
    if (res.success && res.message) onSuccess(res.message);
    else onError(res.error ?? 'Failed to cancel');
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel float request</DialogTitle>
          <DialogDescription>Provide a reason for cancellation (required).</DialogDescription>
        </DialogHeader>
        <Input
          placeholder="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="outline" onClick={handleSubmit} disabled={!reason.trim() || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Cancel request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
