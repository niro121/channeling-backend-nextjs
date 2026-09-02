"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DateRangePicker } from "@/components/common/date-range-picker"
import { useToast } from "@/components/hooks/use-toast"
import {
  approveApprovalRequestAction,
  listApprovalRequestsAction,
  rejectApprovalRequestAction,
  withdrawApprovalRequestAction,
} from "@/app/actions/approval.actions"
import type {
  ApprovalAccess,
  ApprovalListTypeFilter,
  ApprovalListView,
} from "@/services/approval-request.service"
import {
  APPROVAL_REQUEST_STATUS,
  APPROVAL_REQUEST_TYPE,
  approvalRequestStatusLabel,
  type ApprovalRequestListItem,
  type ApprovalRequestStatus,
} from "@/types/approval-request"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Search,
} from "lucide-react"
import Link from "next/link"

function actionError(result: { success?: boolean; message?: string } | undefined | null): string {
  if (!result || result.success) return "Something went wrong."
  return result.message ?? "Something went wrong."
}

function formatRs(amount: number): string {
  return `Rs. ${Number(amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function statusBadge(status: ApprovalRequestStatus) {
  if (status === APPROVAL_REQUEST_STATUS.PENDING) return <Badge variant="secondary">Pending</Badge>
  if (status === APPROVAL_REQUEST_STATUS.APPROVED) return <Badge>Approved</Badge>
  if (status === APPROVAL_REQUEST_STATUS.REJECTED) return <Badge variant="destructive">Rejected</Badge>
  if (status === APPROVAL_REQUEST_STATUS.WITHDRAWN) return <Badge variant="outline">Withdrawn</Badge>
  if (status === APPROVAL_REQUEST_STATUS.COMPLETED) return <Badge variant="outline">Completed</Badge>
  return <Badge variant="outline">{approvalRequestStatusLabel(status)}</Badge>
}

function typeLabel(type: string) {
  if (type === APPROVAL_REQUEST_TYPE.CHANNEL_CANCEL) return "Cancel"
  if (type === APPROVAL_REQUEST_TYPE.BANK_DEPOSIT) return "Bank deposit"
  return "Refund"
}

function ListPagination({
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
}: {
  page: number
  limit: number
  total: number
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}) {
  const pageCount = Math.max(1, Math.ceil(total / limit))
  const canPrev = page > 1
  const canNext = page < pageCount

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-2">
      <p className="text-sm text-muted-foreground">
        {total === 0
          ? "No results"
          : `Showing ${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total}`}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium whitespace-nowrap">Rows per page</span>
          <Select
            value={String(limit)}
            onValueChange={(v) => onLimitChange(Number(v))}
          >
            <SelectTrigger className="h-8 w-16">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 50].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={!canPrev}
            onClick={() => onPageChange(1)}
            aria-label="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={!canPrev}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm tabular-nums px-2">
            {page} / {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={!canNext}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={!canNext}
            onClick={() => onPageChange(pageCount)}
            aria-label="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function ApprovalCenterContent({
  initialAccess,
  initialView,
  initialRows,
  initialTotal,
}: {
  initialAccess: ApprovalAccess
  initialView: ApprovalListView
  initialRows: ApprovalRequestListItem[]
  initialTotal: number
}) {
  const { data: session } = useSession()
  const currentUserId = session?.user?.id ?? null
  const { toast } = useToast()
  const access = initialAccess
  const [view, setView] = useState<ApprovalListView>(initialView)
  const [typeFilter, setTypeFilter] = useState<ApprovalListTypeFilter>("all")
  const [statusFilter, setStatusFilter] = useState<"open" | "all">("open")
  const [dateFrom, setDateFrom] = useState<string | undefined>()
  const [dateTo, setDateTo] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(initialTotal)
  const [rows, setRows] = useState<ApprovalRequestListItem[]>(initialRows)
  const [loading, setLoading] = useState(false)
  const [actingId, setActingId] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<ApprovalRequestListItem | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [slipPreview, setSlipPreview] = useState<ApprovalRequestListItem | null>(null)

  async function loadRows(overrides?: {
    view?: ApprovalListView
    type?: ApprovalListTypeFilter
    status?: "open" | "all"
    dateFrom?: string | null
    dateTo?: string | null
    page?: number
    limit?: number
  }) {
    const nextView = overrides?.view ?? view
    const nextType = overrides?.type ?? typeFilter
    const nextStatus = overrides?.status ?? statusFilter
    const nextFrom = "dateFrom" in (overrides ?? {}) ? overrides?.dateFrom : dateFrom
    const nextTo = "dateTo" in (overrides ?? {}) ? overrides?.dateTo : dateTo
    const nextPage = overrides?.page ?? page
    const nextLimit = overrides?.limit ?? limit
    setLoading(true)
    try {
      const res = await listApprovalRequestsAction({
        view: nextView,
        type: nextType,
        status: nextStatus,
        dateFrom: nextFrom ?? null,
        dateTo: nextTo ?? null,
        page: nextPage,
        limit: nextLimit,
      })
      if (res?.success) {
        setRows(res.data)
        setTotal(res.total)
        if (res.page !== nextPage) setPage(res.page)
      } else {
        toast({ title: "Error", description: actionError(res), variant: "destructive" })
        setRows([])
        setTotal(0)
      }
    } catch {
      toast({ title: "Error", description: "Could not load requests.", variant: "destructive" })
      setRows([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  function changeView(next: ApprovalListView) {
    setView(next)
    setPage(1)
    void loadRows({ view: next, page: 1 })
  }
  function changeType(next: ApprovalListTypeFilter) {
    setTypeFilter(next)
    setPage(1)
  }
  function changeStatus(next: "open" | "all") {
    setStatusFilter(next)
    setPage(1)
  }
  function changeDates(range: { from?: string; to?: string }) {
    setDateFrom(range.from)
    setDateTo(range.to)
    setPage(1)
  }
  function changeLimit(next: number) {
    setLimit(next)
    setPage(1)
    void loadRows({ limit: next, page: 1 })
  }
  function handleSearch() {
    setPage(1)
    void loadRows({ page: 1 })
  }

  async function handleApprove(row: ApprovalRequestListItem) {
    setActingId(row.id)
    try {
      const result = await approveApprovalRequestAction(row.id)
      if (result?.success) {
        toast({
          title: "Approved",
          description:
            row.type === APPROVAL_REQUEST_TYPE.BANK_DEPOSIT
              ? `Posted to ledger${result.data?.receiptNoString ? ` as ${result.data.receiptNoString}` : ""}.`
              : "The requester can now complete this on the booking.",
        })
        await loadRows()
      } else {
        toast({ title: "Error", description: actionError(result), variant: "destructive" })
      }
    } finally {
      setActingId(null)
    }
  }

  async function handleReject() {
    if (!rejectTarget) return
    setActingId(rejectTarget.id)
    try {
      const result = await rejectApprovalRequestAction(rejectTarget.id, rejectReason)
      if (result?.success) {
        toast({ title: "Rejected", description: "The requester has been notified." })
        setRejectTarget(null)
        setRejectReason("")
        await loadRows()
      } else {
        toast({ title: "Error", description: actionError(result), variant: "destructive" })
      }
    } finally {
      setActingId(null)
    }
  }

  async function handleWithdraw(row: ApprovalRequestListItem) {
    setActingId(row.id)
    try {
      const result = await withdrawApprovalRequestAction(row.id)
      if (result?.success) {
        toast({ title: "Withdrawn", description: "The request was withdrawn." })
        await loadRows()
      } else {
        toast({ title: "Error", description: actionError(result), variant: "destructive" })
      }
    } finally {
      setActingId(null)
    }
  }

  const showViewToggle = access.canAttend && access.canSeeMine
  const showCancelType = view === "mine" || access.canSeeCancels
  const showRefundType = view === "mine" || access.canSeeRefunds
  const showDepositType = view === "mine" || access.canSeeDeposits

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Approval Center</h1>
        <p className="text-sm text-muted-foreground">
          {view === "attend"
            ? "Pending requests waiting for approval. Bank deposits post to the ledger when you approve."
            : "Requests you have sent."}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {showViewToggle && (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={view === "attend" ? "default" : "outline"}
              onClick={() => changeView("attend")}
            >
              To attend
            </Button>
            <Button
              size="sm"
              variant={view === "mine" ? "default" : "outline"}
              onClick={() => changeView("mine")}
            >
              My requests
            </Button>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Date</span>
          <div className="flex items-center gap-1">
            <DateRangePicker from={dateFrom} to={dateTo} onChange={changeDates} />
            {(dateFrom || dateTo) && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => changeDates({})}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Type</span>
          <Select
            value={typeFilter}
            onValueChange={(v) => changeType(v as ApprovalListTypeFilter)}
          >
            <SelectTrigger className="h-10 w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {showCancelType && (
                <SelectItem value={APPROVAL_REQUEST_TYPE.CHANNEL_CANCEL}>Cancellations</SelectItem>
              )}
              {showRefundType && (
                <SelectItem value={APPROVAL_REQUEST_TYPE.CHANNEL_REFUND}>Refunds</SelectItem>
              )}
              {showDepositType && (
                <SelectItem value={APPROVAL_REQUEST_TYPE.BANK_DEPOSIT}>Bank deposits</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        {view === "mine" && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Status</span>
            <Select
              value={statusFilter}
              onValueChange={(v) => changeStatus(v as "open" | "all")}
            >
              <SelectTrigger className="h-10 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <Button
          type="button"
          className="h-10 shrink-0 gap-2 self-end"
          disabled={loading}
          onClick={() => void handleSearch()}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Search
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {view === "attend"
            ? "Nothing waiting for approval."
            : "You have not sent any requests in this range."}
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="p-2 font-medium">Requested</th>
                <th className="p-2 font-medium">Type</th>
                <th className="p-2 font-medium">Details</th>
                <th className="p-2 font-medium">Amount</th>
                <th className="p-2 font-medium">Status</th>
                <th className="p-2 font-medium">Remarks</th>
                <th className="p-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isOwn = row.requestedById === currentUserId
                const isDeposit = row.type === APPROVAL_REQUEST_TYPE.BANK_DEPOSIT
                const canActOnType =
                  (row.type === APPROVAL_REQUEST_TYPE.CHANNEL_CANCEL && access.canApproveCancel) ||
                  (row.type === APPROVAL_REQUEST_TYPE.CHANNEL_REFUND && access.canApproveRefund) ||
                  (isDeposit && access.canApproveBankDeposit)
                const canApprove =
                  !isOwn && row.status === APPROVAL_REQUEST_STATUS.PENDING && canActOnType
                const canReject =
                  !isOwn &&
                  canActOnType &&
                  (row.status === APPROVAL_REQUEST_STATUS.PENDING ||
                    (!isDeposit && row.status === APPROVAL_REQUEST_STATUS.APPROVED))
                const canWithdraw =
                  isOwn &&
                  (row.status === APPROVAL_REQUEST_STATUS.PENDING ||
                    (!isDeposit && row.status === APPROVAL_REQUEST_STATUS.APPROVED))
                return (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="p-2">
                      <div>{row.requestedByName}</div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(row.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="p-2">{typeLabel(row.type)}</td>
                    <td className="p-2">
                      <div>{row.detailTitle}</div>
                      <div className="text-xs text-muted-foreground">{row.detailSub}</div>
                      {isDeposit && row.slipImageUrl && (
                        <button
                          type="button"
                          className="mt-1.5 flex items-center gap-2 rounded-md border bg-muted/40 p-1 pr-2 text-left hover:bg-muted"
                          onClick={() => setSlipPreview(row)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`${row.slipImageUrl}?size=thumb`}
                            alt="Deposit slip"
                            className="h-10 w-10 rounded object-cover"
                          />
                          <span className="text-xs font-medium">View slip</span>
                        </button>
                      )}
                    </td>
                    <td className="p-2 whitespace-nowrap">{formatRs(row.amount)}</td>
                    <td className="p-2">{statusBadge(row.status)}</td>
                    <td className="p-2 max-w-[220px]">
                      <p className="truncate" title={row.remarks}>{row.remarks}</p>
                      {row.rejectReason ? (
                        <p className="text-xs text-destructive truncate" title={row.rejectReason}>
                          Rejected: {row.rejectReason}
                        </p>
                      ) : null}
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex flex-wrap gap-1 justify-end">
                          {canApprove && (
                            <Button
                              size="sm"
                              disabled={actingId === row.id}
                              onClick={() => void handleApprove(row)}
                            >
                              Approve
                            </Button>
                          )}
                          {canReject && (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={actingId === row.id}
                              onClick={() => {
                                setRejectTarget(row)
                                setRejectReason("")
                              }}
                            >
                              Reject
                            </Button>
                          )}
                          {canWithdraw && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actingId === row.id}
                              onClick={() => void handleWithdraw(row)}
                            >
                              Withdraw
                            </Button>
                          )}
                          {row.status === APPROVAL_REQUEST_STATUS.APPROVED && isOwn && !isDeposit && (
                            <Button size="sm" variant="secondary" asChild>
                              <Link href="/channel-booking">Complete on booking</Link>
                            </Button>
                          )}
                          {isDeposit && row.receiptId && (
                            <Button size="sm" variant="secondary" asChild>
                              <Link href={`/ledger/${row.receiptId}/edit`}>View receipt</Link>
                            </Button>
                          )}
                        </div>
                        {isOwn && row.status === APPROVAL_REQUEST_STATUS.PENDING && (
                          <p className="text-xs text-muted-foreground text-right">
                            Another user must approve this.
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <ListPagination
        page={page}
        limit={limit}
        total={total}
        onPageChange={(nextPage) => {
          setPage(nextPage)
          void loadRows({ page: nextPage })
        }}
        onLimitChange={changeLimit}
      />

      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null)
            setRejectReason("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject request</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Why is this being rejected?"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || actingId === rejectTarget?.id}
              onClick={() => void handleReject()}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!slipPreview}
        onOpenChange={(open) => {
          if (!open) setSlipPreview(null)
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {slipPreview?.detailTitle ? `Deposit slip · ${slipPreview.detailTitle}` : "Deposit slip"}
            </DialogTitle>
          </DialogHeader>
          {slipPreview?.slipImageUrl && (
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slipPreview.slipImageUrl}
                alt="Deposit slip"
                className="max-h-[70vh] w-full rounded-md border object-contain bg-muted"
              />
              <div className="flex justify-end">
                <Button asChild type="button" size="sm" variant="outline">
                  <a href={slipPreview.slipImageUrl} target="_blank" rel="noopener noreferrer">
                    Open full size
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
