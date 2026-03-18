"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { getHandoversToMeAction, getHandoversApprovedByMeNotReconciledAction } from "@/app/actions/shift.actions"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCents } from "@/lib/format-money"
import { Loader2, Eye, FileCheck } from "lucide-react"
import { usePermissions } from "@/components/hooks/use-permissions"

type HandoverRow = {
  id: string
  cashCents: number
  cardCents: number
  slipCents: number
  checkCents: number
  creditCents: number
  eWalletCents: number
  totalCents: number
  discrepancyReason: string | null
  createdAt: Date | string
  fromUser: { id: string; name: string | null; staff?: { code: string } | null }
  shift: {
    id: string
    startedAt: Date | string
    userId: string
    user: { id: string; name: string | null }
  }
}

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

export default function HandoversPage() {
  const [list, setList] = useState<HandoverRow[]>([])
  const [approvedNotReconciledList, setApprovedNotReconciledList] = useState<HandoverRow[]>([])
  const [loading, setLoading] = useState(true)
  const { has: hasPermission } = usePermissions()
  const canSendToReconciliation = hasPermission("reconciliation", "submit-for-reconciliation")

  const fetchList = useCallback(() => {
    setLoading(true)
    const promises: Promise<void>[] = [
      getHandoversToMeAction().then((res) => {
        if (res.success && res.data) setList(res.data as HandoverRow[])
        else setList([])
      }),
    ]
    if (canSendToReconciliation) {
      promises.push(
        getHandoversApprovedByMeNotReconciledAction().then((res) => {
          if (res.success && res.data) setApprovedNotReconciledList(res.data as HandoverRow[])
          else setApprovedNotReconciledList([])
        })
      )
    }
    Promise.all(promises).finally(() => setLoading(false))
  }, [canSendToReconciliation])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  // Refetch when page becomes visible (e.g. after returning from approving a handover)
  useEffect(() => {
    const onFocus = () => fetchList()
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [fetchList])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Handed over to me</h1>
        <p className="text-muted-foreground">
          Pending handovers waiting for your approval.
        </p>
      </div>

      {list.length === 0 ? (
        <p className="text-muted-foreground py-8">No pending handovers.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>From</TableHead>
                <TableHead>Shift started</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((h) => (
                <TableRow key={h.id}>
                  <TableCell>{fromUserLabel(h.fromUser)}</TableCell>
                  <TableCell>
                    {h.shift?.startedAt
                      ? new Date(h.shift.startedAt).toLocaleString()
                      : "—"}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    LKR {formatCents(totalCents(h))}
                  </TableCell>
                  <TableCell>
                    {h.createdAt
                      ? new Date(h.createdAt).toLocaleString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/handovers/${h.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {canSendToReconciliation && (
        <div className="space-y-3 pt-8 border-t">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Need to send to reconciliation
            </h2>
            <p className="text-sm text-muted-foreground">
              Handovers you approved that are not yet in reconciliation. Open and use &quot;Send to reconciliation&quot; to move them to the Reconciliation page.
            </p>
          </div>
          {approvedNotReconciledList.length === 0 ? (
            <p className="text-muted-foreground py-4">None.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead>Shift started</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvedNotReconciledList.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell>{fromUserLabel(h.fromUser)}</TableCell>
                      <TableCell>
                        {h.shift?.startedAt
                          ? new Date(h.shift.startedAt).toLocaleString()
                          : "—"}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        LKR {formatCents(totalCents(h))}
                      </TableCell>
                      <TableCell>
                        {h.createdAt
                          ? new Date(h.createdAt).toLocaleString()
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/handovers/${h.id}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Link>
                        </Button>
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
  )
}
