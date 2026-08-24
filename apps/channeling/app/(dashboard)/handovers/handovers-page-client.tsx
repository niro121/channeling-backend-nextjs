"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  getHandoversToMeAction,
  getHandoversApprovedByMeNotReconciledAction,
  getMyHandoverHistoryAction,
  getHandoverFromUserFilterOptionsAction,
} from "@/app/actions/shift.actions"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DateRangePicker } from "@/components/common/date-range-picker"
import { Combobox } from "@/components/common/combobox"
import { FilterWrapper } from "@/app/(dashboard)/filter-wrapper"
import { Input } from "@/components/ui/input"
import { formatCents } from "@/lib/format-money"
import {
  buildCashierSummaryReportUrl,
  deriveHandoverCashierSummaryFilters,
} from "@/lib/handover-utils"
import { HANDOVER_STATUS, RECONCILIATION_STATUS } from "@/types/handover"
import {
  Loader2,
  Eye,
  FileCheck,
  FileText,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import { usePermissions } from "@/components/hooks/use-permissions"
import { useToast } from "@/components/hooks/use-toast"

type HandoverRow = {
  id: string
  fromUserId?: string
  status?: number
  cashCents: number
  cardCents: number
  slipCents: number
  checkCents: number
  creditCents: number
  eWalletCents: number
  totalCents: number
  discrepancyReason: string | null
  createdAt: Date | string
  approvedAt?: Date | string | null
  rejectedAt?: Date | string | null
  reconciliationStatus?: number | null
  reconciliationAssignedToUserId?: string | null
  nonCashReconciledAt?: Date | string | null
  forwardedToHandoverId?: string | null
  handoverNoString?: string | null
  direction?: "given" | "received"
  fromUser: { id: string; name: string | null; staff?: { code: string } | null }
  toUser?: { id: string; name: string | null; staff?: { code: string } | null } | null
  shift: {
    id: string
    startedAt: Date | string
    userId: string
    user: { id: string; name: string | null }
  }
}

type UserOption = { id: string; name: string }

function totalCents(h: HandoverRow): number {
  return (
    h.cashCents +
    h.cardCents +
    h.slipCents +
    h.checkCents +
    h.creditCents +
    h.eWalletCents
  )
}

function fromUserLabel(fromUser: HandoverRow["fromUser"] | null | undefined): string {
  if (!fromUser) return "—"
  const name = fromUser.name ?? "—"
  return fromUser.staff?.code ? `${name} (${fromUser.staff.code})` : name
}

function statusLabel(status: number | undefined): string {
  if (status === HANDOVER_STATUS.APPROVED) return "Approved"
  if (status === HANDOVER_STATUS.REJECTED) return "Rejected"
  if (status === HANDOVER_STATUS.CANCELLED) return "Cancelled"
  if (status === HANDOVER_STATUS.PENDING) return "Pending"
  return "—"
}

function statusBadgeVariant(
  status: number | undefined
): "default" | "secondary" | "destructive" | "outline" {
  if (status === HANDOVER_STATUS.APPROVED) return "default"
  if (status === HANDOVER_STATUS.REJECTED) return "destructive"
  return "secondary"
}

function reportUrlForHandover(h: HandoverRow): string | null {
  const filters = deriveHandoverCashierSummaryFilters({
    fromUserId: h.fromUserId ?? h.fromUser?.id ?? h.shift?.userId ?? "",
    createdAt: h.createdAt,
    shift: h.shift,
  })
  return filters ? buildCashierSummaryReportUrl(filters, "detail") : null
}

function needsSendToReconciliation(h: HandoverRow): boolean {
  if (h.status !== HANDOVER_STATUS.APPROVED) return false
  if (h.nonCashReconciledAt != null) return false
  if (h.forwardedToHandoverId != null) return false
  const recon = h.reconciliationStatus ?? RECONCILIATION_STATUS.PENDING
  if (recon === RECONCILIATION_STATUS.PENDING) return true
  if (recon === RECONCILIATION_STATUS.RECONCILED_REJECTED) return true
  // Already marked in recon but no assignee (legacy auto-send)
  if (recon === RECONCILIATION_STATUS.IN_RECONCILIATION && !h.reconciliationAssignedToUserId) return true
  return false
}

function HandoverTable({
  rows,
  emptyMessage,
  showStatus,
  showReport,
  showSendToReconciliation,
  showDirection,
}: {
  rows: HandoverRow[]
  emptyMessage: string
  showStatus?: boolean
  showReport?: boolean
  showSendToReconciliation?: boolean
  showDirection?: boolean
}) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground py-8">{emptyMessage}</p>
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Bill No</TableHead>
            {showDirection && <TableHead>Direction</TableHead>}
            <TableHead>From</TableHead>
            {showDirection && <TableHead>To</TableHead>}
            <TableHead>Shift started</TableHead>
            <TableHead>Total</TableHead>
            {showStatus && <TableHead>Status</TableHead>}
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((h) => {
            const reportUrl = showReport ? reportUrlForHandover(h) : null
            const canSend =
              showSendToReconciliation && h.direction !== "given" && needsSendToReconciliation(h)
            return (
              <TableRow key={h.id}>
                <TableCell className="tabular-nums whitespace-nowrap">{h.handoverNoString ?? "—"}</TableCell>
                {showDirection && (
                  <TableCell>
                    <Badge variant={h.direction === "given" ? "outline" : "secondary"}>
                      {h.direction === "given" ? "Given" : "Received"}
                    </Badge>
                  </TableCell>
                )}
                <TableCell>{fromUserLabel(h.fromUser)}</TableCell>
                {showDirection && <TableCell>{fromUserLabel(h.toUser)}</TableCell>}
                <TableCell>
                  {h.shift?.startedAt ? new Date(h.shift.startedAt).toLocaleString() : "—"}
                </TableCell>
                <TableCell className="tabular-nums">LKR {formatCents(totalCents(h))}</TableCell>
                {showStatus && (
                  <TableCell>
                    <Badge variant={statusBadgeVariant(h.status)}>{statusLabel(h.status)}</Badge>
                  </TableCell>
                )}
                <TableCell>
                  {h.createdAt ? new Date(h.createdAt).toLocaleString() : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/handovers/${h.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Link>
                    </Button>
                    {canSend && (
                      <Button size="sm" asChild>
                        <Link href={`/handovers/${h.id}`}>
                          <FileCheck className="h-4 w-4 mr-1" />
                          Send to reconciliation
                        </Link>
                      </Button>
                    )}
                    {reportUrl && (
                      <Button size="sm" variant="secondary" asChild>
                        <Link href={reportUrl} target="_blank" rel="noopener noreferrer">
                          <FileText className="h-4 w-4 mr-1" />
                          Report
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function CompletedPagination({
  page,
  limit,
  totalRecords,
  onPageChange,
  onLimitChange,
}: {
  page: number
  limit: number
  totalRecords: number
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}) {
  const pageCount = Math.max(1, Math.ceil(totalRecords / limit))
  const canPrev = page > 1
  const canNext = page < pageCount

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-2">
      <p className="text-sm text-muted-foreground">
        {totalRecords === 0
          ? "No results"
          : `Showing ${(page - 1) * limit + 1}–${Math.min(page * limit, totalRecords)} of ${totalRecords}`}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium whitespace-nowrap">Rows per page</span>
          <Select value={String(limit)} onValueChange={(v) => onLimitChange(Number(v))}>
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

export default function HandoversPageClient() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const tab = tabParam === "history" || tabParam === "completed" ? "history" : "active"
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20))
  const dateFrom = searchParams.get("dateFrom") ?? ""
  const dateTo = searchParams.get("dateTo") ?? ""
  const otherUserId = searchParams.get("otherUserId") ?? searchParams.get("fromUserId") ?? "__all__"
  const direction = searchParams.get("direction") ?? "__all__"
  const statusFilter = searchParams.get("status") ?? "__all__"
  const search = searchParams.get("q") ?? ""

  const [list, setList] = useState<HandoverRow[]>([])
  const [approvedNotReconciledList, setApprovedNotReconciledList] = useState<HandoverRow[]>([])
  const [completedList, setCompletedList] = useState<HandoverRow[]>([])
  const [completedTotal, setCompletedTotal] = useState(0)
  const [userOptions, setUserOptions] = useState<UserOption[]>([])
  const [loadingActive, setLoadingActive] = useState(true)
  const [loadingCompleted, setLoadingCompleted] = useState(false)
  const { has: hasPermission } = usePermissions()
  const { toast } = useToast()
  const canSendToReconciliation = hasPermission("reconciliation", "submit-for-reconciliation")

  const setParams = useCallback(
    (patch: Record<string, string | null | undefined>, resetPage = false) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(patch)) {
        if (value == null || value === "" || value === "__all__") params.delete(key)
        else params.set(key, value)
      }
      if (resetPage) params.set("page", "1")
      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const setTab = (next: string) => {
    if (next === "history") {
      router.push(`${pathname}?tab=history&page=1&limit=${limit}`, { scroll: false })
    } else {
      router.push(pathname, { scroll: false })
    }
  }

  const fetchActive = useCallback(() => {
    setLoadingActive(true)
    const promises: Promise<void>[] = [
      getHandoversToMeAction().then((res) => {
        if (res.success && res.data) setList(res.data as HandoverRow[])
        else setList([])
        if (!res.success && "message" in res && res.message) {
          toast({ variant: "destructive", title: "Error", description: res.message })
        }
      }),
    ]
    if (canSendToReconciliation) {
      promises.push(
        getHandoversApprovedByMeNotReconciledAction().then((res) => {
          if (res.success && res.data) setApprovedNotReconciledList(res.data as HandoverRow[])
          else setApprovedNotReconciledList([])
          if (!res.success && "message" in res && res.message) {
            toast({ variant: "destructive", title: "Error", description: res.message })
          }
        })
      )
    } else {
      setApprovedNotReconciledList([])
    }
    Promise.all(promises).finally(() => setLoadingActive(false))
  }, [canSendToReconciliation, toast])

  const fetchHistory = useCallback(() => {
    setLoadingCompleted(true)
    getMyHandoverHistoryAction({
      page,
      limit,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      direction: direction !== "__all__" ? direction : null,
      status: statusFilter !== "__all__" ? statusFilter : null,
      otherUserId: otherUserId !== "__all__" ? otherUserId : null,
      search: search || null,
    })
      .then((res) => {
        if (res.success) {
          setCompletedList(res.data as HandoverRow[])
          setCompletedTotal(res.totalRecords)
        } else {
          setCompletedList([])
          setCompletedTotal(0)
          if (res.message) {
            toast({ variant: "destructive", title: "Error", description: res.message })
          }
        }
      })
      .finally(() => setLoadingCompleted(false))
  }, [page, limit, dateFrom, dateTo, direction, statusFilter, otherUserId, search, toast])

  useEffect(() => {
    fetchActive()
    getHandoverFromUserFilterOptionsAction()
      .then((res) => {
        if (res.success && res.data) setUserOptions(res.data)
        else setUserOptions([])
      })
      .catch(() => setUserOptions([]))
  }, [fetchActive])

  useEffect(() => {
    if (tab !== "history") return
    fetchHistory()
  }, [tab, fetchHistory])

  useEffect(() => {
    const onFocus = () => {
      fetchActive()
      if (tab === "history") fetchHistory()
    }
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [fetchActive, fetchHistory, tab])

  const pendingCount = list.length
  const reconCount = approvedNotReconciledList.length

  const otherUserOptions = useMemo(
    () => [{ id: "__all__", name: "All people" }, ...userOptions],
    [userOptions]
  )
  const directionOptions = useMemo(
    () => [
      { id: "__all__", name: "All (given & received)" },
      { id: "given", name: "Given by me" },
      { id: "received", name: "Received by me" },
    ],
    []
  )
  const statusOptions = useMemo(
    () => [
      { id: "__all__", name: "All statuses" },
      { id: "pending", name: "Pending" },
      { id: "approved", name: "Approved" },
      { id: "rejected", name: "Rejected" },
      { id: "cancelled", name: "Cancelled" },
    ],
    []
  )

  const pageTitle = tab === "history" ? "Handover history" : "Handed over to me"

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{pageTitle}</h1>
        <p className="text-muted-foreground">
          {tab === "history"
            ? "Handovers you gave and received. Search by bill no, name, or staff code. Open View to see detail and print."
            : "Pending handovers waiting for your approval. Approved ones that still need reconciliation appear below."}
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="active">
            Handovers
            {pendingCount > 0 ? ` (${pendingCount})` : ""}
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-8 mt-4">
          {loadingActive ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <HandoverTable rows={list} emptyMessage="No pending handovers." />

              {canSendToReconciliation && (
                <div className="space-y-3 pt-2 border-t">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <FileCheck className="h-5 w-5" />
                      Need to send to reconciliation
                      {reconCount > 0 ? ` (${reconCount})` : ""}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Handovers you approved that are not yet in reconciliation. Use{" "}
                      <strong>Send to reconciliation</strong> and choose who should reconcile them.
                    </p>
                  </div>
                  <HandoverTable
                    rows={approvedNotReconciledList}
                    emptyMessage="None."
                    showReport
                    showSendToReconciliation
                  />
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <FilterWrapper
              initialValues={{
                dateFrom,
                dateTo,
                otherUserId,
                direction,
                status: statusFilter,
                q: search,
                tab: "history",
                fromUserId: "",
              }}
              buttonLabel="Search"
            >
              {({ values, setValue }) => (
                <>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">Search</span>
                    <Input
                      placeholder="Bill no, name, or staff code"
                      value={values.q ?? ""}
                      onChange={(e) => setValue("q", e.target.value)}
                      className="h-10 w-[220px]"
                    />
                  </div>
                  <DateRangePicker
                    from={values.dateFrom}
                    to={values.dateTo}
                    onChange={({ from, to }) => {
                      setValue("dateFrom", from)
                      setValue("dateTo", to)
                    }}
                  />
                  <Combobox
                    label="Direction"
                    options={directionOptions}
                    value={values.direction ?? "__all__"}
                    defaultValue="__all__"
                    onChange={(v) => setValue("direction", v)}
                  />
                  <Combobox
                    label="Status"
                    options={statusOptions}
                    value={values.status ?? "__all__"}
                    defaultValue="__all__"
                    onChange={(v) => setValue("status", v)}
                  />
                  <Combobox
                    label="Other party"
                    options={otherUserOptions}
                    value={values.otherUserId ?? "__all__"}
                    defaultValue="__all__"
                    onChange={(v) => setValue("otherUserId", v)}
                  />
                </>
              )}
            </FilterWrapper>
            <Button
              size="sm"
              variant="ghost"
              className="h-10"
              onClick={() =>
                router.push(`${pathname}?tab=history&page=1&limit=${limit}`, { scroll: false })
              }
            >
              Clear
            </Button>
          </div>

          <div className="relative min-h-[120px]">
            {loadingCompleted && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/80">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            <HandoverTable
              rows={completedList}
              emptyMessage="No handovers match these filters."
              showStatus
              showReport
              showDirection
              showSendToReconciliation={canSendToReconciliation}
            />
            <CompletedPagination
              page={page}
              limit={limit}
              totalRecords={completedTotal}
              onPageChange={(p) => setParams({ page: String(p) })}
              onLimitChange={(n) => setParams({ limit: String(n), page: "1" })}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
