"use client"

import type { ReactNode } from "react"
import { Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatCents } from "@/lib/format-money"
import type { ExpectedHandoverCollectionSourceRow } from "@/lib/handover-utils"

export function HandoverCollectionCalcInfo({
  summaryCents,
  previousHandovers = [],
  floatsIn = [],
  floatsOut = [],
  expectedCents,
  enteredCents,
}: {
  summaryCents: number
  previousHandovers?: ExpectedHandoverCollectionSourceRow[]
  floatsIn?: ExpectedHandoverCollectionSourceRow[]
  floatsOut?: ExpectedHandoverCollectionSourceRow[]
  expectedCents: number
  enteredCents?: number
}) {
  const previousTotal = previousHandovers.reduce((s, r) => s + r.cents, 0)
  const floatsInTotal = floatsIn.reduce((s, r) => s + r.cents, 0)
  const floatsOutTotal = floatsOut.reduce((s, r) => s + r.cents, 0)
  const diff = enteredCents != null ? enteredCents - expectedCents : null

  return (
    <Popover modal>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          title="How expected collection is calculated"
        >
          <Info className="h-3.5 w-3.5" />
          <span className="sr-only">How expected collection is calculated</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[22rem] p-0 text-sm" side="bottom">
        <div className="border-b bg-muted/50 p-3">
          <h4 className="font-medium">How this is calculated</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Expected = floats in + cashier summary + previous handovers − floats out
          </p>
        </div>
        <div className="max-h-[min(60vh,24rem)] space-y-3 overflow-auto p-3">
          <CalcGroup title="Cashier summary" totalCents={summaryCents}>
            <p className="text-xs text-muted-foreground">
              Receipts for this cashier from shift start until handover.
            </p>
          </CalcGroup>
          <CalcGroup title="Previous handovers" totalCents={previousTotal}>
            {previousHandovers.length === 0 ? (
              <p className="text-xs text-muted-foreground">None received on this shift.</p>
            ) : (
              <ul className="space-y-1">
                {previousHandovers.map((row) => (
                  <li key={row.id} className="flex justify-between gap-3 text-xs">
                    <span className="min-w-0 truncate">{row.label}</span>
                    <span className="shrink-0 tabular-nums">{formatCents(row.cents)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CalcGroup>
          <CalcGroup title="Floats in" totalCents={floatsInTotal}>
            {floatsIn.length === 0 ? (
              <p className="text-xs text-muted-foreground">None received this shift.</p>
            ) : (
              <ul className="space-y-1">
                {floatsIn.map((row) => (
                  <li key={row.id} className="flex justify-between gap-3 text-xs">
                    <span className="min-w-0 truncate">{row.label}</span>
                    <span className="shrink-0 tabular-nums">{formatCents(row.cents)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CalcGroup>
          <CalcGroup title="Floats out" totalCents={floatsOutTotal} subtract>
            {floatsOut.length === 0 ? (
              <p className="text-xs text-muted-foreground">None issued this shift.</p>
            ) : (
              <ul className="space-y-1">
                {floatsOut.map((row) => (
                  <li key={row.id} className="flex justify-between gap-3 text-xs">
                    <span className="min-w-0 truncate">{row.label}</span>
                    <span className="shrink-0 tabular-nums">({formatCents(row.cents)})</span>
                  </li>
                ))}
              </ul>
            )}
          </CalcGroup>
        </div>
        <div className="space-y-1 border-t p-3 text-xs">
          <div className="flex justify-between gap-3 font-medium">
            <span>Expected collection</span>
            <span className="tabular-nums">{formatCents(expectedCents)}</span>
          </div>
          {enteredCents != null ? (
            <>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Entered</span>
                <span className="tabular-nums">{formatCents(enteredCents)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Short/Excess</span>
                <span className="tabular-nums">
                  {diff === 0 || diff == null
                    ? "0.00"
                    : `${diff > 0 ? "+" : ""}${formatCents(diff)}`}
                </span>
              </div>
            </>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function CalcGroup({
  title,
  totalCents,
  subtract,
  children,
}: {
  title: string
  totalCents: number
  subtract?: boolean
  children: ReactNode
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between gap-3 text-xs font-medium">
        <span>{title}</span>
        <span className="tabular-nums">
          {subtract && totalCents > 0 ? `(${formatCents(totalCents)})` : formatCents(totalCents)}
        </span>
      </div>
      {children}
    </div>
  )
}
