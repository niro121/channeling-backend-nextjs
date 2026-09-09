"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/hooks/use-toast"
import { Loader2 } from "lucide-react"
import {
  seedReceiptTemplatesAction,
  seedAccountingAccountsAction,
  seedEraseBookingsReceiptsAction,
} from "@/app/actions/admin-seed.actions"

type SeedType = "receipt" | "accounting" | "erase" | null
type DialogPhase = "confirm" | "running" | "done"

function OutputLog({ running, output }: { running: boolean; output: string | null }) {
  const display = running ? "Running…\n" : output ?? ""
  return (
    <pre
      className="rounded-md border bg-muted/50 p-3 text-xs font-mono overflow-auto max-h-64 min-h-[6rem] whitespace-pre-wrap break-words"
      role="log"
    >
      {display || "\u00A0"}
    </pre>
  )
}

export function SeedActionsClient() {
  const [loadingReceipt, setLoadingReceipt] = useState(false)
  const [loadingAccounting, setLoadingAccounting] = useState(false)
  const [loadingErase, setLoadingErase] = useState(false)
  const [agreedReceipt, setAgreedReceipt] = useState(false)
  const [agreedAccounting, setAgreedAccounting] = useState(false)
  const [agreedErase, setAgreedErase] = useState(false)
  const [dialogSeed, setDialogSeed] = useState<SeedType>(null)
  const [dialogPhase, setDialogPhase] = useState<DialogPhase>("confirm")
  const [dialogOutput, setDialogOutput] = useState<string | null>(null)
  const { toast } = useToast()

  const openReceiptDialog = () => {
    setDialogSeed("receipt")
    setDialogPhase("confirm")
    setDialogOutput(null)
  }
  const openAccountingDialog = () => {
    setDialogSeed("accounting")
    setDialogPhase("confirm")
    setDialogOutput(null)
  }
  const openEraseDialog = () => {
    setDialogSeed("erase")
    setDialogPhase("confirm")
    setDialogOutput(null)
  }
  const closeDialog = () => {
    setDialogSeed(null)
    setDialogPhase("confirm")
    setDialogOutput(null)
  }

  async function runReceiptSeed() {
    setDialogPhase("running")
    setLoadingReceipt(true)
    try {
      const result = await seedReceiptTemplatesAction()
      if (result.success) {
        setDialogOutput(result.details ?? result.message)
        toast({ title: "Done", description: result.message })
      } else {
        setDialogOutput(`Error: ${result.message}`)
        toast({ title: "Error", description: result.message, variant: "destructive" })
      }
    } finally {
      setLoadingReceipt(false)
      setDialogPhase("done")
    }
  }

  async function runAccountingSeed() {
    setDialogPhase("running")
    setLoadingAccounting(true)
    try {
      const result = await seedAccountingAccountsAction()
      if (result.success) {
        setDialogOutput(result.details ?? result.message)
        toast({ title: "Done", description: result.message })
      } else {
        setDialogOutput(`Error: ${result.message}`)
        toast({ title: "Error", description: result.message, variant: "destructive" })
      }
    } finally {
      setLoadingAccounting(false)
      setDialogPhase("done")
    }
  }

  async function runEraseSeed() {
    setDialogPhase("running")
    setLoadingErase(true)
    try {
      const result = await seedEraseBookingsReceiptsAction()
      if (result.success) {
        setDialogOutput(result.details ?? result.message)
        toast({ title: "Done", description: result.message })
      } else {
        setDialogOutput(`Error: ${result.message}`)
        toast({ title: "Error", description: result.message, variant: "destructive" })
      }
    } finally {
      setLoadingErase(false)
      setDialogPhase("done")
    }
  }

  function handleConfirmInDialog() {
    if (dialogSeed === "receipt") runReceiptSeed()
    else if (dialogSeed === "accounting") runAccountingSeed()
    else if (dialogSeed === "erase") runEraseSeed()
  }

  const isRunning = dialogPhase === "running"
  const isReceipt = dialogSeed === "receipt"
  const isAccounting = dialogSeed === "accounting"
  const isErase = dialogSeed === "erase"
  const confirmTitle =
    isReceipt
      ? "Confirm seed receipt templates"
      : isAccounting
        ? "Confirm seed accounting accounts"
        : isErase
          ? "Confirm erase all bookings and receipts"
          : ""
  const confirmDescription =
    isReceipt
      ? "This will erase all receipt template data (main, headers, footers) and create defaults. Are you sure?"
      : isAccounting
        ? "This will erase all accounting data (float requests, journal lines, journals, accounts) and create accounts from scratch. Are you sure?"
        : isErase
          ? "This will erase all bookings and receipts, reset session appointment numbers to 0, and delete booking/receipt sequence counters. This cannot be undone. Are you sure?"
          : ""

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Seed receipt templates</CardTitle>
            <CardDescription>
              This will <strong>erase all</strong> receipt templates (main, headers, footers), then
              create default Ledger, Agent Receipt, Expenses Note, Debit Note, and Consultant Payment
              templates (slip + custom size).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer text-sm">
              <Checkbox
                checked={agreedReceipt}
                onCheckedChange={(c) => setAgreedReceipt(c === true)}
                className="mt-0.5"
              />
              <span>
                I understand that this will erase all receipt template data and I agree to run this
                seed.
              </span>
            </label>
            <Button
              onClick={openReceiptDialog}
              disabled={!agreedReceipt}
              variant="default"
            >
              Run seed receipt templates
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seed accounting accounts</CardTitle>
            <CardDescription>
              This will <strong>erase all</strong> accounting data (float requests, journal lines,
              journals, accounts), then create Main Cash Book, location cash books,
              agent/doctor/credit-customer accounts, and sync the Sequence table.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer text-sm">
              <Checkbox
                checked={agreedAccounting}
                onCheckedChange={(c) => setAgreedAccounting(c === true)}
                className="mt-0.5"
              />
              <span>
                I understand that this will erase all accounting data and I agree to run this seed.
              </span>
            </label>
            <Button
              onClick={openAccountingDialog}
              disabled={!agreedAccounting}
              variant="default"
            >
              Run seed accounting accounts
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Erase all bookings and receipts</CardTitle>
            <CardDescription>
              This will <strong>erase all</strong> bookings and receipts, reset every
              session&apos;s appointment number to 0, and remove booking/receipt-related sequence
              counters so new bookings and receipts start from 1 again.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer text-sm">
              <Checkbox
                checked={agreedErase}
                onCheckedChange={(c) => setAgreedErase(c === true)}
                className="mt-0.5"
              />
              <span>
                I understand that this will erase all booking and receipt data and reset session
                appointment and sequence data. I agree to run this.
              </span>
            </label>
            <Button
              onClick={openEraseDialog}
              disabled={!agreedErase}
              variant="destructive"
            >
              Run erase bookings and receipts
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogSeed !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {dialogPhase === "confirm"
                ? confirmTitle
                : isReceipt
                  ? "Seed receipt templates"
                  : isAccounting
                    ? "Seed accounting accounts"
                    : isErase
                      ? "Erase all bookings and receipts"
                      : ""}
            </DialogTitle>
            {dialogPhase === "confirm" && (
              <DialogDescription>{confirmDescription}</DialogDescription>
            )}
          </DialogHeader>

          {dialogPhase === "confirm" && (
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="button" onClick={handleConfirmInDialog}>
                I agree, run seed
              </Button>
            </DialogFooter>
          )}

          {(dialogPhase === "running" || dialogPhase === "done") && (
            <div className="flex flex-col gap-2 flex-1 min-h-0">
              <p className="text-sm font-medium text-muted-foreground">Output</p>
              <OutputLog running={isRunning} output={dialogOutput} />
              {dialogPhase === "done" && (
                <DialogFooter className="mt-4">
                  <Button type="button" onClick={closeDialog}>
                    Close
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
