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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createFloatRequestAction, getBulkCashierUsersAction } from "@/app/actions/float-request.actions"
import { useToast } from "@/components/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { lkrToCents } from "@/types/float-request"
import type { DenominationEntry } from "@/types/float-request"

const LKR_DENOMINATIONS = [5000, 2000, 1000, 500, 100, 50, 20, 10]

type RequestFloatDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  shiftId: string | null
  onSuccess?: () => void
}

export function RequestFloatDialog({ open, onOpenChange, shiftId, onSuccess }: RequestFloatDialogProps) {
  const [bulkCashiers, setBulkCashiers] = useState<{ id: string; name: string; email: string }[]>([])
  const [bulkCashierId, setBulkCashierId] = useState("")
  const [denoms, setDenoms] = useState<DenominationEntry[]>(
    LKR_DENOMINATIONS.map((v) => ({ value: v, count: 0 }))
  )
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      getBulkCashierUsersAction().then((res) => {
        if (res.success && res.data) setBulkCashiers(res.data)
      })
    }
  }, [open])

  const totalLKR = denoms.reduce((s, d) => s + d.value * d.count, 0)
  const totalCents = lkrToCents(totalLKR)
  const valid = bulkCashierId && totalCents > 0

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request float</DialogTitle>
          <DialogDescription>
            Select the bulk cashier and enter the denominations you need (LKR). After approval, float will be added to your cashier account.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Bulk cashier</Label>
            <Select value={bulkCashierId} onValueChange={setBulkCashierId}>
              <SelectTrigger><SelectValue placeholder="Select bulk cashier" /></SelectTrigger>
              <SelectContent>
                {bulkCashiers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Denominations (LKR)</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {denoms.map((d, i) => (
                <div key={d.value} className="flex items-center gap-2">
                  <span className="w-14">{d.value}</span>
                  <Input
                    type="number"
                    min={0}
                    value={d.count}
                    onChange={(e) => {
                      const next = [...denoms]
                      next[i] = { ...next[i], count: parseInt(e.target.value, 10) || 0 }
                      setDenoms(next)
                    }}
                  />
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-2">Total: {totalLKR.toFixed(2)} LKR</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!valid || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Submit request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
