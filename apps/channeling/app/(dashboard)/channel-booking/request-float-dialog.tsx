"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { createFloatRequestAction, getBulkCashierUsersAction } from "@/app/actions/float-request.actions"
import { SearchableUserSelect } from "@/components/common/user-select"
import { useToast } from "@/components/hooks/use-toast"
import { Loader2, Minus, Plus } from "lucide-react"
import { formatLKR } from "@/lib/format-money"
import { lkrToCents, LKR_DENOMINATIONS, LKR_DENOMINATIONS_RUPEES, LKR_DENOMINATIONS_CENTS, formatDenomLabel } from "@/types/float-request"
import type { DenominationEntry } from "@/types/float-request"

type RequestFloatDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  shiftId: string | null
  onSuccess?: () => void
}

export function RequestFloatDialog({ open, onOpenChange, shiftId, onSuccess }: RequestFloatDialogProps) {
  const [bulkCashiers, setBulkCashiers] = useState<{ id: string; name: string; email: string; isBulkCashier: boolean }[]>([])
  const [bulkCashierId, setBulkCashierId] = useState("")
  const [denoms, setDenoms] = useState<DenominationEntry[]>(
    LKR_DENOMINATIONS.map((v) => ({ value: v, count: 0 }))
  )
  const [loading, setLoading] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (!open) return
    setLoadingUsers(true)
    getBulkCashierUsersAction()
      .then((res) => {
        if (res.success && res.data) {
          setBulkCashiers(res.data)
          setBulkCashierId(res.data[0]?.id ?? "")
        }
      })
      .finally(() => setLoadingUsers(false))
  }, [open])

  const totalLKR = denoms.reduce((s, d) => s + d.value * d.count, 0)
  const totalCents = lkrToCents(totalLKR)
  const valid = bulkCashierId && totalCents > 0

  const matchDenom = (a: number, b: number) => (a >= 1 && b >= 1 ? a === b : Math.abs(a - b) < 1e-6)
  const updateDenomCount = (value: number, count: number) => {
    setDenoms((prev) => {
      const i = prev.findIndex((d) => matchDenom(d.value, value))
      if (i < 0) return prev
      const next = [...prev]
      next[i] = { ...next[i], count }
      return next
    })
  }

  async function handleSubmit() {
    if (!valid) return
    setLoading(true)
    try {
      const denominationsRequested = denoms.filter((d) => d.count > 0)
      const res = await createFloatRequestAction({
        bulkCashierId,
        amountRequested: totalCents,
        denominationsRequested,
        shiftId: shiftId ?? null,
      })
      if (res.success) {
        toast({ title: "Float request submitted", description: "Bulk cashier will approve and assign float." })
        onOpenChange(false)
        setBulkCashierId("")
        setDenoms(LKR_DENOMINATIONS.map((v) => ({ value: v, count: 0 })))
        onSuccess?.()
      } else {
        toast({ title: "Error", description: res.error ?? "Failed to submit request", variant: "destructive" })
      }
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to submit", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request float</DialogTitle>
          <DialogDescription>
            Select the bulk cashier and enter the denominations you need (LKR). After approval, float will be added to your cashier account.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Bulk cashier</Label>
            {loadingUsers ? (
              <div className="flex h-10 w-full items-center gap-2 rounded-md border border-input px-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : bulkCashiers.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-md border border-dashed px-3 py-2">
                No other bulk cashier is available. Ask an administrator to assign float-approve permission to another user.
              </p>
            ) : (
              <SearchableUserSelect
                label="bulk cashier"
                options={bulkCashiers.map((u) => ({ id: u.id, name: u.name || u.email || u.id, isBulkCashier: u.isBulkCashier }))}
                value={bulkCashierId}
                onChange={setBulkCashierId}
                placeholder="Select bulk cashier"
                disabled={loadingUsers}
              />
            )}
          </div>
          <div className="space-y-4">
            <div className="flex flex-col items-center">
              <Label className="text-sm font-medium self-start">Denominations (LKR)</Label>
              <div className="grid grid-cols-2 gap-x-20 gap-y-4 mt-3 w-full max-w-md">
                {LKR_DENOMINATIONS_RUPEES.map((v) => {
                  const count = denoms.find((d) => d.value === v)?.count ?? 0
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
                  )
                })}
              </div>
            </div>
            <div className="flex flex-col items-center">
              <Label className="text-sm font-normal text-muted-foreground self-start">Cents (optional)</Label>
              <div className="grid grid-cols-2 gap-x-20 gap-y-4 mt-3 w-full max-w-md">
                {LKR_DENOMINATIONS_CENTS.map((v, i) => {
                  const count = denoms.find((d) => matchDenom(d.value, v))?.count ?? 0
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
                  )
                })}
              </div>
            </div>
            <div className="border-t pt-3 mt-1 w-full">
              <p className="text-center text-lg font-semibold tabular-nums">
                Total: {formatLKR(totalLKR)} LKR
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!valid || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Submit request — {formatLKR(totalLKR)} LKR
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
