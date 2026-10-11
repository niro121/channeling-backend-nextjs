'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Badge,
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Textarea
} from '@archmage/ui';
import { CheckCircle2, ChevronRight, Inbox, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationsPrompt } from '@/components/pwa/notifications';
import { HeaderActions } from '../header-actions';
import { getPushConfig, setAppBadge } from '@/lib/pwa/push';
import {
  approveApprovalAction,
  listApprovalsAction,
  rejectApprovalAction,
  withdrawApprovalAction
} from '@/app/actions/approvals.actions';
import {
  APPROVAL_STATUS,
  APPROVAL_TYPE,
  approvalStatusLabel,
  approvalTypeLabel,
  canApproveType,
  type ApprovalAccess,
  type ApprovalItem,
  type ApprovalTypeFilter,
  type ApprovalView
} from '@/types/approvals';

function formatRs(amount: number): string {
  return `Rs. ${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatWhen(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function StatusBadge({ status }: { status: number }) {
  const label = approvalStatusLabel(status);
  if (status === APPROVAL_STATUS.PENDING) return <Badge variant="secondary">{label}</Badge>;
  if (status === APPROVAL_STATUS.APPROVED) return <Badge>{label}</Badge>;
  if (status === APPROVAL_STATUS.REJECTED) return <Badge variant="destructive">{label}</Badge>;
  return <Badge variant="outline">{label}</Badge>;
}

const TYPE_FILTERS: { value: ApprovalTypeFilter; label: string; visible: (a: ApprovalAccess) => boolean }[] = [
  { value: 'all', label: 'All', visible: () => true },
  { value: APPROVAL_TYPE.CHANNEL_CANCEL, label: 'Cancellations', visible: (a) => a.canSeeCancels },
  { value: APPROVAL_TYPE.CHANNEL_REFUND, label: 'Refunds', visible: (a) => a.canSeeRefunds },
  { value: APPROVAL_TYPE.BANK_DEPOSIT, label: 'Bank deposits', visible: (a) => a.canSeeDeposits },
  { value: APPROVAL_TYPE.CASH_VOUCHER, label: 'Cash vouchers', visible: (a) => a.canSeeCashVouchers }
];

/** Already approved, rejected or withdrawn by someone else. */
function isStale(errorCode: string | undefined) {
  return errorCode === 'invalid_state' || errorCode === 'not_found';
}

export function ApprovalsContent({ initialId }: { initialId: string | null }) {
  const router = useRouter();
  const [view, setView] = useState<ApprovalView>('attend');
  const [type, setType] = useState<ApprovalTypeFilter>('all');
  const [rows, setRows] = useState<ApprovalItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [access, setAccess] = useState<ApprovalAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<ApprovalItem | null>(null);
  const [selectedView, setSelectedView] = useState<ApprovalView>('attend');
  const deepLinkHandled = useRef(false);

  const load = useCallback(
    async (nextView: ApprovalView, nextType: ApprovalTypeFilter, nextPage = 1) => {
      if (nextPage === 1) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      const result = await listApprovalsAction({ view: nextView, type: nextType, page: nextPage });
      if (result.success) {
        setAccess(result.access);
        setRows((prev) => (nextPage === 1 ? result.data : [...prev, ...result.data]));
        setTotal(result.total);
        setPage(result.page);
        if (nextView === 'attend' && nextType === 'all') setAppBadge(result.total);
      } else {
        if (result.access) setAccess(result.access);
        setRows([]);
        setTotal(0);
        setError(result.errorCode === 'forbidden' ? "You don't have access to approvals." : result.message);
      }
      setLoading(false);
      setLoadingMore(false);
    },
    []
  );

  // First load, plus a push deep link (?id=…) opening that request.
  useEffect(() => {
    void load(view, type);
    if (!initialId || deepLinkHandled.current) return;
    deepLinkHandled.current = true;
    void (async () => {
      for (const v of ['attend', 'mine'] as const) {
        const result = await listApprovalsAction({ view: v, id: initialId, status: 'all' });
        if (result.success && result.data[0]) {
          setSelectedView(v);
          setSelected(result.data[0]);
          return;
        }
      }
      setNotice('That request has already been handled.');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeView = (next: ApprovalView) => {
    if (next === view) return;
    setView(next);
    void load(next, type);
  };

  const changeType = (next: ApprovalTypeFilter) => {
    if (next === type) return;
    setType(next);
    void load(view, next);
  };

  const closeSheet = () => {
    setSelected(null);
    if (initialId) router.replace('/approvals', { scroll: false });
  };

  const onDone = (id: string, message: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    setTotal((t) => Math.max(0, t - 1));
    if (selectedView === 'attend') void getPushConfig().then((c) => typeof c.badge === 'number' && setAppBadge(c.badge)).catch(() => {});
    setNotice(message);
    closeSheet();
  };

  const showTabs = access ? access.canAttend && access.canSeeMine : true;
  const typeFilters = access ? TYPE_FILTERS.filter((f) => f.visible(access)) : TYPE_FILTERS.slice(0, 1);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <HeaderActions>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Refresh"
          disabled={loading}
          onClick={() => void load(view, type)}
        >
          <RefreshCw className={cn('h-5 w-5', loading && 'animate-spin')} />
        </Button>
      </HeaderActions>

      <NotificationsPrompt />

      {showTabs && (
        <div className="grid grid-cols-2 rounded-xl bg-muted p-1 text-sm font-medium" role="tablist">
          {(['attend', 'mine'] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => changeView(v)}
              className={cn(
                'rounded-lg py-2 transition-colors',
                view === v ? 'bg-background shadow-sm' : 'text-muted-foreground'
              )}
            >
              {v === 'attend' ? 'To attend' : 'Mine'}
            </button>
          ))}
        </div>
      )}

      {typeFilters.length > 2 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {typeFilters.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => changeType(f.value)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors',
                type === f.value ? 'border-primary bg-primary text-primary-foreground' : 'bg-background'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {notice && (
        <div className="flex items-start justify-between gap-3 rounded-xl border bg-card p-3 text-sm">
          <span>{notice}</span>
          <button type="button" className="text-muted-foreground" onClick={() => setNotice(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">{error}</div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          <Inbox className="h-8 w-8" />
          {view === 'attend' ? 'Nothing waiting for approval.' : 'You have no open requests.'}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => {
                  setSelectedView(view);
                  setSelected(row);
                }}
                className="flex w-full items-center gap-3 rounded-2xl border bg-card p-4 text-left transition-colors active:bg-muted"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{approvalTypeLabel(row.type)}</Badge>
                    {view === 'mine' && <StatusBadge status={row.status} />}
                  </div>
                  <p className="mt-2 truncate font-medium">{row.detailTitle}</p>
                  <p className="truncate text-sm text-muted-foreground">{row.detailSub}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {view === 'attend' ? `${row.requestedByName} · ` : ''}
                    {formatWhen(row.requestedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span className="font-semibold tabular-nums">{formatRs(row.amount)}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading && rows.length < total && (
        <Button
          type="button"
          variant="outline"
          disabled={loadingMore}
          onClick={() => void load(view, type, page + 1)}
        >
          {loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Load more
        </Button>
      )}

      <ApprovalSheet
        item={selected}
        view={selectedView}
        access={access}
        onClose={closeSheet}
        onDone={onDone}
        onStale={(id) => {
          setRows((prev) => prev.filter((r) => r.id !== id));
          setNotice('That request was already handled by someone else.');
          closeSheet();
        }}
      />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === '' || value === '—') return null;
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right">{value}</span>
    </div>
  );
}

function ApprovalSheet({
  item,
  view,
  access,
  onClose,
  onDone,
  onStale
}: {
  item: ApprovalItem | null;
  view: ApprovalView;
  access: ApprovalAccess | null;
  onClose: () => void;
  onDone: (id: string, message: string) => void;
  onStale: (id: string) => void;
}) {
  const [mode, setMode] = useState<'view' | 'approve' | 'reject'>('view');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMode('view');
    setReason('');
    setError(null);
  }, [item?.id]);

  if (!item) return null;

  const isChannel = item.type === APPROVAL_TYPE.CHANNEL_CANCEL || item.type === APPROVAL_TYPE.CHANNEL_REFUND;
  const isPending = item.status === APPROVAL_STATUS.PENDING;
  const canDecide = view === 'attend' && isPending && canApproveType(access, item.type);
  const canWithdraw = view === 'mine' && isPending;

  const run = async (
    action: () => Promise<{ success: boolean; errorCode?: string; message?: string }>,
    doneMessage: string
  ) => {
    setBusy(true);
    setError(null);
    const result = await action();
    setBusy(false);
    if (result.success) {
      onDone(item.id, doneMessage);
    } else if (isStale(result.errorCode)) {
      onStale(item.id);
    } else {
      setError(result.message ?? 'Something went wrong.');
    }
  };

  return (
    <Sheet open onOpenChange={(open) => !open && !busy && onClose()}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
      >
        <SheetHeader className="text-left">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{approvalTypeLabel(item.type)}</Badge>
            <StatusBadge status={item.status} />
          </div>
          <SheetTitle className="text-2xl tabular-nums">{formatRs(item.amount)}</SheetTitle>
          <SheetDescription>
            {item.detailTitle}
            {item.detailSub ? ` · ${item.detailSub}` : ''}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 divide-y">
          <DetailRow label="Requested by" value={item.requestedByName} />
          <DetailRow label="Requested" value={formatWhen(item.requestedAt)} />
          {isChannel && (
            <>
              <DetailRow label="Patient" value={item.patientName} />
              <DetailRow label="Doctor" value={item.doctorName} />
              <DetailRow label="Session" value={item.sessionLabel} />
              <DetailRow label="Bill no" value={item.billNo} />
              <DetailRow label="Booking" value={item.paymentMethodName} />
              <DetailRow label="Paid by" value={item.paymentTypeName} />
              <DetailRow label="Refund to" value={item.refundMethodName} />
              {item.type === APPROVAL_TYPE.CHANNEL_REFUND && (
                <>
                  <DetailRow label="Professional fee" value={formatRs(item.professionalFee)} />
                  <DetailRow label="Hospital fee" value={formatRs(item.hospitalFee)} />
                </>
              )}
            </>
          )}
          {!isChannel && <DetailRow label="Payment types" value={item.paymentTypeName} />}
          <DetailRow label="Receipt" value={item.receiptNoString} />
          <DetailRow label="Remarks" value={item.remarks} />
          {item.checkedConfirmations.length > 0 && (
            <DetailRow label="Confirmed" value={item.checkedConfirmations.join(', ')} />
          )}
          {item.approvedByName && (
            <DetailRow label="Approved" value={`${item.approvedByName} · ${formatWhen(item.approvedAt)}`} />
          )}
          {item.rejectedByName && (
            <DetailRow label="Rejected" value={`${item.rejectedByName} · ${formatWhen(item.rejectedAt)}`} />
          )}
          <DetailRow label="Reject reason" value={item.rejectReason} />
        </div>

        {item.slipImageUrl && (
          <a href={item.slipImageUrl} target="_blank" rel="noreferrer" className="mt-4 block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${item.slipImageUrl}?size=thumb`}
              alt="Deposit slip"
              className="max-h-64 w-full rounded-xl border object-contain"
            />
          </a>
        )}

        {error && <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

        {canDecide && mode === 'view' && (
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button type="button" variant="outline" className="h-12" onClick={() => setMode('reject')}>
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button type="button" className="h-12" onClick={() => setMode('approve')}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve
            </Button>
          </div>
        )}

        {canDecide && mode === 'approve' && (
          <div className="mt-6 flex flex-col gap-3 rounded-xl border p-4">
            <p className="text-sm">
              Approve this {approvalTypeLabel(item.type).toLowerCase()} for{' '}
              <span className="font-semibold">{formatRs(item.amount)}</span>?
              {(item.type === APPROVAL_TYPE.BANK_DEPOSIT || item.type === APPROVAL_TYPE.CASH_VOUCHER) &&
                ' This posts it to the ledger straight away.'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="outline" className="h-12" disabled={busy} onClick={() => setMode('view')}>
                Back
              </Button>
              <Button
                type="button"
                className="h-12"
                disabled={busy}
                onClick={() => void run(() => approveApprovalAction(item.id), 'Request approved.')}
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm approve
              </Button>
            </div>
          </div>
        )}

        {canDecide && mode === 'reject' && (
          <div className="mt-6 flex flex-col gap-3 rounded-xl border p-4">
            <label htmlFor="reject-reason" className="text-sm font-medium">
              Reason for rejecting
            </label>
            <Textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="The requester will see this"
              autoFocus
            />
            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="outline" className="h-12" disabled={busy} onClick={() => setMode('view')}>
                Back
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="h-12"
                disabled={busy || !reason.trim()}
                onClick={() => void run(() => rejectApprovalAction(item.id, reason.trim()), 'Request rejected.')}
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm reject
              </Button>
            </div>
          </div>
        )}

        {canWithdraw && (
          <Button
            type="button"
            variant="outline"
            className="mt-6 h-12 w-full"
            disabled={busy}
            onClick={() => void run(() => withdrawApprovalAction(item.id), 'Request withdrawn.')}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Withdraw request
          </Button>
        )}
      </SheetContent>
    </Sheet>
  );
}
